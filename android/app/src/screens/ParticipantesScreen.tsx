import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert, ActivityIndicator,
  KeyboardAvoidingView, Switch,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { participantesRef, pagosRef, eventosRef } from '../config/firebase';
import { Participante } from '../types';
import { COLORS, SHADOW, RADIUS, SPACING, TYPO } from '../theme';
import firestore from '@react-native-firebase/firestore';

type Ruta = RouteProp<RootStackParamList, 'Participantes'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'Participantes'>;

interface ParticipanteConSaldo extends Participante {
  saldo: number;
  porcentaje: number;
}

export default function ParticipantesScreen() {
  const navigation = useNavigation<Nav>();
  const { eventoId, eventoNombre, costo } = useRoute<Ruta>().params;

  const [participantes, setParticipantes] = useState<ParticipanteConSaldo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [nombre, setNombre] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmation, setConfirmation] = useState({ visible: false, title: '', message: '' });
  const [limiteInfo, setLimiteInfo] = useState({ actual: 0, limite: 0 });

  // ─── Obtener color de avatar según inicial
  const getAvatarColor = (nombre: string, index: number) => {
    const colores = [
      '#A5D6A7', // Verde claro
      '#FFCC80', // Naranja claro
      '#EF9A9A', // Rojo claro
      '#CE93D8', // Morado claro
      '#80DEEA', // Cyan claro
      '#F8BBD0', // Rosa claro
    ];
    return colores[index % colores.length];
  };

  // ─── Suscripción en tiempo real
  useEffect(() => {
    // Obtener límite del evento
    const unsubEvento = eventosRef()
      .doc(eventoId)
      .onSnapshot(
        (snap: any) => {
          if (snap && snap.exists) {
            setLimiteInfo(prev => ({
              ...prev,
              limite: snap.data().limiteParticipantes,
            }));
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
            console.warn('Participantes onSnapshot returned invalid snapshot:', snapshot);
            setLoading(false);
            return;
          }

          const docs = snapshot.docs.map((d: any) => ({
            id: d.id,
            ...d.data(),
          })) as Participante[];

          const conSaldo: ParticipanteConSaldo[] = docs.map(p => ({
            ...p,
            saldo: Math.max(costo - p.totalPagado, 0),
            porcentaje: costo > 0 ? Math.min((p.totalPagado / costo) * 100, 100) : 0,
          }));

          setParticipantes(conSaldo);
          setLimiteInfo(prev => ({ ...prev, actual: docs.length }));
          setLoading(false);
        },
        (error: unknown) => {
          console.warn('Participantes onSnapshot error:', error);
          setLoading(false);
        }
      );

    return () => {
      unsubEvento();
      unsubParts();
    };
  }, [eventoId, costo]);

  // ─── Agregar participante
  const showConfirmation = (title: string, message: string) => {
    setConfirmation({ visible: true, title, message });
  };

  const hideConfirmation = () => {
    setConfirmation({ visible: false, title: '', message: '' });
  };

  const handleAgregar = async () => {
    const nombreTrim = nombre.trim();
    if (!nombreTrim) return Alert.alert('Error', 'Ingresa un nombre.');

    const duplicado = participantes.some(
      p => p.nombre.toLowerCase() === nombreTrim.toLowerCase()
    );
    if (duplicado) return Alert.alert('Error', 'Ya existe un participante con ese nombre.');

    if (limiteInfo.actual >= limiteInfo.limite) {
      return Alert.alert(
        'Límite alcanzado',
        `Este evento tiene un límite de ${limiteInfo.limite} participantes.`
      );
    }

    setSaving(true);
    try {
      const docRef = await participantesRef().add({
        eventoId,
        nombre: nombreTrim,
        totalPagado: 0,
        asistio: false,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      const newParticipant: ParticipanteConSaldo = {
        id: docRef.id,
        eventoId,
        nombre: nombreTrim,
        totalPagado: 0,
        asistio: false,
        createdAt: new Date().toISOString(),
        saldo: costo,
        porcentaje: 0,
      };

      setParticipantes(prev => [...prev, newParticipant]);
      setLimiteInfo(prev => ({ ...prev, actual: prev.actual + 1 }));
      setNombre('');
      setModalVisible(false);
      setSearchQuery('');
      showConfirmation('Participante agregado', 'El participante se agregó correctamente.');
    } catch {
      Alert.alert('Error', 'No se pudo agregar el participante.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Toggle asistencia
  const toggleAsistencia = async (participante: ParticipanteConSaldo) => {
    const nuevoAsistio = !participante.asistio;
    try {
      await participantesRef()
        .doc(participante.id)
        .update({ asistio: nuevoAsistio });

      setParticipantes(prev =>
        prev.map(p =>
          p.id === participante.id ? { ...p, asistio: nuevoAsistio } : p
        )
      );
      showConfirmation(
        'Asistencia actualizada',
        nuevoAsistio ? 'Marca como asistió.' : 'Marca como no asistió.'
      );
    } catch {
      Alert.alert('Error', 'No se pudo actualizar la asistencia.');
    }
  };

  // ─── Eliminar participante
  const handleEliminar = (item: ParticipanteConSaldo) => {
    Alert.alert(
      'Eliminar participante',
      `¿Eliminar a "${item.nombre}"? Se eliminarán todos sus pagos registrados.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const batch = firestore().batch();

              const pagosSnap = await pagosRef()
                .where('participanteId', '==', item.id)
                .get();
              pagosSnap.docs.forEach(d => batch.delete(d.ref));

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

  // ─── Render item
  const renderItem = ({ item, index }: { item: ParticipanteConSaldo; index: number }) => {
    const solvente = item.saldo === 0 && item.totalPagado > 0;
    const sinPagar = item.totalPagado === 0;
    const avatarColor = getAvatarColor(item.nombre, index);

    return (
      <TouchableOpacity
        style={styles.participantCard}
        activeOpacity={0.84}
        onPress={() =>
          navigation.navigate('Pagos', {
            eventoId,
            participanteId: item.id,
            participanteNombre: item.nombre,
            costo,
          })
        }
      >
        {/* Header con avatar y info */}
        <View style={styles.participantHeader}>
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>{item.nombre.charAt(0).toUpperCase()}</Text>
          </View>

          <View style={styles.participantInfo}>
            <Text style={styles.participantName}>{item.nombre}</Text>
            <Text style={styles.participantStatus}>
              {item.asistio ? 'Asistió' : 'Sin asistencia'}
            </Text>
          </View>

          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
              {solvente ? 'Al día ✓' : sinPagar ? `Debe $${item.saldo}` : `Debe $${item.saldo}`}
            </Text>
          </View>
        </View>

        {/* Barra de progreso */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${item.porcentaje}%`,
                  backgroundColor: solvente ? COLORS.success : COLORS.warning,
                },
              ]}
            />
          </View>
        </View>

        {/* Información de pago */}
        <View style={styles.paymentInfo}>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>
              Pagado <Text style={styles.paymentAmount}>${item.totalPagado}</Text>
            </Text>
            <Text style={styles.paymentLabel}>
              Total <Text style={styles.paymentAmount}>${costo}</Text>
            </Text>
          </View>

          {/* Acciones */}
          <View style={styles.actions}>
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Asistió</Text>
              <Switch
                value={item.asistio}
                onValueChange={() => toggleAsistencia(item)}
                trackColor={{ false: COLORS.border, true: COLORS.accentSoft }}
                thumbColor={item.asistio ? COLORS.accent : COLORS.muted}
              />
            </View>

            <TouchableOpacity
              onPress={() => handleEliminar(item)}
              style={styles.deleteButton}
            >
              <Icon name="trash-can-outline" size={20} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ─── Loading
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  const lleno = limiteInfo.actual >= limiteInfo.limite;
  const disponibles = limiteInfo.limite - limiteInfo.actual;
  const filteredParticipants = participantes.filter(participant =>
    participant.nombre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Icon name="chevron-left" size={24} color={COLORS.text} />
        <Text style={styles.headerTitle}>Participantes</Text>
        <TouchableOpacity
          style={[styles.addButton, lleno && styles.addButtonDisabled]}
          onPress={() => !lleno && setModalVisible(true)}
          disabled={lleno}
        >
          <Icon name="plus" size={28} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        style={styles.content}
        data={filteredParticipants}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        ListHeaderComponent={() => (
          <>
            <View style={styles.searchContainer}>
              <View style={styles.searchInputWrap}>
                <Icon name="magnify" size={20} color={COLORS.muted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar participante..."
                  placeholderTextColor={COLORS.muted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Icon name="close-circle" size={18} color={COLORS.muted} />
                  </TouchableOpacity>
                ) : null}
              </View>
              {searchQuery ? (
                <Text style={styles.searchMeta}>
                  {filteredParticipants.length} de {participantes.length} resultados
                </Text>
              ) : null}
            </View>

            <View style={styles.quotaSection}>
              <View style={styles.quotaContent}>
                <Icon name="account-multiple" size={28} color={COLORS.accent} />
                <View style={styles.quotaTextContainer}>
                  <Text style={styles.quotaLabel}>CUPO DEL EVENTO</Text>
                  <Text style={styles.quotaNumber}>
                    {limiteInfo.actual} / {limiteInfo.limite} inscritos
                  </Text>
                </View>
              </View>

              <View style={styles.quotaBadge}>
                <Text style={styles.quotaText}>{disponibles} lugares</Text>
              </View>
            </View>

            <Text style={styles.quotaPercentage}>
              {Math.round((limiteInfo.actual / limiteInfo.limite) * 100)}% del cupo ocupado
            </Text>

            <Text style={styles.listTitle}>
              LISTA DE PARTICIPANTES
              <Text style={styles.registeredCount}> {limiteInfo.actual} registrados</Text>
            </Text>
          </>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={() => (
          <View style={styles.emptyBox}>
            <Icon name="account-multiple-outline" size={52} color={COLORS.muted} />
            <Text style={styles.emptyTitle}>
              {participantes.length === 0 ? 'Sin participantes' : 'No se encontraron resultados'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {participantes.length === 0
                ? 'Toca el botón + para agregar el primero'
                : 'Intenta con otro nombre o borra el texto de búsqueda'}
            </Text>
          </View>
        )}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, lleno && styles.fabDisabled]}
        onPress={() => !lleno && setModalVisible(true)}
        disabled={lleno}
      >
        <Icon name="plus" size={32} color="white" />
      </TouchableOpacity>

      {/* Modal agregar */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior="padding">
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Agregar participante</Text>
            <Text style={styles.modalSubtitle}>
              Quedan {disponibles} lugares disponibles
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
              placeholderTextColor={COLORS.muted}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={() => {
                  setModalVisible(false);
                  setNombre('');
                }}
              >
                <Text style={styles.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnSave}
                onPress={handleAgregar}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={COLORS.onAccent} />
                ) : (
                  <Text style={styles.btnSaveText}>Agregar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={confirmation.visible} animationType="fade" transparent>
        <View style={styles.confirmationOverlay}>
          <View style={styles.confirmationBox}>
            <Icon name="check-circle-outline" size={48} color={COLORS.success} />
            <Text style={styles.confirmationTitle}>{confirmation.title}</Text>
            <Text style={styles.confirmationMessage}>{confirmation.message}</Text>
            <TouchableOpacity style={styles.confirmationButton} onPress={hideConfirmation}>
              <Text style={styles.confirmationButtonText}>Aceptar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Estilos
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
  },
  addButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 24,
    padding: 8,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  searchContainer: {
    marginBottom: 14,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    paddingVertical: 0,
  },
  searchMeta: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.muted,
  },
  quotaSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    ...SHADOW.subtle,
  },
  quotaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quotaTextContainer: {
    gap: 4,
  },
  quotaLabel: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quotaNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  quotaBadge: {
    backgroundColor: '#C8E6C9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  quotaText: {
    color: '#2E7D32',
    fontWeight: '600',
    fontSize: 12,
  },
  quotaPercentage: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  registeredCount: {
    color: COLORS.accent,
    fontWeight: '700',
  },
  participantCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 0,
    overflow: 'hidden',
    ...SHADOW.subtle,
  },
  participantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  participantStatus: {
    fontSize: 13,
    color: COLORS.accent,
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2E7D32',
  },
  progressBarContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  paymentInfo: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  paymentLabel: {
    fontSize: 12,
    color: COLORS.muted,
  },
  paymentAmount: {
    fontWeight: '700',
    color: COLORS.text,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchLabel: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOW.card,
  },
  fabDisabled: {
    backgroundColor: COLORS.border,
  },
  emptyBox: {
    alignItems: 'center',
    gap: 8,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.muted,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.surfaceSoft,
    marginBottom: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
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
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
  },
  btnSaveText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.onAccent,
  },
  confirmationOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  confirmationBox: {
    width: '85%',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 14,
    ...SHADOW.card,
  },
  confirmationTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  confirmationMessage: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
  },
  confirmationButton: {
    marginTop: 8,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmationButtonText: {
    color: COLORS.onAccent,
    fontSize: 15,
    fontWeight: '700',
  },
});