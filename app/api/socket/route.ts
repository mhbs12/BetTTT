import type { NextRequest } from "next/server"
import { Server as SocketIOServer } from "socket.io"
import { Server as HTTPServer } from "http"

// Global socket server instance
let io: SocketIOServer | null = null

// Game state storage (in production, use Redis or database)
const gameRooms = new Map()
const gameStates = new Map()

export async function GET(req: NextRequest) {
  if (!io) {
    // Create HTTP server for Socket.IO
    const httpServer = new HTTPServer()

    io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
      path: "/api/socket",
    })

    io.on("connection", (socket) => {
      console.log(`[v0] User connected: ${socket.id}`)

      // Join room
      socket.on("join-room", ({ roomId, playerAddress, playerName }) => {
        socket.join(roomId)

        // Add player to room
        if (!gameRooms.has(roomId)) {
          gameRooms.set(roomId, {
            id: roomId,
            players: [],
            status: "waiting",
          })
        }

        const room = gameRooms.get(roomId)
        const existingPlayer = room.players.find((p: any) => p.walletAddress === playerAddress)

        if (!existingPlayer && room.players.length < 2) {
          room.players.push({
            walletAddress: playerAddress,
            name: playerName,
            symbol: room.players.length === 0 ? "X" : "O",
            socketId: socket.id,
          })
        }

        // Start game if 2 players
        if (room.players.length === 2) {
          room.status = "playing"
          gameStates.set(roomId, {
            board: Array(9).fill(null),
            currentPlayer: room.players[0].walletAddress,
            winner: null,
            isDraw: false,
            gameStatus: "playing",
          })
        }

        // Broadcast room update
        io?.to(roomId).emit("room-updated", room)
        if (gameStates.has(roomId)) {
          io?.to(roomId).emit("game-updated", gameStates.get(roomId))
        }
      })

      // Make move
      socket.on("make-move", ({ roomId, playerAddress, position }) => {
        const room = gameRooms.get(roomId)
        const gameState = gameStates.get(roomId)

        if (!room || !gameState || gameState.gameStatus !== "playing") return
        if (gameState.currentPlayer !== playerAddress) return
        if (gameState.board[position] !== null) return

        // Make the move
        const player = room.players.find((p: any) => p.walletAddress === playerAddress)
        if (!player) return

        gameState.board[position] = player.symbol

        // Check for winner
        const winner = checkWinner(gameState.board)
        const isDraw = !winner && gameState.board.every((cell: any) => cell !== null)

        if (winner || isDraw) {
          gameState.gameStatus = "finished"
          gameState.winner = winner
          gameState.isDraw = isDraw
        } else {
          // Switch to next player
          const nextPlayer = room.players.find((p: any) => p.walletAddress !== playerAddress)
          gameState.currentPlayer = nextPlayer?.walletAddress
        }

        // Broadcast game update
        io?.to(roomId).emit("game-updated", gameState)

        // If game finished, broadcast winner
        if (gameState.gameStatus === "finished") {
          const winnerPlayer = winner ? room.players.find((p: any) => p.symbol === winner) : null
          io?.to(roomId).emit("game-finished", {
            winner: winnerPlayer,
            isDraw,
          })
        }
      })

      // Reset game
      socket.on("reset-game", ({ roomId }) => {
        const room = gameRooms.get(roomId)
        if (!room) return

        gameStates.set(roomId, {
          board: Array(9).fill(null),
          currentPlayer: room.players[0]?.walletAddress,
          winner: null,
          isDraw: false,
          gameStatus: "playing",
        })

        io?.to(roomId).emit("game-updated", gameStates.get(roomId))
      })

      // Leave room
      socket.on("leave-room", ({ roomId, playerAddress }) => {
        const room = gameRooms.get(roomId)
        if (!room) return

        room.players = room.players.filter((p: any) => p.walletAddress !== playerAddress)

        if (room.players.length === 0) {
          gameRooms.delete(roomId)
          gameStates.delete(roomId)
        } else {
          room.status = "waiting"
          // Reassign symbols
          room.players.forEach((player: any, index: number) => {
            player.symbol = index === 0 ? "X" : "O"
          })
        }

        socket.leave(roomId)
        io?.to(roomId).emit("room-updated", room)
      })

      socket.on("disconnect", () => {
        console.log(`[v0] User disconnected: ${socket.id}`)

        // Remove player from all rooms
        for (const [roomId, room] of gameRooms.entries()) {
          const playerIndex = room.players.findIndex((p: any) => p.socketId === socket.id)
          if (playerIndex !== -1) {
            const player = room.players[playerIndex]
            room.players.splice(playerIndex, 1)

            if (room.players.length === 0) {
              gameRooms.delete(roomId)
              gameStates.delete(roomId)
            } else {
              room.status = "waiting"
              room.players.forEach((p: any, index: number) => {
                p.symbol = index === 0 ? "X" : "O"
              })
            }

            io?.to(roomId).emit("room-updated", room)
            break
          }
        }
      })
    })
  }

  return new Response("Socket.IO server running", { status: 200 })
}

function checkWinner(board: (string | null)[]): string | null {
  const winningCombinations = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8], // Rows
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8], // Columns
    [0, 4, 8],
    [2, 4, 6], // Diagonals
  ]

  for (const combination of winningCombinations) {
    const [a, b, c] = combination
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a]
    }
  }

  return null
}
