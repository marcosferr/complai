import { describe, it, expect } from 'vitest'

import {
  isHtml,
  htmlToPlainText,
  truncateRich,
  isRichTextEmpty,
  toEditorHtml,
} from './richText'

describe('isHtml', () => {
  it('reconoce el HTML que produce el editor', () => {
    expect(isHtml('<p>Hola</p>')).toBe(true)
    expect(isHtml('<ul><li>Entregar informe</li></ul>')).toBe(true)
  })

  it('trata el texto plano como texto plano', () => {
    expect(isHtml('Descripcion de la obligacion')).toBe(false)
    expect(isHtml('Primera linea\nSegunda linea')).toBe(false)
  })

  it('no confunde comparaciones matematicas con etiquetas', () => {
    // Caso real: "plazo < 30 dias y monto > 1000" es texto plano.
    expect(isHtml('plazo < 30 dias y monto > 1000')).toBe(false)
  })

  it('considera vacio o nulo como texto plano', () => {
    expect(isHtml('')).toBe(false)
    expect(isHtml(null)).toBe(false)
    expect(isHtml(undefined)).toBe(false)
  })
})

describe('htmlToPlainText', () => {
  it('quita las etiquetas y deja el texto', () => {
    expect(htmlToPlainText('<p>Hola <strong>mundo</strong></p>')).toBe('Hola mundo')
  })

  it('separa los elementos de bloque en vez de pegarlos', () => {
    // Sin separador daria "EntregarNotificar", que arruina la busqueda.
    expect(htmlToPlainText('<li>Entregar</li><li>Notificar</li>')).toBe('Entregar Notificar')
  })

  it('trata el <br> como separacion', () => {
    expect(htmlToPlainText('<p>Uno<br>Dos</p>')).toBe('Uno Dos')
  })

  it('decodifica las entidades', () => {
    expect(htmlToPlainText('<p>Uno &amp; Dos</p>')).toBe('Uno & Dos')
    expect(htmlToPlainText('<p>a&nbsp;b</p>')).toBe('a b')
    expect(htmlToPlainText('<p>&lt;etiqueta&gt;</p>')).toBe('<etiqueta>')
  })

  it('deja el texto plano preexistente utilizable', () => {
    expect(htmlToPlainText('Primera linea\nSegunda linea')).toBe('Primera linea Segunda linea')
  })

  it('devuelve cadena vacia para vacio o nulo', () => {
    expect(htmlToPlainText('')).toBe('')
    expect(htmlToPlainText(null)).toBe('')
  })
})

describe('truncateRich', () => {
  it('corta sobre el texto, nunca a la mitad de una etiqueta', () => {
    const resultado = truncateRich('<p>El proveedor debe entregar el informe mensual</p>', 12)

    expect(resultado).toBe('El proveedor...')
    expect(resultado).not.toContain('<')
  })

  it('no agrega puntos suspensivos si entra completo', () => {
    expect(truncateRich('<p>Corto</p>', 100)).toBe('Corto')
  })

  it('funciona con el texto plano ya cargado', () => {
    expect(truncateRich('abcdefghij', 4)).toBe('abcd...')
  })

  it('devuelve cadena vacia para vacio o nulo', () => {
    expect(truncateRich(null, 10)).toBe('')
  })
})

describe('isRichTextEmpty', () => {
  it('detecta el markup vacio que manda un editor sin texto', () => {
    expect(isRichTextEmpty('<p></p>')).toBe(true)
    expect(isRichTextEmpty('<p><br></p>')).toBe(true)
    expect(isRichTextEmpty('<p>&nbsp;</p>')).toBe(true)
  })

  it('reconoce contenido real', () => {
    expect(isRichTextEmpty('<ul><li>Entregar informe</li></ul>')).toBe(false)
    expect(isRichTextEmpty('texto plano')).toBe(false)
  })

  it('trata vacio y nulo como vacio', () => {
    expect(isRichTextEmpty('')).toBe(true)
    expect(isRichTextEmpty(null)).toBe(true)
  })
})

describe('toEditorHtml', () => {
  it('deja pasar el HTML del editor sin tocarlo', () => {
    const html = '<ul><li>Entregar informe</li></ul>'

    expect(toEditorHtml(html)).toBe(html)
  })

  it('convierte cada linea del texto plano viejo en un parrafo', () => {
    // Sin esto, al editar una obligacion vieja se perderian los saltos.
    expect(toEditorHtml('Primera linea\nSegunda linea')).toBe(
      '<p>Primera linea</p><p>Segunda linea</p>'
    )
  })

  it('escapa el texto plano para que no se interprete como markup', () => {
    expect(toEditorHtml('plazo < 30 & monto > 100')).toBe(
      '<p>plazo &lt; 30 &amp; monto &gt; 100</p>'
    )
  })

  it('ignora las lineas vacias intermedias', () => {
    expect(toEditorHtml('Uno\n\nDos')).toBe('<p>Uno</p><p>Dos</p>')
  })

  it('devuelve cadena vacia para vacio o nulo', () => {
    expect(toEditorHtml('')).toBe('')
    expect(toEditorHtml(null)).toBe('')
  })
})
