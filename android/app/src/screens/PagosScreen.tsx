import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { pagosRef, participantesRef } from '../config/firebase';
import { Pago } from '../types';
import { COLORS, SHADOW } from '../theme';
import firestore from '@react-native-firebase/firestore';

type Nav  = NativeStackNavigationProp<RootStackParamList, 'Pagos'>;
type Ruta = RouteProp<RootStackParamList, 'Pagos'>;

export default function PagosScreen() {
  const navigation = useNavigation<Nav>();
  const { eventoId, participanteId, participanteNombre, costo } = useRoute<Ruta>().params;

  const [pagos, setPagos]           = useState<Pago[]>([]);
  const [totalPagado, setTotalPagado] = useState(0);
  const [loading, setLoading]       = useState(true);

  // ─── Suscripción en tiempo real ──────────────────────────────────────────
  useEffect(() => {
    const unsub = pagosRef()
      .where('participanteId', '==', participanteId)
      .onSnapshot(
        snapshot => {
          if (!snapshot || !snapshot.docs) {
            setPagos([]);
            setTotalPagado(0);
            setLoading(false);
            return;
          }

          const getTime = (value: unknown): number => {
            if (value && typeof value === 'object' && typeof (value as any).toMillis === 'function') {
              return (value as any).toMillis();
            }
            if (typeof value === 'number') {
              return value;
            }
            return 0;
          };

          const docs = snapshot.docs
            .map(d => ({ id: d.id, ...d.data() } as Pago))
            .sort((a, b) => getTime((b as any).createdAt) - getTime((a as any).createdAt));

          const total = docs.reduce((acc, p) => acc + p.monto, 0);
          setPagos(docs);
          setTotalPagado(total);
          setLoading(false);
        },
        (error: unknown) => {
          console.warn('Pagos onSnapshot error:', error);
          setPagos([]);
          setTotalPagado(0);
          setLoading(false);
        }
      );

    return () => unsub();
  }, [participanteId]);

  // ─── Eliminar pago ───────────────────────────────────────────────────────
  const handleEliminarPago = (pago: Pago) => {
    Alert.alert(
      'Eliminar pago',
      `¿Eliminar el abono de $${pago.monto.toLocaleString()} del ${pago.fecha}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: async () => {
            try {
              const batch = firestore().batch();

              // Eliminar el pago
              batch.delete(pagosRef().doc(pago.id));

              // Actualizar totalPagado del participante
              batch.update(participantesRef().doc(participanteId), {
                totalPagado: firestore.FieldValue.increment(-pago.monto),
              });

              await batch.commit();
            } catch {
              Alert.alert('Error', 'No se pudo eliminar el pago.');
            }
          },
        },
      ]
    );
  };

  // ─── Métricas ────────────────────────────────────────────────────────────
  const saldo      = Math.max(costo - totalPagado, 0);
  const porcentaje = costo > 0 ? Math.min((totalPagado / costo) * 100, 100) : 0;
  const solvente   = saldo === 0 && totalPagado > 0;
  const overpaid   = totalPagado > costo;

  // ─── Render pago ─────────────────────────────────────────────────────────
  const renderPago = ({ item, index }: { item: Pago; index: number }) => (
    <TouchableOpacity
      style={styles.pagoCard}
      onLongPress={() => handleEliminarPago(item)}
      activeOpacity={0.85}
    >
      <View style={styles.pagoIcono}>
        <Icon name="cash-multiple" size={20} color={COLORS.accent} />
      </View>

      <View style={styles.pagoInfo}>
        <View style={styles.pagoRow}>
          <Text style={styles.pagoMonto}>${item.monto.toLocaleString()}</Text>
          <Text style={styles.pagoFecha}>{item.fecha}</Text>
        </View>
        {item.observacion ? (
          <Text style={styles.pagoObs} numberOfLines={2}>{item.observacion}</Text>
        ) : (
          <Text style={styles.pagoObsVacia}>Sin observación</Text>
        )}
      </View>

      <View style={styles.pagoNumero}>
        <Text style={styles.pagoNumeroText}>#{pagos.length - index}</Text>
      </View>
    </TouchableOpacity>
  );

  // ─── Header ──────────────────────────────────────────────────────────────
  const ListHeader = () => (
    <View>
      {/* Tarjeta de estado del participante */}
      <View style={[styles.estadoCard, solvente && styles.estadoCardVerde]}>
        {/* Nombre + estado */}
        <View style={styles.estadoTop}>
          <View style={styles.estadoAvatar}>
            <Text style={styles.estadoAvatarText}>
              {participanteNombre.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.estadoNombreBox}>
            <Text style={styles.estadoNombre}>{participanteNombre}</Text>
            <Text style={[styles.estadoBadge, {
              color: solvente ? COLORS.success : saldo === costo ? COLORS.danger : COLORS.warning,
            }]}>
              {solvente ? '✓ Al día' : saldo === costo ? 'Sin pagos' : 'Pago parcial'}
            </Text>
          </View>
        </View>

        {/* Métricas */}
        <View style={styles.metricasRow}>
          <View style={styles.metrica}>
            <Text style={styles.metricaLabel}>Total a pagar</Text>
            <Text style={styles.metricaValor}>${costo.toLocaleString()}</Text>
          </View>
          <View style={styles.metricaDivider} />
          <View style={styles.metrica}>
            <Text style={styles.metricaLabel}>Pagado</Text>
            <Text style={[styles.metricaValor, { color: COLORS.success }]}>
              ${totalPagado.toLocaleString()}
            </Text>
          </View>
          <View style={styles.metricaDivider} />
          <View style={styles.metrica}>
            <Text style={styles.metricaLabel}>Saldo</Text>
            <Text style={[styles.metricaValor, { color: solvente ? COLORS.success : COLORS.danger }]}> {solvente ? '—' : `$${saldo.toLocaleString()}`} </Text>
          </View>
        </View>

        {/* Barra de progreso */}
        <View style={styles.barraFondo}>
          <View style={[styles.barraRelleno, {
            width: `${porcentaje}%` as any,
            backgroundColor: solvente ? COLORS.success : COLORS.accent,
          }]} />
        </View>
        <Text style={styles.porcentajeText}>{porcentaje.toFixed(1)}% pagado</Text>

        {overpaid && (
          <View style={styles.alertaBox}>
            <Text style={styles.alertaText}>
              ⚠️ Pagó ${(totalPagado - costo).toLocaleString()} de más
            </Text>
          </View>
        )}
      </View>

      {/* Botón agregar pago */}
      {!solvente && (
        <TouchableOpacity
          style={styles.btnAgregar}
          onPress={() =>
            navigation.navigate('AgregarPago', {
              eventoId,
              participanteId,
              participanteNombre,
              costo,
            })
          }
        >
          <Text style={styles.btnAgregarText}>+ Registrar abono</Text>
        </TouchableOpacity>
      )}

      {solvente && (
        <View style={styles.solventeBox}>
          <Text style={styles.solventeText}>🎉 ¡Este participante está al día!</Text>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('AgregarPago', {
                eventoId,
                participanteId,
                participanteNombre,
                costo,
              })
            }
          >
            <Text style={styles.agregarDeTodasFormas}>Registrar pago adicional</Text>
          </TouchableOpacity>
        </View>
      )}

      {pagos.length > 0 && (
        <Text style={styles.seccionTitulo}>
          Historial de abonos ({pagos.length})
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
        data={pagos}
        keyExtractor={item => item.id}
        renderItem={renderPago}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Icon name="credit-card-clock-outline" size={48} color={COLORS.accent} />
            <Text style={styles.emptyTitulo}>Sin abonos registrados</Text>
            <Text style={styles.emptySubtitulo}>
              Toca "Registrar abono" para agregar el primer pago
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  lista:     { padding: 16, paddingBottom: 40 },

  // Estado card
  estadoCard: {
    backgroundColor: COLORS.surface, borderRadius: 22, padding: 22,
    marginBottom: 16, borderWidth: 1, borderColor: COLORS.border,
    ...SHADOW.card,
  },
  estadoCardVerde: { borderColor: COLORS.success },

  estadoTop:       { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  estadoAvatar:    {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: COLORS.surfaceSoft, justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  estadoAvatarText: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  estadoNombreBox:  { flex: 1 },
  estadoNombre:     { fontSize: 18, fontWeight: '800', color: COLORS.text },
  estadoBadge:      { fontSize: 13, fontWeight: '600', marginTop: 2 },

  metricasRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  metrica:       { flex: 1, alignItems: 'center' },
  metricaLabel:  { fontSize: 11, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  metricaValor:  { fontSize: 18, fontWeight: '800', color: COLORS.text, marginTop: 4 },
  metricaDivider:{ width: 1, backgroundColor: COLORS.surfaceSoft },

  barraFondo:   { height: 8, backgroundColor: COLORS.surfaceSoft, borderRadius: 6, overflow: 'hidden', marginBottom: 6 },
  barraRelleno: { height: '100%', borderRadius: 6 },
  porcentajeText:{ fontSize: 12, color: COLORS.muted, textAlign: 'right' },

  alertaBox:  { backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, marginTop: 12, borderWidth: 1, borderColor: COLORS.border },
  alertaText: { fontSize: 13, color: COLORS.warning, fontWeight: '600' },

  // Botón agregar
  btnAgregar: {
    backgroundColor: COLORS.accent, paddingVertical: 14, borderRadius: 14,
    alignItems: 'center', marginBottom: 20, ...SHADOW.card,
  },
  btnAgregarText: { color: COLORS.onAccent, fontWeight: '700', fontSize: 15 },

  solventeBox: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 18,
    alignItems: 'center', marginBottom: 20, gap: 8, borderWidth: 1, borderColor: COLORS.border,
  },
  solventeText:          { fontSize: 15, color: COLORS.text, fontWeight: '600' },
  agregarDeTodasFormas:  { fontSize: 13, color: COLORS.accent, textDecorationLine: 'underline' },

  seccionTitulo: {
    fontSize: 13, fontWeight: '700', color: COLORS.muted,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12,
  },

  // Pago card
  pagoCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 16,
    marginBottom: 12, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
    ...SHADOW.card,
  },
  pagoIcono:      { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surfaceSoft, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  pagoInfo:       { flex: 1 },
  pagoRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  pagoMonto:      { fontSize: 17, fontWeight: '800', color: COLORS.text },
  pagoFecha:      { fontSize: 12, color: COLORS.muted },
  pagoObs:        { fontSize: 13, color: COLORS.muted },
  pagoObsVacia:   { fontSize: 12, color: COLORS.muted, fontStyle: 'italic' },
  pagoNumero:     { marginLeft: 8 },
  pagoNumeroText: { fontSize: 11, color: COLORS.muted, fontWeight: '600' },

  // Empty
  emptyBox:      { alignItems: 'center', paddingTop: 20, gap: 8 },
  emptyIcon:     { fontSize: 40 },
  emptyTitulo:   { fontSize: 17, fontWeight: '700', color: COLORS.text },
  emptySubtitulo:{ fontSize: 13, color: COLORS.muted, textAlign: 'center' },
});