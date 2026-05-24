"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type {
  AppState, Despesa, Receita, Recorrente, ReceitaRecorrente,
  Cartao, CompraCartao, PagamentoFatura, Categoria,
  Estabelecimento, CompraMercado, ItemCatalogo, FormaPagamento,
} from "@/lib/types"
import { DEFAULT_CATEGORIAS, uid, isoNow, isoToday, normalizarNome } from "@/lib/domain/helpers"
import { criarCompraMercado } from "@/lib/domain/mercado"

const VERSAO_ATUAL = 5

const initialState: AppState = {
  versao: VERSAO_ATUAL,
  categorias: DEFAULT_CATEGORIAS,
  despesas: [],
  receitas: [],
  recorrentes: [],
  receitasRecorrentes: [],
  ultimaGeracao: null,
  cartoes: [],
  comprasCartao: [],
  pagamentosFatura: [],
  regrasCategorizacao: [],
  preferencias: { modoVisualizacaoPainel: "consolidada", mostrarCartaoNoPainel: true },
  estabelecimentos: [],
  comprasMercado: [],
  itensCatalogo: [],
  itensCompra: [],
  estoque: {},
  conferencias: [],
  listasSugeridas: [],
  configDespensa: { horizonteDias: 30, janelaConsumoDias: 90, assistenteCompletado: false },
  lixeira: [],
  ultimoBackup: null,
  config: { lembrarBackupDias: 30, alertaGastoAnormalPct: 50, alertaReajustePct: 10 },
}

interface AppStore extends AppState {
  // Despesas
  addDespesa: (d: Omit<Despesa, "id" | "criadoEm">) => Despesa
  updateDespesa: (id: string, dados: Partial<Despesa>) => void
  deleteDespesa: (id: string) => void
  toggleDespesaPaga: (id: string) => void

  // Receitas
  addReceita: (r: Omit<Receita, "id" | "criadoEm">) => Receita
  updateReceita: (id: string, dados: Partial<Receita>) => void
  deleteReceita: (id: string) => void
  toggleReceitaRecebida: (id: string) => void

  // Recorrentes
  addRecorrente: (r: Omit<Recorrente, "id" | "criadoEm">) => Recorrente
  updateRecorrente: (id: string, dados: Partial<Recorrente>) => void
  deleteRecorrente: (id: string) => void

  addReceitaRecorrente: (r: Omit<ReceitaRecorrente, "id" | "criadoEm">) => ReceitaRecorrente
  updateReceitaRecorrente: (id: string, dados: Partial<ReceitaRecorrente>) => void
  deleteReceitaRecorrente: (id: string) => void

  // Cartões
  addCartao: (c: Omit<Cartao, "id" | "criadoEm">) => Cartao
  updateCartao: (id: string, dados: Partial<Cartao>) => void
  deleteCartao: (id: string) => void

  addCompraCartao: (c: Omit<CompraCartao, "id" | "criadoEm">) => CompraCartao
  updateCompraCartao: (id: string, dados: Partial<CompraCartao>) => void
  deleteCompraCartao: (id: string) => void

  pagarFatura: (cartaoId: string, faturaRef: string, valor: number, total: number) => void
  desfazerPagamentoFatura: (pagamentoId: string) => void

  // Categorias
  addCategoria: (c: Omit<Categoria, "id">) => Categoria
  updateCategoria: (id: string, dados: Partial<Categoria>) => void
  deleteCategoria: (id: string) => boolean

  // Estabelecimentos
  addEstabelecimento: (e: Omit<Estabelecimento, "id" | "criadoEm">) => Estabelecimento
  updateEstabelecimento: (id: string, dados: Partial<Estabelecimento>) => void
  deleteEstabelecimento: (id: string) => void

  // Compras Mercado
  addCompraMercado: (c: Omit<CompraMercado, "id" | "compraCartaoId" | "criadoEm">) => CompraMercado
  updateCompraMercado: (id: string, dados: Partial<CompraMercado>) => void
  deleteCompraMercado: (id: string) => void

  // Despensa
  addItemCatalogo: (i: Omit<ItemCatalogo, "id" | "criadoEm" | "nomeNormalizado">) => ItemCatalogo
  updateItemCatalogo: (id: string, dados: Partial<ItemCatalogo>) => void
  deleteItemCatalogo: (id: string) => void
  setEstoque: (itemId: string, quantidade: number) => void
  ajustarEstoque: (itemId: string, delta: number) => void

  // Preferências
  setPreferencias: (p: Partial<AppState["preferencias"]>) => void

  // Backup
  exportarBackup: () => string
  importarBackup: (json: string) => void
  registrarBackup: () => void
  resetTudo: () => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ============ DESPESAS ============
      addDespesa: (d) => {
        const nova: Despesa = { id: 'desp-' + uid(), criadoEm: isoNow(), ...d }
        set(s => ({ despesas: [...s.despesas, nova] }))
        return nova
      },
      updateDespesa: (id, dados) => {
        set(s => ({
          despesas: s.despesas.map(d => d.id === id ? { ...d, ...dados } : d)
        }))
      },
      deleteDespesa: (id) => {
        const d = get().despesas.find(x => x.id === id)
        if (d) {
          set(s => ({
            despesas: s.despesas.filter(x => x.id !== id),
            lixeira: [...s.lixeira, { id: 'trash-' + uid(), tipo: 'despesa', registro: d, removidoEm: isoNow() }]
          }))
        }
      },
      toggleDespesaPaga: (id) => {
        set(s => ({
          despesas: s.despesas.map(d => {
            if (d.id !== id) return d
            const paga = !d.paga
            return { ...d, paga, pagaEm: paga ? isoToday() : null }
          })
        }))
      },

      // ============ RECEITAS ============
      addReceita: (r) => {
        const nova: Receita = { id: 'rec-' + uid(), criadoEm: isoNow(), ...r }
        set(s => ({ receitas: [...s.receitas, nova] }))
        return nova
      },
      updateReceita: (id, dados) => {
        set(s => ({ receitas: s.receitas.map(r => r.id === id ? { ...r, ...dados } : r) }))
      },
      deleteReceita: (id) => {
        const r = get().receitas.find(x => x.id === id)
        if (r) {
          set(s => ({
            receitas: s.receitas.filter(x => x.id !== id),
            lixeira: [...s.lixeira, { id: 'trash-' + uid(), tipo: 'receita', registro: r, removidoEm: isoNow() }]
          }))
        }
      },
      toggleReceitaRecebida: (id) => {
        set(s => ({
          receitas: s.receitas.map(r => {
            if (r.id !== id) return r
            const recebida = !r.recebida
            return { ...r, recebida, recebidaEm: recebida ? isoToday() : null }
          })
        }))
      },

      // ============ RECORRENTES ============
      addRecorrente: (r) => {
        const nova: Recorrente = { id: 'rrec-' + uid(), criadoEm: isoNow(), ...r }
        set(s => ({ recorrentes: [...s.recorrentes, nova] }))
        return nova
      },
      updateRecorrente: (id, dados) => {
        set(s => ({ recorrentes: s.recorrentes.map(r => r.id === id ? { ...r, ...dados } : r) }))
      },
      deleteRecorrente: (id) => {
        set(s => ({ recorrentes: s.recorrentes.filter(r => r.id !== id) }))
      },

      addReceitaRecorrente: (r) => {
        const nova: ReceitaRecorrente = { id: 'rrr-' + uid(), criadoEm: isoNow(), ...r }
        set(s => ({ receitasRecorrentes: [...s.receitasRecorrentes, nova] }))
        return nova
      },
      updateReceitaRecorrente: (id, dados) => {
        set(s => ({ receitasRecorrentes: s.receitasRecorrentes.map(r => r.id === id ? { ...r, ...dados } : r) }))
      },
      deleteReceitaRecorrente: (id) => {
        set(s => ({ receitasRecorrentes: s.receitasRecorrentes.filter(r => r.id !== id) }))
      },

      // ============ CARTÕES ============
      addCartao: (c) => {
        const novo: Cartao = { id: 'card-' + uid(), criadoEm: isoNow(), ...c }
        set(s => ({ cartoes: [...s.cartoes, novo] }))
        return novo
      },
      updateCartao: (id, dados) => {
        set(s => ({ cartoes: s.cartoes.map(c => c.id === id ? { ...c, ...dados } : c) }))
      },
      deleteCartao: (id) => {
        set(s => ({ cartoes: s.cartoes.filter(c => c.id !== id) }))
      },

      addCompraCartao: (c) => {
        const nova: CompraCartao = { id: 'comp-' + uid(), criadoEm: isoNow(), ...c }
        set(s => ({ comprasCartao: [...s.comprasCartao, nova] }))
        return nova
      },
      updateCompraCartao: (id, dados) => {
        set(s => ({ comprasCartao: s.comprasCartao.map(c => c.id === id ? { ...c, ...dados } : c) }))
      },
      deleteCompraCartao: (id) => {
        set(s => ({ comprasCartao: s.comprasCartao.filter(c => c.id !== id) }))
      },

      pagarFatura: (cartaoId, faturaRef, valorPago, total) => {
        const pagamento: PagamentoFatura = {
          id: 'pag-' + uid(),
          cartaoId, faturaRef,
          dataPagamento: isoToday(),
          valorPago,
          valorTotalFatura: total,
          saldoTransferido: Math.max(0, total - valorPago),
          criadoEm: isoNow(),
        }
        set(s => ({ pagamentosFatura: [...s.pagamentosFatura, pagamento] }))

        // Adiciona despesa direta com pagamentoFaturaId
        const cartao = get().cartoes.find(c => c.id === cartaoId)
        const despesa: Despesa = {
          id: 'desp-' + uid(),
          descricao: `Fatura ${cartao?.nome || ''} - ${faturaRef}`,
          categoria: 'cat-cartao',
          valor: valorPago,
          vencimento: isoToday(),
          paga: true,
          pagaEm: isoToday(),
          obs: `Pagamento de fatura cartão ${cartao?.nome || ''}`,
          pagamentoFaturaId: pagamento.id,
          criadoEm: isoNow(),
        }
        set(s => ({ despesas: [...s.despesas, despesa] }))
      },

      desfazerPagamentoFatura: (pagamentoId) => {
        set(s => ({
          pagamentosFatura: s.pagamentosFatura.filter(p => p.id !== pagamentoId),
          despesas: s.despesas.filter(d => d.pagamentoFaturaId !== pagamentoId),
        }))
      },

      // ============ CATEGORIAS ============
      addCategoria: (c) => {
        const nova: Categoria = { id: 'cat-' + uid(), ...c }
        set(s => ({ categorias: [...s.categorias, nova] }))
        return nova
      },
      updateCategoria: (id, dados) => {
        set(s => ({ categorias: s.categorias.map(c => c.id === id ? { ...c, ...dados } : c) }))
      },
      deleteCategoria: (id) => {
        const cat = get().categorias.find(c => c.id === id)
        if (cat?.protegida) return false
        set(s => ({ categorias: s.categorias.filter(c => c.id !== id) }))
        return true
      },

      // ============ ESTABELECIMENTOS ============
      addEstabelecimento: (e) => {
        const novo: Estabelecimento = { id: 'estab-' + uid(), criadoEm: isoNow(), ...e }
        set(s => ({ estabelecimentos: [...s.estabelecimentos, novo] }))
        return novo
      },
      updateEstabelecimento: (id, dados) => {
        set(s => ({
          estabelecimentos: s.estabelecimentos.map(e => e.id === id ? { ...e, ...dados } : e)
        }))
      },
      deleteEstabelecimento: (id) => {
        set(s => ({
          estabelecimentos: s.estabelecimentos.filter(e => e.id !== id),
          comprasMercado: s.comprasMercado.map(c => c.estabelecimentoId === id ? { ...c, estabelecimentoId: null } : c),
        }))
      },

      // ============ COMPRAS MERCADO ============
      addCompraMercado: (dados) => {
        const state = get()
        const { compra, compraCartao } = criarCompraMercado(dados, state)
        set(s => ({
          comprasMercado: [...s.comprasMercado, compra],
          comprasCartao: compraCartao ? [...s.comprasCartao, compraCartao] : s.comprasCartao,
        }))
        return compra
      },
      updateCompraMercado: (id, dados) => {
        set(s => {
          const compra = s.comprasMercado.find(c => c.id === id)
          if (!compra) return s
          // Remove espelho anterior se houver
          const novasComprasCartao = compra.compraCartaoId
            ? s.comprasCartao.filter(c => c.id !== compra.compraCartaoId)
            : s.comprasCartao
          // Atualiza
          const atualizada = { ...compra, ...dados, compraCartaoId: null }
          return {
            comprasMercado: s.comprasMercado.map(c => c.id === id ? atualizada : c),
            comprasCartao: novasComprasCartao,
          }
        })
      },
      deleteCompraMercado: (id) => {
        const compra = get().comprasMercado.find(c => c.id === id)
        set(s => ({
          comprasMercado: s.comprasMercado.filter(c => c.id !== id),
          comprasCartao: compra?.compraCartaoId
            ? s.comprasCartao.filter(c => c.id !== compra.compraCartaoId)
            : s.comprasCartao,
        }))
      },

      // ============ DESPENSA ============
      addItemCatalogo: (i) => {
        const novo: ItemCatalogo = {
          id: 'item-' + uid(),
          criadoEm: isoNow(),
          nomeNormalizado: normalizarNome(i.nome),
          ...i,
        }
        set(s => ({ itensCatalogo: [...s.itensCatalogo, novo] }))
        return novo
      },
      updateItemCatalogo: (id, dados) => {
        set(s => ({
          itensCatalogo: s.itensCatalogo.map(i => {
            if (i.id !== id) return i
            const atualizado = { ...i, ...dados }
            if (dados.nome) atualizado.nomeNormalizado = normalizarNome(dados.nome)
            return atualizado
          })
        }))
      },
      deleteItemCatalogo: (id) => {
        set(s => {
          const novoEstoque = { ...s.estoque }
          delete novoEstoque[id]
          return {
            itensCatalogo: s.itensCatalogo.filter(i => i.id !== id),
            itensCompra: s.itensCompra.filter(ic => ic.itemId !== id),
            estoque: novoEstoque,
            conferencias: s.conferencias.map(c => ({
              ...c,
              itens: c.itens.filter(it => it.itemId !== id)
            })),
          }
        })
      },
      setEstoque: (itemId, quantidade) => {
        const q = Math.max(0, parseFloat(String(quantidade)) || 0)
        set(s => {
          const item = s.itensCatalogo.find(i => i.id === itemId)
          const novoMax = item ? Math.max(item.estoqueMaximoHistorico || 0, q) : 0
          return {
            estoque: { ...s.estoque, [itemId]: { quantidade: q, atualizadoEm: isoNow() } },
            itensCatalogo: item
              ? s.itensCatalogo.map(i => i.id === itemId ? { ...i, estoqueMaximoHistorico: novoMax } : i)
              : s.itensCatalogo,
          }
        })
      },
      ajustarEstoque: (itemId, delta) => {
        const atual = get().estoque[itemId]?.quantidade || 0
        get().setEstoque(itemId, atual + delta)
      },

      // ============ PREFERÊNCIAS ============
      setPreferencias: (p) => {
        set(s => ({ preferencias: { ...s.preferencias, ...p } }))
      },

      // ============ BACKUP ============
      exportarBackup: () => {
        return JSON.stringify(get(), null, 2)
      },
      importarBackup: (json) => {
        try {
          const data = JSON.parse(json)
          if (!data.categorias || !data.despesas) throw new Error('Arquivo inválido')
          set({ ...initialState, ...data, versao: VERSAO_ATUAL })
        } catch (e) {
          throw e
        }
      },
      registrarBackup: () => {
        set({ ultimoBackup: isoNow() })
      },
      resetTudo: () => {
        set(initialState)
      },
    }),
    {
      name: "organizalar-state-v5",
      storage: createJSONStorage(() => {
        // Storage seguro para SSR
        if (typeof window === "undefined") {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          }
        }
        return localStorage
      }),
      version: VERSAO_ATUAL,
      // Hidratação manual via componente client
      skipHydration: false,
      // Migra dados de versões anteriores
      migrate: (persistedState: any, version: number) => {
        // Se não tem categorias ou está faltando alguma do default, complementa
        if (!persistedState) return initialState
        if (!Array.isArray(persistedState.categorias) || persistedState.categorias.length === 0) {
          persistedState.categorias = DEFAULT_CATEGORIAS
        } else {
          // Garante que todas as categorias default obrigatórias existam
          const idsExistentes = new Set(persistedState.categorias.map((c: any) => c.id))
          for (const def of DEFAULT_CATEGORIAS) {
            if (!idsExistentes.has(def.id)) {
              persistedState.categorias.push(def)
            }
          }
        }
        // Garante arrays/objetos obrigatórios
        const arr = ["despesas", "receitas", "recorrentes", "receitasRecorrentes",
          "cartoes", "comprasCartao", "pagamentosFatura", "regrasCategorizacao",
          "estabelecimentos", "comprasMercado", "itensCatalogo", "itensCompra",
          "conferencias", "listasSugeridas", "lixeira"]
        for (const k of arr) {
          if (!Array.isArray(persistedState[k])) persistedState[k] = []
        }
        if (!persistedState.estoque || typeof persistedState.estoque !== "object") {
          persistedState.estoque = {}
        }
        if (!persistedState.preferencias) {
          persistedState.preferencias = { modoVisualizacaoPainel: "consolidada", mostrarCartaoNoPainel: true }
        }
        if (!persistedState.configDespensa) {
          persistedState.configDespensa = { horizonteDias: 30, janelaConsumoDias: 90, assistenteCompletado: false }
        }
        if (!persistedState.config) {
          persistedState.config = { lembrarBackupDias: 30, alertaGastoAnormalPct: 50, alertaReajustePct: 10 }
        }
        persistedState.versao = VERSAO_ATUAL
        return persistedState
      },
      partialize: (state) => {
        // Não persiste as funções, só os dados
        const {
          addDespesa, updateDespesa, deleteDespesa, toggleDespesaPaga,
          addReceita, updateReceita, deleteReceita, toggleReceitaRecebida,
          addRecorrente, updateRecorrente, deleteRecorrente,
          addReceitaRecorrente, updateReceitaRecorrente, deleteReceitaRecorrente,
          addCartao, updateCartao, deleteCartao,
          addCompraCartao, updateCompraCartao, deleteCompraCartao,
          pagarFatura, desfazerPagamentoFatura,
          addCategoria, updateCategoria, deleteCategoria,
          addEstabelecimento, updateEstabelecimento, deleteEstabelecimento,
          addCompraMercado, updateCompraMercado, deleteCompraMercado,
          addItemCatalogo, updateItemCatalogo, deleteItemCatalogo,
          setEstoque, ajustarEstoque,
          setPreferencias, exportarBackup, importarBackup, registrarBackup, resetTudo,
          ...data
        } = state
        return data
      },
    }
  )
)
