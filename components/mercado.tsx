"use client"

import { useState, useMemo } from "react"
import {
  Camera, Plus, Settings, BarChart3, Store, ShoppingCart, Pencil, Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { MonthSelector } from "@/components/ui-elements"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAppStore } from "@/lib/store/app-store"
import { storeActions } from "@/lib/store/actions"
import { isoMonth, shiftMonth, formatBRL, formatDataBR } from "@/lib/domain/helpers"
import { CompraMercadoModal } from "@/components/modals/compra-mercado-modal"
import type { CompraMercado, TipoMercado } from "@/lib/types"

const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

const ICONES_PAG: Record<string, string> = {
  dinheiro: "💵",
  debito: "💳",
  credito: "💳",
  pix: "⚡",
}

function MercadoContent({ tipo }: { tipo: TipoMercado }) {
  const [mes, setMes] = useState(isoMonth(new Date()))
  const [modalCompra, setModalCompra] = useState<{
    open: boolean
    compra: CompraMercado | null
    estabelecimentoIdInicial: string | null
  }>({ open: false, compra: null, estabelecimentoIdInicial: null })

  // Selectors específicos
  const todasCompras = useAppStore(s => s.comprasMercado)
  const todosEstabelecimentos = useAppStore(s => s.estabelecimentos)

  const estabelecimentos = useMemo(
    () => todosEstabelecimentos.filter(e => e.tipo === tipo && e.ativo !== false).sort((a, b) => a.nome.localeCompare(b.nome)),
    [todosEstabelecimentos, tipo]
  )

  const compras = useMemo(
    () =>
      todasCompras
        .filter(c => c.tipo === tipo && c.data.startsWith(mes))
        .sort((a, b) => b.data.localeCompare(a.data)),
    [todasCompras, tipo, mes]
  )

  const total = useMemo(() => compras.reduce((s, c) => s + c.valor, 0), [compras])

  const visitasPorEstab = useMemo(() => {
    const map: Record<string, number> = {}
    compras.forEach(c => {
      if (c.estabelecimentoId) {
        map[c.estabelecimentoId] = (map[c.estabelecimentoId] || 0) + 1
      }
    })
    return map
  }, [compras])

  const [year, monthN] = mes.split("-").map(Number)

  return (
    <div className="space-y-6">
      <MonthSelector
        month={months[monthN - 1]}
        year={year}
        onPrevious={() => setMes(shiftMonth(mes, -1))}
        onNext={() => setMes(shiftMonth(mes, 1))}
      />

      <div className="rounded-xl gradient-primary p-5 text-white shadow-card">
        <p className="text-sm font-medium text-white/80">Total do Mês</p>
        <p className="mt-1 text-3xl font-bold">{formatBRL(total)}</p>
        <p className="mt-1 text-sm text-white/70">
          {compras.length} {compras.length === 1 ? "compra realizada" : "compras realizadas"}
        </p>
      </div>

      {estabelecimentos.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Atalhos</h2>
            <Button variant="ghost" size="sm">
              <Settings className="mr-1 h-4 w-4" />
              Gerenciar
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {estabelecimentos.slice(0, 8).map((est) => (
              <button
                key={est.id}
                onClick={() => setModalCompra({ open: true, compra: null, estabelecimentoIdInicial: est.id })}
                className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover"
              >
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full text-2xl"
                  style={{ backgroundColor: `${est.cor}20` }}
                >
                  {est.icone}
                </div>
                <span className="text-sm font-medium text-center line-clamp-2">{est.nome}</span>
                {visitasPorEstab[est.id] > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {visitasPorEstab[est.id]}x este mês
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline">
          <Camera className="mr-2 h-4 w-4" />
          Escanear cupom
        </Button>
        <Button
          className="bg-emerald-500 hover:bg-emerald-600 text-white"
          onClick={() => setModalCompra({ open: true, compra: null, estabelecimentoIdInicial: null })}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova compra
        </Button>
      </div>

      <Button variant="outline" className="w-full">
        <BarChart3 className="mr-2 h-4 w-4" />
        Ver comparativo mensal
      </Button>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Compras Recentes</h2>
        {compras.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <ShoppingCart className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">Sem compras neste mês</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Adicione manualmente ou use o botão de voz
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {compras.map(c => {
              const estab = c.estabelecimentoId
                ? estabelecimentos.find(e => e.id === c.estabelecimentoId)
                : null
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover animate-slide-up"
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-lg"
                    style={{ backgroundColor: `${estab?.cor || "#888"}20`, color: estab?.cor || "#888" }}
                  >
                    {estab?.icone || "🛒"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">
                      {estab?.nome || "(sem estabelecimento)"}
                      {c.origem === "voz" && <span className="ml-1 text-xs">🎤</span>}
                      {c.origem === "qrcode" && <span className="ml-1 text-xs">📷</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDataBR(c.data)} - {ICONES_PAG[c.formaPagamento] || ""} {c.formaPagamento}
                    </p>
                  </div>
                  <span className="font-semibold tabular-nums text-destructive">
                    -{formatBRL(c.valor)}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setModalCompra({ open: true, compra: c, estabelecimentoIdInicial: c.estabelecimentoId || null })}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => {
                        if (confirm(`Excluir compra de ${formatBRL(c.valor)}?`)) {
                          storeActions.deleteCompraMercado(c.id)
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <CompraMercadoModal
        open={modalCompra.open}
        tipo={tipo}
        compra={modalCompra.compra}
        estabelecimentoIdInicial={modalCompra.estabelecimentoIdInicial}
        onClose={() => setModalCompra({ open: false, compra: null, estabelecimentoIdInicial: null })}
      />
    </div>
  )
}

export function Mercado() {
  return (
    <div className="space-y-6 pb-4 animate-fade-in">
      <Tabs defaultValue="mercado" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="mercado">
            <ShoppingCart className="mr-2 h-4 w-4" />
            Mercado
          </TabsTrigger>
          <TabsTrigger value="mercadinho">
            <Store className="mr-2 h-4 w-4" />
            Mercadinho
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mercado" className="mt-4">
          <MercadoContent tipo="mercado" />
        </TabsContent>

        <TabsContent value="mercadinho" className="mt-4">
          <MercadoContent tipo="mercadinho" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
