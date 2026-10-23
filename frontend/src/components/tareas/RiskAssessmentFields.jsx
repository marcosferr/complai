import React from 'react'

export const PRIORIDAD_OPTIONS = [
  {
    value: 'BAJA',
    label: 'Baja',
    description: 'Puede planificarse dentro del calendario regular sin riesgo significativo a corto plazo.',
    tone: 'slate',
  },
  {
    value: 'MEDIA',
    label: 'Media',
    description: 'Debe ejecutarse dentro del plazo establecido, sin riesgo inmediato, pero con consecuencias relevantes si se retrasa.',
    tone: 'blue',
  },
  {
    value: 'ALTA',
    label: 'Alta',
    description: 'Requiere atención inmediata. Tiene vencimiento próximo o riesgo alto de sanción si no se cumple.',
    tone: 'orange',
  },
  {
    value: 'CRITICA',
    label: 'Crítica',
    description: 'Requiere atención inmediata y priorización absoluta por su severidad o cercanía del vencimiento.',
    tone: 'red',
  },
]

export const IMPACTO_OPTIONS = [
  {
    value: 'BAJO',
    label: 'Bajo',
    description: 'Impacto limitado, subsanable sin consecuencias estructurales.',
    tone: 'green',
  },
  {
    value: 'MEDIO',
    label: 'Medio',
    description: 'Genera costos adicionales, observaciones formales o ajustes operativos moderados.',
    tone: 'orange',
  },
  {
    value: 'ALTO',
    label: 'Alto',
    description: 'Puede generar multas relevantes, suspensión de obligaciones contractuales, pérdida de ingresos o daño institucional significativo.',
    tone: 'red',
  },
]

export const PROBABILIDAD_OPTIONS = [
  {
    value: 'BAJA',
    label: 'Baja',
    description: 'Existen controles robustos y antecedentes de cumplimiento consistente.',
    tone: 'green',
  },
  {
    value: 'MEDIA',
    label: 'Media',
    description: 'El proceso tiene controles definidos, pero presenta puntos vulnerables.',
    tone: 'orange',
  },
  {
    value: 'ALTA',
    label: 'Alta',
    description: 'Existen antecedentes de incumplimientos o el proceso depende de múltiples variables críticas.',
    tone: 'red',
  },
]

const toneStyles = {
  slate: {
    selected: 'border-slate-400 bg-slate-50 text-slate-800 dark:border-slate-500 dark:bg-slate-900/40 dark:text-slate-200',
    icon: 'text-slate-500 dark:text-slate-300',
  },
  blue: {
    selected: 'border-blue-400 bg-blue-50 text-blue-800 dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-200',
    icon: 'text-blue-500 dark:text-blue-300',
  },
  green: {
    selected: 'border-green-400 bg-green-50 text-green-800 dark:border-green-500 dark:bg-green-900/30 dark:text-green-200',
    icon: 'text-green-500 dark:text-green-300',
  },
  orange: {
    selected: 'border-orange-400 bg-orange-50 text-orange-800 dark:border-orange-500 dark:bg-orange-900/30 dark:text-orange-200',
    icon: 'text-orange-500 dark:text-orange-300',
  },
  red: {
    selected: 'border-red-400 bg-red-50 text-red-800 dark:border-red-500 dark:bg-red-900/30 dark:text-red-200',
    icon: 'text-red-500 dark:text-red-300',
  },
}

const defaultCardClass = 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:border-gray-500'

const getOptionStyles = (option, isSelected) => {
  const tone = toneStyles[option.tone] || toneStyles.blue

  return {
    container: isSelected ? tone.selected : defaultCardClass,
    icon: tone.icon,
  }
}

export const getOptionMeta = (options, value) => options.find((option) => option.value === value) || null

export function AssessmentOptionGroup({ label, name, value, options, onChange, helperText }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {options.map((option) => {
          const isSelected = option.value === value
          const styles = getOptionStyles(option, isSelected)

          return (
            <label
              key={option.value}
              className={`relative group rounded-lg border p-3 cursor-pointer transition-colors ${styles.container}`}
              title={option.description}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={isSelected}
                onChange={() => onChange(name, option.value)}
                className="sr-only"
              />
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold">{option.label}</span>
                <span className={`material-icons text-sm ${styles.icon}`}>info</span>
              </div>
              <p className="mt-1 text-xs opacity-80 line-clamp-2">
                {option.description}
              </p>
              <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 hidden w-72 max-w-[calc(100vw-2rem)] rounded-lg bg-gray-900 px-3 py-2 text-xs leading-5 text-white shadow-lg group-hover:block group-focus-within:block dark:bg-gray-100 dark:text-gray-900">
                {option.description}
              </div>
            </label>
          )
        })}
      </div>
      {helperText && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          {helperText}
        </p>
      )}
    </div>
  )
}

export function RiskMultiSelectField({ levels, selectedIds, onToggle, onManage }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2 gap-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Niveles de Riesgo
        </label>
        <button
          type="button"
          onClick={onManage}
          className="p-1 text-primary hover:text-primary/80 transition-colors"
          title="Gestionar niveles de riesgo"
        >
          <span className="material-icons text-sm">add_circle</span>
        </button>
      </div>

      {levels.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {levels.map((nivel) => {
            const isSelected = selectedIds.includes(nivel.id)

            return (
              <button
                key={nivel.id}
                type="button"
                onClick={() => onToggle(nivel.id)}
                className={`relative group rounded-lg border p-3 text-left transition-colors ${isSelected
                  ? 'border-red-300 bg-red-50 text-red-900 dark:border-red-600 dark:bg-red-900/30 dark:text-red-100'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:border-gray-500'
                  }`}
                title={nivel.descripcion || 'Nivel de riesgo'}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{nivel.nombre}</p>
                    <p className="mt-1 text-xs opacity-80 line-clamp-2">
                      {nivel.descripcion || 'Sin descripción'}
                    </p>
                  </div>
                  <span className="material-icons text-sm text-red-500 dark:text-red-300">
                    {isSelected ? 'check_circle' : 'info'}
                  </span>
                </div>
                <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 hidden w-80 max-w-[calc(100vw-2rem)] rounded-lg bg-gray-900 px-3 py-2 text-xs leading-5 text-white shadow-lg group-hover:block group-focus:block dark:bg-gray-100 dark:text-gray-900">
                  {nivel.descripcion || 'Sin descripción'}
                </div>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
          No hay niveles de riesgo disponibles.
        </div>
      )}

      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        Selecciona uno o más riesgos asociados a esta obligación.
      </p>
    </div>
  )
}
