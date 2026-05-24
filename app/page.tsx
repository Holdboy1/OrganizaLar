"use client"

import { useState, useEffect } from "react"
import { Topbar } from "@/components/topbar"
import { BottomNav, DesktopTabs } from "@/components/navigation"
import { Dashboard } from "@/components/dashboard"
import { Despesas } from "@/components/despesas"
import { Mercado } from "@/components/mercado"
import { Despensa } from "@/components/despensa"
import { Cartoes } from "@/components/cartoes"
import { Mais } from "@/components/mais"
import { LockScreen } from "@/components/lock-screen"
import { VoiceFAB } from "@/components/voice/voice-fab"
import { PWAInstaller } from "@/components/pwa-installer"
import { StoreHydration } from "@/components/store-hydration"

type Tab = "painel" | "despesas" | "mercado" | "despensa" | "mais"
type SubScreen = "cartoes" | null

function AppContent() {
  const [isLocked, setIsLocked] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>("painel")
  const [subScreen, setSubScreen] = useState<SubScreen>(null)

  const handleUnlock = () => setIsLocked(false)

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    setSubScreen(null)
  }

  const handleNavigateToCartoes = () => {
    setSubScreen("cartoes")
  }

  if (isLocked) {
    return <LockScreen onUnlock={handleUnlock} />
  }

  const renderContent = () => {
    if (subScreen === "cartoes") return <Cartoes />
    switch (activeTab) {
      case "painel": return <Dashboard />
      case "despesas": return <Despesas />
      case "mercado": return <Mercado />
      case "despensa": return <Despensa />
      case "mais": return <Mais onNavigateToCartoes={handleNavigateToCartoes} />
      default: return <Dashboard />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Topbar />

      <div className="hidden md:flex justify-center py-4 border-b border-border bg-background sticky top-14 z-30">
        <DesktopTabs activeTab={activeTab} onTabChange={handleTabChange} />
      </div>

      <main className="mx-auto max-w-3xl px-4 py-6 pb-32 md:pb-24">
        {renderContent()}
      </main>

      <VoiceFAB />
      <PWAInstaller />
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  )
}

export default function OrganizaLar() {
  return (
    <StoreHydration>
      <AppContent />
    </StoreHydration>
  )
}
