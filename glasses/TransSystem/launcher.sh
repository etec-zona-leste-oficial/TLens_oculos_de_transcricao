#!/bin/bash

# Configurações
DIR_PROJETO="/home/transcriber/TransSystem"
ARQUIVO_CONTROLE="/var/tmp/TransSystem_error"
LOG_FILE="/var/log/TransSystem.log"

# Garante que estamos na pasta certa
cd "$DIR_PROJETO" || exit 1

echo "--- INICIANDO SISTEMA TCC ($(date)) ---" >> $LOG_FILE

echo enabled > /sys/class/gpio/gpio257/power/wakeup 2>/dev/null || true

# Executa o Python
# O sistema vai rodar aqui. Se você desligar pelo botão (sleep/reboot), ele sai limpo.
/usr/bin/python3 main.py >> $LOG_FILE 2>&1

# Captura o código de saída. 
# 0 = Saiu normal (pelo comando de reboot do Python ou stop manual)
# Qualquer outro = Erro/Crash
EXIT_CODE=$?

echo "--- SISTEMA PAROU COM CÓDIGO $EXIT_CODE ($(date)) ---" >> $LOG_FILE

if [ $EXIT_CODE -ne 0 ]; then
    # Ocorreu um erro (Crash)
    echo "ALERTA: O sistema fechou com erro!" >> $LOG_FILE
    
    if [ -f "$ARQUIVO_CONTROLE" ]; then
        # Se o arquivo já existe, é a segunda vez que falha. Desiste.
        echo "FALHA CRÍTICA: Já tentamos reiniciar uma vez e falhou de novo. Desistindo." >> $LOG_FILE
        # Remove o arquivo para que, no próximo boot manual (desligar e ligar da tomada), ele tente de novo.
        rm -f "$ARQUIVO_CONTROLE"
        exit 1
    else
        # É a primeira falha. Vamos tentar reiniciar o Pi.
        echo "RECUPERAÇÃO: Primeira falha detectada. Reiniciando o Orange Pi..." >> $LOG_FILE
        touch "$ARQUIVO_CONTROLE"
        sync
        sudo reboot
    fi
else
    # Saiu normalmente (Reboot comandado pelo usuário ou Stop)
    # Limpa o arquivo de controle para resetar a contagem de erros
    if [ -f "$ARQUIVO_CONTROLE" ]; then
        rm -f "$ARQUIVO_CONTROLE"
    fi
fi
