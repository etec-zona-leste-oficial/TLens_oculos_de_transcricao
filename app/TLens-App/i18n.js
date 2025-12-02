import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";

import en from "./locales/en/translation.json";
import pt from "./locales/pt/translation.json";

const resources = {
  en: { translation: en },
  pt: { translation: pt },
};

// Pega a lista de idiomas disponíveis e usa o primeiro
const locales = Localization.getLocales();
const languageTag = locales && locales.length > 0 ? locales[0].languageTag : "en";

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: "v3",
    resources,
    lng: languageTag.startsWith("pt") ? "pt" : "en",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false, // react já faz a proteção
    },
  });

export default i18n;
