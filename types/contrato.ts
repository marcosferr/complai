/**
 * Tipos del formato de importación (ver `backend/demo/contrato_uni_ejemplo.json`).
 * This captures the main structure: top-level `clausulas` array,
 * each `Clausula` may have `adendas`, `clausulas_pliego` and `tareas_cumplimiento`.
 */

export interface Contrato {
  clausulas: Clausula[];
}

export interface Clausula {
  titulo: string;
  contenido: string;
  /** Optional list of addenda that modify this clause */
  adendas?: Adenda[];
  /** Items coming from the pliego (tender docs) - structure not specified in example */
  clausulas_pliego?: Record<string, unknown>[];
  /** Compliance tasks related to this clause */
  tareas_cumplimiento?: TareaCumplimiento[];
}

/** Addenda can be nested in the examples, so this is recursive. */
export interface Adenda {
  titulo: string;
  contenido: string;
  /** Some addendas may themselves contain sub-adendas in the example */
  adendas?: Adenda[];
}

export interface TareaCumplimiento {
  obligacion: string;
  /** Responsible parties, when present */
  responsables?: string[];
  /** Días desde hoy hasta el vencimiento (por defecto 30) */
  dias_plazo?: number;
  prioridad?: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  /** Allow extension for other fields if present */
  [key: string]: unknown;
}

// convenience export
export type Schema = Contrato;
