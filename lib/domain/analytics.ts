import type { AppState } from "@/lib/types"
import { isoMonth, diffDias } from "./helpers"
import { itensCartaoDoMes } from "./cartoes"

export function totaisDoMes(yyyymm: string, state: AppState) {
  const despesasMes = state.despesas.filter(d => d.vencimento.startsWith(yyyymm))
  const receitasMes = state.receitas.filter(r => r.data.startsWith(yyyymm))
  const comprasMercadoMes = state.comprasMercado.filter(c =>
    c.data.startsWith(yyyymm) && c.formaPagamento !== "credito"
  )

  const itensCartao = itensCartaoDoMes(yyyymm, state)
  const totalCartao = itensCartao.reduce((s, i) => s + i.valor, 0)

  const totalDespesasDiretas = despesasMes.reduce((s, d) => s + d.valor, 0)
  const totalMercadoDireto = comprasMercadoMes.reduce((s, c) => s + c.valor, 0)
  const totalReceitas = receitasMes.reduce((s, r) => s + r.valor, 0)
  const totalRecebido = receitasMes.filter(r => r.recebida).reduce((s, r) => s + r.valor, 0)

  const totalPagas = despesasMes.filter(d => d.paga).reduce((s, d) => s + d.valor, 0) + totalMercadoDireto
  const totalDespesas = totalDespesasDiretas + totalMercadoDireto + totalCartao
  const totalPendente = totalDespesas - totalPagas

  return {
    totalReceitas,
    totalRecebido,
    totalDespesas,
    totalPagas,
    totalPendente,
    totalCartao,
    totalMercadoDireto,
    totalDespesasDiretas,
    saldo: totalReceitas - totalDespesas,
    saldoRealizado: totalRecebido - totalPagas,
  }
}

export function porCategoriaDoMes(yyyymm: string, state: AppState) {
  const porCat: Record<string, { direto: number; cartao: number }> = {}

  state.despesas.filter(d => d.vencimento.startsWith(yyyymm)).forEach(d => {
    if (!porCat[d.categoria]) porCat[d.categoria] = { direto: 0, cartao: 0 }
    porCat[d.categoria].direto += d.valor
  })

  state.comprasMercado.filter(c => c.data.startsWith(yyyymm) && c.formaPagamento !== "credito").forEach(c => {
    const cat = c.tipo === "mercado" ? "cat-mercado" : "cat-mercadinho"
    if (!porCat[cat]) porCat[cat] = { direto: 0, cartao: 0 }
    porCat[cat].direto += c.valor
  })

  itensCartaoDoMes(yyyymm, state).forEach(i => {
    if (!porCat[i.categoria]) porCat[i.categoria] = { direto: 0, cartao: 0 }
    porCat[i.categoria].cartao += i.valor
  })

  return porCat
}

export function topMaioresGastos(yyyymm: string, state: AppState, n = 5) {
  const todos: Array<{
    tipo: string
    descricao: string
    valor: number
    data: string
    categoriaId: string
  }> = []

  state.despesas.filter(d => d.vencimento.startsWith(yyyymm)).forEach(d => {
    todos.push({
      tipo: "despesa", descricao: d.descricao, valor: d.valor,
      data: d.vencimento, categoriaId: d.categoria,
    })
  })

  state.comprasMercado.filter(c => c.data.startsWith(yyyymm)).forEach(c => {
    const estab = c.estabelecimentoId
      ? state.estabelecimentos.find(e => e.id === c.estabelecimentoId)
      : null
    todos.push({
      tipo: c.tipo,
      descricao: estab?.nome || (c.tipo === "mercado" ? "Mercado" : "Mercadinho"),
      valor: c.valor, data: c.data,
      categoriaId: c.tipo === "mercado" ? "cat-mercado" : "cat-mercadinho",
    })
  })

  return todos.sort((a, b) => b.valor - a.valor).slice(0, n)
}

export function dadosAnuais(state: AppState) {
  const hoje = new Date()
  const meses: string[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
    meses.push(isoMonth(d))
  }
  return meses.map(m => {
    const t = totaisDoMes(m, state)
    return {
      mes: m,
      receitas: t.totalReceitas,
      despesas: t.totalDespesas,
      saldo: t.saldo,
    }
  })
}

export function alertasAtivos(yyyymm: string, state: AppState) {
  const alertas: Array<{
    tipo: "warn" | "danger" | "info"
    titulo: string
    descricao: string
    icone?: string
  }> = []

  // Despesas pendentes vencendo
  state.despesas.filter(d => !d.paga && d.vencimento.startsWith(yyyymm)).forEach(d => {
    const dias = diffDias(d.vencimento)
    if (dias < 0) {
      alertas.push({
        tipo: "danger",
        titulo: "Conta vencida",
        descricao: `${d.descricao} venceu há ${-dias} dia(s)`,
      })
    } else if (dias <= 3) {
      alertas.push({
        tipo: "warn",
        titulo: "Conta vence em breve",
        descricao: `${d.descricao} vence em ${dias} dia(s)`,
      })
    }
  })

  return alertas.slice(0, 5)
}

export function proximosVencimentos(yyyymm: string, state: AppState) {
  const hoje = new Date()
  return state.despesas
    .filter(d => !d.paga && d.vencimento.startsWith(yyyymm))
    .filter(d => diffDias(d.vencimento) >= -1)
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
    .slice(0, 5)
}
