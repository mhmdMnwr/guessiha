interface RoundResultsLeaderboardProps {
  currentLeaderboard: any[]
  currentRound: number
}

export function RoundResultsLeaderboard({
  currentLeaderboard,
  currentRound,
}: RoundResultsLeaderboardProps) {
  return (
    <div className="round-leaderboard-container mt-3 mb-3">
      <div className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-2 flex items-center justify-between">
        <span>STANDINGS AFTER ROUND {currentRound}</span>
        <span className="text-slate-500 font-bold">{currentLeaderboard.length} PLAYERS</span>
      </div>

      <div className="round-leaderboard-header">
        <span className="round-header-rank">#</span>
        <span className="round-header-name">PLAYER</span>
        <span className="round-header-dist">DIST</span>
        <span className="round-header-added">ROUND</span>
        <span className="round-header-score">TOTAL</span>
      </div>

      <div className="round-leaderboard-list max-h-48 overflow-y-auto pr-1">
        {currentLeaderboard.map((player: any) => {
          const addedScore = player.roundScore ?? player.score ?? 0
          return (
            <div
              className={`round-leaderboard-item ${player.isLocal ? "round-leaderboard-item--you" : ""}`}
              key={player.username}
            >
              <span className="round-rank font-mono text-xs font-bold text-slate-400">
                {player.rank === 1 ? "👑 01" : String(player.rank).padStart(2, "0")}
              </span>
              <span className="round-player-name truncate font-semibold text-sm">
                {player.username}
                {player.isLocal && <span className="you-pill ml-1.5 text-xs font-mono text-sky-400 font-bold">[YOU]</span>}
                {player.isHost && <span className="host-pill ml-1 text-xs font-mono text-amber-400 font-bold">👑</span>}
              </span>
              <span className="round-player-dist font-mono text-xs text-slate-400">
                {player.distanceKm != null ? `${Math.round(player.distanceKm)} km` : "MISSED"}
              </span>
              <span className="round-player-added font-mono text-xs font-bold text-[#c7ff3d] text-right">
                +{addedScore.toLocaleString()}
              </span>
              <span className="round-player-score font-mono text-sm font-bold text-sky-400 text-right">
                {(player.totalScore || 0).toLocaleString()}{" "}
                <span className="hidden sm:inline">PTS</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default RoundResultsLeaderboard
