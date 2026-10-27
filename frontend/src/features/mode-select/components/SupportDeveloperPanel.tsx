import { Icon } from "../../../shared/components/Icon"
import { GameButton } from "../../../shared/components/GameButton"

interface SupportDeveloperPanelProps {
  onBackToPlay: () => void
}

export function SupportDeveloperPanel({
  onBackToPlay,
}: SupportDeveloperPanelProps) {
  return (
    <div className="menu-stage-panel panel">
      <div className="menu-stage-header">
        <span className="section-index">/ DEVELOPER &amp; COMMUNITY</span>
        <h2 className="menu-stage-title">DEVELOPER PROFILE &amp; REPO</h2>
      </div>

      <div className="flex flex-col gap-3 my-4">
        {/* 1. PORTFOLIO */}
        <a
          className="support-action-card hover:border-red-500/70 transition-colors"
          href="https://mnwrameur.netlify.app/"
          rel="noreferrer"
          target="_blank"
        >
          <span className="support-action-icon text-red-400 border-red-500/40 bg-red-950/20 shrink-0">
            <Icon name="portfolio" size={24} />
          </span>
          <div className="flex-1 min-w-0">
            <strong className="block text-sm font-bold tracking-wider uppercase text-white">
              PORTFOLIO // MOHAMMED MENOUER AMEUR
            </strong>
            <span className="text-xs text-slate-400 block truncate">
              Explore full-stack applications, projects &amp; experience
            </span>
          </div>
          <Icon name="arrow" size={18} />
        </a>

        {/* 2. GITHUB */}
        <a
          className="support-action-card hover:border-slate-400 transition-colors"
          href="https://github.com/mhmdMnwr/guessiha"
          rel="noreferrer"
          target="_blank"
        >
          <span className="support-action-icon text-slate-200 border-slate-700 bg-slate-800/60 shrink-0">
            <Icon name="github" size={22} />
          </span>
          <div className="flex-1 min-w-0">
            <strong className="block text-sm font-bold tracking-wider uppercase text-white">
              GITHUB // GUESSIHA REPO
            </strong>
            <span className="text-xs text-slate-400 block truncate">
              Star the repository &amp; explore open-source code
            </span>
          </div>
          <Icon name="arrow" size={18} />
        </a>

        {/* 3. LINKEDIN */}
        <a
          className="support-action-card hover:border-sky-400/80 transition-colors"
          href="https://www.linkedin.com/in/mohammed-menouer-ameur-a0448a334"
          rel="noreferrer"
          target="_blank"
        >
          <span className="support-action-icon text-[#0077b5] border-sky-500/40 bg-sky-950/20 shrink-0">
            <Icon name="linkedin" size={22} />
          </span>
          <div className="flex-1 min-w-0">
            <strong className="block text-sm font-bold tracking-wider uppercase text-white">
              LINKEDIN // MOHAMMED MENOUER AMEUR
            </strong>
            <span className="text-xs text-slate-400 block truncate">
              Connect for engineering collaborations &amp; opportunities
            </span>
          </div>
          <Icon name="arrow" size={18} />
        </a>
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
