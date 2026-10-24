import { Icon } from "../../../shared/components/Icon"

interface MobileTimerPillProps {
  countdownSeconds: number | null
}

export function MobileTimerPill({ countdownSeconds }: MobileTimerPillProps) {
  if (countdownSeconds == null) return null
  const isUrgent = countdownSeconds <= 10
  const minutes = String(Math.floor(countdownSeconds / 60)).padStart(2, "0")
  const seconds = String(countdownSeconds % 60).padStart(2, "0")

  return (
    <div
      className={`mobile-timer-pill ${isUrgent ? "mobile-timer-pill--urgent" : ""}`}
      title="Round Countdown"
    >
      <Icon name="clock" size={15} />
      <span>
        {minutes}:{seconds}
      </span>
    </div>
  )
}

export default MobileTimerPill
