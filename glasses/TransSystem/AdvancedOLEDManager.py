import time, os
from datetime import datetime
from threading import Thread, Lock, Event, Timer
from queue import Queue
import math
from luma.core.interface.serial import i2c
from luma.oled.device import ssd1306
from PIL import ImageFont, ImageDraw, Image

class AdvancedOLEDManager:
    def __init__(self, config_manager, config_section, localization_manager, brain_callback, display_id):
        self.config_manager = config_manager
        self.config_section = config_section
        self.localization_manager = localization_manager
        self.brain_callback = brain_callback
        self.display_id = display_id
        self.mode = None
        self._load_config()
        
        serial = i2c(port=self.i2c_bus, address=self.i2c_address)
        self.device = ssd1306(serial, width=self.width, height=self.height)
        self.image = Image.new('1', (self.width, self.height))
        self.draw = ImageDraw.Draw(self.image)
        self.running, self.display_lock = True, Lock()
        self.screens_on = True

        self.is_teleprompter_active = False
        self.display_thread = None

    def set_mode(self, mode):
        # ... (código existente, sem mudanças)
        if self.display_thread and self.display_thread.is_alive():
            self.running = False
            if hasattr(self, 'word_queue'):
                self.word_queue.put(None)
            self.display_thread.join()
        
        self.running = True
        self.mode = mode
        self.is_teleprompter_active = False
        
        if self.mode == 'transcription':
            self.word_queue, self.lines, self.next_display_time = Queue(), [""], 0
        elif self.mode == 'status':
            self.is_processing, self.transcription_mode, self.is_muted = False, 'L', False
            self.is_ble_connected = False
            self.status_loop_paused = Event(); self.status_loop_paused.set()

        self.start_default_loop()

    def start_default_loop(self):
        # ... (código existente, sem mudanças)
        if self.mode == 'transcription':
            self.display_thread = Thread(target=self._transcription_loop, daemon=True)
        elif self.mode == 'status':
            self.display_thread = Thread(target=self._status_loop, daemon=True)
        
        if self.display_thread:
            self.display_thread.start()

    # [NOVA FUNÇÃO]
    def reload_config(self):
        """Recarrega as configurações, como caminhos de fonte, etc."""
        print(f"OLED (Display{self.display_id}): Recarregando configuração...")
        self._load_config()

    def _load_config(self):
        # ... (código existente, sem mudanças)
        self.config = self.config_manager.get_section(self.config_section)
        self.width, self.height = self.config.getint('screen_width'), self.config.getint('screen_height')
        self.i2c_bus, self.i2c_address = self.config.getint('i2c_bus'), int(self.config.get('i2c_address'), 16)
        self.font_path = self.config.get('font_path')
        font_size = self.config.getint('fontsize', fallback=10) # <-- MUDANÇA
        self.brightness = self.config.getint('brightness', fallback=100)
        self.delay_between_words = self.config_manager.get_setting('Transcription', 'delay_entre_palavras_seg', type_func=float, fallback=0.5)
        try: self.font = ImageFont.truetype(self.font_path, font_size)
        except IOError: self.font = ImageFont.load_default()
        ascent, descent = self.font.getmetrics(); self.line_height = ascent + descent
        self.max_lines = self.height // self.line_height if self.line_height > 0 else 1

    def _notify_content_update(self, lines):
        # ... (código existente, sem mudanças)
        self.brain_callback('DISPLAY_CONTENT_UPDATE', (self.display_id, lines))

    def start_teleprompter(self, mode, text, font_size=12, speed=0.5, direction='left', wait_time=5.0):
        # ... (código existente, sem mudanças)
        if self.is_teleprompter_active or self.mode != 'transcription': return
        self.is_teleprompter_active = True
        
        self.running = False
        if self.display_thread and self.display_thread.is_alive():
            if self.mode == 'transcription': self.word_queue.put(None)
            self.display_thread.join()
        
        self.running = True
        if mode == 'writing':
            self.display_thread = Thread(target=self._teleprompter_writing_loop, args=(text, font_size, speed, wait_time), daemon=True)
        elif mode == 'scrolling':
            self.display_thread = Thread(target=self._teleprompter_scrolling_loop, args=(text, font_size, speed, direction), daemon=True)
        
        if self.display_thread: self.display_thread.start()

    def stop_teleprompter(self):
        # ... (código existente, sem mudanças)
        if not self.is_teleprompter_active: return
        self.is_teleprompter_active = False
        
        self.running = False
        if self.display_thread and self.display_thread.is_alive():
            self.display_thread.join()
            
        self.running = True
        self.clear()
        self.start_default_loop()

    def _teleprompter_writing_loop(self, text, font_size, delay, wait_time):
        # ... (código existente, sem mudanças)
        words = text.split()
        try:
            teleprompter_font = ImageFont.truetype(self.font_path, font_size)
            ascent, descent = teleprompter_font.getmetrics()
            line_height = ascent + descent
            max_lines = self.height // line_height if line_height > 0 else 1
        except IOError:
            teleprompter_font, line_height, max_lines = self.font, self.line_height, self.max_lines

        lines = [""]
        while self.is_teleprompter_active and self.running:
            lines = [""]
            self._notify_content_update(lines)
            for word in words:
                if not self.is_teleprompter_active or not self.running: break
                
                cl = lines[-1]; pl = cl + (" " if cl else "") + word
                if self.draw.textlength(pl, font=teleprompter_font) <= self.width:
                    lines[-1] = pl
                else:
                    lines.append(word)
                if len(lines) > max_lines: lines.pop(0)
                
                with self.display_lock:
                    self.draw.rectangle((0, 0, self.width, self.height), 0, 0)
                    y = 0
                    for line in lines:
                        self.draw.text((0, y), line, font=teleprompter_font, fill=1)
                        y += line_height
                    self.device.display(self.image)
                
                self._notify_content_update(lines)
                time.sleep(delay)
            if self.is_teleprompter_active and self.running:
                time.sleep(wait_time)

    def _teleprompter_scrolling_loop(self, text, font_size, speed, direction):
        # ... (código existente, sem mudanças)
        try:
            teleprompter_font = ImageFont.truetype(self.font_path, font_size)
        except IOError:
            teleprompter_font = self.font
        
        bbox = self.draw.textbbox((0,0), text, font=teleprompter_font)
        text_width, text_height = bbox[2] - bbox[0], bbox[3] - bbox[1]
        
        canvas = Image.new('1', (text_width + self.width * 2, self.height))
        draw_canvas = ImageDraw.Draw(canvas)
        
        y_pos = (self.height - text_height) // 2
        draw_canvas.text((self.width, y_pos), text, font=teleprompter_font, fill=1)
        
        if direction == 'left':
            x = 0 # Começa no início (blank_A)
        else:
            x = text_width + self.width # Começa no final (início do blank_B)

        scroll_speed = int(speed)
        
        while self.is_teleprompter_active and self.running:
            with self.display_lock:
                self.draw.rectangle((0,0,self.width,self.height), fill=0)
                self.image.paste(canvas.crop((x, 0, x + self.width, self.height)))
                self.device.display(self.image)

            self._notify_content_update([f"Teleprompter: {text}"])
            if direction == 'left':
                x += scroll_speed
                if x > text_width + self.width: 
                    x = 0
            else:
                x -= scroll_speed
                if x < 0:
                    x = text_width + self.width
            
            time.sleep(0.01)

    def _draw_cloud_icon(self, draw, mode):
        # ... (código existente, sem mudanças)
        x_offset, y_offset = self.width - 16, 2
        if mode == 'B': draw.rectangle((x_offset + 3, y_offset, x_offset + 10, y_offset + 9), outline=1, fill=0); draw.line((x_offset + 3, y_offset + 2, x_offset + 6, y_offset), fill=1); draw.line((x_offset + 6, y_offset, x_offset + 6, y_offset + 9), fill=1); draw.line((x_offset + 6, y_offset + 9, x_offset + 3, y_offset + 7), fill=1); draw.line((x_offset + 10, y_offset + 2, x_offset + 7, y_offset), fill=1); draw.line((x_offset + 7, y_offset + 9, x_offset + 10, y_offset + 7), fill=1); return
        draw.ellipse((x_offset, y_offset + 4, x_offset + 12, y_offset + 8), outline=1, fill=1); draw.ellipse((x_offset + 2, y_offset + 1, x_offset + 8, y_offset + 6), outline=1, fill=1); draw.ellipse((x_offset + 6, y_offset, x_offset + 12, y_offset + 5), outline=1, fill=1)
        if mode == 'L': draw.line((x_offset - 2, y_offset + 10, x_offset + 14, y_offset - 2), fill=1, width=1)
    
    def _draw_muted_mic_icon(self, draw):
        # ... (código existente, sem mudanças)
        x, y, w, h = 3, self.height - 12, 7, 10
        draw.rectangle((x + 2, y, x + 5, y + 5), outline=1, fill=1); draw.line((x + 3, y + 5, x + 3, y + 7), fill=1, width=1); draw.line((x + 1, y + 8, x + 6, y + 8), fill=1, width=1); draw.line((x + w, y - 1, x - 1, y + h), fill=1, width=1)
        
    def _transcription_loop(self):
        # ... (código existente, sem mudanças)
        while self.running and not self.is_teleprompter_active:
            try:
                word_to_add = self.word_queue.get()
                if word_to_add is None or not self.running: continue
                ct = time.time()
                if self.next_display_time == 0: self.next_display_time = ct
                sleep_duration = self.next_display_time - ct
                if sleep_duration > 0: time.sleep(sleep_duration)
                with self.display_lock:
                    self._process_word(word_to_add)
                    self._render_transcription()
                self._notify_content_update(self.lines)
                self.next_display_time += self.delay_between_words
            except Exception as e: print(f"ERRO no _transcription_loop: {e}")

    def _render_transcription(self):
        # ... (código existente, sem mudanças)
        self.draw.rectangle((0, 0, self.width, self.height), 0, 0); y = 0
        for line in self.lines: self.draw.text((0, y), line, font=self.font, fill=1); y += self.line_height
        self.device.display(self.image)
        
    def _status_loop(self):
        # ... (código existente, sem mudanças)
        while self.running:
            try:
                self.status_loop_paused.wait()
                if self.screens_on:
                    clock_format = self.config_manager.get_setting('System', 'clock_format', fallback='24h')
                    time_str = datetime.now().strftime('%H:%M' if clock_format == '24h' else '%I:%M')
                    if clock_format == '12h' and time_str.startswith('0'): time_str = time_str[1:]

                    content_lines = [time_str] 
                    with self.display_lock:
                        self.draw.rectangle((0, 0, self.width, self.height), 0, 0)
                        self.draw.text((2, 0), time_str, font=self.font, fill=1)
                        self._draw_cloud_icon(self.draw, self.transcription_mode)
                        if self.is_muted: self._draw_muted_mic_icon(self.draw)
                        if self.is_processing:
                            s = 5; x0, y0 = self.width - s - 2, self.height - s - 2
                            self.draw.ellipse((x0, y0, self.width - 2, self.height - 2), outline=1, fill=1)
                        self.device.display(self.image)
                    self._notify_content_update(content_lines)
                time.sleep(1)
            except Exception as e: print(f"ERRO no _status_loop: {e}"); time.sleep(1)

    def show_font_preview(self, text, size):
        # ... (código existente, sem mudanças)
        if self.mode != 'transcription' or not self.screens_on: return
        try:
            preview_font = ImageFont.truetype(self.font_path, size)
        except IOError:
            preview_font = ImageFont.load_default()
        with self.display_lock:
            self.draw.rectangle((0,0,self.width,self.height),0,0)
            try:
                bbox = self.draw.textbbox((0,0), text, font=preview_font)
                tw, th = bbox[2]-bbox[0], bbox[3]-bbox[1]
                x, y = (self.width-tw)//2, (self.height-th)//2
                self.draw.text((x,y), text, font=preview_font, fill=1)
            except Exception:
                self.draw.text((2,2), text, font=self.font, fill=1)
            self.device.display(self.image)
        self._notify_content_update([text])

    def show_temporary_message(self, lines, duration=2):
        # ... (código existente, sem mudanças)
        if self.mode != 'transcription' or not self.screens_on: return
        if isinstance(lines, str): lines = [lines]

        def _draw_message():
            with self.display_lock:
                self.draw.rectangle((0,0,self.width,self.height),0,0)
                total_text_height = len(lines) * self.line_height
                current_y = (self.height - total_text_height) // 2
                for line in lines:
                    try:
                        bbox = self.draw.textbbox((0,0), line, font=self.font)
                        tw = bbox[2] - bbox[0]
                        x = (self.width - tw) // 2
                        self.draw.text((x, current_y), line, font=self.font, fill=1)
                        current_y += self.line_height
                    except:
                        self.draw.text((2, current_y), line, font=self.font, fill=1)
                        current_y += self.line_height
                self.device.display(self.image)
            self._notify_content_update(lines)

        def _restore_display():
            with self.display_lock: self._render_transcription()
            self._notify_content_update(self.lines)
        
        if self.mode == 'transcription': self.word_queue.put(None)
        _draw_message()
        Timer(duration, _restore_display).start()

    def pause_status_loop(self):
        # ... (código existente, sem mudanças)
        if self.mode == 'status': self.status_loop_paused.clear()
    def resume_status_loop(self):
        # ... (código existente, sem mudanças)
        if self.mode == 'status': self.status_loop_paused.set()
    def set_brightness(self, p):
        # ... (código existente, sem mudanças)
        self.brightness = max(0, min(100, p)); c = int((self.brightness / 100) * 255); self.device.contrast(c)
    def turn_on(self): self.screens_on = True; self.device.show(); self.set_brightness(self.brightness)
    def turn_off(self): self.screens_on = False; self.device.hide()
    def set_processing_state(self, is_processing):
        # ... (código existente, sem mudanças)
        if self.mode == 'status': self.is_processing = is_processing
    def set_muted_state(self, is_muted):
        # ... (código existente, sem mudanças)
        if self.mode == 'status': self.is_muted = is_muted
    def set_transcription_mode(self, mode_char):
        # ... (código existente, sem mudanças)
        if self.mode == 'status': self.transcription_mode = mode_char
    def set_ble_status(self, is_connected):
        # ... (código existente, sem mudanças)
        if self.mode == 'status': self.is_ble_connected = is_connected
    def draw_menu_text(self, text):
        # ... (código existente, sem mudanças)
        if not self.screens_on: return
        with self.display_lock:
            self.draw.rectangle((0,0,self.width,self.height),0,0)
            try:
                bbox = self.draw.textbbox((0,0), text, font=self.font); tw, th = bbox[2]-bbox[0], bbox[3]-bbox[1]
                x, y = (self.width-tw)//2, (self.height-th)//2; self.draw.text((x,y), text, font=self.font, fill=1)
            except: self.draw.text((2,2), text, font=self.font, fill=1)
            self.device.display(self.image)
    def is_busy(self): return hasattr(self, 'word_queue') and not self.word_queue.empty() if self.mode == 'transcription' else False
    def add_word(self, word):
        # ... (código existente, sem mudanças)
        if self.mode == 'transcription': self.word_queue.put(word)
    def _process_word(self, word):
        # ... (código existente, sem mudanças)
        current_line = self.lines[-1]; potential_line = current_line + (" " if current_line else "") + word
        if self.draw.textlength(potential_line, font=self.font) <= self.width: self.lines[-1] = potential_line
        else: self.lines.append(word)
        if len(self.lines) > self.max_lines: self.lines.pop(0)
    def clear(self):
        # ... (código existente, sem mudanças)
        with self.display_lock:
            if self.mode == 'transcription':
                while hasattr(self, 'word_queue') and not self.word_queue.empty():
                    try: self.word_queue.get_nowait()
                    except: pass
                if self.config_manager.reload_if_changed(): self._load_config()
                self.lines = [""]; self.next_display_time = 0
            self.draw.rectangle((0, 0, self.width, self.height), 0, 0)
            self.device.display(self.image)
        
        if self.mode == 'transcription': self._notify_content_update([""])
        else: self._notify_content_update([])
    
    def shutdown(self):
        # ... (código existente, sem mudanças)
        self.running = False
        self.is_teleprompter_active = False
        self.resume_status_loop()
        if self.mode == 'transcription' and hasattr(self, 'word_queue'): self.word_queue.put(None)
        if self.display_thread and self.display_thread.is_alive():
            self.display_thread.join()
        with self.display_lock:
            self.draw.rectangle((0, 0, self.width, self.height), 0, 0)
            self.device.display(self.image)

    def start_loading_animation(self, text="Carregando..."):
        """Inicia uma animação de loading (spinner) com texto."""
        if not self.screens_on: self.turn_on() # Garante que a tela ligue para mostrar
        
        self.running = False # Para loops anteriores (transcrição/status)
        if self.display_thread and self.display_thread.is_alive():
            if hasattr(self, 'word_queue'): self.word_queue.put(None)
            self.display_thread.join()

        self.running = True
        self.is_loading = True
        # Inicia a thread da animação
        self.display_thread = Thread(target=self._loading_loop, args=(text,), daemon=True)
        self.display_thread.start()

    def stop_loading_animation(self):
        """Para a animação e limpa a tela."""
        self.is_loading = False
        self.running = False
        if self.display_thread and self.display_thread.is_alive():
            self.display_thread.join()
        
        self.running = True # Restaura flag para o próximo loop normal
        self.clear()

    def _loading_loop(self, text):
        """Desenha um spinner giratório e o texto centralizado."""
        angle = 0
        
        # Configurações do Spinner
        cx, cy = self.width // 2, (self.height // 2) - 4 # Centro (levemente acima para caber texto)
        radius = 8
        
        try:
            font_loading = ImageFont.truetype(self.font_path, 10)
        except:
            font_loading = self.font

        while self.running and self.is_loading:
            with self.display_lock:
                self.draw.rectangle((0, 0, self.width, self.height), 0, 0)
                
                # 1. Desenha o Spinner (Arco giratório)
                # Bounding box do circulo
                box = [cx - radius, cy - radius, cx + radius, cy + radius]
                
                # Desenha um arco de 270 graus que gira baseado no 'angle'
                self.draw.arc(box, start=angle, end=angle + 270, fill=1, width=2)
                
                # 2. Desenha o Texto embaixo
                bbox = self.draw.textbbox((0, 0), text, font=font_loading)
                tw = bbox[2] - bbox[0]
                tx = (self.width - tw) // 2
                ty = self.height - 12 # Posição Y do texto
                self.draw.text((tx, ty), text, font=font_loading, fill=1)

                self.device.display(self.image)
            
            # Atualiza angulo para o proximo frame
            angle += 30
            if angle >= 360: angle = 0
            
            time.sleep(0.05) # ~20 FPS

    def show_logo(self, image_path="TLensLogoPretoTransparente.png"):
        """
        Versão TRANSPARENCIA (ALPHA CHANNEL):
        - Ignora cores.
        - Se o pixel for transparente = Preto.
        - Se o pixel for sólido (opaco) = Branco.
        - Resolve o problema do 'olho azul' e da 'sujeira' de uma vez só.
        """
        import os

        base_dir = '/home/transcriber/TransSystem'
        full_path = image_path if image_path.startswith('/') else os.path.join(base_dir, image_path)

        if not os.path.exists(full_path):
            print(f"OLED: Logo não encontrada.")
            return

        try:
            # 1. Limpa Threads
            self.running = False 
            if self.display_thread and self.display_thread.is_alive():
                if hasattr(self, 'word_queue'): self.word_queue.put(None)
                self.display_thread.join(timeout=2.0) 
            
            self.running = True 
            self.screens_on = True
            self.device.show()

            # 2. Carrega Imagem (IMPORTANTE: PRECISA SER PNG TRANSPARENTE)
            logo_img = Image.open(full_path).convert("RGBA")
            
            # Extrai o canal Alpha (Transparência)
            # alpha é uma imagem em escala de cinza onde Branco=Opaco e Preto=Transparente
            alpha = logo_img.split()[3]

            # --- ZOOM AUTOMÁTICO (Baseado na transparência) ---
            # O getbbox no canal alpha acha exatamente onde tem desenho
            bbox = alpha.getbbox()
            
            if bbox:
                cropped = logo_img.crop(bbox)
            else:
                cropped = logo_img # Imagem vazia?

            # --- DIMENSIONAMENTO (Com Margem) ---
            padding = 12 
            target_h = max(10, self.height - padding) 
            
            ratio = target_h / cropped.height
            new_w = int(cropped.width * ratio)
            new_h = int(cropped.height * ratio)
            
            if new_w > (self.width - 4):
                ratio = (self.width - 4) / cropped.width
                new_w = int(cropped.width * ratio)
                new_h = int(cropped.height * ratio)

            # Redimensiona a imagem
            resized = cropped.resize((new_w, new_h), Image.LANCZOS)
            
            # 3. CRIAÇÃO DA MÁSCARA BINÁRIA
            # Aqui está o segredo: Pegamos o canal Alpha da imagem redimensionada
            resized_alpha = resized.split()[3]
            
            # Criamos uma "silhueta" branca sólida
            # Onde for transparente (>0), vira branco total.
            # Isso ignora se a logo é azul ou cinza, foca só na forma.
            fn = lambda x: 255 if x > 30 else 0
            mask = resized_alpha.convert('L').point(fn, mode='1')

            # 4. CENTRALIZA E COLA
            canvas = Image.new('1', (self.width, self.height), 0) # Fundo Preto
            pos_x = (self.width - new_w) // 2
            pos_y = (self.height - new_h) // 2
            
            # Cola a silhueta branca no fundo preto
            canvas.paste(mask, (pos_x, pos_y))

            with self.display_lock:
                self.draw.rectangle((0, 0, self.width, self.height), 0, 0)
                self.device.display(canvas)
                
            print("OLED: Logo transparente processada e exibida.")

        except Exception as e:
            print(f"OLED ERRO (Logo): {e}")