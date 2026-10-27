import { Icon } from "../../../shared/components/Icon"
import type { PendingRequest } from "../../../types/game"

interface AdmissionQueueProps {
  pendingRequests: PendingRequest[]
  onAdmit: (clientId: string) => void
  onReject: (clientId: string) => void
}

export function AdmissionQueue({ pendingRequests, onAdmit, onReject }: AdmissionQueueProps) {
  if (pendingRequests.length === 0) return null

  return (
    <section className="panel" style={{ gridColumn: "1 / -1", marginBottom: 0 }}>
      <div className="panel-heading">
        <div className="panel-label">
          <Icon name="players" />
          PENDING ENTRY REQUESTS ({pendingRequests.length})
        </div>
      </div>
      <div className="squad-list">
        {pendingRequests.map((req) => (
          <div className="player" key={req.clientId} style={{ justifyContent: "space-between" }}>
            <span className="player-index inline-flex items-center justify-center">
              <Icon name="hourglass" size={14} />
            </span>
            <span className="player-info">
              <strong>{req.username}</strong>
              <small>Requesting entry · {new Date(req.requestedAt).toLocaleTimeString()}</small>
            </span>
            <span className="flex items-center gap-2">
              <button
                className="px-3 py-1 text-xs font-mono font-bold text-emerald-400 border border-emerald-600 rounded hover:bg-emerald-900 transition-all cursor-pointer inline-flex items-center gap-1"
                onClick={() => onAdmit(req.clientId)}
                type="button"
              >
                <Icon name="check" size={12} /> ADMIT
              </button>
              <button
                className="px-3 py-1 text-xs font-mono font-bold text-rose-400 border border-rose-700 rounded hover:bg-rose-900 transition-all cursor-pointer inline-flex items-center gap-1"
                onClick={() => onReject(req.clientId)}
                type="button"
              >
                <Icon name="close" size={12} /> REJECT
              </button>
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
