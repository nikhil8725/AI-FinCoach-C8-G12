import { useCallback, useState, type ReactNode } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { ToastContext } from '../../hooks/useToast'

interface Toast {
  id: number
  message: string
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string) => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000)
  }, [])

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id))

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 left-1/2 z-[100] flex -translate-x-1/2 flex-col gap-2 px-4 sm:bottom-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="animate-fc-in flex items-center gap-2 rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-white shadow-lg"
          >
            <AlertTriangle size={16} className="text-brand-light shrink-0" />
            <span>{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="ml-2 text-white/60 hover:text-white">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
