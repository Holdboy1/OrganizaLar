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
import type { Despesa } from "@/lib/types"

interface DespesaModalProps {
  open: boolean
  onClose: () => void
  despesa?: Despesa | null
}

export function DespesaModal({ open, onClose, despesa }: DespesaModalProps) {
  // Lê apenas a categoria - sem filter aqui pra evitar nova ref a cada render
  const todasCategorias = useAppStore(s => s.categorias)
  const categorias = useMemo(
    () => todasCategorias.filter(c => c.tipo !== "receita"),
    [todasCategorias]
  )

  const [descricao, setDescricao] = useState("")
  const [categoria, setCategoria] = useState("cat-outros")
  const [valor, setValor] = useState("")
  const [vencimento, setVencimento] = useState(isoToday())
  const [paga, setPaga] = useState(false)
  const [obs, setObs] = useState("")

  useEffect(() => {
    if (!open) return
    if (despesa) {
      setDescricao(despesa.descricao)
      setCategoria(despesa.categoria)
      setValor(String(despesa.valor))
      setVencimento(despesa.vencimento)
      setPaga(despesa.paga)
      setObs(despesa.obs || "")
    } else {
      setDescricao("")
      setCategoria("cat-outros")
      setValor("")
      setVencimento(isoToday())
      setPaga(false)
      setObs("")
    }
  }, [despesa, open])

  const salvar = () => {
    const v = parseFloat(valor) || 0
    if (!descricao.trim() || v <= 0) return

    const dados = {
      descricao: descricao.trim(),
      categoria,
      valor: v,
      vencimento,
      paga,
      pagaEm: paga ? isoToday() : null,
      obs: obs.trim(),
      recorrenteId: null,
    }

    if (despesa) {
      storeActions.updateDespesa(despesa.id, dados)
    } else {
      storeActions.addDespesa(dados)
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{despesa ? "Editar despesa" : "Nova despesa"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="desc">Descrição</Label>
            <Input id="desc" value={descricao} onChange={e => setDescricao(e.target.value)} maxLength={60} />
          </div>

          <div>
            <Label htmlFor="cat">Categoria</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger id="cat">
                <SelectValue />
              </SelectTrigger>
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
              <Label htmlFor="venc">Vencimento</Label>
              <Input id="venc" type="date" value={vencimento} onChange={e => setVencimento(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="paga" checked={paga} onCheckedChange={(c) => setPaga(c === true)} />
            <Label htmlFor="paga" className="cursor-pointer">Já está paga</Label>
          </div>

          <div>
            <Label htmlFor="obs">Observação</Label>
            <Textarea id="obs" value={obs} onChange={e => setObs(e.target.value)} maxLength={200} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} className="bg-emerald-500 hover:bg-emerald-600">
            {despesa ? "Salvar alterações" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
