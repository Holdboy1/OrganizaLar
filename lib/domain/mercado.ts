import type { AppState, CompraMercado, Estabelecimento, TipoMercado, FormaPagamento } from "@/lib/types"
import { uid, isoNow } from "./helpers"

export const PRESETS_BANCO: Record<string, { nome: string; cor: string; icone: string }> = {
  nubank: { nome: 'Nubank', cor: '#820ad1', icone: '💜' },
  mercado_pago: { nome: 'Mercado Pago', cor: '#00b1ea', icone: '💛' },
  picpay: { nome: 'PicPay', cor: '#11c76f', icone: '💚' },
  outro: { nome: 'Outro', cor: '#6b7280', icone: '💳' },
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
