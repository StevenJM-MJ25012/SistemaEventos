import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { eventosRef, participantesRef } from '../config/firebase';
import { Evento, Participante } from '../types';
import { COLORS, SHADOW } from '../theme';

type Nav  = NativeStackNavigationProp<RootStackParamList, 'EventoDetalle'>;
type Ruta = RouteProp<RootStackParamList, 'EventoDetalle'>;

interface ParticipanteConSaldo extends Participante {
  saldo: number;
  porcentaje: number;
}

export default function EventoDetalleScreen() {
  const navigation = useNavigation<Nav>();
  const { eventoId, eventoNombre } = useRoute<Ruta>().params;

  const [evento, setEvento]               = useState<Evento | null>(null);
  const [participantes, setParticipantes] = useState<ParticipanteConSaldo[]>([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);

  useEffect(() => {
    const unsubEvento = eventosRef()
      .doc(eventoId)
      .onSnapshot(
        snap => {
          if (snap && snap.exists()) setEvento({ id: snap.id, ...snap.data() } as Evento);
        },
        (error: unknown) => console.warn('EventoDetalle evento onSnapshot error:', error)
      );

    const unsubParts = participantesRef()
      .where('eventoId', '==', eventoId)
      .orderBy('nombre', 'asc')
      .onSnapshot(
        async snapshot => {
          if (!snapshot || !snapshot.docs) {
            setParticipantes([]);
            setLoading(false);
            setRefreshing(false);
            return;
          }

          const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Participante));

          const eventoSnap = await eventosRef().doc(eventoId).get();
          const costo = eventoSnap.exists() ? (eventoSnap.data()?.costo ?? 0) : 0;

          const conSaldo: ParticipanteConSaldo[] = docs.map(p => ({
            ...p,
            saldo:      Math.max(costo - p.totalPagado, 0),
            porcentaje: costo > 0 ? Math.min((p.totalPagado / costo) * 100, 100) : 0,
          }));

          setParticipantes(conSaldo);
          setLoading(false);
          setRefreshing(false);
        },
        (error: unknown) => {
          console.warn('EventoDetalle onSnapshot error:', error);
          setParticipantes([]);
          setLoading(false);
          setRefreshing(false);
        }
      );

    return () => { unsubEvento(); unsubParts(); };
  }, [eventoId]);

  // ─── Métricas ──────────────────────────────────────────────────────────────
  const calcularMetricas = () => {
    if (!evento) return { recaudado: 0, pendiente: 0, meta: 0, porcentaje: 0, totalSolventes: 0 };
    const meta           = evento.costo * evento.limiteParticipantes;
    const recaudado      = participantes.reduce((acc, p) => acc + p.totalPagado, 0);
    const pendiente      = Math.max(meta - recaudado, 0);
    const porcentaje     = meta > 0 ? Math.min((recaudado / meta) * 100, 100) : 0;
    const totalSolventes = participantes.filter(p => p.saldo === 0 && p.totalPagado > 0).length;
    return { recaudado, pendiente, meta, porcentaje, totalSolventes };
  };

  const { recaudado, pendiente, meta, porcentaje, totalSolventes } = calcularMetricas();

  // ─── Render participante ───────────────────────────────────────────────────
  const renderParticipante = ({ item }: { item: ParticipanteConSaldo }) => {
    const solvente    = item.saldo === 0 && item.totalPagado > 0;
    const sinPagar    = item.totalPagado === 0;
    const estadoColor = solvente ? COLORS.success : sinPagar ? COLORS.danger : COLORS.warning;
    const estadoTexto = solvente ? 'Al día ✓' : sinPagar ? 'Sin pagos' : `Debe $${item.saldo.toLocaleString()}`;

    const estadoBg = solvente ? COLORS.successSoft : sinPagar ? COLORS.dangerSoft : COLORS.warningSoft;

    return (
      <TouchableOpacity
        style={styles.partCard}
        onPress={() =>
          navigation.navigate('Pagos', {
            eventoId,
            participanteId:     item.id,
            participanteNombre: item.nombre,
            costo:              evento?.costo ?? 0,
          })
        }
        activeOpacity={0.82}
      >
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: estadoColor + '22' }]}>
          <Text style={[styles.avatarText, { color: estadoColor }]}>
            {item.nombre.charAt(0).toUpperCase()}
          </Text>
        </View>

        {/* Info */}
        <View style={styles.partInfo}>
          {/* Nombre + tag asistió */}
          <View style={styles.partNameRow}>
            <Text style={styles.partNombre} numberOfLines={1}>{item.nombre}</Text>
            {item.asistio && <Text style={styles.asistioTag}>Asistió</Text>}
          </View>

          {/* Barra progreso + % */}
          <View style={styles.barraRow}>
            <View style={styles.miniBarraFondo}>
              <View style={[styles.miniBarraRelleno, {
                width: `${item.porcentaje}%` as any,
                backgroundColor: estadoColor,
              }]} />
            </View>
            <Text style={[styles.porcentajeLabel, { color: estadoColor }]}>
              {Math.round(item.porcentaje)}%
            </Text>
          </View>

          {/* Pagado + badge estado */}
          <View style={styles.partMeta}>
            <Text style={styles.pagadoText}>
              Pagado: <Text style={styles.pagadoValor}>${item.totalPagado.toLocaleString()}</Text>
            </Text>
            <View style={[styles.estadoPill, { backgroundColor: estadoBg }]}>
              <Text style={[styles.estadoPillText, { color: estadoColor }]}>{estadoTexto}</Text>
            </View>
          </View>
        </View>

        {/* Flecha */}
        <View style={styles.arrowBox}>
          <Icon name="chevron-right" size={18} color={COLORS.muted} />
        </View>
      </TouchableOpacity>
    );
  };

  // ─── Header ────────────────────────────────────────────────────────────────
  const ListHeader = () => (
    <View>
      {/* ── Hero azul ── */}
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Meta total del evento</Text>
        <Text style={styles.heroMeta}>${meta.toLocaleString()}</Text>
        <Text style={styles.heroSub}>
          {evento?.fecha ?? '–'} · {evento?.ubicacion ?? ''}
        </Text>

        {/* Grid 2x2 métricas */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricBox}>
            <Text style={styles.metricBoxLabel}>Recaudado</Text>
            <Text style={[styles.metricBoxVal, { color: '#4ade80' }]}>
              ${recaudado.toLocaleString()}
            </Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricBoxLabel}>Pendiente</Text>
            <Text style={[styles.metricBoxVal, { color: '#f87171' }]}>
              ${pendiente.toLocaleString()}
            </Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricBoxLabel}>Participantes</Text>
            <Text style={styles.metricBoxVal}>
              {participantes.length} / {evento?.limiteParticipantes ?? '–'}
            </Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricBoxLabel}>Al día</Text>
            <Text style={styles.metricBoxVal}>{totalSolventes}</Text>
          </View>
        </View>

        {/* Barra progreso */}
        <View style={styles.heroBarraFondo}>
          <View style={[styles.heroBarraRelleno, { width: `${porcentaje}%` as any }]} />
        </View>
        <Text style={styles.heroBarraLabel}>{porcentaje.toFixed(1)}% recaudado</Text>
      </View>

      {/* ── Chips info ── */}
      <View style={styles.chipsRow}>
        <View style={styles.chip}>
          <View style={[styles.chipDot, { backgroundColor: COLORS.success }]} />
          <Text style={styles.chipText}>Abierto</Text>
        </View>
        <View style={styles.chip}>
          <Icon name="calendar-outline" size={12} color={COLORS.muted} />
          <Text style={styles.chipText}>${evento?.costo ?? '–'} por persona</Text>
        </View>
        {evento?.categoria ? (
          <View style={styles.chip}>
            <Icon name="account-group-outline" size={12} color={COLORS.muted} />
            <Text style={styles.chipText}>{evento.categoria}</Text>
          </View>
        ) : null}
      </View>

      {/* ── Botón gestionar ── */}
      <TouchableOpacity
        style={styles.btnGestionar}
        onPress={() =>
          navigation.navigate('Participantes', {
            eventoId,
            eventoNombre,
            costo: evento?.costo ?? 0,
          })
        }
      >
        <Icon name="plus" size={16} color={COLORS.onAccent} />
        <Text style={styles.btnGestionarText}>Gestionar participantes</Text>
      </TouchableOpacity>

      {/* ── Título sección ── */}
      {participantes.length > 0 && (
        <Text style={styles.seccionTitulo}>
          Participantes ({participantes.length})
        </Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={participantes}
        keyExtractor={item => item.id}
        renderItem={renderParticipante}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.lista}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(true)} />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Icon name="account-group-outline" size={48} color={COLORS.muted} />
            <Text style={styles.emptyTitulo}>Sin participantes aún</Text>
            <Text style={styles.emptySubtitulo}>
              Toca "Gestionar participantes" para agregar personas
            </Text>
          </View>
        }
      />
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  lista:     { padding: 16, paddingBottom: 40 },

  // ── Hero ──
  hero: {
    backgroundColor: COLORS.accent,
    borderRadius: 28,
    padding: 24,
    marginBottom: 16,
    overflow: 'hidden',
  },
  heroLabel: {
    fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6,
  },
  heroMeta: {
    fontSize: 38, fontWeight: '800', color: '#fff',
    letterSpacing: -1, marginBottom: 4,
  },
  heroSub: {
    fontSize: 13, color: 'rgba(255,255,255,0.65)', marginBottom: 20,
  },

  // Grid 2x2
  metricsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20,
  },
  metricBox: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16, padding: 14,
  },
  metricBoxLabel: {
    fontSize: 10, color: 'rgba(255,255,255,0.6)',
    fontWeight: '600', textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 4,
  },
  metricBoxVal: {
    fontSize: 20, fontWeight: '800', color: '#fff',
  },

  // Barra hero
  heroBarraFondo: {
    height: 6, backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6, overflow: 'hidden', marginBottom: 6,
  },
  heroBarraRelleno: {
    height: '100%', backgroundColor: '#fff', borderRadius: 6,
  },
  heroBarraLabel: {
    fontSize: 11, color: 'rgba(255,255,255,0.6)', textAlign: 'right',
  },

  // ── Chips ──
  chipsRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16,
  },
  chip: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  chipDot:  { width: 8, height: 8, borderRadius: 4 },
  chipText: { fontSize: 12, fontWeight: '600', color: COLORS.text },

  // ── Botón gestionar ──
  btnGestionar: {
    backgroundColor: COLORS.text,
    borderRadius: 18, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10, marginBottom: 20,
    ...SHADOW.card,
  },
  btnGestionarText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  seccionTitulo: {
    fontSize: 11, fontWeight: '700', color: COLORS.muted,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12,
  },

  // ── Participant card ──
  partCard: {
    backgroundColor: COLORS.surface, borderRadius: 20,
    padding: 16, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
    ...SHADOW.card,
  },
  avatar:     { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: '800' },

  partInfo:    { flex: 1 },
  partNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  partNombre:  { fontSize: 15, fontWeight: '700', color: COLORS.text, flex: 1 },
  asistioTag:  {
    fontSize: 10, fontWeight: '700', color: COLORS.accent,
    backgroundColor: COLORS.accentSoft, paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 10,
  },

  barraRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  miniBarraFondo: { flex: 1, height: 4, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden' },
  miniBarraRelleno:{ height: '100%', borderRadius: 4 },
  porcentajeLabel:{ fontSize: 11, fontWeight: '700', minWidth: 36, textAlign: 'right' },

  partMeta:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pagadoText:   { fontSize: 12, color: COLORS.muted },
  pagadoValor:  { fontWeight: '700', color: COLORS.text },
  estadoPill:   { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  estadoPillText:{ fontSize: 10, fontWeight: '700' },

  arrowBox: {
    width: 30, height: 30, backgroundColor: COLORS.background,
    borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginLeft: 8,
  },

  // ── Empty ──
  emptyBox:      { alignItems: 'center', paddingTop: 20, gap: 8 },
  emptyTitulo:   { fontSize: 17, fontWeight: '700', color: COLORS.text },
  emptySubtitulo:{ fontSize: 13, color: COLORS.muted, textAlign: 'center' },
});