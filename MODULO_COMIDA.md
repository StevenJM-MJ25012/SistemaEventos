# 🍽 Módulo de Gestión de Comida - Sistema de Eventos

## Descripción General

El módulo de gestión de comida permite administrar la alimentación de los participantes en eventos. Incluye:

- ✏️ **Configuración de menú** - Agregar platos y bebidas por tipo de comida
- ⏰ **Tiempos de comida** - Definir horarios (Desayuno, Almuerzo, Merienda, Cena)
- 👥 **Asignación de comida** - Asignar platos y bebidas a cada participante
- 📦 **Seguimiento de entregas** - Marcar entregas y ver resumen general
- 📊 **Resumen estadístico** - Visualizar totales, entregados y pendientes

---

## Estructura de Datos

### Colecciones Firestore

```
📦 tiemposComida
├── id: string
├── eventoId: string (referencia)
├── tipo: 'Desayuno' | 'Almuerzo' | 'Merienda' | 'Cena'
├── hora?: string (ej: "14:30")
├── descripcion?: string
├── activo: boolean
└── createdAt: timestamp

📦 platosMenu
├── id: string
├── eventoId: string (referencia)
├── nombre: string
├── tipo: 'Desayuno' | 'Almuerzo' | 'Merienda' | 'Cena'
├── descripcion?: string
├── cantidad?: number
└── createdAt: timestamp

📦 bebidasMenu
├── id: string
├── eventoId: string (referencia)
├── nombre: string
├── tipo: 'Desayuno' | 'Almuerzo' | 'Merienda' | 'Cena'
├── descripcion?: string
├── cantidad?: number
└── createdAt: timestamp

📦 asignacionesComida
├── id: string
├── eventoId: string (referencia)
├── participanteId: string (referencia)
├── participanteNombre: string
├── tiempoComidaId: string (referencia)
├── tipoComida: 'Desayuno' | 'Almuerzo' | 'Merienda' | 'Cena'
├── platoId: string (referencia)
├── platoNombre: string
├── platoTipo: string
├── bebidaId: string (referencia)
├── bebidaNombre: string
├── bebidaTipo: string
└── createdAt: timestamp

📦 entregasComida
├── id: string
├── eventoId: string (referencia)
├── asignacionComidaId: string (referencia)
├── participanteId: string (referencia)
├── participanteNombre: string
├── platoNombre: string
├── bebidaNombre: string
├── fecha: string
├── entregado: boolean
├── hora?: string
├── observaciones?: string
└── createdAt: timestamp
```

---

## Pantallas y Funcionalidades

### 1️⃣ **ComidaEventoScreen** (`/screens/ComidaEventoScreen.tsx`)

Pantalla principal para configurar el menú y tiempos de comida del evento.

#### Tabs:
- **⏰ Tiempos** - Listar tiempos de comida configurados
- **🍗 Platos** - Listar platos del menú con estadísticas
- **🥤 Bebidas** - Listar bebidas del menú con estadísticas
- **📊 Resumen** - Ver gráficos de entregas

#### Funcionalidades:
- Agregar tiempos de comida dinámicamente
- Agregar platos con tipo específico (Desayuno, Almuerzo, etc.)
- Agregar bebidas con tipo específico
- Ver resumen con barra de progreso

---

### 2️⃣ **AsignarComidaScreen** (`/screens/AsignarComidaScreen.tsx`)

Pantalla para asignar comida a participantes y marcar entregas.

#### Tabs:
- **✏️ Asignar** - Seleccionar participante y asignar plato + bebida
- **📦 Entregar** - Marcar platos y bebidas como entregados

#### Funcionalidades:
- Seleccionar participante de lista
- Elegir tiempo de comida
- Seleccionar plato del menú (según el tipo de tiempo)
- Seleccionar bebida del menú (según el tipo de tiempo)
- Ver historial de asignaciones del participante
- Marcar entregas como completadas

---

## Servicios (`/services/comidaService.ts`)

### Funciones Principales

#### Tiempos de Comida
```typescript
// Agregar tiempo de comida
agregarTiempoComida(eventoId, tipo, hora?, descripcion?)

// Obtener tiempos del evento
obtenerTiemposComida(eventoId) => TiempoComidaEvento[]
```

#### Menú - Platos
```typescript
// Agregar plato al menú
agregarPlatoMenu(eventoId, nombre, tipo, descripcion?)

// Obtener platos por tipo
obtenerPlatosPorTipo(eventoId, tipo) => PlatoMenu[]
```

#### Menú - Bebidas
```typescript
// Agregar bebida al menú
agregarBebidaMenu(eventoId, nombre, tipo, descripcion?)

// Obtener bebidas por tipo
obtenerBebidasPorTipo(eventoId, tipo) => BebidaMenu[]
```

#### Asignaciones
```typescript
// Asignar comida a participante
asignarComidaParticipante(
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
  bebidaTipo
) => string (id)

// Obtener asignaciones de un participante
obtenerAsignacionesParticipante(eventoId, participanteId) => AsignacionComida[]

// Obtener todas las asignaciones del evento
obtenerAsignacionesEvento(eventoId) => AsignacionComida[]
```

#### Entregas
```typescript
// Registrar entrega de comida
registrarEntregaComida(
  eventoId,
  asignacionComidaId,
  participanteId,
  participanteNombre,
  platoNombre,
  bebidaNombre,
  fecha,
  hora?,
  observaciones?
) => string (id)

// Marcar como entregada
marcarComidaEntregada(entregaId) => void

// Obtener entregas pendientes
obtenerEntregasPendientes(eventoId) => EntregaComida[]

// Obtener todas las entregas del evento
obtenerEntregasEvento(eventoId) => EntregaComida[]
```

#### Resúmenes
```typescript
// Generar resumen de platos
generarResumenPlatos(eventoId) => ResumenPlatos[]
// Retorna: [{ platoNombre, tipo, cantidad, entregados, pendientes }]

// Generar resumen de bebidas
generarResumenBebidas(eventoId) => ResumenBebidas[]
// Retorna: [{ bebidaNombre, tipo, cantidad, entregadas, pendientes }]
```

---

## Tipos TypeScript (`/types/index.ts`)

```typescript
type TipoTiempoComida = 'Desayuno' | 'Almuerzo' | 'Merienda' | 'Cena';

interface PlatoMenu {
  id: string;
  nombre: string;
  tipo: TipoTiempoComida;
  descripcion?: string;
  cantidad?: number;
  createdAt: string;
}

interface BebidaMenu {
  id: string;
  nombre: string;
  tipo: TipoTiempoComida;
  descripcion?: string;
  cantidad?: number;
  createdAt: string;
}

interface TiempoComidaEvento {
  id: string;
  eventoId: string;
  tipo: TipoTiempoComida;
  hora?: string;
  descripcion?: string;
  activo: boolean;
  createdAt: string;
}

interface AsignacionComida {
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

interface EntregaComida {
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

interface ResumenPlatos {
  platoNombre: string;
  tipo: string;
  cantidad: number;
  entregados: number;
  pendientes: number;
}

interface ResumenBebidas {
  bebidaNombre: string;
  tipo: string;
  cantidad: number;
  entregadas: number;
  pendientes: number;
}
```

---

## Flujo de Uso

### 1. Configurar Menú del Evento

1. Acceder a `ComidaEventoScreen` desde `EventoDetalle`
2. En tab **⏰ Tiempos**:
   - Hacer clic en "Agregar Tiempo de Comida"
   - Seleccionar tipo (Desayuno, Almuerzo, Merienda, Cena)
   - Agregar hora y descripción (opcional)
3. En tab **🍗 Platos**:
   - Hacer clic en "Agregar Plato"
   - Ingresar nombre, tipo y descripción
   - Repetir para todos los platos
4. En tab **🥤 Bebidas**:
   - Hacer clic en "Agregar Bebida"
   - Ingresar nombre, tipo y descripción
   - Repetir para todas las bebidas

### 2. Asignar Comida a Participantes

1. Acceder a `AsignarComidaScreen` desde `EventoDetalle`
2. En tab **✏️ Asignar**:
   - Hacer clic en un participante
   - Seleccionar "Tiempo de Comida"
   - Seleccionar "Plato" (los disponibles del tipo elegido)
   - Seleccionar "Bebida" (las disponibles del tipo elegido)
   - Hacer clic en "Asignar"
3. El sistema valida que todos los campos estén completos

### 3. Marcar Entregas

1. En tab **📦 Entregar**:
   - Se muestra lista de entregas pendientes
   - Hacer clic en "Marcar entregada" para cada plato
   - El sistema registra la entrega y actualiza los totales

### 4. Ver Resumen

1. En tab **📊 Resumen** de `ComidaEventoScreen`:
   - Ver total de platos a entregar
   - Ver barras de progreso por plato
   - Ver total de bebidas a entregar
   - Ver barras de progreso por bebida

---

## Referencias en Navegación

### Agregar acceso desde EventoDetalleScreen

```typescript
<TouchableOpacity onPress={() => 
  navigation.navigate('ComidaEvento', { 
    eventoId, 
    eventoNombre 
  })
}>
  <Text>🍽 Gestionar Comida</Text>
</TouchableOpacity>
```

---

## Notas Importantes

✅ **Sistema dinámico** - Los tipos de comida son predefinidos pero extensibles
✅ **Validaciones** - Se validan campos requeridos antes de guardar
✅ **Tiempo real** - Los cambios se sincronizan con Firestore en tiempo real
✅ **Estadísticas** - Se calculan automáticamente al cargar datos
✅ **Interfaz intuitiva** - Selectores visuales en lugar de campos de texto

---

## Mejoras Futuras

- 📸 Agregar fotos de platos
- 🏷️ Agregar códigos QR para entregas rápidas
- 📧 Enviar recordatorios por correo
- 📱 Notificaciones push para entregas
- 🎨 Temas personalizables por evento
- 🔊 Sonidos de notificación al entregar

