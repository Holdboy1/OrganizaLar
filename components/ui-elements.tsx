"use client"

import { ReactNode } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface MonthSelectorProps {
  month: string
  year: number
  onPrevious: () => void
  onNext: () => void
  className?: string
}

export function MonthSelector({
  month,
  year,
  onPrevious,
  onNext,
  className,
}: MonthSelectorProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-4",
        className
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={onPrevious}
        className="h-8 w-8"
        aria-label="Mes anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-[120px] text-center font-semibold">
        {month}/{year}
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={onNext}
        className="h-8 w-8"
        aria-label="Proximo mes"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

interface ToggleSwitchProps {
  options: [string, string]
  value: string
  onChange: (value: string) => void
  className?: string
}

export function ToggleSwitch({
  options,
  value,
  onChange,
  className,
}: ToggleSwitchProps) {
  return (
    <div
      className={cn(
        "flex items-center rounded-lg bg-muted p-1",
        className
      )}
    >
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={cn(
            "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200",
            value === option
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

interface AlertBannerProps {
  children: ReactNode
  variant?: "info" | "warning" | "error"
  onDismiss?: () => void
  className?: string
}

export function AlertBanner({
  children,
  variant = "info",
  onDismiss,
  className,
}: AlertBannerProps) {
  const variants = {
    info: "bg-primary/10 border-primary/20 text-primary",
    warning: "bg-warning/10 border-warning/20 text-warning-foreground",
    error: "bg-destructive/10 border-destructive/20 text-destructive",
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border px-4 py-3 text-sm animate-slide-down",
        variants[variant],
        className
      )}
    >
      <span>{children}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="ml-2 text-current opacity-70 hover:opacity-100"
          aria-label="Dispensar"
        >
          x
        </button>
      )}
    </div>
  )
}
