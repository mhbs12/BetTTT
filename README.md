# BetTTT - SUI Blockchain Tic-Tac-Toe

A multiplayer tic-tac-toe game built on the SUI blockchain with integrated betting using SUI Move smart contracts.

## Features

- **Blockchain Betting**: Place SUI bets on game outcomes
- **Multiplayer Rooms**: Create and join game rooms
- **Smart Contract Integration**: Automated prize distribution
- **Wallet Integration**: Connect with SUI wallet extensions
- **Real-time Gameplay**: Live game updates

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your SUI package ID
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Open**: http://localhost:3000

## Configuration

⚠️ **Important**: You must configure your SUI Move package ID before using betting features.

See [SETUP.md](./SETUP.md) for detailed configuration instructions.

## Quick Configuration

1. Deploy your SUI Move contract
2. Copy the package ID
3. Update `.env`:
   ```env
   NEXT_PUBLIC_PACKAGE_ID=your_package_id_here
   NEXT_PUBLIC_NETWORK=devnet
   ```

## Development

```bash
npm run dev     # Start development server
npm run build   # Build for production
npm run start   # Start production server
npm run lint    # Run linter
```

## Documentation

- [Setup Guide](./SETUP.md) - Detailed configuration instructions
- [Integration Guide](./INTEGRATION.md) - SUI Move contract details

## Troubleshooting

If you see "No SUI coins available for betting":

1. Check if `NEXT_PUBLIC_PACKAGE_ID` is configured
2. Ensure your wallet is connected and funded
3. Verify you're on the correct network
4. Check browser console for detailed error messages

## Tech Stack

- **Frontend**: Next.js, React, TypeScript
- **Blockchain**: SUI Move smart contracts
- **Wallet**: SUI Wallet Kit
- **Styling**: Tailwind CSS
- **Components**: Radix UI

## License

[MIT License](./LICENSE)
