import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { pagosRef, participantesRef } from '../config/firebase';
import { COLORS, SHADOW, RADIUS, SPACING } from '../theme';
import firestore from '@react-native-firebase/firestore';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AgregarPago'>;
type Ruta = RouteProp<RootStackParamList, 'AgregarPago'>;

// Fecha de hoy formateada dd/mm/yyyy
const hoy = (): string => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(
    d.getMonth() + 1
  ).padStart(2, '0')}/${d.getFullYear()}`;
};

export default function AgregarPagoScreen() {
  const navigation = useNavigation<Nav>();
  const { eventoId, participanteId, participanteNombre, costo } = useRoute<Ruta>().params;

  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(hoy());
  const [observacion, setObservacion] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);

  // Montos sugeridos
  const MONTOS_RAPIDOS = [1, 2, 5, 10];

  // ─── Guardar pago con confirmación
  const handleGuardar = async () => {
    const montoNum = Number(monto);

    if (!monto.trim() || isNaN(montoNum) || montoNum <= 0) {
      return Alert.alert('Error', 'Ingresa un monto válido mayor a 0.');
    }
    if (!fecha.trim()) {
      return Alert.alert('Error', 'La fecha es obligatoria.');
    }

    // Mostrar modal de confirmación
    setConfirmModalVisible(true);
  };

  // ─── Confirmar y crear pago
  const handleConfirmar = async () => {
    const montoNum = Number(monto);
    setSaving(true);
    setConfirmModalVisible(false);

    try {
      const batch = firestore().batch();

      // 1. Crear el pago
      const pagoRef = pagosRef().doc();
      batch.set(pagoRef, {
        eventoId,
        participanteId,
        participanteNombre,
        monto: montoNum,
        fecha: fecha.trim(),
        metodo: 'efectivo', // Puedes hacer esto dinámico
        observacion: observacion.trim(),
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      // 2. Incrementar totalPagado del participante (atómico)
      batch.update(participantesRef().doc(participanteId), {
        totalPagado: firestore.FieldValue.increment(montoNum),
      });

      await batch.commit();

      // Volver a la pantalla de pagos para que el snapshot actualice el historial
      navigation.goBack();
    } catch (error) {
      console.error('Error al guardar pago:', error);
      Alert.alert('Error', 'No se pudo registrar el pago.');
      setSaving(false);
    }
  };

  const montoNum = Number(monto) || 0;
  const avatarColor = ['#A5D6A7', '#FFCC80', '#EF9A9A', '#CE93D8', '#80DEEA'][
    participanteNombre.charCodeAt(0) % 5
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Registrar abono</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Tarjeta participante */}
        <TouchableOpacity style={styles.participanteCard} activeOpacity={0.7}>
          <View style={[styles.participanteAvatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.participanteAvatarText}>
              {participanteNombre.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.participanteInfo}>
            <Text style={styles.participanteLabel}>Abono para</Text>
            <Text style={styles.participanteNombre}>{participanteNombre}</Text>
          </View>
          <Icon name="chevron-right" size={24} color={COLORS.muted} />
        </TouchableOpacity>

        {/* Sección monto */}
        <View style={styles.montoSection}>
          <Text style={styles.sectionLabel}>MONTO DEL ABONO</Text>
          <View style={styles.montoContainer}>
            <Text style={styles.montoSymbol}>$</Text>
            <TextInput
              style={styles.montoInput}
              placeholder="15"
              value={monto}
              onChangeText={setMonto}
              keyboardType="decimal-pad"
              autoFocus
              placeholderTextColor={COLORS.muted}
              maxLength={10}
            />
          </View>

          {/* Montos rápidos */}
          <Text style={styles.atajosLabel}>Montos rápidos</Text>
          <View style={styles.atajosRow}>
            {MONTOS_RAPIDOS.map(v => (
              <TouchableOpacity
                key={v}
                style={[
                  styles.atajoBtn,
                  monto === String(v) && styles.atajoBtnActive,
                ]}
                onPress={() => setMonto(String(v))}
              >
                <Text
                  style={[
                    styles.atajoBtnText,
                    monto === String(v) && styles.atajoBtnTextActive,
                  ]}
                >
                  ${v}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tarjeta resumen */}
        <View style={styles.resumenCard}>
          <View style={styles.resumenLeft}>
            <Text style={styles.resumenLabel}>REGISTRANDO ABONO</Text>
            <Text style={styles.resumenNombre}>{participanteNombre}</Text>
          </View>
          <View style={styles.resumenRight}>
            <Text style={styles.resumenMonto}>${montoNum}</Text>
            <Text style={styles.resumenFecha}>{fecha}</Text>
          </View>
        </View>

        {/* Detalles del pago */}
        <View style={styles.detallesSection}>
          <Text style={styles.sectionLabel}>DETALLES DEL PAGO</Text>

          {/* Fecha */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>FECHA DEL PAGO</Text>
            <View style={styles.dateFieldContainer}>
              <TextInput
                style={styles.dateInput}
                placeholder="dd/mm/yyyy"
                value={fecha}
                onChangeText={setFecha}
                placeholderTextColor={COLORS.muted}
              />
              <Icon name="calendar" size={20} color={COLORS.muted} />
            </View>
          </View>

          {/* Observación */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>OBSERVACIÓN (OPCIONAL)</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              placeholder="Ej: Pagó en efectivo, transferencia #123..."
              value={observacion}
              onChangeText={setObservacion}
              multiline
              numberOfLines={3}
              maxLength={200}
              placeholderTextColor={COLORS.muted}
            />
            <Text style={styles.charCount}>{observacion.length} / 200</Text>
          </View>
        </View>

        {/* Botones */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.btnCancel}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.btnCancelText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnSave}
            onPress={handleGuardar}
            disabled={saving || !monto.trim()}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.onAccent} />
            ) : (
              <>
                <Icon name="check" size={20} color={COLORS.onAccent} />
                <Text style={styles.btnSaveText}>Guardar abono</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal de confirmación */}
      <Modal
        visible={confirmModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => !saving && setConfirmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            {/* Header */}
            <View style={styles.confirmHeader}>
              <View style={[styles.confirmIcon, { backgroundColor: avatarColor }]}>
                <Icon name="check-circle" size={40} color="white" />
              </View>
            </View>

            {/* Contenido */}
            <Text style={styles.confirmTitle}>¿Confirmar abono?</Text>
            <Text style={styles.confirmSubtitle}>
              Se registrará un abono de
            </Text>

            <View style={styles.confirmAmount}>
              <Text style={styles.confirmAmountText}>${montoNum}</Text>
            </View>

            <Text style={styles.confirmParticipant}>{participanteNombre}</Text>
            <Text style={styles.confirmDate}>Fecha: {fecha}</Text>

            {observacion.trim() && (
              <View style={styles.confirmObservation}>
                <Text style={styles.confirmObservationLabel}>Nota:</Text>
                <Text style={styles.confirmObservationText}>{observacion}</Text>
              </View>
            )}

            {/* Botones */}
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.confirmBtnCancel}
                onPress={() => !saving && setConfirmModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.confirmBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtnConfirm}
                onPress={handleConfirmar}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={COLORS.onAccent} size="small" />
                ) : (
                  <>
                    <Icon name="check" size={20} color={COLORS.onAccent} />
                    <Text style={styles.confirmBtnConfirmText}>Confirmar</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },

  // Tarjeta participante
  participanteCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.subtle,
  },
  participanteAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  participanteAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  participanteInfo: {
    flex: 1,
  },
  participanteLabel: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  participanteNombre: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },

  // Sección monto
  montoSection: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.subtle,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  montoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.accent,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 16,
    backgroundColor: COLORS.surfaceSoft,
    marginBottom: 16,
  },
  montoSymbol: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.accent,
    marginRight: 8,
  },
  montoInput: {
    flex: 1,
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.text,
    paddingVertical: 14,
  },
  atajosLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
    marginBottom: 10,
  },
  atajosRow: {
    flexDirection: 'row',
    gap: 10,
  },
  atajoBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSoft,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  atajoBtnActive: {
    borderColor: COLORS.accent,
    borderWidth: 2,
    backgroundColor: COLORS.accentSoft,
  },
  atajoBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  atajoBtnTextActive: {
    color: COLORS.accent,
  },

  // Resumen card
  resumenCard: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.lg,
    padding: 18,
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...SHADOW.card,
  },
  resumenLeft: {
    gap: 6,
  },
  resumenLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  resumenNombre: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.onAccent,
  },
  resumenRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  resumenMonto: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.onAccent,
  },
  resumenFecha: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },

  // Detalles
  detallesSection: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.subtle,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  dateFieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    backgroundColor: COLORS.surfaceSoft,
  },
  dateInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.text,
  },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.surfaceSoft,
  },
  inputMulti: {
    height: 90,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    color: COLORS.muted,
    textAlign: 'right',
    marginTop: 6,
  },

  // Botones
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  btnCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.muted,
  },
  btnSave: {
    flex: 1.5,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    ...SHADOW.card,
  },
  btnSaveText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.onAccent,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  confirmModal: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 24,
    width: '100%',
    ...SHADOW.strong,
  },
  confirmHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  confirmIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.success,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmSubtitle: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    marginBottom: 16,
  },
  confirmAmount: {
    backgroundColor: COLORS.accentSoft,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  confirmAmountText: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.accent,
  },
  confirmParticipant: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  confirmDate: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    marginBottom: 16,
  },
  confirmObservation: {
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.info,
  },
  confirmObservationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
    marginBottom: 4,
  },
  confirmObservationText: {
    fontSize: 14,
    color: COLORS.text,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmBtnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  confirmBtnCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.muted,
  },
  confirmBtnConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    ...SHADOW.card,
  },
  confirmBtnConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.onAccent,
  },
});