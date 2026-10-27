import { Icon } from "../../../shared/components/Icon"
import { GameButton } from "../../../shared/components/GameButton"
import CoffeeMethods from "./CoffeeMethods"

interface CoffeeSupportModalProps {
  onBackToPlay: () => void
}

export function CoffeeSupportModal({ onBackToPlay }: CoffeeSupportModalProps) {
  return (
    <div className="menu-stage-panel panel">
      <div className="menu-stage-header">
        <span className="section-index">/ COMMUNITY BACKING</span>
        <div className="flex items-center gap-2">
          <span className="text-amber-400">
            <Icon name="buymeacoffee" size={24} />
          </span>
          <h2 className="menu-stage-title">SUPPORT GUESSIHA</h2>
        </div>
      </div>

      <div className="my-4">
        <div className="p-3 mb-3 rounded-lg bg-amber-950/20 border border-amber-500/30 text-amber-200/90 text-xs font-mono leading-relaxed">
          <p className="font-semibold text-amber-300 mb-1 flex items-center gap-1.5">
            <Icon name="star" size={14} /> Server Hosting &amp; Ongoing Development
          </p>
          All contributions directly fund AWS EC2 server deployment, PostGIS database bandwidth, road proxy caches, and ongoing game improvements.
        </div>

        <CoffeeMethods />
      </div>

      <div className="flex justify-end mt-5 pt-3 border-t border-slate-800">
        <GameButton icon="play" onClick={onBackToPlay} variant="primary">
          BACK TO PLAY
        </GameButton>
      </div>
    </div>
  )
}

export default CoffeeSupportModal
