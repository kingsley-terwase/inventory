import { computed, ref } from 'vue'

/**
 * The one place that talks to the backend.
 * - Base URL comes from VITE_API_URL (default "/api", which Vite proxies in dev, see vite.config.ts).
 * - Sends the Bearer token, asks for JSON, and turns every failure into an ApiError with a readable message.
 */
const BASE = ((import.meta.env.VITE_API_URL as string | undefined) || '/api').replace(/\/+$/, '')
const TOKEN_KEY = 'ia:token'

export class ApiError extends Error {
  constructor(public status: number, message: string, public errors: Record<string, string[]> = {}, public body: any = null) {
    super(message)
  }
  get isForbidden() { return this.status === 403 }
}

let token: string | null = null
try { token = localStorage.getItem(TOKEN_KEY) } catch { /* storage unavailable */ }
let onUnauthorized: (() => void) | null = null

export const getToken = () => token
export function setToken(t: string | null) {
  token = t
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY) } catch { /* ignore */ }
}
/** Called once by the app: what to do when the server says the session is no longer valid. */
export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn }

const pending = ref(0)
/** True while any request is in flight. Drives the progress bar in PageLayout. */
export const busy = computed(() => pending.value > 0)

type Query = Record<string, string | number | boolean | undefined | null>
interface Opts { query?: Query; body?: unknown; auth?: boolean; timeoutMs?: number }

const qs = (q?: Query) => {
  if (!q) return ''
  const p = new URLSearchParams()
  Object.entries(q).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, String(v)) })
  const s = p.toString()
  return s ? '?' + s : ''
}

function firstError(body: any, fallback: string) {
  const errs = body?.errors
  if (errs && typeof errs === 'object') {
    const first = Object.values(errs).flat()[0]
    if (typeof first === 'string') return first
  }
  return typeof body?.message === 'string' && body.message ? body.message : fallback
}

async function send(method: string, path: string, opts: Opts = {}, accept = 'application/json'): Promise<Response> {
  const headers: Record<string, string> = { Accept: accept }
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  if (opts.auth !== false && token) headers.Authorization = `Bearer ${token}`

  const ctl = new AbortController()
  // The hosted backend can take a while to wake up, so be generous.
  const timer = setTimeout(() => ctl.abort(), opts.timeoutMs ?? 60_000)
  pending.value++
  try {
    const res = await fetch(BASE + path + qs(opts.query), {
      method, headers, signal: ctl.signal,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
    })
    if (res.ok) return res
    let body: any = null
    try { body = await res.json() } catch { /* not JSON */ }
    if (res.status === 401 && opts.auth !== false && token) onUnauthorized?.()
    const fallback = res.status === 403 ? 'You do not have permission to do that'
      : res.status === 401 ? 'Your session has expired. Please sign in again'
      : res.status === 404 ? 'Not found'
      : res.status >= 500 ? 'The server had a problem. Please try again'
      : `Request failed (${res.status})`
    throw new ApiError(res.status, firstError(body, fallback), body?.errors ?? {}, body)
  } catch (e) {
    if (e instanceof ApiError) throw e
    const aborted = e instanceof DOMException && e.name === 'AbortError'
    throw new ApiError(0, aborted ? 'The server took too long to respond. Please try again' : 'Cannot reach the server. Check your connection')
  } finally {
    clearTimeout(timer)
    pending.value--
  }
}

async function json<T>(method: string, path: string, opts?: Opts): Promise<T> {
  const res = await send(method, path, opts)
  if (res.status === 204) return undefined as T
  try { return (await res.json()) as T } catch { return undefined as T }
}

export const api = {
  get: <T = any>(path: string, query?: Query, o?: Opts) => json<T>('GET', path, { ...o, query }),
  post: <T = any>(path: string, body?: unknown, o?: Opts) => json<T>('POST', path, { ...o, body: body ?? {} }),
  put: <T = any>(path: string, body?: unknown) => json<T>('PUT', path, { body: body ?? {} }),
  patch: <T = any>(path: string, body?: unknown) => json<T>('PATCH', path, { body: body ?? {} }),
  del: <T = any>(path: string) => json<T>('DELETE', path)
}

/**
 * Pulls the list out of whatever shape a list endpoint returns:
 * a bare array, a Laravel paginator ({ data: [...] }), a resource ({ data, meta }) or { someKey: [...] }.
 */
export function listOf<T = any>(res: any, ...keys: string[]): T[] {
  if (Array.isArray(res)) return res
  if (!res || typeof res !== 'object') return []
  for (const k of [...keys, 'data']) if (Array.isArray(res[k])) return res[k]
  if (res.data && typeof res.data === 'object') {
    const inner = listOf<T>(res.data, ...keys)
    if (inner.length) return inner
  }
  const any = Object.values(res).find(Array.isArray)
  return (any as T[]) ?? []
}

const lastPageOf = (res: any): number => Number(res?.last_page ?? res?.meta?.last_page ?? 1) || 1

export interface Page<T> { items: T[]; page: number; lastPage: number; hasMore: boolean }

/** One page of a paginated list. */
export async function getPage<T = any>(path: string, query: Query = {}, page = 1, ...keys: string[]): Promise<Page<T>> {
  const res = await api.get(path, { ...query, page })
  const lastPage = lastPageOf(res)
  return { items: listOf<T>(res, ...keys), page, lastPage, hasMore: page < lastPage }
}

/** Every page of a paginated list (capped, so a huge table cannot hang the app). */
export async function getAll<T = any>(path: string, query: Query = {}, maxPages = 10, ...keys: string[]): Promise<T[]> {
  const out: T[] = []
  for (let page = 1; page <= maxPages; page++) {
    const p = await getPage<T>(path, query, page, ...keys)
    out.push(...p.items)
    if (!p.hasMore) break
  }
  return out
}

/** Downloads a file (e.g. a PDF report) with the auth header and hands it to the browser. */
export async function download(path: string, query: Query, filename: string, accept = 'application/pdf') {
  const res = await send('GET', path, { query }, accept)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
