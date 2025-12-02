import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1118",
    paddingHorizontal: 20,
    paddingTop: 60,
  },

  // ---------- Cabeçalho ----------
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 60,
  },

  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
  },

  // ---------- Seções ----------
  section: {
    
    marginBottom: 50,
    alignItems: "center", // 👈 centraliza o conteúdo dentro da seção
  },

  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center", // 👈 centraliza o texto
  },

  sectionSubtitle: {
    color: "#ccc",
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 16,
    textAlign: "center", // 👈 centraliza o texto
    width: "90%", // 👈 evita que o texto encoste nas bordas
  },

  // ---------- Slider ----------
  sliderContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F1820",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    position: "relative",
  },

  sliderSymbol: {
    color: "#fff",
    fontSize: 22,
    marginHorizontal: 10,
  },

  // ---------- Label Flutuante ----------
  floatingLabel: {
    position: "absolute",
    top: 50,
    backgroundColor: "#9e9a9aff",
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },

  floatingText: {
    color: "#000",
    fontWeight: "600",
    fontSize: 14,
  },
});
