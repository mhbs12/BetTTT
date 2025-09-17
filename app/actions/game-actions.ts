"use server"

import { gameStore } from "@/lib/game-store"

export async function createRoom(roomName: string, playerAddress: string, playerName: string, betAmount?: string, treasuryId?: string) {
  console.log("[v0] Server: Creating room", { roomName, playerAddress, playerName, betAmount, treasuryId })

  try {
    if (!roomName.trim() || !playerAddress || !playerName) {
      return { success: false, error: "Missing required fields" }
    }

    if (roomName.length > 50) {
      return { success: false, error: "Room name too long (max 50 characters)" }
    }

    const roomId = gameStore.createRoom(roomName.trim(), playerAddress, playerName, betAmount, treasuryId)
    const room = gameStore.getRoom(roomId)

    console.log("[v0] Server: Room created successfully", { roomId, room })
    return { success: true, room }
  } catch (error) {
    console.error("[v0] Server: Error creating room", error)
    return { success: false, error: "Failed to create room. Please try again." }
  }
}

export async function joinRoom(roomId: string, playerAddress: string, playerName: string) {
  console.log("[v0] Server: Joining room", { roomId, playerAddress, playerName })

  try {
    if (!roomId.trim() || !playerAddress || !playerName) {
      return { success: false, error: "Missing required fields" }
    }

    const room = gameStore.joinRoom(roomId.trim().toUpperCase(), playerAddress, playerName)

    if (!room) {
      return { success: false, error: "Room not found or is full" }
    }

    console.log("[v0] Server: Joined room successfully", { room })
    return { success: true, room }
  } catch (error) {
    console.error("[v0] Server: Error joining room", error)
    return { success: false, error: "Failed to join room. Please try again." }
  }
}

export async function makeMove(roomId: string, playerAddress: string, position: number) {
  console.log("[v0] Server: Making move", { roomId, playerAddress, position })

  try {
    if (!roomId || !playerAddress || position < 0 || position > 8) {
      return { success: false, error: "Invalid move parameters" }
    }

    const room = gameStore.makeMove(roomId, playerAddress, position)

    if (!room) {
      const currentRoom = gameStore.getRoom(roomId)
      if (!currentRoom) {
        return { success: false, error: "Room not found" }
      }

      const player = currentRoom.players.find((p) => p.address === playerAddress)
      if (!player) {
        return { success: false, error: "Player not in this room" }
      }

      if (currentRoom.status !== "playing") {
        return { success: false, error: "Game is not in progress" }
      }

      if (player.symbol !== currentRoom.currentPlayer) {
        return { success: false, error: "It's not your turn" }
      }

      if (currentRoom.board[position] !== null) {
        return { success: false, error: "Position already taken" }
      }

      return { success: false, error: "Invalid move" }
    }

    console.log("[v0] Server: Move made successfully", { room })
    return { success: true, room }
  } catch (error) {
    console.error("[v0] Server: Error making move", error)
    return { success: false, error: "Failed to make move. Please try again." }
  }
}

export async function getRoomState(roomId: string) {
  try {
    if (!roomId.trim()) {
      return { success: false, error: "Room ID is required" }
    }

    const room = gameStore.getRoom(roomId.trim())

    if (!room) {
      console.log("[v0] Server: Room not found", { roomId, availableRooms: gameStore.getAllRooms().length })
      return { success: false, error: "Room not found" }
    }

    console.log("[v0] Server: Room state retrieved", {
      roomId,
      status: room.status,
      players: room.players.length,
    })

    return { success: true, room }
  } catch (error) {
    console.error("[v0] Server: Error getting room state", error)
    return { success: false, error: "Failed to get room state" }
  }
}

export async function getAvailableRooms() {
  try {
    const rooms = gameStore.getAllRooms()
    console.log("[v0] Server: Retrieved available rooms", { count: rooms.length })
    return { success: true, rooms }
  } catch (error) {
    console.error("[v0] Server: Error getting available rooms", error)
    return { success: false, error: "Failed to get available rooms" }
  }
}

export async function leaveRoom(roomId: string, playerAddress: string) {
  console.log("[v0] Server: Player leaving room", { roomId, playerAddress })

  try {
    if (!roomId.trim() || !playerAddress) {
      return { success: false, error: "Missing required fields" }
    }

    const room = gameStore.removePlayer(roomId.trim(), playerAddress)

    if (!room) {
      console.log("[v0] Server: Room deleted after player left", { roomId })
      return { success: true, room: null, roomDeleted: true }
    }

    console.log("[v0] Server: Player left room successfully", {
      roomId,
      remainingPlayers: room.players.length,
      status: room.status,
      winner: room.winner,
    })

    return { success: true, room, roomDeleted: false }
  } catch (error) {
    console.error("[v0] Server: Error removing player from room", error)
    return { success: false, error: "Failed to leave room. Please try again." }
  }
}

export async function checkGameForfeit(roomId: string) {
  try {
    const isForfeit = gameStore.isGameForfeit(roomId)
    return { success: true, isForfeit }
  } catch (error) {
    console.error("[v0] Server: Error checking forfeit status", error)
    return { success: false, error: "Failed to check forfeit status" }
  }
}

export async function updateRoomTreasury(roomId: string, treasuryId: string) {
  console.log("[v0] Server: Updating room treasury", { roomId, treasuryId })

  try {
    if (!roomId.trim() || !treasuryId.trim()) {
      return { success: false, error: "Missing required fields" }
    }

    const room = gameStore.updateTreasuryId(roomId.trim(), treasuryId.trim())

    if (!room) {
      return { success: false, error: "Room not found" }
    }

    console.log("[v0] Server: Room treasury updated successfully", { roomId, treasuryId })
    return { success: true, room }
  } catch (error) {
    console.error("[v0] Server: Error updating room treasury", error)
    return { success: false, error: "Failed to update room treasury. Please try again." }
  }
}
