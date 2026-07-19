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

// ─── Tipos para módulo de Comida ───────────────────────────────────────────
export type TipoTiempoComida = 'Desayuno' | 'Almuerzo' | 'Merienda' | 'Cena';

export interface PlatoMenu {
  id: string;
  nombre: string;
  tipo: TipoTiempoComida;
  descripcion?: string;
  cantidad?: number;
  createdAt: string;
}

export interface BebidaMenu {
  id: string;
  nombre: string;
  tipo: TipoTiempoComida;
  descripcion?: string;
  cantidad?: number;
  createdAt: string;
}

export interface TiempoComidaEvento {
  id: string;
  eventoId: string;
  tipo: TipoTiempoComida;
  hora?: string;
  descripcion?: string;
  activo: boolean;
  createdAt: string;
}

export interface ComidaEvento {
  id: string;
  eventoId: string;
  menuPlatos: PlatoMenu[];
  menuBebidas: BebidaMenu[];
  tiemposComida: TiempoComidaEvento[];
  createdAt: string;
}

export interface AsignacionComida {
  id: string;
  eventoId: string;
  participanteId: string;
  participanteNombre: string;
  tiempoComidaId: string;
  tipoComida: TipoTiempoComida;
  platoId: string;
  platoNombre: string;
  platoTipo: string;
  bebidaId: string;
  bebidaNombre: string;
  bebidaTipo: string;
  createdAt: string;
}

export interface EntregaComida {
  id: string;
  eventoId: string;
  asignacionComidaId: string;
  participanteId: string;
  participanteNombre: string;
  platoNombre: string;
  bebidaNombre: string;
  fecha: string;
  entregado: boolean;
  hora?: string;
  observaciones?: string;
  createdAt: string;
}

export interface ResumenPlatos {
  platoNombre: string;
  tipo: string;
  cantidad: number;
  entregados: number;
  pendientes: number;
}

export interface ResumenBebidas {
  bebidaNombre: string;
  tipo: string;
  cantidad: number;
  entregadas: number;
  pendientes: number;
}
