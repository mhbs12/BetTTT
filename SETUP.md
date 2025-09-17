# BetTTT Setup Guide

## Environment Configuration

To use the SUI blockchain betting features, you need to configure your environment variables properly.

### Required Environment Variables

Create a `.env` file in the root of your project with the following configuration:

```env
# SUI Move Package Configuration
NEXT_PUBLIC_PACKAGE_ID=YOUR_PACKAGE_ID_HERE
NEXT_PUBLIC_NETWORK=devnet
```

### Configuration Details

#### NEXT_PUBLIC_PACKAGE_ID
- **Required**: Yes
- **Description**: The object ID of your deployed SUI Move package
- **Example**: `0x1234567890abcdef1234567890abcdef12345678`
- **How to get**: Deploy your SUI Move package and copy the package ID from the deployment output

#### NEXT_PUBLIC_NETWORK
- **Required**: No (defaults to `devnet`)
- **Options**: 
  - `devnet` - Development network (free SUI for testing)
  - `testnet` - Test network
  - `mainnet` - Production network (real SUI required)
- **Recommendation**: Use `devnet` for development and testing

### SUI Move Contract

The application integrates with a SUI Move contract that includes these functions:

```move
// Create a new bet
public entry fun criar_aposta(mut coin: Coin<SUI>, amount: u64, ctx: &mut TxContext)

// Join an existing bet
public entry fun entrar_aposta(treasury: &mut Treasury, mut coin: Coin<SUI>, amount: u64, ctx: &mut TxContext)

// Finish the game and distribute winnings
public entry fun finish_game(winner: address, treasury: Treasury, ctx: &mut TxContext)
```

### Deployment Steps

1. **Deploy your SUI Move contract**:
   ```bash
   sui client publish --gas-budget 20000000
   ```

2. **Copy the Package ID** from the deployment output

3. **Create your `.env` file**:
   ```bash
   cp .env.example .env
   ```

4. **Update the `.env` file** with your actual package ID:
   ```env
   NEXT_PUBLIC_PACKAGE_ID=0x_YOUR_ACTUAL_PACKAGE_ID_HERE
   NEXT_PUBLIC_NETWORK=devnet
   ```

5. **Install dependencies and start the application**:
   ```bash
   npm install
   npm run dev
   ```

### Troubleshooting

#### "No SUI coins available for betting" Error

This error can occur for several reasons:

1. **Configuration not set**: Make sure `NEXT_PUBLIC_PACKAGE_ID` is set to your actual package ID (not `0x0`)

2. **Network issues**: Check that you're connected to the correct SUI network

3. **Wallet not funded**: Ensure your wallet has SUI coins on the configured network

4. **Wallet connection issues**: Try disconnecting and reconnecting your wallet

#### Configuration Warning

If you see a red warning banner saying "Configuration Required", it means:
- Your `NEXT_PUBLIC_PACKAGE_ID` is still set to the default value `0x0`
- You need to update your `.env` file with the actual package ID

#### Debug Information

The application logs detailed information to the browser console. Open Developer Tools (F12) and check the Console tab for:
- Configuration details on startup
- Coin fetching results
- Transaction details
- Error messages

### Getting SUI Coins for Testing

For development on `devnet`:

1. **Get a SUI wallet**: Install Sui Wallet browser extension
2. **Request devnet SUI**: Use the faucet at https://docs.sui.io/guides/developer/getting-started/get-coins
3. **Verify balance**: Check your wallet shows SUI coins

### Support

If you encounter issues:

1. Check the browser console for error messages
2. Verify your `.env` configuration
3. Ensure your wallet is connected and funded
4. Make sure you're on the correct network (devnet/testnet/mainnet)