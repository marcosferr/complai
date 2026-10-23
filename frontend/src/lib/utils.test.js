import { describe, it, expect } from 'vitest'
import { buildDownloadFilename, getClauseTerm } from './utils'

describe('getClauseTerm', () => {
  it('usa "artículo" para leyes y regulaciones', () => {
    expect(getClauseTerm('LEYES_REGULACIONES')).toBe('artículo')
  })

  it('usa "cláusula" para el resto de los tipos', () => {
    expect(getClauseTerm('CONTRATO')).toBe('cláusula')
  })
})

describe('buildDownloadFilename', () => {
  it('reemplaza el nombre UUID del almacenamiento por el título del documento', () => {
    expect(
      buildDownloadFilename(
        'Contrato de Servicios',
        '/media/documents/6f1c2b8e-1f5a-4d6e-9a1e-6c0a0c2b1d33.pdf'
      )
    ).toBe('Contrato de Servicios.pdf')
  })

  it('conserva la extensión real, no asume PDF', () => {
    expect(buildDownloadFilename('Pliego PBC', 'a1b2c3.DOCX')).toBe('Pliego PBC.docx')
  })

  it('quita los caracteres que no se pueden usar en un nombre de archivo', () => {
    expect(buildDownloadFilename('Adenda 3/2024: "ampliación"', 'x.pdf'))
      .toBe('Adenda 3 2024 ampliación.pdf')
  })

  it('colapsa espacios y recorta títulos muy largos', () => {
    const nombre = buildDownloadFilename('A'.repeat(200), 'x.pdf')
    expect(nombre.endsWith('.pdf')).toBe(true)
    expect(nombre.length).toBeLessThanOrEqual(124)
  })

  it('cae en un nombre genérico si el título está vacío', () => {
    expect(buildDownloadFilename('   ', 'x.pdf')).toBe('documento.pdf')
    expect(buildDownloadFilename(null, 'x.pdf')).toBe('documento.pdf')
  })

  it('devuelve el nombre sin extensión cuando el archivo no tiene una reconocible', () => {
    expect(buildDownloadFilename('Acta', 'archivo-sin-extension')).toBe('Acta')
  })

  it('no confunde un punto de la ruta con una extensión', () => {
    expect(buildDownloadFilename('Acta', '/media/v1.2/archivo')).toBe('Acta')
  })

  it('funciona sin nombre almacenado', () => {
    expect(buildDownloadFilename('Acta', null)).toBe('Acta')
  })
})
