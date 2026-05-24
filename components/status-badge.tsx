"use client"

import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: "paga" | "pendente" | "vencida" | "aberta" | "fechada" | "parcial"
  className?: string
}

const statusConfig = {
  paga: {
    label: "PAGA",
    className: "bg-success/15 text-success border-success/30",
  },
  pendente: {
    label: "PENDENTE",
    className: "bg-warning/15 text-warning-foreground border-warning/30",
  },
  vencida: {
    label: "VENCIDA",
    className: "bg-destructive/15 text-destructive border-destructive/30",
  },
  aberta: {
    label: "ABERTA",
    className: "bg-primary/15 text-primary border-primary/30",
  },
  fechada: {
    label: "FECHADA",
    className: "bg-muted text-muted-foreground border-muted-foreground/30",
  },
  parcial: {
    label: "PARCIAL",
    className: "bg-secondary/15 text-secondary border-secondary/30",
  },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}

interface CategoryBadgeProps {
  category: string
  color?: string
  className?: string
}

export function CategoryBadge({ category, color, className }: CategoryBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground",
        className
      )}
    >
      {color && (
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      {category}
    </span>
  )
}
