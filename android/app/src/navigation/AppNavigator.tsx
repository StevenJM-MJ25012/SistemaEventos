import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, SHADOW, RADIUS } from '../theme';

// Screens
import EventosScreen        from '../screens/EventosScreen';
import EventoDetalleScreen  from '../screens/EventoDetalleScreen';
import ParticipantesScreen  from '../screens/ParticipantesScreen';
import PagosScreen          from '../screens/PagosScreen';
import AgregarPagoScreen    from '../screens/AgregarPagoScreen';

// ─── Tipos ─────────────────────────────────────────────────────────────────
export type RootStackParamList = {
  MainTabs:       undefined;
  EventoDetalle:  { eventoId: string; eventoNombre: string };
  Participantes:  { eventoId: string; eventoNombre: string; costo: number };
  Pagos:          { eventoId: string; participanteId: string; participanteNombre: string; costo: number };
  AgregarPago:    { eventoId: string; participanteId: string; participanteNombre: string; costo: number };
};

export type TabParamList = {
  Eventos:    undefined;
  Dashboard:  undefined;
  Finanzas:   undefined;
  Ajustes:    undefined;
};

// ─── Placeholders para tabs futuros ───────────────────────────────────────
function PlaceholderScreen({ nombre, icono }: { nombre: string; icono: string }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, gap: 12 }}>
      <Icon name={icono} size={52} color={COLORS.accentSoft} />
      <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.muted }}>
        {nombre}
      </Text>
      <Text style={{ fontSize: 13, color: COLORS.muted }}>Próximamente</Text>
    </View>
  );
}

// ─── Tab Bar personalizado ─────────────────────────────────────────────────
function CustomTabBar({ state, descriptors, navigation }: any) {
  const tabs = [
    { name: 'Eventos',   icon: 'calendar-star',      iconActive: 'calendar-star'      },
    { name: 'Dashboard', icon: 'view-dashboard-outline', iconActive: 'view-dashboard' },
    { name: 'Finanzas',  icon: 'chart-line',          iconActive: 'chart-line'         },
    { name: 'Ajustes',   icon: 'cog-outline',         iconActive: 'cog'                },
  ];

  return (
    <View style={tabStyles.container}>
      {state.routes.map((route: any, index: number) => {
        const focused = state.index === index;
        const tab     = tabs[index];

        return (
          <TouchableOpacity
            key={route.key}
            style={tabStyles.tab}
            onPress={() => navigation.navigate(route.name)}
            activeOpacity={0.7}
          >
            <View style={[tabStyles.iconWrap, focused && tabStyles.iconWrapActive]}>
              <Icon
                name={focused ? tab.iconActive : tab.icon}
                size={22}
                color={focused ? COLORS.onAccent : COLORS.tabInactive}
              />
            </View>
            <Text style={[tabStyles.label, focused && tabStyles.labelActive]}>
              {tab.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  container: {
    flexDirection:    'row',
    backgroundColor:  COLORS.tabBg,
    paddingTop:       10,
    paddingBottom:    Platform.OS === 'ios' ? 28 : 14,
    paddingHorizontal: 8,
    borderTopWidth:   1,
    borderTopColor:   COLORS.border,
    ...SHADOW.subtle,
  },
  tab: {
    flex:           1,
    alignItems:     'center',
    gap:            4,
  },
  iconWrap: {
    width:           44,
    height:          34,
    borderRadius:    RADIUS.md,
    justifyContent:  'center',
    alignItems:      'center',
  },
  iconWrapActive: {
    backgroundColor: COLORS.accent,
    ...SHADOW.card,
  },
  label: {
    fontSize:   10,
    fontWeight: '600',
    color:      COLORS.tabInactive,
  },
  labelActive: {
    color: COLORS.accent,
  },
});

// ─── Bottom Tab Navigator ──────────────────────────────────────────────────
const Tab = createBottomTabNavigator<TabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Eventos"   component={EventosScreen} />
      <Tab.Screen name="Dashboard" component={() => <PlaceholderScreen nombre="Dashboard" icono="view-dashboard-outline" />} />
      <Tab.Screen name="Finanzas"  component={() => <PlaceholderScreen nombre="Finanzas"  icono="chart-line" />} />
      <Tab.Screen name="Ajustes"   component={() => <PlaceholderScreen nombre="Ajustes"   icono="cog-outline" />} />
    </Tab.Navigator>
  );
}

// ─── Header personalizado ──────────────────────────────────────────────────
function CustomHeader({ title, canGoBack, navigation, onRefresh }: {
  title: string;
  canGoBack: boolean;
  navigation: any;
  onRefresh?: () => void;
}) {
  return (
    <View style={headerStyles.container}>
      <View style={headerStyles.left}>
        {canGoBack && (
          <TouchableOpacity style={headerStyles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={20} color={COLORS.text} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={headerStyles.title} numberOfLines={1}>{title}</Text>

      <View style={headerStyles.right}>
        {onRefresh && (
          <TouchableOpacity style={headerStyles.actionBtn} onPress={onRefresh}>
            <Icon name="refresh" size={20} color={COLORS.accent} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const headerStyles = StyleSheet.create({
  container: {
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
    backgroundColor:  COLORS.surface,
    paddingHorizontal: 16,
    paddingTop:       Platform.OS === 'ios' ? 54 : 16,
    paddingBottom:    14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  left:      { width: 44, alignItems: 'flex-start' },
  right:     { width: 44, alignItems: 'flex-end' },
  title:     { fontSize: 17, fontWeight: '700', color: COLORS.text, flex: 1, textAlign: 'center' },
  backBtn:   { width: 36, height: 36, borderRadius: RADIUS.sm, backgroundColor: COLORS.surfaceSoft, justifyContent: 'center', alignItems: 'center' },
  actionBtn: { width: 36, height: 36, borderRadius: RADIUS.sm, backgroundColor: COLORS.surfaceBlue, justifyContent: 'center', alignItems: 'center' },
});

// Exportar para usar en pantallas
export { CustomHeader };

// ─── Stack principal ───────────────────────────────────────────────────────
const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs"      component={MainTabs} />
        <Stack.Screen name="EventoDetalle" component={EventoDetalleScreen} />
        <Stack.Screen name="Participantes" component={ParticipantesScreen} />
        <Stack.Screen name="Pagos"         component={PagosScreen} />
        <Stack.Screen name="AgregarPago"   component={AgregarPagoScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}