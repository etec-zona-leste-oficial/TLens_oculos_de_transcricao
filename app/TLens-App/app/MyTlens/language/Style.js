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
    marginBottom: 30,
  },

  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
  },

  // ---------- Idiomas ----------
  languagesContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: 40,
    marginTop: 12,
  },

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

  languageSelected: {
    borderColor: "#3BA6FF",
    backgroundColor: "#132433",
  },

  flag: {
    width: 28,
    height: 28,
    marginRight: 15,
  },

  languageText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },

  // ---------- Modal Inferior ----------
  bottomOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },

  bottomSheet: {
    backgroundColor: "#121D23",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 25,
    alignItems: "center",
    shadowColor: "#121D23",
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 8,
  },

  sheetTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 10,
    textAlign: "center",
    color: "#fff",
  },

  sheetMessage: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    color: "#fff",
  },

  sheetButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },

  sheetButton: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 10,
    alignItems: "center",
  },

  cancelButton: {
    backgroundColor: "#ccc",
  },

  confirmButton: {
    backgroundColor: "#007AFF",
  },

  cancelText: {
    color: "#000",
    fontWeight: "600",
  },

  confirmText: {
    color: "#fff",
    fontWeight: "600",
  },
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
