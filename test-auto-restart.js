// Simple test to verify auto-restart functionality
const { gameEngine } = require('./lib/game-engine.ts');

// Create a mock room
const mockRoom = {
  players: [
    { walletAddress: 'player1', name: 'Player 1', symbol: 'X', isReady: true },
    { walletAddress: 'player2', name: 'Player 2', symbol: 'O', isReady: true }
  ],
  id: 'test-room',
  name: 'Test Room',
  status: 'playing',
  createdAt: new Date(),
  maxPlayers: 2
};

async function testAutoRestart() {
  const roomId = 'test-room';
  
  console.log('1. Initializing game...');
  const initialState = gameEngine.initializeGame(roomId, mockRoom);
  console.log('Initial state:', initialState);
  
  console.log('\n2. Making moves to create a draw...');
  // Create a draw scenario:
  // X O X
  // O X O  
  // O X X
  const moves = [
    ['player1', 0], // X at position 0
    ['player2', 1], // O at position 1
    ['player1', 2], // X at position 2
    ['player2', 3], // O at position 3
    ['player1', 4], // X at position 4
    ['player2', 5], // O at position 5
    ['player2', 6], // O at position 6
    ['player1', 7], // X at position 7
    ['player1', 8], // X at position 8 (this should create a draw)
  ];
  
  let currentState = initialState;
  for (const [player, position] of moves) {
    currentState = gameEngine.makeMove(roomId, player, position);
    console.log(`Move by ${player} at position ${position}:`, {
      board: currentState.board,
      status: currentState.gameStatus,
      isDraw: currentState.isDraw
    });
  }
  
  console.log('\n3. Waiting for auto-restart...');
  setTimeout(() => {
    const finalState = gameEngine.getGameState(roomId);
    console.log('State after restart:', finalState);
    
    if (finalState && finalState.gameStatus === 'playing' && 
        finalState.board.every(cell => cell === null)) {
      console.log('✅ AUTO-RESTART SUCCESSFUL!');
    } else {
      console.log('❌ Auto-restart failed or incomplete');
    }
    
    // Cleanup
    gameEngine.cleanupRoom(roomId);
  }, 3000);
}

testAutoRestart().catch(console.error);