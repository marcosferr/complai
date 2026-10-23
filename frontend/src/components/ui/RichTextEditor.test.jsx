import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import RichTextEditor from './RichTextEditor'

const noop = () => {}

describe('RichTextEditor', () => {
  it('muestra el contenido enriquecido que recibe', async () => {
    const { container } = render(
      <RichTextEditor value="<p>El proveedor <strong>debe</strong> notificar</p>" onChange={noop} />
    )

    expect(await screen.findByText('notificar', { exact: false })).toBeInTheDocument()
    expect(container.querySelector('strong')).not.toBeNull()
  })

  it('carga una descripcion vieja de texto plano conservando las lineas', async () => {
    const { container } = render(
      <RichTextEditor value={'Primera obligacion\nSegunda obligacion'} onChange={noop} />
    )

    await screen.findByText('Primera obligacion')
    // Cada linea tiene que quedar en su propio parrafo, no todo pegado.
    expect(container.querySelectorAll('.ProseMirror p').length).toBeGreaterThanOrEqual(2)
  })

  it('ofrece los controles de formato basicos', () => {
    render(<RichTextEditor value="" onChange={noop} />)

    expect(screen.getByRole('button', { name: /negrita/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cursiva/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /vi.eta/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /numerada/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /enlace/i })).toBeInTheDocument()
  })

  it('expone el area editable con el placeholder', () => {
    const { container } = render(
      <RichTextEditor value="" onChange={noop} placeholder="Descripcion detallada..." />
    )

    const editable = container.querySelector('[contenteditable="true"]')
    expect(editable).not.toBeNull()
    expect(container.querySelector('[data-placeholder]')).not.toBeNull()
  })

  it('marca el area como solo lectura cuando corresponde', () => {
    const { container } = render(<RichTextEditor value="<p>x</p>" onChange={noop} disabled />)

    expect(container.querySelector('[contenteditable="false"]')).not.toBeNull()
  })
})
