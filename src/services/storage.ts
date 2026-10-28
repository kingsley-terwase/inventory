import { ref, watch, type Ref } from 'vue'

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

/**
 * A ref that is saved to localStorage on every change.
 * Business data now lives on the server. This is only used for small per-device things:
 * the chosen branch and the supplier address book (the backend has no supplier endpoint yet).
 */
export function persisted<T>(key: string, initial: T): Ref<T> {
  const k = 'ia:' + key
  let value: T = initial
  try {
    const raw = localStorage.getItem(k)
    if (raw !== null) {
      const parsed = JSON.parse(raw)
      value = initial && typeof initial === 'object' && !Array.isArray(initial) ? { ...initial, ...parsed } : parsed
    }
  } catch { /* ignore corrupted data */ }
  const state = ref(value) as Ref<T>
  watch(state, v => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* storage full */ } }, { deep: true })
  return state
}
