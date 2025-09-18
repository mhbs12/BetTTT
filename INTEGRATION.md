# BetTTT - SUI Blockchain Tic-Tac-Toe

Este site é um jogo de tic-tac-toe multiplayer integrado com a blockchain SUI, incluindo sistema de apostas usando contratos inteligentes SUI Move.

## Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes configurações:

```env
# SUI Move Package Configuration
NEXT_PUBLIC_PACKAGE_ID=0x0  # Substitua pelo ID do seu pacote SUI Move
NEXT_PUBLIC_NETWORK=devnet  # devnet, testnet, ou mainnet
```

### Contrato SUI Move

O projeto integra com o seguinte contrato SUI Move:

```move
module 0x0::main;

use sui::sui::SUI;
use sui::coin::{Self, Coin};
use sui::balance::{Self, Balance};
use sui::tx_context::{Self, TxContext};
use sui::transfer;
use sui::object::{Self, UID};

public struct Treasury has key{
    id: UID,
    balance: Balance<SUI>,
}

public entry fun criar_aposta(mut coin: Coin<SUI>, amount: u64, ctx: &mut TxContext) {
    let stake = coin::split(&mut coin, amount, ctx);
    let value = coin::into_balance(stake);        
    let t = Treasury { 
        id: object::new(ctx), 
        balance: value 
    };
    transfer::public_transfer(coin, tx_context::sender(ctx));
    transfer::share_object(t);
}

public entry fun entrar_aposta(treasury: &mut Treasury, mut coin: Coin<SUI>, amount: u64, ctx: &mut TxContext) {
    assert!(balance::value(&treasury.balance) <= amount, 1);
    let stake = coin::split(&mut coin, amount, ctx);
    let value = coin::into_balance(stake);
    balance::join(&mut treasury.balance, value);
    transfer::public_transfer(coin, tx_context::sender(ctx));
}

public entry fun finish_game(winner: address, treasury: Treasury, ctx: &mut TxContext) {
    let Treasury { id, balance: total_balance } = treasury;
    object::delete(id);
    let prize = coin::from_balance(total_balance, ctx);
    transfer::public_transfer(prize, winner);
}
```

### Funcionalidades

- **Criar Sala com Aposta**: Insira o valor da aposta em SUI ao criar uma sala
- **Entrar em Sala**: O valor da aposta deve coincidir com o valor da sala
- **Distribuição Automática**: O vencedor recebe automaticamente o prêmio via contrato inteligente

## Instalação

```bash
npm install
npm run dev
```

O site estará disponível em `http://localhost:3000`.