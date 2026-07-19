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
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { COLORS, SHADOW, RADIUS, SPACING, TYPO } from '../theme';
import { CustomHeader } from '../navigation/AppNavigator';
import {
  obtenerTiemposComida,
  obtenerPlatosPorTipo,
  obtenerBebidasPorTipo,
  agregarTiempoComida,
  agregarPlatoMenu,
  agregarBebidaMenu,
  obtenerAsignacionesEvento,
  generarResumenPlatos,
  generarResumenBebidas,
} from '../services/comidaService';
import { obtenerComidaEvento } from '../services/comidaService';
import { TipoTiempoComida, PlatoMenu, BebidaMenu, TiempoComidaEvento, ResumenPlatos, ResumenBebidas } from '../types';
import { participantesRef } from '../config/firebase';

type Nav = NativeStackNavigationProp<RootStackParamList, 'EventoDetalle'>;
type Ruta = RouteProp<RootStackParamList, 'EventoDetalle'>;

const TIPOS_COMIDA: TipoTiempoComida[] = ['Desayuno', 'Almuerzo', 'Merienda', 'Cena'];

export default function ComidaEventoScreen() {
  const navigation = useNavigation<Nav>();
  const { eventoId, eventoNombre } = useRoute<Ruta>().params;

  const [tiemposComida, setTiemposComida] = useState<TiempoComidaEvento[]>([]);
  const [platosResumen, setPlatosResumen] = useState<ResumenPlatos[]>([]);
  const [bebidasResumen, setBebidasResumen] = useState<ResumenBebidas[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'tiempos' | 'platos' | 'bebidas' | 'resumen'>('tiempos');

  // Modales
  const [modalTiempoVisible, setModalTiempoVisible] = useState(false);
  const [modalPlatoVisible, setModalPlatoVisible] = useState(false);
  const [modalBebidaVisible, setModalBebidaVisible] = useState(false);
  const [tiempoSeleccionado, setTiempoSeleccionado] = useState<TipoTiempoComida | null>(null);

  // Form tiempos
  const [formTiempo, setFormTiempo] = useState({ tipo: '', hora: '', descripcion: '' });
  const [savingTiempo, setSavingTiempo] = useState(false);

  // Form platos
  const [formPlato, setFormPlato] = useState({ nombre: '', tipo: '', descripcion: '' });
  const [savingPlato, setSavingPlato] = useState(false);

  // Form bebidas
  const [formBebida, setFormBebida] = useState({ nombre: '', tipo: '', descripcion: '' });
  const [savingBebida, setSavingBebida] = useState(false);

  // ─── Cargar datos ──────────────────────────────────────────────────────
  const cargarDatos = useCallback(async () => {
    try {
      setRefreshing(true);
      const tiempos = await obtenerTiemposComida(eventoId);
      setTiemposComida(tiempos);

      const resumenPlatos = await generarResumenPlatos(eventoId);
      setPlatosResumen(resumenPlatos);

      const resumenBebidas = await generarResumenBebidas(eventoId);
      setBebidasResumen(resumenBebidas);
    } catch (error) {
      console.warn('Error cargando comida:', error);
      Alert.alert('Error', 'No se pudo cargar los datos de comida');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [eventoId]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // ─── Agregar tiempo de comida ──────────────────────────────────────────
  const handleAgregarTiempo = async () => {
    if (!formTiempo.tipo) {
      Alert.alert('Error', 'Selecciona un tipo de comida');
      return;
    }

    try {
      setSavingTiempo(true);
      await agregarTiempoComida(
        eventoId,
        formTiempo.tipo as TipoTiempoComida,
        formTiempo.hora || undefined,
        formTiempo.descripcion || undefined
      );

      Alert.alert('Éxito', 'Tiempo de comida agregado');
      setFormTiempo({ tipo: '', hora: '', descripcion: '' });
      setModalTiempoVisible(false);
      await cargarDatos();
    } catch (error) {
      Alert.alert('Error', 'No se pudo agregar el tiempo de comida');
    } finally {
      setSavingTiempo(false);
    }
  };

  // ─── Agregar plato ─────────────────────────────────────────────────────
  const handleAgregarPlato = async () => {
    if (!formPlato.nombre || !formPlato.tipo) {
      Alert.alert('Error', 'Completa los campos requeridos');
      return;
    }

    try {
      setSavingPlato(true);
      await agregarPlatoMenu(
        eventoId,
        formPlato.nombre,
        formPlato.tipo as TipoTiempoComida,
        formPlato.descripcion || undefined
      );

      Alert.alert('Éxito', 'Plato agregado al menú');
      setFormPlato({ nombre: '', tipo: '', descripcion: '' });
      setModalPlatoVisible(false);
      await cargarDatos();
    } catch (error) {
      Alert.alert('Error', 'No se pudo agregar el plato');
    } finally {
      setSavingPlato(false);
    }
  };

  // ─── Agregar bebida ────────────────────────────────────────────────────
  const handleAgregarBebida = async () => {
    if (!formBebida.nombre || !formBebida.tipo) {
      Alert.alert('Error', 'Completa los campos requeridos');
      return;
    }

    try {
      setSavingBebida(true);
      await agregarBebidaMenu(
        eventoId,
        formBebida.nombre,
        formBebida.tipo as TipoTiempoComida,
        formBebida.descripcion || undefined
      );

      Alert.alert('Éxito', 'Bebida agregada al menú');
      setFormBebida({ nombre: '', tipo: '', descripcion: '' });
      setModalBebidaVisible(false);
      await cargarDatos();
    } catch (error) {
      Alert.alert('Error', 'No se pudo agregar la bebida');
    } finally {
      setSavingBebida(false);
    }
  };

  // ─── Render tiempos de comida ──────────────────────────────────────────
  const renderTiempos = () => (
    <View style={styles.tabContent}>
      <TouchableOpacity
        style={styles.btnAgregar}
        onPress={() => setModalTiempoVisible(true)}
      >
        <Icon name="plus-circle" size={20} color={COLORS.onAccent} />
        <Text style={styles.btnAgregarText}>Agregar Tiempo de Comida</Text>
      </TouchableOpacity>

      {tiemposComida.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="calendar-alert" size={48} color={COLORS.muted} />
          <Text style={styles.emptyText}>No hay tiempos de comida configurados</Text>
        </View>
      ) : (
        <FlatList
          data={tiemposComida}
          keyExtractor={item => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Icon name="clock" size={20} color={COLORS.accent} />
                <Text style={styles.cardTitle}>{item.tipo}</Text>
              </View>
              {item.hora && <Text style={styles.cardSubtitle}>Hora: {item.hora}</Text>}
              {item.descripcion && <Text style={styles.cardDescription}>{item.descripcion}</Text>}
            </View>
          )}
        />
      )}
    </View>
  );

  // ─── Render platos ─────────────────────────────────────────────────────
  const renderPlatos = () => (
    <View style={styles.tabContent}>
      <TouchableOpacity
        style={styles.btnAgregar}
        onPress={() => setModalPlatoVisible(true)}
      >
        <Icon name="plus-circle" size={20} color={COLORS.onAccent} />
        <Text style={styles.btnAgregarText}>Agregar Plato</Text>
      </TouchableOpacity>

      {platosResumen.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="food" size={48} color={COLORS.muted} />
          <Text style={styles.emptyText}>No hay platos configurados</Text>
        </View>
      ) : (
        <FlatList
          data={platosResumen}
          keyExtractor={item => `${item.platoNombre}-${item.tipo}`}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Icon name="silverware-fork-knife" size={20} color={COLORS.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.platoNombre}</Text>
                  <Text style={styles.cardSubtitle}>{item.tipo}</Text>
                </View>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Total</Text>
                  <Text style={styles.statValue}>{item.cantidad}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Entregados</Text>
                  <Text style={[styles.statValue, { color: COLORS.success }]}>{item.entregados}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Pendientes</Text>
                  <Text style={[styles.statValue, { color: COLORS.warning }]}>{item.pendientes}</Text>
                </View>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );

  // ─── Render bebidas ────────────────────────────────────────────────────
  const renderBebidas = () => (
    <View style={styles.tabContent}>
      <TouchableOpacity
        style={styles.btnAgregar}
        onPress={() => setModalBebidaVisible(true)}
      >
        <Icon name="plus-circle" size={20} color={COLORS.onAccent} />
        <Text style={styles.btnAgregarText}>Agregar Bebida</Text>
      </TouchableOpacity>

      {bebidasResumen.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="cup" size={48} color={COLORS.muted} />
          <Text style={styles.emptyText}>No hay bebidas configuradas</Text>
        </View>
      ) : (
        <FlatList
          data={bebidasResumen}
          keyExtractor={item => `${item.bebidaNombre}-${item.tipo}`}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Icon name="glass-mug" size={20} color={COLORS.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.bebidaNombre}</Text>
                  <Text style={styles.cardSubtitle}>{item.tipo}</Text>
                </View>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Total</Text>
                  <Text style={styles.statValue}>{item.cantidad}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Entregadas</Text>
                  <Text style={[styles.statValue, { color: COLORS.success }]}>{item.entregadas}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Pendientes</Text>
                  <Text style={[styles.statValue, { color: COLORS.warning }]}>{item.pendientes}</Text>
                </View>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );

  // ─── Render resumen ────────────────────────────────────────────────────
  const renderResumen = () => (
    <View style={styles.tabContent}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📦 Resumen de Platos</Text>
          {platosResumen.map((plato, idx) => (
            <View key={idx} style={styles.resumenItem}>
              <Text style={styles.resumenItemName}>{plato.platoNombre}</Text>
              <Text style={styles.resumenItemType}>{plato.tipo}</Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${plato.cantidad > 0 ? (plato.entregados / plato.cantidad) * 100 : 0}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.resumenItemStats}>
                {plato.entregados}/{plato.cantidad} entregados • {plato.pendientes} pendientes
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🥤 Resumen de Bebidas</Text>
          {bebidasResumen.map((bebida, idx) => (
            <View key={idx} style={styles.resumenItem}>
              <Text style={styles.resumenItemName}>{bebida.bebidaNombre}</Text>
              <Text style={styles.resumenItemType}>{bebida.tipo}</Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${bebida.cantidad > 0 ? (bebida.entregadas / bebida.cantidad) * 100 : 0}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.resumenItemStats}>
                {bebida.entregadas}/{bebida.cantidad} entregadas • {bebida.pendientes} pendientes
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  // ─── Render modal tiempo ───────────────────────────────────────────────
  const renderModalTiempo = () => (
    <Modal visible={modalTiempoVisible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Agregar Tiempo de Comida</Text>
            <TouchableOpacity onPress={() => setModalTiempoVisible(false)}>
              <Icon name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={styles.label}>Tipo de Comida *</Text>
            <View style={styles.tiposContainer}>
              {TIPOS_COMIDA.map(tipo => (
                <TouchableOpacity
                  key={tipo}
                  style={[
                    styles.tipoBtn,
                    formTiempo.tipo === tipo && styles.tipoBtnActive,
                  ]}
                  onPress={() => setFormTiempo({ ...formTiempo, tipo })}
                >
                  <Text
                    style={[
                      styles.tipoBtnText,
                      formTiempo.tipo === tipo && styles.tipoBtnTextActive,
                    ]}
                  >
                    {tipo}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Hora (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="14:30"
              value={formTiempo.hora}
              onChangeText={text => setFormTiempo({ ...formTiempo, hora: text })}
            />

            <Text style={styles.label}>Descripción (opcional)</Text>
            <TextInput
              style={[styles.input, { minHeight: 80 }]}
              placeholder="Detalles adicionales..."
              multiline
              value={formTiempo.descripcion}
              onChangeText={text => setFormTiempo({ ...formTiempo, descripcion: text })}
            />
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.btnCancel}
              onPress={() => setModalTiempoVisible(false)}
            >
              <Text style={styles.btnCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnSave}
              onPress={handleAgregarTiempo}
              disabled={savingTiempo}
            >
              {savingTiempo ? (
                <ActivityIndicator color={COLORS.onAccent} />
              ) : (
                <Text style={styles.btnSaveText}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // ─── Render modal plato ────────────────────────────────────────────────
  const renderModalPlato = () => (
    <Modal visible={modalPlatoVisible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Agregar Plato</Text>
            <TouchableOpacity onPress={() => setModalPlatoVisible(false)}>
              <Icon name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={styles.label}>Nombre del Plato *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Pollo al horno"
              value={formPlato.nombre}
              onChangeText={text => setFormPlato({ ...formPlato, nombre: text })}
            />

            <Text style={styles.label}>Tipo de Comida *</Text>
            <View style={styles.tiposContainer}>
              {TIPOS_COMIDA.map(tipo => (
                <TouchableOpacity
                  key={tipo}
                  style={[
                    styles.tipoBtn,
                    formPlato.tipo === tipo && styles.tipoBtnActive,
                  ]}
                  onPress={() => setFormPlato({ ...formPlato, tipo })}
                >
                  <Text
                    style={[
                      styles.tipoBtnText,
                      formPlato.tipo === tipo && styles.tipoBtnTextActive,
                    ]}
                  >
                    {tipo}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Descripción (opcional)</Text>
            <TextInput
              style={[styles.input, { minHeight: 80 }]}
              placeholder="Detalles del plato..."
              multiline
              value={formPlato.descripcion}
              onChangeText={text => setFormPlato({ ...formPlato, descripcion: text })}
            />
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.btnCancel}
              onPress={() => setModalPlatoVisible(false)}
            >
              <Text style={styles.btnCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnSave}
              onPress={handleAgregarPlato}
              disabled={savingPlato}
            >
              {savingPlato ? (
                <ActivityIndicator color={COLORS.onAccent} />
              ) : (
                <Text style={styles.btnSaveText}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // ─── Render modal bebida ───────────────────────────────────────────────
  const renderModalBebida = () => (
    <Modal visible={modalBebidaVisible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Agregar Bebida</Text>
            <TouchableOpacity onPress={() => setModalBebidaVisible(false)}>
              <Icon name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={styles.label}>Nombre de la Bebida *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Jugo de naranja"
              value={formBebida.nombre}
              onChangeText={text => setFormBebida({ ...formBebida, nombre: text })}
            />

            <Text style={styles.label}>Tipo de Comida *</Text>
            <View style={styles.tiposContainer}>
              {TIPOS_COMIDA.map(tipo => (
                <TouchableOpacity
                  key={tipo}
                  style={[
                    styles.tipoBtn,
                    formBebida.tipo === tipo && styles.tipoBtnActive,
                  ]}
                  onPress={() => setFormBebida({ ...formBebida, tipo })}
                >
                  <Text
                    style={[
                      styles.tipoBtnText,
                      formBebida.tipo === tipo && styles.tipoBtnTextActive,
                    ]}
                  >
                    {tipo}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Descripción (opcional)</Text>
            <TextInput
              style={[styles.input, { minHeight: 80 }]}
              placeholder="Detalles de la bebida..."
              multiline
              value={formBebida.descripcion}
              onChangeText={text => setFormBebida({ ...formBebida, descripcion: text })}
            />
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.btnCancel}
              onPress={() => setModalBebidaVisible(false)}
            >
              <Text style={styles.btnCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnSave}
              onPress={handleAgregarBebida}
              disabled={savingBebida}
            >
              {savingBebida ? (
                <ActivityIndicator color={COLORS.onAccent} />
              ) : (
                <Text style={styles.btnSaveText}>Guardar</Text>
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
        title="🍽 Comida - " + eventoNombre
        canGoBack
        navigation={navigation}
        onRefresh={cargarDatos}
      />

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {(['tiempos', 'platos', 'bebidas', 'resumen'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'tiempos' && '⏰ Tiempos'}
              {tab === 'platos' && '🍗 Platos'}
              {tab === 'bebidas' && '🥤 Bebidas'}
              {tab === 'resumen' && '📊 Resumen'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <FlatList
        data={[{ key: activeTab }]}
        keyExtractor={item => item.key}
        renderItem={() => {
          if (activeTab === 'tiempos') return renderTiempos();
          if (activeTab === 'platos') return renderPlatos();
          if (activeTab === 'bebidas') return renderBebidas();
          if (activeTab === 'resumen') return renderResumen();
          return null;
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={cargarDatos} />}
        scrollEnabled={false}
      />

      {/* Modales */}
      {renderModalTiempo()}
      {renderModalPlato()}
      {renderModalBebida()}
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
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  cardSubtitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginVertical: SPACING.xs,
  },
  cardDescription: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: SPACING.sm,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '500',
    marginBottom: SPACING.xs,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
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
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  tiposContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  tipoBtn: {
    flex: 0.48,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  tipoBtnActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  tipoBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  tipoBtnTextActive: {
    color: COLORS.onAccent,
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

  // Resumen
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  resumenItem: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  resumenItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  resumenItemType: {
    fontSize: 12,
    color: COLORS.muted,
    marginVertical: SPACING.xs,
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    marginVertical: SPACING.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.success,
  },
  resumenItemStats: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: SPACING.xs,
  },
});
