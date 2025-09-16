"use client"

import type { Room, GameState } from "@/types/game"
import { socketClient } from "./socket-client"

class RealtimeRoomManager {
  private currentRoom: Room | null = null
  private currentGameState: GameState | null = null
  private roomListeners: Set<(room: Room | null) => void> = new Set()
  private gameListeners: Set<(gameState: GameState | null) => void> = new Set()

  constructor() {
    console.log("[v0] RealtimeRoomManager initializing")

    // Initialize socket connection
    socketClient.connect()

    // Subscribe to socket events
    socketClient.onRoomUpdate((room) => {
      console.log("[v0] Room update received:", room)
      this.currentRoom = room
      this.notifyRoomListeners()
    })

    socketClient.onGameUpdate((gameState) => {
      console.log("[v0] Game update received:", gameState)
      this.currentGameState = gameState
      this.notifyGameListeners()
    })
  }

  generateRoomId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  createRoom(playerAddress: string, roomName: string): string {
    console.log("[v0] createRoom called with:", { playerAddress, roomName })

    const roomId = this.generateRoomId()
    const playerName = `${playerAddress.slice(0, 6)}...${playerAddress.slice(-4)}`

    console.log("[v0] Generated room ID:", roomId, "Player name:", playerName)
    console.log("[v0] Calling socketClient.joinRoom")

    socketClient.joinRoom(roomId, playerAddress, playerName)
    return roomId
  }

  joinRoom(roomId: string, playerAddress: string): void {
    const playerName = `${playerAddress.slice(0, 6)}...${playerAddress.slice(-4)}`
    socketClient.joinRoom(roomId, playerAddress, playerName)
  }

  leaveRoom(roomId: string, playerAddress: string): void {
    socketClient.leaveRoom(roomId, playerAddress)
    this.currentRoom = null
    this.currentGameState = null
    this.notifyRoomListeners()
    this.notifyGameListeners()
  }

  makeMove(roomId: string, playerAddress: string, position: number): void {
    socketClient.makeMove(roomId, playerAddress, position)
  }

  resetGame(roomId: string): void {
    socketClient.resetGame(roomId)
  }

  getCurrentRoom(): Room | null {
    return this.currentRoom
  }

  getCurrentGameState(): GameState | null {
    return this.currentGameState
  }

  subscribeToRoom(callback: (room: Room | null) => void): () => void {
    this.roomListeners.add(callback)
    return () => {
      this.roomListeners.delete(callback)
    }
  }

  subscribeToGame(callback: (gameState: GameState | null) => void): () => void {
    this.gameListeners.add(callback)
    return () => {
      this.gameListeners.delete(callback)
    }
  }

  onGameFinish(callback: (result: { winner: any; isDraw: boolean }) => void): () => void {
    return socketClient.onGameFinish(callback)
  }

  private notifyRoomListeners(): void {
    this.roomListeners.forEach((callback) => callback(this.currentRoom))
  }

  private notifyGameListeners(): void {
    this.gameListeners.forEach((callback) => callback(this.currentGameState))
  }

  disconnect(): void {
    socketClient.disconnect()
  }
}

export const realtimeRoomManager = new RealtimeRoomManager()
