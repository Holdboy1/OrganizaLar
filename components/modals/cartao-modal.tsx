"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { storeActions } from "@/lib/store/actions"
import { PRESETS_BANCO } from "@/lib/domain/mercado"
import type { Cartao } from "@/lib/types"

interface CartaoModalProps {
  open: boolean
  onClose: () => void
  cartao?: Cartao | null
}

export function CartaoModal({ open, onClose, cartao }: CartaoModalProps) {
  const [nome, setNome] = useState("")
  const [banco, setBanco] = useState<"nubank" | "mercado_pago" | "picpay" | "outro">("nubank")
  const [ultimosDigitos, setUltimosDigitos] = useState("")
  const [diaFechamento, setDiaFechamento] = useState("17")
  const [diaVencimento, setDiaVencimento] = useState("24")
  const [limite, setLimite] = useState("")

  useEffect(() => {
    if (!open) return
    if (cartao) {
      setNome(cartao.nome)
      setBanco(cartao.banco)
      setUltimosDigitos(cartao.ultimosDigitos || "")
      setDiaFechamento(String(cartao.diaFechamento))
      setDiaVencimento(String(cartao.diaVencimento))
      setLimite(cartao.limite?.toString() || "")
    } else {
      setNome("")
      setBanco("nubank")
      setUltimosDigitos("")
      setDiaFechamento("17")
      setDiaVencimento("24")
      setLimite("")
    }
  }, [cartao, open])

  const onBancoChange = (b: any) => {
    setBanco(b)
    if (!cartao) {
      const preset = PRESETS_BANCO[b]
      if (preset && !nome) setNome(preset.nome)
    }
  }

  const salvar = () => {
    if (!nome.trim()) return

    const preset = PRESETS_BANCO[banco]
    const dados = {
      nome: nome.trim(),
      banco,
      ultimosDigitos: ultimosDigitos || null,
      bandeira: null,
      diaFechamento: parseInt(diaFechamento, 10) || 1,
      diaVencimento: parseInt(diaVencimento, 10) || 1,
      limite: limite ? parseFloat(limite) : null,
      cor: cartao?.cor || preset.cor,
      icone: cartao?.icone || preset.icone,
      ativo: true,
    }

    if (cartao) {
      storeActions.updateCartao(cartao.id, dados)
    } else {
      storeActions.addCartao(dados)
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{cartao ? "Editar cartão" : "Novo cartão"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Nubank Roxinho" />
          </div>

          <div>
            <Label>Banco</Label>
            <Select value={banco} onValueChange={onBancoChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nubank">💜 Nubank</SelectItem>
                <SelectItem value="mercado_pago">💛 Mercado Pago</SelectItem>
                <SelectItem value="picpay">💚 PicPay</SelectItem>
                <SelectItem value="outro">💳 Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Últimos 4 dígitos</Label>
            <Input value={ultimosDigitos} onChange={e => setUltimosDigitos(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="0000" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Dia de fechamento</Label>
              <Input type="number" min="1" max="31" value={diaFechamento} onChange={e => setDiaFechamento(e.target.value)} />
            </div>
            <div>
              <Label>Dia de vencimento</Label>
              <Input type="number" min="1" max="31" value={diaVencimento} onChange={e => setDiaVencimento(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Limite (R$)</Label>
            <Input type="number" step="0.01" min="0" value={limite} onChange={e => setLimite(e.target.value)} placeholder="Opcional" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} className="bg-emerald-500 hover:bg-emerald-600">
            {cartao ? "Salvar" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
