"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Search, ShoppingBag, Star, Plus, Package,
  AlertTriangle, Minus, Sparkles, Pencil, Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { StatCard } from "@/components/stat-card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { useAppStore } from "@/lib/store/app-store"
import { storeActions } from "@/lib/store/actions"
import { normalizarNome } from "@/lib/domain/helpers"
import type { ItemCatalogo } from "@/lib/types"

const CATEGORIAS_PRODUTO = [
  { id: 'mantimentos', nome: 'Mantimentos', icone: '🌾' },
  { id: 'limpeza', nome: 'Limpeza', icone: '🧹' },
  { id: 'higiene', nome: 'Higiene', icone: '🧴' },
  { id: 'hortifruti', nome: 'Hortifruti', icone: '🥬' },
  { id: 'bebidas', nome: 'Bebidas', icone: '🍹' },
  { id: 'padaria', nome: 'Padaria', icone: '🥖' },
  { id: 'frios', nome: 'Frios e laticínios', icone: '🧀' },
  { id: 'carnes', nome: 'Carnes', icone: '🥩' },
  { id: 'congelados', nome: 'Congelados', icone: '🧊' },
  { id: 'outros', nome: 'Outros', icone: '📦' },
]

const UNIDADES = ['un', 'kg', 'g', 'l', 'ml', 'dz', 'pct']

export function Despensa() {
  const [busca, setBusca] = useState("")
  const [filtroRapido, setFiltroRapido] = useState<"todos" | "conferir" | "lista">("todos")
  const [modalItem, setModalItem] = useState<{ open: boolean; item: ItemCatalogo | null }>({ open: false, item: null })

  const itens = useAppStore(s => s.itensCatalogo)
  const estoque = useAppStore(s => s.estoque)

  const itensFiltrados = useMemo(() => {
    let lista = itens.filter(i => i.itemBase || (estoque[i.id]?.quantidade || 0) > 0)
    if (filtroRapido === "conferir") {
      lista = lista.filter(i => (estoque[i.id]?.quantidade || 0) > 0)
    }
    if (filtroRapido === "lista") {
      lista = lista.filter(i => {
        const atual = estoque[i.id]?.quantidade || 0
        return (i.itemBase && atual === 0) || Boolean(i.estoqueMinimo && atual < i.estoqueMinimo)
      })
    }
    if (busca) {
      const norm = normalizarNome(busca)
      lista = lista.filter(i => i.nomeNormalizado.includes(norm))
    }
    return lista
  }, [itens, estoque, busca, filtroRapido])

  const itensAgrupados = useMemo(() => {
    const grupos: Record<string, any[]> = {}
    itensFiltrados.forEach(item => {
      const cat = item.categoriaProduto
      if (!grupos[cat]) grupos[cat] = []
      grupos[cat].push({
        ...item,
        estoqueAtual: estoque[item.id]?.quantidade || 0,
        pctMaximo: item.estoqueMaximoHistorico > 0
          ? Math.min(100, ((estoque[item.id]?.quantidade || 0) / item.estoqueMaximoHistorico) * 100)
          : 0,
      })
    })
    return grupos
  }, [itensFiltrados, estoque])

  const totalComEstoque = useMemo(
    () => itens.filter(i => (estoque[i.id]?.quantidade || 0) > 0).length,
    [itens, estoque]
  )
  const baseAcabados = useMemo(
    () => itens.filter(i => i.itemBase && (estoque[i.id]?.quantidade || 0) === 0).length,
    [itens, estoque]
  )
  const abaixoMinimo = useMemo(
    () => itens.filter(i => {
      if (!i.estoqueMinimo) return false
      return (estoque[i.id]?.quantidade || 0) < i.estoqueMinimo
    }).length,
    [itens, estoque]
  )

  return (
    <div className="space-y-6 pb-4 animate-fade-in">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          title="Itens com estoque"
          value={String(totalComEstoque)}
          icon={<Package className="h-5 w-5 text-primary" />}
        />
        <StatCard
          title="Itens-base sem estoque"
          value={String(baseAcabados)}
          variant={baseAcabados > 0 ? "warning" : "default"}
          icon={<Star className="h-5 w-5 text-warning" />}
        />
        <StatCard
          title="Abaixo do mínimo"
          value={String(abaixoMinimo)}
          variant={abaixoMinimo > 0 ? "warning" : "default"}
          icon={<AlertTriangle className="h-5 w-5 text-warning" />}
        />
        <StatCard
          title="Total no catálogo"
          value={String(itens.length)}
          icon={<ShoppingBag className="h-5 w-5 text-primary" />}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={filtroRapido === "conferir" ? "default" : "outline"}
          size="sm"
          onClick={() => setFiltroRapido(filtroRapido === "conferir" ? "todos" : "conferir")}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Conferir
        </Button>
        <Button
          variant={filtroRapido === "lista" ? "default" : "outline"}
          size="sm"
          onClick={() => setFiltroRapido(filtroRapido === "lista" ? "todos" : "lista")}
        >
          <ShoppingBag className="mr-2 h-4 w-4" />
          Gerar lista
        </Button>
        <Button variant="outline" size="sm" onClick={() => setModalItem({ open: true, item: null })}>
          <Plus className="mr-2 h-4 w-4" />
          Item
        </Button>
      </div>

      {filtroRapido !== "todos" && (
        <div className="rounded-xl border bg-muted/40 p-3 text-sm text-muted-foreground">
          {filtroRapido === "conferir"
            ? "Modo conferencia: mostrando itens que ainda tem estoque para revisar quantidade."
            : "Lista sugerida: mostrando itens-base zerados e itens abaixo do estoque minimo."}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar item..."
          className="pl-9"
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
      </div>

      {Object.keys(itensAgrupados).length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <Package className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium">Despensa vazia</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Adicione itens manualmente ou use o botão de voz
          </p>
          <Button className="mt-4 bg-emerald-500 hover:bg-emerald-600" onClick={() => setModalItem({ open: true, item: null })}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar primeiro item
          </Button>
        </div>
      ) : (
        Object.entries(itensAgrupados).map(([catId, items]) => {
          const cat = CATEGORIAS_PRODUTO.find(c => c.id === catId)
          return (
            <section key={catId}>
              <h3 className="mb-2 text-sm font-semibold flex items-center gap-2">
                <span>{cat?.icone || "📦"}</span>
                {cat?.nome || catId}
              </h3>
              <div className="space-y-2">
                {items.map(item => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onIncrement={() => storeActions.ajustarEstoque(item.id, 1)}
                    onDecrement={() => storeActions.ajustarEstoque(item.id, -1)}
                    onEdit={() => setModalItem({ open: true, item })}
                    onDelete={() => {
                      if (confirm(`Excluir "${item.nome}" do catálogo?`)) {
                        storeActions.deleteItemCatalogo(item.id)
                      }
                    }}
                  />
                ))}
              </div>
            </section>
          )
        })
      )}

      <ItemModal
        open={modalItem.open}
        item={modalItem.item}
        onClose={() => setModalItem({ open: false, item: null })}
      />
    </div>
  )
}

function ItemCard({ item, onIncrement, onDecrement, onEdit, onDelete }: any) {
  const percentage = item.pctMaximo
  const isEmpty = item.estoqueAtual === 0
  const isLow = item.estoqueMinimo && item.estoqueAtual < item.estoqueMinimo

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-3 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover animate-slide-up",
        item.itemBase && "border-l-4 border-l-amber-400"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{item.nome}</p>
            {item.itemBase && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
          </div>
          <p className="text-xs text-muted-foreground">
            {isEmpty ? <span className="text-destructive font-medium">Acabou</span> : (
              <>
                {item.estoqueAtual} {item.unidade}
                {item.estoqueMaximoHistorico > 0 && ` / max ${item.estoqueMaximoHistorico}`}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={onDecrement} disabled={isEmpty}>
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="min-w-[2ch] text-center text-sm font-semibold tabular-nums">{item.estoqueAtual}</span>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={onIncrement}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {item.estoqueMaximoHistorico > 0 && (
        <Progress
          value={percentage}
          className={cn(
            "mt-2 h-1.5",
            isEmpty ? "bg-destructive/20" : isLow ? "bg-warning/20" : ""
          )}
        />
      )}
    </div>
  )
}

interface ItemModalProps {
  open: boolean
  onClose: () => void
  item: ItemCatalogo | null
}

function ItemModal({ open, onClose, item }: ItemModalProps) {
  const estoque = useAppStore(s => s.estoque)

  const [nome, setNome] = useState("")
  const [unidade, setUnidade] = useState("un")
  const [categoriaProduto, setCategoriaProduto] = useState("outros")
  const [tipo, setTipo] = useState<"estocavel" | "perecivel" | "base">("estocavel")
  const [itemBase, setItemBase] = useState(false)
  const [estoqueMinimo, setEstoqueMinimo] = useState("")
  const [estoqueAtual, setEstoqueAtual] = useState("")

  useEffect(() => {
    if (!open) return
    if (item) {
      setNome(item.nome)
      setUnidade(item.unidade)
      setCategoriaProduto(item.categoriaProduto)
      setTipo(item.tipo)
      setItemBase(item.itemBase)
      setEstoqueMinimo(item.estoqueMinimo?.toString() || "")
      setEstoqueAtual((estoque[item.id]?.quantidade || 0).toString())
    } else {
      setNome("")
      setUnidade("un")
      setCategoriaProduto("outros")
      setTipo("estocavel")
      setItemBase(false)
      setEstoqueMinimo("")
      setEstoqueAtual("")
    }
  }, [item, open, estoque])

  const salvar = () => {
    if (!nome.trim()) return

    const dados = {
      nome: nome.trim(),
      unidade,
      categoriaProduto,
      tipo,
      itemBase,
      estoqueMinimo: estoqueMinimo ? parseFloat(estoqueMinimo) : null,
      estoqueMaximoHistorico: item?.estoqueMaximoHistorico || 0,
      consumoMedioDiario: item?.consumoMedioDiario || 0,
      consumoConfianca: item?.consumoConfianca || ("nenhuma" as const),
      ultimoPreco: item?.ultimoPreco || null,
      precoMedio: item?.precoMedio || null,
      ultimaCompra: item?.ultimaCompra || null,
      ean: item?.ean || null,
      qtdEmbalagem: item?.qtdEmbalagem || null,
    }

    let itemId = item?.id
    if (item) {
      storeActions.updateItemCatalogo(item.id, dados)
    } else {
      const novo = storeActions.addItemCatalogo(dados)
      itemId = novo.id
    }

    if (itemId && estoqueAtual !== "") {
      storeActions.setEstoque(itemId, parseFloat(estoqueAtual) || 0)
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? "Editar item" : "Novo item"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input value={nome} onChange={e => setNome(e.target.value)} maxLength={50} placeholder="Ex: Arroz" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Unidade</Label>
              <Select value={unidade} onValueChange={setUnidade}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNIDADES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={categoriaProduto} onValueChange={setCategoriaProduto}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_PRODUTO.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.icone} {c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="base" checked={itemBase} onCheckedChange={(c) => setItemBase(c === true)} />
            <Label htmlFor="base" className="cursor-pointer flex items-center gap-1">
              <Star className="h-3.5 w-3.5 text-amber-500" />
              Item-base (sempre compro)
            </Label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Estoque mínimo</Label>
              <Input type="number" step="0.01" min="0" value={estoqueMinimo} onChange={e => setEstoqueMinimo(e.target.value)} />
            </div>
            <div>
              <Label>Estoque atual</Label>
              <Input type="number" step="0.01" min="0" value={estoqueAtual} onChange={e => setEstoqueAtual(e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} className="bg-emerald-500 hover:bg-emerald-600">
            {item ? "Salvar" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
