import type { Contact, Product } from '@/types'

export const seedProducts: Product[] = [
  { id: 'p1', name: 'Rice 50kg bag', sku: 'RICE-50', category: 'Grains', costPrice: 62000, sellPrice: 68000, stock: 24, reorderLevel: 5 },
  { id: 'p2', name: 'Vegetable oil 5L', sku: 'OIL-5L', category: 'Cooking', costPrice: 9200, sellPrice: 10500, stock: 40, reorderLevel: 10 },
  { id: 'p3', name: 'Sugar 1kg', sku: 'SUG-1', category: 'Grains', costPrice: 1500, sellPrice: 1800, stock: 8, reorderLevel: 15 },
  { id: 'p4', name: 'Tomato paste (carton)', sku: 'TOM-C', category: 'Cooking', costPrice: 14000, sellPrice: 16500, stock: 12, reorderLevel: 4 },
  { id: 'p5', name: 'Bottled water (pack)', sku: 'WAT-P', category: 'Drinks', costPrice: 1400, sellPrice: 1800, stock: 60, reorderLevel: 20 }
]

export const seedContacts: Contact[] = [
  { id: 'c1', type: 'customer', name: 'Amina Stores', phone: '08030000001', address: 'Market Road', creditLimit: 150000 },
  { id: 'c2', type: 'customer', name: 'Bright Mini Mart', phone: '08030000002', address: 'Station Street', creditLimit: 80000 },
  { id: 'c3', type: 'supplier', name: 'Prime Wholesale Ltd', phone: '08030000003', address: 'Industrial Layout', creditLimit: 0 }
]
