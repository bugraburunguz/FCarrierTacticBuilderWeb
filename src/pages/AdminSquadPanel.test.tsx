import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, request } from '../api/client'
import type { BaseImportResult, SquadVersion } from '../api/types'
import { gzipFile, trimBaseLog } from '../lib/leLogTrim'
import { AdminSquadPanel } from './AdminSquadPanel'

vi.mock('../api/client', async (orig) => {
  const actual = await orig<typeof import('../api/client')>()
  const request = vi.fn()
  return { ...actual, request, api: { ...actual.api, get: (path: string, query?: unknown) => request(path, { query }) } }
})
vi.mock('../lib/leLogTrim', async (orig) => ({ ...(await orig<object>()), gzipFile: vi.fn(), trimBaseLog: vi.fn() }))

const VERSIONS: SquadVersion[] = [
  { id: 2, versionNo: 2, label: 'Kadro güncellemesi 20.11.2026', gameBuild: '1.2.3', exportedAt: '2026-11-20T10:00:00Z', playerCount: 18234, latest: true },
  { id: 1, versionNo: 1, label: 'Çıkış kadrosu', gameBuild: null, exportedAt: null, playerCount: 18000, latest: false },
]

const RESULT: BaseImportResult = {
  playersInFile: 18300, existing: 18000, created: 120, skippedNoTeam: 3, skippedNoPosition: 0, nationalitiesCreated: 0, clubsCreated: 1, leaguesCreated: 0,
  updated: 4521, changesRecorded: 4521, squadVersionId: 3, squadVersionNo: 3, archivedPlayers: 18000,
}

interface Deferred<T> { promise: Promise<T>; resolve: (value: T) => void; reject: (error: unknown) => void }
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

let importCall: () => Promise<unknown>
let versionCalls = 0

beforeEach(() => {
  versionCalls = 0
  importCall = () => Promise.resolve(RESULT)
  vi.mocked(request).mockReset().mockImplementation((path: string) => {
    if (path === '/squad-versions') {
      versionCalls += 1
      return Promise.resolve(VERSIONS)
    }
    if (path === '/admin/ingestion/import-base') {
      return importCall()
    }
    return Promise.reject(new Error(`beklenmeyen ${path}`))
  })
  vi.mocked(gzipFile).mockReset().mockImplementation(async (file: File) => new File(['gz'], `${file.name}.gz`, { type: 'application/gzip' }))
  vi.mocked(trimBaseLog).mockReset().mockImplementation(async (file: File) => file)
})

const renderPanel = (onBusyChange?: (busy: boolean) => void) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AdminSquadPanel onBusyChange={onBusyChange} /></QueryClientProvider>)

function choose(file: File, label?: string) {
  fireEvent.change(screen.getByLabelText('Log dosyası'), { target: { files: [file] } })
  if (label !== undefined) {
    fireEvent.change(screen.getByLabelText('Etiket (isteğe bağlı)'), { target: { value: label } })
  }
}

const importArgs = () => vi.mocked(request).mock.calls.find(([path]) => path === '/admin/ingestion/import-base')

describe('Admin · Kadro yükle (FCA-32)', () => {
  it('AC-2: dosya seçici .log/.txt/.gz kabul eder; etiket isteğe bağlı; dosya yokken Yükle kilitli', () => {
    renderPanel()
    expect(screen.getByLabelText('Log dosyası')).toHaveAttribute('accept', '.log,.txt,.gz')
    expect(screen.getByLabelText('Etiket (isteğe bağlı)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Yükle' })).toBeDisabled()
  })

  it('AC-2: Yükle önce onay ister; onaysız istek gitmez, Vazgeç onayı kapatır', () => {
    renderPanel()
    choose(new File(['log'], 'base.log'))
    fireEvent.click(screen.getByRole('button', { name: 'Yükle' }))
    expect(screen.getByText('Yeni kadro sürümü açılır; mevcut kariyerler eski sürümde kalır.')).toBeInTheDocument()
    expect(importArgs()).toBeUndefined()
    fireEvent.click(screen.getByRole('button', { name: 'Vazgeç' }))
    expect(screen.queryByText('Yeni kadro sürümü açılır; mevcut kariyerler eski sürümde kalır.')).toBeNull()
    expect(importArgs()).toBeUndefined()
  })

  it('AC-2: onayla dosya gzip\'lenip overwrite=true&full=true ile multipart log + label olarak gider', async () => {
    renderPanel()
    const file = new File(['ana menü logu'], 'base.log')
    choose(file, 'Kasım güncellemesi')
    fireEvent.click(screen.getByRole('button', { name: 'Yükle' }))
    fireEvent.click(screen.getByRole('button', { name: 'Onayla' }))
    await screen.findByText('Sürüm 3 açıldı.')
    expect(gzipFile).toHaveBeenCalledWith(file)
    const [, options] = importArgs()!
    expect(options).toMatchObject({ method: 'POST', query: { overwrite: true, full: true } })
    const form = options!.body as FormData
    expect(form).toBeInstanceOf(FormData)
    expect((form.get('log') as File).name).toBe('base.log.gz')
    expect(form.get('label')).toBe('Kasım güncellemesi')
  })

  it('AC-2: etiket boşsa label alanı gönderilmez', async () => {
    renderPanel()
    choose(new File(['x'], 'base.txt'))
    fireEvent.click(screen.getByRole('button', { name: 'Yükle' }))
    fireEvent.click(screen.getByRole('button', { name: 'Onayla' }))
    await screen.findByText('Sürüm 3 açıldı.')
    expect((importArgs()![1]!.body as FormData).has('label')).toBe(false)
  })

  it.each([
    ['ad .gz ile bitiyor', new File(['x'], 'base.log.gz')],
    ['gzip sihirli baytları', new File([new Uint8Array([0x1f, 0x8b, 0x08, 0x00])], 'base.log')],
  ])('AC-2: dosya zaten gzip ise (%s) olduğu gibi gider', async (_case, file) => {
    renderPanel()
    choose(file)
    fireEvent.click(screen.getByRole('button', { name: 'Yükle' }))
    fireEvent.click(screen.getByRole('button', { name: 'Onayla' }))
    await screen.findByText('Sürüm 3 açıldı.')
    expect(gzipFile).not.toHaveBeenCalled()
    expect((importArgs()![1]!.body as FormData).get('log')).toBe(file)
  })

  it('AC-3: sürerken düğme kilitli ve durum metni (Sıkıştırılıyor…, Yükleniyor…); sonuçta sürüm no, arşivlenen, eklenen/güncellenen', async () => {
    const gz = deferred<File>()
    const upload = deferred<BaseImportResult>()
    vi.mocked(gzipFile).mockReturnValue(gz.promise)
    importCall = () => upload.promise
    renderPanel()
    choose(new File(['x'], 'base.log'))
    fireEvent.click(screen.getByRole('button', { name: 'Yükle' }))
    fireEvent.click(screen.getByRole('button', { name: 'Onayla' }))
    expect(await screen.findByText('Sıkıştırılıyor…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Yükle' })).toBeDisabled()
    gz.resolve(new File(['gz'], 'base.log.gz'))
    expect(await screen.findByText('Yükleniyor…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Yükle' })).toBeDisabled()
    upload.resolve(RESULT)
    const result = await screen.findByRole('region', { name: 'Yükleme sonucu' })
    expect(within(result).getByText('Sürüm 3 açıldı.')).toBeInTheDocument()
    expect(result).toHaveTextContent('Arşivlenen oyuncu18.000')
    expect(result).toHaveTextContent('Eklenen120')
    expect(result).toHaveTextContent('Güncellenen4.521')
    expect(screen.queryByText('Yükleniyor…')).toBeNull()
  })

  it('AC-3: sürüm açılmadıysa (squadVersionId null) "Değişiklik yok; yeni sürüm açılmadı."', async () => {
    importCall = () => Promise.resolve({ ...RESULT, squadVersionId: null, squadVersionNo: null, archivedPlayers: 0, updated: 0, created: 0 })
    renderPanel()
    choose(new File(['x'], 'base.log'))
    fireEvent.click(screen.getByRole('button', { name: 'Yükle' }))
    fireEvent.click(screen.getByRole('button', { name: 'Onayla' }))
    expect(await screen.findByText('Değişiklik yok; yeni sürüm açılmadı.')).toBeInTheDocument()
    expect(screen.queryByText(/Sürüm \d+ açıldı/)).toBeNull()
  })

  it('AC-3: hata metni aria-live bölgesinde; düğme yeniden açılır', async () => {
    importCall = () => Promise.reject(new ApiError('Dosya çok büyük', 'common.payload_too_large', 413))
    renderPanel()
    choose(new File(['x'], 'base.log'))
    fireEvent.click(screen.getByRole('button', { name: 'Yükle' }))
    fireEvent.click(screen.getByRole('button', { name: 'Onayla' }))
    const message = await screen.findByText('Dosya çok büyük')
    expect(message.closest('[aria-live]')).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Yükle' })).toBeEnabled()
  })

  it('ham log son BASE export\'una kırpılıp gzip\'lenir; .gz dosya kırpılmaz', async () => {
    const trimmed = new File(['son base'], 'base.log')
    vi.mocked(trimBaseLog).mockResolvedValue(trimmed)
    renderPanel()
    const file = new File(['iki base'], 'base.log')
    choose(file)
    fireEvent.click(screen.getByRole('button', { name: 'Yükle' }))
    fireEvent.click(screen.getByRole('button', { name: 'Onayla' }))
    await screen.findByText('Sürüm 3 açıldı.')
    expect(trimBaseLog).toHaveBeenCalledWith(file)
    expect(gzipFile).toHaveBeenCalledWith(trimmed)
  })

  it('.gz dosya için kırpma çağrılmaz', async () => {
    renderPanel()
    choose(new File(['x'], 'base.log.gz'))
    fireEvent.click(screen.getByRole('button', { name: 'Yükle' }))
    fireEvent.click(screen.getByRole('button', { name: 'Onayla' }))
    await screen.findByText('Sürüm 3 açıldı.')
    expect(trimBaseLog).not.toHaveBeenCalled()
  })

  it('logda BASE export\'u yoksa hata gösterilir, istek gitmez', async () => {
    vi.mocked(trimBaseLog).mockRejectedValue(new Error('Logda ana menü (BASE) export\'u yok'))
    renderPanel()
    choose(new File(['kariyer'], 'kariyer.log'))
    fireEvent.click(screen.getByRole('button', { name: 'Yükle' }))
    fireEvent.click(screen.getByRole('button', { name: 'Onayla' }))
    const message = await screen.findByText('Logda ana menü (BASE) export\'u yok')
    expect(message.closest('[aria-live]')).not.toBeNull()
    expect(importArgs()).toBeUndefined()
    expect(gzipFile).not.toHaveBeenCalled()
  })

  it('odak: onay açılınca Onayla\'ya, Vazgeç ile Yükle\'ye döner', () => {
    renderPanel()
    choose(new File(['x'], 'base.log'))
    fireEvent.click(screen.getByRole('button', { name: 'Yükle' }))
    expect(screen.getByRole('button', { name: 'Onayla' })).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Vazgeç' }))
    expect(screen.getByRole('button', { name: 'Yükle' })).toHaveFocus()
  })

  it('odak: yükleme bitince sonuç bölgesine taşınır', async () => {
    renderPanel()
    choose(new File(['x'], 'base.log'))
    fireEvent.click(screen.getByRole('button', { name: 'Yükle' }))
    fireEvent.click(screen.getByRole('button', { name: 'Onayla' }))
    const result = await screen.findByRole('region', { name: 'Yükleme sonucu' })
    await vi.waitFor(() => expect(result).toHaveFocus())
  })

  it('odak: yükleme hata verince hata metnine taşınır', async () => {
    importCall = () => Promise.reject(new ApiError('Dosya çok büyük', 'common.payload_too_large', 413))
    renderPanel()
    choose(new File(['x'], 'base.log'))
    fireEvent.click(screen.getByRole('button', { name: 'Yükle' }))
    fireEvent.click(screen.getByRole('button', { name: 'Onayla' }))
    const message = await screen.findByText('Dosya çok büyük')
    await vi.waitFor(() => expect(message).toHaveFocus())
  })

  it('yükleme sürerken onBusyChange(true), bitince onBusyChange(false) bildirir', async () => {
    const upload = deferred<BaseImportResult>()
    importCall = () => upload.promise
    const onBusyChange = vi.fn()
    renderPanel(onBusyChange)
    choose(new File(['x'], 'base.log'))
    fireEvent.click(screen.getByRole('button', { name: 'Yükle' }))
    fireEvent.click(screen.getByRole('button', { name: 'Onayla' }))
    await vi.waitFor(() => expect(onBusyChange).toHaveBeenLastCalledWith(true))
    upload.resolve(RESULT)
    await screen.findByText('Sürüm 3 açıldı.')
    await vi.waitFor(() => expect(onBusyChange).toHaveBeenLastCalledWith(false))
  })

  it('AC-4: mevcut kadro sürümleri listelenir, en yeni işaretli', async () => {
    renderPanel()
    const list = await screen.findByRole('list', { name: 'Kadro sürümleri' })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Kadro güncellemesi 20.11.2026')
    expect(items[0]).toHaveTextContent('En yeni')
    expect(items[1]).toHaveTextContent('Çıkış kadrosu')
    expect(items[1]).not.toHaveTextContent('En yeni')
  })

  it('AC-4: yüklemeden sonra sürüm listesi yenilenir', async () => {
    renderPanel()
    await screen.findByRole('list', { name: 'Kadro sürümleri' })
    expect(versionCalls).toBe(1)
    choose(new File(['x'], 'base.log'))
    fireEvent.click(screen.getByRole('button', { name: 'Yükle' }))
    fireEvent.click(screen.getByRole('button', { name: 'Onayla' }))
    await screen.findByText('Sürüm 3 açıldı.')
    await vi.waitFor(() => expect(versionCalls).toBe(2))
  })

  it('AC-4: sürüm listesi alınamazsa boş liste değil hata metni', async () => {
    vi.mocked(request).mockImplementation((path: string) => path === '/squad-versions' ? Promise.reject(new Error('ağ hatası')) : Promise.resolve(RESULT))
    renderPanel()
    expect(await screen.findByText('Kadro sürümleri alınamadı.')).toBeInTheDocument()
    expect(screen.queryByText('Henüz kadro sürümü yok.')).toBeNull()
  })
})
