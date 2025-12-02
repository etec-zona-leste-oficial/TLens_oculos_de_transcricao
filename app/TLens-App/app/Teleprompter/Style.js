import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#071019",
  },
header: {
  width: "100%",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingVertical: 10,
  paddingTop: 50,
},
  headerTitle: {
  fontSize: 20,
  fontWeight: "bold",
  color: "#fff",
  textAlign: "center",
  flex: 1,
},


  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 25,
    textAlign: "center",
  },

  sectionSubtitle: {
    color: "#ccc",
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 20,
    textAlign: "center",
    width: "100%",
    alignSelf: "center",
  },

  // Texto / input placeholder
  textBox: {
    width: "95%",
    alignSelf: "center",
    height: 120,
    backgroundColor: "#0F1821",
    borderWidth: 1,
    borderColor: "#1C2B36",
    borderRadius: 10,
    padding: 12,
    justifyContent: "center",
    marginBottom: 12,
  },

  // ---------- Device list / modo selector ----------
  deviceList: {
    width: "100%",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 25,
  },

  deviceButton: {
    width: "95%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0F1821",
    borderWidth: 1,
    borderColor: "#1C2B36",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginVertical: 8,
  },

  deviceSelected: {
    borderColor: "#3BA6FF",
    backgroundColor: "#132433",
  },

  deviceText: {
    color: "#FFFFFF",
    fontSize: 16,
  },

  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#2A3B45",
    alignItems: "center",
    justifyContent: "center",
  },

  checkCircleActive: {
    borderColor: "#3BA6FF",
    backgroundColor: "#06283d",
  },

  checkDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#3BA6FF",
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
    width: "100%",
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

  // floating
  floatingLabel: {
    position: "absolute",
    top: 52,
    backgroundColor: "#9e9a9aff",
    borderRadius: 10,
    paddingHorizontal: 14,
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

  // Direction selector
  directionWrapper: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
  },

  directionButton: {
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 8,
    backgroundColor: "#0F1820",
    borderWidth: 1,
    borderColor: "#1C2B36",
    marginHorizontal: 8,
  },

  directionActive: {
    backgroundColor: "#132433",
    borderColor: "#3BA6FF",
  },

  directionText: {
    color: "#fff",
    fontSize: 15,
  },

  directionTextActive: {
    color: "#3BA6FF",
    fontWeight: "700",
  },

  // Exibir button
  exibirButton: {
    marginTop: 28,
    marginBottom: 36,
    alignSelf: "center",
    width: "70%",
    paddingVertical: 12,
    backgroundColor: "#1976D2",
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  exibirText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },

  textInput: {
  width: "95%",
  alignSelf: "center",
  minHeight: 120,
  maxHeight: 260,
  backgroundColor: "#0F1821",
  borderWidth: 1,
  borderColor: "#1C2B36",
  borderRadius: 10,
  padding: 14,
  color: "#fff",
  fontSize: 16,
  textAlignVertical: "top", // importante para Android
  marginBottom: 20,
},

textInputFocused: {
  borderColor: "#3BA6FF",
},


});
