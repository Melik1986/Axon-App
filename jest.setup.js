/* global jest */
// Fix for Expo SDK 52+ / WinterJS in Jest
jest.mock("expo/src/winter", () => ({}));
jest.mock("expo/src/winter/runtime.native", () => ({}));

// Mock AsyncStorage for Node (no window). Zustand persist uses getItem/setItem/removeItem.
jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
    clear: async () => {},
  },
}));

jest.mock("expo-secure-store", () => ({
  __esModule: true,
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "WHEN_UNLOCKED_THIS_DEVICE_ONLY",
}));

jest.mock("expo-local-authentication", () => ({
  __esModule: true,
  hasHardwareAsync: jest.fn().mockResolvedValue(true),
  isEnrolledAsync: jest.fn().mockResolvedValue(true),
  authenticateAsync: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock("react-native", () => {
  const RN = jest.requireActual("react-native");
  RN.Platform.OS = "ios";
  RN.Alert.alert = jest.fn();
  return RN;
});

// Mock Reanimated
jest.mock("react-native-reanimated", () => {
  const Reanimated = {
    default: {
      call: () => {},
      createAnimatedComponent: (c) => c,
    },
    useSharedValue: jest.fn((v) => ({ value: v })),
    useAnimatedProps: jest.fn((cb) => cb()),
    useDerivedValue: jest.fn((cb) => ({ value: cb() })),
    useAnimatedStyle: jest.fn((cb) => cb()),
    withTiming: jest.fn((v) => v),
    withSpring: jest.fn((v) => v),
    withRepeat: jest.fn((v) => v),
    withSequence: jest.fn((...args) => args[args.length - 1]),
    interpolate: jest.fn(() => 0),
    Easing: {
      linear: jest.fn(),
    },
  };
  return {
    __esModule: true,
    ...Reanimated,
    default: {
      ...Reanimated.default,
      createAnimatedComponent: (c) => c,
    },
  };
});

// Mock expo-constants for Winter runtime compatibility
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    manifest: {
      extra: {},
    },
    expoConfig: {
      extra: {},
    },
  },
}));

// Mock expo-font
jest.mock("expo-font", () => ({
  isLoaded: jest.fn().mockReturnValue(true),
  loadAsync: jest.fn().mockResolvedValue(true),
  useFonts: jest.fn().mockReturnValue([true, null]),
}));

// Mock expo-file-system
jest.mock("expo-file-system", () => ({
  documentDirectory: "file:///mock/document/directory/",
  cacheDirectory: "file:///mock/cache/directory/",
  readAsStringAsync: jest.fn().mockResolvedValue(""),
  writeAsStringAsync: jest.fn().mockResolvedValue(),
  deleteAsync: jest.fn().mockResolvedValue(),
  makeDirectoryAsync: jest.fn().mockResolvedValue(),
  getInfoAsync: jest
    .fn()
    .mockResolvedValue({ exists: true, isDirectory: false }),
  downloadAsync: jest.fn().mockResolvedValue({ uri: "file:///mock/download" }),
}));

// Mock expo-asset
jest.mock("expo-asset", () => ({
  Asset: {
    loadAsync: jest.fn().mockResolvedValue([]),
    fromModule: jest.fn().mockReturnValue({ uri: "mock-asset-uri" }),
  },
}));

// Mock react-native-svg
jest.mock("react-native-svg", () => {
  const React = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");
  const MockSvg = (props) => React.createElement(View, props, props.children);
  return new Proxy(
    {},
    {
      get: (target, prop) => {
        if (prop === "__esModule") return true;
        if (prop === "default") return MockSvg;
        return MockSvg;
      },
    },
  );
});
