// src/services/BLEService.js
import { BleManager, LogLevel } from 'react-native-ble-plx';
import { Platform, DeviceEventEmitter } from 'react-native';
import { encode, decode } from 'base-64'; // Importamos o encoder
import BackgroundTimer from 'react-native-background-timer';

export const DISCONNECTED_EVENT = 'ble_disconnected_event';

export const HISTORY_EVENT = 'ble_history_event';
export const SCREEN_EVENT = 'ble_screen_event';
export const CONFIG_EVENT = 'ble_config_event';
export const PONG_EVENT = 'ble_pong_event';
export const WIFI_EVENT = 'ble_wifi_event';

// UUIDs que copiamos da especificação e do firmware
const TLENS_SERVICE_UUID = "12345678-1234-5678-1234-56789abcdef0";

// Características que vamos USAR
const COMMAND_CHAR_UUID = "87654321-4321-8765-4321-fedcba987654";
const PAIRING_KEY_CHAR_UUID = "a1b2c3d4-e5f6-7890-1234-567890abcdef";
const PONG_CHAR_UUID = "d4e5f6a1-b2c3-4d5e-8f90-1234567890ab";
const SYNC_CONFIG_CHAR_UUID = "b2e4210a-23a7-4b62-9e42-26916c0d4529";
const SYNC_SCREEN_CHAR_UUID = "c3f5321b-34b8-5c73-0f53-37027d1e5340";
const TEXT_DATA_CHAR_UUID = "e2b40d6c-916c-4226-9e42-a7230a21e4b2";
const HISTORY_TEXT_CHAR_UUID = "f3c51e7d-a824-5398-1d64-48138a2f05c1";
const WIFI_DATA_CHAR_UUID = "0000ffff-0000-1000-8000-00805f9b34fb";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class BLEService {  
  constructor() {
    this.manager = new BleManager();
    this.manager.setLogLevel(LogLevel.Verbose); // Descomente para debug pesado
    this.device = null;
    this.pairingKey = null;
    this._heartbeatInterval = null; // Timer para *enviar* PING
    this._heartbeatTimeout = null;  // Timer para *exigir* PONG
    
    this.characteristicListeners = []; 
    this.pongListener = null; 
    this.wifiDataBuffer = '';
    this._isDisconnecting = false;
  }

  scanForDevices(onDeviceFound) {
    // ... (código existente, sem mudanças)
    console.log("BLEService: Iniciando scan...");
    this.manager.state().then((state) => {
      if (state === 'PoweredOff') {
        console.log("BLEService: Bluetooth está desligado.");
        this.manager.stopDeviceScan();
        return;
      }
      if (state === 'PoweredOn') {
        this.manager.startDeviceScan(
          [TLENS_SERVICE_UUID], 
          null, 
          (error, device) => {
            if (error) {
              console.error("BLEService: Erro no scan:", error);
              return;
            }
            if (device.localName) {
              onDeviceFound(device);
            }
          }
        );
      }
    });
  }

  stopScan() {
    // ... (código existente, sem mudanças)
    console.log("BLEService: Parando scan.");
    this.manager.stopDeviceScan();
  }
  
  resetHeartbeatWatchdog() {
    // ... (código existente, sem mudanças)
    if (this._heartbeatTimeout) clearTimeout(this._heartbeatTimeout);

    if (this._isDisconnecting || !this.device) {
      return;
    }
    
    this._heartbeatTimeout = setTimeout(() => {
        console.warn("BLEService: WATCHDOG TIMEOUT! Não recebemos PONG do Pi.");
        this.disconnect(false); // [MODIFICADO] Passa 'false' (não é manual)
    }, 20000); // 20 segundos
  }

  monitorDisconnection() {
    // ... (código existente, sem mudanças)
    if (!this.device) return;
    this.manager.onDeviceDisconnected(this.device.id, (error, device) => {
      console.log(`BLEService: O SISTEMA OPERACIONAL relatou desconexão de ${device.id}. Erro nativo:`, error);
      if (!this._isDisconnecting) {
        this.disconnect(false); // false = NÃO foi manual, foi o OS
      }
    });
  }

  async _startListeners() {
    if (!this.device) return;
    console.log("BLEService: Iniciando listeners (Notificações)...");

    const onData = (error, characteristic, eventName) => {

      if (this._isDisconnecting) return;

      if (error) {
        if (error.message.includes("is not connected") || error.message.includes("was disconnected")) {
          return;
        }
        console.error(`BLEService: Erro ao monitorar ${characteristic?.uuid}:`, error.message);
        return;
      }
      
      try {
        const rawValue = characteristic.value; // Valor em base64
        if (!rawValue) return;

        const decoded = decode(rawValue); // Um pedaço (string)
        
        // --- LÓGICA DE CHUNKING (A MUDANÇA ESTÁ AQUI) ---

        if (eventName === WIFI_EVENT) {
          // 1. Acumula o pedaço no buffer de Wi-Fi
          this.wifiDataBuffer += decoded;

          try {
            // 2. Tenta fazer o parse do buffer *inteiro*
            const data = JSON.parse(this.wifiDataBuffer);

            // 3. SUCESSO! O JSON está completo.
            console.log(`BLEService: JSON do ${eventName} re-montado com sucesso (${this.wifiDataBuffer.length} bytes).`);
            DeviceEventEmitter.emit(eventName, data);
            
            // 4. Limpa o buffer para a próxima mensagem
            this.wifiDataBuffer = '';

          } catch (e) {
            // 5. FALHA (Esperada): O JSON ainda está incompleto.
            // O erro é "Unexpected end of input" ou similar.
            // Apenas esperamos os próximos chunks.
            console.log(`BLEService: Chunk do ${eventName} recebido. Buffer: ${this.wifiDataBuffer.length} bytes. Aguardando mais...`);
          }

        } else {
          // --- LÓGICA ANTIGA (para CONFIG, HISTORY, etc.) ---
          // Esses eventos são pequenos e não precisam de buffer.
          const data = JSON.parse(decoded);
          DeviceEventEmitter.emit(eventName, data);
        }

      } catch (e) {
        // Um erro real (ex: JSON mal formado que *não* é de "input incompleto")
        console.warn(`BLEService: Falha crítica ao decodificar JSON do evento ${eventName}:`, e);
        // Limpa o buffer por segurança
        if (eventName === WIFI_EVENT) {
          this.wifiDataBuffer = '';
        }
      }
    };

    // ... (código existente, sem mudanças)
    // 1. Histórico de Transcrição
    this.characteristicListeners.push(
      this.device.monitorCharacteristicForService(
        TLENS_SERVICE_UUID,
        HISTORY_TEXT_CHAR_UUID,
        (err, char) => onData(err, char, HISTORY_EVENT)
      )
    );

    // 2. Espelhamento de Tela
    this.characteristicListeners.push(
      this.device.monitorCharacteristicForService(
        TLENS_SERVICE_UUID,
        SYNC_SCREEN_CHAR_UUID,
        (err, char) => onData(err, char, SCREEN_EVENT)
      )
    );

    // 3. Sincronização de Configs
    this.characteristicListeners.push(
      this.device.monitorCharacteristicForService(
        TLENS_SERVICE_UUID,
        SYNC_CONFIG_CHAR_UUID,
        (err, char) => onData(err, char, CONFIG_EVENT)
      )
    );

    // 5. PONG (para o Watchdog)
    this.characteristicListeners.push(
      this.device.monitorCharacteristicForService(
        TLENS_SERVICE_UUID,
        PONG_CHAR_UUID,
        (err, char) => onData(err, char, PONG_EVENT)
      )
    );

    this.characteristicListeners.push(
      this.device.monitorCharacteristicForService(TLENS_SERVICE_UUID, WIFI_DATA_CHAR_UUID, (e, c) => onData(e, c, WIFI_EVENT))
    );
    
    console.log("BLEService: Listeners iniciados.");
    
    if (this.pongListener) this.pongListener.remove();
    this.pongListener = DeviceEventEmitter.addListener(PONG_EVENT, () => {
        // console.log("BLEService: PONG recebido (via Notify)! Resetando watchdog.");
        this.resetHeartbeatWatchdog();
    });
  }

  _stopListeners() {
    // [MODIFICADO] Esta função agora só limpa o listener de PONG (JS)
    // Os listeners de características nativas são muito sensíveis
    // para serem limpos aqui.
    
    console.log("BLEService: Parando listener de PONG (JS)...");
    
    if (this.pongListener) {
      try {
        this.pongListener.remove(); // Este é um listener do DeviceEventEmitter, é seguro.
      } catch (e) {
        console.warn(`BLEService: Erro (ignorado) ao remover listener de PONG: ${e.message}`);
      }
      this.pongListener = null;
    }
  }

  startHeartbeat() {
    // ... (código existente, sem mudanças)
    BackgroundTimer.stopBackgroundTimer();

    BackgroundTimer.runBackgroundTimer(async () => {
      if (!this.device || !this.pairingKey) {
          console.warn("BLEService: Heartbeat rodou sem dispositivo/chave. Parando.");
          this.disconnect(false);
          return;
      }
      
      try {
        await this.sendCommand({ type: "PING", payload: {} });
        // (Debug) console.log("BLEService: PING enviado.");
      } catch (error) {
        console.warn("BLEService: Heartbeat falhou (PING/PONG Read):", error.message);
        this.disconnect(false);
      }
    }, 10000); 

    this.resetHeartbeatWatchdog();
  }

  async disconnect(isManual = false) {
    if (this._isDisconnecting) return;
    this._isDisconnecting = true;

    const deviceId = this.device?.id; 
    console.log(`BLEService: Iniciando processo de desconexão para ${deviceId || 'nenhum'}...`);

    // 1. Limpa todos os timers (JS) e buffers (JS)
    BackgroundTimer.stopBackgroundTimer();
    if (this._heartbeatTimeout) clearTimeout(this._heartbeatTimeout);
    this._heartbeatInterval = null;
    this._heartbeatTimeout = null;
    this.wifiDataBuffer = '';

    // 2. Limpa o listener de PONG (JS)
    this._stopListeners(); 

    try {
      // 3. Tenta cancelar a conexão (Nativo) se for manual
      if (isManual && deviceId && (await this.manager.isDeviceConnected(deviceId))) {
         console.log(`BLEService: Solicitando cancelamento de conexão ao OS (Manual)...`);
         // [REDUZIDO TIMEOUT] 2s é muito tempo, 1s é suficiente
         const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout ao desconectar")), 1000));
         await Promise.race([
             this.manager.cancelDeviceConnection(deviceId),
             timeoutPromise
         ]);
      } else {
         console.log(`BLEService: Pulando cancelDeviceConnection (não manual ou já desconectado).`);
      }
    } catch (e) {
      if (e.message && !e.message.includes("is not connected")) {
         console.warn("BLEService: Aviso ao limpar conexão:", e.message);
      }
    }

    // 4. Pausa de estabilização. 
    // É CRUCIAL esperar o crash nativo (que vem de onError)
    // acontecer (e ser pego pelos guards 'if (this._isDisconnecting) return;')
    // ANTES de limparmos os arrays de listeners.
    console.log("BLEService: Pausa pós-desconexão para estabilização nativa...");
    await sleep(1000); 

    // 5. Agora que a poeira baixou, limpa os estados de JS
    console.log("BLEService: Limpando estado de JS (dispositivo, chave, listeners)...");
    this.device = null;
    this.pairingKey = null;
    
    // [A MUDANÇA CRÍTICA]
    // Limpa o array de subscriptions NATIVAS *depois* da pausa.
    // Isso impede a race condition que causa o crash.
    this.characteristicListeners = []; 


    this._isDisconnecting = false; 
    console.log(`BLEService: Limpeza concluída.`);
    
    // 6. Emite o evento de UI (se não for manual)
    if (!isManual && deviceId) {
      console.log(`BLEService: Emitindo evento GLOBAL de desconexão para ${deviceId}.`);
      DeviceEventEmitter.emit(DISCONNECTED_EVENT, { deviceId: deviceId });
    }
  }

  async connect(deviceId, pairingKey) {
    // ... (código existente, sem mudanças)
    console.log(`BLEService: Tentando conectar ao dispositivo pareado ${deviceId}...`);
    this.stopScan();
    this._isDisconnecting = false; 

    try {
      const device = await this.manager.connectToDevice(deviceId, { timeout: 10000 });
      console.log(`BLEService: Conectado a ${device.name}.`);
      this.device = device;

      await device.discoverAllServicesAndCharacteristics();
      console.log("BLEService: Serviços e características descobertos.");

      try {
        console.log("BLEService: Solicitando MTU maior...");
        const updatedDevice = await device.requestMTU(517);
        console.log(`BLEService: MTU negociado para ${updatedDevice.mtu} bytes.`);
      } catch (e) {
        console.warn(`BLEService: Falha ao solicitar MTU. Notificações podem falhar. ${e.message}`);
      }

      console.log("BLEService: Aguardando estabilização pós-MTU...");
      await sleep(500); 

      this.pairingKey = pairingKey;

      const helloCommand = {
        type: "HELLO",
        payload: { pairing_key: pairingKey }
      };

      this.monitorDisconnection();

      console.log("BLEService: Enviando HELLO para autenticação...");
      await device.writeCharacteristicWithoutResponseForService(
        TLENS_SERVICE_UUID,
        COMMAND_CHAR_UUID,
        encode(JSON.stringify(helloCommand))
      );
      console.log("BLEService: HELLO enviado. Aguardando estabilização...");
      
      await sleep(500); 

      await this._startListeners(); 

      this.startHeartbeat();

      console.log(`BLEService: Sessão autenticada com a chave ${pairingKey.substring(0, 4)}...`);
      return this.device;

    } catch (error) {
      console.error(`BLEService: Falha ao conectar no dispositivo pareado: ${error}`);
      await this.disconnect(false); 
      throw error;
    }
  }

  async connectAndPair(deviceId) {
    // ... (código existente, sem mudanças)
    console.log(`BLEService: Tentando conectar e parear com ${deviceId}...`);
    this.stopScan();
    this._isDisconnecting = false; 

    try {
      const device = await this.manager.connectToDevice(deviceId, { timeout: 10000 });
      console.log(`BLEService: Conectado a ${device.name}.`);
      this.device = device;
      await device.discoverAllServicesAndCharacteristics();
      console.log("BLEService: Serviços e características descobertos.");

      try {
        const updatedDevice = await device.requestMTU(517);
        console.log(`BLEService: MTU negociado para ${updatedDevice.mtu} bytes.`);
      } catch (e) {
        console.warn(`BLEService: Falha ao solicitar MTU. Notificações podem falhar. ${e.message}`);
      }
      
      console.log("BLEService: Aguardando estabilização pós-MTU...");
      await sleep(500);
      
      const MAX_ATTEMPTS = 5;
      const DELAY_MS = 1000;
      let pairingKey = null;

      this.monitorDisconnection();
      
      console.log("BLEService: Enviando PAIR_REQUEST...");
      const pairRequest = { type: "PAIR_REQUEST", payload: {} };
      await device.writeCharacteristicWithoutResponseForService(
        TLENS_SERVICE_UUID,
        COMMAND_CHAR_UUID,
        encode(JSON.stringify(pairRequest))
      );
      console.log("BLEService: PAIR_REQUEST enviado. Aguardando estabilização...");
      
      await sleep(500);
      
      await this._startListeners();

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        await sleep(DELAY_MS);
        try {
          const characteristic = await device.readCharacteristicForService(
            TLENS_SERVICE_UUID,
            PAIRING_KEY_CHAR_UUID
          );
          if (!characteristic?.value) continue;
          const rawValue = decode(characteristic.value);
          const data = JSON.parse(rawValue);
          if (data.type === "PAIR_SUCCESS" && data.payload.pairing_key) {
            pairingKey = data.payload.pairing_key;
            break; 
          }
        } catch (error) {
          console.warn(`BLEService: Erro na tentativa ${attempt}: ${error.message}.`);
        }
      }

      if (pairingKey) {
        console.log("BLEService: Pareamento concluído com sucesso.");
        this.pairingKey = pairingKey;
        this.startHeartbeat();
        return pairingKey;
      } else {
        throw new Error("Não foi possível ler a chave de pareamento.");
      }

    } catch (error) {
      console.error(`BLEService: Falha no connectAndPair: ${error}`);
      await this.disconnect(false); 
      throw error;
    }
  }

  async sendCommand(command) {
    // ... (código existente, sem mudanças)
    if (!this.device) throw new Error("Não está conectado a um dispositivo.");
    if (!this.pairingKey) throw new Error("Não está autenticado.");

    const commandWithKey = {
      ...command,
      payload: { ...command.payload, pairing_key: this.pairingKey }
    };
    
    if (command.type !== "PING") {
        // console.log(`BLEService: Enviando comando: ${JSON.stringify(commandWithKey)}`);
    }

    try {
      await this.device.writeCharacteristicWithoutResponseForService(
        TLENS_SERVICE_UUID,
        COMMAND_CHAR_UUID,
        encode(JSON.stringify(commandWithKey)) 
      );
    } catch (error) {
      console.error(`BLEService: Falha ao enviar comando: ${error}`);
      this.disconnect(false);
      throw error;
    }
  }

  async sendTextData(command) {
    // ... (código existente, sem mudanças)
    if (!this.device) throw new Error("Não está conectado a um dispositivo.");
    if (!this.pairingKey) throw new Error("Não está autenticado.");

    const commandWithKey = {
      ...command,
      payload: { ...command.payload, pairing_key: this.pairingKey }
    };

    console.log(`BLEService: Enviando TextData: ${JSON.stringify(commandWithKey)}`);

    try {
      await this.device.writeCharacteristicWithResponseForService( // Pode usar WithResponse para garantir
        TLENS_SERVICE_UUID,
        TEXT_DATA_CHAR_UUID, // <-- A CARACTERÍSITCA CORRETA
        encode(JSON.stringify(commandWithKey))
      );
    } catch (error) {
      console.error(`BLEService: Falha ao enviar TextData: ${error}`);
      this.disconnect(false);
      throw error;
    }
  }
}

const bleService = new BLEService();
export default bleService;