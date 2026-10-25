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
      <div className="text-amber-400 text-5xl animate-spin">⏳</div>
      <div className="text-white font-mono text-xl tracking-widest uppercase text-center">
        Waiting for Squad Leader to approve...
      </div>
      <div className="text-slate-400 font-mono text-sm">
        Requesting entry to: <strong className="text-cyan-400">{pendingRoomName || pendingRoomId || "Squad"}</strong>
      </div>
      <button
        className="mt-4 px-6 py-2 font-mono text-sm text-rose-400 border border-rose-700 rounded hover:bg-rose-900 transition-all cursor-pointer active:scale-95"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onCancel(pendingRoomId)
        }}
        type="button"
      >
        ✕ CANCEL REQUEST
      </button>
    </div>
  )
}

export default PendingApprovalScreen
