"use client"

import { useState, useMemo } from "react"
import {
  Plus, Pencil, CheckCircle, Trash2, Repeat, Inbox,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/status-badge"
import { MonthSelector } from "@/components/ui-elements"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { useAppStore } from "@/lib/store/app-store"
import { storeActions } from "@/lib/store/actions"
import { isoMonth, shiftMonth, formatBRL, formatDataBR, diffDias } from "@/lib/domain/helpers"
import { DespesaModal } from "@/components/modals/despesa-modal"
import { ReceitaModal } from "@/components/modals/receita-modal"
import type { Despesa, Receita } from "@/lib/types"
import { cn } from "@/lib/utils"

const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

function statusDespesa(d: Despesa): "paga" | "pendente" | "vencida" {
  if (d.paga) return "paga"
  return diffDias(d.vencimento) < 0 ? "vencida" : "pendente"
}

export function Despesas() {
  const [mes, setMes] = useState(isoMonth(new Date()))
  const [filtroCategoria, setFiltroCategoria] = useState("todas")
  const [filtroStatus, setFiltroStatus] = useState("todos")
  const [modalDespesa, setModalDespesa] = useState<{ open: boolean; despesa: Despesa | null }>({ open: false, despesa: null })
  const [modalReceita, setModalReceita] = useState<{ open: boolean; receita: Receita | null }>({ open: false, receita: null })

  // Selectors específicos (sem subscribe a TODO o store)
  const despesas = useAppStore(s => s.despesas)
  const receitas = useAppStore(s => s.receitas)
  const recorrentes = useAppStore(s => s.recorrentes)
  const categorias = useAppStore(s => s.categorias)

  const [year, monthN] = mes.split("-").map(Number)

  const despesasFiltradas = useMemo(() => {
    return despesas
      .filter(d => d.vencimento.startsWith(mes))
      .filter(d => filtroCategoria === "todas" || d.categoria === filtroCategoria)
      .filter(d => {
        if (filtroStatus === "todos") return true
        return statusDespesa(d) === filtroStatus
      })
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
  }, [despesas, mes, filtroCategoria, filtroStatus])

  const receitasMes = useMemo(() => {
    return receitas
      .filter(r => r.data.startsWith(mes))
      .sort((a, b) => a.data.localeCompare(b.data))
  }, [receitas, mes])

  return (
    <div className="space-y-6 pb-4 animate-fade-in">
      <MonthSelector
        month={months[monthN - 1]}
        year={year}
        onPrevious={() => setMes(shiftMonth(mes, -1))}
        onNext={() => setMes(shiftMonth(mes, 1))}
      />

      <Tabs defaultValue="despesas" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="despesas">Despesas</TabsTrigger>
          <TabsTrigger value="receitas">Receitas</TabsTrigger>
          <TabsTrigger value="recorrentes">Recorrentes</TabsTrigger>
        </TabsList>

        <TabsContent value="despesas" className="space-y-4 mt-4">
          <div className="flex gap-2">
            <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas categorias</SelectItem>
                {categorias.filter(c => c.tipo !== "receita").map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.icone} {c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos status</SelectItem>
                <SelectItem value="paga">Pagas</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="vencida">Vencidas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            {despesasFiltradas.length === 0 ? (
              <EmptyState title="Sem despesas neste mês" />
            ) : (
              despesasFiltradas.map(d => {
                const cat = categorias.find(c => c.id === d.categoria)
                return (
                  <DespesaCard
                    key={d.id}
                    despesa={d}
                    cat={cat}
                    onEdit={() => setModalDespesa({ open: true, despesa: d })}
                    onTogglePaga={() => storeActions.toggleDespesaPaga(d.id)}
                    onDelete={() => {
                      if (confirm(`Excluir "${d.descricao}"?`)) storeActions.deleteDespesa(d.id)
                    }}
                  />
                )
              })
            )}
          </div>

          <Button
            className="w-full bg-emerald-500 hover:bg-emerald-600 shadow-lg"
            onClick={() => setModalDespesa({ open: true, despesa: null })}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Despesa
          </Button>
        </TabsContent>

        <TabsContent value="receitas" className="space-y-4 mt-4">
          <div className="space-y-2">
            {receitasMes.length === 0 ? (
              <EmptyState title="Sem receitas neste mês" />
            ) : (
              receitasMes.map(r => {
                const cat = categorias.find(c => c.id === r.categoria)
                return (
                  <ReceitaCard
                    key={r.id}
                    receita={r}
                    cat={cat}
                    onEdit={() => setModalReceita({ open: true, receita: r })}
                    onToggleRecebida={() => storeActions.toggleReceitaRecebida(r.id)}
                    onDelete={() => {
                      if (confirm(`Excluir "${r.descricao}"?`)) storeActions.deleteReceita(r.id)
                    }}
                  />
                )
              })
            )}
          </div>
          <Button
            className="w-full bg-emerald-500 hover:bg-emerald-600 shadow-lg"
            onClick={() => setModalReceita({ open: true, receita: null })}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Receita
          </Button>
        </TabsContent>

        <TabsContent value="recorrentes" className="space-y-4 mt-4">
          <div className="space-y-2">
            {recorrentes.length === 0 ? (
              <EmptyState title="Sem recorrentes cadastradas" descricao="Cadastre contas que se repetem todo mês para serem geradas automaticamente." />
            ) : (
              recorrentes.map(r => {
                const cat = categorias.find(c => c.id === r.categoria)
                return (
                  <div key={r.id} className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-card">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full text-white"
                      style={{ backgroundColor: cat?.cor || "#888" }}
                    >
                      <span className="text-lg">{cat?.icone || "📌"}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">{r.descricao}</p>
                        <span className="inline-flex items-center gap-1 rounded-full bg-secondary/15 px-2 py-0.5 text-[10px] font-medium text-secondary">
                          <Repeat className="h-3 w-3" />
                          Dia {r.diaVencimento}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{cat?.nome || "—"}</p>
                    </div>
                    <span className="font-semibold tabular-nums">{formatBRL(r.valor)}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                      onClick={() => { if (confirm(`Excluir "${r.descricao}"?`)) storeActions.deleteRecorrente(r.id) }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })
            )}
          </div>
        </TabsContent>
      </Tabs>

      <DespesaModal
        open={modalDespesa.open}
        despesa={modalDespesa.despesa}
        onClose={() => setModalDespesa({ open: false, despesa: null })}
      />
      <ReceitaModal
        open={modalReceita.open}
        receita={modalReceita.receita}
        onClose={() => setModalReceita({ open: false, receita: null })}
      />
    </div>
  )
}

function EmptyState({ title, descricao }: { title: string; descricao?: string }) {
  return (
    <div className="rounded-xl border border-dashed p-8 text-center">
      <Inbox className="mx-auto h-8 w-8 text-muted-foreground" />
      <p className="mt-2 text-sm font-medium">{title}</p>
      {descricao && <p className="mt-1 text-xs text-muted-foreground">{descricao}</p>}
    </div>
  )
}

function DespesaCard({ despesa, cat, onEdit, onTogglePaga, onDelete }: any) {
  const status = statusDespesa(despesa)
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover animate-slide-up">
      <div
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-white text-lg"
        style={{ backgroundColor: cat?.cor || "#888" }}
      >
        {cat?.icone || "💸"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium">{despesa.descricao}</p>
          <StatusBadge status={status as any} />
        </div>
        <p className="text-xs text-muted-foreground">
          {cat?.nome || ""} - {formatDataBR(despesa.vencimento)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className={cn("font-semibold tabular-nums text-destructive")}>
          -{formatBRL(despesa.valor)}
        </span>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          {!despesa.paga && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-500" onClick={onTogglePaga}>
              <CheckCircle className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function ReceitaCard({ receita, cat, onEdit, onToggleRecebida, onDelete }: any) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover animate-slide-up">
      <div
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-white text-lg"
        style={{ backgroundColor: cat?.cor || "#10b981" }}
      >
        {cat?.icone || "💰"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium">{receita.descricao}</p>
          <StatusBadge status={receita.recebida ? "paga" : "pendente" as any} />
        </div>
        <p className="text-xs text-muted-foreground">
          {cat?.nome || ""} - {formatDataBR(receita.data)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-semibold tabular-nums text-emerald-500">
          +{formatBRL(receita.valor)}
        </span>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          {!receita.recebida && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-500" onClick={onToggleRecebida}>
              <CheckCircle className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
