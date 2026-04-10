> SOURCE: https://dango-4.gitbook.io/dango-docs/accounts

- Accounts | Dango DocsGitBook AssistantGitBook AssistantWorking…Thinking…Waiting for your answer…closeGitBook AssistantGood morningI&#x27;m here to help you with the docs.What is this page about?What should I read next?Can you give an example?chevron-upchevron-down⌘CtrliAI Based on your contextquestion-circleSendhand-waveAbout Dango
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


## hashtagSmart Accounts & User Experience
Dango&#x27;s account system is one of its most differentiated features and is fundamental to the "one app for everything DeFi" vision. It is built on top of Grug&#x27;s native account abstraction capabilities.


### hashtagThe Problem with Traditional Crypto UX
Standard crypto wallets require users to:


- Generate and store a 12- or 24-word seed phrase
- Never lose or expose it (lost = funds gone forever)
- Pay gas in the chain&#x27;s native token before they can transact
- Manage multiple wallets across different chains
- Install browser extensions (MetaMask) to interact with dAppsThese requirements create enormous friction for new users and security risks for all users.


### hashtagSmart Accounts
Dango&#x27;s Smart Accounts are programmable accounts that replace the standard private-key model with a flexible authentication layer powered by Grug.


#### hashtagKey Properties
1. Keyless / Wallet-less

No browser wallet extension or seed phrase required. Account access is secured by:


- Passkeys — a FIDO2 standard that stores a cryptographic key in your device&#x27;s secure enclave (Touch ID, Face ID, Windows Hello)
- Multi-factor authentication — optional additional factors
- Biometric verification — on mobile, the phone&#x27;s biometrics authenticate transactionsThe private key is generated and stored in the device&#x27;s secure enclave, never exposed to the user or the application.

2. Cloud-Synced Access

Because the key lives in the device&#x27;s secure enclave / cloud keychain (iCloud, Google), your Dango account is accessible from any of your devices without manually importing a seed phrase.

3. Native Username

Each Smart Account has a human-readable username (e.g. `@alice`) registered on-chain. This replaces hex addresses for transfers and creates a persistent on-chain identity.

4. Programmable Logic

Developers can deploy custom authentication logic to Smart Accounts:


### hashtagSubaccounts
Every Dango account supports subaccounts — child accounts that inherit from the master account&#x27;s margin pool but can be managed independently.

Use Case

How Subaccounts Help


Portfolio separation


Keep long-term holdings separate from active trading


Risk isolation


Cap losses on a specific strategy


API trading


Grant limited permissions to an automated bot


Team trading


Multiple operators with defined access levels


Subaccounts share collateral with the master account (unified margin), or can be isolated with dedicated collateral.


### hashtagGas Abstraction
From the user&#x27;s perspective, Dango is completely gasless.

Developers can further customize gas logic:


- Sponsor gas on behalf of users (users pay nothing at all)
- Apply discounts to specific user groups (token holders, NFT holders, etc.)
- Implement dynamic fee tiers based on volume

### hashtagThe Taxman Contract
The Taxman is a system-level smart contract governing all fee and gas logic on Dango. Instead of gas rules being hardcoded in the protocol (as on Ethereum), Taxman allows:

Feature

Description


Customizable fee structures


Different dApps can have different fee models


Discount programming


Rewards users algorithmically, no protocol changes needed


Upgradeable


Fee logic updates are contract upgrades, not consensus-layer hard forks


### hashtagComparison: Traditional Wallet vs Dango Smart Account
Feature

MetaMask / Traditional

Dango Smart Account


Onboarding


24-word seed phrase


Passkey / biometric


Gas token


Must hold native token


Gasless UX


Address format


`0x4a2b...f91c`


`@username`


Device sync


Manual import


Cloud-synced automatically


Recovery


Seed phrase (lose = lose funds)


Cloud keychain / social recovery


Account logic


Fixed


Programmable


Multi-device


Manual


Automatic


PreviousAuditschevron-leftNextRoadmapchevron-right

Last updated 16 days ago

Was this helpful?


- Smart Accounts & User Experience
- The Problem with Traditional Crypto UX
- Smart Accounts
- Subaccounts
- Gas Abstraction
- The Taxman Contract
- Comparison: Traditional Wallet vs Dango Smart Account


Was this helpful?


Copy
```
- Spending limits per session
- Time-locked transactions
- Multi-sig approval requirements
- Social recovery mechanisms
```


Copy
```
All fees denominated in USDC
↓
Taxman contract collects fees automatically from trading balance
↓
USDC used to buy DNG on the open market
↓
DNG permanently burned (deflationary)
```