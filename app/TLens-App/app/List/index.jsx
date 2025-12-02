import React, { useState } from "react";
import { View, Text, Image, TouchableOpacity, Animated, Easing } from "react-native";
import { styles } from "./Style";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

// somente o logo como imagem (PNG)
import Logo from "../../assets/icons/logo3.png";

export default function Parear() {
  const rotateAnim = useState(new Animated.Value(0))[0];

  const router = useRouter();
  const { t } = useTranslation();

  const [selected, setSelected] = useState("TLens-G3C-1234");

  const devices = ["TLens-G3C-1234", "TLens-G3C-ABCD"];

  const handleEmparelhar = async () => {
    try {
      const firstOculos = [selected];
      await AsyncStorage.setItem("oculosList", JSON.stringify(firstOculos));
      await AsyncStorage.setItem("oculosCounter", "1");
      router.push("/Home");
    } catch (error) {
      console.log("Erro ao emparelhar:", error);
    }
  };

  // 🔥 mover interpolation para fora da função!
  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const startRotation = () => {
  rotateAnim.setValue(0);

  Animated.timing(rotateAnim, {
    toValue: 1,
    duration: 300,
    easing: Easing.linear,
    useNativeDriver: true,
  }).start(() => {
    // Após terminar, reseta pra não ficar travado no 360°
    rotateAnim.setValue(0);
  });
};


  return (
    <View style={styles.container}>
      <Image source={Logo} style={styles.logoImage} />

      <Text style={styles.title}>{t("welcomeTitle")}</Text>
      <Text style={styles.subtitle}>{t("welcomeSubtitle")}</Text>

      {/* Botão reload animado */}
      <View style={{ width: "100%", alignItems: "flex-end", paddingRight: 10 }}>
        <TouchableOpacity onPress={startRotation}>
          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <Ionicons name="reload" size={24} color="#ffffff" />
          </Animated.View>
        </TouchableOpacity>
      </View>

      <View style={styles.separador} />

      <View style={styles.deviceList}>
        {devices.map((item) => (
          <TouchableOpacity
            key={item}
            style={[
              styles.deviceButton,
              selected === item && styles.deviceSelected,
            ]}
            onPress={() => setSelected(item)}
            activeOpacity={0.8}
          >
            <Text style={styles.deviceText}>{item}</Text>
            <View
              style={[
                styles.checkCircle,
                selected === item && styles.checkCircleActive,
              ]}
            >
              {selected === item && <View style={styles.checkDot} />}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={handleEmparelhar}>
        <Text style={styles.buttonText}>{t("pairButton")}</Text>
      </TouchableOpacity>
    </View>
  );
}
