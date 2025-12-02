import { StyleSheet } from "react-native";

/**
 * Estilos da tela de seleção de idioma.
 * Mantém o design original, apenas com estrutura organizada e comentários técnicos.
 */
export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1118",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 60,
  },

  // Logo
  logoImage: {
    marginBottom: 25,
  },

  // Títulos
  title: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#fff",
  },
  subtitle: {
    fontSize: 20,
    color: "#aaa",
    marginBottom: 20,
  },

  // Textos descritivos
  description: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 11,
    textAlign: "center",
  },
  subdescription: {
    fontSize: 16,
    color: "#aaa",
    textAlign: "center",
    marginBottom: 30,
  },

  // Container das opções de idioma
  languagesContainer: {
    width: "100%",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 40,
  },

  // Botão base de idioma
  languageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    borderWidth: 1,
    borderColor: "#1C2B36",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 25,
    width: "90%",
    marginVertical: 13,
    backgroundColor: "transparent",
  },

  // Estilo aplicado ao idioma selecionado
  languageSelected: {
    borderColor: "#3BA6FF",
    backgroundColor: "#132433",
  },

  // Bandeiras
  flag: {
    width: 28,
    height: 28,
    marginRight: 15,
  },

  // Texto dos idiomas
  languageText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },

  // Botão de continuar
  optionButton: {
    backgroundColor: "#1C2B36",
    paddingVertical: 13,
    paddingHorizontal: 130,
    borderRadius: 10,
  },

  continueText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
