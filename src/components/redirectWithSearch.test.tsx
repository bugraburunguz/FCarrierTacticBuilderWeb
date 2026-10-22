import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { LegacySquadRedirect, RedirectWithSearch } from './RedirectWithSearch'

function Where() {
  const location = useLocation()
  return <p data-testid="where">{location.pathname}{location.search}</p>
}

describe('eski /squad → /career/squad (FAZ 3, sekme eşlemesiyle)', () => {
  it.each([
    ['/squad?sekme=saha', '/career/squad'],
    ['/squad?sekme=oyuncular', '/career/squad?sekme=liste'],
    ['/squad?sekme=kariyer', '/career/dashboard?sekme=ayarlar'],
  ])('%s → %s', (from, to) => {
    render(
      <MemoryRouter initialEntries={[from]}>
        <Routes>
          <Route path="/squad" element={<LegacySquadRedirect />} />
          <Route path="/career/squad" element={<Where />} />
          <Route path="/career/dashboard" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByTestId('where').textContent).toBe(to)
  })
})

describe('RedirectWithSearch (15 §3)', () => {
  it.each([
    ['/career/desk', '/career/dashboard'],
    ['/career/desk?sekme=ayarlar', '/career/dashboard?sekme=ayarlar'],
  ])('%s → %s', (from, to) => {
    render(
      <MemoryRouter initialEntries={[from]}>
        <Routes>
          <Route path="/career/desk" element={<RedirectWithSearch to="/career/dashboard" />} />
          <Route path="/career/dashboard" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByTestId('where').textContent).toBe(to)
  })
})
