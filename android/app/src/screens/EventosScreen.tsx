import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert, ActivityIndicator,
  KeyboardAvoidingView, ScrollView, RefreshControl,
  Animated, StatusBar, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { eventosRef, participantesRef } from '../config/firebase';
import { Evento } from '../types';
import { COLORS, SHADOW, RADIUS, SPACING, TYPO } from '../theme';
import firestore from '@react-native-firebase/firestore';

type Nav = NativeStackNavigationProp<RootStackParamList, 'MainTabs'>;

interface EventoConConteo extends Evento {
  totalParticipantes: number;
}

const EMPTY_FORM = {
  nombre: '', descripcion: '', fecha: '',
  costo: '', limiteParticipantes: '', categoria: '', ubicacion: '',
};

const CATEGORIAS = ['Reunión', 'Viaje', 'Cena', 'Taller', 'Cumpleaños', 'Otro'];

// ─── Chip de estadística ───────────────────────────────────────────────────
function StatChip({ icon, value, label, color }: {
  icon: string; value: string | number; label: string; color: string;
}) {
  return (
    <View style={[chipStyles.wrap, { backgroundColor: color + '18' }]}>
      <Icon name={icon} size={14} color={color} />
      <Text style={[chipStyles.value, { color }]}>{value}</Text>
      <Text style={chipStyles.label}>{label}</Text>
    </View>
  );
}
const chipStyles = StyleSheet.create({
  wrap:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.full },
  value: { fontSize: 13, fontWeight: '800' },
  label: { fontSize: 12, color: COLORS.muted, fontWeight: '500' },
});

// ─── Componente principal ──────────────────────────────────────────────────
export default function EventosScreen() {
  const navigation   = useNavigation<Nav>();
  const [eventos, setEventos]         = useState<EventoConConteo[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [saving, setSaving]           = useState(false);
  const [step, setStep]               = useState<1 | 2>(1);  // modal en 2 pasos

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // ─── Suscripción tiempo real ─────────────────────────────────────────────
  useEffect(() => {
    const unsub = eventosRef()
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        async snapshot => {
          if (!snapshot?.docs) {
            setEventos([]); setLoading(false); setRefreshing(false); return;
          }
          const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Evento));
          const conConteo = await Promise.all(
            docs.map(async ev => {
              const snap = await participantesRef().where('eventoId', '==', ev.id).get();
              return { ...ev, totalParticipantes: snap.size };
            })
          );
          setEventos(conConteo);
          setLoading(false);
          setRefreshing(false);

          Animated.parallel([
            Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
          ]).start();
        },
        (error: unknown) => {
          console.warn('Eventos onSnapshot error:', error);
          setEventos([]); setLoading(false); setRefreshing(false);
        }
      );
    return () => unsub();
  }, []);

  // ─── Resumen global ──────────────────────────────────────────────────────
  const totalEventos      = eventos.length;
  const totalParticipantes = eventos.reduce((a, e) => a + e.totalParticipantes, 0);
  const totalRecaudable   = eventos.reduce((a, e) => a + e.costo * e.limiteParticipantes, 0);

  // ─── Crear evento ────────────────────────────────────────────────────────
  const handleCrear = async () => {
    const { nombre, fecha, costo, limiteParticipantes } = form;
    if (!nombre.trim()) return Alert.alert('Error', 'El nombre es obligatorio.');
    if (!fecha.trim())  return Alert.alert('Error', 'La fecha es obligatoria.');
    if (!costo.trim() || isNaN(Number(costo)) || Number(costo) <= 0)
      return Alert.alert('Error', 'Ingresa un costo válido.');
    if (!limiteParticipantes.trim() || isNaN(Number(limiteParticipantes)) || Number(limiteParticipantes) <= 0)
      return Alert.alert('Error', 'Ingresa un límite válido.');

    setSaving(true);
    try {
      await eventosRef().add({
        nombre:              nombre.trim(),
        descripcion:         form.descripcion.trim(),
        fecha:               fecha.trim(),
        costo:               Number(costo),
        limiteParticipantes: Number(limiteParticipantes),
        categoria:           form.categoria.trim() || 'General',
        ubicacion:           form.ubicacion.trim(),
        estado:              'Planeado',
        createdAt:           firestore.FieldValue.serverTimestamp(),
      });
      setForm(EMPTY_FORM);
      setStep(1);
      setModalVisible(false);
    } catch {
      Alert.alert('Error', 'No se pudo crear el evento.');
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = (evento: EventoConConteo) => {
    Alert.alert(
      'Eliminar evento',
      `¿Eliminar "${evento.nombre}"?\n\nSe eliminarán todos sus participantes y pagos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: async () => {
            try {
              const batch = firestore().batch();
              const parts = await participantesRef().where('eventoId', '==', evento.id).get();
              parts.docs.forEach(d => batch.delete(d.ref));
              const { pagosRef } = await import('../config/firebase');
              const pagos = await pagosRef().where('eventoId', '==', evento.id).get();
              pagos.docs.forEach(d => batch.delete(d.ref));
              batch.delete(eventosRef().doc(evento.id));
              await batch.commit();
            } catch {
              Alert.alert('Error', 'No se pudo eliminar.');
            }
          },
        },
      ]
    );
  };

  // ─── Card de evento ──────────────────────────────────────────────────────
  const renderEvento = ({ item, index }: { item: EventoConConteo; index: number }) => {
    const lleno      = item.totalParticipantes >= item.limiteParticipantes;
    const pct        = item.limiteParticipantes > 0
      ? (item.totalParticipantes / item.limiteParticipantes) * 100 : 0;
    const metaTotal  = item.costo * item.limiteParticipantes;

    // Color del acento por categoría
    const catColors: Record<string, string> = {
      'Viaje': '#7C3AED', 'Cena': '#EA580C', 'Taller': '#0891B2',
      'Cumpleaños': '#DB2777', 'Reunión': COLORS.accent, 'Otro': COLORS.muted,
    };
    const acent = catColors[item.categoria ?? ''] ?? COLORS.accent;

    return (
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('EventoDetalle', { eventoId: item.id, eventoNombre: item.nombre })}
          onLongPress={() => handleEliminar(item)}
          activeOpacity={0.92}
        >
          {/* Franja de color lateral */}
          <View style={[styles.cardStripe, { backgroundColor: acent }]} />

          <View style={styles.cardContent}>
            {/* Fila superior */}
            <View style={styles.cardTop}>
              <View style={styles.cardTopLeft}>
                {/* Ícono de categoría */}
                <View style={[styles.catIcon, { backgroundColor: acent + '18' }]}>
                  <Icon
                    name={getCatIcon(item.categoria)}
                    size={20}
                    color={acent}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardNombre} numberOfLines={1}>{item.nombre}</Text>
                  <View style={styles.cardMeta}>
                    <Icon name="calendar-outline" size={12} color={COLORS.muted} />
                    <Text style={styles.cardMetaText}>{item.fecha}</Text>
                    {item.ubicacion ? (
                      <>
                        <Text style={styles.cardMetaDot}>·</Text>
                        <Icon name="map-marker-outline" size={12} color={COLORS.muted} />
                        <Text style={styles.cardMetaText} numberOfLines={1}>{item.ubicacion}</Text>
                      </>
                    ) : null}
                  </View>
                </View>
              </View>

              {/* Badge estado */}
              <View style={[styles.estadoBadge, {
                backgroundColor: lleno ? COLORS.dangerSoft : COLORS.successSoft,
              }]}>
                <View style={[styles.estadoDot, {
                  backgroundColor: lleno ? COLORS.danger : COLORS.success,
                }]} />
                <Text style={[styles.estadoText, {
                  color: lleno ? COLORS.danger : COLORS.success,
                }]}>
                  {lleno ? 'Completo' : 'Abierto'}
                </Text>
              </View>
            </View>

            {/* Descripción */}
            {item.descripcion ? (
              <Text style={styles.cardDesc} numberOfLines={2}>{item.descripcion}</Text>
            ) : null}

            {/* Stats chips */}
            <View style={styles.chipsRow}>
              <StatChip icon="currency-usd"        value={`$${item.costo.toLocaleString()}`}   label="por persona" color={acent} />
              <StatChip icon="account-group"        value={`${item.totalParticipantes}/${item.limiteParticipantes}`} label="inscritos" color={COLORS.info} />
              <StatChip icon="cash-multiple"        value={`$${metaTotal.toLocaleString()}`}    label="meta"        color={COLORS.success} />
            </View>

            {/* Barra de progreso */}
            <View style={styles.barraWrap}>
              <View style={styles.barraFondo}>
                <View style={[styles.barraRelleno, {
                  width: `${Math.min(pct, 100)}%` as any,
                  backgroundColor: lleno ? COLORS.danger : acent,
                }]} />
              </View>
              <Text style={styles.barraPct}>{pct.toFixed(0)}%</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // ─── Header de la lista ──────────────────────────────────────────────────
  const ListHeader = () => (
    <View>
      {/* Banner hero */}
      <View style={styles.heroBanner}>
        <View>
          <Text style={styles.heroGreeting}>Gestión de eventos</Text>
          <Text style={styles.heroTitle}>
            {totalEventos === 0 ? 'Sin eventos' : `${totalEventos} evento${totalEventos > 1 ? 's' : ''}`}
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => setRefreshing(true)}>
          <Icon name="refresh" size={20} color={COLORS.accent} />
        </TouchableOpacity>
      </View>

      {/* Tarjetas de resumen */}
      {totalEventos > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.summaryScroll} contentContainerStyle={{ gap: 12, paddingRight: 8 }}>
          <SummaryCard icon="calendar-check" label="Eventos activos" value={totalEventos} color={COLORS.accent} />
          <SummaryCard icon="account-group"  label="Participantes"   value={totalParticipantes} color={COLORS.info} />
          <SummaryCard icon="cash-multiple"  label="Meta total"      value={`$${totalRecaudable.toLocaleString()}`} color={COLORS.success} />
        </ScrollView>
      )}

      <Text style={styles.seccionTitulo}>Todos los eventos</Text>
    </View>
  );

  // ─── Loading ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Cargando eventos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <FlatList
        data={eventos}
        keyExtractor={item => item.id}
        renderItem={renderEvento}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={eventos.length === 0 ? styles.emptyContainer : styles.lista}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => setRefreshing(true)}
            tintColor={COLORS.accent}
            colors={[COLORS.accent]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconBox}>
              <Icon name="calendar-star" size={40} color={COLORS.accent} />
            </View>
            <Text style={styles.emptyTitle}>Sin eventos aún</Text>
            <Text style={styles.emptySubtitle}>
              Crea tu primer evento tocando el botón de abajo
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setModalVisible(true)}>
              <Text style={styles.emptyBtnText}>Crear primer evento</Text>
            </TouchableOpacity>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)} activeOpacity={0.88}>
        <Icon name="plus" size={26} color={COLORS.onAccent} />
        <Text style={styles.fabText}>Nuevo evento</Text>
      </TouchableOpacity>

      {/* ─── Modal crear evento (2 pasos) ─────────────────────────────── */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior="padding">
          <View style={styles.modalContainer}>
            {/* Handle */}
            <View style={styles.modalHandle} />

            {/* Header modal */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Nuevo evento</Text>
                <Text style={styles.modalStep}>Paso {step} de 2</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => { setModalVisible(false); setForm(EMPTY_FORM); setStep(1); }}
              >
                <Icon name="close" size={20} color={COLORS.muted} />
              </TouchableOpacity>
            </View>

            {/* Indicador de pasos */}
            <View style={styles.stepsRow}>
              <View style={[styles.stepDot, styles.stepDotActive]} />
              <View style={[styles.stepLine, step === 2 && styles.stepLineActive]} />
              <View style={[styles.stepDot, step === 2 && styles.stepDotActive]} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 8 }}>
              {step === 1 ? (
                // ── Paso 1: Info básica ──
                <View style={styles.formSection}>
                  <Text style={styles.formSectionTitle}>Información básica</Text>

                  <Text style={styles.label}>Nombre del evento *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: Cena de fin de año"
                    placeholderTextColor={COLORS.muted}
                    value={form.nombre}
                    onChangeText={v => setForm(f => ({ ...f, nombre: v }))}
                    maxLength={60}
                  />

                  <Text style={styles.label}>Descripción</Text>
                  <TextInput
                    style={[styles.input, styles.inputMulti]}
                    placeholder="Describe el evento..."
                    placeholderTextColor={COLORS.muted}
                    value={form.descripcion}
                    onChangeText={v => setForm(f => ({ ...f, descripcion: v }))}
                    multiline numberOfLines={3}
                  />

                  <Text style={styles.label}>Categoría</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {CATEGORIAS.map(cat => (
                        <TouchableOpacity
                          key={cat}
                          style={[styles.catChip, form.categoria === cat && styles.catChipActive]}
                          onPress={() => setForm(f => ({ ...f, categoria: cat }))}
                        >
                          <Text style={[styles.catChipText, form.categoria === cat && styles.catChipTextActive]}>
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>

                  <Text style={styles.label}>Ubicación</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: Salón de eventos, Hotel..."
                    placeholderTextColor={COLORS.muted}
                    value={form.ubicacion}
                    onChangeText={v => setForm(f => ({ ...f, ubicacion: v }))}
                  />
                </View>
              ) : (
                // ── Paso 2: Números ──
                <View style={styles.formSection}>
                  <Text style={styles.formSectionTitle}>Detalles financieros</Text>

                  <Text style={styles.label}>Fecha del evento *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: 25/12/2025"
                    placeholderTextColor={COLORS.muted}
                    value={form.fecha}
                    onChangeText={v => setForm(f => ({ ...f, fecha: v }))}
                  />

                  <Text style={styles.label}>Costo por persona ($) *</Text>
                  <View style={styles.montoWrap}>
                    <Text style={styles.montoSimbolo}>$</Text>
                    <TextInput
                      style={styles.montoInput}
                      placeholder="0"
                      placeholderTextColor={COLORS.muted}
                      value={form.costo}
                      onChangeText={v => setForm(f => ({ ...f, costo: v }))}
                      keyboardType="numeric"
                    />
                  </View>

                  <Text style={styles.label}>Límite de participantes *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: 30"
                    placeholderTextColor={COLORS.muted}
                    value={form.limiteParticipantes}
                    onChangeText={v => setForm(f => ({ ...f, limiteParticipantes: v }))}
                    keyboardType="numeric"
                  />

                  {/* Preview de meta */}
                  {form.costo && form.limiteParticipantes && (
                    <View style={styles.previewCard}>
                      <Icon name="calculator-variant" size={18} color={COLORS.accent} />
                      <Text style={styles.previewText}>
                        Meta total:{' '}
                        <Text style={styles.previewValue}>
                          ${(Number(form.costo) * Number(form.limiteParticipantes)).toLocaleString()}
                        </Text>
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            {/* Botones */}
            <View style={styles.modalBotones}>
              {step === 1 ? (
                <>
                  <TouchableOpacity
                    style={styles.btnSecundario}
                    onPress={() => { setModalVisible(false); setForm(EMPTY_FORM); setStep(1); }}
                  >
                    <Text style={styles.btnSecundarioText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btnPrimario, !form.nombre.trim() && styles.btnDisabled]}
                    onPress={() => {
                      if (!form.nombre.trim()) return Alert.alert('Error', 'El nombre es obligatorio.');
                      setStep(2);
                    }}
                  >
                    <Text style={styles.btnPrimarioText}>Siguiente</Text>
                    <Icon name="arrow-right" size={18} color={COLORS.onAccent} />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity style={styles.btnSecundario} onPress={() => setStep(1)}>
                    <Icon name="arrow-left" size={18} color={COLORS.muted} />
                    <Text style={styles.btnSecundarioText}>Atrás</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnPrimario} onPress={handleCrear} disabled={saving}>
                    {saving
                      ? <ActivityIndicator color={COLORS.onAccent} size="small" />
                      : <>
                          <Icon name="check" size={18} color={COLORS.onAccent} />
                          <Text style={styles.btnPrimarioText}>Crear evento</Text>
                        </>
                    }
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Summary Card ──────────────────────────────────────────────────────────
function SummaryCard({ icon, label, value, color }: {
  icon: string; label: string; value: string | number; color: string;
}) {
  return (
    <View style={[sumStyles.card, { borderTopColor: color }]}>
      <View style={[sumStyles.iconBox, { backgroundColor: color + '18' }]}>
        <Icon name={icon} size={18} color={color} />
      </View>
      <Text style={sumStyles.value}>{value}</Text>
      <Text style={sumStyles.label}>{label}</Text>
    </View>
  );
}
const sumStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 18,
    width: 140, borderTopWidth: 3, ...SHADOW.card,
  },
  iconBox: { width: 36, height: 36, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  value:   { fontSize: 20, fontWeight: '900', color: COLORS.text, marginBottom: 2 },
  label:   { fontSize: 12, color: COLORS.muted, fontWeight: '500' },
});

// ─── Helper: ícono por categoría ───────────────────────────────────────────
function getCatIcon(cat?: string): string {
  const map: Record<string, string> = {
    'Viaje': 'airplane', 'Cena': 'food-fork-drink', 'Taller': 'school-outline',
    'Cumpleaños': 'cake-variant', 'Reunión': 'account-group', 'Otro': 'star-outline',
  };
  return map[cat ?? ''] ?? 'calendar-star';
}

// ─── Estilos ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, gap: 12 },
  loadingText:      { fontSize: 14, color: COLORS.muted },
  lista:            { paddingHorizontal: 16, paddingBottom: 120 },
  emptyContainer:   { flexGrow: 1 },

  // Hero banner
  heroBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 24, paddingBottom: 20,
  },
  heroGreeting: { fontSize: 13, color: COLORS.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  heroTitle:    { fontSize: 28, fontWeight: '900', color: COLORS.text, letterSpacing: -0.5 },
  refreshBtn:   { width: 40, height: 40, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceBlue, justifyContent: 'center', alignItems: 'center', marginTop: 8 },

  // Summary scroll
  summaryScroll: { paddingLeft: 20, marginBottom: 24 },

  seccionTitulo: {
    fontSize: 13, fontWeight: '700', color: COLORS.muted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    paddingHorizontal: 20, marginBottom: 12,
  },

  // ─── Card evento ──────────────────────────────────────────────────────
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    marginBottom: 16, flexDirection: 'row', overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.border, ...SHADOW.card,
  },
  cardStripe:  { width: 5, backgroundColor: COLORS.accent },
  cardContent: { flex: 1, padding: 18 },

  cardTop:     { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 },
  cardTopLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 10 },

  catIcon:   { width: 42, height: 42, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  cardNombre:{ fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  cardMeta:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardMetaText: { fontSize: 12, color: COLORS.muted, maxWidth: 100 },
  cardMetaDot:  { color: COLORS.muted, fontSize: 10 },

  estadoBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full },
  estadoDot:   { width: 6, height: 6, borderRadius: 3 },
  estadoText:  { fontSize: 11, fontWeight: '700' },

  cardDesc:  { fontSize: 13, color: COLORS.muted, marginBottom: 14, lineHeight: 18 },

  chipsRow:  { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 14 },

  barraWrap:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barraFondo: { flex: 1, height: 6, backgroundColor: COLORS.border, borderRadius: RADIUS.full, overflow: 'hidden' },
  barraRelleno:{ height: '100%', borderRadius: RADIUS.full },
  barraPct:   { fontSize: 11, fontWeight: '700', color: COLORS.muted, minWidth: 32, textAlign: 'right' },

  // ─── Empty ───────────────────────────────────────────────────────────
  emptyBox:     { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 14, marginTop: 60 },
  emptyIconBox: { width: 88, height: 88, borderRadius: 44, backgroundColor: COLORS.surfaceBlue, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  emptyTitle:   { fontSize: 22, fontWeight: '800', color: COLORS.text },
  emptySubtitle:{ fontSize: 14, color: COLORS.muted, textAlign: 'center', lineHeight: 20 },
  emptyBtn:     { backgroundColor: COLORS.accent, paddingHorizontal: 28, paddingVertical: 14, borderRadius: RADIUS.full, marginTop: 6, ...SHADOW.card },
  emptyBtnText: { color: COLORS.onAccent, fontWeight: '700', fontSize: 15 },

  // ─── FAB ─────────────────────────────────────────────────────────────
  fab: {
    position: 'absolute', bottom: 24, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 28, paddingVertical: 16,
    borderRadius: RADIUS.full, ...SHADOW.strong,
  },
  fabText: { color: COLORS.onAccent, fontWeight: '800', fontSize: 15 },

  // ─── Modal ────────────────────────────────────────────────────────────
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(13,27,62,0.45)', justifyContent: 'flex-end' },
  modalContainer: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, maxHeight: '92%', borderWidth: 1, borderColor: COLORS.border,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  modalTitle:  { fontSize: 22, fontWeight: '800', color: COLORS.text },
  modalStep:   { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  modalCloseBtn:{ width: 36, height: 36, borderRadius: RADIUS.sm, backgroundColor: COLORS.surfaceSoft, justifyContent: 'center', alignItems: 'center' },

  // Steps indicator
  stepsRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  stepDot:        { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.border },
  stepDotActive:  { backgroundColor: COLORS.accent },
  stepLine:       { flex: 1, height: 2, backgroundColor: COLORS.border, marginHorizontal: 6 },
  stepLineActive: { backgroundColor: COLORS.accent },

  formSection:      { gap: 4 },
  formSectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 12 },

  label: { fontSize: 13, fontWeight: '600', color: COLORS.subtitle, marginTop: 14, marginBottom: 8 },
  input: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: COLORS.text, backgroundColor: COLORS.surfaceSoft,
  },
  inputMulti: { height: 90, textAlignVertical: 'top' },

  // Chips de categoría
  catChip:       { paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceSoft, borderWidth: 1.5, borderColor: COLORS.border },
  catChipActive: { backgroundColor: COLORS.accentSoft, borderColor: COLORS.accent },
  catChipText:   { fontSize: 13, fontWeight: '600', color: COLORS.muted },
  catChipTextActive: { color: COLORS.accent },

  // Monto grande
  montoWrap:   { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: COLORS.accent, borderRadius: RADIUS.md, paddingHorizontal: 16, backgroundColor: COLORS.surfaceBlue },
  montoSimbolo:{ fontSize: 26, fontWeight: '700', color: COLORS.accent, marginRight: 6 },
  montoInput:  { flex: 1, fontSize: 32, fontWeight: '900', color: COLORS.text, paddingVertical: 12 },

  // Preview meta
  previewCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.surfaceBlue, borderRadius: RADIUS.md, padding: 14, marginTop: 16 },
  previewText: { fontSize: 14, color: COLORS.subtitle, fontWeight: '500' },
  previewValue:{ fontWeight: '900', color: COLORS.accent },

  // Botones modal
  modalBotones:    { flexDirection: 'row', gap: 12, marginTop: 24, paddingBottom: Platform.OS === 'ios' ? 8 : 0 },
  btnSecundario:   { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 15, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border },
  btnSecundarioText:{ fontSize: 15, fontWeight: '600', color: COLORS.muted },
  btnPrimario:     { flex: 2, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 15, borderRadius: RADIUS.md, backgroundColor: COLORS.accent, ...SHADOW.card },
  btnPrimarioText: { fontSize: 15, fontWeight: '700', color: COLORS.onAccent },
  btnDisabled:     { backgroundColor: COLORS.muted },
});