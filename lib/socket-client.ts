"use client"

import { io, type Socket } from "socket.io-client"
import type { Room, GameState } from "@/types/game"

class SocketClient {
  private socket: Socket | null = null
  private roomListeners: Set<(room: Room) => void> = new Set()
  private gameListeners: Set<(gameState: GameState) => void> = new Set()
  private finishListeners: Set<(result: { winner: any; isDraw: boolean }) => void> = new Set()

  connect(): void {
    if (this.socket?.connected) {
      console.log("[v0] Socket already connected")
      return
    }

    console.log("[v0] Connecting to socket server")
    this.socket = io({
      path: "/api/socket",
      transports: ["websocket", "polling"],
    })

    this.socket.on("connect", () => {
      console.log("[v0] Connected to socket server with ID:", this.socket?.id)
    })

    this.socket.on("disconnect", () => {
      console.log("[v0] Disconnected from socket server")
    })

    this.socket.on("room-updated", (room: Room) => {
      console.log("[v0] Room updated event received:", room)
      this.roomListeners.forEach((callback) => callback(room))
    })

    this.socket.on("game-updated", (gameState: GameState) => {
      console.log("[v0] Game updated event received:", gameState)
      this.gameListeners.forEach((callback) => callback(gameState))
    })

    this.socket.on("game-finished", (result: { winner: any; isDraw: boolean }) => {
      console.log("[v0] Game finished event received:", result)
      this.finishListeners.forEach((callback) => callback(result))
    })
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  joinRoom(roomId: string, playerAddress: string, playerName: string): void {
    console.log("[v0] joinRoom called with:", { roomId, playerAddress, playerName })

    if (!this.socket) {
      console.log("[v0] Socket not available, cannot join room")
      return
    }

    if (!this.socket.connected) {
      console.log("[v0] Socket not connected, cannot join room")
      return
    }

    console.log("[v0] Emitting join-room event")
    this.socket.emit("join-room", { roomId, playerAddress, playerName })
  }

  leaveRoom(roomId: string, playerAddress: string): void {
    if (!this.socket) return
    this.socket.emit("leave-room", { roomId, playerAddress })
  }

  makeMove(roomId: string, playerAddress: string, position: number): void {
    if (!this.socket) return
    this.socket.emit("make-move", { roomId, playerAddress, position })
  }

  resetGame(roomId: string): void {
    if (!this.socket) return
    this.socket.emit("reset-game", { roomId })
  }

  onRoomUpdate(callback: (room: Room) => void): () => void {
    this.roomListeners.add(callback)
    return () => {
      this.roomListeners.delete(callback)
    }
  }

  onGameUpdate(callback: (gameState: GameState) => void): () => void {
    this.gameListeners.add(callback)
    return () => {
      this.gameListeners.delete(callback)
    }
  }

  onGameFinish(callback: (result: { winner: any; isDraw: boolean }) => void): () => void {
    this.finishListeners.add(callback)
    return () => {
      this.finishListeners.delete(callback)
    }
  }
}

export const socketClient = new SocketClient()
