import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000814",
    paddingHorizontal: 20,
    paddingTop: 40,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },

  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#0A1118",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 12,
  },

  itemText: {
    color: "#fff",
    fontSize: 16,
  },

  disconnectButton: {
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },

  disconnectText: {
    color: "#ff4d4d",
    fontWeight: "bold",
  },
});
