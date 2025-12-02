# WifiManager.py
import subprocess
import shlex
import time

class WifiManager:
    def _run(self, cmd_string):
        try:
            res = subprocess.run(cmd_string, capture_output=True, text=True, timeout=60, shell=True)
            if res.returncode != 0 and res.stderr:
                print(f"[ERRO] Falha no comando '{cmd_string}': {res.stderr.strip()}")
            return res
        except subprocess.TimeoutExpired:
            print(f"[ERRO] Timeout de 60s executando: '{cmd_string}'")
            return None
        except Exception as e:
            print(f"[ERRO] Falha ao executar {cmd_string}: {e}")
            return None

    # ------------------------------
    # FUNÇÃO DE STATUS (OK)
    # ------------------------------
    def status(self):
        res = self._run("nmcli -t -f ACTIVE,NAME,DEVICE con show --active")
        if not res or res.returncode != 0: return None
        for line in res.stdout.splitlines():
            parts = line.strip().split(":")
            if len(parts) >= 3 and parts[0] == "yes":
                return {"active_name": parts[1], "device": parts[2]}
        return None

    # ------------------------------
    # FUNÇÃO DE GERENCIAMENTO (CORRIGIDA)
    # ------------------------------
    def get_saved_connections(self):
        """
        Retorna um dicionário de conexões salvas.
        Formato: { 'SSID': {'conn_name': 'NomeReal', 'autoconnect': True/False} }
        """
        print("WIFI: Obtendo conexões salvas...")
        
        # [A CORREÇÃO ESTÁ AQUI]
        # Trocado 'connection.autoconnect' por 'AUTOCONNECT'
        cmd_string = "nmcli -t -f NAME,TYPE,AUTOCONNECT con show"
        res = self._run(cmd_string)
        
        saved_conns = {}
        if not res or res.returncode != 0:
            return saved_conns
            
        for line in res.stdout.strip().splitlines():
            parts = line.replace("\\:", "%%COLON%%").split(':')
            
            if len(parts) >= 3 and parts[1] == '802-11-wireless':
                conn_name = parts[0].replace("%%COLON%%", ":")
                autoconnect = (parts[2] == 'yes')
                
                ssid_res = self._run(f"nmcli -t -f 802-11-wireless.ssid con show {shlex.quote(conn_name)}")
                
                if ssid_res and ssid_res.returncode == 0:
                    ssid = ssid_res.stdout.strip().split(':')[-1].replace("%%COLON%%", ":")
                    if ssid:
                        saved_conns[ssid] = {'conn_name': conn_name, 'autoconnect': autoconnect}
        
        print(f"WIFI: Conexões salvas encontradas: {saved_conns}")
        return saved_conns

    def forget_network(self, name):
        print(f"WIFI: Esquecendo rede com nome '{name}'...")
        res = self._run(f"sudo nmcli con del {shlex.quote(name)}")
        return res.returncode == 0

    def set_autoconnect(self, name, value_bool):
        value_str = "yes" if value_bool else "no"
        print(f"WIFI: Definindo autoconnect={value_str} para '{name}'...")
        # (Este comando está CORRETO, 'connection.autoconnect' é a propriedade certa)
        res = self._run(f"sudo nmcli con mod {shlex.quote(name)} connection.autoconnect {value_str}")
        return res.returncode == 0

    # ------------------------------
    # FUNÇÃO DE SCAN (OK)
    # ------------------------------
    def scan_networks(self):
        print("WIFI: Solicitando re-scan (com sudo)...")
        self._run('sudo nmcli dev wifi rescan')
        
        print("WIFI: Aguardando 5s pelo resultado do scan...")
        time.sleep(5.0) 
        
        print("WIFI: Listando redes e anotando...")
        cmd_string = 'nmcli -t -f SSID,SIGNAL,SECURITY dev wifi'
        res = self._run(cmd_string)

        if not res or res.returncode != 0:
            return []

        current_status = self.status()
        active_conn_name = current_status['active_name'] if current_status else None
        saved_conns_map = self.get_saved_connections() # Agora esta função vai funcionar

        networks = []
        seen_ssids = set()

        for line in res.stdout.strip().splitlines():
            parts = line.replace("\\:", "%%COLON%%").split(":")
            if len(parts) < 3: continue
            security = parts[-1]
            try: signal = int(parts[-2])
            except ValueError: continue
            ssid = ":".join(parts[:-2]).replace("%%COLON%%", ":").strip()

            if not ssid or ssid in seen_ssids:
                continue
            
            seen_ssids.add(ssid)
            
            is_saved = ssid in saved_conns_map
            conn_details = saved_conns_map.get(ssid, {})
            conn_name = conn_details.get('conn_name', None)
            autoconnect = conn_details.get('autoconnect', False)
            is_active = is_saved and (conn_name == active_conn_name)

            networks.append({
                "ssid": ssid,
                "signal": signal,
                "security": security,
                "is_saved": is_saved,
                "is_active": is_active,
                "conn_name": conn_name,
                "autoconnect": autoconnect
            })

        networks.sort(key=lambda x: (x["is_active"], x["is_saved"], x["signal"]), reverse=True)
        print("--- DEBUG WIFI SCAN ---")
        print(networks)
        print("-----------------------")
        return networks[:20]

    # ------------------------------
    # FUNÇÃO DE CONEXÃO (OK)
    # ------------------------------
    def connect(self, ssid, psk):
        print(f"WIFI: Tentativa de conexão SEGURA para '{ssid}'...")
        current_status = self.status()
        current_conn_name = current_status['active_name'] if current_status else None
        
        if current_conn_name: print(f"WIFI: Conexão atual (fallback) é '{current_conn_name}'")

        cmd_list = ['sudo', 'nmcli', 'dev', 'wifi', 'connect', ssid]
        if psk: cmd_list.extend(['password', psk])
        cmd_string = " ".join([shlex.quote(part) for part in cmd_list])
        res = self._run(cmd_string)

        if res.returncode == 0:
            print(f"WIFI: Conexão com '{ssid}' bem-sucedida.")
            time.sleep(1.0)
            
            new_status = self.status()
            if not new_status:
                return (False, "Conectado, mas falha ao ler status.", ssid, None, False)

            new_connection_name = new_status['active_name']
            print(f"WIFI: Novo nome de conexão detectado: '{new_connection_name}'")
            
            safe_new_name = shlex.quote(new_connection_name)
            self._run(f'sudo nmcli con mod {safe_new_name} connection.autoconnect-priority 100 connection.autoconnect yes')
            
            if current_conn_name and current_conn_name != new_connection_name:
                self._run(f'sudo nmcli con mod {shlex.quote(current_conn_name)} connection.autoconnect-priority 10 connection.autoconnect yes')
            
            return (True, "Conectado!", ssid, new_connection_name, True)
        else:
            print(f"WIFI: Falha ao conectar em '{ssid}'. Revertendo...")
            safe_ssid = shlex.quote(ssid)
            self._run(f'sudo nmcli con del {safe_ssid}')
            
            if current_conn_name:
                self._run(f'sudo nmcli con up {shlex.quote(current_conn_name)}')
            
            return (False, res.stderr if res.stderr else "Falha na conexão.", ssid, None, False)