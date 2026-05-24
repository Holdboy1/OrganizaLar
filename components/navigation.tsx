"use client"

import { useState } from "react"
import { Home, Receipt, ShoppingCart, Package, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"

type Tab = "painel" | "despesas" | "mercado" | "despensa" | "mais"

interface BottomNavProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

const navItems = [
  { id: "painel" as const, label: "Painel", icon: Home },
  { id: "despesas" as const, label: "Despesas", icon: Receipt },
  { id: "mercado" as const, label: "Mercado", icon: ShoppingCart },
  { id: "despensa" as const, label: "Despensa", icon: Package },
  { id: "mais" as const, label: "Mais", icon: MoreHorizontal },
]

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg pb-safe md:hidden">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 px-3 py-3 transition-all duration-200",
                "focus-ring min-h-[56px]",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-transform duration-200",
                  isActive && "scale-110"
                )}
              />
              <span
                className={cn(
                  "text-xs font-medium transition-all duration-200",
                  isActive && "font-semibold"
                )}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

interface DesktopTabsProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

export function DesktopTabs({ activeTab, onTabChange }: DesktopTabsProps) {
  return (
    <nav className="hidden md:flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = activeTab === item.id
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
              "focus-ring",
              isActive
                ? "bg-card text-foreground shadow-card"
                : "text-muted-foreground hover:text-foreground hover:bg-card/50"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
