import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { VirtualChunk } from './VirtualChunk'

type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void
const observers: { cb: Callback; targets: Element[] }[] = []

class FakeObserver {
  entry: { cb: Callback; targets: Element[] }
  constructor(cb: Callback) {
    this.entry = { cb, targets: [] }
    observers.push(this.entry)
  }
  observe(el: Element) {
    this.entry.targets.push(el)
  }
  disconnect() {
    this.entry.targets = []
  }
  unobserve() {}
}

const original = window.IntersectionObserver
beforeEach(() => {
  observers.length = 0
  window.IntersectionObserver = FakeObserver as unknown as typeof IntersectionObserver
})
afterEach(() => {
  window.IntersectionObserver = original
})

function fire(visible: boolean) {
  act(() => observers.forEach((o) => o.targets.forEach((t) => o.cb([{ target: t, isIntersecting: visible }]))))
}

describe('pencereleme parçası', () => {
  it('görünür parça içeriği basar; görünümden çıkınca içerik DOM\'dan kalkar, yer tutucu yüksekliği korur; dönünce geri gelir', () => {
    render(<VirtualChunk estimate={300}><p>içerik</p></VirtualChunk>)
    expect(screen.getByText('içerik')).toBeInTheDocument()
    fire(false)
    expect(screen.queryByText('içerik')).toBeNull()
    expect(document.querySelector('[data-virtual-placeholder]')).not.toBeNull()
    expect((document.querySelector('[data-virtual-placeholder]') as HTMLElement).style.height).toBe('300px')
    fire(true)
    expect(screen.getByText('içerik')).toBeInTheDocument()
  })

  it('IntersectionObserver yoksa (eski ortam) her zaman içerik basar', () => {
    // @ts-expect-error test: gözlemci yok
    delete window.IntersectionObserver
    render(<VirtualChunk estimate={300}><p>içerik</p></VirtualChunk>)
    expect(screen.getByText('içerik')).toBeInTheDocument()
  })

  it('tablo kipinde yer tutucu tbody içinde tr olarak basılır', () => {
    render(<table><VirtualChunk kind="table" colSpan={4} estimate={200}><tr><td>satır</td></tr></VirtualChunk></table>)
    fire(false)
    const body = document.querySelector('tbody[data-virtual-chunk]')!
    expect(body.querySelector('tr td[colspan="4"]')).not.toBeNull()
  })
})
