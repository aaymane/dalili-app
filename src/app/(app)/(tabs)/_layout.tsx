import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/layout/TabBar';
import { palette } from '@/theme/tokens';

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: palette.bg }, animation: 'shift' }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="explorer" />
      <Tabs.Screen name="ia" />
      <Tabs.Screen name="communaute" />
      <Tabs.Screen name="profil" />
    </Tabs>
  );
}
