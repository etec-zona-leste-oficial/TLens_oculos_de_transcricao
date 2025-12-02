import configparser
import os
import threading

class ConfigManager:
    def __init__(self, path='config.ini'):
        self.path = path
        self.parser = configparser.ConfigParser()
        self.last_modified = 0
        self.lock = threading.Lock()
        if not os.path.exists(self.path):
            print(f"AVISO: Arquivo de configuração '{self.path}' não encontrado.")
        else:
            self.parser.read(self.path)
            self.last_modified = os.path.getmtime(self.path)

    def reload_if_changed(self):
        with self.lock:
            try:
                mtime = os.path.getmtime(self.path)
                if mtime != self.last_modified:
                    self.parser.read(self.path)
                    self.last_modified = mtime
                    return True
            except FileNotFoundError: return False
        return False

    def get_section(self, section):
        with self.lock:
            # Retorna a seção, ou um parser vazio se a seção não existir, para evitar erros
            if self.parser.has_section(section):
                return self.parser[section]
            return configparser.ConfigParser()[section] # Retorna um objeto vazio seguro

    # [NOVO] Função auxiliar para ler uma configuração de forma segura
    def get_setting(self, section, option, fallback=None, type_func=None):
        """Lê uma única configuração com fallback e conversão de tipo opcionais."""
        with self.lock:
            value = self.parser.get(section, option, fallback=fallback)
            if type_func and value is not None:
                try:
                    return type_func(value)
                except (ValueError, TypeError):
                    return fallback
            return value

    def save_setting(self, section, option, value):
        with self.lock:
            try:
                if not self.parser.has_section(section):
                    self.parser.add_section(section)
                self.parser.set(section, option, str(value))
                # Não salva no arquivo aqui, apenas em memória
            except Exception as e:
                print(f"CONFIG: Erro ao definir configuração em memória: {e}")

    def save_to_file(self):
        with self.lock:
            try:
                with open(self.path, 'w') as configfile:
                    self.parser.write(configfile)
                print(f"CONFIG (disco): Alterações salvas em '{self.path}'")
                self.last_modified = os.path.getmtime(self.path)
            except Exception as e:
                print(f"CONFIG: Erro ao salvar configurações no arquivo: {e}")

