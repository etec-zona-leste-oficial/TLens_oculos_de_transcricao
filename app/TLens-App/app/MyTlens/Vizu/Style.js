import { StyleSheet } from "react-native";

/**
 * Estilos da tela "Lado de Visualização"
 * Mantém o design original, apenas com melhor legibilidade e documentação.
 */
export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1118",
    paddingHorizontal: 20,
    paddingTop: 60,
  },

  // Cabeçalho
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 30,
  },

  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
  },

  // Título principal
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 20,
  },

  // ---------- Controle de seleção ----------

  // Lista de dispositivos (botões de seleção)
  deviceList: {
    flexDirection: "row", // Botões lado a lado
    justifyContent: "center", // Alinha no centro
    marginTop: 20,
  },

  // Botões de cada lado (sem animação)
  deviceButton: {
    width: "45%", // Largura dos botões, ajustada para ficarem lado a lado
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0F1821", // Fundo escuro
    borderWidth: 1,
    borderColor: "#1C2B36", // Borda clara
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginHorizontal: 8, // Espaçamento entre os botões
  },

  // Estilo para quando o botão estiver selecionado
  deviceSelected: {
    borderColor: "#3BA6FF", // Borda azul quando selecionado
    backgroundColor: "#132433", // Fundo escuro quando selecionado
  },

  // Texto do botão
  deviceText: {
    color: "#FFFFFF",
    fontSize: 16,
  },

  // Texto ativo (quando selecionado)
  deviceTextActive: {
    color: "#3BA6FF", // Cor azul para o texto ativo
    fontWeight: "700", // Aumenta a espessura da fonte quando ativo
  },

  sectionSubtitle: {
    color: "#ccc",
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 16,
    textAlign: "center",
    width: "90%",
    alignSelf: "center",
  },
});
