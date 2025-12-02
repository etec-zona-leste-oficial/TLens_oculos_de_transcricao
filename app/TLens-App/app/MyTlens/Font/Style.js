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

  headerSpacer: {
    width: 28, // garante alinhamento central no título
  },

  // ---------- Slider ----------
  sliderWrapper: {
    position: "relative",
    alignItems: "center",
  },

  sliderContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F1820",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
  },

  smallA: {
    color: "#fff",
    fontSize: 14,
    marginRight: 10,
  },

  bigA: {
    color: "#fff",
    fontSize: 20,
    marginLeft: 10,
  },

  // ---------- Label Flutuante ----------
  floatingLabel: {
    position: "absolute",
    top: 45,
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
  sectionSubtitle: {
     color: "#ccc",
  fontSize: 15,
  lineHeight: 20,
  marginBottom: 16,
  textAlign: "center",
  width: "90%",
  alignSelf: "center",
  },
});
