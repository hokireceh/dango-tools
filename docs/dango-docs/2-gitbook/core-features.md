> SOURCE: https://dango-4.gitbook.io/dango-docs/core-features

- Core Features | Dango DocsGitBook AssistantGitBook AssistantWorking…Thinking…Waiting for your answer…closeGitBook AssistantGood morningI&#x27;m here to help you with the docs.What is this page about?What should I read next?Can you give an example?chevron-upchevron-down⌘CtrliAI Based on your contextquestion-circleSendhand-waveAbout Dango
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


## hashtagCore Features
Dango&#x27;s product is built around four application-layer pillars — Spot, Perpetuals, Vaults, and Lending — all accessible from a single unified account. This page covers the platform-level features underpinning all four products.


### hashtagUnified Margin System
The centerpiece of Dango&#x27;s design is its Unified Margin Account: a single account that holds all assets and allows them to serve as collateral across every product simultaneously.


#### hashtagHow It Works
Traditional DeFi requires separate deposits per protocol:


Copy
```
dYdX perp → deposit on dYdX
Uniswap → separate wallet balance
Aave → separate deposit on Aave
```


On Dango, one deposit covers all of the above. ETH holdings, spot positions, and vault allocations all exist within one margin pool. The system dynamically calculates aggregate risk and adjusts borrowing capacity accordingly.


#### hashtagExample
A user deposits 1 ETH:


- Used as collateral to open a 5× leveraged BTC perp
- Backs a USDC loan for spot trading simultaneously
- Vault yield accrues on the idle portion
- One unified liquidation price governs all positions


### hashtagGasless Trading
From the user&#x27;s perspective, trading on Dango is completely gasless — no native token needed. All fees are denominated in USDC and collected automatically from the trading account.


### hashtagNative Usernames
Dango accounts support human-readable usernames instead of hex addresses:


- @alice instead of 0x4a2b...f91c
- Registered on-chain as part of the smart account system
- Accounts accumulate reputation and history attached to a persistent username

### hashtagSubaccounts
Users can create subaccounts under a master account:

Use Case

How Subaccounts Help


Portfolio separation


Keep long-term holdings separate from active trading


Risk isolation


Cap losses on a specific strategy without affecting other positions


API / bot trading


Grant a subaccount limited permissions to an automated strategy


Team trading


Multiple operators accessing a shared capital pool with defined limits


### hashtagNotifications
A native notification system alerts users to fills, liquidation risk, funding rate changes, and other events. 


### hashtagBuilt-in Block Explorer
A native block explorer is integrated into the platform, giving traders visibility into transaction history, order fills, and on-chain state without leaving the exchange.


### hashtagMobile App
A native mobile app is on the roadmap. The passkey/biometric authentication system is particularly well-suited to mobile — logging in with Face ID or fingerprint rather than a 24-word seed phrase.


PreviousArchitecture & Technologychevron-leftNextTradingchevron-right

Last updated 16 days ago

Was this helpful?


- Core Features
- Unified Margin System
- Gasless Trading
- Native Usernames
- Subaccounts
- Notifications
- Built-in Block Explorer
- Mobile App


Was this helpful?