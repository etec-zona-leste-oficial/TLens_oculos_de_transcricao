import asyncio
import json
from threading import Thread, Event
import aiohttp
import struct

class CloudTranscriber:
    def __init__(self, config_manager, event_queue):
        self.event_queue = event_queue
        
        cloud_config = config_manager.get_section('CloudServer')
        system_config = config_manager.get_section('System')
        
        # Constrói a URI com o parâmetro de idioma
        language = system_config.get('language', 'pt')
        base_url = cloud_config.get('url')
        self.uri = f"{base_url}/ws?lang={language}"
        
        self.session = None
        self.websocket = None
        self.loop = asyncio.new_event_loop()
        self.thread = Thread(target=self._run_loop, daemon=True)
        self.shutdown_event = Event()
        self.thread.start()

        self.is_running = False
        self.last_transcript = ""
        
        print(f"ESTRATÉGIA: Transcritor em Nuvem (WebSocket Direto [{language}]) inicializado.")

    def _run_loop(self):
        asyncio.set_event_loop(self.loop)
        try:
            self.loop.run_forever()
        finally:
            self.loop.close()

    async def _connect_and_listen(self):
        try:
            print(f"ESTRATÉGIA: Tentando conectar a {self.uri}...")
            async with aiohttp.ClientSession() as session:
                self.session = session
                async with session.ws_connect(self.uri) as ws:
                    self.websocket = ws
                    self.is_running = True
                    self.last_transcript = ""
                    print("ESTRATÉGIA: Conectado ao servidor em nuvem.")
                    
                    async for msg in ws:
                        if msg.type == aiohttp.WSMsgType.TEXT:
                            data = json.loads(msg.data)
                            transcript = data.get('text', '')
                            if transcript != self.last_transcript:
                                new_text_chunk = transcript[len(self.last_transcript):]
                                if new_text_chunk:
                                    self.event_queue.put(('NOVA_PALAVRA', new_text_chunk))
                                self.last_transcript = transcript
                            if data.get('type') == 'final':
                                self.event_queue.put(('FIM_DA_FALA', None))
                                self.last_transcript = ""

                        elif msg.type == aiohttp.WSMsgType.CLOSED or msg.type == aiohttp.WSMsgType.ERROR:
                            break
        except Exception as e:
            print(f"ESTRATÉGIA: Falha na conexão ou no loop: {e}")
        finally:
            print("ESTRATÉGIA: Conexão com a nuvem foi fechada.")
            self.is_running = False
            if not self.shutdown_event.is_set():
                self.event_queue.put(('CLOUD_CONNECTION_FAILED', None))

    def start(self):
        if not self.shutdown_event.is_set():
            asyncio.run_coroutine_threadsafe(self._connect_and_listen(), self.loop)

    def process_audio_frame(self, pcm):
        if self.websocket and not self.shutdown_event.is_set() and self.is_running:
            # Envia o áudio se estiver conectado
            byte_data = struct.pack(f'{len(pcm)}h', *pcm)
            asyncio.run_coroutine_threadsafe(self.websocket.send_bytes(byte_data), self.loop)

    def stop(self):
        self.is_running = False
        if self.shutdown_event.is_set(): return
        self.shutdown_event.set()
        async def _shutdown():
            if self.websocket and not self.websocket.closed: await self.websocket.close()
            if self.session and not self.session.closed: await self.session.close()
            if self.loop.is_running(): self.loop.stop()
        if self.loop.is_running(): asyncio.run_coroutine_threadsafe(_shutdown(), self.loop)
        print("ESTRATÉGIA: Transcritor em Nuvem (WebSocket) parado.")