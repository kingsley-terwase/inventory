import { computed } from 'vue'
import { defineStore } from 'pinia'
import { persisted, uid } from '@/services/storage'
import { sameCustomer, useSales } from './sales'
import { useSettings } from './settings'
import type { Customer, Supplier } from '@/types'

/**
 * Customers: the backend has no customer endpoint. A customer is created when a sale names one, so this list is
 * built from the sales and debts we have loaded. Suppliers: no endpoint either, so they are a local address book.
 */
export const useContacts = defineStore('contacts', () => {
  const sales = useSales(); const settings = useSettings()
  const suppliers = persisted<Supplier[]>('suppliers', [])

  const customers = computed<Customer[]>(() => {
    const list: Customer[] = []
    const add = (name: string, phone: string) => {
      if (!name || name === 'Walk-in customer') return
      const ref = { name, phone }
      if (list.some(c => sameCustomer(c, ref))) return
      list.push({ key: phone || name.toLowerCase(), name, phone, owed: sales.debtOf(ref), limit: settings.s.creditLimit })
    }
    sales.debts.forEach(d => add(d.customerName, d.customerPhone))
    sales.sales.forEach(s => add(s.customerName, s.customerPhone ?? ''))
    return list.sort((a, b) => a.name.localeCompare(b.name))
  })

  function saveSupplier(s: Omit<Supplier, 'id'> & { id?: string }) {
    if (s.id) { const old = suppliers.value.find(x => x.id === s.id); if (old) Object.assign(old, s) }
    else suppliers.value.push({ ...s, id: uid() })
  }
  const removeSupplier = (id: string) => { suppliers.value = suppliers.value.filter(s => s.id !== id) }

  return { customers, suppliers, saveSupplier, removeSupplier }
})
