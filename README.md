<p align="center">
  <img src="docs\images\TLensLogoPretoTransparente.png" alt="Logo TLens" width="200"/>
</p>

<h1 align="center">TLens: Óculos de Transcrição para Acessibilidade (IoT)</h1>

<p align="center">
  <strong>Sistema IoT Vestível para Auxílio à Comunicação entre Deficientes Auditivos e Ouvintes</strong>
</p>

<p align="center">
  <a href="#-sobre-o-projeto">Sobre</a> •
  <a href="#-funcionalidades">Funcionalidades</a> •
  <a href="#-hardware">Hardware</a> •
  <a href="#-tecnologias">Tecnologias</a> •
  <a href="#-autores">Autores</a>
</p>

---

## 📖 Sobre o Projeto

O **TLens** (Transcription Lens) é um Trabalho de Conclusão de Curso (TCC) desenvolvido no curso MTec Desenvolvimento de Sistemas AMS da Etec da Zona Leste.

O projeto consiste em um dispositivo vestível (óculos inteligentes) focado em acessibilidade. Ele captura a fala do ambiente através de um microfone embutido, processa o áudio utilizando Inteligência Artificial local (offline) e projeta a transcrição do texto diretamente nas lentes dos óculos, utilizando a técnica óptica *Bird Bath*.

O objetivo principal é promover a autonomia e a inclusão social de pessoas com deficiência auditiva, permitindo que elas compreendam diálogos em tempo real sem depender da leitura labial ou de intérpretes de Libras, tudo isso com um custo acessível.

## 🚀 Funcionalidades

### Óculos (IoT & Embedded)
* 🎙️ **Transcrição:** Captação e conversão de voz para texto em poucos milissegundos.
* 🔒 **Processamento Offline:** Utiliza modelos de IA locais (Picovoice) rodando no Orange Pi, garantindo privacidade e funcionamento sem internet.
* 👓 **Projeção HUD:** Exibição do texto nas lentes utilizando display OLED e espelhos divisores de feixe (*Beam Splitter*).

### Aplicativo Móvel (Gerenciamento)
* 📱 **Emparelhamento:** Conexão via Bluetooth com os óculos.
* 📝 **Histórico de Conversas:** Salvamento local das transcrições para leitura posterior.
* ⚙️ **Personalização:**
    * Ajuste de tamanho da fonte.
    * Controle de velocidade de exibição.
    * Escolha do lado de visualização (Direito/Esquerdo).
* 🗣️ **Respostas Rápidas:** Textos pré-definidos que o usuário pode selecionar no app para "falar" pelo celular (Text-to-Speech).
* 📺 **Modo Teleprompter:** Envio de textos personalizados do celular para a lente dos óculos.

## 🛠 Hardware e Eletrônica

O projeto foi construído visando o custo-benefício e a eficiência energética. Abaixo, a lista de materiais (BOM):

| Componente | Modelo/Especificação | Função |
| --- | --- | --- |
| **Processador** | Orange Pi Zero 2W (Allwinner H618) | Cérebro do sistema, roda o OS e a IA. |
| **Display** | Módulo OLED 0.91" I2C | Exibição visual do texto. |
| **Microfone** | MAX9814 (Com AGC) | Captação de áudio com ganho automático. |
| **Óptica** | Lente Semirrefletiva (Divisor de Feixe) | Projeção do texto na visão do usuário. |
| **Bateria** | Li-ion 3.7V | Alimentação do sistema. |
| **Gerenciamento** | Controlador TP4056 + Step-Up | Carregamento e estabilização de tensão. |
| **Estrutura** | Impressão 3D (Filamento PETG) | Design ergonômico e suporte dos componentes. |

## 💻 Tecnologias Utilizadas

### Mobile & Frontend
* ![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) **React Native**: Framework principal para o App.
* ![Expo](https://img.shields.io/badge/Expo-1B1F23?style=for-the-badge&logo=expo&logoColor=white) **Expo**: Para build e deploy ágil.
* ![JavaScript](https://img.shields.io/badge/JavaScript-323330?style=for-the-badge&logo=javascript&logoColor=F7DF1E) **JavaScript/Node.js**: Lógica da aplicação.

### Embedded & Backend (IoT)
* ![Python](https://img.shields.io/badge/Python-FFD43B?style=for-the-badge&logo=python&logoColor=blue) **Python**: Scripts de controle de hardware e integração com IA.
* ![Linux](https://img.shields.io/badge/Linux-FCC624?style=for-the-badge&logo=linux&logoColor=black) **Armbian**: Sistema operacional do Orange Pi.
* **Picovoice**: Bibliotecas de reconhecimento de fala offline.
* **Shell Script**: Automação de tarefas no sistema operacional.

### Design & Prototipagem
* ![Figma](https://img.shields.io/badge/Figma-F24E1E?style=for-the-badge&logo=figma&logoColor=white) **Figma**: UI/UX do aplicativo.
* ![Fusion 360](https://img.shields.io/badge/Fusion%20360-0696D7?style=for-the-badge&logo=autodesk&logoColor=white) **Fusion 360**: Modelagem 3D da armação.

## 📸 Galeria do Projeto

*(Espaço reservado para fotos do protótipo real e prints do app)*

| Protótipo Final | App - Home | App - Configurações |
|:---:|:---:|:---:|
| <img src="docs\images\FeiraTec2.jpeg" width="250" alt="Foto dos Óculos"> | <img src="docs\images\Home.jpeg" width="150" alt="Print Home"> | <img src="docs\images\Configs.jpeg" width="150" alt="Print Config"> |

## 👥 Autores

Trabalho desenvolvido pelos alunos do curso MTec Desenvolvimento de Sistemas AMS:

* **Guilherme Vinicius de Oliveira**
* **Cássio Egídio Gomes Vicente**
* **Gabriel Anjos de Almeida**

**Orientador:** Prof. Esp. Jeferson Roberto de Lima

---
