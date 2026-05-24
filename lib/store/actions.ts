// Actions do store — pega direto do store sem subscribe
// Use isso em handlers (onClick, onChange) ao invés de useAppStore()
import { useAppStore } from "./app-store"

export const storeActions = {
  // Despesas
  addDespesa: (...args: Parameters<ReturnType<typeof useAppStore.getState>["addDespesa"]>) =>
    useAppStore.getState().addDespesa(...args),
  updateDespesa: (...args: Parameters<ReturnType<typeof useAppStore.getState>["updateDespesa"]>) =>
    useAppStore.getState().updateDespesa(...args),
  deleteDespesa: (id: string) => useAppStore.getState().deleteDespesa(id),
  toggleDespesaPaga: (id: string) => useAppStore.getState().toggleDespesaPaga(id),

  // Receitas
  addReceita: (...args: Parameters<ReturnType<typeof useAppStore.getState>["addReceita"]>) =>
    useAppStore.getState().addReceita(...args),
  updateReceita: (...args: Parameters<ReturnType<typeof useAppStore.getState>["updateReceita"]>) =>
    useAppStore.getState().updateReceita(...args),
  deleteReceita: (id: string) => useAppStore.getState().deleteReceita(id),
  toggleReceitaRecebida: (id: string) => useAppStore.getState().toggleReceitaRecebida(id),

  // Recorrentes
  addRecorrente: (...args: Parameters<ReturnType<typeof useAppStore.getState>["addRecorrente"]>) =>
    useAppStore.getState().addRecorrente(...args),
  updateRecorrente: (...args: Parameters<ReturnType<typeof useAppStore.getState>["updateRecorrente"]>) =>
    useAppStore.getState().updateRecorrente(...args),
  deleteRecorrente: (id: string) => useAppStore.getState().deleteRecorrente(id),

  // Cartões
  addCartao: (...args: Parameters<ReturnType<typeof useAppStore.getState>["addCartao"]>) =>
    useAppStore.getState().addCartao(...args),
  updateCartao: (...args: Parameters<ReturnType<typeof useAppStore.getState>["updateCartao"]>) =>
    useAppStore.getState().updateCartao(...args),
  deleteCartao: (id: string) => useAppStore.getState().deleteCartao(id),

  // Estabelecimentos
  addEstabelecimento: (...args: Parameters<ReturnType<typeof useAppStore.getState>["addEstabelecimento"]>) =>
    useAppStore.getState().addEstabelecimento(...args),

  // Compras Mercado
  addCompraMercado: (...args: Parameters<ReturnType<typeof useAppStore.getState>["addCompraMercado"]>) =>
    useAppStore.getState().addCompraMercado(...args),
  updateCompraMercado: (...args: Parameters<ReturnType<typeof useAppStore.getState>["updateCompraMercado"]>) =>
    useAppStore.getState().updateCompraMercado(...args),
  deleteCompraMercado: (id: string) => useAppStore.getState().deleteCompraMercado(id),

  // Despensa
  addItemCatalogo: (...args: Parameters<ReturnType<typeof useAppStore.getState>["addItemCatalogo"]>) =>
    useAppStore.getState().addItemCatalogo(...args),
  updateItemCatalogo: (...args: Parameters<ReturnType<typeof useAppStore.getState>["updateItemCatalogo"]>) =>
    useAppStore.getState().updateItemCatalogo(...args),
  deleteItemCatalogo: (id: string) => useAppStore.getState().deleteItemCatalogo(id),
  setEstoque: (itemId: string, quantidade: number) =>
    useAppStore.getState().setEstoque(itemId, quantidade),
  ajustarEstoque: (itemId: string, delta: number) =>
    useAppStore.getState().ajustarEstoque(itemId, delta),
}

// Pega o snapshot atual do state inteiro - útil quando precisa de várias coisas
// dentro de um handler de evento
export function getStoreState() {
  return useAppStore.getState()
}
