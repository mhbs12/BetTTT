"use client"

import type { Room, Player } from "@/types/game"

class RoomManager {
  private rooms: Map<string, Room> = new Map()
  private listeners: Set<(rooms: Room[]) => void> = new Set()

  generateRoomId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  createRoom(playerAddress: string, roomName: string): Room {
    const roomId = this.generateRoomId()
    const room: Room = {
      id: roomId,
      name: roomName,
      players: [
        {
          walletAddress: playerAddress,
          name: `${playerAddress.slice(0, 6)}...${playerAddress.slice(-4)}`,
          symbol: "X",
          isReady: true,
        },
      ],
      status: "waiting",
      createdAt: new Date(),
      maxPlayers: 2,
    }

    this.rooms.set(roomId, room)
    this.notifyListeners()
    return room
  }

  joinRoom(roomId: string, playerAddress: string): Room | null {
    const room = this.rooms.get(roomId)
    if (!room || room.players.length >= room.maxPlayers) {
      return null
    }

    // Check if player is already in room
    if (room.players.some((p) => p.walletAddress === playerAddress)) {
      return room
    }

    const newPlayer: Player = {
      walletAddress: playerAddress,
      name: `${playerAddress.slice(0, 6)}...${playerAddress.slice(-4)}`,
      symbol: "O",
      isReady: true,
    }

    room.players.push(newPlayer)

    // Start game if room is full
    if (room.players.length === room.maxPlayers) {
      room.status = "playing"
    }

    this.rooms.set(roomId, room)
    this.notifyListeners()
    return room
  }

  leaveRoom(roomId: string, playerAddress: string): void {
    const room = this.rooms.get(roomId)
    if (!room) return

    room.players = room.players.filter((p) => p.walletAddress !== playerAddress)

    if (room.players.length === 0) {
      this.rooms.delete(roomId)
    } else {
      room.status = "waiting"
      // Reassign symbols
      room.players.forEach((player, index) => {
        player.symbol = index === 0 ? "X" : "O"
      })
      this.rooms.set(roomId, room)
    }

    this.notifyListeners()
  }

  getRooms(): Room[] {
    return Array.from(this.rooms.values()).filter((room) => room.status === "waiting")
  }

  getRoom(roomId: string): Room | null {
    return this.rooms.get(roomId) || null
  }

  subscribe(callback: (rooms: Room[]) => void): () => void {
    this.listeners.add(callback)
    return () => {
      this.listeners.delete(callback)
    }
  }

  private notifyListeners(): void {
    const rooms = this.getRooms()
    this.listeners.forEach((callback) => callback(rooms))
  }
}

export const roomManager = new RoomManager()
