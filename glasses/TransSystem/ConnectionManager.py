import time
import socket
import subprocess
from threading import Thread

class ConnectionManager:
    def __init__(self, config_manager, brain_callback):
        self.config = config_manager.get_section('Connection')
        self.brain_callback = brain_callback
        self.current_state = 'local' # Pode ser 'local', 'wifi-cloud', 'ble-cloud'
        
        self.ping_host = self.config.get('ping_host')
        self.max_latency_ms = self.config.getfloat('max_latency_ms')
        self.check_interval = self.config.getfloat('check_interval_sec')
        self.cooldown = self.config.getfloat('cloud_retry_cooldown_sec')
        
        self.cloud_failed_timestamp = 0
        self.is_ble_connected = False # [NOVO]
        
        self.running = True
        self.thread = Thread(target=self._run, daemon=True)

    def start(self):
        self.thread.start()

    def stop(self):
        self.running = False
        if self.thread.is_alive(): self.thread.join()

    def notify_cloud_failure(self):
        print("GERENTE DE CONEXÃO: Notificado de falha na nuvem. Iniciando cooldown.")
        self.cloud_failed_timestamp = time.time()

    def set_ble_status(self, is_connected):
        """[NOVO] O Cérebro chama esta função para nos avisar do status do BLE."""
        self.is_ble_connected = is_connected
        print(f"GERENTE DE CONEXÃO: Status do BLE atualizado para {is_connected}.")
        # Força uma verificação imediata para trocar de modo rapidamente
        self._check_and_decide()

    def _check_latency(self):
        try:
            output = subprocess.check_output(
                ['ping', '-c', '1', '-W', '2', self.ping_host],
                stderr=subprocess.STDOUT, universal_newlines=True
            )
            line = output.strip().split('\n')[-1]
            if 'rtt' in line: return float(line.split('/')[4])
        except Exception:
            return 9999
        return 9999

    def _check_and_decide(self):
        
        # [MUDANÇA] A lógica agora ignora o status do BLE e 
        # SEMPRE avalia a conexão (local vs wifi-cloud).
        
        ideal_state = 'local' # Começa com o padrão mais seguro
        
        # 1. Estamos em cooldown de falha?
        time_since_failure = time.time() - self.cloud_failed_timestamp
        if time_since_failure < self.cooldown:
            ideal_state = 'local'
            print(f"GERENTE DE CONEXÃO: Decisão -> Em cooldown. modo 'local'.")
        else:
            # 2. Se não, a conexão WiFi é boa?
            latency = self._check_latency()
            print(f"GERENTE DE CONEXÃO: Latência WiFi: {latency:.2f}ms.")
            if latency < self.max_latency_ms:
                ideal_state = 'wifi-cloud'
                print("GERENTE DE CONEXÃO: Decisão -> Latência boa, modo 'wifi-cloud'.")
            else:
                ideal_state = 'local'
                print("GERENTE DE CONEXÃO: Decisão -> Latência alta, modo 'local'.")

        # 3. Se o estado ideal for diferente do atual, notifica o Cérebro
        if ideal_state != self.current_state:
            print(f"GERENTE DE CONEXÃO: Mudança de estado necessária! {self.current_state} -> {ideal_state}")
            self.current_state = ideal_state
            self.brain_callback(self.current_state)

    def _run(self):
        print("GERENTE DE CONEXÃO: Iniciado.")
        while self.running:
            self._check_and_decide()
            time.sleep(self.check_interval)
