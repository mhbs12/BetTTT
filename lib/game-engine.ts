"use client"

import type { GameState, Room } from "@/types/game"

export class GameEngine {
  private gameStates: Map<string, GameState> = new Map()
  private listeners: Map<string, Set<(gameState: GameState) => void>> = new Map()
  private initialPlayers: Map<string, string> = new Map() // Store initial starting player for each room

  initializeGame(roomId: string, room: Room): GameState {
    const gameState: GameState = {
      board: Array(9).fill(null),
      currentPlayer: room.players[0]?.walletAddress || "",
      winner: null,
      isDraw: false,
      gameStatus: room.players.length === 2 ? "playing" : "waiting",
    }

    // Store the initial starting player for restarts
    this.initialPlayers.set(roomId, gameState.currentPlayer)

    this.gameStates.set(roomId, gameState)
    this.notifyListeners(roomId, gameState)
    return gameState
  }

  makeMove(roomId: string, playerAddress: string, position: number): GameState | null {
    const gameState = this.gameStates.get(roomId)
    if (!gameState) return null

    // Validate move
    if (
      gameState.gameStatus !== "playing" ||
      gameState.currentPlayer !== playerAddress ||
      gameState.board[position] !== null ||
      position < 0 ||
      position > 8
    ) {
      return gameState
    }

    // Make the move
    const newBoard = [...gameState.board]
    const playerSymbol = this.getPlayerSymbol(roomId, playerAddress)
    newBoard[position] = playerSymbol

    // Check for winner
    const winner = this.checkWinner(newBoard)
    const isDraw = !winner && newBoard.every((cell) => cell !== null)

    // Switch to next player
    const nextPlayer = this.getNextPlayer(roomId, playerAddress)

    const newGameState: GameState = {
      board: newBoard,
      currentPlayer: winner || isDraw ? gameState.currentPlayer : nextPlayer,
      winner,
      isDraw,
      gameStatus: winner || isDraw ? "finished" : "playing",
    }

    this.gameStates.set(roomId, newGameState)
    this.notifyListeners(roomId, newGameState)

    // Automatically restart after 2 seconds if it's a draw
    if (isDraw) {
      setTimeout(() => {
        const currentGameState = this.gameStates.get(roomId)
        if (currentGameState && currentGameState.gameStatus === "finished" && currentGameState.isDraw) {
          // Restart with the original starting player
          const initialPlayer = this.initialPlayers.get(roomId) || currentGameState.currentPlayer
          const restartedGameState: GameState = {
            board: Array(9).fill(null),
            currentPlayer: initialPlayer,
            winner: null,
            isDraw: false,
            gameStatus: "playing",
          }
          this.gameStates.set(roomId, restartedGameState)
          this.notifyListeners(roomId, restartedGameState)
        }
      }, 2000)
    }

    return newGameState
  }

  getGameState(roomId: string): GameState | null {
    return this.gameStates.get(roomId) || null
  }

  resetGame(roomId: string, room: Room): GameState {
    return this.initializeGame(roomId, room)
  }

  subscribe(roomId: string, callback: (gameState: GameState) => void): () => void {
    if (!this.listeners.has(roomId)) {
      this.listeners.set(roomId, new Set())
    }
    this.listeners.get(roomId)!.add(callback)

    return () => {
      const roomListeners = this.listeners.get(roomId)
      if (roomListeners) {
        roomListeners.delete(callback)
        if (roomListeners.size === 0) {
          this.listeners.delete(roomId)
        }
      }
    }
  }

  private getPlayerSymbol(roomId: string, playerAddress: string): string {
    // This would normally come from the room data
    // For now, we'll use a simple approach
    return playerAddress.slice(-1) === "0" ? "X" : "O"
  }

  private getNextPlayer(roomId: string, currentPlayerAddress: string): string {
    // This would normally come from the room data
    // For now, we'll simulate switching players
    return currentPlayerAddress === currentPlayerAddress ? "next_player" : currentPlayerAddress
  }

  private checkWinner(board: (string | null)[]): string | null {
    const winningCombinations = [
      [0, 1, 2], // Top row
      [3, 4, 5], // Middle row
      [6, 7, 8], // Bottom row
      [0, 3, 6], // Left column
      [1, 4, 7], // Middle column
      [2, 5, 8], // Right column
      [0, 4, 8], // Diagonal top-left to bottom-right
      [2, 4, 6], // Diagonal top-right to bottom-left
    ]

    for (const combination of winningCombinations) {
      const [a, b, c] = combination
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a]
      }
    }

    return null
  }

  private notifyListeners(roomId: string, gameState: GameState): void {
    const roomListeners = this.listeners.get(roomId)
    if (roomListeners) {
      roomListeners.forEach((callback) => callback(gameState))
    }
  }

  cleanupRoom(roomId: string): void {
    this.gameStates.delete(roomId)
    this.listeners.delete(roomId)
    this.initialPlayers.delete(roomId)
  }
}

export const gameEngine = new GameEngine()
