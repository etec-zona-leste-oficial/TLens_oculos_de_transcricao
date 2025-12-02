import time, os, configparser
from queue import Queue, Empty
from threading import Timer, Thread, Lock
import uuid
import subprocess
from pvrecorder import PvRecorder
from AdvancedOLEDManager import AdvancedOLEDManager
from ConnectionManager import ConnectionManager
from LocalTranscriber import LocalTranscriber
from CloudTranscriber import CloudTranscriber
from ConfigManager import ConfigManager
from InputManager import InputManager
# [IMPORTANTE] Certifique-se que o MenuManager existe
try:
    from MenuManager import MenuManager
except ImportError:
    print("AVISO: MenuManager.py não encontrado. Botões virtuais podem não funcionar.")
    class MenuManager: # Mock para evitar crash
        def __init__(self, *args): pass
        def is_open(self): return False
        def adjust_value(self, *args): pass
        def open_menu(self, *args): pass

import dbus.mainloop.glib # Essencial para integrar dbus e GLib
from gi.repository import GLib
from WifiManager import WifiManager
import BLEManager
from LocalizationManager import LocalizationManager

class MainController:
    def __init__(self):
        self.config_manager = ConfigManager()
        self.wifi_manager = WifiManager()
        self.localization_manager = LocalizationManager(self.config_manager)
        self.event_queue = Queue()

        print("CÉREBRO: Iniciando InputManager...")
        self.input_manager = InputManager(self.config_manager, self.event_queue)
        self.input_manager.start()

        print("--- 'Cérebro' iniciando os módulos... ---")

        self.mainloop = GLib.MainLoop()

        self.display1 = AdvancedOLEDManager(self.config_manager, 'Display1', self.localization_manager, self._display_content_update_handler, 1)
        self.display2 = AdvancedOLEDManager(self.config_manager, 'Display2', self.localization_manager, self._display_content_update_handler, 2)
        
        self.transcription_display = None
        self.status_display = None
        self._setup_displays()

        print("CÉREBRO: Exibindo animação de inicialização...")
        try:
            self.status_display.show_logo("TLensLogoPretoTransparente.png") 
        except Exception as e:
            print(f"Aviso: Logo não carregou: {e}")

        # Inicia spinner na tela de baixo
        self.transcription_display.start_loading_animation("Iniciando...")

        def menu_event_handler(*args):
            event_type = args[0]
            payload = args[1:] if len(args) > 1 else None
            
            # [CORREÇÃO] Lida com eventos de tupla e eventos None
            if payload is not None and len(payload) >= 1:
                # Evento com payload de tupla, ex: ('brightness', 100) ou ('arg1',)
                payload_data = payload[0] if len(payload) == 1 else payload
                self.event_queue.put((event_type, payload_data))
            else:
                # Evento sem payload, ex: 'MENU_CLOSED' (payload é None ou tupla vazia)
                self.event_queue.put((event_type, None))

        self.menu_manager = MenuManager(self.config_manager, self.status_display, self.localization_manager, menu_event_handler)
        
        self.ble_manager = None # Será inicializado no método run()
        
        self.connection_manager = ConnectionManager(self.config_manager, self.switch_transcriber_mode)
        
        print("CÉREBRO: Criando instâncias dos transcribers...")
        self.local_transcriber_instance = LocalTranscriber(self.config_manager, self.event_queue)

        self.cloud_transcriber_instance = None
        
        self.current_transcriber = self.local_transcriber_instance

        print("--- Módulos inicializados. ---")

        # ==========================================================
        # ORDEM CRÍTICA:
        # 1. Logo já está na tela (foi chamada lá no começo do init)
        # 2. Esperamos o tempo (Sleep)
        # 3. SÓ DEPOIS ligamos o relógio e limpamos a logo
        # ==========================================================
        
        print("CÉREBRO: Segurando logo na tela...")
        time.sleep(4.0) # <--- O SLEEP TEM QUE SER AQUI
        
        # --- AGORA SIM, LIMPA E INICIA O RELÓGIO ---
        
        # Para animação de baixo
        self.transcription_display.stop_loading_animation()
        self.transcription_display.start_default_loop()
        
        # Limpa logo de cima e inicia relógio
        self.status_display.clear() 
        self.status_display.start_default_loop()
        
        self.recorder = None; self.is_audio_running = False; self.is_muted = False; self.screens_on = True
        self.clear_timer = None; self.clear_watcher = None
        self.config_save_timer = None

        self.screen1_content = []
        self.screen2_content = []
        
        self.current_sentence = []
        
        self.audio_thread = Thread(target=self._audio_loop, daemon=True)
        self.keyboard_thread = Thread(target=self._keyboard_listener_loop, daemon=True)

        self.ble_watchdog_source_id = None
        self.ble_watchdog_lock = Lock()
        self.BLE_WATCHDOG_TIMEOUT = 20

        self.display1.set_brightness(self.config_manager.get_setting('Display1', 'brightness', type_func=int, fallback=100))
        self.display2.set_brightness(self.config_manager.get_setting('Display2', 'brightness', type_func=int, fallback=100))
        print("--- Módulos inicializados. ---")

    def _setup_displays(self):
        swap = self.config_manager.get_setting('System', 'screen_swap', fallback='false').lower() == 'true'
        
        if swap:
            self.transcription_display, self.status_display = self.display2, self.display1
        else:
            self.transcription_display, self.status_display = self.display1, self.display2

        self.display1.clear()
        self.display2.clear()

        # Recarrega config de fontes
        self.display1.reload_config()
        self.display2.reload_config()

        self.transcription_display.set_mode('transcription')
        self.status_display.set_mode('status')

        # =================================================================
        # [CORREÇÃO V2] Verifica se o transcritor JÁ existe antes de checar
        # =================================================================
        
        # Usamos 'hasattr' para evitar o erro durante a inicialização (boot),
        # pois neste momento o transcritor ainda não foi criado.
        if hasattr(self, 'current_transcriber') and isinstance(self.current_transcriber, CloudTranscriber):
            self.status_display.set_transcription_mode('N')
        else:
            self.status_display.set_transcription_mode('L')

        # 2. Sincroniza o ícone de Mudo
        # MUDANÇA AQUI: Usa getattr(self, 'is_muted', False) para não dar erro se não existir ainda
        is_muted_safe = getattr(self, 'is_muted', False)
        self.status_display.set_muted_state(is_muted_safe)
        
        print(f"CÉREBRO: Telas definidas. Transcrição: Display{self.transcription_display.display_id}, Status: Display{self.status_display.display_id}")

    def _display_content_update_handler(self, event_type, payload):
        self.event_queue.put((event_type, payload))

    def _schedule_config_save(self):
        if self.config_save_timer and self.config_save_timer.is_alive(): self.config_save_timer.cancel()
        self.config_save_timer = Timer(3.0, self.config_manager.save_to_file)
        self.config_save_timer.start()

    def _keyboard_listener_loop(self):
        print("\n--- TECLADO VIRTUAL ATIVADO ---")
        print("  b,f,m,t,l,u: Comandos padrão")
        print("  1: Teleprompter Escrita | 2: Letreiro | 0: Parar")
        print("  s: Trocar telas | c: Trocar formato do relógio")
        print("---------------------------------\n")
        while True:
            try:
                char = input()
                if char: self.event_queue.put(('KEY_PRESS', char.lower()))
            except (EOFError, KeyboardInterrupt): break

    def switch_transcriber_mode(self, mode):
        if mode == 'wifi-cloud' and isinstance(self.current_transcriber, CloudTranscriber):
             # Se já estamos na nuvem, mas talvez o idioma mudou,
             # vamos forçar um reinício mesmo assim.
             print("CÉREBRO: Forçando reinício do CloudTranscriber (talvez por mudança de idioma).")
             if self.cloud_transcriber_instance:
                 self.cloud_transcriber_instance.stop()
                 self.cloud_transcriber_instance = None
        
        elif mode == 'local' and isinstance(self.current_transcriber, LocalTranscriber):
             if self.cloud_transcriber_instance: # Garante que a nuvem pare
                 self.cloud_transcriber_instance.stop()
                 self.cloud_transcriber_instance = None
             return # Já estamos em local

        print(f"CÉREBRO: [MUDANÇA] Trocando para o modo '{mode}'.")
        
        if isinstance(self.current_transcriber, CloudTranscriber):
            print("CÉREBRO: Parando transcritor de nuvem antigo...")
            self.current_transcriber.stop()
            self.cloud_transcriber_instance = None

        if mode == 'wifi-cloud':
            print("CÉREBRO: Iniciando nova instância do Transcritor de Nuvem...")
            self.cloud_transcriber_instance = CloudTranscriber(self.config_manager, self.event_queue)
            self.current_transcriber = self.cloud_transcriber_instance
            self.current_transcriber.start() 
            self.status_display.set_transcription_mode('N')
        else: # modo 'local'
            self.current_transcriber = self.local_transcriber_instance
            self.status_display.set_transcription_mode('L')

    def _init_recorder(self):
        """Inicia ou Reinicia o microfone de forma segura."""
        try:
            # Se já existe um gravador velho, joga fora para limpar memória/driver
            if self.recorder:
                try:
                    self.recorder.delete()
                except:
                    pass
                self.recorder = None

            audio_config = self.config_manager.get_section('Audio')
            mic_index = audio_config.getint('mic_device_index')
            frame_length = 512
            
            # Cria um novo do zero
            self.recorder = PvRecorder(device_index=mic_index, frame_length=frame_length)
            self.recorder.start()
            print(f"CÉREBRO: Microfone reiniciado no index {mic_index}.")
            return True
        except Exception as e:
            print(f"AUDIO ERRO: Falha ao iniciar microfone: {e}")
            return False

    def _audio_loop(self):
        # Tenta iniciar a primeira vez
        self._init_recorder()
        self.is_audio_running = True
        
        # Garante que a flag de sono comece falsa
        self.is_sleeping = False 

        # Atualiza status inicial do Mute para o App
        if self.ble_manager:
            self.ble_manager.is_muted = self.is_muted
            self.ble_manager.notify_status_update({'is_muted': self.is_muted})

        while self.is_audio_running:
            # --- LÓGICA DE STANDBY ---
            # Se estiver marcado como dormindo, economiza CPU
            if getattr(self, 'is_sleeping', False):
                time.sleep(0.2) # Dorme 200ms (baixa uso de CPU)
                continue
            
            # Se o microfone não existir (foi deletado no sleep), espera
            if self.recorder is None:
                time.sleep(0.2)
                continue
            # -------------------------

            try:
                # Tenta ler o áudio
                pcm = self.recorder.read()
                
                # Processa normalmente
                if self.current_transcriber and not self.is_muted and not self.transcription_display.is_teleprompter_active:
                    self.current_transcriber.process_audio_frame(pcm)
            except Exception as e:
                # Se der erro (ex: driver caiu), apenas espera
                time.sleep(0.1)
        
        # Fim do loop
        if self.recorder: self.recorder.delete()
    
    def _schedule_clear(self):
        self._cancel_clear()
        if not self.transcription_display.is_teleprompter_active:
            delay = self.config_manager.get_section('Transcription').getfloat('tempo_limpar_tela_seg')
            self.clear_timer = Timer(delay, self._clear_displays)
            self.clear_timer.start()

    def _cancel_clear(self):
        if self.clear_timer and self.clear_timer.is_alive(): self.clear_timer.cancel()
        
    def _clear_displays(self):
        self.transcription_display.clear()

    def _clear_sequence_watcher(self):
        while self.transcription_display.is_busy(): time.sleep(0.2)
        self._schedule_clear()

    # --- WATCHDOG ---
    def reset_ble_watchdog(self):
        """Reseta o timer do watchdog do BLE (Thread-safe)."""
        with self.ble_watchdog_lock:
            if self.ble_watchdog_source_id:
                GLib.source_remove(self.ble_watchdog_source_id)
                self.ble_watchdog_source_id = None
            
            self.ble_watchdog_source_id = GLib.timeout_add_seconds(
                self.BLE_WATCHDOG_TIMEOUT, 
                self._on_ble_watchdog_timeout
            )

    def _on_ble_watchdog_timeout(self):
        """Chamado se o PING do app não for recebido a tempo."""
        print("CÉREBRO: WATCHDOG TIMEOUT (GLib)! Não recebemos PING do app.")
        
        with self.ble_watchdog_lock:
            self.ble_watchdog_source_id = None
        
        self.event_queue.put(('BLE_DISCONNECTED', None))
        return False # Retorna False para o timer NÃO se repetir.

    def _cancel_ble_watchdog(self):
        """Cancela o timer do watchdog (usado na desconexão e desligamento)."""
        with self.ble_watchdog_lock:
            if self.ble_watchdog_source_id:
                GLib.source_remove(self.ble_watchdog_source_id)
                self.ble_watchdog_source_id = None
    
    def _handle_apply_setting_thread(self, key, value):
        """Thread para aplicar configurações sem travar o loop principal."""
        
        # [CORREÇÃO 1: NameError] Importa o GLib AQUI DENTRO para a thread enxergar
        from gi.repository import GLib
            
        try:
            print(f"CÉREBRO (Thread): Aplicando configuração: {key} = {value}")
            
            if key in ['screen_swap', 'clock_format', 'language']:
                self.config_manager.save_setting('System', key, value)
                
                if key == 'language':
                    print("CÉREBRO (Thread): Trocando idioma...")
                    self.localization_manager.load_language(value)
                    
                    # --- CORREÇÃO DO CRASH (SEGMENTATION FAULT) ---
                    was_using_local = (self.current_transcriber == self.local_transcriber_instance)
                    
                    # 1. Desacopla o transcritor do loop de áudio IMEDIATAMENTE
                    self.current_transcriber = None
                    time.sleep(0.2) # Espera o loop de áudio "soltar" o objeto
                    
                    # 2. Para o transcritor antigo com segurança
                    if self.local_transcriber_instance:
                        self.local_transcriber_instance.stop()
                    
                    time.sleep(0.5) # Pausa para liberar memória C (Picovoice)
                    
                    # 3. Recria o transcritor
                    self.local_transcriber_instance = LocalTranscriber(self.config_manager, self.event_queue)
                    
                    # 4. Reconecta se necessário
                    if was_using_local or self.connection_manager.current_state == 'local':
                        self.current_transcriber = self.local_transcriber_instance
                    
                    # 5. Se estiver na nuvem, força reconexão para atualizar idioma na URL
                    if self.connection_manager.current_state == 'wifi-cloud':
                        print("CÉREBRO (Thread): Forçando reinício do CloudTranscriber para novo idioma.")
                        GLib.idle_add(self.switch_transcriber_mode, 'wifi-cloud')
                    # --------------------------------------------------
                
                GLib.idle_add(self._setup_displays)
                if key == 'screen_swap':
                    GLib.idle_add(setattr, self.menu_manager, 'display', self.status_display)
                
                # 4. Recarrega as telas (para atualizar textos como "Brilho")
                # (Isso também é chamado pelo 'screen_swap')
                GLib.idle_add(self._setup_displays)
                if key == 'screen_swap':
                    GLib.idle_add(setattr, self.menu_manager, 'display', self.status_display)

            elif key == 'device_name':
                self.config_manager.save_setting('BLE', 'device_name', value)
                if self.ble_manager:
                    try:
                        new_name = BLEManager._device_name(self.config_manager)
                        adapter_obj = self.ble_manager.bus.get_object(BLEManager.BLUEZ_SERVICE_NAME, self.ble_manager.adapter_path)
                        adapter_props = dbus.Interface(adapter_obj, BLEManager.DBUS_PROP_IFACE)
                        adapter_props.Set('org.bluez.Adapter1', "Alias", dbus.String(new_name))
                        print(f"CÉREBRO: Nome do dispositivo alterado para '{new_name}'")

                        # [LINHA ADICIONADA]
                        # Envia o novo nome completo de volta para o app
                        # para que ele possa atualizar o AsyncStorage e o estado interno.
                        GLib.idle_add(self.ble_manager.notify_status_update, {'new_full_name': new_name})
                        
                    except Exception as e:
                        print(f"CÉREBRO: Erro ao tentar alterar o nome do dispositivo em tempo real: {e}")

            elif key in ['delay_entre_palavras_seg', 'tempo_limpar_tela_seg']:
                self.config_manager.save_setting('Transcription', key, value)
            
            elif key == 'brightness':
                value_int = int(value)
                self.config_manager.save_setting('Display1', 'brightness', value_int)
                self.config_manager.save_setting('Display2', 'brightness', value_int)
                GLib.idle_add(self.display1.set_brightness, value_int)
                GLib.idle_add(self.display2.set_brightness, value_int)
            
            elif key == 'fontsize':
                value_int = int(value)
                # Salva nos dois configs
                self.config_manager.save_setting('Display1', 'fontsize', value_int)
                self.config_manager.save_setting('Display2', 'fontsize', value_int)
                
                # Mostra o preview (que você já tinha)
                msg = self.localization_manager.get('font_altered_msg')
                GLib.idle_add(self.transcription_display.show_font_preview, msg, value_int)
                
                # [IMPORTANTE] Força os OLEDS a recarregarem a nova fonte
                GLib.idle_add(self.display1.reload_config)
                GLib.idle_add(self.display2.reload_config)
            
            else:
                self.config_manager.save_setting('Default', key, value)

            # Notifica o App que o valor mudou (seja pelo App ou pelo Menu)
            if self.ble_manager:
                self.ble_manager.notify_config_change(key, value)

            self._schedule_config_save()
            
        except Exception as e:
            print(f"💥 CÉREBRO (Thread): Erro ao aplicar configuração: {e}")
            import traceback
            traceback.print_exc()

    def _toggle_screens(self, notify_app=False):
        """
        Centraliza a lógica de ligar/desligar telas.
        notify_app=True é usado se a mudança veio do App (para ele ser notificado de volta).
        """
        print("CÉREBRO: Executando _toggle_screens...")
        
        self.screens_on = not self.screens_on
        
        if self.screens_on:
            print("CÉREBRO: Ligando telas.")
            self.display1.turn_on()
            self.display2.turn_on()
        else:
            print("CÉREBRO: Desligando telas.")
            self.display1.turn_off()
            self.display2.turn_off()
        
        # Se o comando veio do App (notify_app=True),
        # nós mandamos o STATUS_UPDATE de volta.
        if notify_app and self.ble_manager:
            print("CÉREBRO: Notificando app sobre mudança de tela.")
            self.ble_manager.notify_status_update({'screens_on': self.screens_on})

    def _process_event_queue(self):
        """
        Processa um item da fila de eventos.
        Chamado pelo GLib.idle_add() sempre que o loop estiver ocioso.
        """
        try:
            event_type, payload = self.event_queue.get_nowait()
        except Empty:
            return True # Retorna True para o GLib continuar chamando
            
        # --- INÍCIO DA LÓGICA ---

        if event_type == 'BUTTON_PRESS':
            # Verifica se estamos no modo Sleep (se sim, ignora botões B/F)
            if getattr(self, 'is_sleeping', False):
                return True

            btn_name = payload
            
            # LÓGICA CONTEXTUAL (Menu Aberto vs Fechado)
            if self.menu_manager.is_open():
                # Se menu aberto:
                # Botão B/+ (Middle) -> Sobe valor (UP)
                if btn_name == 'MENU_BRIGHTNESS': 
                    self.menu_manager.adjust_value('up')
                # Botão F/- (Bottom) -> Desce valor (DOWN)
                elif btn_name == 'MENU_FONTSIZE': 
                    self.menu_manager.adjust_value('down')
            else:
                # Se menu fechado:
                # Botão B/+ -> Abre menu Brilho
                if btn_name == 'MENU_BRIGHTNESS': 
                    self.menu_manager.open_menu('brightness')
                # Botão F/- -> Abre menu Fonte
                elif btn_name == 'MENU_FONTSIZE': 
                    self.menu_manager.open_menu('fontsize')

        # --- BOTÃO POWER (P) ---
        
        elif event_type == 'SINGLE_CLICK' and payload == 'POWER':
            # Se estiver dormindo, ignora clique simples (ou acorda, se preferir)
            if getattr(self, 'is_sleeping', False): return True
            
            # 1 Clique: Muta/Desmuta
            print("COMANDO: Toggle Mute")
            self.event_queue.put(('TOGGLE_MUTE', None))

        elif event_type == 'DOUBLE_CLICK' and payload == 'POWER':
             # Se estiver dormindo, ignora
            if getattr(self, 'is_sleeping', False): return True

            # 2 Cliques Rápidos: Liga/Desliga Telas (Stealth)
            print("COMANDO: Toggle Telas")
            self._toggle_screens(notify_app=True)

        elif event_type == 'HELD' and payload == 'POWER':
            # --- LÓGICA DE STANDBY / ACORDAR ---
            
            currently_sleeping = getattr(self, 'is_sleeping', False)

            if not currently_sleeping:
                # ==========================
                # COMANDO: DORMIR (STANDBY)
                # ==========================
                print("COMANDO: Entrando em Standby...")
                
                # 1. Feedback Visual (Logo + Spinner)
                try: self.status_display.show_logo("TLensLogoPretoTransparente.png")
                except: pass
                self.transcription_display.start_loading_animation("Suspendendo...")
                
                # 2. Espera estética
                time.sleep(2.5) 
                
                # 3. Limpa tudo
                self.transcription_display.stop_loading_animation()
                self.status_display.clear()

                # 4. Desliga Telas e Hardware
                self.display1.turn_off()
                self.display2.turn_off()
                self.screens_on = False

                if self.recorder:
                    try:
                        self.recorder.stop(); self.recorder.delete()
                    except: pass
                    self.recorder = None
                
                if self.ble_manager:
                    self.ble_manager.notify_status_update({'system_status': 'standby'})

                self.is_sleeping = True
                print("SISTEMA: Standby ativado.")

            else:
                # ==========================
                # COMANDO: ACORDAR
                # ==========================
                print("COMANDO: Acordando do Standby...")
                
                # 1. Liga hardware das telas
                self.display1.turn_on()
                self.display2.turn_on()
                self.screens_on = True

                # 2. Feedback Visual (Logo + Spinner)
                try: self.status_display.show_logo("TLensLogoPretoTransparente.png")
                except: pass
                self.transcription_display.start_loading_animation("Iniciando...")

                # 3. Restaura Áudio
                if self._init_recorder():
                    print("SISTEMA: Áudio pronto.")

                # 4. Tempo de carga simulado
                time.sleep(1.5)

                # 5. Volta ao normal
                self.transcription_display.stop_loading_animation()
                self.transcription_display.start_default_loop()
                
                self.status_display.clear()
                self.status_display.start_default_loop() # Relógio volta
                
                self.is_sleeping = False
                
                if self.ble_manager:
                    self.ble_manager.notify_status_update({'system_status': 'awake'})
        
        if event_type == 'DISPLAY_CONTENT_UPDATE':
            display_id, new_lines = payload
            content_changed = False
            if display_id == 1 and self.screen1_content != new_lines:
                self.screen1_content = new_lines
                content_changed = True
            elif display_id == 2 and self.screen2_content != new_lines:
                self.screen2_content = new_lines
                content_changed = True
            if content_changed and self.ble_manager:
                self.ble_manager.notify_screen_change(self.screen1_content, self.screen2_content)

        elif event_type == 'TELEPROMPTER_START':
            self._cancel_clear()

            # --- CORREÇÃO AQUI ---
            # O payload do BLE ainda tem a 'pairing_key'.
            # Removemos ela antes de chamar o display.
            payload.pop('pairing_key', None) 
            # --- FIM DA CORREÇÃO ---

            self.transcription_display.start_teleprompter(**payload)

        elif event_type == 'TELEPROMPTER_STOP':
            self.transcription_display.stop_teleprompter()

        elif event_type == 'APPLY_SETTING':
            key = None
            value = None

            # [CORREÇÃO 3: Crash da Tupla]
            if isinstance(payload, dict):
                key = payload.get('key')
                value = payload.get('value')
            elif isinstance(payload, (tuple, list)) and len(payload) == 2:
                key = payload[0]
                value = payload[1]

            if key and value is not None:
                Thread(target=self._handle_apply_setting_thread, args=(key, value), daemon=True).start()
            else:
                print(f"CÉREBRO: Payload APPLY_SETTING inválido: {payload}")
        
        elif event_type == 'TOGGLE_MUTE':
            self.is_muted = not self.is_muted
            self.status_display.set_muted_state(self.is_muted)
            
            # --- CORREÇÃO DO CONGELAMENTO ---
            if self.is_muted:
                # 1. Força o desaparecimento da bolinha de processamento
                self.status_display.set_processing_state(False)
                
                # 2. Agenda a limpeza da tela (para o texto não ficar travado ali)
                # O texto ficará visível pelo tempo configurado em 'tempo_limpar_tela_seg' e depois sumirá
                self._schedule_clear()
            # -------------------------------

            if self.ble_manager:
                self.ble_manager.is_muted = self.is_muted
                self.ble_manager.notify_status_update({'is_muted': self.is_muted})

        elif event_type == 'TOGGLE_SCREENS':
            self._toggle_screens(notify_app=True)

        elif event_type == 'PAIR_REQUEST':
            print("CÉREBRO: Recebido pedido de pareamento.")
            if self.ble_manager and not self.ble_manager.is_paired:
                new_key = uuid.uuid4().hex
                self.config_manager.save_setting('BLE', 'pairing_key', new_key)
                self.ble_manager.send_pairing_key(new_key)
                self.config_manager.save_to_file()
            else:
                print("CÉREBRO: Pedido de pareamento ignorado, já pareado ou BLE não pronto.")
        
        elif event_type == 'UNPAIR':
            self.config_manager.save_setting('BLE', 'pairing_key', '')
            self.config_manager.save_to_file()
            if self.ble_manager:
                self.ble_manager.pairing_key = ''
                self.ble_manager.is_paired = False
            print("CÉREBRO: Dispositivo despareado.")

        elif event_type == 'KEY_PRESS':
            char = payload
            if char == '1':
                test_payload = {'mode': 'writing', 'text': 'Este e um teste do modo de escrita', 'font_size': 14, 'speed': 0.3}
                self.event_queue.put(('TELEPROMPTER_START', test_payload))
            elif char == '2':
                test_payload = {'mode': 'scrolling', 'text': '--- TEXTO EM MOVIMENTO ---', 'font_size': 16, 'speed': 2, 'direction': 'left'}
                self.event_queue.put(('TELEPROMPTER_START', test_payload))
            elif char == '0':
                self.event_queue.put(('TELEPROMPTER_STOP', None))
            elif char == 's':
                current = self.config_manager.get_setting('System', 'screen_swap', 'false').lower() == 'true'
                self.event_queue.put(('APPLY_SETTING', {'key': 'screen_swap', 'value': not current}))
            elif char == 'c':
                current = self.config_manager.get_setting('System', 'clock_format', '24h')
                new_format = '12h' if current == '24h' else '24h'
                self.event_queue.put(('APPLY_SETTING', {'key': 'clock_format', 'value': new_format}))
            elif self.menu_manager.is_open():
                if char in ('+', 'f'): self.menu_manager.adjust_value('up')
                elif char in ('-', 'b'): self.menu_manager.adjust_value('down')
            else:
                if char == 'b': self.menu_manager.open_menu('brightness')
                elif char == 'f': self.menu_manager.open_menu('fontsize')
                elif char == 'm':
                    # Redireciona para o evento principal para garantir que a correção de tela funcione
                    self.event_queue.put(('TOGGLE_MUTE', None))
                elif char == 't':
                    self._toggle_screens(notify_app=False)
                elif char == 'l':
                    current_lang = self.config_manager.get_setting('System', 'language', 'pt')
                    new_lang = 'en' if current_lang == 'pt' else 'pt'
                    self.event_queue.put(('APPLY_SETTING', {'key': 'language', 'value': new_lang}))
                    line1 = self.localization_manager.get('lang_changed_msg')
                    line2 = f"{new_lang.upper()} - {self.localization_manager.get('restart_needed_msg')}"
                    self.transcription_display.show_temporary_message([line1, line2], duration=4)
                elif char == 'u' and self.ble_manager:
                     print("--- SIMULANDO DESPAREAMENTO PARA TESTE ---")
                     self.event_queue.put(('UNPAIR', {'pairing_key': self.ble_manager.pairing_key}))
        
        elif event_type in ['NOVA_PALAVRA', 'FIM_DA_FALA'] and self.transcription_display.is_teleprompter_active:
            pass # Ignora

        # [CORREÇÃO 4: Crash do NoneType]
        elif event_type == 'MENU_CLOSED':
             if self.transcription_display:
                self.transcription_display.clear()
        
        elif event_type == 'BLE_CONNECTED':
            self.connection_manager.set_ble_status(True); self.status_display.set_ble_status(True)
            self.transcription_display.show_temporary_message(self.localization_manager.get('ble_connected'))
            self.reset_ble_watchdog()
            
            # Envia todas as configurações atuais para o App
            Thread(target=self._send_initial_settings_to_app, daemon=True).start()
        
        elif event_type == 'BLE_DISCONNECTED':
            print("CÉREBRO: Recebido evento de desconexão (do Watchdog ou BLE).")
            self._cancel_ble_watchdog() 
            self.connection_manager.set_ble_status(False) 
            self.status_display.set_ble_status(False)
            self.transcription_display.show_temporary_message(self.localization_manager.get('ble_disconnected'))

        elif event_type == 'CLOUD_CONNECTION_FAILED':
            print("CÉREBRO: Falha na conexão com a nuvem! Voltando para modo local.")
            self.connection_manager.notify_cloud_failure()
            self.switch_transcriber_mode('local')
        
        elif event_type == 'REMOTE_SETTING':
            pass
        
        elif event_type == 'BLE_TEXT_DATA':
            text = payload.get('text', '')
            is_final = payload.get('is_final', False)
            if text: self.event_queue.put(('NOVA_PALAVRA', text))
            if is_final: self.event_queue.put(('FIM_DA_FALA', None))
        
        elif event_type == 'NOVA_PALAVRA' and self.screens_on:
            word = payload
            self.current_sentence.append(word)
            self._cancel_clear(); self.status_display.set_processing_state(True)
            self.transcription_display.add_word(word)
        
        elif event_type == 'FIM_DA_FALA' and self.screens_on:
            self.status_display.set_processing_state(False)
            if self.current_sentence and self.ble_manager:
                full_sentence = " ".join(self.current_sentence).strip()
                if full_sentence: 
                    self.ble_manager.send_transcription_text(full_sentence)
                self.current_sentence = []
            
            if not self.clear_watcher or not self.clear_watcher.is_alive():
                self.clear_watcher = Thread(target=self._clear_sequence_watcher, daemon=True); self.clear_watcher.start()

        elif event_type == 'WIFI_SCAN':
            def do_scan_and_send():
                # 1. Roda o scan
                networks_list = self.wifi_manager.scan_networks()
                
                # 2. [O LOG QUE VOCÊ PEDIU] Printa a lista no terminal do Pi
                print("--- DEBUG WIFI SCAN ---")
                print(networks_list)
                print("-----------------------")
                
                # 3. Envia para o App
                self.ble_manager.send_wifi_list(networks_list)

            # Inicia a thread com a nova função
            Thread(target=do_scan_and_send, daemon=True).start()

        elif event_type == 'WIFI_CONNECT':
            ssid, psk = payload.get('ssid'), payload.get('psk')
            def do_connect():
                # Agora retorna (ok, msg, ssid, conn_name, autoconnect)
                ok, msg, result_ssid, conn_name, autoconnect = self.wifi_manager.connect(ssid, psk)
                
                status_payload = {
                    "success": ok, 
                    "msg": msg, 
                    "ssid": result_ssid, 
                    "conn_name": conn_name,
                    "autoconnect": autoconnect,
                    "is_active": ok,
                    "is_saved": ok
                }
                self.ble_manager.send_wifi_status(status_payload)
            Thread(target=do_connect, daemon=True).start()

        elif event_type == 'WIFI_FORGET':
            # Payload esperado: {'conn_name': 'nome-real-da-conexao'}
            conn_name = payload.get('conn_name')
            if conn_name:
                def do_forget():
                    self.wifi_manager.forget_network(conn_name)
                    # Força um re-scan para o app atualizar a lista
                    self.event_queue.put(('WIFI_SCAN', None))
                Thread(target=do_forget, daemon=True).start()

        elif event_type == 'WIFI_SET_AUTOCONNECT':
            # Payload esperado: {'conn_name': 'nome-real', 'value': True/False}
            conn_name = payload.get('conn_name')
            value = payload.get('value')
            if conn_name and value is not None:
                def do_set_auto():
                    self.wifi_manager.set_autoconnect(conn_name, value)
                Thread(target=do_set_auto, daemon=True).start()

        elif event_type == 'GET_SAVED_NETWORKS':
            def do_get_saved():
                # Esta função agora retorna o dicionário { SSID: { conn_name, autoconnect } }
                saved_map = self.wifi_manager.get_saved_connections()
                
                # Converte o mapa para uma lista que o app entende
                saved_list = []
                for ssid, details in saved_map.items():
                    saved_list.append({
                        "ssid": ssid,
                        "conn_name": details['conn_name'],
                        "autoconnect": details['autoconnect'],
                        "is_saved": True,
                        "is_active": False # Não podemos saber o status 'active' daqui
                    })
                
                self.ble_manager.send_saved_networks_list(saved_list)
            Thread(target=do_get_saved, daemon=True).start()
                
        return True # Manter o GLib chamando

    def _send_initial_settings_to_app(self):
        """Coleta todas as configurações atuais e envia para o App."""
        if not self.ble_manager: return
        
        try:
            time.sleep(1.0) 
            
            all_settings = {
                'brightness': self.config_manager.get_setting('Display1', 'brightness', type_func=int, fallback=100),
                'fontsize': self.config_manager.get_setting('Display1', 'fontsize', type_func=int, fallback=10),
                'language': self.config_manager.get_setting('System', 'language', fallback='pt'),
                'clock_format': self.config_manager.get_setting('System', 'clock_format', fallback='24h'),
                'screen_swap': self.config_manager.get_setting('System', 'screen_swap', fallback='false').lower() == 'true',
                'delay_entre_palavras_seg': self.config_manager.get_setting('Transcription', 'delay_entre_palavras_seg', type_func=float, fallback=0.5),
                'tempo_limpar_tela_seg': self.config_manager.get_setting('Transcription', 'tempo_limpar_tela_seg', type_func=float, fallback=5.0),
                'device_name': self.config_manager.get_setting('BLE', 'device_name', fallback='TLens'),
                'is_muted': self.is_muted,
            }
            self.ble_manager.notify_initial_settings(all_settings)
            print("CÉREBRO: Configurações iniciais enviadas para o App.")
        except Exception as e:
            print(f"CÉREBRO: Falha ao enviar configurações iniciais: {e}")

    def _send_initial_settings_to_app(self):
        """Coleta todas as configurações atuais e envia para o App."""
        if not self.ble_manager: return
        
        try:
            time.sleep(1.0) 
            
            all_settings = {
                'brightness': self.config_manager.get_setting('Display1', 'brightness', type_func=int, fallback=100),
                'fontsize': self.config_manager.get_setting('Display1', 'fontsize', type_func=int, fallback=10),
                'language': self.config_manager.get_setting('System', 'language', fallback='pt'),
                'clock_format': self.config_manager.get_setting('System', 'clock_format', fallback='24h'),
                'screen_swap': self.config_manager.get_setting('System', 'screen_swap', fallback='false').lower() == 'true',
                'delay_entre_palavras_seg': self.config_manager.get_setting('Transcription', 'delay_entre_palavras_seg', type_func=float, fallback=0.5),
                'tempo_limpar_tela_seg': self.config_manager.get_setting('Transcription', 'tempo_limpar_tela_seg', type_func=float, fallback=5.0),
                'device_name': self.config_manager.get_setting('BLE', 'device_name', fallback='TLens'),
                'is_muted': self.is_muted,
                'screens_on': self.screens_on, # <-- [ADIcionA ESSA LINHA]
            }
            self.ble_manager.notify_initial_settings(all_settings)
            print("CÉREBRO: Configurações iniciais enviadas para o App.")
        except Exception as e:
            print(f"CÉREBRO: Falha ao enviar configurações iniciais: {e}")

    def run(self):
        print("CÉREBRO: Configurando DBusGMainLoop...")
        dbus.mainloop.glib.DBusGMainLoop(set_as_default=True)

        print("CÉREBRO: Iniciando serviço BLE (DBus)...")
        self.ble_manager = BLEManager.start_ble_service(
            self.mainloop,
            self.config_manager,
            self.event_queue,
            self
        )
        
        if not self.ble_manager:
            print("💥 CÉREBRO: FALHA CRÍTICA AO INICIAR O BLE. Verifique o BlueZ.")
            return
            
        self.ble_manager.adapter_path = BLEManager.find_adapter(self.ble_manager.bus)

        GLib.idle_add(self._process_event_queue)
        
        self.connection_manager.start()
        self.audio_thread.start()
        self.keyboard_thread.start()
        self.status_display.set_processing_state(False)
        
        try:
            print("CÉREBRO: Loop principal (GLib) iniciado. Rodando...")
            self.mainloop.run()

        except KeyboardInterrupt: 
            print("\nCtrl+C recebido. Encerrando...")
        finally:
            print("\n--- Iniciando sequência de desligamento ---")
            
            if self.mainloop.is_running():
                self.mainloop.quit()
                
            self._cancel_ble_watchdog() 
            self.is_audio_running = False
            if hasattr(self, 'transcription_display'): self.transcription_display.stop_teleprompter()
            
            self.connection_manager.stop()
            
            if self.audio_thread.is_alive(): self.audio_thread.join(timeout=1.0)
            
            if self.local_transcriber_instance: self.local_transcriber_instance.stop()
            if self.cloud_transcriber_instance: self.cloud_transcriber_instance.stop()
            
            if self.config_save_timer: self.config_save_timer.cancel()
            self.config_manager.save_to_file()
            
            self._cancel_clear()
            if self.display1: self.display1.shutdown()
            if self.display2: self.display2.shutdown()
            
            print("--- Sistema encerrado de forma limpa. ---")

if __name__ == '__main__':
    controller = MainController()
    controller.run()