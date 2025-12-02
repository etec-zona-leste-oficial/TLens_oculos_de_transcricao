class LocalizationManager:
    def __init__(self, config_manager):
        self.texts = {
            'pt': {
                'brightness_menu': "Brilho",
                'fontsize_menu': "Fonte",
                'font_altered_msg': "Fonte Alterada",
                'ble_connected': "App Conectado",
                'ble_disconnected': "App Desconectado",
                'lang_changed_msg': "Idioma alterado:",
                'restart_needed_msg': "Reinicie p/ aplicar"
            },
            'en': {
                'brightness_menu': "Brightness",
                'fontsize_menu': "Font Size",
                'font_altered_msg': "Font Changed",
                'ble_connected': "App Connected",
                'ble_disconnected': "App Disconnected",
                'lang_changed_msg': "Language set to:",
                'restart_needed_msg': "Restart to apply"
            }
        }
        self.config_manager = config_manager
        self.load_language() # Chama a nova função no init

    def load_language(self, new_lang=None):
        """
        Recarrega o idioma do config_manager.
        Se new_lang for fornecido, usa ele.
        """
        if new_lang:
            self.language = new_lang
        else:
            try:
                self.language = self.config_manager.get_setting('System', 'language', fallback='pt')
            except:
                self.language = 'pt'
        
        print(f"LOCALE: Idioma carregado: {self.language.upper()}")

    def get(self, key):
        # Retorna o texto para o idioma carregado. Se não encontrar, usa PT como fallback.
        # Se ainda não encontrar, retorna a própria chave como texto.
        return self.texts.get(self.language, self.texts['pt']).get(key, key.replace('_', ' ').title())