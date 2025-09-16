export interface Room {
  id: string
  name: string
  players: Player[]
  status: "waiting" | "playing" | "finished"
  createdAt: Date
  maxPlayers: 2
}

export interface Player {
  walletAddress: string
  name: string
  symbol: "X" | "O" | null
  isReady: boolean
}

export interface GameState {
  board: (string | null)[]
  currentPlayer: string
  winner: string | null
  isDraw: boolean
  gameStatus: "waiting" | "playing" | "finished"
}
