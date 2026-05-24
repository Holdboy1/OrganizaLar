"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useAppStore } from "@/lib/store/app-store"
import { storeActions } from "@/lib/store/actions"
import { isoToday } from "@/lib/domain/helpers"
import type { Receita } from "@/lib/types"

interface ReceitaModalProps {
  open: boolean
  onClose: () => void
  receita?: Receita | null
}

export function ReceitaModal({ open, onClose, receita }: ReceitaModalProps) {
  const todasCategorias = useAppStore(s => s.categorias)
  const categorias = useMemo(
    () => todasCategorias.filter(c => c.tipo === "receita"),
    [todasCategorias]
  )

  const [descricao, setDescricao] = useState("")
  const [categoria, setCategoria] = useState("cat-salario")
  const [valor, setValor] = useState("")
  const [data, setData] = useState(isoToday())
  const [recebida, setRecebida] = useState(false)
  const [obs, setObs] = useState("")

  useEffect(() => {
    if (!open) return
    if (receita) {
      setDescricao(receita.descricao)
      setCategoria(receita.categoria)
      setValor(String(receita.valor))
      setData(receita.data)
      setRecebida(receita.recebida)
      setObs(receita.obs || "")
    } else {
      setDescricao("")
      setCategoria("cat-salario")
      setValor("")
      setData(isoToday())
      setRecebida(false)
      setObs("")
    }
  }, [receita, open])

  const salvar = () => {
    const v = parseFloat(valor) || 0
    if (!descricao.trim() || v <= 0) return

    const dados = {
      descricao: descricao.trim(),
      categoria,
      valor: v,
      data,
      recebida,
      recebidaEm: recebida ? isoToday() : null,
      obs: obs.trim(),
      recorrenteId: null,
    }

    if (receita) {
      storeActions.updateReceita(receita.id, dados)
    } else {
      storeActions.addReceita(dados)
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{receita ? "Editar receita" : "Nova receita"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="desc">Descrição</Label>
            <Input id="desc" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Salário" />
          </div>

          <div>
            <Label htmlFor="cat">Categoria</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger id="cat"><SelectValue /></SelectTrigger>
              <SelectContent>
                {categorias.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.icone} {c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="val">Valor (R$)</Label>
              <Input id="val" type="number" step="0.01" min="0" value={valor} onChange={e => setValor(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="data">Data</Label>
              <Input id="data" type="date" value={data} onChange={e => setData(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="recebida" checked={recebida} onCheckedChange={(c) => setRecebida(c === true)} />
            <Label htmlFor="recebida" className="cursor-pointer">Já recebi</Label>
          </div>

          <div>
            <Label htmlFor="obs">Observação</Label>
            <Textarea id="obs" value={obs} onChange={e => setObs(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} className="bg-emerald-500 hover:bg-emerald-600">
            {receita ? "Salvar alterações" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
