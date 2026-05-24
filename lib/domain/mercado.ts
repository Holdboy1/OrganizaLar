import type { AppState, CompraMercado, Estabelecimento, TipoMercado, FormaPagamento } from "@/lib/types"
import { uid, isoNow, normalizarNome } from "./helpers"

export const PRESETS_BANCO: Record<string, { nome: string; cor: string; icone: string }> = {
  nubank: { nome: 'Nubank', cor: '#820ad1', icone: '💜' },
  mercado_pago: { nome: 'Mercado Pago', cor: '#00b1ea', icone: '💛' },
  picpay: { nome: 'PicPay', cor: '#11c76f', icone: '💚' },
  outro: { nome: 'Outro', cor: '#6b7280', icone: '💳' },
}

export interface IdentidadeEstabelecimento {
  nome: string
  tipo?: TipoMercado
  cor: string
  icone: string
}

const IDENTIDADES_POR_CNPJ: Record<string, IdentidadeEstabelecimento> = {
  "08071185000137": { nome: "A.J.J. Alimentos", tipo: "mercadinho", cor: "#2563eb", icone: "🏪" },
}

const IDENTIDADES_POR_RAIZ_CNPJ: Record<string, IdentidadeEstabelecimento> = {
  "75315333": { nome: "Atacadao", tipo: "mercado", cor: "#ef4444", icone: "🛒" },
  "06057223": { nome: "Assai Atacadista", tipo: "mercado", cor: "#f97316", icone: "🛒" },
  "47508411": { nome: "Extra", tipo: "mercado", cor: "#dc2626", icone: "🛒" },
}

const IDENTIDADES_POR_NOME: Array<{ termos: string[]; identidade: IdentidadeEstabelecimento }> = [
  { termos: ["atacadao"], identidade: { nome: "Atacadao", tipo: "mercado", cor: "#ef4444", icone: "🛒" } },
  { termos: ["assai", "sendas"], identidade: { nome: "Assai Atacadista", tipo: "mercado", cor: "#f97316", icone: "🛒" } },
  { termos: ["extra", "companhia brasileira de distribuicao", "cbd"], identidade: { nome: "Extra", tipo: "mercado", cor: "#dc2626", icone: "🛒" } },
  { termos: ["novo atacarejo"], identidade: { nome: "Novo Atacarejo", tipo: "mercado", cor: "#16a34a", icone: "🛒" } },
  { termos: ["carrefour"], identidade: { nome: "Carrefour", tipo: "mercado", cor: "#2563eb", icone: "🛒" } },
  { termos: ["bompreco", "bom preco"], identidade: { nome: "Bompreco", tipo: "mercado", cor: "#0ea5e9", icone: "🛒" } },
]

export function sugerirIdentidadeEstabelecimento(cnpj?: string | null, nomeLegal?: string | null): IdentidadeEstabelecimento | null {
  const limpo = String(cnpj || "").replace(/\D/g, "")
  if (limpo && IDENTIDADES_POR_CNPJ[limpo]) return IDENTIDADES_POR_CNPJ[limpo]
  const raiz = limpo.slice(0, 8)
  if (raiz && IDENTIDADES_POR_RAIZ_CNPJ[raiz]) return IDENTIDADES_POR_RAIZ_CNPJ[raiz]

  const nome = normalizarNome(nomeLegal || "")
  if (!nome) return null
  const match = IDENTIDADES_POR_NOME.find(item => item.termos.some(termo => nome.includes(normalizarNome(termo))))
  return match?.identidade || null
}

export function listarEstabelecimentos(tipo: TipoMercado, state: AppState): Estabelecimento[] {
  return state.estabelecimentos
    .filter(e => e.tipo === tipo && e.ativo !== false)
    .sort((a, b) => a.nome.localeCompare(b.nome))
}

export function buscarEstabelecimentoPorCNPJ(cnpj: string, state: AppState): Estabelecimento | null {
  const limpo = String(cnpj || '').replace(/\D/g, '')
  if (limpo.length !== 14) return null
  return state.estabelecimentos.find(e => e.cnpj === limpo) || null
}

export function buscarEstabelecimentoPorNome(nome: string, tipo: TipoMercado | null, state: AppState): Estabelecimento | null {
  const norm = nome.toLowerCase().trim()
  return state.estabelecimentos.find(e => {
    if (tipo && e.tipo !== tipo) return false
    return e.nome.toLowerCase().includes(norm) || norm.includes(e.nome.toLowerCase())
  }) || null
}

export function listarComprasDoMes(tipo: TipoMercado, yyyymm: string, state: AppState): CompraMercado[] {
  return state.comprasMercado
    .filter(c => c.tipo === tipo && c.data.startsWith(yyyymm))
    .sort((a, b) => b.data.localeCompare(a.data))
}

export function totalDoMes(tipo: TipoMercado, yyyymm: string, state: AppState): number {
  return listarComprasDoMes(tipo, yyyymm, state).reduce((s, c) => s + c.valor, 0)
}

export function chaveDuplicada(chave: string | null | undefined, state: AppState): boolean {
  if (!chave) return false
  return state.comprasMercado.some(c => c.chaveAcesso === chave)
}

// Cria compra (com espelho de cartão se for crédito)
// Retorna a compra criada + a compra de cartão espelhada (se houver)
export function criarCompraMercado(
  dados: Omit<CompraMercado, 'id' | 'compraCartaoId' | 'criadoEm'>,
  state: AppState
): { compra: CompraMercado; compraCartao: any } {
  const compra: CompraMercado = {
    id: 'merc-' + uid(),
    ...dados,
    cartaoId: dados.formaPagamento === 'credito' ? (dados.cartaoId || null) : null,
    compraCartaoId: null,
    criadoEm: isoNow(),
  }

  let compraCartao = null
  if (compra.formaPagamento === 'credito' && compra.cartaoId) {
    const estab = compra.estabelecimentoId
      ? state.estabelecimentos.find(e => e.id === compra.estabelecimentoId)
      : null
    const desc = estab?.nome || (compra.tipo === 'mercado' ? 'Mercado' : 'Mercadinho')
    compraCartao = {
      id: 'comp-' + uid(),
      cartaoId: compra.cartaoId,
      data: compra.data,
      descricao: desc,
      valorTotal: compra.valor,
      parcelas: 1,
      categoria: compra.tipo === 'mercado' ? 'cat-mercado' : 'cat-mercadinho',
      obs: compra.obs || '',
      origem: 'mercado' as const,
      origemMercadoId: compra.id,
      importLoteId: null,
      criadoEm: isoNow(),
    }
    compra.compraCartaoId = compraCartao.id
  }

  return { compra, compraCartao }
}
