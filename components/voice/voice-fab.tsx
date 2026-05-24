"use client"

import { useState, useEffect } from "react"
import { Mic, MicOff, Trash2, Check, RefreshCw, Keyboard, AlertCircle, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useVoice } from "@/hooks/use-voice"
import { interpretar } from "@/lib/domain/voz"
import { useAppStore } from "@/lib/store/app-store"
import { storeActions, getStoreState } from "@/lib/store/actions"
import { isoToday, formatBRL } from "@/lib/domain/helpers"
import { buscarEstabelecimentoPorNome } from "@/lib/domain/mercado"
import type { VozAcao, FormaPagamento } from "@/lib/types"
import { cn } from "@/lib/utils"

type Step = "closed" | "listening" | "review" | "manual"

export function VoiceFAB() {
  const [step, setStep] = useState<Step>("closed")
  const [acoes, setAcoes] = useState<VozAcao[]>([])
  const [textoOuvido, setTextoOuvido] = useState("")
  const [textoManual, setTextoManual] = useState("")

  const categorias = useAppStore(s => s.categorias)

  const voice = useVoice({
    autoRestart: true,
    maxRestarts: 5,
    onResult: (texto) => {
      setTextoOuvido(texto)
      processarTexto(texto)
    },
  })

  const abrir = () => {
    setStep("listening")
    setAcoes([])
    setTextoOuvido("")
    voice.reset()
    voice.start()
  }

  const fechar = () => {
    voice.reset()
    setStep("closed")
    setAcoes([])
    setTextoOuvido("")
    setTextoManual("")
  }

  const processarTexto = (texto: string) => {
    const interp = interpretar(texto)
    const acoesDetectadas = interp.acoes && interp.acoes.length > 0
      ? interp.acoes
      : interp.valor
        ? [{
            tipo: interp.tipo || "despesa",
            valor: interp.valor,
            descricao: interp.descricao,
            categoriaSugerida: interp.categoriaSugerida || undefined,
            formaPagamento: interp.formaPagamento || undefined,
            estabelecimento: interp.estabelecimentoSugerido || undefined,
          } as VozAcao]
        : []

    if (acoesDetectadas.length === 0) {
      setAcoes([{
        tipo: "despesa",
        valor: 0,
        descricao: texto || "",
      }])
    } else {
      setAcoes(acoesDetectadas)
    }
    setStep("review")
  }

  const usarTextoManual = () => {
    if (!textoManual.trim()) return
    setTextoOuvido(textoManual)
    processarTexto(textoManual)
  }

  const atualizarAcao = (index: number, dados: Partial<VozAcao>) => {
    setAcoes(prev => prev.map((a, i) => i === index ? { ...a, ...dados } : a))
  }

  const removerAcao = (index: number) => {
    setAcoes(prev => prev.filter((_, i) => i !== index))
  }

  const adicionarAcaoVazia = () => {
    setAcoes(prev => [...prev, {
      tipo: "despesa",
      valor: 0,
      descricao: "",
    }])
  }

  const salvarTodas = () => {
    const validas = acoes.filter(a => a.valor > 0 && a.descricao)
    if (validas.length === 0) return
    for (const acao of validas) salvarAcao(acao)
    fechar()
  }

  const salvarAcao = (acao: VozAcao) => {
    const hoje = isoToday()

    if (acao.tipo === "receita") {
      storeActions.addReceita({
        descricao: acao.descricao,
        categoria: acao.categoriaSugerida || "cat-outros-receita",
        valor: acao.valor,
        data: hoje,
        recebida: true,
        recebidaEm: hoje,
        obs: "Lançado por voz",
      })
    } else if (acao.tipo === "mercado" || acao.tipo === "mercadinho") {
      let estabelecimentoId: string | null = null
      if (acao.estabelecimento) {
        const state = getStoreState()
        const existente = buscarEstabelecimentoPorNome(acao.estabelecimento, acao.tipo, state)
        if (existente) {
          estabelecimentoId = existente.id
        } else {
          const novo = storeActions.addEstabelecimento({
            nome: acao.estabelecimento,
            tipo: acao.tipo,
            cor: acao.tipo === "mercado" ? "#16a34a" : "#10b981",
            icone: acao.tipo === "mercado" ? "🛒" : "🏪",
            ativo: true,
          })
          estabelecimentoId = novo.id
        }
      }
      storeActions.addCompraMercado({
        tipo: acao.tipo,
        estabelecimentoId,
        data: hoje,
        valor: acao.valor,
        formaPagamento: acao.formaPagamento || "dinheiro",
        cartaoId: null,
        obs: "Lançado por voz",
        origem: "voz",
        chaveAcesso: null,
        cnpjEmitente: null,
      })
    } else {
      storeActions.addDespesa({
        descricao: acao.descricao,
        categoria: acao.categoriaSugerida || "cat-outros",
        valor: acao.valor,
        vencimento: hoje,
        paga: true,
        pagaEm: hoje,
        obs: "Lançado por voz",
        recorrenteId: null,
      })
    }
  }

  const numAcoesValidas = acoes.filter(a => a.valor > 0 && a.descricao).length

  return (
    <>
      {/* FAB */}
      <button
        type="button"
        onClick={abrir}
        className={cn(
          "fixed bottom-20 right-4 z-40 md:bottom-6",
          "flex h-14 w-14 items-center justify-center rounded-full",
          "bg-gradient-to-br from-emerald-500 to-emerald-600",
          "text-white shadow-lg shadow-emerald-500/30",
          "transition-all duration-200 hover:scale-110 hover:shadow-emerald-500/50",
          "active:scale-95",
        )}
        aria-label="Lançar por voz"
      >
        <Mic className="h-6 w-6" />
      </button>

      <Dialog open={step !== "closed"} onOpenChange={(open) => !open && fechar()}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-emerald-500" />
              Lançamento por voz
            </DialogTitle>
          </DialogHeader>

          {/* PASSO LISTENING */}
          {step === "listening" && (
            <ListeningView
              voice={voice}
              onParar={() => voice.stop()}
              onTentarNovamente={() => { voice.reset(); voice.start() }}
              onIrPraDigitar={() => { voice.reset(); setStep("manual") }}
              onCancelar={fechar}
            />
          )}

          {/* PASSO MANUAL */}
          {step === "manual" && (
            <div className="space-y-4">
              {voice.erro && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <p>{voice.erro}</p>
                </div>
              )}
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/50">
                <p className="text-sm text-emerald-900 dark:text-emerald-100">
                  💡 Digite a frase como falaria. Pode ser várias coisas separadas por <b>"e"</b>:
                </p>
                <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">
                  Ex: "Gastei 80 no Atacadão e 99 reais de internet"
                </p>
              </div>
              <div>
                <Label htmlFor="texto-manual">Texto:</Label>
                <Input
                  id="texto-manual"
                  autoFocus
                  value={textoManual}
                  onChange={e => setTextoManual(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") usarTextoManual() }}
                  placeholder="Ex: Gastei 50 reais na padaria"
                  className="mt-2"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setStep("listening"); voice.start() }} className="flex-1">
                  <Mic className="mr-2 h-4 w-4" />
                  Voltar pra voz
                </Button>
                <Button
                  onClick={usarTextoManual}
                  disabled={!textoManual.trim()}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                >
                  Processar
                </Button>
              </div>
            </div>
          )}

          {/* PASSO REVIEW */}
          {step === "review" && (
            <div className="space-y-4">
              {textoOuvido && (
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Texto reconhecido:</p>
                  <p className="text-sm italic mt-0.5">"{textoOuvido}"</p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {acoes.length} {acoes.length === 1 ? "lançamento" : "lançamentos"} — revise e edite:
                </p>
                <Button variant="outline" size="sm" onClick={adicionarAcaoVazia}>
                  + Adicionar
                </Button>
              </div>

              <div className="space-y-3">
                {acoes.map((acao, i) => (
                  <AcaoCard
                    key={i}
                    acao={acao}
                    categorias={categorias}
                    onUpdate={(dados) => atualizarAcao(i, dados)}
                    onRemove={() => removerAcao(i)}
                  />
                ))}

                {acoes.length === 0 && (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Nenhum lançamento. Adicione manualmente ou tente falar de novo.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={fechar}>
                  Cancelar
                </Button>
                <Button
                  onClick={salvarTodas}
                  disabled={numAcoesValidas === 0}
                  className="bg-emerald-500 hover:bg-emerald-600"
                >
                  <Check className="mr-2 h-4 w-4" />
                  Salvar {numAcoesValidas > 1 ? `${numAcoesValidas} itens` : ""}
                </Button>
              </div>

              <div className="flex justify-center">
                <Button variant="ghost" size="sm" onClick={() => { setAcoes([]); voice.reset(); setStep("listening"); voice.start() }}>
                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                  Falar de novo
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

interface ListeningViewProps {
  voice: ReturnType<typeof useVoice>
  onParar: () => void
  onTentarNovamente: () => void
  onIrPraDigitar: () => void
  onCancelar: () => void
}

function ListeningView({ voice, onParar, onTentarNovamente, onIrPraDigitar, onCancelar }: ListeningViewProps) {
  const isError = voice.state === "error"
  const isListening = voice.state === "listening"
  const isRequesting = voice.state === "requesting"

  return (
    <div className="space-y-4">
      {/* Status */}
      <div
        className={cn(
          "rounded-lg p-4 text-center transition-colors",
          isError ? "bg-destructive/10" :
            isListening ? "bg-emerald-50 dark:bg-emerald-950/50" :
              "bg-muted"
        )}
      >
        {isRequesting && (
          <p className="text-sm font-medium">Aguardando microfone...</p>
        )}
        {isListening && (
          <div className="space-y-1">
            <p className="text-base font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              Escutando...
            </p>
            <p className="text-xs text-muted-foreground">
              {voice.tempoOuvindo}s · Fale à vontade, eu espero
            </p>
          </div>
        )}
        {isError && (
          <div className="flex items-start gap-2 text-left">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-destructive mt-0.5" />
            <p className="text-sm text-destructive">{voice.erro}</p>
          </div>
        )}
      </div>

      {/* Visualizador de áudio + texto reconhecido */}
      {isListening && (
        <div className="space-y-3">
          {/* Barra de áudio */}
          <div className="flex items-end gap-1 h-16 justify-center">
            {[...Array(20)].map((_, i) => {
              const baseHeight = 8
              const variation = Math.sin(Date.now() / 200 + i) * 4
              const isActive = voice.audioLevel > i * 5
              const height = isActive
                ? Math.min(64, baseHeight + voice.audioLevel * 0.6 + variation)
                : baseHeight
              return (
                <div
                  key={i}
                  className={cn(
                    "w-1.5 rounded-full transition-all duration-100",
                    isActive
                      ? "bg-gradient-to-t from-emerald-500 to-emerald-300"
                      : "bg-muted-foreground/30"
                  )}
                  style={{ height: `${height}px` }}
                />
              )
            })}
          </div>

          {/* Texto sendo reconhecido */}
          <div className="min-h-[80px] rounded-lg border bg-card p-3">
            {voice.textoCompleto ? (
              <p className="text-sm">
                <span className="text-foreground">{voice.textoAcumulado}</span>
                {voice.textoInterim && (
                  <span className="text-muted-foreground italic"> {voice.textoInterim}</span>
                )}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic text-center mt-2">
                Aguardando você falar...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Erro: dicas */}
      {isError && (
        <div className="rounded-lg border bg-muted p-3 text-xs text-muted-foreground">
          <p className="font-semibold mb-1.5">💡 Dicas:</p>
          <ul className="list-disc pl-4 space-y-0.5">
            <li>Permita o microfone se aparecer pop-up</li>
            <li>Verifique se tem internet (a voz precisa)</li>
            <li>Fale claramente, sem barulho de fundo</li>
            <li>Se nada funcionar, use a opção <b>Digitar</b></li>
          </ul>
        </div>
      )}

      {/* Exemplos */}
      {!isError && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/50">
          <p className="text-xs font-medium text-emerald-900 dark:text-emerald-100 mb-1">
            💡 Exemplos do que pode falar:
          </p>
          <ul className="text-xs text-emerald-700 dark:text-emerald-300 space-y-0.5">
            <li>• "Gastei 50 reais na padaria"</li>
            <li>• "Recebi 5000 de salário"</li>
            <li>• "80 no Atacadão e 99 de internet"</li>
          </ul>
        </div>
      )}

      {/* Ações */}
      <div className="space-y-2">
        {isListening && (
          <Button
            onClick={onParar}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
            size="lg"
          >
            <Check className="mr-2 h-5 w-5" />
            {voice.textoCompleto ? "Pronto, processar" : "Parei de falar"}
          </Button>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={onIrPraDigitar}>
            <Keyboard className="mr-2 h-4 w-4" />
            Digitar
          </Button>
          {isError ? (
            <Button onClick={onTentarNovamente} className="bg-emerald-500 hover:bg-emerald-600">
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar novamente
            </Button>
          ) : (
            <Button variant="outline" onClick={onCancelar}>
              Cancelar
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

interface AcaoCardProps {
  acao: VozAcao
  categorias: any[]
  onUpdate: (dados: Partial<VozAcao>) => void
  onRemove: () => void
}

function AcaoCard({ acao, categorias, onUpdate, onRemove }: AcaoCardProps) {
  const corFundo = {
    receita: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800",
    mercado: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800",
    mercadinho: "bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800",
    despesa: "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800",
  }[acao.tipo] || "bg-muted"

  const emoji = {
    receita: "💰",
    mercado: "🛒",
    mercadinho: "🏪",
    despesa: "💸",
  }[acao.tipo] || "📌"

  return (
    <div className={cn("rounded-lg border p-3 space-y-2", corFundo)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{emoji}</span>
          <Select value={acao.tipo} onValueChange={(v) => onUpdate({ tipo: v as any })}>
            <SelectTrigger className="h-7 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="despesa">💸 Despesa</SelectItem>
              <SelectItem value="receita">💰 Receita</SelectItem>
              <SelectItem value="mercado">🛒 Mercado</SelectItem>
              <SelectItem value="mercadinho">🏪 Mercadinho</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="space-y-2">
        <div>
          <Label className="text-[10px] uppercase tracking-wider">Descrição</Label>
          <Input
            value={acao.descricao}
            onChange={e => onUpdate({ descricao: e.target.value })}
            className="h-8 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] uppercase tracking-wider">Valor (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={acao.valor || ""}
              onChange={e => onUpdate({ valor: parseFloat(e.target.value) || 0 })}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-wider">
              {acao.tipo === "mercado" || acao.tipo === "mercadinho" ? "Pagamento" : "Categoria"}
            </Label>
            {(acao.tipo === "mercado" || acao.tipo === "mercadinho") ? (
              <Select
                value={acao.formaPagamento || "dinheiro"}
                onValueChange={(v) => onUpdate({ formaPagamento: v as FormaPagamento })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">💵 Dinheiro</SelectItem>
                  <SelectItem value="debito">💳 Débito</SelectItem>
                  <SelectItem value="credito">💳 Crédito</SelectItem>
                  <SelectItem value="pix">⚡ Pix</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Select
                value={acao.categoriaSugerida || ""}
                onValueChange={(v) => onUpdate({ categoriaSugerida: v })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categorias
                    .filter(c => acao.tipo === "receita" ? c.tipo === "receita" : c.tipo !== "receita")
                    .map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.icone} {c.nome}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {(acao.tipo === "mercado" || acao.tipo === "mercadinho") && (
          <div>
            <Label className="text-[10px] uppercase tracking-wider">Estabelecimento</Label>
            <Input
              value={acao.estabelecimento || ""}
              onChange={e => onUpdate({ estabelecimento: e.target.value })}
              placeholder="Ex: Atacadão"
              className="h-8 text-sm"
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Total:</span>
        <span className="font-bold tabular-nums">{formatBRL(acao.valor)}</span>
      </div>
    </div>
  )
}
