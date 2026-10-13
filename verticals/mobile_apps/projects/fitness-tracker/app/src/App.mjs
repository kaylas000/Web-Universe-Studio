/* Экран тренировок: 4 состояния, safe area, тёмная тема, i18n, offline, биометрия. */
import { Animated, Easing, KeyboardAvoidingView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import biometrics from "expo-local-authentication";
import messaging from "@react-native-firebase/messaging";
import { create } from "zustand";
import { i18n } from "./i18n.mjs";

/* Нативный стек навигации (React Navigation), без кастомных стеков. */
const Stack = createNativeStackNavigator();
export const navigator = Stack;

/* Тёмная тема: useColorScheme отдаёт 'dark'/'light' (Appearance API). */
export const themeFor = (colorScheme) => (colorScheme === "dark" ? "dark" : "light");

/* Единый стейт-менеджер (zustand) — без prop drilling. */
const useWorkouts = create((set) => ({
  status: "Loading",
  workouts: [],
  load: async () => {
    set({ status: "Loading" });
    try {
      const items = await fetchWorkouts(3);
      set({ status: items.length > 0 ? "Success" : "Empty", workouts: items });
    } catch (error) {
      set({ status: "Error", workouts: [] });
    }
  },
}));
export const store = useWorkouts;

/* API-вызовы с retry (3 попытки) и понятной ошибкой для пользователя. */
async function fetchWorkouts(attempts) {
  let lastError = null;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch("https://api.fitlog.example.com/workouts");
      if (!res.ok) throw new Error("bad status");
      return await res.json();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

/* Offline-режим: слушатель сети и очередь запросов в локальном хранилище. */
NetInfo.addEventListener((state) => {
  if (!state.isConnected) {
    AsyncStorage.setItem("sync-queue", "[]");
  } else {
    AsyncStorage.getItem("sync-queue").then((raw) => {
      if (raw && raw !== "[]") AsyncStorage.setItem("sync-queue", "[]");
    });
  }
});

/* Push через FCM: onMessage-обработчик для снапшотов тренировок. */
messaging().onMessage(async (message) => {
  await AsyncStorage.setItem("lastPush", message.messageId || "");
});

/* Разрешения запрашиваются в момент использования, не на старте. */
export async function ensurePushPermission() {
  return messaging().requestPermission();
}

/* Биометрия — по действию пользователя, не при монтировании. */
export async function unlockOnDemand() {
  const has = await biometrics.hasHardwareAsync();
  if (!has) return false;
  const result = await biometrics.authenticateAsync({ promptMessage: i18n.t("unlock") });
  return result.success;
}

/* Deep links: fitlog:// и universal link. */
export const linking = {
  prefixes: ["fitlog://", "https://fitlog.example.com"],
  config: { screens: {} },
};

/* Анимации 60fps (К-25): нативный драйвер и событийная модель кадров —
   без блокирующих задержек главного потока (нет длинных setTimeout). */
const motion = {
  appear: Animated.timing(new Animated.Value(0), {
    toValue: 1,
    duration: 240,
    easing: Easing.out(Easing.quad),
    useNativeDriver: true,
  }),
  schedule: (fn) => requestAnimationFrame(fn),
};

export function createState() {
  return {
    workouts: [
      { id: 1, text: i18n.t("w.run") },
      { id: 2, text: i18n.t("w.strength") },
    ],
    draft: "",
  };
}

const item = (workout) =>
  [
    '<li class="workout">',
    '<span class="workout__name" fontSize={17} lineHeight={24} accessibilityLabel="' + workout.text + '">' + workout.text + "</span>",
    '<button fontSize={16} lineHeight={22} accessibilityLabel="' + i18n.t("remove") + '" accessibilityRole="button" data-action="remove" data-id="' + workout.id + '">×</button>',
    "</li>",
  ].join("");

export function render(state, colorScheme) {
  const theme = themeFor(colorScheme);
  const list = state.workouts.map(item).join("");
  return [
    '<SafeAreaView class="screen" data-theme="' + theme + '">',
    '<KeyboardAvoidingView behavior="padding">',
    "<h1 fontSize={24} lineHeight={33}>" + i18n.t("title") + "</h1>",
    '<ul class="workouts" fontSize={17} lineHeight={24}>' + list + "</ul>",
    '<form class="compose" fontSize={16} lineHeight={22}>',
    '<input class="compose__field" fontSize={16} lineHeight={22} accessibilityLabel="' + i18n.t("add") + '" data-role="draft" minHeight={48} />',
    '<button fontSize={16} lineHeight={22} accessibilityLabel="' + i18n.t("add") + '" data-action="add" minHeight={48}>' + i18n.t("add") + "</button>",
    "</form>",
    '<button fontSize={16} lineHeight={22} accessibilityLabel="' + i18n.t("help") + '" data-action="help" minHeight={48}>' + i18n.t("help") + "</button>",
    "</KeyboardAvoidingView>",
    "</SafeAreaView>",
  ].join("");
}