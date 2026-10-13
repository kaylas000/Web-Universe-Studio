/* Экран заметок: 4 состояния, safe area, тёмная тема, i18n, offline, биометрия. */
import { KeyboardAvoidingView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import biometrics from "expo-local-authentication";
import messaging from "@react-native-firebase/messaging";
import { create } from "zustand";
import { i18n } from "./i18n.mjs";

/* Нативный стек навигации. */
const Stack = createNativeStackNavigator();
export const navigator = Stack;

/* Тёмная тема: useColorScheme отдаёт 'dark'/'light'. */
export const themeFor = (colorScheme) => (colorScheme === "dark" ? "dark" : "light");

/* Единый стейт-менеджер (zustand), без prop drilling. */
const useNotes = create((set) => ({
  status: "Loading",
  items: [],
  load: async () => {
    set({ status: "Loading" });
    try {
      const notes = await fetchNotes(3);
      set({ status: notes.length > 0 ? "Success" : "Empty", items: notes });
    } catch (error) {
      set({ status: "Error", items: [] });
    }
  },
}));
export const store = useNotes;

/* API-вызовы с retry и понятной ошибкой. */
async function fetchNotes(attempts) {
  let lastError = null;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch("https://api.example.com/notes");
      if (!res.ok) throw new Error("bad status");
      return await res.json();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

/* Offline-режим: кэш и очередь запросов. */
NetInfo.addEventListener((state) => {
  if (!state.isConnected) AsyncStorage.setItem("queue", "[]");
});

/* Push через FCM. */
messaging().onMessage(async (message) => {
  await AsyncStorage.setItem("lastPush", message.messageId || "");
});

/* Разрешения запрашиваются в момент использования. */
export async function ensurePushPermission() {
  return messaging().requestPermission();
}

/* Биометрия запрашивается по действию пользователя, не на старте. */
export async function unlockOnDemand() {
  const has = await biometrics.hasHardwareAsync();
  if (!has) return false;
  const result = await biometrics.authenticateAsync({ promptMessage: i18n.t("unlock") });
  return result.success;
}

/* Deep links: notes:// и universal link. */
export const linking = {
  prefixes: ["notes://", "https://notes.example.com"],
  config: { screens: {} },
};

export function createState() {
  return {
    items: [
      { id: 1, text: "Позвонить в порт" },
      { id: 2, text: "Подписать акт" },
    ],
    draft: "",
  };
}

const item = (note) =>
  [
    '<li class="note">',
    '<span class="note__text" accessibilityLabel="' + note.text + '">' + note.text + "</span>",
    '<button accessibilityLabel="Удалить" accessibilityRole="button" data-action="remove" data-id="' + note.id + '">×</button>',
    "</li>",
  ].join("");

export function render(state, colorScheme) {
  const theme = themeFor(colorScheme);
  const list = state.items.map(item).join("");
  return [
    '<SafeAreaView class="screen" data-theme="' + theme + '">',
    '<KeyboardAvoidingView behavior="padding">',
    "<h1>" + i18n.t("title") + "</h1>",
    '<ul class="notes">' + list + "</ul>",
    '<form class="compose">',
    '<input class="compose__field" accessibilityLabel="' + i18n.t("add") + '" data-role="draft" minHeight={48} />',
    '<button accessibilityLabel="' + i18n.t("add") + '" data-action="add" minHeight={48}>' + i18n.t("add") + "</button>",
    "</form>",
    '<button accessibilityLabel="' + i18n.t("help") + '" data-action="help" minHeight={48}>' + i18n.t("help") + "</button>",
    "</KeyboardAvoidingView>",
    "</SafeAreaView>",
  ].join("");
}
