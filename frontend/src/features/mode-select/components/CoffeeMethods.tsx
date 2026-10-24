import { useState } from "react"
import { Icon } from "../../../shared/components/Icon"

export default function CoffeeMethods() {
  const [copiedMethod, setCopiedMethod] = useState<string | null>(null)

  const copyToClipboard = (text: string, methodKey: string) => {
    navigator.clipboard?.writeText(text)
    setCopiedMethod(methodKey)
    setTimeout(() => setCopiedMethod(null), 2200)
  }

  const PAYPAL_EMAIL = "mm.ameur@esi-sba.dz"
  const REDOTPAY_UID = "1061440746"
  const BARIDIMOB_RIP = "00799999004011905365"

  return (
    <div className="flex flex-col gap-2.5 mt-1 pl-2 sm:pl-3 border-l-2 border-amber-400/40 animate-in fade-in duration-200">
      <div
        className="support-action-card cursor-pointer hover:border-sky-400/60 transition-colors"
        onClick={() => copyToClipboard(PAYPAL_EMAIL, "paypal")}
        title="Click to copy PayPal email"
      >
        <span className="support-action-icon text-sky-400 border-sky-400/40 bg-sky-400/10">
          <Icon name="globe" size={20} />
        </span>
        <div className="flex-1 min-w-0">
          <strong className="block text-xs sm:text-sm font-bold tracking-wider uppercase text-white truncate">
            PAYPAL // {PAYPAL_EMAIL}
          </strong>
        </div>
        <span
          className={`text-xs font-mono uppercase px-2.5 py-1 rounded border shrink-0 transition-colors ${
            copiedMethod === "paypal"
              ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400 font-bold"
              : "border-sky-500/30 bg-sky-500/10 text-sky-300"
          }`}
        >
          {copiedMethod === "paypal" ? "✓ COPIED" : "COPY EMAIL"}
        </span>
      </div>

      <div
        className="support-action-card cursor-pointer hover:border-rose-400/60 transition-colors"
        onClick={() => copyToClipboard(REDOTPAY_UID, "redot")}
        title="Click to copy RedotPay UID"
      >
        <span className="support-action-icon text-rose-400 border-rose-400/40 bg-rose-400/10">
          <Icon name="shield" size={20} />
        </span>
        <div className="flex-1 min-w-0">
          <strong className="block text-xs sm:text-sm font-bold tracking-wider uppercase text-white truncate">
            REDOTPAY // {REDOTPAY_UID}
          </strong>
        </div>
        <span
          className={`text-xs font-mono uppercase px-2.5 py-1 rounded border shrink-0 transition-colors ${
            copiedMethod === "redot"
              ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400 font-bold"
              : "border-rose-500/30 bg-rose-500/10 text-rose-300"
          }`}
        >
          {copiedMethod === "redot" ? "✓ COPIED" : "COPY UID"}
        </span>
      </div>

      <div
        className="support-action-card cursor-pointer hover:border-emerald-400/60 transition-colors"
        onClick={() => copyToClipboard(BARIDIMOB_RIP, "ccp")}
        title="Click to copy BaridiMob RIP"
      >
        <span className="support-action-icon text-emerald-400 border-emerald-400/40 bg-emerald-400/10">
          <Icon name="check" size={20} />
        </span>
        <div className="flex-1 min-w-0">
          <strong className="block text-xs sm:text-sm font-bold tracking-wider uppercase text-white truncate">
            BARIDIMOB // {BARIDIMOB_RIP}
          </strong>
        </div>
        <span
          className={`text-xs font-mono uppercase px-2.5 py-1 rounded border shrink-0 transition-colors ${
            copiedMethod === "ccp"
              ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400 font-bold"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          }`}
        >
          {copiedMethod === "ccp" ? "✓ COPIED" : "COPY RIP"}
        </span>
      </div>
    </div>
  )
}
