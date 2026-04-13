import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { pagosRef, participantesRef } from '../config/firebase';
import { COLORS, SHADOW } from '../theme';
import firestore from '@react-native-firebase/firestore';

type Ruta = RouteProp<RootStackParamList, 'AgregarPago'>;

// Fecha de hoy formateada dd/mm/yyyy
const hoy = (): string => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

export default function AgregarPagoScreen() {
  const navigation = useNavigation();
  const { eventoId, participanteId, participanteNombre } = useRoute<Ruta>().params;

  const [monto, setMonto]           = useState('');
  const [fecha, setFecha]           = useState(hoy());
  const [observacion, setObservacion] = useState('');
  const [saving, setSaving]         = useState(false);

  // ─── Guardar pago ────────────────────────────────────────────────────────
  const handleGuardar = async () => {
    const montoNum = Number(monto);

    if (!monto.trim() || isNaN(montoNum) || montoNum <= 0)
      return Alert.alert('Error', 'Ingresa un monto válido mayor a 0.');
    if (!fecha.trim())
      return Alert.alert('Error', 'La fecha es obligatoria.');

    setSaving(true);
    try {
      const batch = firestore().batch();

      // 1. Crear el pago
      const pagoRef = pagosRef().doc();
      batch.set(pagoRef, {
        eventoId,
        participanteId,
        participanteNombre,
        monto:       montoNum,
        fecha:       fecha.trim(),
        observacion: observacion.trim(),
        createdAt:   firestore.FieldValue.serverTimestamp(),
      });

      // 2. Incrementar totalPagado del participante (atómico)
      batch.update(participantesRef().doc(participanteId), {
        totalPagado: firestore.FieldValue.increment(montoNum),
      });

      await batch.commit();

      Alert.alert(
        '✅ Pago registrado',
        `Se registró un abono de $${montoNum.toLocaleString()} para ${participanteNombre}.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch {
      Alert.alert('Error', 'No se pudo registrar el pago.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Tarjeta info participante */}
        <View style={styles.participanteCard}>
          <View style={styles.participanteAvatar}>
            <Text style={styles.participanteAvatarText}>
              {participanteNombre.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.participanteInfoRow}>
            <View style={styles.participanteLabelRow}>
              <Icon name="currency-usd" size={16} color={COLORS.accent} />
              <Text style={styles.participanteLabel}>Registrando abono para</Text>
            </View>
            <Text style={styles.participanteNombre}>{participanteNombre}</Text>
          </View>
        </View>

        {/* Formulario */}
        <View style={styles.form}>

          {/* Monto — campo principal */}
          <Text style={styles.label}>Monto del abono *</Text>
          <View style={styles.montoContainer}>
            <Text style={styles.montoSimbol}>$</Text>
            <TextInput
              style={styles.montoInput}
              placeholder="0"
              value={monto}
              onChangeText={setMonto}
              keyboardType="numeric"
              autoFocus
              placeholderTextColor={COLORS.muted}
            />
          </View>

          {/* Atajos de monto rápido */}
          <View style={styles.atajosRow}>
            {[50, 100, 200, 500].map(v => (
              <TouchableOpacity
                key={v}
                style={styles.atajoBtn}
                onPress={() => setMonto(String(v))}
              >
                <Text style={styles.atajoBtnText}>${v}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Fecha */}
          <Text style={styles.label}>Fecha del pago *</Text>
          <TextInput
            style={styles.input}
            placeholder="dd/mm/yyyy"
            value={fecha}
            onChangeText={setFecha}
          />

          {/* Observación */}
          <Text style={styles.label}>Observación</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            placeholder="Ej: Pagó en efectivo, transferencia #123..."
            value={observacion}
            onChangeText={setObservacion}
            multiline
            numberOfLines={3}
            maxLength={200}
          />
          <Text style={styles.charCount}>{observacion.length}/200</Text>
        </View>

        {/* Botones */}
        <View style={styles.botones}>
          <TouchableOpacity
            style={styles.btnCancelar}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.btnCancelarText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnGuardar}
            onPress={handleGuardar}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color={COLORS.onAccent} />
              : <Text style={styles.btnGuardarText}>Guardar abono</Text>
            }
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll:    { padding: 20, paddingBottom: 40 },

  // Participante card
  participanteCard: {
    backgroundColor: COLORS.surface, borderRadius: 18, padding: 18,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginBottom: 24, borderWidth: 1, borderColor: COLORS.border,
    ...SHADOW.card,
  },
  participanteAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: COLORS.surfaceSoft, justifyContent: 'center', alignItems: 'center',
  },
  participanteAvatarText: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  participanteInfoRow:   { flex: 1 },
  participanteLabelRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  participanteLabel:      { fontSize: 12, color: COLORS.muted },
  participanteNombre:     { fontSize: 17, fontWeight: '800', color: COLORS.text },

  // Form
  form: {
    backgroundColor: COLORS.surface, borderRadius: 18, padding: 22,
    marginBottom: 24, borderWidth: 1, borderColor: COLORS.border,
    ...SHADOW.card,
  },
  label:    { fontSize: 13, fontWeight: '600', color: COLORS.muted, marginBottom: 8, marginTop: 16 },

  // Monto grande
  montoContainer: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.accent, borderRadius: 16,
    paddingHorizontal: 16, backgroundColor: COLORS.surfaceSoft,
  },
  montoSimbol: { fontSize: 28, fontWeight: '700', color: COLORS.accent, marginRight: 4 },
  montoInput:  {
    flex: 1, fontSize: 36, fontWeight: '800', color: COLORS.text,
    paddingVertical: 12,
  },

  // Atajos
  atajosRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  atajoBtn:  {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: COLORS.surfaceSoft, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  atajoBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.text },

  // Inputs
  input: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: COLORS.text, backgroundColor: COLORS.surfaceSoft,
  },
  inputMulti: { height: 90, textAlignVertical: 'top' },
  charCount:  { fontSize: 11, color: COLORS.muted, textAlign: 'right', marginTop: 4 },

  // Botones
  botones: { flexDirection: 'row', gap: 12 },
  btnCancelar: {
    flex: 1, paddingVertical: 15, borderRadius: 12,
    borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center',
  },
  btnCancelarText: { fontSize: 15, fontWeight: '600', color: COLORS.muted },
  btnGuardar: {
    flex: 2, paddingVertical: 15, borderRadius: 12,
    backgroundColor: COLORS.accent, alignItems: 'center',
    ...SHADOW.card,
  },
  btnGuardarText: { fontSize: 15, fontWeight: '700', color: COLORS.onAccent },
});