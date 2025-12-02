import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0A1118",
    paddingHorizontal: 20,
    paddingTop: 20,
    flexGrow: 1,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  logoImage: {
    width: 150,
    height: 50,
  },

  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  subtitle: {
    color: "#fff",
    fontSize: 23,
    fontWeight: "bold",
    marginTop: 30,
    alignSelf: "center",
    marginLeft: -40,
    marginBottom: 10,
  },

  menuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: "90%",
    marginTop:35,
    gap: 12,
    left: -20,
  },

  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 30,
    marginBottom: 30,
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 10,
    backgroundColor: "#444",
    marginHorizontal: 4,
  },

  activeDot: {
    backgroundColor: "#fff",
  },

  footer: {
    borderTopWidth: 1,
    borderTopColor: "#1E2A36",
    paddingTop: 20,
  },

  footerButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 19,
    gap: 10,
  },

  footerText: {
    color: "#fff",
    fontSize: 18,
  },
});
