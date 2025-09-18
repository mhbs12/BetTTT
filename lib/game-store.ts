interface GameRoom {
  id: string
  name: string
  players: Array<{
    address: string
    name: string
    symbol: "X" | "O"
  }>
  board: Array<"X" | "O" | null>
  currentPlayer: "X" | "O"
  winner: string | null
  status: "waiting" | "playing" | "finished"
  createdAt: number
  lastActivity?: number // Track last activity for cleanup
  disconnectedPlayers?: Array<{
    address: string
    disconnectedAt: number
  }> // Track disconnected players for reconnection grace period
  // SUI Move contract integration
  betAmount?: string // Amount in SUI
  treasuryId?: string // Treasury object ID from the smart contract
}

const globalRooms = new Map<string, GameRoom>()

class GameStore {
  private get rooms(): Map<string, GameRoom> {
    return globalRooms
  }

  createRoom(roomName: string, playerAddress: string, playerName: string, betAmount?: string, treasuryId?: string): string {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase()

    const room: GameRoom = {
      id: roomId,
      name: roomName,
      players: [
        {
          address: playerAddress,
          name: playerName,
          symbol: "X",
        },
      ],
      board: Array(9).fill(null),
      currentPlayer: "X",
      winner: null,
      status: "waiting",
      createdAt: Date.now(),
      lastActivity: Date.now(),
      disconnectedPlayers: [],
      betAmount,
      treasuryId,
    }

    this.rooms.set(roomId, room)
    console.log("[v0] Room created and stored:", { roomId, totalRooms: this.rooms.size, betAmount, treasuryId })
    return roomId
  }

  joinRoom(roomId: string, playerAddress: string, playerName: string): GameRoom | null {
    const room = this.rooms.get(roomId)
    if (!room) return null

    // Update last activity
    room.lastActivity = Date.now()

    // Check if player is reconnecting (was disconnected)
    const disconnectedPlayerIndex = room.disconnectedPlayers?.findIndex(dp => dp.address === playerAddress) ?? -1
    if (disconnectedPlayerIndex >= 0) {
      // Player is reconnecting, remove from disconnected list and add back to players
      room.disconnectedPlayers?.splice(disconnectedPlayerIndex, 1)
      
      // Check if player was already in the room
      const existingPlayer = room.players.find((p) => p.address === playerAddress)
      if (!existingPlayer) {
        // Re-add the player to the room with correct symbol
        const symbol = room.players.length === 0 ? "X" : "O"
        room.players.push({
          address: playerAddress,
          name: playerName,
          symbol,
        })
      }
      console.log(`[v0] Player ${playerAddress} reconnected to room ${roomId}`)
      return room
    }

    // Check if player already in room
    const existingPlayer = room.players.find((p) => p.address === playerAddress)
    if (existingPlayer) return room

    // Add second player only if room has exactly 1 player and is waiting
    if (room.players.length === 1 && room.status === "waiting") {
      room.players.push({
        address: playerAddress,
        name: playerName,
        symbol: "O",
      })
      room.status = "playing"
    } else if (room.players.length === 0 && room.status === "waiting") {
      // Handle case where room exists but has no players (shouldn't normally happen, but defensive)
      room.players.push({
        address: playerAddress,
        name: playerName,
        symbol: "X",
      })
    }

    return room
  }

  makeMove(roomId: string, playerAddress: string, position: number): GameRoom | null {
    const room = this.rooms.get(roomId)
    if (!room || room.status !== "playing") return null

    // Update last activity
    room.lastActivity = Date.now()

    const player = room.players.find((p) => p.address === playerAddress)
    if (!player || player.symbol !== room.currentPlayer) return null

    if (room.board[position] !== null) return null

    room.board[position] = player.symbol

    // Check for winner
    const winner = this.checkWinner(room.board)
    if (winner) {
      room.winner = room.players.find((p) => p.symbol === winner)?.address || null
      room.status = "finished"
    } else if (room.board.every((cell) => cell !== null)) {
      // It's a draw - briefly show finished state, then automatically restart after a delay
      room.status = "finished"
      room.winner = null
      
      // Automatically restart after 2 seconds
      setTimeout(() => {
        if (room.status === "finished" && !room.winner) {
          room.board = Array(9).fill(null)
          room.currentPlayer = "X" // Reset to X for the new game
          room.status = "playing"
        }
      }, 2000)
    } else {
      room.currentPlayer = room.currentPlayer === "X" ? "O" : "X"
    }

    return room
  }

  getRoom(roomId: string): GameRoom | null {
    const room = this.rooms.get(roomId)
    if (!room) return null
    
    // Update last activity when room is accessed to prevent premature cleanup
    room.lastActivity = Date.now()
    return room
  }

  getAllRooms(): GameRoom[] {
    // Clean up expired disconnections and rooms before returning
    this.cleanupExpiredDisconnections()
    
    const allRooms = Array.from(this.rooms.values())
    const waitingRooms = allRooms.filter((room) => room.status === "waiting")

    const oneHourAgo = Date.now() - 60 * 60 * 1000
    const finishedRooms = allRooms.filter((room) => room.status === "finished" && room.createdAt < oneHourAgo)

    finishedRooms.forEach((room) => {
      this.rooms.delete(room.id)
      console.log("[v0] Cleaned up old room:", room.id)
    })

    console.log("[v0] Returning waiting rooms:", {
      waiting: waitingRooms.length,
      total: this.rooms.size,
    })

    return waitingRooms.sort((a, b) => b.createdAt - a.createdAt)
  }

  private cleanupExpiredDisconnections(): void {
    const now = Date.now()
    const disconnectionGracePeriod = 5 * 60 * 1000 // 5 minutes grace period
    const roomInactivityTimeout = 15 * 60 * 1000 // 15 minutes of inactivity before room cleanup
    
    for (const [roomId, room] of this.rooms.entries()) {
      // Check if room has been inactive for too long
      const lastActivity = room.lastActivity || room.createdAt
      const isRoomInactive = now - lastActivity > roomInactivityTimeout
      
      // Handle disconnected players
      if (room.disconnectedPlayers && room.disconnectedPlayers.length > 0) {
        // Check for expired disconnections
        const expiredDisconnections = room.disconnectedPlayers.filter(
          dp => now - dp.disconnectedAt > disconnectionGracePeriod
        )
        
        if (expiredDisconnections.length > 0) {
          // Remove expired disconnections
          room.disconnectedPlayers = room.disconnectedPlayers.filter(
            dp => now - dp.disconnectedAt <= disconnectionGracePeriod
          )
          
          // If this was an active game and a player's grace period expired, forfeit the game
          if (room.status === "playing" && room.players.length === 1 && expiredDisconnections.length > 0) {
            const remainingPlayer = room.players[0]
            if (remainingPlayer) {
              room.winner = remainingPlayer.address
              room.status = "finished"
              console.log(`[v0] Player(s) ${expiredDisconnections.map(d => d.address).join(', ')} grace period expired. Winner: ${remainingPlayer.address}`)
            }
          }
        }
      }
      
      // Only delete room if it's completely empty AND inactive for a long time
      if (room.players.length === 0 && 
          (!room.disconnectedPlayers || room.disconnectedPlayers.length === 0) &&
          isRoomInactive) {
        this.rooms.delete(roomId)
        console.log(`[v0] Room ${roomId} deleted - no players and inactive for ${Math.round((now - lastActivity) / 60000)} minutes`)
      }
    }
  }

  // Method to manually trigger cleanup (can be called from getRoomState)
  public forceCleanupExpiredDisconnections(): void {
    this.cleanupExpiredDisconnections()
  }

  private checkWinner(board: Array<"X" | "O" | null>): "X" | "O" | null {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8], // rows
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8], // columns
      [0, 4, 8],
      [2, 4, 6], // diagonals
    ]

    for (const [a, b, c] of lines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a]
      }
    }

    return null
  }

  removePlayer(roomId: string, playerAddress: string): GameRoom | null {
    const room = this.rooms.get(roomId)
    if (!room) return null

    // Update last activity
    room.lastActivity = Date.now()

    // If game is already finished, just return the room
    if (room.status === "finished") return room

    // Find the player leaving
    const leavingPlayerIndex = room.players.findIndex((p) => p.address === playerAddress)
    if (leavingPlayerIndex === -1) return room

    // For active games, don't immediately forfeit - give grace period for reconnection
    if (room.status === "playing" && room.players.length === 2) {
      // Move player to disconnected list instead of removing them completely
      room.players.splice(leavingPlayerIndex, 1)
      
      // Initialize disconnectedPlayers if it doesn't exist
      if (!room.disconnectedPlayers) {
        room.disconnectedPlayers = []
      }
      
      // Add to disconnected players list
      room.disconnectedPlayers.push({
        address: playerAddress,
        disconnectedAt: Date.now()
      })
      
      console.log(`[v0] Player ${playerAddress} disconnected from active game. Grace period started.`)
      return room
    }

    // If game is waiting and player leaves, remove them from the room
    if (room.status === "waiting") {
      room.players.splice(leavingPlayerIndex, 1)

      // Only delete room if no players AND no disconnected players waiting to reconnect
      if (room.players.length === 0 && (!room.disconnectedPlayers || room.disconnectedPlayers.length === 0)) {
        this.rooms.delete(roomId)
        console.log(`[v0] Room ${roomId} deleted - no players remaining`)
        return null
      }
    }

    return room
  }

  isGameForfeit(roomId: string): boolean {
    const room = this.rooms.get(roomId)
    if (!room || room.status !== "finished" || !room.winner) return false

    // Check if the board is not full and there's a winner (indicating forfeit)
    const boardFilled = room.board.filter((cell) => cell !== null).length
    const hasWinningLine = this.checkWinner(room.board) !== null

    // If there's a winner but no winning line on the board, it's a forfeit
    return !hasWinningLine && boardFilled < 9
  }

  updateTreasuryId(roomId: string, treasuryId: string): GameRoom | null {
    const room = this.rooms.get(roomId)
    if (!room) return null
    
    room.treasuryId = treasuryId
    this.rooms.set(roomId, room)
    return room
  }
}

export const gameStore = new GameStore()
export type { GameRoom }
