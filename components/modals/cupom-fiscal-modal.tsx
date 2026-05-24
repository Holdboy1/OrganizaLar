"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AlertCircle, Camera, Check, ExternalLink, ImageUp, Keyboard, QrCode, Square } from "lucide-react"
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
type OcrState = "idle" | "loading" | "processing" | "done" | "error"

async function carregarTesseract() {
  if (typeof window === "undefined") throw new Error("OCR indisponivel fora do navegador.")
  if ((window as any).Tesseract) return (window as any).Tesseract

  try {
    const modulo = await import("tesseract.js")
    const tesseract = (modulo as any).default || modulo
    if (tesseract?.recognize) {
      ;(window as any).Tesseract = tesseract
      return tesseract
    }
  } catch {}

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script")
    script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Nao consegui carregar o OCR local. Verifique a internet e tente de novo."))
    document.head.appendChild(script)
  })

  if (!(window as any).Tesseract) throw new Error("OCR local nao inicializou.")
  return (window as any).Tesseract
}

async function carregarImagem(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error("Nao consegui abrir a imagem do cupom."))
      image.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function compactarImagemCupom(file: File): Promise<string> {
  const img = await carregarImagem(file)
  const maxLado = 1200
  const escala = Math.min(1, maxLado / Math.max(img.width, img.height))
  const width = Math.max(1, Math.round(img.width * escala))
  const height = Math.max(1, Math.round(img.height * escala))
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas indisponivel para compactar imagem.")
  ctx.drawImage(img, 0, 0, width, height)
  return canvas.toDataURL("image/jpeg", 0.74)
}

async function prepararImagemChaveCupom(file: File): Promise<string> {
  const img = await carregarImagem(file)
  const sourceWidth = img.naturalWidth || img.width
  const sourceHeight = img.naturalHeight || img.height
  const cropTop = Math.floor(sourceHeight * 0.82)
  const cropHeight = Math.max(1, sourceHeight - cropTop)
  const scale = sourceWidth < 900 ? 3 : 2
  const canvas = document.createElement("canvas")
  canvas.width = sourceWidth * scale
  canvas.height = cropHeight * scale
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) throw new Error("Canvas indisponivel para preparar a chave.")

  ctx.imageSmoothingEnabled = true
  ctx.drawImage(img, 0, cropTop, sourceWidth, cropHeight, 0, 0, canvas.width, canvas.height)

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const pixels = imageData.data
  let min = 255
  let max = 0

  for (let i = 0; i < pixels.length; i += 4) {
    const gray = Math.round(pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114)
    min = Math.min(min, gray)
    max = Math.max(max, gray)
    pixels[i] = gray
    pixels[i + 1] = gray
    pixels[i + 2] = gray
  }

  const range = Math.max(1, max - min)
  for (let i = 0; i < pixels.length; i += 4) {
    const normalized = Math.max(0, Math.min(255, Math.round(((pixels[i] - min) / range) * 255)))
    pixels[i] = normalized
    pixels[i + 1] = normalized
    pixels[i + 2] = normalized
  }

  ctx.putImageData(imageData, 0, 0)
  return canvas.toDataURL("image/png")
}

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
  const [ocrState, setOcrState] = useState<OcrState>("idle")
  const [ocrProgresso, setOcrProgresso] = useState(0)
  const [ocrStatus, setOcrStatus] = useState("")
  const [imagemCupom, setImagemCupom] = useState<string | null>(null)
  const [nomeEmitente, setNomeEmitente] = useState<string | null>(null)

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
    setOcrState("idle")
    setOcrProgresso(0)
    setOcrStatus("")
    setImagemCupom(null)
    setNomeEmitente(null)
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
    if (dados.emitenteNome) setNomeEmitente(dados.emitenteNome)
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

  const processarImagemCupom = async (file: File | null) => {
    if (!file) return
    setErro("")
    setOcrState("loading")
    setOcrProgresso(0)
    setOcrStatus("Carregando OCR local...")

    try {
      const imagem = await compactarImagemCupom(file)
      setImagemCupom(imagem)
      const Tesseract = await carregarTesseract()
      setOcrState("processing")
      setOcrStatus("Lendo dados do cupom...")
      const result = await Tesseract.recognize(file, "por", {
        logger: (m: any) => {
          const progress = Math.min(70, Math.round((m.progress || 0) * 70))
          setOcrStatus(m.status || "processando")
          setOcrProgresso(progress)
        },
      })

      const textoGeral = String(result?.data?.text || "").trim()
      setOcrStatus("Reforcando leitura da chave...")
      const imagemChave = await prepararImagemChaveCupom(file)
      const resultChave = await Tesseract.recognize(imagemChave, "eng", {
        logger: (m: any) => {
          const progress = 70 + Math.round((m.progress || 0) * 30)
          setOcrStatus("lendo faixa da chave")
          setOcrProgresso(Math.min(99, progress))
        },
        tessedit_pageseg_mode: "6",
        tessedit_char_whitelist: "0123456789 ",
      })
      setOcrProgresso(100)

      const textoChave = String(resultChave?.data?.text || "").trim()
      const texto = [textoGeral, textoChave].filter(Boolean).join("\n").trim()
      if (texto.length < 20) {
        throw new Error("Nao consegui ler texto suficiente no print. Use uma imagem mais nitida.")
      }

      setTextoOficial(texto)
      const cupomDoTexto = parseQRCodeNFCe(texto)
      if (cupomDoTexto && !cupom) {
        setCupom(cupomDoTexto)
        const estabelecimento = state.estabelecimentos.find(e => e.cnpj === cupomDoTexto.cnpjEmitente)
        setTipo(estabelecimento?.tipo || tipoInicial)
        setData(isoToday())
        setObs(cupomDoTexto.ehPE ? "Cupom fiscal lido por print - SEFAZ-PE" : "Cupom fiscal lido por print")
      }

      const dados = parseDadosTextoCupom(texto)
      if (dados.valorTotal) setValor(String(dados.valorTotal))
      if (dados.formaPagamento) setFormaPagamento(dados.formaPagamento)
      if (dados.emitenteNome) setNomeEmitente(dados.emitenteNome)
      setItensExtraidos(dados.itens)
      setObs(prev => {
        const base = prev || "Cupom fiscal lido por imagem"
        if (dados.itens.length === 0) return base
        return `${base} - ${dados.itens.length} itens extraidos por OCR`
      })
      setOcrState("done")

      if (!cupomDoTexto && !cupom) {
        setErro("Li o print, mas nao encontrei a chave NFC-e. Tente um print que mostre a chave/QR Code ou cole a chave manualmente.")
      } else if (!dados.valorTotal && dados.itens.length === 0) {
        setErro("Li o print, mas nao encontrei valor nem itens. Tente copiar o texto da pagina oficial ou tirar um print mais aberto.")
      }
    } catch (error) {
      setOcrState("error")
      setErro(error instanceof Error ? error.message : "OCR falhou ao processar a imagem.")
    }
  }

  const renderUploadPrint = () => (
    <div className="rounded-xl border p-3">
      <Label htmlFor="print-cupom" className="flex items-center gap-2">
        <ImageUp className="h-4 w-4 text-emerald-500" />
        Print ou foto da nota
      </Label>
      <Input
        id="print-cupom"
        type="file"
        accept="image/*"
        className="mt-2"
        onChange={e => processarImagemCupom(e.target.files?.[0] || null)}
      />
      <p className="mt-2 text-xs text-muted-foreground">
        Use um print da consulta oficial ou uma foto nitida do cupom. O OCR roda localmente no aparelho.
      </p>
      {ocrState !== "idle" && (
        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${ocrProgresso}%` }}
            />
          </div>
          <p>{ocrState === "done" ? "OCR concluido" : `${ocrStatus || "Processando"} ${ocrProgresso}%`}</p>
        </div>
      )}
      {imagemCupom && (
        <p className="mt-2 text-xs text-muted-foreground">
          Print compactado e pronto para ficar salvo junto com a compra.
        </p>
      )}
    </div>
  )

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
        nome: nomeEmitente || `Mercado ${formatarCNPJ(cupom.cnpjEmitente)}`,
        tipo,
        cnpj: cupom.cnpjEmitente,
        cor: tipo === "mercado" ? "#16a34a" : "#10b981",
        icone: tipo === "mercado" ? "🛒" : "🏪",
        ativo: true,
      })
      estabelecimentoId = novo.id
    }

    const compra = storeActions.addCompraMercado({
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
      cupomImagem: imagemCupom,
      cupomTextoExtraido: textoOficial.trim() || null,
    })

    if (itensExtraidos.length > 0) {
      storeActions.importarItensCompraMercado(
        compra.id,
        itensExtraidos.map(item => ({ ...item, origem: textoOficial ? "ocr" : "sefaz" }))
      )
    }

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

              {renderUploadPrint()}
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

              {renderUploadPrint()}

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
                  <div className="mt-2 rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">{itensExtraidos.length} itens encontrados para adicionar na despensa.</p>
                    <ul className="mt-1 max-h-24 space-y-0.5 overflow-y-auto">
                      {itensExtraidos.slice(0, 6).map((item, index) => (
                        <li key={`${item.nome}-${index}`}>
                          {item.quantidade} {item.unidade} - {item.nome} ({formatBRL(item.valorTotal)})
                        </li>
                      ))}
                      {itensExtraidos.length > 6 && <li>+ {itensExtraidos.length - 6} itens</li>}
                    </ul>
                  </div>
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
