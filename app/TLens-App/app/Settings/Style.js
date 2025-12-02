import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1118",
    paddingHorizontal: 20,
    paddingTop: 60,
  },

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

  content: {
    gap: 16,
  },

  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1A1F25",
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },

  optionText: {
    color: "#fff",
    fontSize: 16,
    letterSpacing: 1,
  },

  versionText: {
    color: "#999",
    fontSize: 15,
    letterSpacing: 1,
  },

  lastButton: {
    justifyContent: "center",
  },

  // ---------- Modal Styles (reservados para uso futuro) ----------
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },

  modalContent: {
    backgroundColor: "#1A1F25",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 25,
    alignItems: "center",
  },

  modalTitle: {
    color: "#fff",
    fontSize: 18,
    marginBottom: 20,
  },

  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },

  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },

  cancelButton: {
    backgroundColor: "#2d3436",
  },

  logoutButton: {
    backgroundColor: "#ff1900ff",
  },

  cancelText: {
    color: "#fff",
    fontSize: 15,
  },

  logoutText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
});
