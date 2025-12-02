import React, { useState, useRef, useCallback, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
  InteractionManager,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { styles } from "./Style";
import { useTranslation } from "react-i18next"; // 👈 import do i18next

// Assets
import MenuButton from "../../components/buttons/button_menu";
import Logo from "../../assets/icons/logo3.png";

const { width } = Dimensions.get("window");

export default function Menu() {
  const router = useRouter();
  const flatListRef = useRef(null);
  const { t } = useTranslation(); // 👈 hook de tradução

  const [oculosList, setOculosList] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // 🔹 Carrega lista de TLens
  const loadOculos = async () => {
    try {
      const saved = await AsyncStorage.getItem("oculosList");
      const parsed = saved ? JSON.parse(saved) : [];

      if (parsed.length > 0) {
        setOculosList(parsed);
      } else {
        router.replace("/parear");
      }
    } catch (error) {
      console.error("Erro ao carregar TLens:", error);
    }
  };

  // 🔹 Salva lista
  const saveOculos = async (list) => {
    try {
      await AsyncStorage.setItem("oculosList", JSON.stringify(list));
    } catch (error) {
      console.error("Erro ao salvar TLens:", error);
    }
  };

  // 🔹 Adiciona novo TLens
  const handleAddOculos = async () => {
    try {
      const counterStr = await AsyncStorage.getItem("oculosCounter");
      const counter = counterStr ? parseInt(counterStr, 10) : 0;
      const newCount = counter + 1;
      const newName = `TLens ${newCount}`;

      const updatedList = [...oculosList, newName];
      setOculosList(updatedList);

      await saveOculos(updatedList);
      await AsyncStorage.setItem("oculosCounter", newCount.toString());
    } catch (error) {
      console.error("Erro ao adicionar TLens:", error);
    }
  };

  // 🔹 Atualiza índice do carrossel
  const handleScroll = (event) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveIndex(slideIndex);
  };

  // 🔹 Recarrega lista ao voltar para a tela
  useFocusEffect(
    useCallback(() => {
      loadOculos();
    }, [])
  );

  // 🔹 Posiciona carrossel no último TLens
  useEffect(() => {
    if (oculosList.length > 0) {
      const task = InteractionManager.runAfterInteractions(() => {
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: oculosList.length - 1,
            animated: true,
          });
          setActiveIndex(oculosList.length - 1);
        }, 50);
      });
      return () => task.cancel();
    }
  }, [oculosList]);

  return (
    <View style={styles.container}>
      {/* ---------- Cabeçalho ---------- */}
      <View style={styles.header}>
        <Image source={Logo} style={styles.logoImage} resizeMode="contain" />

        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={handleAddOculos}>
            <Ionicons name="add" size={30} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/NotReceb")}>
            <Ionicons name="notifications-outline" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ---------- Carrossel de TLens ---------- */}
      <FlatList
        ref={flatListRef}
        data={oculosList}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={width}
        decelerationRate="fast"
        keyExtractor={(item) => item}
        onScroll={handleScroll}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        style={{ flexGrow: 0 }}
        renderItem={({ item }) => (
          <View
            style={{
              width: Dimensions.get("window").width,
              alignItems: "center",
            }}
          >
            <Text style={styles.subtitle}>{item}</Text>

            {/* ---------- Grade de botões ---------- */}
            <View style={styles.menuGrid}>
              <MenuButton
                title={t("menu.conversas")}
                icon="chatbox-ellipses-outline"
                onPress={() => router.push("/Text  ")}
              />
              <MenuButton
                title={t("menu.texto")}
                icon="document-text-outline"
                onPress={() => router.push("/Teleprompter")}
              />
              <MenuButton
                title={t("menu.meuTlens")}
                icon="glasses-outline"
                onPress={() => router.push("/MyTlens")}
              />
           
              <MenuButton
                title={t("menu.respostas")}
                icon="flash-outline"
                onPress={() => router.push("/Talks")}
              />
            </View>
          </View>
        )}
      />

      {/* ---------- Indicadores ---------- */}
      <View style={styles.dotsContainer}>
        {oculosList.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              activeIndex === index && styles.activeDot,
            ]}
          />
        ))}
      </View>

      {/* ---------- Rodapé ---------- */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.footerButton}
          onPress={() => router.push("/Settings")}
        >
          <Ionicons name="settings-outline" size={23} color="#fff" />
          <Text style={styles.footerText}>{t("menu.configuracoes")}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.footerButton}>
          <Ionicons name="help-circle-outline" size={26} color="#fff" />
          <Text style={styles.footerText}>{t("menu.ajuda")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
