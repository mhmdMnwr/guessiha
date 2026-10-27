import { useState } from "react"
import "./mode-select.css"
import { EffectsLayer } from "../../shared/components/EffectsLayer"
import { Icon } from "../../shared/components/Icon"
import { FeedbackPanel } from "./components/FeedbackPanel"
import { SupportDeveloperPanel } from "./components/SupportDeveloperPanel"
import { CoffeeSupportModal } from "./components/CoffeeSupportModal"
import { NeonWorldMapBackground } from "./components/NeonWorldMapBackground"
import { BuyMeACoffeeButton } from "./components/BuyMeACoffeeButton"

type MenuModal = "feedback" | "support" | "coffee" | null

const RANDOM_CALLSIGNS = [
  "VIPER", "GHOST", "NOMAD", "SPECTRE", "FALCON", "TITAN",
  "APEX", "COBRA", "SHADOW", "ECHO", "HUNTER", "RAVEN"
]

interface ModeSelectProps {
  isLaunching: boolean
  onContinue: () => void
  username: string
  setUsername: (name: string) => void
  usernameError?: string | null
  isCheckingUsername?: boolean
}

export function ModeSelect({
  isLaunching,
  onContinue,
  username,
  setUsername,
  usernameError,
  isCheckingUsername = false,
}: ModeSelectProps) {
  const [activeModal, setActiveModal] = useState<MenuModal>(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "support" ? "support" : null
  )

  const handlePlayClick = () => {
    if (isCheckingUsername) return
    if (!username.trim()) {
      setUsername("PLAYER-" + Math.floor(10 + Math.random() * 90))
    }
    onContinue()
  }

  const handleRandomizeName = () => {
    const prefix = RANDOM_CALLSIGNS[Math.floor(Math.random() * RANDOM_CALLSIGNS.length)]
    const suffix = Math.floor(10 + Math.random() * 90)
    setUsername(`${prefix}-${suffix}`)
  }

  return (
    <main className={`entry-screen ${isLaunching ? "entry-screen--launching" : ""}`}>
      <EffectsLayer />
      <div className="ambient-grid" />
      <NeonWorldMapBackground />

      <header className="entry-header">
        <BuyMeACoffeeButton onClick={() => setActiveModal("coffee")} />
      </header>

      <section className="entry-content">
        <div className="main-menu-left">
          <h1 className="entry-title" data-text="guessiha">
            guessiha
          </h1>
          <p className="entry-subtitle">
            Drop into unknown roads worldwide. Read the terrain, lock your coordinates, and outscore your opponents in real time.
          </p>

          <div className="username-input-bar">
            <span className="username-input-icon">
              <Icon name="players" size={20} />
            </span>
            <input
              aria-label="Username"
              className="username-input-field"
              maxLength={18}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handlePlayClick()
              }}
              placeholder="ENTER YOUR USERNAME"
              type="text"
              value={username}
              autoComplete="off"
              spellCheck="false"
            />
            <button
              type="button"
              className="username-random-btn flex items-center justify-center text-slate-300 hover:text-white"
              onClick={handleRandomizeName}
              title="Generate random name"
            >
              <Icon name="dice" size={18} />
            </button>
          </div>

          {usernameError && (
            <div className="mt-4 p-3 bg-rose-950/90 border border-rose-500 rounded-lg text-rose-300 text-xs font-mono inline-flex items-center gap-1.5 w-full">
              <Icon name="warning" size={14} /> {usernameError}
            </div>
          )}

          <nav aria-label="Game Main Menu" className="main-menu-nav">
            <button
              className="menu-blade menu-blade--active continue-button"
              disabled={isCheckingUsername}
              onClick={handlePlayClick}
              type="button"
            >
              <span className="menu-blade-icon">
                <Icon name="play" size={24} />
              </span>
              <span className="menu-blade-text">
                <strong>{isCheckingUsername ? "VERIFYING..." : "PLAY"}</strong>
                <small>ENTER ROOM BROWSER &amp; DEPLOY INTO A MATCH</small>
              </span>
              <Icon name="arrow" size={20} />
            </button>

            <button
              className="menu-blade"
              onClick={() => setActiveModal("feedback")}
              type="button"
            >
              <span className="menu-blade-icon">
                <Icon name="message" size={24} />
              </span>
              <span className="menu-blade-text">
                <strong>FEEDBACK</strong>
                <small>REPORT BUGS, SUGGEST MAPS &amp; RATE GAMEPLAY</small>
              </span>
              <Icon name="arrow" size={20} />
            </button>

            <button
              className="menu-blade"
              onClick={() => setActiveModal("support")}
              type="button"
            >
              <span className="menu-blade-icon">
                <Icon name="heart" size={24} />
              </span>
              <span className="menu-blade-text">
                <strong>SUPPORT DEVELOPER</strong>
                <small>BACK THE PROJECT, STAR REPO &amp; SHARE WITH FRIENDS</small>
              </span>
              <Icon name="arrow" size={20} />
            </button>
          </nav>
        </div>
      </section>

      {activeModal && (
        <div className="menu-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="menu-modal-box" onClick={(e) => e.stopPropagation()}>
            {activeModal === "feedback" && (
              <FeedbackPanel onBackToPlay={() => setActiveModal(null)} username={username} />
            )}
            {activeModal === "support" && (
              <SupportDeveloperPanel onBackToPlay={() => setActiveModal(null)} />
            )}
            {activeModal === "coffee" && (
              <CoffeeSupportModal onBackToPlay={() => setActiveModal(null)} />
            )}
          </div>
        </div>
      )}
    </main>
  )
}

export default ModeSelect
