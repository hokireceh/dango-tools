> SOURCE: https://dango-4.gitbook.io/dango-docs/architecture-and-technology

- Architecture & Technology | Dango DocsGitBook AssistantGitBook AssistantWorking…Thinking…Waiting for your answer…closeGitBook AssistantGood morningI&#x27;m here to help you with the docs.What is this page about?What should I read next?Can you give an example?chevron-upchevron-down⌘CtrliAI Based on your contextquestion-circleSendhand-waveAbout Dango
- Architecture & Technology
- Core Features
- Trading
- Referral system
- Points
- Audits
- Accounts
- Roadmap
- Team
- Community

chevron-upchevron-down

gitbookPowered by GitBook

xmarkblock-quoteOn this pagechevron-down


## hashtagArchitecture & Technology
Dango&#x27;s technical stack is unusual: Left Curve Software built both the execution environment (Grug) and the application layer (Dango) themselves, rather than deploying on a general-purpose base. This tight co-design is the project&#x27;s core technical moat.


### hashtagThe Grug Execution Environment
Grug is Dango&#x27;s bespoke blockchain execution environment — analogous to the EVM for Ethereum or SVM for Solana, but designed from scratch for DeFi. Unlike EVM, Cosmos SDK, or Move, Grug is not a universal compute platform. It is optimized for:


- Data flow management — efficient state reads/writes for high-throughput trading
- Task scheduling — on-chain cron jobs as a first-class primitive
- Gas fee programmability — developer-defined fee structures without hard forks
- Account abstraction — smart accounts with arbitrary authentication logic baked in at the protocol levelGrug is implemented in Rust. Smart contracts are Rust → WASM modules. The full stack (chain, indexer, TypeScript SDK, web UI) lives in the open-source monorepo `left-curve/left-curve`arrow-up-right.


### hashtagTechnology Stack
Layer

Technology


Execution environment


Grug (custom, Rust)


Smart contracts


Rust → WASM


Consensus


CometBFT (Tendermint-based)


Validator set


Proof of Authority (~20 nodes)


Cross-chain messaging


Hyperlane (implemented in Grug)


SDK


TypeScript


Indexer


Rust


Web UI


TypeScript (React)


### hashtagValidator & Consensus Model
Dango uses a Proof of Authority (PoA) validator set of approximately 20 nodes, selected by the Left Curve Foundation (LCF) based on cost, reputation, and operational quality.

The rationale: at this stage, decentralizing consensus introduces latency and coordination overhead that would sacrifice execution speed. PoA allows the chain to operate with predictable block times and high throughput while the product matures. The validator set is expected to evolve as the protocol grows.

Consensus uses CometBFT (formerly Tendermint), which provides:


- Instant finality — no probabilistic confirmation
- Byzantine Fault Tolerance (BFT)
- Deterministic block production

### hashtagCross-Chain Interoperability
Dango implements the Hyperlane cross-chain messaging protocol directly in Grug, enabling assets and messages to flow between Dango and other chains. This is how users bridge assets in from Ethereum, Arbitrum, Base, and other ecosystems into the unified Dango account.


### hashtagThe Taxman Contract
A key infrastructure primitive is the Taxman smart contract, which governs gas fee logic across the entire chain. Rather than hardcoding fee rules in the protocol, Taxman allows:


- Fee discounts — for specific user groups or NFT holders
- Custom fee structures — per application
- Gas sponsorship — protocols can pay gas on behalf of users entirelyThis means Dango can offer gasless trading from the user&#x27;s perspective while maintaining economic security.


### hashtagOn-Chain CLOB with Batch Auctions
The core matching engine is a fully on-chain Central Limit Order Book (CLOB) with periodic batch settlement:


- Orders are submitted on-chain with full price-time priority
- Trades settle via batch auctions every 0.2–0.5 seconds
- Batch settlement eliminates front-running and MEV — all orders in a batch clear at the same clearing price
- Every order and fill is verifiable on-chainThis is fundamentally different from DEXs that use off-chain order matching (like dYdX v3 or Paradex), and different from AMMs. It delivers CEX-like price discovery with on-chain verifiability.


### hashtagOn-Chain Cron Jobs
One of Grug&#x27;s most distinctive features: on-chain cron jobs — automated task schedulers that execute predefined operations at set intervals, with no external bots or centralized services required.

DeFi applications that benefit from cron jobs:

Application

Cron Job Use


Perpetuals DEX


Automatic funding rate calculation and settlement


Lending


Interest accrual and liquidation checks


Vaults


Rebalancing or yield harvesting


Oracles


Automatic oracle updates fed directly into protocol state


This eliminates a common DeFi vulnerability: dependence on external keeper bots that can fail, be manipulated, or become economically unviable.


PreviousAbout Dangochevron-leftNextCore Featureschevron-right

Last updated 16 days ago

Was this helpful?


- Architecture & Technology
- The Grug Execution Environment
- Technology Stack
- Validator & Consensus Model
- Cross-Chain Interoperability
- The Taxman Contract
- On-Chain CLOB with Batch Auctions
- On-Chain Cron Jobs


Was this helpful?