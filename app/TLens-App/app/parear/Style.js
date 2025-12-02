import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1118",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  // ----- LOGO -----
  logoImage: {
    marginBottom: 20,
  },

  // ----- TEXTOS -----
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
    marginBottom: 20,
  },

  // ----- LINK (caso usado futuramente) -----
  link: {
    fontSize: 14,
    color: "#3BA6FF",
    marginBottom: 30,
  },

  // ----- IMAGEM DOS ÓCULOS -----
  glasses: {
    width: 300,
    height: 100,
    margin: 60,
    marginBottom: 90,
  },

  // ----- BOTÃO -----
  button: {
    backgroundColor: "#1C2B36",
    paddingVertical: 13,
    paddingHorizontal: 130,
    borderRadius: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
