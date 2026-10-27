import { Icon } from "../../../shared/components/Icon"

interface PendingApprovalScreenProps {
  pendingRoomName: string | null
  pendingRoomId?: string | null
  onCancel: (roomId?: string | null) => void
}

export function PendingApprovalScreen({
  pendingRoomName,
  pendingRoomId,
  onCancel,
}: PendingApprovalScreenProps) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-950 z-50 gap-6">
      <div className="text-amber-400">
        <Icon name="hourglass" size={48} />
      </div>
      <div className="text-white font-mono text-xl tracking-widest uppercase text-center">
        Waiting for Host to approve...
      </div>
      <div className="text-slate-400 font-mono text-sm">
        Requesting entry to: <strong className="text-cyan-400">{pendingRoomName || pendingRoomId || "Room"}</strong>
      </div>
      <button
        className="mt-4 px-6 py-2 font-mono text-sm text-rose-400 border border-rose-700 rounded hover:bg-rose-900 transition-all cursor-pointer active:scale-95 inline-flex items-center gap-2"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onCancel(pendingRoomId)
        }}
        type="button"
      >
        <Icon name="close" size={14} /> CANCEL REQUEST
      </button>
    </div>
  )
}

export default PendingApprovalScreen
