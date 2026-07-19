import { ComidaEvento, TiempoComidaEvento, PlatoMenu, BebidaMenu, AsignacionComida, EntregaComida, ResumenPlatos, ResumenBebidas, TipoTiempoComida } from '../types';
import { comidaEventoRef, tiemposComidaRef, platosMenuRef, bebidasMenuRef, asignacionesComidaRef, entregasComidaRef } from '../config/firebase';
import firestore from '@react-native-firebase/firestore';

// ─── Crear o actualizar configuración de comida del evento ────────────────
export const crearComidaEvento = async (eventoId: string): Promise<string> => {
  const docRef = await comidaEventoRef().add({
    eventoId,
    menuPlatos: [],
    menuBebidas: [],
    tiemposComida: [],
    createdAt: firestore.FieldValue.serverTimestamp(),
  } as ComidaEvento);
  return docRef.id;
};

// ─── Obtener configuración de comida del evento ────────────────────────────
export const obtenerComidaEvento = async (eventoId: string): Promise<ComidaEvento | null> => {
  const snapshot = await comidaEventoRef()
    .where('eventoId', '==', eventoId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as ComidaEvento;
};

// ─── Agregar tiempo de comida al evento ───────────────────────────────────
export const agregarTiempoComida = async (
  eventoId: string,
  tipo: TipoTiempoComida,
  hora?: string,
  descripcion?: string
): Promise<string> => {
  const docRef = await tiemposComidaRef().add({
    eventoId,
    tipo,
    hora,
    descripcion,
    activo: true,
    createdAt: firestore.FieldValue.serverTimestamp(),
  } as TiempoComidaEvento);
  return docRef.id;
};

// ─── Obtener tiempos de comida del evento ─────────────────────────────────
export const obtenerTiemposComida = async (eventoId: string): Promise<TiempoComidaEvento[]> => {
  const snapshot = await tiemposComidaRef()
    .where('eventoId', '==', eventoId)
    .where('activo', '==', true)
    .orderBy('createdAt', 'asc')
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TiempoComidaEvento));
};

// ─── Agregar plato al menú ────────────────────────────────────────────────
export const agregarPlatoMenu = async (
  eventoId: string,
  nombre: string,
  tipo: TipoTiempoComida,
  descripcion?: string
): Promise<string> => {
  const docRef = await platosMenuRef().add({
    eventoId,
    nombre,
    tipo,
    descripcion,
    cantidad: 0,
    createdAt: firestore.FieldValue.serverTimestamp(),
  } as PlatoMenu);
  return docRef.id;
};

// ─── Obtener platos del menú por tipo de comida ──────────────────────────
export const obtenerPlatosPorTipo = async (
  eventoId: string,
  tipo: TipoTiempoComida
): Promise<PlatoMenu[]> => {
  const snapshot = await platosMenuRef()
    .where('eventoId', '==', eventoId)
    .where('tipo', '==', tipo)
    .orderBy('createdAt', 'asc')
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlatoMenu));
};

// ─── Agregar bebida al menú ──────────────────────────────────────────────
export const agregarBebidaMenu = async (
  eventoId: string,
  nombre: string,
  tipo: TipoTiempoComida,
  descripcion?: string
): Promise<string> => {
  const docRef = await bebidasMenuRef().add({
    eventoId,
    nombre,
    tipo,
    descripcion,
    cantidad: 0,
    createdAt: firestore.FieldValue.serverTimestamp(),
  } as BebidaMenu);
  return docRef.id;
};

// ─── Obtener bebidas del menú por tipo de comida ──────────────────────────
export const obtenerBebidasPorTipo = async (
  eventoId: string,
  tipo: TipoTiempoComida
): Promise<BebidaMenu[]> => {
  const snapshot = await bebidasMenuRef()
    .where('eventoId', '==', eventoId)
    .where('tipo', '==', tipo)
    .orderBy('createdAt', 'asc')
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BebidaMenu));
};

// ─── Asignar comida a un participante ────────────────────────────────────
export const asignarComidaParticipante = async (
  eventoId: string,
  participanteId: string,
  participanteNombre: string,
  tiempoComidaId: string,
  tipoComida: TipoTiempoComida,
  platoId: string,
  platoNombre: string,
  platoTipo: string,
  bebidaId: string,
  bebidaNombre: string,
  bebidaTipo: string
): Promise<string> => {
  const docRef = await asignacionesComidaRef().add({
    eventoId,
    participanteId,
    participanteNombre,
    tiempoComidaId,
    tipoComida,
    platoId,
    platoNombre,
    platoTipo,
    bebidaId,
    bebidaNombre,
    bebidaTipo,
    createdAt: firestore.FieldValue.serverTimestamp(),
  } as AsignacionComida);
  return docRef.id;
};

// ─── Obtener asignaciones de comida de un participante ──────────────────
export const obtenerAsignacionesParticipante = async (
  eventoId: string,
  participanteId: string
): Promise<AsignacionComida[]> => {
  const snapshot = await asignacionesComidaRef()
    .where('eventoId', '==', eventoId)
    .where('participanteId', '==', participanteId)
    .orderBy('createdAt', 'asc')
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AsignacionComida));
};

// ─── Obtener todas las asignaciones de un evento ──────────────────────────
export const obtenerAsignacionesEvento = async (eventoId: string): Promise<AsignacionComida[]> => {
  const snapshot = await asignacionesComidaRef()
    .where('eventoId', '==', eventoId)
    .orderBy('createdAt', 'asc')
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AsignacionComida));
};

// ─── Registrar entrega de comida ──────────────────────────────────────────
export const registrarEntregaComida = async (
  eventoId: string,
  asignacionComidaId: string,
  participanteId: string,
  participanteNombre: string,
  platoNombre: string,
  bebidaNombre: string,
  fecha: string,
  hora?: string,
  observaciones?: string
): Promise<string> => {
  const docRef = await entregasComidaRef().add({
    eventoId,
    asignacionComidaId,
    participanteId,
    participanteNombre,
    platoNombre,
    bebidaNombre,
    fecha,
    entregado: true,
    hora,
    observaciones,
    createdAt: firestore.FieldValue.serverTimestamp(),
  } as EntregaComida);
  return docRef.id;
};

// ─── Obtener entregas de comida del evento ────────────────────────────────
export const obtenerEntregasEvento = async (eventoId: string): Promise<EntregaComida[]> => {
  const snapshot = await entregasComidaRef()
    .where('eventoId', '==', eventoId)
    .orderBy('createdAt', 'asc')
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EntregaComida));
};

// ─── Generar resumen de platos ────────────────────────────────────────────
export const generarResumenPlatos = async (eventoId: string): Promise<ResumenPlatos[]> => {
  const asignaciones = await obtenerAsignacionesEvento(eventoId);
  const entregas = await obtenerEntregasEvento(eventoId);

  const mapa = new Map<string, { nombre: string; tipo: string; cantidad: number; entregados: number }>();

  // Contar asignaciones
  asignaciones.forEach(asig => {
    const key = `${asig.platoNombre}-${asig.platoTipo}`;
    const existente = mapa.get(key);
    if (existente) {
      existente.cantidad += 1;
    } else {
      mapa.set(key, {
        nombre: asig.platoNombre,
        tipo: asig.platoTipo,
        cantidad: 1,
        entregados: 0,
      });
    }
  });

  // Contar entregas
  entregas.forEach(entrega => {
    const key = `${entrega.platoNombre}-${entrega.platoNombre}`;
    const existente = mapa.get(key);
    if (existente) {
      existente.entregados += 1;
    }
  });

  // Convertir a array con pendientes calculados
  return Array.from(mapa.entries()).map(([_, datos]) => ({
    platoNombre: datos.nombre,
    tipo: datos.tipo,
    cantidad: datos.cantidad,
    entregados: datos.entregados,
    pendientes: datos.cantidad - datos.entregados,
  }));
};

// ─── Generar resumen de bebidas ───────────────────────────────────────────
export const generarResumenBebidas = async (eventoId: string): Promise<ResumenBebidas[]> => {
  const asignaciones = await obtenerAsignacionesEvento(eventoId);
  const entregas = await obtenerEntregasEvento(eventoId);

  const mapa = new Map<string, { nombre: string; tipo: string; cantidad: number; entregadas: number }>();

  // Contar asignaciones
  asignaciones.forEach(asig => {
    const key = `${asig.bebidaNombre}-${asig.bebidaTipo}`;
    const existente = mapa.get(key);
    if (existente) {
      existente.cantidad += 1;
    } else {
      mapa.set(key, {
        nombre: asig.bebidaNombre,
        tipo: asig.bebidaTipo,
        cantidad: 1,
        entregadas: 0,
      });
    }
  });

  // Contar entregas
  entregas.forEach(entrega => {
    const key = `${entrega.bebidaNombre}-${entrega.bebidaNombre}`;
    const existente = mapa.get(key);
    if (existente) {
      existente.entregadas += 1;
    }
  });

  // Convertir a array con pendientes calculados
  return Array.from(mapa.entries()).map(([_, datos]) => ({
    bebidaNombre: datos.nombre,
    tipo: datos.tipo,
    cantidad: datos.cantidad,
    entregadas: datos.entregadas,
    pendientes: datos.cantidad - datos.entregadas,
  }));
};

// ─── Marcar entrega como completada ──────────────────────────────────────
export const marcarComidaEntregada = async (entregaId: string): Promise<void> => {
  await entregasComidaRef().doc(entregaId).update({
    entregado: true,
  });
};

// ─── Obtener entregas pendientes de un evento ───────────────────────────
export const obtenerEntregasPendientes = async (eventoId: string): Promise<EntregaComida[]> => {
  const snapshot = await entregasComidaRef()
    .where('eventoId', '==', eventoId)
    .where('entregado', '==', false)
    .orderBy('createdAt', 'asc')
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EntregaComida));
};
