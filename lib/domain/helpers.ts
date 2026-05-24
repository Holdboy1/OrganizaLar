import type { Categoria } from "@/lib/types"

export const DEFAULT_CATEGORIAS: Categoria[] = [
  { id: 'cat-aluguel', nome: 'Aluguel', icone: '🏠', cor: '#7c3aed' },
  { id: 'cat-luz', nome: 'Luz', icone: '💡', cor: '#f59e0b' },
  { id: 'cat-agua', nome: 'Água', icone: '💧', cor: '#0ea5e9' },
  { id: 'cat-internet', nome: 'Internet', icone: '🌐', cor: '#06b6d4' },
  { id: 'cat-celular', nome: 'Celular', icone: '📱', cor: '#8b5cf6' },
  { id: 'cat-comida', nome: 'Comida', icone: '🍴', cor: '#16a34a' },
  { id: 'cat-domesticas', nome: 'Domésticas', icone: '🧹', cor: '#0d9488' },
  { id: 'cat-cartao', nome: 'Fatura cartão', icone: '💳', cor: '#0d9488' },
  { id: 'cat-mercado', nome: 'Mercado', icone: '🛒', cor: '#16a34a', protegida: true },
  { id: 'cat-mercadinho', nome: 'Mercadinho', icone: '🏪', cor: '#10b981', protegida: true },
  { id: 'cat-salario', nome: 'Salário', icone: '💼', cor: '#0ea5e9', tipo: 'receita', protegida: true },
  { id: 'cat-freelance', nome: 'Freelance', icone: '💻', cor: '#6366f1', tipo: 'receita' },
  { id: 'cat-outros-receita', nome: 'Outras receitas', icone: '💰', cor: '#10b981', tipo: 'receita', protegida: true },
  { id: 'cat-outros', nome: 'Outros', icone: '📌', cor: '#6b7280' },
]

export function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function isoMonth(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function isoToday(): string {
  return new Date().toISOString().slice(0, 10)
}

export function isoNow(): string {
  return new Date().toISOString()
}

export function diasNoMes(yyyymm: string): number {
  const [y, m] = yyyymm.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

export function shiftMonth(yyyymm: string, delta: number): string {
  const [y, m] = yyyymm.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return isoMonth(d)
}

export function diffDias(isoData: string): number {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const [y, m, d] = isoData.split('-').map(Number)
  const alvo = new Date(y, m - 1, d)
  return Math.round((alvo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
}

export function formatBRL(v: number | null | undefined): string {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatDataBR(iso: string | null | undefined): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function nomeMesAno(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number)
  const data = new Date(y, m - 1, 1)
  return data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

export function nomeMesAbrev(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
}

export function normalizarNome(nome: string): string {
  return String(nome || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function similar(a: string, b: string): number {
  if (!a || !b) return 0
  a = a.toLowerCase().trim()
  b = b.toLowerCase().trim()
  if (a === b) return 1
  const len = Math.max(a.length, b.length)
  if (len === 0) return 1
  const matrix: number[][] = []
  for (let i = 0; i <= b.length; i++) matrix[i] = [i]
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }
  return 1 - matrix[b.length][a.length] / len
}
