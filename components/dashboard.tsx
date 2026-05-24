"use client"

import { useState, useMemo } from "react"
import {
  Wallet, CheckCircle, Clock, CreditCard,
  AlertTriangle, AlertCircle, Calendar,
} from "lucide-react"
import { StatCard } from "@/components/stat-card"
import { MonthSelector, ToggleSwitch, AlertBanner } from "@/components/ui-elements"
import { CategoryProgress, ExpenseItem } from "@/components/category-progress"
import { StatusBadge } from "@/components/status-badge"
import {
  Bar, BarChart, CartesianGrid, XAxis, YAxis,
  ResponsiveContainer, Tooltip, Legend,
} from "recharts"
import { useAppStore } from "@/lib/store/app-store"
import {
  totaisDoMes, porCategoriaDoMes, topMaioresGastos,
  dadosAnuais, alertasAtivos, proximosVencimentos,
} from "@/lib/domain/analytics"
import { calcularFatura } from "@/lib/domain/cartoes"
import { formatBRL, isoMonth, shiftMonth, formatDataBR, diffDias, nomeMesAbrev } from "@/lib/domain/helpers"
import type { AppState } from "@/lib/types"

// Selector que retorna apenas as fatias do state que o dashboard usa.
// Evita rerenders quando partes irrelevantes mudam.
const dashboardSelector = (s: AppState) => ({
  categorias: s.categorias,
  despesas: s.despesas,
  receitas: s.receitas,
  comprasMercado: s.comprasMercado,
  comprasCartao: s.comprasCartao,
  pagamentosFatura: s.pagamentosFatura,
  cartoes: s.cartoes,
  estabelecimentos: s.estabelecimentos,
  ultimoBackup: s.ultimoBackup,
  preferencias: s.preferencias,
})

export function Dashboard() {
  const [mes, setMes] = useState(isoMonth(new Date()))
  const [showBackupBanner, setShowBackupBanner] = useState(true)
  const [viewMode, setViewMode] = useState("Consolidada")

  // Lê fatias específicas (sem subscribe a TODO o store)
  const categorias = useAppStore(s => s.categorias)
  const despesas = useAppStore(s => s.despesas)
  const receitas = useAppStore(s => s.receitas)
  const comprasMercado = useAppStore(s => s.comprasMercado)
  const comprasCartao = useAppStore(s => s.comprasCartao)
  const pagamentosFatura = useAppStore(s => s.pagamentosFatura)
  const cartoes = useAppStore(s => s.cartoes)
  const estabelecimentos = useAppStore(s => s.estabelecimentos)
  const ultimoBackup = useAppStore(s => s.ultimoBackup)

  // Reconstrói um state-like para passar para os helpers
  const stateLike = useMemo(() => ({
    categorias, despesas, receitas, comprasMercado, comprasCartao,
    pagamentosFatura, cartoes, estabelecimentos,
  } as AppState), [categorias, despesas, receitas, comprasMercado, comprasCartao, pagamentosFatura, cartoes, estabelecimentos])

  const totais = useMemo(() => totaisDoMes(mes, stateLike), [mes, stateLike])
  const porCat = useMemo(() => porCategoriaDoMes(mes, stateLike), [mes, stateLike])
  const top5 = useMemo(() => topMaioresGastos(mes, stateLike, 5), [mes, stateLike])
  const anual = useMemo(() => dadosAnuais(stateLike), [stateLike])
  const alertas = useMemo(() => alertasAtivos(mes, stateLike), [mes, stateLike])
  const proximos = useMemo(() => proximosVencimentos(mes, stateLike), [mes, stateLike])

  const categoriasComValor = useMemo(() => {
    return Object.entries(porCat)
      .map(([catId, valores]) => {
        const cat = categorias.find(c => c.id === catId)
        if (!cat) return null
        const total = valores.direto + valores.cartao
        return { cat, total, ...valores }
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.total - a.total)
      .slice(0, 8) as Array<{ cat: any; total: number; direto: number; cartao: number }>
  }, [porCat, categorias])

  const chartData = useMemo(() => {
    return anual.map(a => ({
      mes: nomeMesAbrev(a.mes),
      receitas: a.receitas,
      despesas: a.despesas,
    }))
  }, [anual])

  const faturasPrevistas = useMemo(() => {
    return cartoes
      .map(c => {
        const fat = calcularFatura(c.id, mes, stateLike)
        if (!fat || fat.total <= 0) return null
        return { cartao: c, fatura: fat }
      })
      .filter(Boolean)
  }, [mes, cartoes, stateLike])

  const [year, monthN] = mes.split("-").map(Number)
  const monthLabel = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][monthN - 1]

  const totalLancamentos = despesas.length + receitas.length + comprasMercado.length

  return (
    <div className="space-y-6 pb-4 animate-fade-in">
      {showBackupBanner && !ultimoBackup && totalLancamentos > 5 && (
        <AlertBanner variant="info" onDismiss={() => setShowBackupBanner(false)}>
          Que tal fazer um backup dos seus dados?
        </AlertBanner>
      )}

      <MonthSelector
        month={monthLabel}
        year={year}
        onPrevious={() => setMes(shiftMonth(mes, -1))}
        onNext={() => setMes(shiftMonth(mes, 1))}
      />

      <ToggleSwitch
        options={["Consolidada", "Separada"]}
        value={viewMode}
        onChange={setViewMode}
        className="mx-auto max-w-xs"
      />

      <div className="rounded-xl gradient-balance p-5 text-white shadow-card animate-slide-up">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-white/80">Receitas</p>
            <p className="mt-1 text-xl font-bold">{formatBRL(totais.totalReceitas)}</p>
          </div>
          <div className="border-x border-white/20">
            <p className="text-xs font-medium uppercase tracking-wider text-white/80">Despesas</p>
            <p className="mt-1 text-xl font-bold">{formatBRL(totais.totalDespesas)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-white/80">Saldo</p>
            <p className="mt-1 text-xl font-bold">{formatBRL(totais.saldo)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard title="Total" value={formatBRL(totais.totalDespesas)}
          icon={<Wallet className="h-5 w-5 text-primary" />} />
        <StatCard title="Pagas" value={formatBRL(totais.totalPagas)} variant="success"
          icon={<CheckCircle className="h-5 w-5 text-success" />} />
        <StatCard title="A Pagar" value={formatBRL(totais.totalPendente)} variant="warning"
          icon={<Clock className="h-5 w-5 text-warning" />} />
        <StatCard title="Em Cartão" value={formatBRL(totais.totalCartao)}
          icon={<CreditCard className="h-5 w-5 text-secondary" />} />
      </div>

      {alertas.length > 0 && (
        <div className="space-y-2">
          {alertas.map((a, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 rounded-lg border p-3 animate-slide-up ${
                a.tipo === "danger"
                  ? "border-destructive/30 bg-destructive/10"
                  : "border-warning/30 bg-warning/10"
              }`}
            >
              {a.tipo === "danger" ? (
                <AlertCircle className="h-5 w-5 text-destructive" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-warning" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium">{a.titulo}</p>
                <p className="text-xs text-muted-foreground">{a.descricao}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {categoriasComValor.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Por Categoria</h2>
          <div className="space-y-2">
            {categoriasComValor.map(({ cat, total }) => {
              const max = categoriasComValor[0].total
              return (
                <CategoryProgress
                  key={cat.id}
                  category={cat.nome}
                  icon={<span className="text-lg">{cat.icone}</span>}
                  spent={total}
                  budget={max}
                  color={cat.cor}
                />
              )
            })}
          </div>
        </section>
      )}

      {top5.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Top 5 Maiores Gastos</h2>
          <div className="space-y-2">
            {top5.map((g, i) => {
              const cat = categorias.find(c => c.id === g.categoriaId)
              return (
                <ExpenseItem
                  key={i}
                  rank={i + 1}
                  title={g.descricao}
                  category={cat?.nome || ""}
                  value={g.valor}
                  date={formatDataBR(g.data)}
                  icon={<span className="text-lg">{cat?.icone || "💸"}</span>}
                  iconColor={cat?.cor || "#888"}
                />
              )
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Visão Anual</h2>
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} className="fill-muted-foreground"
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                  formatter={(value: number) => formatBRL(value)}
                />
                <Legend />
                <Bar dataKey="receitas" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesas" name="Despesas" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {faturasPrevistas.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Previsão de Fatura</h2>
          <div className="space-y-2">
            {faturasPrevistas.map((p: any) => (
              <div key={p.cartao.id} className="rounded-xl border bg-card p-4 shadow-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full text-xl"
                      style={{ backgroundColor: `${p.cartao.cor}20` }}
                    >
                      {p.cartao.icone}
                    </div>
                    <div>
                      <p className="font-medium">{p.cartao.nome}</p>
                      <p className="text-xs text-muted-foreground">Vence {formatDataBR(p.fatura.dataVencimento)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular-nums">{formatBRL(p.fatura.total)}</p>
                    <StatusBadge status={p.fatura.status as any} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {proximos.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Próximos Vencimentos</h2>
          <div className="space-y-2">
            {proximos.map(d => {
              const dias = diffDias(d.vencimento)
              return (
                <div key={d.id} className="flex items-center justify-between rounded-lg border bg-card p-3 shadow-card">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{d.descricao}</p>
                      <p className="text-xs text-muted-foreground">
                        Vence {formatDataBR(d.vencimento)} ({dias < 0 ? `há ${-dias} dia(s)` : `${dias} dia(s)`})
                      </p>
                    </div>
                  </div>
                  <span className="font-semibold tabular-nums">{formatBRL(d.valor)}</span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {totalLancamentos === 0 && (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="text-2xl mb-2">🌱</p>
          <p className="text-sm font-medium">Comece adicionando suas finanças</p>
          <p className="text-xs text-muted-foreground mt-1">
            Use o botão de voz no canto inferior direito ou adicione manualmente
          </p>
        </div>
      )}
    </div>
  )
}
