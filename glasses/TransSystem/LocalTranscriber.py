import pvcheetah
import os
import traceback

class LocalTranscriber:
    def __init__(self, config_manager, event_queue):
        self.config_manager = config_manager
        self.audio_config = config_manager.get_section('Audio')
        self.system_config = config_manager.get_section('System')
        self.event_queue = event_queue
        self.cheetah = None
        
        # Carrega as chaves e prepara a lista
        keys_str = self.audio_config.get('picovoice_access_keys', fallback='')
        # Separa por vírgula e remove espaços em branco
        self.keys = [k.strip() for k in keys_str.split(',') if k.strip()]
        self.current_key_index = 0

        # Verifica se temos chaves
        if not self.keys:
            # Tenta fallback para a config antiga se a nova não existir
            old_key = self.audio_config.get('picovoice_access_key', fallback='')
            if old_key:
                self.keys = [old_key]
            else:
                print("💥 ERRO FATAL: Nenhuma chave Picovoice encontrada no config.ini!")
                return

        # Define o caminho do modelo
        language = self.system_config.get('language', 'pt')
        model_key = f'model_path_{language}'
        self.model_path = self.audio_config.get(model_key, fallback=None)
        
        if self.model_path is None:
            self.model_path = self.audio_config.get('picovoice_model_path', fallback=None)

        if not self.model_path or not os.path.exists(self.model_path):
            print("="*50)
            print("💥 ERRO FATAL: Arquivo de modelo de voz não encontrado! 💥")
            print(f"  - Idioma: '{language}', Caminho: '{self.model_path}'")
            return

        self.last_partial = ""
        
        # Tenta iniciar com a primeira chave
        self._initialize_engine()

    def _initialize_engine(self):
        """
        Tenta inicializar o Cheetah com a chave atual.
        Se falhar por erro de ativação, tenta a próxima recursivamente.
        """
        if self.current_key_index >= len(self.keys):
            print("\n" + "="*50)
            print("❌ TODAS AS CHAVES DO PICOVOICE FORAM ESGOTADAS.")
            print("O transcritor local não funcionará mais nesta sessão.")
            print("="*50)
            self.cheetah = None
            return

        current_key = self.keys[self.current_key_index]
        masked_key = current_key[:5] + "..." + current_key[-3:]
        print(f"ESTRATÉGIA: Iniciando Picovoice com a chave {self.current_key_index + 1}/{len(self.keys)} ({masked_key})")

        try:
            # Se já existir uma instância, deleta antes de criar outra
            if self.cheetah is not None:
                try:
                    self.cheetah.delete()
                except:
                    pass

            self.cheetah = pvcheetah.create(
                access_key=current_key,
                model_path=self.model_path,
                enable_automatic_punctuation=True,
                endpoint_duration_sec=self.audio_config.getfloat('endpoint_duration_sec')
            )
            self.frame_length = self.cheetah.frame_length
            print("✅ Transcritor Local inicializado com sucesso.")
        
        except (pvcheetah.CheetahActivationLimitError, pvcheetah.CheetahActivationError) as e:
            print(f"⚠️ AVISO: Falha de ativação na chave {self.current_key_index + 1}: {e}")
            self.current_key_index += 1
            self._initialize_engine() # Tenta a próxima chave imediatamente
        
        except Exception as e:
            print(f"💥 ERRO GENÉRICO ao inicializar Picovoice: {e}")
            self.cheetah = None

    def _rotate_key(self):
        """Chamado durante a execução se a chave expirar."""
        print("🔄 ROTAÇÃO: A chave atual atingiu o limite ou falhou. Trocando...")
        self.current_key_index += 1
        self._initialize_engine()

    def process_audio_frame(self, pcm):
        if self.cheetah is None: 
            return

        try:
            partial_transcript, is_endpoint = self.cheetah.process(pcm)
            
            if partial_transcript != self.last_partial:
                new_text = partial_transcript[len(self.last_partial):].strip()
                if new_text: 
                    self.event_queue.put(('NOVA_PALAVRA', new_text))
                self.last_partial = partial_transcript
            
            if is_endpoint:
                final_transcript = self.cheetah.flush().strip()
                if final_transcript: 
                    self.event_queue.put(('NOVA_PALAVRA', final_transcript))
                self.event_queue.put(('FIM_DA_FALA', None))
                self.last_partial = ""

        except (pvcheetah.CheetahActivationLimitError, pvcheetah.CheetahActivationError):
            # AQUI ESTÁ A MÁGICA: Se der erro durante a fala, trocamos a chave
            self._rotate_key()
            
        except Exception as e:
            print(f"ERRO no processamento de áudio local: {e}")
            # Se for um erro desconhecido grave, talvez seja melhor parar para não travar o loop
            # self.stop() 

    def stop(self):
        if self.cheetah is not None:
            try:
                self.cheetah.delete()
            except:
                pass
            self.cheetah = None
            print("ESTRATÉGIA: Transcritor Local (Picovoice) parado.")