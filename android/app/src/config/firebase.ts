import firestore from '@react-native-firebase/firestore';

export const db = firestore();

export const eventosRef = () => db.collection('eventos');
export const participantesRef = () => db.collection('participantes');
export const pagosRef = () => db.collection('pagos');

// ─── Referencias para módulo de Comida ────────────────────────────────────
export const comidaEventoRef = () => db.collection('comidaEventos');
export const tiemposComidaRef = () => db.collection('tiemposComida');
export const platosMenuRef = () => db.collection('platosMenu');
export const bebidasMenuRef = () => db.collection('bebidasMenu');
export const asignacionesComidaRef = () => db.collection('asignacionesComida');
export const entregasComidaRef = () => db.collection('entregasComida');
