#!/usr/bin/env python3
# SPDX-License-Identifier: LGPL-2.1-or-later

import dbus
import dbus.exceptions
import dbus.mainloop.glib
import dbus.service
import array
from gi.repository import GLib
import sys
import json
import time 
import subprocess
import uuid
from threading import Thread

# --- Suas Constantes de UUID ---
SERVICE_UUID = "12345678-1234-5678-1234-56789abcdef0"
COMMAND_CHAR_UUID = "87654321-4321-8765-4321-fedcba987654"
SYNC_CONFIG_CHAR_UUID = "b2e4210a-23a7-4b62-9e42-26916c0d4529"
SYNC_SCREEN_CHAR_UUID = "c3f5321b-34b8-5c73-0f53-37027d1e5340"
TEXT_DATA_CHAR_UUID = "e2b40d6c-916c-4226-9e42-a7230a21e4b2"
HISTORY_TEXT_CHAR_UUID = "f3c51e7d-a824-5398-1d64-48138a2f05c1"
PAIRING_KEY_CHAR_UUID = "a1b2c3d4-e5f6-7890-1234-567890abcdef"
PONG_CHAR_UUID = "d4e5f6a1-b2c3-4d5e-8f90-1234567890ab"
WIFI_DATA_CHAR_UUID = "0000ffff-0000-1000-8000-00805f9b34fb"

# --- Constantes do BlueZ ---
BLUEZ_SERVICE_NAME = 'org.bluez'
GATT_MANAGER_IFACE = 'org.bluez.GattManager1'
# [CORREÇÃO DO TYPO] Estava 'DBUs.ObjectManager'
DBUS_OM_IFACE = 'org.freedesktop.DBus.ObjectManager' 
DBUS_PROP_IFACE = 'org.freedesktop.DBus.Properties'
GATT_SERVICE_IFACE = 'org.bluez.GattService1'
GATT_CHRC_IFACE = 'org.bluez.GattCharacteristic1'
GATT_DESC_IFACE = 'org.bluez.GattDescriptor1'

# --- Classes de Exceção (do exemplo) ---
class InvalidArgsException(dbus.exceptions.DBusException):
    # [CORREÇÃO DE INDENTAÇÃO] Esta linha estava faltando
    _dbus_error_name = 'org.freedesktop.DBus.Error.InvalidArgs'

# --- Classes Base (do exemplo) ---
# (Service, Characteristic, Descriptor - Modificadas para aceitar Notificações)

class Service(dbus.service.Object):
    PATH_BASE = '/org/bluez/tcc_app/service'

    def __init__(self, bus, index, uuid, primary):
        self.path = self.PATH_BASE + str(index)
        self.bus = bus
        self.uuid = uuid
        self.primary = primary
        self.characteristics = []
        dbus.service.Object.__init__(self, bus, self.path)

    def get_properties(self):
        return {
            GATT_SERVICE_IFACE: {
                'UUID': self.uuid,
                'Primary': self.primary,
                'Characteristics': dbus.Array(
                    self.get_characteristic_paths(),
                    signature='o')
            }
        }

    def get_path(self):
        return dbus.ObjectPath(self.path)

    def add_characteristic(self, characteristic):
        self.characteristics.append(characteristic)

    def get_characteristic_paths(self):
        result = []
        for chrc in self.characteristics:
            result.append(chrc.get_path())
        return result

    def get_characteristics(self):
        return self.characteristics

    @dbus.service.method(DBUS_PROP_IFACE, in_signature='s', out_signature='a{sv}')
    def GetAll(self, interface):
        if interface != GATT_SERVICE_IFACE:
            raise InvalidArgsException()
        return self.get_properties()[GATT_SERVICE_IFACE]

class Characteristic(dbus.service.Object):
    def __init__(self, bus, index, uuid, flags, service):
        self.path = service.path + '/char' + str(index)
        self.bus = bus
        self.uuid = uuid
        self.service = service
        self.flags = flags
        self.descriptors = []
        self.notifying = False # Adicionado para controle de notificação
        self._value = [] # Cache interno do valor
        dbus.service.Object.__init__(self, bus, self.path)

    def get_properties(self):
        return {
            GATT_CHRC_IFACE: {
                'Service': self.service.get_path(),
                'UUID': self.uuid,
                'Flags': self.flags,
                'Descriptors': dbus.Array(
                    self.get_descriptor_paths(),
                    signature='o')
            }
        }

    def get_path(self):
        return dbus.ObjectPath(self.path)

    def add_descriptor(self, descriptor):
        self.descriptors.append(descriptor)

    def get_descriptor_paths(self):
        result = []
        for desc in self.descriptors:
            result.append(desc.get_path())
        return result

    def get_descriptors(self):
        return self.descriptors

    @dbus.service.method(DBUS_PROP_IFACE, in_signature='s', out_signature='a{sv}')
    def GetAll(self, interface):
        if interface != GATT_CHRC_IFACE:
            raise InvalidArgsException()
        return self.get_properties()[GATT_CHRC_IFACE]

    @dbus.service.method(GATT_CHRC_IFACE, in_signature='a{sv}', out_signature='ay')
    def ReadValue(self, options):
        # print(f'Lendo {self.uuid}: {self._value}')
        # Converte para dbus.Byte se for string/int
        return [dbus.Byte(b) for b in self._value]

    @dbus.service.method(GATT_CHRC_IFACE, in_signature='aya{sv}')
    def WriteValue(self, value, options):
        # print(f'Escrevendo em {self.uuid}: {value}')
        # value é um array de dbus.Byte, convertemos para bytes
        self._value = bytes(value)

    @dbus.service.method(GATT_CHRC_IFACE)
    def StartNotify(self):
        # print(f'Notificações iniciadas em {self.uuid}')
        self.notifying = True

    @dbus.service.method(GATT_CHRC_IFACE)
    def StopNotify(self):
        # print(f'Notificações paradas em {self.uuid}')
        self.notifying = False

    @dbus.service.signal(DBUS_PROP_IFACE, signature='sa{sv}as')
    def PropertiesChanged(self, interface, changed, invalidated):
        pass

    # --- Nosso Método Helper de Notificação ---
    def _send_notification(self, value_bytes):
        """
        Envia uma notificação se o cliente estiver ouvindo.
        'value_bytes' deve ser um objeto bytes.
        """
        # [ADICIONE ESSA VERIFICAÇÃO AQUI]
        # Impede que notificações vazias (b"") sejam enviadas
        if not value_bytes:
            print(f"BLE (DBus) AVISO: Tentativa de enviar notificação vazia para {self.uuid}. Ignorando.")
            return

        if not self.notifying:
            # print(f'Cliente não está ouvindo em {self.uuid}, pulando notificação.')
            return
        
        # O valor deve ser um array de dbus.Byte
        dbus_value = [dbus.Byte(b) for b in value_bytes]
        
        # ... o resto da função ...
        self._value = value_bytes 
        
        self.PropertiesChanged(
            GATT_CHRC_IFACE,
            { 'Value': dbus_value },
            []
        )

# --- Classes da Aplicação Específica (Seu Código) ---

class Application(dbus.service.Object):
    """
    Classe principal que gerencia o ciclo de vida da aplicação BLE.
    Substitui a sua classe BLEManager.
    """
    def __init__(self, bus, config_manager, event_queue, main_controller):
        self.path = '/'
        self.services = []
        self.bus = bus
        self.config_manager = config_manager
        self.event_queue = event_queue
        self.main_controller = main_controller
        
        dbus.service.Object.__init__(self, bus, self.path)
        
        print("BLE (DBus): Gerenciador inicializado.")
        
        # Adiciona o serviço principal
        self.main_service = TccService(bus, 0, self)
        self.add_service(self.main_service)
        
        self.pairing_key = self.config_manager.get_setting('BLE', 'pairing_key', fallback='').strip()
        self.is_paired = bool(self.pairing_key)
        
        # [NOVA FEATURE] Estado de Mudo (controlado pelo main.py)
        self.is_muted = False 

    def add_service(self, service):
        self.services.append(service)

    @dbus.service.method(DBUS_OM_IFACE, out_signature='a{oa{sa{sv}}}')
    def GetManagedObjects(self):
        response = {}
        for service in self.services:
            response[service.get_path()] = service.get_properties()
            chrcs = service.get_characteristics()
            for chrc in chrcs:
                response[chrc.get_path()] = chrc.get_properties()
                descs = chrc.get_descriptors()
                for desc in descs:
                    response[desc.get_path()] = desc.get_properties()
        return response

    def get_path(self):
        return dbus.ObjectPath(self.path)

    # --- Métodos Públicos (API do seu BLEManager) ---
    
    def _notify_char_json(self, characteristic, data_dict):
        """
        [MODIFICADO] Envia dados JSON, fragmentando-os manualmente
        se forem maiores que o CHUNK_SIZE.
        """
        try:
            json_str = json.dumps(data_dict)
            value_bytes = json_str.encode('utf-8')
            
            # Define um tamanho de chunk seguro (menor que o MTU 517)
            CHUNK_SIZE = 512
            
            if len(value_bytes) <= CHUNK_SIZE:
                # É pequeno, envia de uma vez
                characteristic._send_notification(value_bytes)
            else:
                # É grande (ex: lista de WiFi), envia em pedaços
                print(f"BLE (DBus): Fragmentando {len(value_bytes)} bytes para {characteristic.uuid}...")
                
                for i in range(0, len(value_bytes), CHUNK_SIZE):
                    chunk = value_bytes[i : i + CHUNK_SIZE]
                    characteristic._send_notification(chunk)
                    
                    # Log para vermos o progresso
                    print(f"BLE (DBus):   -> Enviou chunk {i // CHUNK_SIZE + 1} ({len(chunk)} bytes)")
                    
                    # [IMPORTANTE] Pausa pequena para estabilidade da fila BLE
                    time.sleep(0.01) # 10ms
                    
                print("BLE (DBus): Envio fragmentado concluído.")
                        
        except Exception as e:
            print(f"BLE (DBus) ERRO: Falha ao codificar/enviar JSON: {e}")

    # [NOVA FEATURE] Notifica o App sobre o estado atual (ex: Mudo)
    def notify_status_update(self, status_dict):
        data = {"type": "STATUS_UPDATE", "payload": status_dict}
        # Usa a característica de config para enviar este update
        self._notify_char_json(self.main_service.sync_config_char, data)

    def notify_config_change(self, key, value):
        data = {"type": "SYNC_SETTING", "payload": {"key": key, "value": value}}
        self._notify_char_json(self.main_service.sync_config_char, data)

    # [NOVA FUNÇÃO] Envia um pacote com TODAS as configurações
    def notify_initial_settings(self, settings_dict):
        """Envia um snapshot de todas as configurações de uma vez."""
        data = {"type": "INITIAL_SETTINGS", "payload": settings_dict}
        self._notify_char_json(self.main_service.sync_config_char, data)

    def notify_screen_change(self, display1_lines, display2_lines):
        data = {"type": "SCREEN_CONTENT", "payload": {"display1": display1_lines, "display2": display2_lines}}
        self._notify_char_json(self.main_service.sync_screen_char, data)

    def notify_pong(self):
        data = {"type": "PONG", "payload": {"timestamp": time.time()}}
        self._notify_char_json(self.main_service.pong_char, data)

    def send_transcription_text(self, text):
        data = {"type": "TRANSCRIPTION_RESULT", "payload": {"text": text}}
        self._notify_char_json(self.main_service.history_text_char, data)

    def send_pairing_key(self, key):
        self.is_paired = True
        self.pairing_key = key
        data = {"type": "PAIR_SUCCESS", "payload": {"pairing_key": key}}
        json_data = json.dumps(data).encode('utf-8')
        
        # Define para leitura futura
        self.main_service.pairing_key_char._value = json_data
        # Tenta notificar
        self._notify_char_json(self.main_service.pairing_key_char, data)

    def send_wifi_list(self, networks):
        self._notify_char_json(self.main_service.wifi_data_char, {"type": "WIFI_LIST", "payload": networks})

    def send_wifi_status(self, payload_dict):
        """Envia um payload complexo de status do Wi-Fi."""
        self._notify_char_json(self.main_service.wifi_data_char, {"type": "WIFI_STATUS", "payload": payload_dict})

    def send_saved_networks_list(self, networks_list):
        """Envia a lista de redes salvas (apenas)."""
        self._notify_char_json(self.main_service.wifi_data_char, {"type": "SAVED_NETWORKS_LIST", "payload": networks_list})


class TccService(Service):
    """
    Nosso serviço customizado que contém todas as características.
    """
    def __init__(self, bus, index, application: Application):
        Service.__init__(self, bus, index, SERVICE_UUID, True)
        
        # Guarda a referência da aplicação para acessar (queue, controller, etc)
        self.app = application 
        
        # Cria e adiciona todas as características
        self.command_char = CommandCharacteristic(bus, 0, self)
        self.sync_config_char = SyncConfigCharacteristic(bus, 1, self)
        self.sync_screen_char = SyncScreenCharacteristic(bus, 2, self)
        self.text_data_char = TextDataCharacteristic(bus, 4, self)
        self.history_text_char = HistoryTextCharacteristic(bus, 5, self)
        self.pairing_key_char = PairingKeyCharacteristic(bus, 6, self)
        self.pong_char = PongCharacteristic(bus, 7, self)
        self.wifi_data_char = WifiDataCharacteristic(bus, 8, self)
        
        self.add_characteristic(self.command_char)
        self.add_characteristic(self.sync_config_char)
        self.add_characteristic(self.sync_screen_char)
        self.add_characteristic(self.text_data_char)
        self.add_characteristic(self.history_text_char)
        self.add_characteristic(self.pairing_key_char)
        self.add_characteristic(self.pong_char)
        self.add_characteristic(self.wifi_data_char)

# --- Nossas Características Customizadas ---

# =================================================================
# V--- A SEÇÃO CRÍTICA QUE EU QUEBREI ESTÁ AQUI (AGORA CORRIGIDA) ---V
# =================================================================

class CommandCharacteristic(Characteristic):
    """
    Característica que recebe comandos JSON.
    É aqui que a lógica do watchdog é resetada.
    """
    def __init__(self, bus, index, service):
        Characteristic.__init__(self, bus, index, COMMAND_CHAR_UUID,
                                ['write', 'write-without-response'], service)
        # Pega as referências do 'app' que está no 'service'
        self.event_queue = service.app.event_queue
        self.main_controller = service.app.main_controller

    def WriteValue(self, value, options):
        # value é um array de dbus.Byte, convertemos para bytes
        data_bytes = bytes(value)
        self._value = data_bytes # Salva o valor bruto

        try:
            # Tentativa normal (UTF-8)
            try:
                data_str = data_bytes.decode('utf-8')
            except UnicodeDecodeError:
                # Fallback 1: latin-1 (mapeia bytes 0xe1 etc para acentos)
                try:
                    data_str = data_bytes.decode('latin-1')
                    print("BLE (DBus) AVISO: entrada não era UTF-8 — decodificada como latin-1.")
                except Exception:
                    # Último recurso: decodifica substituindo bytes inválidos
                    data_str = data_bytes.decode('utf-8', errors='replace')
                    print("BLE (DBus) AVISO: entrada inválida — decodificada com 'replace' para evitar crash.")
            # Processa o JSON normalmente
            self._process_command(data_str)
        except Exception as e:
            # Mostra também o hexdump reduzido para debugging
            try:
                snippet = data_bytes[:64].hex()
            except Exception:
                snippet = "<no-bytes>"
            print(f"BLE (DBus) ERRO: não foi possível processar comando: {e} (bytes start: {snippet})")

    def _process_command(self, data_str):
        """[CORREÇÃO] Esta é a sua função original, que eu tinha apagado acidentalmente."""
        app = self.service.app # Referência para a Application
        try:
            data = json.loads(data_str)
            command_type = data.get('type')
            payload = data.get('payload')
            # print(f"BLE (DBus): Comando recebido: {command_type}")

            if app.is_paired:
                client_key = payload.get('pairing_key') if payload else None
                if not client_key:
                    print("BLE (DBus) AVISO: Comando não continha chave de pareamento.")
                    return

                if client_key == app.pairing_key:
                    # print(f"BLE (DBus): Chave validada para comando '{command_type}'.")
                    if command_type == 'HELLO':
                        self.event_queue.put(('BLE_CONNECTED', None))
                        self.main_controller.reset_ble_watchdog() # Inicia o watchdog
                        return
                    elif command_type == 'PING':
                        # [NOVO LOG] Adicionamos este print para confirmar
                        print("BLE (DBus): PING recebido. Enviando PONG...") 
                        self.main_controller.reset_ble_watchdog()
                        app.notify_pong() # Chama o método da Application
                        return
                    # demais comandos encaminhados
                    self.event_queue.put((command_type, payload))
                else:
                    print("BLE (DBus) AVISO: Comando bloqueado. Chave inválida.")
            elif command_type == 'PAIR_REQUEST':
                self.event_queue.put((command_type, payload))
            else:
                print("BLE (DBus) AVISO: Não pareado. Apenas 'PAIR_REQUEST' permitido.")
        except Exception as e:
            print(f"BLE (DBus) ERRO: Erro ao processar comando: {e}")

class TextDataCharacteristic(Characteristic):
    """
    Característica que recebe dados de texto (ex: proxy de transcrição).
    """
    def __init__(self, bus, index, service):
        Characteristic.__init__(self, bus, index, TEXT_DATA_CHAR_UUID, ['write'], service)
        self.event_queue = service.app.event_queue

    def WriteValue(self, value, options):
        data_bytes = bytes(value)
        self._value = data_bytes
        
        try:
            s = data_bytes.decode('utf-8')
            data_json = json.loads(s)
            if data_json.get('type') == 'PROXY_TRANSCRIPTION':
                self.event_queue.put(('BLE_TEXT_DATA', data_json.get('payload')))
        except Exception as e:
            print(f"BLE (DBus): Erro processando TEXT_DATA: {e}")


# --- Características 'Read' e 'Notify' ---

class SyncConfigCharacteristic(Characteristic):
    def __init__(self, bus, index, service):
        Characteristic.__init__(self, bus, index, SYNC_CONFIG_CHAR_UUID, ['read', 'notify'], service)
        self._value = b'{}' # Valor inicial

class SyncScreenCharacteristic(Characteristic):
    def __init__(self, bus, index, service):
        Characteristic.__init__(self, bus, index, SYNC_SCREEN_CHAR_UUID, ['notify'], service)

class HistoryTextCharacteristic(Characteristic):
    def __init__(self, bus, index, service):
        Characteristic.__init__(self, bus, index, HISTORY_TEXT_CHAR_UUID, ['notify'], service)

class PairingKeyCharacteristic(Characteristic):
    def __init__(self, bus, index, service):
        Characteristic.__init__(self, bus, index, PAIRING_KEY_CHAR_UUID, ['read', 'notify'], service)
        self._value = b'{"type": "PAIR_STATUS", "payload": {"pairing_key": null}}'

class PongCharacteristic(Characteristic):
    def __init__(self, bus, index, service):
        Characteristic.__init__(self, bus, index, PONG_CHAR_UUID, ['read', 'notify'], service)
        self._value = b'{"type": "PONG", "payload": {"timestamp": 0}}'

class WifiDataCharacteristic(Characteristic):
    def __init__(self, bus, index, service):
        Characteristic.__init__(self, bus, index, WIFI_DATA_CHAR_UUID, ['notify'], service)
        # 👇👇👇 ESTA LINHA É OBRIGATÓRIA 👇👇👇
        self._value = b'{"type": "WIFI_LIST", "payload": []}'


# --- Funções de Registro e Main Loop ---

def _get_mac_address_suffix(config_manager):
    try:
        for interface in ['wlan0', 'eth0', 'hci0']:
            path = f'/sys/class/net/{interface}/address'
            try:
                res = subprocess.check_output(['cat', path]).decode('utf-8').strip()
                parts = res.split(':'); return parts[-2].upper() + parts[-1].upper()
            except Exception:
                continue
    except Exception:
        pass
    return uuid.uuid4().hex[:4].upper()

def _device_name(config_manager):
    base_name = config_manager.get_setting('BLE', 'device_name', fallback='TLens')
    suffix = _get_mac_address_suffix(config_manager)
    return f"{base_name}-{suffix}"

def register_app_cb():
    print('GATT aplicação registrada com sucesso.')

def register_app_error_cb(error):
    print('Falha ao registrar aplicação: ' + str(error))
    # Se falhar, o mainloop deve ser encerrado
    # (O mainloop é passado ou global, dependendo de como você chama)
    
def find_adapter(bus):
    remote_om = dbus.Interface(bus.get_object(BLUEZ_SERVICE_NAME, '/'),
                               DBUS_OM_IFACE)
    objects = remote_om.GetManagedObjects()

    for o, props in objects.items():
        if GATT_MANAGER_IFACE in props.keys():
            return o
    return None

# --- Ponto de Entrada ---
# Esta parte agora substitui o seu `ble.start()`
# Você precisará integrar isso ao seu main controller

def start_ble_service(mainloop, config_manager, event_queue, main_controller):
    """
    Função principal para iniciar e registrar o serviço BLE.
    """
    dbus.mainloop.glib.DBusGMainLoop(set_as_default=True)
    bus = dbus.SystemBus()

    adapter = find_adapter(bus)
    if not adapter:
        print('GattManager1 interface não encontrada. BlueZ está rodando?')
        return None
    
    try:
        device_name = _device_name(config_manager)
        adapter_obj = bus.get_object(BLUEZ_SERVICE_NAME, adapter)
        adapter_props = dbus.Interface(adapter_obj, DBUS_PROP_IFACE)
        
        print(f"BLE (DBus): Definindo nome do adaptador BlueZ (Alias) para '{device_name}'...")
        adapter_props.Set('org.bluez.Adapter1', "Alias", dbus.String(device_name))
        
        print("BLE (DBus): Desativando pareamento nativo (Pairable = False)...")
        adapter_props.Set('org.bluez.Adapter1', "Pairable", dbus.Boolean(False))

    except Exception as e:
        print(f"BLE (DBus) AVISO: Não foi possível definir propriedades do adaptador: {e}")

    service_manager = dbus.Interface(
        bus.get_object(BLUEZ_SERVICE_NAME, adapter),
        GATT_MANAGER_IFACE)

    # Cria a Aplicação, que contém toda a sua lógica
    app = Application(bus, config_manager, event_queue, main_controller)

    print('Registering GATT application...')

    service_manager.RegisterApplication(app.get_path(), {},
                                      reply_handler=register_app_cb,
                                      error_handler=register_app_error_cb)
    
    # Precisamos também registrar um nome de publicidade (Advertising)
    try:
        adv_props = {
            'Type': 'peripheral',
            'ServiceUUIDs': dbus.Array([SERVICE_UUID], signature='s'),
            'LocalName': dbus.String(_device_name(config_manager)),
        }
        
        # Encontra a interface de Advertising
        adv_manager_iface = 'org.bluez.LEAdvertisingManager1'
        adv_manager = dbus.Interface(
            bus.get_object(BLUEZ_SERVICE_NAME, adapter),
            adv_manager_iface)

        adv_path = '/org/bluez/tcc_app/advertisement'
        
        # Cria uma classe simples de Advertisement (exigido pelo dbus)
        class Advertisement(dbus.service.Object):
            PATH_BASE = '/org/bluez/tcc_app/advertisement'
            def __init__(self, bus, index, advertising_type):
                self.path = self.PATH_BASE + str(index)
                self.bus = bus
                self.adv_type = advertising_type
                dbus.service.Object.__init__(self, bus, self.path)

            def get_properties(self):
                properties = dict()
                properties['Type'] = self.adv_type
                properties['ServiceUUIDs'] = dbus.Array([SERVICE_UUID], signature='s')
                properties['LocalName'] = dbus.String(_device_name(config_manager))
                return { 'org.bluez.LEAdvertisement1': properties }

            def get_path(self):
                return dbus.ObjectPath(self.path)

            @dbus.service.method(DBUS_OM_IFACE, out_signature='a{oa{sa{sv}}}')
            def GetManagedObjects(self):
                return { self.get_path(): self.get_properties() }

            @dbus.service.method('org.bluez.LEAdvertisement1', in_signature='', out_signature='')
            def Release(self):
                print('Advertisement Released')
        
        adv = Advertisement(bus, 0, 'peripheral')
        
        adv_manager.RegisterAdvertisement(adv.get_path(), {},
                                          reply_handler=lambda: print("Advertisement registrado com sucesso"),
                                          error_handler=lambda e: print(f"Erro ao registrar Advertisement: {e}"))
        
        print("Iniciando Advertisement...")

    except Exception as e:
        print(f"Não foi possível registrar o Advertisement: {e}")
        print("O dispositivo pode não ser 'descobrível'.")


    return app

if __name__ == '__main__':
    # Este 'if' é apenas para testar o script de forma independente.
    # No seu código real, você chamará 'start_ble_service'
    # de dentro do seu 'main_controller'
    
    print("Executando em modo de teste...")
    
    # Mock de objetos para teste
    class MockQueue:
        def put(self, item):
            print(f"[MockQueue] Evento: {item}")
            
    class MockController:
        def reset_ble_watchdog(self):
            print(f"[MockController] Watchdog Resetado.")
            
    class MockConfig:
        def get_setting(self, section, key, fallback=None):
            if key == 'pairing_key': return '123456'
            if key == 'device_name': return 'TLens-DBus'
            return fallback

    # O GLib MainLoop deve ser a thread principal
    mainloop = GLib.MainLoop()
    
    start_ble_service(
        mainloop,
        MockConfig(),
        MockQueue(),
        MockController()
    )
    
    try:
        mainloop.run()
    except KeyboardInterrupt:
        print("\nSaindo...")
        mainloop.quit()