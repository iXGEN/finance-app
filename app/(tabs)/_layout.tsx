import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useUserConfigStore } from '../../store/userConfigStore';
import { useT } from '../../services/i18n';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function icon(name: IoniconName) {
  return ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={name} size={size} color={color} />
  );
}

export default function TabLayout() {
  const t = useT();
  const fetchConfig = useUserConfigStore((s) => s.fetch);

  useEffect(() => { fetchConfig(); }, []);

  return (
    <>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textMuted,
          tabBarHideOnKeyboard: true,
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
          name="summary"
          options={{ title: t.tabs.resumen, tabBarIcon: icon('pie-chart-outline') }}
        />
        <Tabs.Screen
          name="expenses"
          options={{ title: t.tabs.gastos, tabBarIcon: icon('wallet-outline') }}
        />
        <Tabs.Screen
          name="chat"
          options={{ title: t.tabs.chat, tabBarIcon: icon('chatbubbles-outline') }}
        />
        <Tabs.Screen
          name="budget"
          options={{ title: t.tabs.presupuesto, tabBarIcon: icon('stats-chart-outline') }}
        />
        <Tabs.Screen
          name="balances"
          options={{ title: t.tabs.saldos, tabBarIcon: icon('swap-horizontal-outline') }}
        />
        <Tabs.Screen
          name="settings"
          options={{ title: t.tabs.ajustes, tabBarIcon: icon('settings-outline') }}
        />
      </Tabs>
    </>
  );
}
