import asyncio
import os
import struct
from aiohttp import web, WSMsgType
import pvcheetah
import traceback

# --- CONFIGURAÇÕES DE CHAVES (LISTA) ---
# Adicione todas as suas chaves aqui
PICOVOICE_ACCESS_KEYS = [
    "mRJ4LoQnUlDXg2lvAjBvHfEz25aqBvNgzS1ma3MljYvFsLMiEFVgxA==",
    "HxPY49t0XQTAzxZURizI1RqFcIiitWN0+hTfNlIAnKGplAkAi3qZFA==",
    "6NFGYfEn3iJ8R45KQXM7fALS93xWULVcOxUyhbhnPcuYeest2ZC84Q==",
    "CHAVE_4...",
    "CHAVE_5..."
]

# Índice global para saber qual chave estamos usando no momento.
# Se a chave 0 falhar para um cliente, o próximo cliente já tenta a chave 1.
CURRENT_KEY_INDEX = 0

MODEL_PATHS = {
    "pt": "cheetah_params_pt.pv",
    "en": "cheetah_params_en.pv"
}

# Verificação dos modelos
for lang, path in MODEL_PATHS.items():
    if not os.path.exists(path):
        print(f"💥 ERRO FATAL: Modelo Picovoice para o idioma '{lang}' não encontrado em '{path}'")
        exit(1)

print(f"✅ Modelos Picovoice carregados. {len(PICOVOICE_ACCESS_KEYS)} chaves configuradas.")

def get_cheetah_instance(model_path, endpoint_duration=1.0):
    """
    Função auxiliar que tenta criar uma instância do Cheetah.
    Se a chave atual falhar, ela tenta a próxima recursivamente.
    """
    global CURRENT_KEY_INDEX
    
    # Proteção para não estourar a lista
    if CURRENT_KEY_INDEX >= len(PICOVOICE_ACCESS_KEYS):
        raise Exception("❌ TODAS AS CHAVES DO SERVIDOR FORAM ESGOTADAS.")

    try:
        current_key = PICOVOICE_ACCESS_KEYS[CURRENT_KEY_INDEX]
        masked = current_key[:5] + "..." + current_key[-3:]
        
        # Tenta criar a instância
        cheetah = pvcheetah.create(
            access_key=current_key,
            model_path=model_path,
            enable_automatic_punctuation=True,
            endpoint_duration_sec=endpoint_duration
        )
        print(f"   🔑 Motor iniciado com a chave índice {CURRENT_KEY_INDEX} ({masked})")
        return cheetah

    except (pvcheetah.CheetahActivationLimitError, pvcheetah.CheetahActivationError) as e:
        print(f"   ⚠️ Chave {CURRENT_KEY_INDEX} falhou ou expirou. Tentando a próxima...")
        CURRENT_KEY_INDEX += 1
        # Recursividade: tenta de novo com o novo índice
        return get_cheetah_instance(model_path, endpoint_duration)

async def websocket_handler(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    client_ip = request.remote
    print(f"✅  Cliente conectado: {client_ip}")
    
    cheetah = None
    last_partial = ""
    pcm_buffer = list()
    FRAME_LENGTH = 0 

    try:
        lang_code = request.query.get('lang', 'pt').lower()
        model_path_to_use = MODEL_PATHS.get(lang_code, MODEL_PATHS["pt"])
        
        if lang_code not in MODEL_PATHS:
            print(f"   AVISO: Idioma '{lang_code}' não suportado. Usando 'pt' como padrão.")

        print(f"   Cliente solicitou idioma: '{lang_code}'.")

        # --- INICIALIZAÇÃO SEGURA (Com Rotação) ---
        try:
            cheetah = get_cheetah_instance(model_path_to_use)
            FRAME_LENGTH = cheetah.frame_length
        except Exception as e:
            print(f"❌ Falha crítica ao iniciar Cheetah para {client_ip}: {e}")
            await ws.close()
            return ws
        # ------------------------------------------

        async for msg in ws:
            if msg.type == WSMsgType.BINARY:
                payload = msg.data
                
                if len(payload) % 2 != 0:
                    payload = payload[:-1]
                
                if len(payload) > 0:
                    try:
                        pcm = struct.unpack(f'{len(payload) // 2}h', payload)
                        pcm_buffer.extend(pcm)

                        while len(pcm_buffer) >= FRAME_LENGTH:
                            frame = pcm_buffer[:FRAME_LENGTH]
                            pcm_buffer = pcm_buffer[FRAME_LENGTH:]
                            
                            # --- PROCESSAMENTO COM ROTAÇÃO DE CHAVE ---
                            try:
                                partial, is_endpoint = cheetah.process(frame)
                                
                                if partial != last_partial:
                                    await ws.send_json({"type": "partial", "text": partial})
                                    last_partial = partial

                                if is_endpoint:
                                    final_text = (last_partial + " " + cheetah.flush().strip()).strip()
                                    if final_text:
                                        print(f"   Enviando final [{lang_code}]: '{final_text}'")
                                        await ws.send_json({"type": "final", "text": final_text})
                                    last_partial = ""

                            except (pvcheetah.CheetahActivationLimitError, pvcheetah.CheetahActivationError):
                                print(f"⚠️ Limite da chave atingido durante processamento para {client_ip}. Trocando...")
                                # Incrementa o índice global para mudar a chave
                                global CURRENT_KEY_INDEX
                                CURRENT_KEY_INDEX += 1
                                
                                # Deleta a instância antiga
                                cheetah.delete()
                                
                                # Tenta recriar com a nova chave (a função get_cheetah_instance já usa o novo INDEX)
                                try:
                                    cheetah = get_cheetah_instance(model_path_to_use)
                                    # O frame que falhou será perdido ou reprocessado se a lógica permitisse, 
                                    # mas para streaming ao vivo, melhor seguir em frente.
                                except Exception as e:
                                    print("❌ Não há mais chaves disponíveis. Encerrando conexão.")
                                    await ws.close()
                                    break
                            # -----------------------------------------------

                    except struct.error as se:
                        print(f"   ERRO DE STRUCT: {se}")

            elif msg.type == WSMsgType.ERROR:
                print(f"❌  Erro na conexão WebSocket: {ws.exception()}")

    except Exception as e:
        print(f"💥  Erro inesperado com {client_ip}: {e}")
        traceback.print_exc()
    finally:
        if cheetah: 
            try:
                cheetah.delete()
            except:
                pass
        print(f"🔌  Conexão com {client_ip} encerrada.")
    return ws

app = web.Application()
app.add_routes([web.get('/ws', websocket_handler)])

if __name__ == "__main__":
    print("🚀  Servidor de Transcrição Multi-Chave iniciado em http://0.0.0.0:8765")
    web.run_app(app, host="0.0.0.0", port=8765)