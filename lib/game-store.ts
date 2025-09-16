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
  // Betting related fields
  betAmount?: string // Amount in SUI
  treasuryId?: string // Shared treasury object ID from the blockchain
  betTransactionId?: string // Transaction ID for bet creation
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

    // Check if player already in room
    const existingPlayer = room.players.find((p) => p.address === playerAddress)
    if (existingPlayer) return room

    // Add second player
    if (room.players.length === 1) {
      room.players.push({
        address: playerAddress,
        name: playerName,
        symbol: "O",
      })
      room.status = "playing"
    }

    return room
  }

  makeMove(roomId: string, playerAddress: string, position: number): GameRoom | null {
    const room = this.rooms.get(roomId)
    if (!room || room.status !== "playing") return null

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
      room.status = "finished"
    } else {
      room.currentPlayer = room.currentPlayer === "X" ? "O" : "X"
    }

    return room
  }

  getRoom(roomId: string): GameRoom | null {
    return this.rooms.get(roomId) || null
  }

  getAllRooms(): GameRoom[] {
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

    // If game is already finished, just return the room
    if (room.status === "finished") return room

    // Find the player leaving
    const leavingPlayerIndex = room.players.findIndex((p) => p.address === playerAddress)
    if (leavingPlayerIndex === -1) return room

    // If game is in progress and a player leaves, the other player wins by forfeit
    if (room.status === "playing" && room.players.length === 2) {
      const remainingPlayer = room.players.find((p) => p.address !== playerAddress)
      if (remainingPlayer) {
        room.winner = remainingPlayer.address
        room.status = "finished"
        console.log(`[v0] Player ${playerAddress} forfeited. Winner: ${remainingPlayer.address}`)
        return room
      }
    }

    // If game is waiting and player leaves, remove them from the room
    if (room.status === "waiting") {
      room.players.splice(leavingPlayerIndex, 1)

      // If no players left, delete the room
      if (room.players.length === 0) {
        this.rooms.delete(roomId)
        console.log(`[v0] Room ${roomId} deleted - no players remaining`)
        return null
      }
    }

    return room
  }

  updateRoomTreasuryId(roomId: string, treasuryId: string): GameRoom | null {
    const room = this.rooms.get(roomId)
    if (!room) return null

    room.treasuryId = treasuryId
    console.log("[v0] Updated room treasury ID:", { roomId, treasuryId })
    return room
  }

  updateRoomBetTransaction(roomId: string, transactionId: string): GameRoom | null {
    const room = this.rooms.get(roomId)
    if (!room) return null

    room.betTransactionId = transactionId
    console.log("[v0] Updated room bet transaction ID:", { roomId, transactionId })
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
}

export const gameStore = new GameStore()
export type { GameRoom }
