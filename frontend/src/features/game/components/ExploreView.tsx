import { Icon } from "../../../shared/components/Icon"
import { GameButton } from "../../../shared/components/GameButton"
import { LeafletMapView } from "./LeafletMapView"
import { MobileTimerPill } from "./MobileTimerPill"
import type { Coordinates, Room } from "../../../types/game"

interface ExploreViewProps {
  room: Room
  currentRound: number
  totalRounds: number
  totalScore: number
  liveLeaderboard: any[]
  myPin: Coordinates | null
  hasGuessed: boolean
  countdownSeconds?: number | null
  onSelectCoords: (coords: Coordinates) => void
  onLockGuess: () => void
  onOpenAtlas: () => void
}

export function ExploreView({
  hasGuessed,
  myPin,
  countdownSeconds,
  onSelectCoords,
  onLockGuess,
  onOpenAtlas,
}: ExploreViewProps) {
  return (
    <>
      <aside className={`guess-console hidden md:block ${myPin ? "guess-console--active" : ""}`}>
        <div className="guess-heading">
          <span>
            <Icon name="map" />
            TACTICAL ATLAS
          </span>
          <small>{hasGuessed ? "GUESS LOCKED" : myPin ? "PIN PLACED" : "CLICK TO DROP PIN"}</small>
        </div>
        <div className="tactical-map overflow-hidden rounded-lg">
          <LeafletMapView
            interactive={!hasGuessed}
            onSelectCoords={onSelectCoords}
            pin={myPin}
          />
        </div>
        <div className="map-actions">
          <span>
            <small>STATUS</small>
            <strong>{hasGuessed ? "LOCKED IN" : myPin ? "PIN PLACED" : "NO PIN"}</strong>
          </span>
          {hasGuessed ? (
            <div className="text-xs font-mono text-[#c7ff3d] font-bold px-3 py-2 bg-[#090e10] border border-[#c7ff3d]/40 rounded">
              LOCKED IN
            </div>
          ) : (
            <GameButton disabled={!myPin} icon="check" onClick={onLockGuess} variant="primary">
              CONFIRM GUESS
            </GameButton>
          )}
        </div>
      </aside>

      <div className="explore-floating-actions md:hidden">
        {countdownSeconds != null && (
          <MobileTimerPill countdownSeconds={countdownSeconds} />
        )}
        <button
          aria-label="Open Map to Guess"
          className={`explore-guess-fab flex-1 ${
            hasGuessed
              ? "explore-guess-fab--locked"
              : myPin
                ? "explore-guess-fab--pinned"
                : ""
          }`}
          onClick={onOpenAtlas}
          type="button"
        >
          <span className="explore-guess-fab-icon">
            <Icon name={hasGuessed ? "check" : "map"} size={20} />
          </span>
          <span className="explore-guess-fab-label">
            {hasGuessed
              ? "GUESS LOCKED"
              : myPin
                ? "PIN SET · CONFIRM GUESS"
                : "PLACE GUESS"}
          </span>
        </button>
      </div>
    </>
  )
}

export default ExploreView
