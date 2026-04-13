import firestore from '@react-native-firebase/firestore';

export const db = firestore();

export const eventosRef = () => db.collection('eventos');
export const participantesRef = () => db.collection('participantes');
export const pagosRef = () => db.collection('pagos');