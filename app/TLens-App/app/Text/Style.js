import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1118",
    paddingHorizontal: 20,
    paddingTop: 60,
  },

  // HEADER
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 25,
  },

  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
  },

  // TITULOS DE SEÇÃO (ONTEM / HOJE)
  sectionTitle: {
    color: "#676767",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 10,
    textAlign: "center",
  },

  // BALÃO DE MENSAGEM
  messageBubble: {
    backgroundColor: "#132028",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
  },

  messageText: {
    color: "#E6ECF2",
    fontSize: 15,
    lineHeight: 20,
  },

  messageTime: {
    color: "#89939C",
    fontSize: 12,
    textAlign: "right",
    marginTop: 6,
  },
});