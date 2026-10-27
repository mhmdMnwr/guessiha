import { Icon } from "./Icon"

export interface ToastItem {
  id: string
  message: string
  type?: "info" | "success" | "warning" | "error"
  timestamp?: number
}

interface ToastContainerProps {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      className="fixed inset-x-0 mx-auto w-fit max-w-[min(440px,calc(100vw-32px))] z-[9999] pointer-events-none flex flex-col items-center gap-1.5 px-3 top-[calc(var(--sat,0px)+54px)] md:top-[calc(var(--sat,0px)+12px)]"
    >
      {toasts.map((toast, index) => {
        const isOlderThanOneOnMobile = index < toasts.length - 1
        const type = toast.type || "info"
        const borderColor =
          type === "success"
            ? "border-emerald-500/80 shadow-[0_4px_20px_rgba(16,185,129,0.25)]"
            : type === "warning"
              ? "border-amber-500/80 shadow-[0_4px_20px_rgba(245,158,11,0.25)]"
              : type === "error"
                ? "border-rose-500/80 shadow-[0_4px_20px_rgba(244,63,94,0.25)]"
                : "border-sky-500/80 shadow-[0_4px_20px_rgba(14,165,233,0.25)]"

        const badgeColor =
          type === "success"
            ? "bg-emerald-500/20 text-emerald-400"
            : type === "warning"
              ? "bg-amber-500/20 text-amber-400"
              : type === "error"
                ? "bg-rose-500/20 text-rose-400"
                : "bg-sky-500/20 text-sky-400"

        const iconName =
          type === "success" ? "check" : type === "warning" ? "clock" : type === "error" ? "radar" : "globe"

        return (
          <div
            className={`pointer-events-auto items-center gap-2 py-1 px-3 sm:py-2 sm:px-3.5 bg-slate-950/95 border ${borderColor} rounded-full backdrop-blur-xl transition-all shadow-lg animate-in slide-in-from-top-2 duration-200 cursor-pointer ${
              isOlderThanOneOnMobile ? "hidden md:flex" : "flex"
            }`}
            key={toast.id}
            onClick={() => onDismiss(toast.id)}
            role="status"
          >
            <span
              className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center shrink-0 text-[9px] sm:text-[10px] ${badgeColor}`}
            >
              <Icon name={iconName} size={11} />
            </span>
            <div className="text-[11px] sm:text-xs font-mono font-medium text-slate-100 tracking-wide truncate max-w-[240px] sm:max-w-[340px]">
              {toast.message}
            </div>
            <button
              aria-label="Dismiss notification"
              className="text-slate-400 hover:text-white p-0.5 transition-colors shrink-0 cursor-pointer bg-transparent border-0 flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation()
                onDismiss(toast.id)
              }}
              type="button"
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
