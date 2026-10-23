import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import RichTextContent from './RichTextContent'

describe('RichTextContent con datos ya cargados (texto plano)', () => {
  it('muestra el texto plano conservando los saltos de linea', () => {
    const { container } = render(
      <RichTextContent value={'Primera obligacion\nSegunda obligacion'} />
    )

    expect(container.textContent).toContain('Primera obligacion')
    expect(container.textContent).toContain('Segunda obligacion')
    // Sin pre-wrap, los saltos de los registros viejos se pierden visualmente.
    expect(container.querySelector('.whitespace-pre-wrap')).not.toBeNull()
  })

  it('no interpreta como markup un texto con signos de comparacion', () => {
    const { container } = render(<RichTextContent value="plazo < 30 dias" />)

    expect(container.textContent).toBe('plazo < 30 dias')
  })
})

describe('RichTextContent con HTML del editor', () => {
  it('renderiza el formato como elementos reales', () => {
    const { container } = render(
      <RichTextContent value="<p>El proveedor <strong>debe</strong> notificar</p>" />
    )

    expect(container.querySelector('strong')).not.toBeNull()
    expect(container.querySelector('strong').textContent).toBe('debe')
  })

  it('renderiza las listas', () => {
    const { container } = render(
      <RichTextContent value="<ul><li>Entregar informe</li><li>Notificar</li></ul>" />
    )

    expect(container.querySelectorAll('li')).toHaveLength(2)
  })
})

describe('RichTextContent como defensa en profundidad', () => {
  it('no ejecuta un script aunque llegue desde la API', () => {
    const { container } = render(
      <RichTextContent value="<p>Hola</p><script>window.__hackeado = true</script>" />
    )

    expect(container.querySelector('script')).toBeNull()
    expect(window.__hackeado).toBeUndefined()
  })

  it('quita los atributos de evento', () => {
    const { container } = render(<RichTextContent value='<p onclick="robar()">Texto</p>' />)

    expect(container.querySelector('p').getAttribute('onclick')).toBeNull()
  })

  it('quita las imagenes, que no estan permitidas', () => {
    const { container } = render(<RichTextContent value="<img src=x onerror=alert(1)>" />)

    expect(container.querySelector('img')).toBeNull()
  })
})

describe('RichTextContent sin contenido', () => {
  it('muestra el texto alternativo cuando esta vacio', () => {
    render(<RichTextContent value="" emptyText="Sin descripcion" />)

    expect(screen.getByText('Sin descripcion')).toBeInTheDocument()
  })

  it('trata el markup vacio del editor como vacio', () => {
    render(<RichTextContent value="<p></p>" emptyText="Sin descripcion" />)

    expect(screen.getByText('Sin descripcion')).toBeInTheDocument()
  })
})
