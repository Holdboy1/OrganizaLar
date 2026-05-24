"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AlertCircle, Camera, Check, ExternalLink, Keyboard, QrCode, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useAppStore } from "@/lib/store/app-store"
import { storeActions } from "@/lib/store/actions"
import { formatBRL, isoToday } from "@/lib/domain/helpers"
import {
  cupomJaImportado,
  formatarCNPJ,
  parseDadosTextoCupom,
  parseQRCodeNFCe,
  type CupomFiscalQr,
  type ItemCupomParseado,
} from "@/lib/domain/cupom-fiscal"
import type { FormaPagamento, TipoMercado } from "@/lib/types"

interface CupomFiscalModalProps {
  open: boolean
  tipoInicial: TipoMercado
  onClose: () => void
}

type ScannerState = "idle" | "requesting" | "scanning" | "error"

export function CupomFiscalModal({ open, tipoInicial, onClose }: CupomFiscalModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const stopRef = useRef(false)

  const state = useAppStore()
  const cartoes = useAppStore(s => s.cartoes)
  const estabelecimentos = useAppStore(s => s.estabelecimentos)

  const [scannerState, setScannerState] = useState<ScannerState>("idle")
  const [erro, setErro] = useState("")
  const [entradaManual, setEntradaManual] = useState("")
  const [cupom, setCupom] = useState<CupomFiscalQr | null>(null)
  const [tipo, setTipo] = useState<TipoMercado>(tipoInicial)
  const [valor, setValor] = useState("")
  const [data, setData] = useState(isoToday())
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>("dinheiro")
  const [cartaoId, setCartaoId] = useState("")
  const [obs, setObs] = useState("")
  const [textoOficial, setTextoOficial] = useState("")
  const [itensExtraidos, setItensExtraidos] = useState<ItemCupomParseado[]>([])

  const estabelecimentoExistente = useMemo(() => {
    if (!cupom?.cnpjEmitente) return null
    return estabelecimentos.find(e => e.cnpj === cupom.cnpjEmitente) || null
  }, [cupom, estabelecimentos])

  const duplicado = cupom ? cupomJaImportado(cupom.chaveAcesso, state) : false

  useEffect(() => {
    if (!open) {
      pararScanner()
      return
    }

    setScannerState("idle")
    setErro("")
    setEntradaManual("")
    setCupom(null)
    setTipo(tipoInicial)
    setValor("")
    setData(isoToday())
    setFormaPagamento("dinheiro")
    setCartaoId("")
    setObs("")
    setTextoOficial("")
    setItensExtraidos([])
  }, [open, tipoInicial])

  const pararScanner = () => {
    stopRef.current = true
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
    if (scannerState !== "error") setScannerState("idle")
  }

  const iniciarScanner = async () => {
    setErro("")
    setScannerState("requesting")

    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setScannerState("error")
      setErro("Este navegador nao liberou camera. Cole a chave do cupom no campo manual.")
      return
    }

    const BarcodeDetectorCtor = (window as any).BarcodeDetector
    if (!BarcodeDetectorCtor) {
      setScannerState("error")
      setErro("Leitura nativa de QR Code indisponivel neste navegador. Cole a chave ou o link do cupom.")
      return
    }

    try {
      const detector = new BarcodeDetectorCtor({ formats: ["qr_code"] })
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      })
      streamRef.current = stream
      stopRef.current = false

      const video = videoRef.current
      if (!video) throw new Error("Camera nao inicializada.")
      video.srcObject = stream
      await video.play()
      setScannerState("scanning")

      const loop = async () => {
        if (stopRef.current || !videoRef.current) return
        try {
          const codes = await detector.detect(videoRef.current)
          const rawValue = codes?.[0]?.rawValue
          if (rawValue) {
            try {
              if ("vibrate" in navigator) navigator.vibrate(100)
            } catch {}
            processarConteudo(rawValue)
            pararScanner()
            return
          }
        } catch {}
        requestAnimationFrame(loop)
      }

      requestAnimationFrame(loop)
    } catch (error) {
      pararScanner()
      setScannerState("error")
      setErro(error instanceof Error ? error.message : "Nao consegui abrir a camera.")
    }
  }

  const processarConteudo = (conteudo: string) => {
    const parsed = parseQRCodeNFCe(conteudo)
    if (!parsed) {
      setErro("Nao encontrei uma chave NFC-e valida. Cole o link inteiro do QR Code ou a chave com 44 numeros.")
      return
    }

    setCupom(parsed)
    const estabelecimento = state.estabelecimentos.find(e => e.cnpj === parsed.cnpjEmitente)
    setTipo(estabelecimento?.tipo || tipoInicial)
    setValor(parsed.valorTotal ? String(parsed.valorTotal) : "")
    setData(isoToday())
    setObs(parsed.ehPE ? "Cupom fiscal lido por QR Code - SEFAZ-PE" : "Cupom fiscal lido por QR Code")
  }

  const processarManual = () => {
    processarConteudo(entradaManual)
  }

  const extrairTextoOficial = () => {
    const dados = parseDadosTextoCupom(textoOficial)
    if (dados.valorTotal) setValor(String(dados.valorTotal))
    if (dados.formaPagamento) setFormaPagamento(dados.formaPagamento)
    setItensExtraidos(dados.itens)

    if (!dados.valorTotal && dados.itens.length === 0) {
      setErro("Nao encontrei valor nem itens nesse texto. Copie o conteudo da pagina oficial depois da consulta.")
      return
    }

    setErro("")
    setObs(prev => {
      const base = prev || "Cupom fiscal lido por QR Code"
      if (dados.itens.length === 0) return base
      return `${base} - ${dados.itens.length} itens extraidos`
    })
  }

  const salvar = () => {
    if (!cupom || duplicado) return
    const valorNumber = Number(String(valor).replace(",", ".")) || 0
    if (valorNumber <= 0) {
      setErro("Informe o valor total do cupom antes de salvar.")
      return
    }

    let estabelecimentoId = estabelecimentoExistente?.id || null
    if (!estabelecimentoId) {
      const novo = storeActions.addEstabelecimento({
        nome: `Mercado ${formatarCNPJ(cupom.cnpjEmitente)}`,
        tipo,
        cnpj: cupom.cnpjEmitente,
        cor: tipo === "mercado" ? "#16a34a" : "#10b981",
        icone: tipo === "mercado" ? "🛒" : "🏪",
        ativo: true,
      })
      estabelecimentoId = novo.id
    }

    storeActions.addCompraMercado({
      tipo,
      estabelecimentoId,
      data,
      valor: valorNumber,
      formaPagamento,
      cartaoId: formaPagamento === "credito" ? (cartaoId || null) : null,
      obs: obs.trim(),
      origem: "qrcode",
      chaveAcesso: cupom.chaveAcesso,
      cnpjEmitente: cupom.cnpjEmitente,
    })

    onClose()
  }

  const fechar = () => {
    pararScanner()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && fechar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-emerald-500" />
            Escanear cupom fiscal
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!cupom && (
            <>
              <div className="overflow-hidden rounded-xl border bg-black">
                <video ref={videoRef} className="h-56 w-full object-cover" muted playsInline />
              </div>

              {erro && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <p>{erro}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                {scannerState === "scanning" ? (
                  <Button variant="outline" onClick={pararScanner}>
                    <Square className="mr-2 h-4 w-4" />
                    Parar
                  </Button>
                ) : (
                  <Button onClick={iniciarScanner} className="bg-emerald-500 hover:bg-emerald-600">
                    <Camera className="mr-2 h-4 w-4" />
                    Abrir camera
                  </Button>
                )}
                <Button variant="outline" onClick={() => setErro("")}>
                  <Keyboard className="mr-2 h-4 w-4" />
                  Colar chave
                </Button>
              </div>

              <div>
                <Label>Link do QR Code ou chave NFC-e</Label>
                <Textarea
                  value={entradaManual}
                  onChange={e => setEntradaManual(e.target.value)}
                  rows={3}
                  placeholder="Cole aqui o link do QR Code ou a chave com 44 numeros"
                  className="mt-2"
                />
                <Button
                  variant="outline"
                  className="mt-2 w-full"
                  onClick={processarManual}
                  disabled={!entradaManual.trim()}
                >
                  Processar chave
                </Button>
              </div>
            </>
          )}

          {cupom && (
            <>
              <div className="rounded-xl border bg-muted/40 p-3 text-sm">
                <p className="font-medium">Cupom fiscal lido</p>
                <p className="mt-1 text-muted-foreground">Chave: {cupom.chaveAcesso}</p>
                <p className="text-muted-foreground">CNPJ: {formatarCNPJ(cupom.cnpjEmitente)}</p>
                <p className="text-muted-foreground">
                  Origem: {cupom.ehPE ? "SEFAZ-PE" : `UF ${cupom.uf}`}
                </p>
                {cupom.valorTotal && <p className="text-muted-foreground">Valor no QR: {formatBRL(cupom.valorTotal)}</p>}
              </div>

              {!valor && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <p>A chave fiscal nao contem valor nem itens. Abra a consulta oficial, passe pelo captcha e cole o texto aqui para eu preencher automaticamente.</p>
                </div>
              )}

              {duplicado && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <p>Este cupom ja foi importado. A chave fiscal ja existe nas compras.</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo</Label>
                  <Select value={tipo} onValueChange={(v) => setTipo(v as TipoMercado)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mercado">🛒 Mercado</SelectItem>
                      <SelectItem value="mercadinho">🏪 Mercadinho</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Data</Label>
                  <Input type="date" value={data} onChange={e => setData(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Valor total</Label>
                  <Input value={valor} onChange={e => setValor(e.target.value)} inputMode="decimal" placeholder="0,00" />
                </div>
                <div>
                  <Label>Pagamento</Label>
                  <Select value={formaPagamento} onValueChange={(v) => setFormaPagamento(v as FormaPagamento)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dinheiro">💵 Dinheiro</SelectItem>
                      <SelectItem value="debito">💳 Debito</SelectItem>
                      <SelectItem value="credito">💳 Credito</SelectItem>
                      <SelectItem value="pix">⚡ Pix</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formaPagamento === "credito" && cartoes.length > 0 && (
                <div>
                  <Label>Cartao</Label>
                  <Select value={cartaoId} onValueChange={setCartaoId}>
                    <SelectTrigger><SelectValue placeholder="Escolher cartao" /></SelectTrigger>
                    <SelectContent>
                      {cartoes.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.icone} {c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label>Observacao</Label>
                <Textarea value={obs} onChange={e => setObs(e.target.value)} rows={2} />
              </div>

              <Button variant="outline" className="w-full" asChild>
                <a href={cupom.urlConsulta} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Abrir consulta oficial
                </a>
              </Button>

              <div>
                <Label>Texto da consulta oficial</Label>
                <Textarea
                  value={textoOficial}
                  onChange={e => setTextoOficial(e.target.value)}
                  rows={5}
                  placeholder="Depois de abrir a consulta oficial, copie o texto da nota e cole aqui. Eu tento extrair total, pagamento e itens."
                  className="mt-2"
                />
                <Button
                  variant="outline"
                  className="mt-2 w-full"
                  onClick={extrairTextoOficial}
                  disabled={!textoOficial.trim()}
                >
                  Extrair dados do texto
                </Button>
                {itensExtraidos.length > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {itensExtraidos.length} itens encontrados. Na proxima etapa eles vao alimentar a despensa automaticamente.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={fechar}>Cancelar</Button>
          {cupom && (
            <Button onClick={salvar} disabled={duplicado} className="bg-emerald-500 hover:bg-emerald-600">
              <Check className="mr-2 h-4 w-4" />
              Salvar compra
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
