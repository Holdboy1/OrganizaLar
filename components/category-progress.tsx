"use client"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"

interface CategoryProgressProps {
  category: string
  icon: ReactNode
  spent: number
  budget: number
  color: string
  className?: string
}

export function CategoryProgress({
  category,
  icon,
  spent,
  budget,
  color,
  className,
}: CategoryProgressProps) {
  const percentage = Math.min((spent / budget) * 100, 100)
  const isOverBudget = spent > budget

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg bg-card p-3 shadow-card transition-all duration-200 hover:shadow-card-hover",
        className
      )}
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full text-white"
        style={{ backgroundColor: color }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-medium">{category}</span>
          <span
            className={cn(
              "text-sm font-semibold tabular-nums",
              isOverBudget ? "text-destructive" : "text-foreground"
            )}
          >
            R$ {spent.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1">
            <div
              className="h-2 overflow-hidden rounded-full bg-muted"
            >
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  isOverBudget ? "bg-destructive" : ""
                )}
                style={{
                  width: `${percentage}%`,
                  backgroundColor: isOverBudget ? undefined : color,
                }}
              />
            </div>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {percentage.toFixed(0)}%
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          de R$ {budget.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </p>
      </div>
    </div>
  )
}

interface ExpenseItemProps {
  rank?: number
  title: string
  category: string
  value: number
  date: string
  icon: ReactNode
  iconColor: string
  className?: string
}

export function ExpenseItem({
  rank,
  title,
  category,
  value,
  date,
  icon,
  iconColor,
  className,
}: ExpenseItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg bg-card p-3 shadow-card transition-all duration-200 hover:shadow-card-hover",
        className
      )}
    >
      {rank && (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold">
          {rank}
        </span>
      )}
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full text-white"
        style={{ backgroundColor: iconColor }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">
          {category} - {date}
        </p>
      </div>
      <span className="font-semibold tabular-nums text-destructive">
        -R$ {value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
      </span>
    </div>
  )
}
