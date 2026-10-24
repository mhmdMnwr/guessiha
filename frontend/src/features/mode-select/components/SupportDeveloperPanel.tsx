import { useState } from "react"
import { Icon } from "../../../shared/components/Icon"
import { GameButton } from "../../../shared/components/GameButton"
import CoffeeMethods from "./CoffeeMethods"

interface SupportDeveloperPanelProps {
  onBackToPlay: () => void
}

export function SupportDeveloperPanel({
  onBackToPlay,
}: SupportDeveloperPanelProps) {
  const [showCoffee, setShowCoffee] = useState(() =>
    Boolean(typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "support")
  )

  return (
    <div className="menu-stage-panel panel">
      <div className="menu-stage-header">
        <span className="section-index">/ DEVELOPER &amp; COMMUNITY</span>
        <h2 className="menu-stage-title">SUPPORT DEVELOPER</h2>
      </div>

      <div className="flex flex-col gap-3 my-4">
        {/* 1. GITHUB */}
        <a
          className="support-action-card"
          href="https://github.com/mhmdMnwr"
          rel="noreferrer"
          target="_blank"
        >
          <span className="support-action-icon text-amber-400 border-amber-400/40 bg-amber-400/10">
            <Icon name="crown" size={20} />
          </span>
          <div className="flex-1 min-w-0">
            <strong className="block text-sm font-bold tracking-wider uppercase text-white">
              GITHUB // @mhmdMnwr
            </strong>
            <span className="text-xs text-slate-400 block truncate">
              Star the repository &amp; explore source code
            </span>
          </div>
          <Icon name="arrow" size={18} />
        </a>

        {/* 2. LINKEDIN */}
        <a
          className="support-action-card"
          href="https://www.linkedin.com/in/mohammed-menouer-ameur-a0448a334"
          rel="noreferrer"
          target="_blank"
        >
          <span className="support-action-icon text-sky-400 border-sky-400/40 bg-sky-400/10">
            <Icon name="network" size={20} />
          </span>
          <div className="flex-1 min-w-0">
            <strong className="block text-sm font-bold tracking-wider uppercase text-white">
              LINKEDIN // MOHAMMED MENOUER AMEUR
            </strong>
            <span className="text-xs text-slate-400 block truncate">
              Connect for collaborations &amp; opportunities
            </span>
          </div>
          <Icon name="arrow" size={18} />
        </a>

        {/* 3. BUY ME A COFFEE (Click expands the 3 payment methods) */}
        <button
          className={`support-action-card text-left cursor-pointer transition-all ${
            showCoffee ? "border-amber-400/80 bg-amber-950/20" : ""
          }`}
          onClick={() => setShowCoffee(!showCoffee)}
          type="button"
        >
          <span className="support-action-icon text-amber-400 border-amber-400/40 bg-amber-400/10 text-xl">
            ☕
          </span>
          <div className="flex-1 min-w-0">
            <strong className="block text-sm font-bold tracking-wider uppercase text-white">
              BUY ME A COFFEE
            </strong>
          </div>
          <span
            className={`text-amber-400 text-sm font-bold transition-transform duration-200 ${
              showCoffee ? "rotate-90" : ""
            }`}
          >
            ▶
          </span>
        </button>

        {showCoffee && <CoffeeMethods />}
      </div>

      <div className="flex justify-end mt-5 pt-3 border-t border-slate-800">
        <GameButton icon="play" onClick={onBackToPlay} variant="primary">
          BACK TO PLAY
        </GameButton>
      </div>
    </div>
  )
}

export default SupportDeveloperPanel
