import React from "react"

export type IconName =
  | "arrow"
  | "back"
  | "baridimob"
  | "buymeacoffee"
  | "chart"
  | "check"
  | "clock"
  | "close"
  | "coffee"
  | "copy"
  | "crown"
  | "dice"
  | "github"
  | "globe"
  | "heart"
  | "hourglass"
  | "lightning"
  | "linkedin"
  | "lock"
  | "map"
  | "message"
  | "network"
  | "paypal"
  | "pin"
  | "play"
  | "players"
  | "plus"
  | "portfolio"
  | "radar"
  | "redotpay"
  | "researcher"
  | "scale"
  | "settings"
  | "shield"
  | "star"
  | "swords"
  | "target"
  | "thumbsDown"
  | "thumbsUp"
  | "trophy"
  | "vote"
  | "warning"

const iconPaths: Partial<Record<IconName, React.ReactNode>> = {
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  back: <path d="M19 12H5M11 18l-6-6 6-6" />,
  chart: (
    <>
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  close: <path d="m18 6-12 12M6 6l12 12" />,
  coffee: (
    <>
      <path d="M17 8h1a4 4 0 0 1 0 8h-1M3 8h14v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8ZM6 2v3M10 2v3M14 2v3" />
    </>
  ),
  copy: (
    <>
      <rect height="10" rx="2" width="10" x="8" y="8" />
      <path d="M15 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" />
    </>
  ),
  crown: <path d="M3 18h18l-2-11-5 5-2-7-2 7-5-5-2 11Z" />,
  dice: (
    <>
      <rect height="16" rx="3" width="16" x="4" y="4" />
      <circle cx="8.5" cy="8.5" fill="currentColor" r="1.2" stroke="none" />
      <circle cx="15.5" cy="8.5" fill="currentColor" r="1.2" stroke="none" />
      <circle cx="12" cy="12" fill="currentColor" r="1.2" stroke="none" />
      <circle cx="8.5" cy="15.5" fill="currentColor" r="1.2" stroke="none" />
      <circle cx="15.5" cy="15.5" fill="currentColor" r="1.2" stroke="none" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3.4 3 14.6 0 18M12 3c-3 3.4-3 14.6 0 18" />
    </>
  ),
  heart: (
    <path d="M19.5 12.6 12 20l-7.5-7.4A5 5 0 0 1 12 5.6a5 5 0 0 1 7.5 7Z" />
  ),
  hourglass: (
    <>
      <path d="M5 22h14M5 2h14M17 22v-4a5 5 0 0 0-2.5-4.3L12 12l-2.5 1.7A5 5 0 0 0 7 18v4M7 2v4a5 5 0 0 0 2.5 4.3L12 12l2.5-1.7A5 5 0 0 0 17 6V2" />
    </>
  ),
  lightning: <polygon fill="currentColor" points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
  lock: (
    <>
      <rect height="11" rx="2" width="16" x="4" y="10" />
      <circle cx="12" cy="15.5" r="1.5" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  pin: (
    <>
      <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Z" />
      <circle cx="12" cy="9" r="2.5" />
    </>
  ),
  scale: (
    <>
      <path d="m16 16 3-7 3 7c-.8.6-1.8 1-3 1s-2.2-.4-3-1ZM2 16l3-7 3 7c-.8.6-1.8 1-3 1s-2.2-.4-3-1ZM12 3v18M8 21h8M4 7h16" />
    </>
  ),
  star: (
    <polygon fill="currentColor" points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  ),
  swords: (
    <>
      <path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6 2 2-6-2.5-2.5-5.5 5.5v1ZM9.5 6.5 21 18v3h-3L6.5 9.5" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" fill="currentColor" r="1.5" stroke="none" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </>
  ),
  thumbsDown: (
    <path d="M7 14V2M15 13.5V18a3 3 0 0 0 3 3l4-7V2H10.7a2 2 0 0 0-2 1.7L7.3 12.1a2 2 0 0 0 2 2.4H15Z" />
  ),
  thumbsUp: (
    <path d="M7 10v12M15 10.5V6a3 3 0 0 0-3-3l-4 7v12h11.3a2 2 0 0 0 2-1.7l1.4-8.4a2 2 0 0 0-2-2.4H15Z" />
  ),
  trophy: (
    <>
      <path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2M6 3h12v7a6 6 0 0 1-12 0V3ZM9 21h6M12 16v5" />
    </>
  ),
  vote: (
    <>
      <path d="m9 12 2 2 4-4" />
      <path d="M5 7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7Z" />
    </>
  ),
  warning: (
    <>
      <path d="m10.3 3.2 8.7 15.1A2 2 0 0 1 17.3 21H2.7a2 2 0 0 1-1.7-2.7L9.7 3.2a2 2 0 0 1 3.5 0ZM12 9v4M12 17h.01" />
    </>
  ),
  network: (
    <>
      <rect height="6" rx="1" width="8" x="8" y="3" />
      <rect height="6" rx="1" width="7" x="3" y="15" />
      <rect height="6" rx="1" width="7" x="14" y="15" />
      <path d="M12 9v3M6.5 15v-3h11v3" />
    </>
  ),
  map: (
    <>
      <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" />
      <path d="M9 3v15M15 6v15" />
    </>
  ),
  message: (
    <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" />
  ),
  play: <path d="m6 4 14 8-14 8V4Z" />,
  players: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19v-2.2A4.8 4.8 0 0 1 8.3 12h1.4a4.8 4.8 0 0 1 4.8 4.8V19M16 5.5a3 3 0 0 1 0 5.8M17 13a4.5 4.5 0 0 1 3.5 4.4V19" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  radar: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="5" />
      <path d="M12 12 18.5 5.5M12 3v2M21 12h-2M12 21v-2M3 12h2" />
    </>
  ),
  researcher: (
    <>
      <path d="M12 2L2 7l10 5 10-5-10-5Z" />
      <path d="M5 9.5v5.5c0 2 3.1 3.5 7 3.5s7-1.5 7-3.5V9.5" />
      <path d="M20 9v5" />
      <circle cx="16" cy="16" r="4" />
      <path d="m19 19 3 3" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </>
  ),
  shield: <path d="M12 3 4.5 6v5.2c0 4.6 3.2 8.2 7.5 9.8 4.3-1.6 7.5-5.2 7.5-9.8V6L12 3Z" />,
}

export function Icon({
  name,
  size = 20,
  className = "",
}: {
  name: IconName
  size?: number
  className?: string
}) {
  if (name === "portfolio") {
    return (
      <img
        alt="Portfolio"
        aria-hidden="true"
        className={`icon icon--portfolio ${className}`.trim()}
        height={size}
        src="/icons/portfolio.svg"
        style={{ width: size, height: size, objectFit: "contain" }}
        width={size}
      />
    )
  }

  if (name === "github") {
    return (
      <img
        alt="GitHub"
        aria-hidden="true"
        className={`icon icon--github ${className}`.trim()}
        height={size}
        src="/icons/github.svg"
        style={{ width: size, height: size, objectFit: "contain" }}
        width={size}
      />
    )
  }

  if (name === "linkedin") {
    return (
      <img
        alt="LinkedIn"
        aria-hidden="true"
        className={`icon icon--linkedin ${className}`.trim()}
        height={size}
        src="/icons/linkedin.svg"
        style={{ width: size, height: size, objectFit: "contain", borderRadius: 3 }}
        width={size}
      />
    )
  }

  if (name === "paypal") {
    return (
      <img
        alt="PayPal"
        aria-hidden="true"
        className={`icon icon--paypal ${className}`.trim()}
        height={size}
        src="/icons/paypal.svg"
        style={{ width: size, height: size, objectFit: "contain" }}
        width={size}
      />
    )
  }

  if (name === "redotpay") {
    return (
      <img
        alt="RedotPay"
        aria-hidden="true"
        className={`icon icon--redotpay ${className}`.trim()}
        height={size}
        src="/icons/redotpay.png"
        style={{ width: size, height: size, objectFit: "contain", borderRadius: 4 }}
        width={size}
      />
    )
  }

  if (name === "baridimob") {
    return (
      <img
        alt="BaridiMob"
        aria-hidden="true"
        className={`icon icon--baridimob ${className}`.trim()}
        height={size}
        src="/icons/baridimob.png"
        style={{ width: size, height: size, objectFit: "contain" }}
        width={size}
      />
    )
  }

  if (name === "buymeacoffee" || name === "coffee") {
    return (
      <img
        alt="Buy Me a Coffee"
        aria-hidden="true"
        className={`icon icon--buymeacoffee ${className}`.trim()}
        height={size}
        src="/icons/buymeacoffee.svg"
        style={{ width: size, height: size, objectFit: "contain" }}
        width={size}
      />
    )
  }

  return (
    <svg
      aria-hidden="true"
      className={`icon ${className}`.trim()}
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
        {iconPaths[name]}
      </g>
    </svg>
  )
}

export default Icon
