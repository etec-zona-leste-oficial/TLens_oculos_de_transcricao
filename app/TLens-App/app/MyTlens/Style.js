import { StyleSheet } from "react-native";

/**
 * Estilos da tela "Meu TLens"
 * Mantém o mesmo layout e aparência, apenas organizando e documentando.
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

  // Espaço usado para balancear o cabeçalho (mantém o título centralizado)
  headerSpacer: {
    width: 28,
  },

  // Área de conteúdo
  content: {
    gap: 16,
  },

  // Botões de opções
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1A1F25",
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },

  // Texto das opções
  optionText: {
    color: "#fff",
    fontSize: 16,
    letterSpacing: 1,
  },

  
});
