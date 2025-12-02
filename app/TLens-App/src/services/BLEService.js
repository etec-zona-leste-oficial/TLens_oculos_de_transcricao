// src/services/BLEService.js
import { BleManager, LogLevel } from 'react-native-ble-plx';
import { Platform, DeviceEventEmitter } from 'react-native';
import { encode, decode } from 'base-64';

export const DISCONNECTED_EVENT = 'ble_disconnected_event';

export const HISTORY_EVENT = 'ble__event';
export const SCREEN_EVENT = 'ble_screen_event';
export const CONFIG_EVENT = 'ble_config_event';
export const PONG_EVENT = 'ble_pong_event';
export const WIFI_EVENT = 'ble_wifi_event';

// UUIDs
const TLENS_SERVICE_UUID = "12345678-1234-5678-1234-56789abcdef0";
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
    this.manager.setLogLevel(LogLevel.Verbose)
    this.device = null;
    this.pairingKey = null;

    this._heartbeatInterval = null; // setInterval
    this._heartbeatTimeout = null;  // setTimeout (watchdog)

    this.characteristicListeners = [];
    this.pongListener = null;

    this.wifiDataBuffer = '';
    this._isDisconnecting = false;
  }

  // -------------------
  // SCAN
  // -------------------
  scanForDevices(onDeviceFound) {
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
            if (device?.localName) onDeviceFound(device);
          }
        );
      }
    });
  }

  stopScan() {
    console.log("BLEService: Parando scan.");
    this.manager.stopDeviceScan();
  }

  // -------------------
  // WATCHDOG
  // -------------------
  resetHeartbeatWatchdog() {
    if (this._heartbeatTimeout) clearTimeout(this._heartbeatTimeout);

    if (this._isDisconnecting || !this.device) return;

    this._heartbeatTimeout = setTimeout(() => {
      console.warn("BLEService: WATCHDOG TIMEOUT! Não recebemos PONG do Pi.");
      this.disconnect(false);
    }, 20000);
  }

  monitorDisconnection() {
    if (!this.device) return;
    this.manager.onDeviceDisconnected(this.device.id, (error, device) => {
      console.log(`BLEService: OS relatou desconexão de ${device.id}`);
      if (!this._isDisconnecting) this.disconnect(false);
    });
  }

  // -------------------
  // LISTENERS
  // -------------------
  async _startListeners() {
    if (!this.device) return;

    console.log("BLEService: Iniciando listeners...");

    const onData = (error, characteristic, eventName) => {
      if (this._isDisconnecting) return;
      if (error) return;

      const raw = characteristic?.value;
      if (!raw) return;

      try {
        const decoded = decode(raw);

        if (eventName === WIFI_EVENT) {
          this.wifiDataBuffer += decoded;

          try {
            const data = JSON.parse(this.wifiDataBuffer);
            DeviceEventEmitter.emit(eventName, data);
            this.wifiDataBuffer = '';
          } catch {
            return;
          }
        } else {
          const data = JSON.parse(decoded);
          DeviceEventEmitter.emit(eventName, data);
        }
      } catch (e) {
        if (eventName === WIFI_EVENT) this.wifiDataBuffer = '';
      }
    };

    const addListener = (uuid, eventName) => {
      this.characteristicListeners.push(
        this.device.monitorCharacteristicForService(
          TLENS_SERVICE_UUID,
          uuid,
          (err, c) => onData(err, c, eventName)
        )
      );
    };

    addListener(HISTORY_TEXT_CHAR_UUID, HISTORY_EVENT);
    addListener(SYNC_SCREEN_CHAR_UUID, SCREEN_EVENT);
    addListener(SYNC_CONFIG_CHAR_UUID, CONFIG_EVENT);
    addListener(PONG_CHAR_UUID, PONG_EVENT);
    addListener(WIFI_DATA_CHAR_UUID, WIFI_EVENT);

    if (this.pongListener) this.pongListener.remove();

    this.pongListener = DeviceEventEmitter.addListener(PONG_EVENT, () => {
      this.resetHeartbeatWatchdog();
    });

    console.log("BLEService: Listeners iniciados.");
  }

  _stopListeners() {
    console.log("BLEService: Removendo listener do PONG...");
    if (this.pongListener) this.pongListener.remove();
    this.pongListener = null;
  }

  // -------------------
  // HEARTBEAT (PING)
  // -------------------
  startHeartbeat() {
    if (this._heartbeatInterval) clearInterval(this._heartbeatInterval);

    console.log("BLEService: Iniciando heartbeat c/ setInterval...");

    this._heartbeatInterval = setInterval(async () => {
      if (!this.device || !this.pairingKey) {
        console.warn("BLEService: Heartbeat sem device.");
        this.disconnect(false);
        return;
      }

      try {
        await this.sendCommand({ type: "PING", payload: {} });
      } catch {
        this.disconnect(false);
      }
    }, 10000);

    this.resetHeartbeatWatchdog();
  }

  // -------------------
  // DISCONNECT
  // -------------------
  async disconnect(isManual = false) {
    if (this._isDisconnecting) return;
    this._isDisconnecting = true;

    console.log("BLEService: Iniciando desconexão...");

    if (this._heartbeatInterval) clearInterval(this._heartbeatInterval);
    if (this._heartbeatTimeout) clearTimeout(this._heartbeatTimeout);

    this._stopListeners();

    const deviceId = this.device?.id;

    try {
      if (isManual && deviceId && (await this.manager.isDeviceConnected(deviceId))) {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout ao desconectar")), 1000)
        );
        await Promise.race([
          this.manager.cancelDeviceConnection(deviceId),
          timeoutPromise
        ]);
      }
    } catch {}

    await sleep(500);

    this.device = null;
    this.pairingKey = null;

    this.characteristicListeners = [];
    this.wifiDataBuffer = '';
    this._isDisconnecting = false;

    if (!isManual && deviceId) {
      DeviceEventEmitter.emit(DISCONNECTED_EVENT, { deviceId });
    }

    console.log("BLEService: Desconectado.");
  }

  // -------------------
  // CONNECT
  // -------------------
  async connect(deviceId, pairingKey) {
    try {
      console.log("BLEService: Conectando...");
      this.stopScan();
      this._isDisconnecting = false;

      const device = await this.manager.connectToDevice(deviceId, { timeout: 10000 });
      this.device = device;

      await device.discoverAllServicesAndCharacteristics();

      try {
        const updated = await device.requestMTU(517);
        console.log("MTU:", updated.mtu);
      } catch {}

      await sleep(500);

      this.pairingKey = pairingKey;

      const hello = {
        type: "HELLO",
        payload: { pairing_key: pairingKey }
      };

      await device.writeCharacteristicWithoutResponseForService(
        TLENS_SERVICE_UUID,
        COMMAND_CHAR_UUID,
        encode(JSON.stringify(hello))
      );

      await sleep(500);

      this.monitorDisconnection();
      await this._startListeners();
      this.startHeartbeat();

      return this.device;

    } catch (e) {
      await this.disconnect(false);
      throw e;
    }
  }

  // -------------------
  // CONNECT + PAIR
  // -------------------
  async connectAndPair(deviceId) {
    try {
      this.stopScan();
      this._isDisconnecting = false;

      const device = await this.manager.connectToDevice(deviceId, { timeout: 10000 });
      this.device = device;

      await device.discoverAllServicesAndCharacteristics();

      try {
        await device.requestMTU(517);
      } catch {}

      await sleep(500);

      this.monitorDisconnection();

      await this._startListeners();

      const pairRequest = { type: "PAIR_REQUEST", payload: {} };
      await device.writeCharacteristicWithoutResponseForService(
        TLENS_SERVICE_UUID,
        COMMAND_CHAR_UUID,
        encode(JSON.stringify(pairRequest))
      );

      await sleep(500);

      let pairingKey = null;

      for (let i = 0; i < 5; i++) {
        await sleep(1000);
        try {
          const characteristic = await device.readCharacteristicForService(
            TLENS_SERVICE_UUID,
            PAIRING_KEY_CHAR_UUID
          );
          const v = decode(characteristic.value);
          const data = JSON.parse(v);

          if (data.type === "PAIR_SUCCESS") {
            pairingKey = data.payload.pairing_key;
            break;
          }
        } catch {}
      }

      if (!pairingKey) throw new Error("PAIRING_KEY não recebida.");

      this.pairingKey = pairingKey;

      this.startHeartbeat();

      return pairingKey;
    } catch (e) {
      await this.disconnect(false);
      throw e;
    }
  }

  // -------------------
  // COMMANDS
  // -------------------
  async sendCommand(command) {
    if (!this.device) throw new Error("Desconectado.");
    if (!this.pairingKey) throw new Error("Não autenticado.");

    const commandWithKey = {
      ...command,
      payload: { ...command.payload, pairing_key: this.pairingKey }
    };

    try {
      await this.device.writeCharacteristicWithoutResponseForService(
        TLENS_SERVICE_UUID,
        COMMAND_CHAR_UUID,
        encode(JSON.stringify(commandWithKey))
      );
    } catch (e) {
      this.disconnect(false);
      throw e;
    }
  }

  async sendTextData(command) {
    if (!this.device) throw new Error("Desconectado.");
    if (!this.pairingKey) throw new Error("Não autenticado.");

    const commandWithKey = {
      ...command,
      payload: { ...command.payload, pairing_key: this.pairingKey }
    };

    try {
      await this.device.writeCharacteristicWithResponseForService(
        TLENS_SERVICE_UUID,
        TEXT_DATA_CHAR_UUID,
        encode(JSON.stringify(commandWithKey))
      );
    } catch (e) {
      this.disconnect(false);
      throw e;
    }
  }
}

export default new BLEService();
