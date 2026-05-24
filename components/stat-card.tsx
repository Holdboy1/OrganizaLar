"use client"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: string
  subtitle?: string
  icon?: ReactNode
  trend?: {
    value: string
    positive: boolean
  }
  variant?: "default" | "primary" | "success" | "warning" | "destructive"
  className?: string
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = "default",
  className,
}: StatCardProps) {
  const variants = {
    default: "bg-card",
    primary: "gradient-primary text-white",
    success: "bg-success/10 border-success/20",
    warning: "bg-warning/10 border-warning/20",
    destructive: "bg-destructive/10 border-destructive/20",
  }

  return (
    <div
      className={cn(
        "rounded-xl border p-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover animate-slide-up",
        variants[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p
            className={cn(
              "text-xs font-medium uppercase tracking-wider",
              variant === "primary"
                ? "text-white/80"
                : "text-muted-foreground"
            )}
          >
            {title}
          </p>
          <p
            className={cn(
              "mt-1 text-2xl font-bold tracking-tight",
              variant === "primary" && "text-white"
            )}
          >
            {value}
          </p>
          {subtitle && (
            <p
              className={cn(
                "mt-1 text-xs",
                variant === "primary"
                  ? "text-white/70"
                  : "text-muted-foreground"
              )}
            >
              {subtitle}
            </p>
          )}
          {trend && (
            <p
              className={cn(
                "mt-2 text-xs font-medium",
                trend.positive
                  ? "text-success"
                  : "text-destructive"
              )}
            >
              {trend.positive ? "+" : ""}{trend.value}
            </p>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full",
              variant === "primary"
                ? "bg-white/20"
                : "bg-muted"
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

interface QuickStatProps {
  label: string
  value: string
  variant?: "default" | "success" | "warning" | "destructive"
}

export function QuickStat({ label, value, variant = "default" }: QuickStatProps) {
  const colors = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
  }

  return (
    <div className="flex flex-col items-center rounded-lg bg-muted/50 p-3 text-center">
      <span className="text-lg font-bold tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}
