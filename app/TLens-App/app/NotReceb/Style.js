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
    paddingBottom: 40,
  },
  notificationCard: {
    marginBottom: 20,
  },
  dateText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  timeText: {
    color: "#999",
    fontSize: 14,
    marginBottom: 5,
  },
  descriptionText: {
    color: "#ccc",
    fontSize: 15,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: "#1F2A35",
    marginTop: 5,
  },
});
