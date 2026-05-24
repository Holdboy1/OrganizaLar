"use client"

import { useState, useMemo } from "react"
import { Plus, CreditCard, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAppStore } from "@/lib/store/app-store"
import { storeActions } from "@/lib/store/actions"
import { calcularFatura, listarFaturasDoCartao } from "@/lib/domain/cartoes"
import { isoMonth, formatBRL } from "@/lib/domain/helpers"
import { CartaoModal } from "@/components/modals/cartao-modal"
import type { Cartao, AppState } from "@/lib/types"

export function Cartoes() {
  const [modal, setModal] = useState<{ open: boolean; cartao: Cartao | null }>({ open: false, cartao: null })
  const cartoes = useAppStore(s => s.cartoes)

  return (
    <div className="space-y-6 pb-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Cartões</h2>
        <Button onClick={() => setModal({ open: true, cartao: null })} className="bg-emerald-500 hover:bg-emerald-600">
          <Plus className="mr-2 h-4 w-4" />
          Novo
        </Button>
      </div>

      {cartoes.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <CreditCard className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium">Nenhum cartão cadastrado</p>
          <p className="mt-1 text-xs text-muted-foreground">Adicione seus cartões Nubank, Mercado Pago, PicPay e outros</p>
          <Button className="mt-4 bg-emerald-500 hover:bg-emerald-600" onClick={() => setModal({ open: true, cartao: null })}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar cartão
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {cartoes.map(cartao => (
            <CartaoCard
              key={cartao.id}
              cartao={cartao}
              onEdit={() => setModal({ open: true, cartao })}
              onDelete={() => {
                if (confirm(`Excluir cartão "${cartao.nome}"?`)) storeActions.deleteCartao(cartao.id)
              }}
            />
          ))}
        </div>
      )}

      <CartaoModal
        open={modal.open}
        cartao={modal.cartao}
        onClose={() => setModal({ open: false, cartao: null })}
      />
    </div>
  )
}

function CartaoCard({ cartao, onEdit, onDelete }: any) {
  // Selectors específicos
  const comprasCartao = useAppStore(s => s.comprasCartao)
  const pagamentosFatura = useAppStore(s => s.pagamentosFatura)
  const cartoes = useAppStore(s => s.cartoes)

  const stateLike = useMemo(() => ({
    cartoes, comprasCartao, pagamentosFatura,
  } as AppState), [cartoes, comprasCartao, pagamentosFatura])

  const corrente = isoMonth(new Date())
  const faturaCorrente = useMemo(
    () => calcularFatura(cartao.id, corrente, stateLike),
    [cartao.id, corrente, stateLike]
  )

  const faturas = useMemo(
    () => listarFaturasDoCartao(cartao.id, stateLike).slice(0, 6),
    [cartao.id, stateLike]
  )

  const limiteUsado = useMemo(
    () => faturas.filter(f => f.status !== "paga").reduce((s, f) => s + (f.total - (f.pagamento?.valorPago || 0)), 0),
    [faturas]
  )

  const disponivel = cartao.limite ? Math.max(0, cartao.limite - limiteUsado) : null
  const pctUsado = cartao.limite ? Math.min(100, (limiteUsado / cartao.limite) * 100) : 0

  return (
    <div
      className="rounded-2xl p-5 text-white shadow-lg relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${cartao.cor} 0%, ${cartao.cor}cc 100%)`,
      }}
    >
      <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-white/10 -mr-16 -mt-16" />
      <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-white/5 -ml-12 -mb-12" />

      <div className="relative space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-2xl">{cartao.icone}</p>
            <p className="mt-1 text-lg font-bold">{cartao.nome}</p>
            {cartao.ultimosDigitos && (
              <p className="text-sm text-white/70">•••• {cartao.ultimosDigitos}</p>
            )}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/80 hover:bg-white/20 hover:text-white" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/80 hover:bg-white/20 hover:text-white" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-white/70">Fechamento</p>
            <p className="font-semibold">Dia {cartao.diaFechamento}</p>
          </div>
          <div>
            <p className="text-xs text-white/70">Vencimento</p>
            <p className="font-semibold">Dia {cartao.diaVencimento}</p>
          </div>
        </div>

        <div>
          <p className="text-xs text-white/70">Fatura aberta</p>
          <p className="text-2xl font-bold tabular-nums">{formatBRL(faturaCorrente?.total || 0)}</p>
        </div>

        {cartao.limite && (
          <div>
            <div className="flex justify-between text-xs text-white/70 mb-1">
              <span>Disponível: {formatBRL(disponivel || 0)}</span>
              <span>Limite: {formatBRL(cartao.limite)}</span>
            </div>
            <div className="h-2 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full bg-white transition-all" style={{ width: `${pctUsado}%` }} />
            </div>
          </div>
        )}

        {faturas.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-white/70">Últimas faturas</p>
            {faturas.slice(0, 3).map(f => (
              <div key={f.faturaRef} className="flex items-center justify-between text-sm">
                <span>{f.faturaRef}</span>
                <div className="flex items-center gap-2">
                  <span className="tabular-nums">{formatBRL(f.total)}</span>
                  <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                    f.status === "paga" ? "bg-white/20" : "bg-white/30"
                  }`}>
                    {f.status === "paga" ? "paga" : f.status === "aberta" ? "aberta" : f.status === "fechada" ? "fechada" : "parcial"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
