import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1118",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 36,
  },

logoImage: {
    marginBottom: 10,
  },

   title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 20,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    color: "#FFFFFF",
    marginVertical: 10,
    marginBottom:60,
  },
  smallText: {
    fontSize: 14,
    color: "#BFC9D6",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 10,
    width: "85%",
    lineHeight: 18,
  },

  link: {
    fontSize: 12,
    color: "#3BA6FF",
    marginBottom: 14,
  },

  deviceList: {
    width: "100%",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 34,
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
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#26343A", // neutro quando não selecionado
    alignItems: "center",
    justifyContent: "center",
  },

  checkCircleActive: {
    borderColor: "#3BA6FF",
    backgroundColor: "transparent",
  },

  checkDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#3BA6FF",
  },

  button: {
    backgroundColor: "#1C2B36",
    paddingVertical: 13,
    paddingHorizontal: 130,
    borderRadius: 10,
    marginTop: 80,
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },

  separador: {
  width: "95%",     // ajusta pra ficar igual à imagem
  height: 2,
  backgroundColor: "#1C2B36",
  borderRadius: 2,
  marginVertical: 16,
},

});
