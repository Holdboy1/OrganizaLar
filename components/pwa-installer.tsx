"use client"

import { useEffect, useState } from "react"
import { Download, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function PWAInstaller() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    // Registra Service Worker (não força reload — evita loops)
    if ("serviceWorker" in navigator) {
      // Pequeno delay pra não atrapalhar primeira renderização
      const timer = setTimeout(() => {
        navigator.serviceWorker
          .register("/sw.js", { scope: "/" })
          .then((reg) => {
            // Se há SW antigo waiting, manda pular
            if (reg.waiting) {
              reg.waiting.postMessage("SKIP_WAITING")
            }
          })
          .catch((err) => {
            console.warn("SW registration failed:", err)
          })
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [])

  // Listener separado para evento de instalação
  useEffect(() => {
    if (typeof window === "undefined") return

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
      const t = setTimeout(() => setShowInstallBanner(true), 5000)
      return () => clearTimeout(t)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall)
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall)
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return
    try {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      if (choice.outcome === "accepted") {
        setInstallPrompt(null)
        setShowInstallBanner(false)
      }
    } catch {
      setShowInstallBanner(false)
    }
  }

  if (!showInstallBanner || !installPrompt) return null

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 mx-auto max-w-md rounded-xl border bg-card p-4 shadow-xl md:bottom-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
          <Download className="h-5 w-5 text-emerald-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Instalar OrganizaLar</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Adicione à tela inicial para acessar como app
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2"
            onClick={() => setShowInstallBanner(false)}
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            className="bg-emerald-500 hover:bg-emerald-600"
            onClick={handleInstall}
          >
            Instalar
          </Button>
        </div>
      </div>
    </div>
  )
}
