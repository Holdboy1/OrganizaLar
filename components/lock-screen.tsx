"use client"

import { useState, useRef, useEffect } from "react"
import { Home, Fingerprint } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface LockScreenProps {
  onUnlock: () => void
}

export function LockScreen({ onUnlock }: LockScreenProps) {
  const [pin, setPin] = useState("")
  const [error, setError] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const correctPin = "1234" // Mock PIN

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handlePinChange = (value: string) => {
    if (value.length <= 10) {
      setPin(value)
      setError(false)

      // Auto-submit when PIN reaches expected length
      if (value.length === 4) {
        if (value === correctPin) {
          onUnlock()
        } else {
          setError(true)
          setTimeout(() => {
            setPin("")
          }, 500)
        }
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pin === correctPin) {
      onUnlock()
    } else {
      setError(true)
      setTimeout(() => {
        setPin("")
      }, 500)
    }
  }

  const handleBiometrics = () => {
    // Mock biometrics success
    onUnlock()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gradient-balance px-6">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10" />
        <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-white/5" />
        <div className="absolute right-1/4 top-1/3 h-32 w-32 rounded-full bg-white/5" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo */}
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
          <Home className="h-10 w-10 text-white" />
        </div>

        {/* Title */}
        <h1 className="mb-8 text-3xl font-bold text-white">OrganizaLar</h1>

        {/* PIN Input */}
        <form onSubmit={handleSubmit} className="flex flex-col items-center">
          <div className="mb-6 flex gap-3">
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-xl border-2 bg-white/10 text-2xl font-bold text-white backdrop-blur-sm transition-all duration-200",
                  pin.length > index ? "border-white" : "border-white/30",
                  error && "animate-shake border-red-400"
                )}
              >
                {pin.length > index ? "•" : ""}
              </div>
            ))}
          </div>

          <input
            ref={inputRef}
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            value={pin}
            onChange={(e) => handlePinChange(e.target.value.replace(/\D/g, ""))}
            className="sr-only"
            aria-label="Digite seu PIN"
            autoComplete="off"
          />

          {error && (
            <p className="mb-4 text-sm text-red-200 animate-fade-in">
              PIN incorreto. Tente novamente.
            </p>
          )}

          <Button
            type="submit"
            className="mb-4 w-full bg-white text-primary hover:bg-white/90"
          >
            Entrar
          </Button>
        </form>

        {/* Biometrics Button */}
        <button
          onClick={handleBiometrics}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Fingerprint className="h-5 w-5" />
          <span>Usar biometria</span>
        </button>

        {/* Hint */}
        <p className="mt-8 text-center text-sm text-white/60">
          Digite 1234 para desbloquear (demo)
        </p>
      </div>

      {/* Shake Animation */}
      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-8px); }
          80% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  )
}
