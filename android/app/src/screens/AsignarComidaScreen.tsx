import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { COLORS, SHADOW, RADIUS, SPACING } from '../theme';
import { CustomHeader } from '../navigation/AppNavigator';
import {
  obtenerTiemposComida,
  obtenerPlatosPorTipo,
  obtenerBebidasPorTipo,
  asignarComidaParticipante,
  obtenerAsignacionesParticipante,
  obtenerEntregasPendientes,
  registrarEntregaComida,
  marcarComidaEntregada,
} from '../services/comidaService';
import { participantesRef } from '../config/firebase';
import { TiempoComidaEvento, PlatoMenu, BebidaMenu, AsignacionComida, EntregaComida } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Participantes'>;
type Ruta = RouteProp<RootStackParamList, 'Participantes'>;

interface ParticipanteConComida {
  id: string;
  nombre: string;
  email?: string;
}

export default function AsignarComidaScreen() {
  const navigation = useNavigation<Nav>();
  const { eventoId, eventoNombre } = useRoute<Ruta>().params;

  const [participantes, setParticipantes] = useState<ParticipanteConComida[]>([]);
  const [tiemposComida, setTiemposComida] = useState<TiempoComidaEvento[]>([]);
  const [platosPorTipo, setPlatosPorTipo] = useState<{ [key: string]: PlatoMenu[] }>({});
  const [bebidasPorTipo, setBebidasPorTipo] = useState<{ [key: string]: BebidaMenu[] }>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'asignar' | 'entregar'>('asignar');

  // Modales
  const [modalAsignarVisible, setModalAsignarVisible] = useState(false);
  const [modalEntregarVisible, setModalEntregarVisible] = useState(false);

  // Estados de formulario
  const [participanteSeleccionado, setParticipanteSeleccionado] = useState<ParticipanteConComida | null>(null);
  const [tiempoSeleccionado, setTiempoSeleccionado] = useState<TiempoComidaEvento | null>(null);
  const [platoSeleccionado, setPlatoSeleccionado] = useState<PlatoMenu | null>(null);
  const [bebidaSeleccionada, setBebidaSeleccionada] = useState<BebidaMenu | null>(null);
  const [asignacionesParticipante, setAsignacionesParticipante] = useState<AsignacionComida[]>([]);
  const [entregasPendientes, setEntregasPendientes] = useState<EntregaComida[]>([]);

  const [saving, setSaving] = useState(false);

  // ─── Cargar datos iniciales ────────────────────────────────────────────
  const cargarDatos = useCallback(async () => {
    try {
      setRefreshing(true);

      // Obtener participantes
      const partsSnap = await participantesRef()
        .where('eventoId', '==', eventoId)
        .orderBy('nombre', 'asc')
        .get();

      const parts = partsSnap.docs.map(d => ({
        id: d.id,
        nombre: d.data().nombre,
        email: d.data().email,
      }));
      setParticipantes(parts);

      // Obtener tiempos de comida
      const tiempos = await obtenerTiemposComida(eventoId);
      setTiemposComida(tiempos);

      // Obtener platos y bebidas por tipo
      const tipos = ['Desayuno', 'Almuerzo', 'Merienda', 'Cena'];
      const platosPorTipoTemp: { [key: string]: PlatoMenu[] } = {};
      const bebidasPorTipoTemp: { [key: string]: BebidaMenu[] } = {};

      for (const tipo of tipos) {
        const platos = await obtenerPlatosPorTipo(eventoId, tipo as any);
        const bebidas = await obtenerBebidasPorTipo(eventoId, tipo as any);
        platosPorTipoTemp[tipo] = platos;
        bebidasPorTipoTemp[tipo] = bebidas;
      }

      setPlatosPorTipo(platosPorTipoTemp);
      setBebidasPorTipo(bebidasPorTipoTemp);

      // Obtener entregas pendientes
      const entregas = await obtenerEntregasPendientes(eventoId);
      setEntregasPendientes(entregas);
    } catch (error) {
      console.warn('Error cargando datos:', error);
      Alert.alert('Error', 'No se pudo cargar los datos');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [eventoId]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // ─── Asignar comida a participante ─────────────────────────────────────
  const handleAsignarComida = async () => {
    if (!participanteSeleccionado || !tiempoSeleccionado || !platoSeleccionado || !bebidaSeleccionada) {
      Alert.alert('Error', 'Selecciona participante, tiempo de comida, plato y bebida');
      return;
    }

    try {
      setSaving(true);
      await asignarComidaParticipante(
        eventoId,
        participanteSeleccionado.id,
        participanteSeleccionado.nombre,
        tiempoSeleccionado.id,
        tiempoSeleccionado.tipo,
        platoSeleccionado.id,
        platoSeleccionado.nombre,
        platoSeleccionado.tipo,
        bebidaSeleccionada.id,
        bebidaSeleccionada.nombre,
        bebidaSeleccionada.tipo
      );

      Alert.alert('Éxito', 'Comida asignada al participante');
      setModalAsignarVisible(false);
      setParticipanteSeleccionado(null);
      setTiempoSeleccionado(null);
      setPlatoSeleccionado(null);
      setBebidaSeleccionada(null);
      await cargarDatos();
    } catch (error) {
      Alert.alert('Error', 'No se pudo asignar la comida');
    } finally {
      setSaving(false);
    }
  };

  // ─── Marcar comida como entregada ──────────────────────────────────────
  const handleMarcarEntregada = async (entregaId: string) => {
    try {
      setSaving(true);
      await marcarComidaEntregada(entregaId);
      Alert.alert('Éxito', 'Comida marcada como entregada');
      await cargarDatos();
    } catch (error) {
      Alert.alert('Error', 'No se pudo marcar la entrega');
    } finally {
      setSaving(false);
    }
  };

  // ─── Render tab asignar ───────────────────────────────────────────────
  const renderAsignar = () => (
    <View style={styles.tabContent}>
      <TouchableOpacity
        style={styles.btnAgregar}
        onPress={() => setModalAsignarVisible(true)}
      >
        <Icon name="plus-circle" size={20} color={COLORS.onAccent} />
        <Text style={styles.btnAgregarText}>Asignar Comida</Text>
      </TouchableOpacity>

      {participantes.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="account-multiple" size={48} color={COLORS.muted} />
          <Text style={styles.emptyText}>No hay participantes en este evento</Text>
        </View>
      ) : (
        <FlatList
          data={participantes}
          keyExtractor={item => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={async () => {
                setParticipanteSeleccionado(item);
                const asignaciones = await obtenerAsignacionesParticipante(eventoId, item.id);
                setAsignacionesParticipante(asignaciones);
                setModalAsignarVisible(true);
              }}
            >
              <View style={styles.cardHeader}>
                <Icon name="account" size={24} color={COLORS.accent} />
                <View style={{ flex: 1, marginLeft: SPACING.md }}>
                  <Text style={styles.cardTitle}>{item.nombre}</Text>
                  {item.email && <Text style={styles.cardSubtitle}>{item.email}</Text>}
                </View>
                <Icon name="chevron-right" size={24} color={COLORS.muted} />
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );

  // ─── Render tab entregar ──────────────────────────────────────────────
  const renderEntregar = () => (
    <View style={styles.tabContent}>
      {entregasPendientes.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="check-circle" size={48} color={COLORS.success} />
          <Text style={styles.emptyText}>No hay entregas pendientes</Text>
        </View>
      ) : (
        <FlatList
          data={entregasPendientes}
          keyExtractor={item => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.entregaCard}>
              <View style={styles.entregaHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.entregaNombre}>{item.participanteNombre}</Text>
                  <Text style={styles.entregaPlato}>{item.platoNombre}</Text>
                </View>
              </View>
              <View style={styles.entregaDetalles}>
                <Text style={styles.entregaLabel}>Bebida: <Text style={styles.entregaValue}>{item.bebidaNombre}</Text></Text>
              </View>
              <TouchableOpacity
                style={styles.btnEntregar}
                onPress={() => handleMarcarEntregada(item.id)}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={COLORS.onAccent} />
                ) : (
                  <>
                    <Icon name="check" size={18} color={COLORS.onAccent} />
                    <Text style={styles.btnEntregarText}>Marcar entregada</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );

  // ─── Modal asignar ────────────────────────────────────────────────────
  const renderModalAsignar = () => (
    <Modal visible={modalAsignarVisible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Asignar Comida</Text>
            <TouchableOpacity onPress={() => setModalAsignarVisible(false)}>
              <Icon name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Participante */}
            <Text style={styles.label}>Participante</Text>
            <ScrollView horizontal style={styles.selectorContainer}>
              {participantes.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.selectorItem,
                    participanteSeleccionado?.id === p.id && styles.selectorItemActive,
                  ]}
                  onPress={() => setParticipanteSeleccionado(p)}
                >
                  <Text
                    style={[
                      styles.selectorItemText,
                      participanteSeleccionado?.id === p.id && styles.selectorItemTextActive,
                    ]}
                  >
                    {p.nombre}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Tiempo de comida */}
            <Text style={styles.label}>Tiempo de Comida</Text>
            <ScrollView horizontal style={styles.selectorContainer}>
              {tiemposComida.map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.selectorItem,
                    tiempoSeleccionado?.id === t.id && styles.selectorItemActive,
                  ]}
                  onPress={() => setTiempoSeleccionado(t)}
                >
                  <Text
                    style={[
                      styles.selectorItemText,
                      tiempoSeleccionado?.id === t.id && styles.selectorItemTextActive,
                    ]}
                  >
                    {t.tipo}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Platos */}
            {tiempoSeleccionado && (
              <>
                <Text style={styles.label}>Plato</Text>
                <ScrollView horizontal style={styles.selectorContainer}>
                  {(platosPorTipo[tiempoSeleccionado.tipo] || []).map(p => (
                    <TouchableOpacity
                      key={p.id}
                      style={[
                        styles.selectorItem,
                        platoSeleccionado?.id === p.id && styles.selectorItemActive,
                      ]}
                      onPress={() => setPlatoSeleccionado(p)}
                    >
                      <Text
                        style={[
                          styles.selectorItemText,
                          platoSeleccionado?.id === p.id && styles.selectorItemTextActive,
                        ]}
                      >
                        {p.nombre}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {/* Bebidas */}
            {tiempoSeleccionado && (
              <>
                <Text style={styles.label}>Bebida</Text>
                <ScrollView horizontal style={styles.selectorContainer}>
                  {(bebidasPorTipo[tiempoSeleccionado.tipo] || []).map(b => (
                    <TouchableOpacity
                      key={b.id}
                      style={[
                        styles.selectorItem,
                        bebidaSeleccionada?.id === b.id && styles.selectorItemActive,
                      ]}
                      onPress={() => setBebidaSeleccionada(b)}
                    >
                      <Text
                        style={[
                          styles.selectorItemText,
                          bebidaSeleccionada?.id === b.id && styles.selectorItemTextActive,
                        ]}
                      >
                        {b.nombre}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {/* Asignaciones actuales */}
            {asignacionesParticipante.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Comidas Asignadas</Text>
                {asignacionesParticipante.map(asig => (
                  <View key={asig.id} style={styles.asignacionItem}>
                    <View style={styles.asignacionInfo}>
                      <Text style={styles.asignacionTipo}>{asig.tipoComida}</Text>
                      <Text style={styles.asignacionDetalles}>
                        {asig.platoNombre} + {asig.bebidaNombre}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.btnCancel}
              onPress={() => setModalAsignarVisible(false)}
            >
              <Text style={styles.btnCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnSave}
              onPress={handleAsignarComida}
              disabled={saving || !participanteSeleccionado || !tiempoSeleccionado}
            >
              {saving ? (
                <ActivityIndicator color={COLORS.onAccent} />
              ) : (
                <Text style={styles.btnSaveText}>Asignar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CustomHeader
        title="🍽 Asignar Comida"
        canGoBack
        navigation={navigation}
        onRefresh={cargarDatos}
      />

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {(['asignar', 'entregar'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'asignar' && '✏️ Asignar'}
              {tab === 'entregar' && '📦 Entregar'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <FlatList
        data={[{ key: activeTab }]}
        keyExtractor={item => item.key}
        renderItem={() => {
          if (activeTab === 'asignar') return renderAsignar();
          if (activeTab === 'entregar') return renderEntregar();
          return null;
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={cargarDatos} />}
        scrollEnabled={false}
      />

      {/* Modales */}
      {renderModalAsignar()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: SPACING.md,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.accent,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
  },
  tabTextActive: {
    color: COLORS.accent,
    fontWeight: '700',
  },

  // Content
  tabContent: {
    flex: 1,
    padding: SPACING.md,
  },
  btnAgregar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    ...SHADOW.card,
  },
  btnAgregarText: {
    color: COLORS.onAccent,
    fontWeight: '700',
    marginLeft: SPACING.sm,
    fontSize: 14,
  },

  // Cards
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOW.subtle,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  cardSubtitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: SPACING.xs,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: SPACING.md,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.muted,
    fontWeight: '500',
  },

  // Modales
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    maxHeight: '90%',
    paddingTop: SPACING.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalBody: {
    padding: SPACING.md,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: SPACING.md,
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  // Form
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  selectorContainer: {
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  selectorItem: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    marginRight: SPACING.sm,
  },
  selectorItemActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  selectorItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  selectorItemTextActive: {
    color: COLORS.onAccent,
  },

  // Asignaciones
  section: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  asignacionItem: {
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent,
  },
  asignacionInfo: {
    gap: SPACING.xs,
  },
  asignacionTipo: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accent,
  },
  asignacionDetalles: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },

  // Entregas
  entregaCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOW.subtle,
  },
  entregaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  entregaNombre: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  entregaPlato: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: SPACING.xs,
  },
  entregaDetalles: {
    marginBottom: SPACING.md,
  },
  entregaLabel: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '500',
  },
  entregaValue: {
    color: COLORS.text,
    fontWeight: '700',
  },
  btnEntregar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
  },
  btnEntregarText: {
    color: COLORS.onAccent,
    fontWeight: '700',
    fontSize: 13,
  },

  // Botones modales
  btnCancel: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  btnCancelText: {
    fontWeight: '700',
    color: COLORS.text,
    fontSize: 14,
  },
  btnSave: {
    flex: 1,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSaveText: {
    fontWeight: '700',
    color: COLORS.onAccent,
    fontSize: 14,
  },
});
