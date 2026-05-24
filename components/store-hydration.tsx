"use client"

import { useState, useEffect, ReactNode } from "react"
import { useAppStore } from "@/lib/store/app-store"

/**
 * Garante que o componente filho só renderiza após hidratação do Zustand.
 * Evita mismatches entre SSR (vazio) e CSR (com dados do localStorage).
 */
export function StoreHydration({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    // Verifica se o store já está hidratado
    if (useAppStore.persist.hasHydrated()) {
      setHydrated(true)
      return
    }
    // Senão, escuta o evento de hidratação
    const unsub = useAppStore.persist.onFinishHydration(() => setHydrated(true))
    return unsub
  }, [])

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    )
  }

  return <>{children}</>
}
