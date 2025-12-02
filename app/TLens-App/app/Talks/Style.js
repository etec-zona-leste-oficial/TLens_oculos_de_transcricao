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
    marginBottom: 40,
  },

  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
  },

  // ---------- Botões ----------
  button: {
    backgroundColor: "#1C1F26",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 10,
    width: "90%",
    
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
  },

  // ---------- Modal ----------
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },

  modalContent: {
    backgroundColor: "#141A22",
    width: "85%",
    borderRadius: 12,
    padding: 20,
  },

  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 15,
    textAlign: "center",
  },

  input: {
    backgroundColor: "#1C1F26",
    color: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 20,
  },

  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  modalButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 5,
  },

  modalButtonText: {
    color: "#fff",
    fontWeight: "600",
  },

  scrollContent: {
  flexGrow: 1, // garante que o ScrollView use o espaço todo
  justifyContent: "center",
  alignItems: "center",
},

centerContainer: {
  width: "100%",
  alignItems: "center", // centraliza horizontalmente
},
});
