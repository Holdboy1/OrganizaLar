"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useAppStore } from "@/lib/store/app-store"
import { storeActions } from "@/lib/store/actions"
import { isoToday } from "@/lib/domain/helpers"
import type { CompraMercado, TipoMercado, FormaPagamento } from "@/lib/types"

interface CompraMercadoModalProps {
  open: boolean
  onClose: () => void
  tipo: TipoMercado
  compra?: CompraMercado | null
  estabelecimentoIdInicial?: string | null
}

export function CompraMercadoModal({ open, onClose, tipo, compra, estabelecimentoIdInicial }: CompraMercadoModalProps) {
  const todosEstab = useAppStore(s => s.estabelecimentos)
  const cartoes = useAppStore(s => s.cartoes)

  const estabelecimentos = useMemo(
    () => todosEstab.filter(e => e.tipo === tipo),
    [todosEstab, tipo]
  )

  const [estabelecimentoId, setEstabelecimentoId] = useState<string>("")
  const [data, setData] = useState(isoToday())
  const [valor, setValor] = useState("")
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>("dinheiro")
  const [cartaoId, setCartaoId] = useState<string>("")
  const [obs, setObs] = useState("")

  useEffect(() => {
    if (!open) return
    if (compra) {
      setEstabelecimentoId(compra.estabelecimentoId || "")
      setData(compra.data)
      setValor(String(compra.valor))
      setFormaPagamento(compra.formaPagamento)
      setCartaoId(compra.cartaoId || "")
      setObs(compra.obs || "")
    } else {
      setEstabelecimentoId(estabelecimentoIdInicial || "")
      setData(isoToday())
      setValor("")
      setFormaPagamento("dinheiro")
      setCartaoId("")
      setObs("")

      if (estabelecimentoIdInicial) {
        const est = estabelecimentos.find(e => e.id === estabelecimentoIdInicial)
        if (est?.formaPagamentoPadrao) setFormaPagamento(est.formaPagamentoPadrao)
        if (est?.cartaoPadraoId) setCartaoId(est.cartaoPadraoId)
      }
    }
  }, [compra, estabelecimentoIdInicial, open])

  const salvar = () => {
    const v = parseFloat(valor) || 0
    if (v <= 0) return

    const dados = {
      tipo,
      estabelecimentoId: estabelecimentoId || null,
      data,
      valor: v,
      formaPagamento,
      cartaoId: formaPagamento === "credito" ? (cartaoId || null) : null,
      obs: obs.trim(),
      origem: "manual" as const,
      chaveAcesso: null,
      cnpjEmitente: null,
    }

    if (compra) {
      storeActions.updateCompraMercado(compra.id, dados)
    } else {
      storeActions.addCompraMercado(dados)
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {compra ? "Editar compra" : `Nova compra - ${tipo === "mercado" ? "Mercado" : "Mercadinho"}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Estabelecimento</Label>
            <Select
              value={estabelecimentoId || "__none__"}
              onValueChange={(v) => setEstabelecimentoId(v === "__none__" ? "" : v)}
            >
              <SelectTrigger><SelectValue placeholder="Sem estabelecimento" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Sem estabelecimento —</SelectItem>
                {estabelecimentos.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.icone} {e.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data</Label>
              <Input type="date" value={data} onChange={e => setData(e.target.value)} />
            </div>
            <div>
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" min="0" value={valor} onChange={e => setValor(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Forma de pagamento</Label>
            <Select value={formaPagamento} onValueChange={(v) => setFormaPagamento(v as FormaPagamento)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dinheiro">💵 Dinheiro</SelectItem>
                <SelectItem value="debito">💳 Débito</SelectItem>
                <SelectItem value="credito">💳 Crédito</SelectItem>
                <SelectItem value="pix">⚡ Pix</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formaPagamento === "credito" && cartoes.length > 0 && (
            <div>
              <Label>Cartão</Label>
              <Select value={cartaoId} onValueChange={setCartaoId}>
                <SelectTrigger><SelectValue placeholder="Escolher cartão" /></SelectTrigger>
                <SelectContent>
                  {cartoes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.icone} {c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Observação</Label>
            <Textarea value={obs} onChange={e => setObs(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} className="bg-emerald-500 hover:bg-emerald-600">
            {compra ? "Salvar alterações" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
