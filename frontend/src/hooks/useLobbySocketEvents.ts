import type { MutableRefObject } from "react"
import type { Socket } from "socket.io-client"
import { deriveAesGcmKey } from "../crypto-client"
import { setStoredActiveRoom } from "../shared/utils/cookies"
import type { Room } from "../types/game"
import type { ToastItem } from "../shared/components/ToastContainer"
import type { AppState } from "./useAppState"
import { bindCrownSocketEvents } from "./useCrownSocketEvents"

export interface LobbySocketContext {
  socket: Socket
  state: AppState
  stateRef: MutableRefObject<AppState>
  ecdhKeyPairRef: MutableRefObject<CryptoKeyPair | null>
  aesKeyRef: MutableRefObject<CryptoKey | null>
  pendingUsernameCheckRef: MutableRefObject<((available: boolean) => void) | null>
  addToast: (message: string, type?: ToastItem["type"]) => void
}

export function bindLobbySocketEvents(ctx: LobbySocketContext) {
  const { socket, state } = ctx

  const clearSessionToBrowser = () => {
    state.setActiveRoom(null)
    setStoredActiveRoom(null)
    ctx.aesKeyRef.current = null
    state.updateScreen("browser", undefined, true)
  }

  socket.on("error_message", (data: any) => {
    state.setIsCreatingRoom(false)
    state.setIsCheckingUsername(false)
    const msg = data.message || "Squad protocol error."
    if (msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("lobby not found")) return clearSessionToBrowser()
    if (msg.toLowerCase().includes("codename") || msg.toLowerCase().includes("username")) {
      state.setUsernameError(msg)
    } else {
      alert(msg)
    }
  })

  socket.on("username_check_result", (data: any) => {
    state.setIsCheckingUsername(false)
    ctx.pendingUsernameCheckRef.current?.(data.available)
    ctx.pendingUsernameCheckRef.current = null
    state.setUsernameError(data.available ? null : `Codename "${data.username}" is already taken by another player.`)
  })

  socket.on("lobbies_list", (list: Room[]) => state.setLobbies(list || []))
  socket.on("room_code_lookup_result", (data: any) => state.setSearchedRoom(data?.room || null))

  socket.on("lobby_joined", async (data: any) => {
    const cur = ctx.stateRef.current
    const isHostRole = Boolean(data.isHost) || data.role === "HOST"
    if (!isHostRole && !cur.isCreatingRoom && cur.screen !== "pending" && cur.pendingRoomId !== data.roomId && cur.activeRoom?.id !== data.roomId) {
      console.warn("Discarding late lobby_joined for cancelled room:", data.roomId)
      socket.emit("leave_lobby", { roomId: data.roomId, clientId: cur.clientId })
      return
    }

    state.setActiveRoom({
      id: data.roomId,
      code: data.code || data.roomId,
      isPrivate: Boolean(data.isPrivate),
      name: data.roomName,
      hostName: data.hostName,
      playerCount: data.players?.length || 1,
      maxPlayers: data.maxPlayers || 8,
      selectedRegion: data.selectedRegion || "all",
      difficulty: data.difficulty || "all",
      totalRounds: data.totalRounds || 5,
      status: data.status || "LOBBY",
    })
    state.setIsHost(Boolean(data.isHost))
    state.setRoomPlayers(data.players || [])
    state.setTotalRounds(data.totalRounds || 5)
    state.setIsCreatingRoom(false)
    state.setShowCreateModal(false)
    state.setPendingRoomName(null)
    state.setPendingRoomId(null)
    state.setSearchedRoom(null)

    if (Array.isArray(data.pendingAdmissions)) {
      state.setPendingRequests(data.pendingAdmissions.map((p: any) => ({
        clientId: p.clientId,
        username: p.username,
        requestedAt: p.requestedAt || Date.now(),
      })))
    }

    setStoredActiveRoom(data.roomId, Boolean(data.isHost))
    state.updateScreen(data.status === "LOBBY" ? "lobby" : "game", data.roomId)

    if (data.status && data.status !== "LOBBY") socket.emit("join_game", { roomId: data.roomId })
    if (data.serverPublicKey && ctx.ecdhKeyPairRef.current) {
      try {
        ctx.aesKeyRef.current = await deriveAesGcmKey(data.serverPublicKey, ctx.ecdhKeyPairRef.current.privateKey)
      } catch (err) {
        console.error("ECDH key derivation failed:", err)
      }
    }
  })

  socket.on("lobby_update", (data: any) => {
    const curState = ctx.stateRef.current
    curState.setRoomPlayers(data.players || [])
    if (Array.isArray(data.pendingAdmissions)) {
      curState.setPendingRequests(data.pendingAdmissions.map((p: any) => ({
        clientId: p.clientId,
        username: p.username,
        requestedAt: p.requestedAt || Date.now(),
      })))
    }
    curState.setActiveRoom((prev) =>
      prev ? {
        ...prev,
        code: data.code || prev.code || prev.id,
        isPrivate: data.isPrivate !== undefined ? Boolean(data.isPrivate) : prev.isPrivate,
        name: data.roomName || prev.name, hostName: data.hostName || prev.hostName,
        maxPlayers: data.maxPlayers || prev.maxPlayers, selectedRegion: data.selectedRegion || prev.selectedRegion,
        difficulty: data.difficulty || prev.difficulty, totalRounds: data.totalRounds || prev.totalRounds,
        status: data.gameStatus?.status || prev.status,
      } : null,
    )
  })

  socket.on("region_updated", (d: any) => ctx.stateRef.current.setActiveRoom((p) => (p ? { ...p, selectedRegion: d.selectedRegion } : null)))
  socket.on("difficulty_updated", (d: any) => ctx.stateRef.current.setActiveRoom((p) => (p ? { ...p, difficulty: d.difficulty } : null)))
  socket.on("params_updated", (d: any) => {
    if (d.totalRounds) ctx.stateRef.current.setTotalRounds(d.totalRounds)
    ctx.stateRef.current.setActiveRoom((p) => (p ? { ...p, totalRounds: d.totalRounds } : null))
  })

  socket.on("kicked_from_lobby", (data: any) => {
    alert(data?.message || "You have been kicked from the squad by the leader.")
    clearSessionToBrowser()
  })

  socket.on("admission_pending", (data: any) => {
    const curState = ctx.stateRef.current
    curState.setPendingRoomName(data?.roomName || "the squad")
    curState.setPendingRoomId(data?.roomId || null)
    try { if (data?.roomId) sessionStorage.setItem("guessiha_pending_room", data.roomId) } catch {}
    curState.updateScreen("pending")
  })

  socket.on("admission_rejected", (data: any) => {
    const curState = ctx.stateRef.current
    try { sessionStorage.removeItem("guessiha_pending_room") } catch {}
    curState.setPendingRoomName(null)
    curState.setPendingRoomId(null)
    alert(data?.message || "Your request to join was rejected by the Squad Leader.")
    curState.updateScreen("browser", undefined, true)
  })

  socket.on("admission_cancelled", (data: any) => {
    ctx.stateRef.current.setPendingRequests((prev) =>
      prev.filter((r) => {
        if (data.clientId && r.clientId === data.clientId) return false
        if (data.username && r.username === data.username) return false
        return true
      })
    )
    if (data.username) {
      ctx.addToast(`Player "${data.username}" cancelled their entry request`, "info")
    }
  })

  socket.on("admission_request", (data: any) => {
    ctx.stateRef.current.setPendingRequests((prev) =>
      prev.some((r) => r.clientId === data.clientId || (data.username && r.username === data.username))
        ? prev
        : [...prev, { clientId: data.clientId, username: data.username, requestedAt: data.requestedAt || Date.now() }],
    )
    ctx.addToast(`Player "${data.username}" requested entry to squad`, "warning")
  })

  socket.on("player_entered_lobby", (d: any) => ctx.addToast(`Player "${d.username}" entered the squad!`, "success"))
  socket.on("player_joined", (d: any) => ctx.addToast(`Player "${d.username}" joined the match!`, "info"))
  socket.on("player_left", (d: any) => ctx.addToast(`Player "${d.username || "A player"}" left the squad.`, "info"))
  socket.on("lobby_terminated", (data: any) => {
    const cur = ctx.stateRef.current
    // If we are in the middle of creating a NEW room (isCreatingRoom) or already successfully
    // joined a different room, ignore terminated events for the old room.
    if (cur.isCreatingRoom) return
    if (cur.activeRoom && data?.roomId && cur.activeRoom.id !== data.roomId) return
    alert(data?.message || data?.reason || "Squad leader has disconnected. Expedition disbanded.")
    clearSessionToBrowser()
  })

  bindCrownSocketEvents(ctx)
}

export default bindLobbySocketEvents
