import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  ScrollView,
  TextInput,
} from "react-native";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next"; // Importando o hook de tradução
import styles from "./Style";

const devices = ["Letreiro", "Digitação"];

function FloatingSlider({
  labelLeft,
  labelRight,
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  unit = "",
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    const pos = (localValue - min) / (max - min || 1);
    Animated.timing(anim, {
      toValue: pos,
      duration: 120,
      useNativeDriver: false,
    }).start();
  }, [localValue, min, max, anim]);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <View style={{ width: "100%", marginBottom: 22 }}>
      <View style={styles.sliderContainer}>
        <Text style={styles.smallA}>{labelLeft}</Text>
        <Slider
          style={{ flex: 1 }}
          minimumValue={min}
          maximumValue={max}
          step={step}
          value={localValue}
          minimumTrackTintColor="#00AEEF"
          maximumTrackTintColor="#333"
          thumbTintColor="#fff"
          onValueChange={(v) => {
            setLocalValue(v);
            onValueChange(v);
          }}
        />
        <Text style={styles.bigA}>{labelRight}</Text>
      </View>

      <Animated.View
        style={[
          styles.floatingLabel,
          {
            left: anim.interpolate({
              inputRange: [0, 1],
              outputRange: ["10%", "75%"],
            }),
          },
        ]}
      >
        <Text style={styles.floatingText}>
          {localValue} {unit}
        </Text>
      </Animated.View>
    </View>
  );
}

export default function TeleprompterScreen() {
  const router = useRouter();
  const { t } = useTranslation(); // Inicializando o hook de tradução
  const [text, setText] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [selected, setSelected] = useState("Letreiro");

  // Estados comuns
  const [fontSize, setFontSize] = useState(24);
  const fontMin = 10;
  const fontMax = 48;

  // Letreiro específico
  const [speed, setSpeed] = useState(50);
  const [direction, setDirection] = useState("Esquerda");

  // Digitação específica
  const [intervalBetweenWords, setIntervalBetweenWords] = useState(150);
  const [intervalFinal, setIntervalFinal] = useState(400);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("teleprompter.title")}</Text> 
          <View style={{ width: 28 }} />
        </View>

        <Text style={styles.sectionTitle}>{t("teleprompter.subtitle")}</Text> 
        <Text style={styles.sectionSubtitle}>
          {t("teleprompter.inputPlaceholder")}
        </Text>

        {/* Input de texto */}
        <TextInput
          style={[styles.textInput, isFocused && styles.textInputFocused]}
          placeholder={t("teleprompter.placeholder")} 
          placeholderTextColor="#666"
          multiline
          value={text}
          onChangeText={setText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />

        {/* Modo selector */}
        <View style={styles.deviceList}>
          {devices.map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.deviceButton, selected === item && styles.deviceSelected]}
              onPress={() => setSelected(item)}
              activeOpacity={0.8}
            >
              <Text style={styles.deviceText}>{item}</Text>
              <View
                style={[styles.checkCircle, selected === item && styles.checkCircleActive]}
              >
                {selected === item && <View style={styles.checkDot} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Seletor de Tamanho da Fonte */}
        <Text style={styles.sectionTitle}>{t("teleprompter.fontSize")}</Text>
        <FloatingSlider
          labelLeft="A"
          labelRight="A"
          value={fontSize}
          onValueChange={setFontSize}
          min={fontMin}
          max={fontMax}
          step={1}
          unit="pt"
        />

        {/* Renderização condicional dos controles por modo */}
        {selected === "Letreiro" ? (
          <>
            <Text style={styles.sectionTitle}>{t("teleprompter.speed")}</Text> 
            <FloatingSlider
              labelLeft="-"
              labelRight="+"
              value={speed}
              onValueChange={setSpeed}
              min={1}
              max={100}
              step={1}
              unit=""
            />

            <Text style={[styles.sectionTitle, { marginTop: 8 }]}>
              {t("teleprompter.direction")} 
            </Text>
            <View style={styles.directionWrapper}>
              <TouchableOpacity
                style={[styles.directionButton, direction === "Esquerda" && styles.directionActive]}
                onPress={() => setDirection("Esquerda")}
              >
                <Text
                  style={[styles.directionText, direction === "Esquerda" && styles.directionTextActive]}
                >
                  {t("teleprompter.left")} 
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.directionButton, direction === "Direita" && styles.directionActive]}
                onPress={() => setDirection("Direita")}
              >
                <Text
                  style={[styles.directionText, direction === "Direita" && styles.directionTextActive]}
                >
                  {t("teleprompter.right")} 
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>{t("teleprompter.wordInterval")}</Text> 
            <Text style={styles.sectionSubtitle}>{t("teleprompter.wordIntervalDescription")}</Text> 
            <FloatingSlider
              labelLeft="-"
              labelRight="+"
              value={intervalBetweenWords}
              onValueChange={setIntervalBetweenWords}
              min={0.5}
              max={3.0}
              step={0.1}
              unit="s"
            />

            <Text style={styles.sectionTitle}>{t("teleprompter.finalInterval")}</Text> 
            <Text style={styles.sectionSubtitle}>{t("teleprompter.finalIntervalDescription")}</Text> 
            <FloatingSlider
              labelLeft="-"
              labelRight="+"
              value={intervalFinal}
              onValueChange={setIntervalFinal}
              min={1.0}
              max={10.0}
              step={0.5}
              unit="s"
            />
          </>
        )}

        {/* Botão Exibir */}
        <TouchableOpacity style={styles.exibirButton} activeOpacity={0.8}>
          <Text style={styles.exibirText}>{t("teleprompter.display")}</Text> 
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}