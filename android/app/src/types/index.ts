export interface Evento {
  id: string;
  nombre: string;
  descripcion: string;
  fecha: string;
  costo: number;
  limiteParticipantes: number;
  categoria?: string;
  ubicacion?: string;
  estado?: 'Planeado' | 'En progreso' | 'Completado';
  notas?: string;
  createdAt: string;
}

export interface Participante {
  id: string;
  eventoId: string;
  nombre: string;
  email?: string;
  rol?: string;
  totalPagado: number;
  asistio: boolean;
  createdAt: string;
}

export interface Pago {
  id: string;
  eventoId: string;
  participanteId: string;
  participanteNombre: string;
  monto: number;
  fecha: string;
  metodo?: string;
  observacion?: string;
  createdAt: string;
}