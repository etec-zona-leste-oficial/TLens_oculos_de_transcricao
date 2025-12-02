import { TouchableOpacity, Text, StyleSheet, Dimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function MenuButton({ title, icon, onPress }) {
  const { width } = Dimensions.get("window");
  const buttonWidth = (width - 60) / 2; // duas colunas

  return (
    <TouchableOpacity
      style={[styles.button, { width: buttonWidth, height: 55 }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        {icon && <Ionicons name={icon} size={22} color="#fff" style={styles.icon} />}
        <Text style={styles.text}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#121D23",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    marginBottom: 10,
    paddingHorizontal: 12,
  },
  content: {
    flexDirection: "row", // ícone + texto na mesma linha
    alignItems: "center",
    justifyContent: "center", // centraliza tudo
  },
  icon: {
    marginRight: 8, // espaçamento entre ícone e texto
  },
  text: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
