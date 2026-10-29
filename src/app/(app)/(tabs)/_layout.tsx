import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/layout/TabBar';
import { useTheme } from '@/theme/scheme';

export default function TabsLayout() {
  const { c } = useTheme();
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.bg }, animation: 'shift' }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="explorer" />
      <Tabs.Screen name="ia" />
      <Tabs.Screen name="communaute" />
      <Tabs.Screen name="profil" />
    </Tabs>
  );
}
