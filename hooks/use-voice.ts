"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { mensagemErroVoz } from "@/lib/domain/voz"

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onstart: (() => void) | null
  onresult: ((event: any) => void) | null
  onerror: ((event: any) => void) | null
  onend: (() => void) | null
}

export type VoiceState = "idle" | "requesting" | "listening" | "result" | "error"

interface UseVoiceOptions {
  onResult?: (texto: string) => void
  onError?: (mensagem: string) => void
  onPartial?: (texto: string) => void
  autoRestart?: boolean
  maxRestarts?: number
}

function criarRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SpeechRecognition) return null

  const recognition = new SpeechRecognition() as SpeechRecognitionLike
  recognition.lang = "pt-BR"
  recognition.continuous = true
  recognition.interimResults = true
  recognition.maxAlternatives = 1
  return recognition
}

export function useVoice(options: UseVoiceOptions = {}) {
  const { onResult, onError, onPartial, autoRestart = true, maxRestarts = 4 } = options

  const [state, setState] = useState<VoiceState>("idle")
  const [textoAcumulado, setTextoAcumulado] = useState("")
  const [textoInterim, setTextoInterim] = useState("")
  const [erro, setErro] = useState<string | null>(null)
  const [audioLevel, setAudioLevel] = useState(0)
  const [tempoOuvindo, setTempoOuvindo] = useState(0)

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const timerIdRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const meterIdRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAtRef = useRef(0)
  const restartCountRef = useRef(0)
  const shouldListenRef = useRef(false)
  const finalTextRef = useRef("")
  const interimTextRef = useRef("")

  const limparTimers = useCallback(() => {
    if (timerIdRef.current) clearInterval(timerIdRef.current)
    if (meterIdRef.current) clearInterval(meterIdRef.current)
    timerIdRef.current = null
    meterIdRef.current = null
    setAudioLevel(0)
  }, [])

  const finalizarComErro = useCallback((mensagem: string) => {
    shouldListenRef.current = false
    limparTimers()
    setErro(mensagem)
    setState("error")
    onError?.(mensagem)
  }, [limparTimers, onError])

  const processarTextoFinal = useCallback(() => {
    const texto = `${finalTextRef.current} ${interimTextRef.current}`.trim()
    if (!texto) {
      finalizarComErro("Nao ouvi nada. Toque no microfone e fale a frase novamente.")
      return
    }
    shouldListenRef.current = false
    limparTimers()
    setTextoAcumulado(texto)
    setTextoInterim("")
    setState("result")
    onResult?.(texto)
  }, [finalizarComErro, limparTimers, onResult])

  const start = useCallback(() => {
    if (typeof window === "undefined") return

    const recognition = criarRecognition()
    if (!recognition) {
      finalizarComErro("Este navegador nao oferece reconhecimento de voz nativo. No Android, teste pelo Chrome atualizado.")
      return
    }

    try {
      recognitionRef.current?.abort()
    } catch {}

    recognitionRef.current = recognition
    shouldListenRef.current = true
    restartCountRef.current = 0
    finalTextRef.current = ""
    interimTextRef.current = ""
    setErro(null)
    setTextoAcumulado("")
    setTextoInterim("")
    setTempoOuvindo(0)
    setAudioLevel(12)
    setState("requesting")

    recognition.onstart = () => {
      setState("listening")
      startedAtRef.current = Date.now()
      timerIdRef.current = setInterval(() => {
        setTempoOuvindo(Math.floor((Date.now() - startedAtRef.current) / 1000))
      }, 250)
      meterIdRef.current = setInterval(() => {
        setAudioLevel(20 + Math.round(Math.random() * 55))
      }, 120)
    }

    recognition.onresult = (event: any) => {
      let final = ""
      let interim = ""

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = String(event.results[i][0]?.transcript || "")
        if (event.results[i].isFinal) final += transcript
        else interim += transcript
      }

      if (final) finalTextRef.current = `${finalTextRef.current} ${final}`.trim()
      interimTextRef.current = interim.trim()
      setTextoAcumulado(finalTextRef.current)
      setTextoInterim(interimTextRef.current)
      onPartial?.(`${finalTextRef.current} ${interimTextRef.current}`.trim())
    }

    recognition.onerror = (event: any) => {
      const code = String(event?.error || "unknown")
      if (code === "no-speech" && autoRestart && shouldListenRef.current && restartCountRef.current < maxRestarts) {
        restartCountRef.current += 1
        try {
          recognition.start()
        } catch {}
        return
      }
      finalizarComErro(mensagemErroVoz(code))
    }

    recognition.onend = () => {
      if (!shouldListenRef.current) return
      if (autoRestart && restartCountRef.current < maxRestarts && !finalTextRef.current) {
        restartCountRef.current += 1
        try {
          recognition.start()
        } catch {
          processarTextoFinal()
        }
        return
      }
      processarTextoFinal()
    }

    try {
      recognition.start()
    } catch {
      finalizarComErro("Nao consegui iniciar o reconhecimento de voz.")
    }
  }, [autoRestart, finalizarComErro, maxRestarts, onPartial, processarTextoFinal])

  const stop = useCallback(() => {
    shouldListenRef.current = false
    const recognition = recognitionRef.current
    if (!recognition) {
      processarTextoFinal()
      return
    }
    try {
      recognition.stop()
    } catch {
      processarTextoFinal()
    }
    processarTextoFinal()
  }, [processarTextoFinal])

  const reset = useCallback(() => {
    shouldListenRef.current = false
    try {
      recognitionRef.current?.abort()
    } catch {}
    recognitionRef.current = null
    finalTextRef.current = ""
    interimTextRef.current = ""
    limparTimers()
    setState("idle")
    setTextoAcumulado("")
    setTextoInterim("")
    setErro(null)
    setTempoOuvindo(0)
  }, [limparTimers])

  useEffect(() => reset, [reset])

  return {
    state,
    textoAcumulado,
    textoInterim,
    textoCompleto: `${textoAcumulado} ${textoInterim}`.trim(),
    erro,
    audioLevel,
    tempoOuvindo,
    start,
    stop,
    reset,
  }
}
