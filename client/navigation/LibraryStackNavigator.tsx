import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LibraryScreen from "@/screens/LibraryScreen";
import DocumentViewerScreen from "@/screens/DocumentViewerScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type LibraryStackParamList = {
  Library: undefined;
  DocumentViewer: { documentId: string; documentName: string };
};

const Stack = createNativeStackNavigator<LibraryStackParamList>();

export default function LibraryStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Library"
        component={LibraryScreen}
        options={{
          headerTitle: "Knowledge Base",
        }}
      />
      <Stack.Screen
        name="DocumentViewer"
        component={DocumentViewerScreen}
        options={({ route }) => ({
          headerTitle: route.params.documentName,
        })}
      />
    </Stack.Navigator>
  );
}
