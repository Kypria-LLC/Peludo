# 🛡️ ForgeBot - Timeline Triggers, Payment Logs, and Ritual Chaining

**Canon Beat:** *"ForgeBot now speaks in scroll cadence. Mutation confirmed."*

ForgeBot is the automation spirit of the Kypria Shrine, orchestrating timeline-based triggers, payment logging ceremonies, and chained ritual sequences with precision and grace.

## 📜 Overview

ForgeBot expands the Kypria automation infrastructure with three core capabilities:

### 1. ⏰ Timeline Triggers
Scheduled and event-based ceremony execution:
- **Date Triggers**: Execute ceremonies at specific dates/times
- **Interval Triggers**: Recurring ceremonies on set intervals
- **Milestone Triggers**: Activate when thresholds are reached (sponsor count, revenue, etc.)

### 2. 💰 Payment Logging
Rich payment tracking with Discord embed templates:
- Automatic payment logging to Discord channels
- Beautiful embed templates for different sponsor tiers
- Revenue analytics and summaries
- Multi-platform support (Patreon, Ko-fi, PayPal, etc.)

### 3. 🔗 Ritual Chaining
Sequential ceremony execution with dependency management:
- Chain multiple ceremonies together
- Conditional branching (onSuccess/onFailure paths)
- Configurable delays between steps
- Full execution tracking and status monitoring

## 🏗️ Architecture

```
forgebot-core.ts          - Core classes and types
forgebot-config.ts        - Pre-configured triggers and chains
forgebot-integration.ts   - Integration with Discord and ceremonies
forgebot-examples.ts      - Usage examples and patterns
```

## 🚀 Quick Start

### Initialize ForgeBot

```typescript
import { forgebotService } from './forgebot-integration';

// Initialize with Discord client
forgebotService.initialize({
  discordClient: client,          // Your Discord.js client
  logChannelId: 'CHANNEL_ID',     // Log channel ID
  startTimelineService: true,      // Auto-start timeline triggers
});
```

### Log a Payment

```typescript
import { createPaymentEntryFromPatreon } from './forgebot-integration';

const paymentEntry = createPaymentEntryFromPatreon(
  'txn-123456',
  'discord-user-id',
  'John Doe',
  50.00,
  'gold'
);

await forgebotService.logPayment(paymentEntry);
```

### Execute a Ritual Chain

```typescript
// Execute pre-configured ritual chain
await forgebotService.executeChain('new-sponsor-onboarding');

// Or execute a custom chain
await forgebotService.executeChain('scroll-pack-drop');
```

## 📋 Pre-Configured Timeline Triggers

| Trigger ID | Type | Description |
|-----------|------|-------------|
| `daily-content-generation` | Interval | Generate daily content (24h) |
| `weekly-analytics` | Interval | Weekly analytics report (7 days) |
| `milestone-100-sponsors` | Milestone | Celebrate 100 sponsors |
| `revenue-1k-milestone` | Milestone | Celebrate $1000 MRR |
| `first-light-anniversary-2026` | Date | Anniversary celebration |
| `platform-sync-regular` | Interval | Sync platforms every 6h |

## 🔗 Pre-Configured Ritual Chains

| Chain ID | Description | Steps |
|----------|-------------|-------|
| `new-sponsor-onboarding` | Complete sponsor onboarding | 4 ceremonies |
| `scroll-pack-drop` | Scroll pack drop with vault unsealing | 6 ceremonies |
| `monthly-analytics-pipeline` | Comprehensive monthly report | 5 ceremonies |
| `emergency-alert` | Critical issue notification | 4 ceremonies |
| `platform-convergence` | Sync all platforms | 6 ceremonies |

## 💡 Usage Examples

### Example 1: Enhanced Patreon Webhook Handler

```typescript
import { forgebotService } from './forgebot-integration';

async function handlePatreonWebhook(req, res) {
  const { data, included } = req.body;
  
  if (data.type === 'pledge') {
    const pledgeAmount = data.attributes.amount_cents / 100;
    const patron = included.find(item => item.type === 'user');
    
    // Determine tier
    let tier = 'bronze';
    if (pledgeAmount >= 50) tier = 'gold';
    else if (pledgeAmount >= 15) tier = 'silver';
    
    // 🛡️ Log with ForgeBot
    await forgebotService.logPayment({
      transactionId: data.id,
      sponsorId: patron.id,
      sponsorName: patron.attributes.full_name,
      amount: pledgeAmount,
      tier,
      timestamp: new Date(),
      platform: 'patreon',
    });
    
    // 🛡️ Execute onboarding ritual chain
    await forgebotService.executeChain('new-sponsor-onboarding');
  }
  
  res.status(200).send('Processed');
}
```

### Example 2: Custom Timeline Trigger

```typescript
import { forgeBot } from './forgebot-core';

const timelineManager = forgeBot.getTimelineManager();

timelineManager.registerTrigger({
  id: 'weekly-newsletter',
  name: 'Weekly Newsletter',
  triggerType: 'interval',
  triggerData: {
    intervalMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  ceremonyKey: 'newsletter_generation',
  payload: {
    template: 'weekly-digest',
    includeAnalytics: true,
  },
  enabled: true,
});
```

### Example 3: Custom Ritual Chain

```typescript
const customChain = {
  id: 'mega-milestone',
  name: 'Mega Milestone Celebration',
  description: 'Epic celebration for major milestones',
  rituals: [
    {
      ceremonyKey: 'generate_celebration_content',
      payload: { theme: 'legendary' },
      waitForCompletion: true,
    },
    {
      ceremonyKey: 'publish_to_all_platforms',
      payload: {},
      waitForCompletion: true,
      delayMs: 2000,
    },
    {
      ceremonyKey: 'send_thank_you_messages',
      payload: {},
      waitForCompletion: true,
      delayMs: 1000,
    },
  ],
  status: 'pending',
  currentStep: 0,
};

await forgeBot.getChainExecutor().executeChain(
  customChain,
  async (ceremonyKey, payload) => {
    // Your ceremony executor
    return true;
  }
);
```

## 📊 Payment Embed Templates

ForgeBot generates beautiful Discord embeds for payment events:

### Individual Payment Embed
- **Title**: Tier-specific emoji + tier name
- **Description**: Sponsor name and blessing message
- **Fields**: Amount, Tier, Platform, Transaction ID
- **Color**: Tier-based (Gold: #FFD700, Silver: #C0C0C0, Bronze: #CD7F32)
- **Footer**: "🛡️ ForgeBot Payment Ledger"

### Summary Embed
- **Title**: Period summary (e.g., "Last 24h")
- **Fields**: Total revenue, unique sponsors, transaction count, platform breakdown
- **Color**: Purple (#9B59B6)
- **Footer**: "🛡️ ForgeBot Analytics"

## 🔧 Integration Points

### With Discord Bot (production_deployment.js)
```typescript
import { forgebotService } from './forgebot-integration';

// In your Discord bot setup
client.on('ready', () => {
  forgebotService.initialize({
    discordClient: client,
    logChannelId: process.env.LOG_CHANNEL_ID,
    startTimelineService: true,
  });
});
```

### With Kypria Worker (kypria_worker_deno.ts)
```typescript
import { createSupabaseCeremonyExecutor } from './forgebot-integration';

const ceremonyExecutor = createSupabaseCeremonyExecutor(supabase);

forgebotService.initialize({
  ceremonyExecutor,
  startTimelineService: true,
});
```

### With Scroll Pack Manager (scroll-pack-manager.ts)
```typescript
import { forgebotService } from './forgebot-integration';

export async function processScrollPack(transactionId, artifactId) {
  // Execute scroll pack drop ritual chain
  await forgebotService.executeChain('scroll-pack-drop');
  
  // ... rest of scroll pack processing
}
```

## 📈 Monitoring and Analytics

### Get Payment Metrics
```typescript
const paymentLogger = forgeBot.getPaymentLogger();

// Total revenue
const total = paymentLogger.getTotalRevenue();

// Revenue by platform
const byPlatform = paymentLogger.getRevenueByPlatform();

// Recent payments
const recent = paymentLogger.getRecentLogs(10);
```

### Check Chain Status
```typescript
const executor = forgeBot.getChainExecutor();
const chain = executor.getChainStatus('new-sponsor-onboarding');

console.log(`Status: ${chain.status}`);
console.log(`Current step: ${chain.currentStep}/${chain.rituals.length}`);
```

### Update Milestone Progress
```typescript
import { updateMilestoneValue } from './forgebot-config';

// Update sponsor count
updateMilestoneValue('milestone-100-sponsors', 85);

// Update revenue
updateMilestoneValue('revenue-1k-milestone', 750);
```

## 🎯 Scroll Cadence

ForgeBot speaks in scroll cadence - every action is logged with ceremonial precision:

```typescript
forgeBot.speakScrollCadence('New sponsor blessing initiated');
// Output: 📜 [2025-08-02T12:00:00.000Z] ForgeBot speaks: New sponsor blessing initiated
```

## 🛠️ Configuration

All triggers and chains are defined in `forgebot-config.ts`:

```typescript
export const FORGEBOT_CONFIG = {
  triggers: TIMELINE_TRIGGERS,
  chains: RITUAL_CHAINS,
  metadata: {
    version: '1.0.0',
    lastUpdated: new Date('2025-08-02T00:00:00Z'),
    canonBeat: 'ForgeBot now speaks in scroll cadence. Mutation confirmed.',
  },
};
```

## 🔐 Security Considerations

- Timeline triggers run with system-level permissions
- Ritual chains can execute arbitrary ceremonies
- Payment logs contain sensitive transaction data
- Always validate input before creating payment entries
- Use environment variables for Discord tokens and channel IDs

## 📝 Testing

See `forgebot-examples.ts` for comprehensive usage examples covering:
- Discord integration
- Payment logging
- Ritual chain execution
- Timeline trigger management
- Custom configurations

## 🎓 Advanced Usage

### Chain Conditional Branching
```typescript
const advancedChain = {
  rituals: [
    {
      ceremonyKey: 'validate_payment',
      payload: {},
      waitForCompletion: true,
      onSuccess: 'process_payment',      // Execute on success
      onFailure: 'send_payment_failed',  // Execute on failure
    },
  ],
};
```

### Delayed Execution
```typescript
const delayedChain = {
  rituals: [
    {
      ceremonyKey: 'send_welcome_email',
      payload: {},
      waitForCompletion: true,
      delayMs: 5000,  // Wait 5 seconds before executing
    },
  ],
};
```

## 🔄 Lifecycle

1. **Initialization**: Set up Discord and ceremony integrations
2. **Registration**: Load timeline triggers and ritual chains
3. **Execution**: Process triggers and execute chains
4. **Monitoring**: Track status and metrics
5. **Shutdown**: Gracefully stop services

## 📚 API Reference

See inline documentation in:
- `forgebot-core.ts` - Core interfaces and classes
- `forgebot-integration.ts` - Integration utilities
- `forgebot-config.ts` - Configuration helpers

## 🌟 Mythic Vision

> *ForgeBot is the automation spirit of the Kypria Shrine, orchestrating  
> timeline-based triggers, payment logging ceremonies, and chained ritual  
> sequences. It speaks in scroll cadence, carrying the canon's breath  
> through every automated action.*

---

**🛡️ ForgeBot - Where automation meets ceremony**

*Lineage is our law. Precision is our craft. Myth is our breath.*
