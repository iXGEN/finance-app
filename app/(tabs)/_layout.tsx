import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useUserConfigStore } from '../../store/userConfigStore';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function icon(name: IoniconName) {
  return ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={name} size={size} color={color} />
  );
}

export default function TabLayout() {
  const fetchConfig = useUserConfigStore((s) => s.fetch);

  useEffect(() => { fetchConfig(); }, []);

  return (
    <>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textMuted,
          tabBarStyle: {
            backgroundColor: Colors.surface,
            borderTopColor: Colors.border,
            borderTopWidth: 1,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '600',
            letterSpacing: 0.3,
          },
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="resumen"
          options={{ title: 'Resumen', tabBarIcon: icon('pie-chart-outline') }}
        />
        <Tabs.Screen
          name="gastos"
          options={{ title: 'Gastos', tabBarIcon: icon('wallet-outline') }}
        />
        <Tabs.Screen
          name="chat"
          options={{ title: 'Chat IA', tabBarIcon: icon('chatbubbles-outline') }}
        />
        <Tabs.Screen
          name="presupuesto"
          options={{ title: 'Presupuesto', tabBarIcon: icon('stats-chart-outline') }}
        />
        <Tabs.Screen
          name="deudas"
          options={{ title: 'Saldos', tabBarIcon: icon('swap-horizontal-outline') }}
        />
        <Tabs.Screen
          name="ajustes"
          options={{ title: 'Ajustes', tabBarIcon: icon('settings-outline') }}
        />
      </Tabs>
    </>
  );
}
