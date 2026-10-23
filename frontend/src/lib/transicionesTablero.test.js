import { describe, it, expect } from 'vitest'
import {
  puedeSoltarEn,
  destinosPermitidos,
  aplicarMovimiento,
  reemplazarTarea,
  mensajeDeError,
  ETAPA_DE_ESTADO,
} from './transicionesTablero'

// Lo que el backend devuelve en `estados_disponibles` para cada rol en cada etapa
// (backend/apps/tareas/transiciones.py).
const INICIO_RESPONSABLE = [
  ['PENDIENTE', 'Pendiente'],
  ['EN_PROGRESO', 'En Progreso'],
  ['REQUIERE_ATENCION', 'Requiere Atención'],
]
const INICIO_GERENTE = [...INICIO_RESPONSABLE, ['OBSERVADO_GERENTE', 'Devuelto con Observaciones del Gerente']]
const TODOS = Object.keys(ETAPA_DE_ESTADO).map((codigo) => [codigo, codigo])

const tareaInicio = (extra = {}) => ({
  id: 7,
  etapa_actual: 'INICIO',
  estado_etapa: 'PENDIENTE',
  area: 3,
  responsables: [10],
  estados_disponibles: INICIO_RESPONSABLE,
  ...extra,
})

const responsable = { id: 10, role: 'RESPONSABLE', area: 3 }
const otroResponsable = { id: 11, role: 'RESPONSABLE', area: 3 }
const gerente = { id: 20, role: 'GERENTE', area: 3 }
const gerenteAjeno = { id: 21, role: 'GERENTE', area: 4 }
const analista = { id: 30, role: 'ANALISTA_COMPLIANCE', area: 3 }
const oficial = { id: 40, role: 'OFICIAL_COMPLIANCE', area: null }

describe('puedeSoltarEn', () => {
  it('el responsable asignado mueve dentro de su etapa', () => {
    expect(puedeSoltarEn(tareaInicio(), 'EN_PROGRESO', responsable)).toBe(true)
    expect(puedeSoltarEn(tareaInicio(), 'REQUIERE_ATENCION', responsable)).toBe(true)
  })

  it('soltar en la misma columna no es un movimiento', () => {
    expect(puedeSoltarEn(tareaInicio(), 'PENDIENTE', responsable)).toBe(false)
  })

  it('no ofrece estados que el servidor no listó para ese usuario', () => {
    expect(puedeSoltarEn(tareaInicio(), 'OBSERVADO_GERENTE', responsable)).toBe(false)
  })

  it('no deja saltar de etapa a quien no es Oficial', () => {
    expect(puedeSoltarEn(tareaInicio(), 'VALIDADO_GERENTE', responsable)).toBe(false)
    expect(puedeSoltarEn(tareaInicio(), 'APROBADO_AUTORIDAD', responsable)).toBe(false)
  })

  it('el responsable no asignado no mueve la tarea', () => {
    expect(puedeSoltarEn(tareaInicio(), 'EN_PROGRESO', otroResponsable)).toBe(false)
  })

  it('compara ids aunque lleguen como texto', () => {
    const tarea = tareaInicio({ responsables: ['10'] })
    expect(puedeSoltarEn(tarea, 'EN_PROGRESO', responsable)).toBe(true)
  })

  it('el gerente mueve las de su área y no las de otra', () => {
    const tarea = tareaInicio({ estados_disponibles: INICIO_GERENTE })
    expect(puedeSoltarEn(tarea, 'OBSERVADO_GERENTE', gerente)).toBe(true)
    expect(puedeSoltarEn(tarea, 'OBSERVADO_GERENTE', gerenteAjeno)).toBe(false)
  })

  it('el gerente no mueve una tarea sin área', () => {
    const tarea = tareaInicio({ estados_disponibles: INICIO_GERENTE, area: null })
    expect(puedeSoltarEn(tarea, 'EN_PROGRESO', gerente)).toBe(false)
  })

  it('el analista no mueve tareas en la etapa de inicio aunque la lista diga otra cosa', () => {
    expect(puedeSoltarEn(tareaInicio(), 'EN_PROGRESO', analista)).toBe(false)
  })

  it('el analista mueve en revisión gerencial y en su propia etapa', () => {
    const revision = {
      ...tareaInicio(),
      etapa_actual: 'REVISION_GERENCIAL',
      estado_etapa: 'REVISION_GERENCIAL',
      estados_disponibles: [['REVISION_GERENCIAL', ''], ['VALIDADO_GERENTE', ''], ['OBSERVADO_ANALISTA', '']],
    }
    expect(puedeSoltarEn(revision, 'OBSERVADO_ANALISTA', analista)).toBe(true)
  })

  it('el Oficial puede soltar en cualquier columna, incluso de otra etapa', () => {
    const tarea = tareaInicio({ estados_disponibles: TODOS })
    expect(puedeSoltarEn(tarea, 'APROBADO_AUTORIDAD', oficial)).toBe(true)
    expect(puedeSoltarEn(tarea, 'OBSERVADO_GERENTE', oficial)).toBe(true)
  })

  it('sin usuario, sin tarea o sin estados disponibles no se mueve nada', () => {
    expect(puedeSoltarEn(tareaInicio(), 'EN_PROGRESO', null)).toBe(false)
    expect(puedeSoltarEn(null, 'EN_PROGRESO', responsable)).toBe(false)
    expect(puedeSoltarEn(tareaInicio({ estados_disponibles: [] }), 'EN_PROGRESO', responsable)).toBe(false)
    expect(puedeSoltarEn(tareaInicio({ estados_disponibles: undefined }), 'EN_PROGRESO', responsable)).toBe(false)
  })
})

describe('destinosPermitidos', () => {
  it('filtra las columnas visibles', () => {
    const columnas = ['PENDIENTE', 'EN_PROGRESO', 'REQUIERE_ATENCION', 'OBSERVADO_GERENTE']
    expect(destinosPermitidos(tareaInicio(), responsable, columnas)).toEqual([
      'EN_PROGRESO',
      'REQUIERE_ATENCION',
    ])
  })

  it('sin destinos, la tarjeta no se arrastra', () => {
    expect(destinosPermitidos(tareaInicio(), otroResponsable, ['EN_PROGRESO'])).toEqual([])
  })
})

describe('aplicarMovimiento y reemplazarTarea', () => {
  const tareas = [tareaInicio(), tareaInicio({ id: 8 })]

  it('cambia estado y etapa de la tarea movida sin tocar la lista original', () => {
    const movidas = aplicarMovimiento(tareas, 7, 'VALIDADA')
    expect(movidas[0]).toMatchObject({ id: 7, estado_etapa: 'VALIDADA', etapa_actual: 'CONTROL_OFICIAL' })
    expect(movidas[1]).toBe(tareas[1])
    expect(tareas[0].estado_etapa).toBe('PENDIENTE')
  })

  it('deshacer restaura solo la tarea que falló', () => {
    const movidas = aplicarMovimiento(aplicarMovimiento(tareas, 7, 'EN_PROGRESO'), 8, 'EN_PROGRESO')
    const deshechas = reemplazarTarea(movidas, tareas[0])
    expect(deshechas[0].estado_etapa).toBe('PENDIENTE')
    expect(deshechas[1].estado_etapa).toBe('EN_PROGRESO')
  })
})

describe('mensajeDeError', () => {
  it('muestra el mensaje del servidor', () => {
    const error = { response: { status: 400, data: { error: 'Ese estado corresponde a otra etapa.' } } }
    expect(mensajeDeError(error)).toBe('Ese estado corresponde a otra etapa.')
  })

  it('usa detail cuando es lo que manda el servidor', () => {
    const error = { response: { status: 403, data: { detail: 'No tiene permiso.' } } }
    expect(mensajeDeError(error)).toBe('No tiene permiso.')
  })

  it('sin respuesta, habla de la conexión', () => {
    expect(mensajeDeError(new Error('Network Error'))).toMatch(/conexión/)
  })

  it('con una respuesta sin mensaje, da uno genérico', () => {
    expect(mensajeDeError({ response: { status: 500, data: '<html>' } })).toBe(
      'No se pudo cambiar el estado de la obligación.'
    )
  })
})
