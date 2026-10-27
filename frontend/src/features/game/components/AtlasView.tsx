import { Icon } from "../../../shared/components/Icon"
import { GameButton } from "../../../shared/components/GameButton"
import { LeafletMapView } from "./LeafletMapView"
import { MobileTimerPill } from "./MobileTimerPill"
import type { Coordinates } from "../../../types/game"

interface AtlasViewProps {
  currentRound?: number
  totalRounds?: number
  totalScore?: number
  liveLeaderboard?: any[]
  myPin: Coordinates | null
  hasGuessed: boolean
  countdownSeconds?: number | null
  onSelectCoords: (coords: Coordinates) => void
  onLockGuess: () => void
  onCloseAtlas: () => void
}

export function AtlasView({
  myPin,
  hasGuessed,
  countdownSeconds,
  onSelectCoords,
  onLockGuess,
  onCloseAtlas,
}: AtlasViewProps) {
  const isUrgent = countdownSeconds != null && countdownSeconds <= 10

  const handleLockGuess = () => {
    if (typeof window !== "undefined" && window.navigator?.vibrate) {
      window.navigator.vibrate(20)
    }
    onLockGuess()
  }

  return (
    <section className="atlas-view">
      <header className="atlas-header md:hidden">
        <button
          aria-label="Back to Street View"
          className="atlas-back-btn"
          onClick={onCloseAtlas}
          type="button"
        >
          <Icon name="back" size={18} />
          <span>STREET VIEW</span>
        </button>

        <span className="atlas-pin-status inline-flex items-center gap-1.5">
          {hasGuessed ? (
            <>
              <Icon name="check" size={14} /> LOCKED
            </>
          ) : myPin ? (
            <>
              <Icon name="pin" size={14} /> PIN PLACED
            </>
          ) : (
            "TAP MAP"
          )}
        </span>
      </header>

      <div className="atlas-map-container">
        <button
          aria-label="Back to Street View"
          className="atlas-map-back-btn hidden md:inline-flex"
          onClick={onCloseAtlas}
          type="button"
        >
          <Icon name="back" size={16} />
          <span>STREET VIEW [G]</span>
        </button>

        <LeafletMapView
          interactive={!hasGuessed}
          onSelectCoords={onSelectCoords}
          pin={myPin}
          zoom={3}
        />
      </div>

      <footer className="atlas-footer">
        {countdownSeconds != null && (
          <MobileTimerPill countdownSeconds={countdownSeconds} />
        )}
        {hasGuessed ? (
          <div className="atlas-locked-pill flex-1 text-center inline-flex items-center justify-center gap-1.5">
            <Icon name="check" size={14} />
            <span>GUESS LOCKED // WAITING FOR PLAYERS</span>
          </div>
        ) : (
          <GameButton
            className="flex-1"
            disabled={!myPin}
            icon="check"
            onClick={handleLockGuess}
            variant="primary"
          >
            {myPin ? "CONFIRM GUESS" : "TAP MAP TO PLACE PIN"}
          </GameButton>
        )}
      </footer>
    </section>
  )
}

export default AtlasView
