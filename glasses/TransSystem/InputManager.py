import time
import subprocess
from threading import Thread

class InputManager(Thread):
    def __init__(self, config_manager, event_queue):
        Thread.__init__(self)
        self.daemon = True
        self.event_queue = event_queue
        self.config = config_manager.get_section('Buttons')
        
        # --- AJUSTES DE SENSIBILIDADE ---
        self.DOUBLE_CLICK_WINDOW = 1.0  # Aumentado (era 0.4). Mais fácil acertar o duplo.
        self.HOLD_TIME = 3.0            # Reduzido para 3s (5s é muito tempo esperando)
        
        # Lê do config
        self.pin_map = {
            'MENU_BRIGHTNESS': str(self.config.getint('menu_brightness_pin')),
            'MENU_FONTSIZE': str(self.config.getint('menu_fontsize_pin')),
            'POWER': str(self.config.getint('power_multifunction_pin'))
        }
        
        self.last_values = {}
        self.power_press_start = 0
        self.power_last_click = 0
        self.chip_number = "1" 
        
        self.running = True
        print(f"INPUT MANAGER (Otimizado): Pinos {list(self.pin_map.values())}")

    def _read_pin(self, pin_offset):
        try:
            cmd = ["gpioget", self.chip_number, pin_offset]
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode == 0:
                return int(result.stdout.strip())
            return 1 
        except Exception:
            return 1

    def run(self):
        # Leitura Inicial
        for name, offset in self.pin_map.items():
            val = self._read_pin(offset)
            self.last_values[name] = val

        print("INPUT MANAGER: Monitorando com alta velocidade...")

        while self.running:
            for name, offset in self.pin_map.items():
                current_value = self._read_pin(offset)
                last_value = self.last_values.get(name, 1)
                
                if last_value != current_value:
                    # Borda de descida (1 -> 0): APERTOU
                    if last_value == 1 and current_value == 0:
                        self.handle_press_down(name)
                    
                    # Borda de subida (0 -> 1): SOLTOU
                    elif last_value == 0 and current_value == 1:
                        self.handle_release_up(name)

                    self.last_values[name] = current_value
            
            # --- AJUSTE DE VELOCIDADE ---
            # Diminuído de 0.08 para 0.03
            # Isso faz o sistema ler ~30 vezes por segundo.
            # Fica muito mais responsivo a cliques rápidos.
            time.sleep(0.03) 

    def handle_press_down(self, button_name):
        if button_name == 'POWER':
            self.power_press_start = time.time()
        else:
            self.event_queue.put(('BUTTON_PRESS', button_name))

    def handle_release_up(self, button_name):
        if button_name == 'POWER':
            duration = time.time() - self.power_press_start
            if duration >= self.HOLD_TIME:
                print(f"LOGICA POWER: HOLD detectado ({duration:.1f}s)")
                self.event_queue.put(('HELD', 'POWER'))
            else:
                self._handle_power_clicks()

    def _handle_power_clicks(self):
        now = time.time()
        # Verifica se o tempo entre o último clique e agora é menor que a janela
        if (now - self.power_last_click) < self.DOUBLE_CLICK_WINDOW:
            print("LOGICA POWER: Double Click (Confirmado)")
            self.event_queue.put(('DOUBLE_CLICK', 'POWER'))
            self.power_last_click = 0 # Reseta para evitar triplo clique confuso
        else:
            self.power_last_click = now
            # Inicia thread para esperar ver se vem um segundo clique
            Thread(target=self._wait_click, args=(now,), daemon=True).start()

    def _wait_click(self, ref_time):
        time.sleep(self.DOUBLE_CLICK_WINDOW)
        # Se o power_last_click não mudou, significa que ninguém clicou de novo
        if self.power_last_click == ref_time:
            print("LOGICA POWER: Single Click (Timeout)")
            self.event_queue.put(('SINGLE_CLICK', 'POWER'))

    def stop(self):
        self.running = False