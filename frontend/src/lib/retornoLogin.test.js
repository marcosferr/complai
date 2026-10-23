import { describe, expect, it } from 'vitest'
import { normalizarRetorno, retornoDesdeState } from './retornoLogin'

describe('normalizarRetorno', () => {
  it('acepta una ruta profunda con query y hash', () => {
    expect(normalizarRetorno('/detalle/42?tab=uno#nota')).toBe('/detalle/42?tab=uno#nota')
  })

  it('descarta el home: ya es el destino por defecto', () => {
    expect(normalizarRetorno('/')).toBeNull()
  })

  it('descarta /login y sus hijas para no armar un bucle', () => {
    expect(normalizarRetorno('/login')).toBeNull()
    expect(normalizarRetorno('/logout')).toBeNull()
    expect(normalizarRetorno('/reset-password/abc/def')).toBeNull()
  })

  it('rechaza URLs absolutas y protocol-relative', () => {
    expect(normalizarRetorno('https://evil.com/x')).toBeNull()
    expect(normalizarRetorno('//evil.com/x')).toBeNull()
    expect(normalizarRetorno('/\\evil.com')).toBeNull()
    expect(normalizarRetorno('javascript:alert(1)')).toBeNull()
    expect(normalizarRetorno('detalle/42')).toBeNull()
  })

  it('rechaza caracteres de control', () => {
    expect(normalizarRetorno('/detalle\r\nSet-Cookie: a=b')).toBeNull()
    expect(normalizarRetorno(`/detalle${String.fromCharCode(0)}42`)).toBeNull()
  })


  it('rechaza rutas absurdamente largas', () => {
    expect(normalizarRetorno(`/${'a'.repeat(600)}`)).toBeNull()
  })

  it('tolera basura', () => {
    expect(normalizarRetorno(null)).toBeNull()
    expect(normalizarRetorno(undefined)).toBeNull()
    expect(normalizarRetorno('')).toBeNull()
    expect(normalizarRetorno(42)).toBeNull()
  })
})


describe('retornoDesdeState', () => {
  it('lee lo que dejó el guard', () => {
    expect(retornoDesdeState({ from: { pathname: '/detalle/7', search: '?q=1', hash: '' } })).toBe(
      '/detalle/7?q=1',
    )
  })

  it('devuelve null si no hay state', () => {
    expect(retornoDesdeState(null)).toBeNull()
    expect(retornoDesdeState(undefined)).toBeNull()
    expect(retornoDesdeState({})).toBeNull()
    expect(retornoDesdeState({ from: {} })).toBeNull()
  })
})
