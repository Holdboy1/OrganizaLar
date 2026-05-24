import type { AppState, Cartao, CompraCartao } from "@/lib/types"

export function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(ano, mes, 0).getDate()
}

export function adicionarMeses(isoData: string, n: number): string {
  const [y, m, d] = isoData.split('-').map(Number)
  const data = new Date(y, m - 1 + n, 1)
  const ano = data.getFullYear()
  const mes = data.getMonth() + 1
  const dia = Math.min(d, ultimoDiaDoMes(ano, mes))
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

export function faturaDaCompra(dataCompra: string, cartao: Cartao): string {
  const [ano, mes, dia] = dataCompra.split('-').map(Number)
  const diaFech = Math.min(cartao.diaFechamento, ultimoDiaDoMes(ano, mes))
  const ajusteMes = dia <= diaFech ? 0 : 1

  let mesFat = mes + ajusteMes
  let anoFat = ano
  if (mesFat > 12) { mesFat = 1; anoFat++ }

  return `${anoFat}-${String(mesFat).padStart(2, '0')}`
}

export function dataVencimentoFatura(faturaRef: string, cartao: Cartao): string {
  const [ano, mes] = faturaRef.split('-').map(Number)
  const dia = Math.min(cartao.diaVencimento, ultimoDiaDoMes(ano, mes))
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

export function dataFechamentoFatura(faturaRef: string, cartao: Cartao): string {
  const [ano, mes] = faturaRef.split('-').map(Number)
  let mesFech = mes - 1
  let anoFech = ano
  if (mesFech < 1) { mesFech = 12; anoFech-- }
  const dia = Math.min(cartao.diaFechamento, ultimoDiaDoMes(anoFech, mesFech))
  return `${anoFech}-${String(mesFech).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

export interface ParcelaCalculada {
  compraId: string
  numero: number
  total: number
  valor: number
  faturaRef: string
  data: string
  descricao: string
  categoria: string
}

export function gerarParcelas(compra: CompraCartao, cartao: Cartao): ParcelaCalculada[] {
  const parcelas: ParcelaCalculada[] = []
  const total = compra.parcelas || 1
  const valorBase = Math.round((compra.valorTotal / total) * 100) / 100
  const ajuste = Math.round((compra.valorTotal - valorBase * total) * 100) / 100

  for (let i = 1; i <= total; i++) {
    const dataParcela = adicionarMeses(compra.data, i - 1)
    const fatura = faturaDaCompra(dataParcela, cartao)
    const valor = i === total ? Math.round((valorBase + ajuste) * 100) / 100 : valorBase
    parcelas.push({
      compraId: compra.id,
      numero: i,
      total,
      valor,
      faturaRef: fatura,
      data: dataParcela,
      descricao: compra.descricao,
      categoria: compra.categoria,
    })
  }
  return parcelas
}

export function faturaJaFechou(faturaRef: string, cartao: Cartao, hoje = new Date()): boolean {
  const dataFech = dataFechamentoFatura(faturaRef, cartao)
  const [y, m, d] = dataFech.split('-').map(Number)
  const fech = new Date(y, m - 1, d)
  return hoje > fech
}

export interface FaturaCalculada {
  cartao: Cartao
  faturaRef: string
  itens: ParcelaCalculada[]
  total: number
  pagamento: any
  status: 'aberta' | 'fechada' | 'paga' | 'paga_parcial'
  dataVencimento: string
  dataFechamento: string
}

export function calcularFatura(cartaoId: string, faturaRef: string, state: AppState): FaturaCalculada | null {
  const cartao = state.cartoes.find(c => c.id === cartaoId)
  if (!cartao) return null

  const itens: ParcelaCalculada[] = []
  for (const compra of state.comprasCartao) {
    if (compra.cartaoId !== cartaoId) continue
    const parcelas = gerarParcelas(compra, cartao)
    for (const p of parcelas) {
      if (p.faturaRef === faturaRef) {
        itens.push(p)
      }
    }
  }
  itens.sort((a, b) => a.data.localeCompare(b.data))

  const pagamento = state.pagamentosFatura.find(
    p => p.cartaoId === cartaoId && p.faturaRef === faturaRef
  )

  const total = itens.reduce((s, i) => s + i.valor, 0)
  let status: FaturaCalculada['status']
  if (pagamento) {
    status = pagamento.valorPago >= total - 0.01 ? 'paga' : 'paga_parcial'
  } else if (faturaJaFechou(faturaRef, cartao)) {
    status = 'fechada'
  } else {
    status = 'aberta'
  }

  return {
    cartao,
    faturaRef,
    itens,
    total: Math.round(total * 100) / 100,
    pagamento,
    status,
    dataVencimento: dataVencimentoFatura(faturaRef, cartao),
    dataFechamento: dataFechamentoFatura(faturaRef, cartao),
  }
}

export function listarFaturasDoCartao(cartaoId: string, state: AppState): FaturaCalculada[] {
  const cartao = state.cartoes.find(c => c.id === cartaoId)
  if (!cartao) return []

  const refs = new Set<string>()

  for (const compra of state.comprasCartao) {
    if (compra.cartaoId !== cartaoId) continue
    for (const p of gerarParcelas(compra, cartao)) {
      refs.add(p.faturaRef)
    }
  }
  for (const p of state.pagamentosFatura) {
    if (p.cartaoId === cartaoId) refs.add(p.faturaRef)
  }

  const hoje = new Date()
  const corrente = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
  refs.add(corrente)

  return Array.from(refs)
    .sort((a, b) => b.localeCompare(a))
    .map(ref => calcularFatura(cartaoId, ref, state))
    .filter((f): f is FaturaCalculada => f !== null)
}

export function itensCartaoDoMes(yyyymm: string, state: AppState): ParcelaCalculada[] {
  const itens: ParcelaCalculada[] = []
  for (const cartao of state.cartoes) {
    const fat = calcularFatura(cartao.id, yyyymm, state)
    if (!fat) continue
    for (const item of fat.itens) {
      itens.push(item)
    }
  }
  return itens
}
