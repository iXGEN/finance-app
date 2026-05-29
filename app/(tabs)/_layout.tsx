import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { Colors } from '../../constants/colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: { borderTopColor: Colors.border },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="gastos"
        options={{ title: 'Gastos', tabBarIcon: () => <Text style={{ fontSize: 20 }}>💸</Text> }}
      />
      <Tabs.Screen
        name="chat"
        options={{ title: 'Chat IA', tabBarIcon: () => <Text style={{ fontSize: 20 }}>💬</Text> }}
      />
      <Tabs.Screen
        name="presupuesto"
        options={{ title: 'Presupuesto', tabBarIcon: () => <Text style={{ fontSize: 20 }}>📊</Text> }}
      />
      <Tabs.Screen
        name="deudas"
        options={{ title: 'Deudas', tabBarIcon: () => <Text style={{ fontSize: 20 }}>🤝</Text> }}
      />
    </Tabs>
  );
}
