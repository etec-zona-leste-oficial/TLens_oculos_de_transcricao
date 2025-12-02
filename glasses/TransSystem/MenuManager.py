from threading import Timer
import math

class MenuManager:
    def __init__(self, config_manager, display, localization_manager, brain_callback):
        self.config_manager = config_manager
        self.display = display
        self.localization_manager = localization_manager
        self.brain_callback = brain_callback
        self._current_menu = None
        self._inactivity_timer = None
        self.INACTIVITY_TIMEOUT = 5.0
        
        # Valores internos do menu (em % e px)
        self.values = {
            'brightness': 0, # Será preenchido por _load_values
            'fontsize': 0,   # Será preenchido por _load_values
        }
        
        # Limites em % e px
        self.limits = {
            'brightness': {'min': 0, 'max': 100, 'step': 10},
            'fontsize': {'min': 8, 'max': 16, 'step': 1},
        }
        
        self._load_values() # Carrega os valores iniciais

    def _load_values(self):
        """Carrega os valores do config e converte para o formato do menu."""
        # Carrega o valor 0-255 do config
        raw_brightness = self.config_manager.get_setting('Display1', 'brightness', type_func=int, fallback=100)
        # Converte para 0-100% para o menu
        self.values['brightness'] = int(round(raw_brightness / 255.0 * 100.0))
        
        # Carrega o valor em px
        self.values['fontsize'] = self.config_manager.get_setting('Display1', 'fontsize', type_func=int, fallback=10)

    def _reset_timer(self):
        if self._inactivity_timer: self._inactivity_timer.cancel()
        self._inactivity_timer = Timer(self.INACTIVITY_TIMEOUT, self.close_menu)
        self._inactivity_timer.start()

    def _draw(self):
        if not self._current_menu: return
        
        if self._current_menu == 'brightness':
            option_name_key = 'brightness_menu'
        else:
            option_name_key = 'fontsize_menu'
        
        option_name = self.localization_manager.get(option_name_key)
        
        value = self.values[self._current_menu]
        text_to_draw = f"{option_name}: {value}%" if self._current_menu == 'brightness' else f"{option_name}: {value}pt"
        self.display.draw_menu_text(text_to_draw)

    def is_open(self):
        return self._current_menu is not None

    def open_menu(self, menu_type):
        is_already_open = self.is_open()
        
        # [CORREÇÃO DE SINCRONIZAÇÃO]
        # Sempre que o menu é aberto, lê o valor mais recente do config
        self._load_values() 
        
        if is_already_open and self._current_menu == menu_type:
            self._reset_timer()
            return

        self._current_menu = menu_type
        if not is_already_open: self.display.pause_status_loop()
        print(f"MENU: Aberto/Trocado para menu '{menu_type}'")
        self._reset_timer(); self._draw()

    def adjust_value(self, direction):
        if not self.is_open(): return
        self._reset_timer()
        key = self._current_menu; limits = self.limits[key]
        
        # Ajusta o valor interno (0-100% ou 8-16px)
        if direction == 'up': self.values[key] = min(limits['max'], self.values[key] + limits['step'])
        elif direction == 'down': self.values[key] = max(limits['min'], self.values[key] - limits['step'])
        
        print(f"MENU: Valor de '{key}' ajustado para {self.values[key]}")
        self._draw()
        
        # [CORREÇÃO DE SINCRONIZAÇÃO] Converte o valor antes de enviar
        value_to_send = self.values[key]
        if key == 'brightness':
            # Converte 0-100% para 0-255
            value_to_send = int(round((self.values[key] / 100.0) * 255.0))

        # Envia o valor (convertido ou não) para o main.py
        self.brain_callback('APPLY_SETTING', key, value_to_send)

    def close_menu(self):
        if not self.is_open(): return
        print("MENU: Fechando e salvando configurações (não mais necessário, main.py já salvou).")
        if self._inactivity_timer: self._inactivity_timer.cancel()
        
        self.display.resume_status_loop()
        
        # Não precisamos salvar aqui, o 'adjust_value' já enviou
        # o comando para o main.py, que já iniciou a thread de salvar.
        
        self._current_menu = None
        self.brain_callback('MENU_CLOSED')