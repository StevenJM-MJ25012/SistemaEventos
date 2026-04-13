import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert, ActivityIndicator,
  KeyboardAvoidingView, Switch,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { participantesRef, pagosRef } from '../config/firebase';
import { Participante } from '../types';
import { COLORS, SHADOW } from '../theme';
import firestore from '@react-native-firebase/firestore';

type Ruta = RouteProp<RootStackParamList, 'Participantes'>;

interface ParticipanteConSaldo extends Participante {
  saldo: number;
  porcentaje: number;
}

export default function ParticipantesScreen() {
  const { eventoId, eventoNombre, costo } = useRoute<Ruta>().params;

  const [participantes, setParticipantes] = useState<ParticipanteConSaldo[]>([]);
  const [loading, setLoading]             = useState(true);
  const [modalVisible, setModalVisible]   = useState(false);
  const [nombre, setNombre]               = useState('');
  const [saving, setSaving]               = useState(false);
  const [limiteInfo, setLimiteInfo]       = useState({ actual: 0, limite: 0 });

  // ─── Suscripción en tiempo real ────────────────────────────────────────────
  useEffect(() => {
    // Obtener límite del evento
    const { eventosRef } = require('../config/firebase');
    const unsubEvento = eventosRef()
      .doc(eventoId)
      .onSnapshot(
        (snap: any) => {
          if (snap && snap.exists) {
            setLimiteInfo(prev => ({ ...prev, limite: snap.data().limiteParticipantes }));
          }
        },
        (error: unknown) => {
          console.warn('Participantes evento onSnapshot error:', error);
        }
      );

    const unsubParts = participantesRef()
      .where('eventoId', '==', eventoId)
      .orderBy('nombre', 'asc')
      .onSnapshot(
        (snapshot: any) => {
          if (!snapshot || !snapshot.docs) {
            setParticipantes([]);
            setLimiteInfo(prev => ({ ...prev, actual: 0 }));
            setLoading(false);
            return;
          }

          const docs = snapshot.docs.map((d: any) => ({
            id: d.id,
            ...d.data(),
          })) as Participante[];

          const conSaldo: ParticipanteConSaldo[] = docs.map(p => ({
            ...p,
            saldo:      Math.max(costo - p.totalPagado, 0),
            porcentaje: costo > 0 ? Math.min((p.totalPagado / costo) * 100, 100) : 0,
          }));

          setParticipantes(conSaldo);
          setLimiteInfo(prev => ({ ...prev, actual: docs.length }));
          setLoading(false);
        },
        (error: unknown) => {
          console.warn('Participantes onSnapshot error:', error);
          setParticipantes([]);
          setLimiteInfo(prev => ({ ...prev, actual: 0 }));
          setLoading(false);
        }
      );

    return () => {
      unsubEvento();
      unsubParts();
    };
  }, [eventoId, costo]);

  // ─── Agregar participante ──────────────────────────────────────────────────
  const handleAgregar = async () => {
    if (!nombre.trim()) return Alert.alert('Error', 'Ingresa un nombre.');

    // Verificar nombre duplicado
    const duplicado = participantes.some(
      p => p.nombre.toLowerCase() === nombre.trim().toLowerCase()
    );
    if (duplicado) return Alert.alert('Error', 'Ya existe un participante con ese nombre.');

    // Verificar límite
    if (limiteInfo.actual >= limiteInfo.limite) {
      return Alert.alert(
        'Límite alcanzado',
        `Este evento tiene un límite de ${limiteInfo.limite} participantes.`
      );
    }

    setSaving(true);
    try {
      await participantesRef().add({
        eventoId,
        nombre:      nombre.trim(),
        totalPagado: 0,
        asistio:     false,
        createdAt:   firestore.FieldValue.serverTimestamp(),
      });
      setNombre('');
      setModalVisible(false);
    } catch {
      Alert.alert('Error', 'No se pudo agregar el participante.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Toggle asistencia ─────────────────────────────────────────────────────
  const toggleAsistencia = async (participante: ParticipanteConSaldo) => {
    try {
      await participantesRef()
        .doc(participante.id)
        .update({ asistio: !participante.asistio });
    } catch {
      Alert.alert('Error', 'No se pudo actualizar la asistencia.');
    }
  };

  // ─── Eliminar participante ─────────────────────────────────────────────────
  const handleEliminar = (item: ParticipanteConSaldo) => {
    Alert.alert(
      'Eliminar participante',
      `¿Eliminar a "${item.nombre}"? Se eliminarán todos sus pagos registrados.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: async () => {
            try {
              const batch = firestore().batch();

              // Eliminar pagos del participante
              const pagosSnap = await pagosRef()
                .where('participanteId', '==', item.id)
                .get();
              pagosSnap.docs.forEach(d => batch.delete(d.ref));

              // Eliminar participante
              batch.delete(participantesRef().doc(item.id));
              await batch.commit();
            } catch {
              Alert.alert('Error', 'No se pudo eliminar el participante.');
            }
          },
        },
      ]
    );
  };

  // ─── Render item ───────────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: ParticipanteConSaldo }) => {
    const solvente = item.saldo === 0 && item.totalPagado > 0;
    const sinPagar = item.totalPagado === 0;
    const estadoColor = solvente ? COLORS.success : sinPagar ? COLORS.danger : COLORS.warning;

    return (
      <View style={styles.card}>
        {/* Fila principal */}
        <View style={styles.cardTop}>
          {/* Avatar */}
          <View style={[styles.avatar, { backgroundColor: estadoColor + '22' }]}>
            <Text style={[styles.avatarText, { color: estadoColor }]}>
              {item.nombre.charAt(0).toUpperCase()}
            </Text>
          </View>

          {/* Info */}
          <View style={styles.info}>
            <Text style={styles.nombreText} numberOfLines={1}>{item.nombre}</Text>
            <View style={styles.miniBarraFondo}>
              <View style={[styles.miniBarraRelleno, {
                width: `${item.porcentaje}%` as any,
                backgroundColor: estadoColor,
              }]} />
            </View>
            <View style={styles.pagosRow}>
              <Text style={styles.pagadoLabel}>
                ${item.totalPagado.toLocaleString()}
                <Text style={styles.costoTotal}> / ${costo.toLocaleString()}</Text>
              </Text>
              {item.saldo > 0 && (
                <Text style={[styles.saldoText, { color: estadoColor }]}>
                  Debe ${item.saldo.toLocaleString()}
                </Text>
              )}
              {solvente && (
                <Text style={[styles.saldoText, { color: COLORS.success }]}>Al día ✓</Text>
              )}
            </View>
          </View>
        </View>

        {/* Fila de asistencia + eliminar */}
        <View style={styles.cardBottom}>
          <View style={styles.asistenciaRow}>
            <Text style={styles.asistenciaLabel}>
              {item.asistio ? '✅ Asistió' : '⬜ No asistió'}
            </Text>
            <Switch
              value={item.asistio}
              onValueChange={() => toggleAsistencia(item)}
              trackColor={{ false: COLORS.surfaceSoft, true: COLORS.accentSoft }}
              thumbColor={item.asistio ? COLORS.accent : COLORS.muted}
            />
          </View>

          <TouchableOpacity
            style={styles.btnEliminar}
            onPress={() => handleEliminar(item)}
          >
            <Text style={styles.btnEliminarText}>🗑</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  const lleno = limiteInfo.actual >= limiteInfo.limite;

  return (
    <View style={styles.container}>
      {/* Header de cupo */}
      <View style={styles.cupoBar}>
        <Text style={styles.cupoText}>
          👥 {limiteInfo.actual} / {limiteInfo.limite} participantes
        </Text>
        {lleno && (
          <View style={styles.llenoBadge}>
            <Text style={styles.llenoText}>LLENO</Text>
          </View>
        )}
      </View>

      <FlatList
        data={participantes}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={
          participantes.length === 0 ? styles.emptyContainer : styles.lista
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Icon name="account-multiple-outline" size={52} color={COLORS.accent} />
            <Text style={styles.emptyTitulo}>Sin participantes</Text>
            <Text style={styles.emptySubtitulo}>
              Toca el botón + para agregar el primero
            </Text>
          </View>
        }
      />

      {/* FAB — deshabilitado si está lleno */}
      <TouchableOpacity
        style={[styles.fab, lleno && styles.fabDisabled]}
        onPress={() => !lleno && setModalVisible(true)}
        activeOpacity={lleno ? 1 : 0.85}
      >
        <Icon name="plus" size={28} color={COLORS.onAccent} />
      </TouchableOpacity>

      {/* Modal agregar */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior="padding">
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitulo}>Agregar participante</Text>
            <Text style={styles.modalSubtitulo}>
              Quedan {limiteInfo.limite - limiteInfo.actual} lugares disponibles
            </Text>

            <Text style={styles.label}>Nombre completo *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Juan Pérez"
              value={nombre}
              onChangeText={setNombre}
              autoFocus
              maxLength={60}
              onSubmitEditing={handleAgregar}
              returnKeyType="done"
            />

            <View style={styles.modalBotones}>
              <TouchableOpacity
                style={styles.btnCancelar}
                onPress={() => { setModalVisible(false); setNombre(''); }}
              >
                <Text style={styles.btnCancelarText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnGuardar}
                onPress={handleAgregar}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color={COLORS.onAccent} />
                  : <Text style={styles.btnGuardarText}>Agregar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: COLORS.background },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center' },
  lista:          { padding: 16, paddingBottom: 100 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },

  // Cupo bar
  cupoBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  cupoText:   { fontSize: 14, fontWeight: '600', color: COLORS.text },
  llenoBadge: { backgroundColor: COLORS.accentSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  llenoText:  { fontSize: 11, fontWeight: '700', color: COLORS.accent },

  // Card
  card: {
    backgroundColor: COLORS.surface, borderRadius: 18, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: COLORS.border,
    ...SHADOW.card,
  },
  cardTop:    { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  cardBottom: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: COLORS.surfaceSoft, paddingTop: 12,
  },

  // Avatar
  avatar:     { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 20, fontWeight: '800' },

  // Info
  info:           { flex: 1 },
  nombreText:     { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  miniBarraFondo: { height: 4, backgroundColor: COLORS.surfaceSoft, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  miniBarraRelleno:{ height: '100%', borderRadius: 4 },
  pagosRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pagadoLabel:    { fontSize: 13, fontWeight: '700', color: COLORS.text },
  costoTotal:     { fontWeight: '400', color: COLORS.muted },
  saldoText:      { fontSize: 12, fontWeight: '600' },

  // Asistencia
  asistenciaRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  asistenciaLabel:{ fontSize: 13, color: COLORS.muted },

  // Eliminar
  btnEliminar:     { padding: 6 },
  btnEliminarText: { fontSize: 18 },

  // FAB
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    backgroundColor: COLORS.accent, width: 62, height: 62,
    borderRadius: 31, justifyContent: 'center', alignItems: 'center',
    ...SHADOW.card,
  },
  fabDisabled: { backgroundColor: COLORS.border, shadowColor: COLORS.border },
  fabIcon:     { fontSize: 30, color: COLORS.onAccent, lineHeight: 34 },

  // Empty
  emptyBox:      { alignItems: 'center', gap: 8 },
  emptyIcon:     { fontSize: 48 },
  emptyTitulo:   { fontSize: 20, fontWeight: '700', color: COLORS.text },
  emptySubtitulo:{ fontSize: 14, color: COLORS.muted, textAlign: 'center' },

  // Modal
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalContainer:  {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, borderWidth: 1, borderColor: COLORS.border,
  },
  modalTitulo:    { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 10 },
  modalSubtitulo: { fontSize: 13, color: COLORS.muted, marginBottom: 20 },
  label:          { fontSize: 13, fontWeight: '600', color: COLORS.muted, marginBottom: 8 },
  input: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14,
    fontSize: 15, color: COLORS.text, backgroundColor: COLORS.surfaceSoft,
    marginBottom: 4,
  },
  modalBotones:    { flexDirection: 'row', gap: 12, marginTop: 20 },
  btnCancelar: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center',
  },
  btnCancelarText: { fontSize: 15, fontWeight: '600', color: COLORS.muted },
  btnGuardar: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: COLORS.accent, alignItems: 'center',
  },
  btnGuardarText:  { fontSize: 15, fontWeight: '700', color: COLORS.onAccent },
});