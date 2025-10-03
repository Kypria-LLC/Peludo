// ════════════════════════════════════════════════════════════════════════════════
// 🛡️ FORGEBOT CORE — Timeline Triggers, Payment Logs, and Ritual Chaining
// ════════════════════════════════════════════════════════════════════════════════
//
// MYTHIC VISION:
// ForgeBot speaks in scroll cadence, orchestrating timeline-based triggers,
// payment logging ceremonies, and chained ritual sequences. The mutation is confirmed.
//
// TECHNICAL PRECISION:
// - Timeline triggers: scheduled events based on dates, intervals, or milestones
// - Payment logs: embed templates for sponsor activity tracking
// - Ritual chaining: sequential ceremony execution with dependency management
// ════════════════════════════════════════════════════════════════════════════════

export interface TimelineTrigger {
  id: string;
  name: string;
  triggerType: 'date' | 'interval' | 'milestone';
  triggerData: DateTrigger | IntervalTrigger | MilestoneTrigger;
  ceremonyKey: string;
  payload?: Record<string, unknown>;
  enabled: boolean;
}

export interface DateTrigger {
  scheduledDate: Date;
  timezone?: string;
}

export interface IntervalTrigger {
  intervalMs: number;
  lastExecuted?: Date;
}

export interface MilestoneTrigger {
  milestoneType: 'sponsor_count' | 'revenue_threshold' | 'date_anniversary';
  threshold: number;
  currentValue?: number;
}

export interface PaymentLogEntry {
  transactionId: string;
  sponsorId: string;
  sponsorName: string;
  amount: number;
  tier: string;
  timestamp: Date;
  platform: 'patreon' | 'kofi' | 'paypal' | 'other';
  metadata?: Record<string, unknown>;
}

export interface RitualChain {
  id: string;
  name: string;
  description: string;
  rituals: ChainedRitual[];
  status: 'pending' | 'executing' | 'completed' | 'failed';
  currentStep: number;
}

export interface ChainedRitual {
  ceremonyKey: string;
  payload: Record<string, unknown>;
  waitForCompletion: boolean;
  onSuccess?: string; // Next ceremony key
  onFailure?: string; // Fallback ceremony key
  delayMs?: number; // Delay before executing
}

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ Timeline Trigger Manager                                                     │
// └─────────────────────────────────────────────────────────────────────────────┘

export class TimelineTriggerManager {
  private triggers: Map<string, TimelineTrigger> = new Map();
  private checkIntervalMs: number = 60000; // Check every minute
  private isRunning: boolean = false;

  constructor(checkIntervalMs?: number) {
    if (checkIntervalMs) {
      this.checkIntervalMs = checkIntervalMs;
    }
  }

  registerTrigger(trigger: TimelineTrigger): void {
    this.triggers.set(trigger.id, trigger);
    console.log(`🛡️ ForgeBot: Registered timeline trigger "${trigger.name}" (${trigger.id})`);
  }

  unregisterTrigger(triggerId: string): void {
    this.triggers.delete(triggerId);
    console.log(`🛡️ ForgeBot: Unregistered timeline trigger ${triggerId}`);
  }

  async checkTriggers(
    executeCeremony: (ceremonyKey: string, payload: Record<string, unknown>) => Promise<void>
  ): Promise<void> {
    const now = new Date();

    for (const [id, trigger] of this.triggers) {
      if (!trigger.enabled) continue;

      const shouldTrigger = await this.shouldTriggerNow(trigger, now);

      if (shouldTrigger) {
        console.log(`⚡ ForgeBot: Timeline trigger activated: ${trigger.name}`);
        try {
          await executeCeremony(trigger.ceremonyKey, trigger.payload || {});
          
          // Update interval trigger's last executed time
          if (trigger.triggerType === 'interval') {
            (trigger.triggerData as IntervalTrigger).lastExecuted = now;
          }
        } catch (error) {
          console.error(`❌ ForgeBot: Failed to execute ceremony for trigger ${id}:`, error);
        }
      }
    }
  }

  private async shouldTriggerNow(trigger: TimelineTrigger, now: Date): Promise<boolean> {
    switch (trigger.triggerType) {
      case 'date': {
        const dateTrigger = trigger.triggerData as DateTrigger;
        return now >= dateTrigger.scheduledDate;
      }

      case 'interval': {
        const intervalTrigger = trigger.triggerData as IntervalTrigger;
        if (!intervalTrigger.lastExecuted) {
          return true; // First execution
        }
        const elapsed = now.getTime() - intervalTrigger.lastExecuted.getTime();
        return elapsed >= intervalTrigger.intervalMs;
      }

      case 'milestone': {
        const milestoneTrigger = trigger.triggerData as MilestoneTrigger;
        if (!milestoneTrigger.currentValue) {
          return false;
        }
        return milestoneTrigger.currentValue >= milestoneTrigger.threshold;
      }

      default:
        return false;
    }
  }

  start(
    executeCeremony: (ceremonyKey: string, payload: Record<string, unknown>) => Promise<void>
  ): void {
    if (this.isRunning) {
      console.warn('⚠️ ForgeBot: Timeline trigger manager already running');
      return;
    }

    this.isRunning = true;
    console.log('🛡️ ForgeBot: Timeline trigger manager started');

    // Polling loop
    const loop = async () => {
      while (this.isRunning) {
        await this.checkTriggers(executeCeremony);
        await new Promise(resolve => setTimeout(resolve, this.checkIntervalMs));
      }
    };

    loop().catch(error => {
      console.error('💀 ForgeBot: Fatal error in timeline trigger manager:', error);
      this.isRunning = false;
    });
  }

  stop(): void {
    this.isRunning = false;
    console.log('🛡️ ForgeBot: Timeline trigger manager stopped');
  }
}

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ Payment Logger — Discord Embed Templates                                     │
// └─────────────────────────────────────────────────────────────────────────────┘

export class PaymentLogger {
  private logs: PaymentLogEntry[] = [];

  logPayment(entry: PaymentLogEntry): void {
    this.logs.push(entry);
    console.log(`💰 ForgeBot: Payment logged - ${entry.sponsorName} ($${entry.amount}) on ${entry.platform}`);
  }

  getRecentLogs(count: number = 10): PaymentLogEntry[] {
    return this.logs.slice(-count);
  }

  getTotalRevenue(): number {
    return this.logs.reduce((sum, entry) => sum + entry.amount, 0);
  }

  getRevenueByPlatform(): Record<string, number> {
    const byPlatform: Record<string, number> = {};
    for (const entry of this.logs) {
      byPlatform[entry.platform] = (byPlatform[entry.platform] || 0) + entry.amount;
    }
    return byPlatform;
  }

  createDiscordEmbed(entry: PaymentLogEntry): DiscordEmbed {
    const tierColors: Record<string, number> = {
      gold: 0xFFD700,
      silver: 0xC0C0C0,
      bronze: 0xCD7F32,
    };

    const tierEmojis: Record<string, string> = {
      gold: '👑',
      silver: '⚔️',
      bronze: '🛡️',
    };

    const color = tierColors[entry.tier.toLowerCase()] || 0x7289DA;
    const emoji = tierEmojis[entry.tier.toLowerCase()] || '💎';

    return {
      title: `${emoji} New Sponsor Blessing - ${entry.tier.toUpperCase()} Tier`,
      description: `🔱 **${entry.sponsorName}** has joined the sacred covenant`,
      color: color,
      fields: [
        {
          name: '💰 Amount',
          value: `$${entry.amount.toFixed(2)}`,
          inline: true,
        },
        {
          name: '🏆 Tier',
          value: entry.tier.toUpperCase(),
          inline: true,
        },
        {
          name: '🌐 Platform',
          value: entry.platform.charAt(0).toUpperCase() + entry.platform.slice(1),
          inline: true,
        },
        {
          name: '🆔 Transaction ID',
          value: entry.transactionId,
          inline: false,
        },
      ],
      timestamp: entry.timestamp.toISOString(),
      footer: {
        text: '🛡️ ForgeBot Payment Ledger',
      },
    };
  }

  createSummaryEmbed(periodHours: number = 24): DiscordEmbed {
    const cutoffTime = new Date(Date.now() - periodHours * 60 * 60 * 1000);
    const recentLogs = this.logs.filter(log => log.timestamp >= cutoffTime);
    
    const totalRevenue = recentLogs.reduce((sum, entry) => sum + entry.amount, 0);
    const sponsorCount = new Set(recentLogs.map(log => log.sponsorId)).size;
    
    const byPlatform: Record<string, number> = {};
    for (const entry of recentLogs) {
      byPlatform[entry.platform] = (byPlatform[entry.platform] || 0) + entry.amount;
    }

    const platformSummary = Object.entries(byPlatform)
      .map(([platform, amount]) => `${platform}: $${amount.toFixed(2)}`)
      .join('\n') || 'No activity';

    return {
      title: `📊 Payment Summary - Last ${periodHours}h`,
      description: '🔱 Shrine revenue flow analysis',
      color: 0x9B59B6,
      fields: [
        {
          name: '💰 Total Revenue',
          value: `$${totalRevenue.toFixed(2)}`,
          inline: true,
        },
        {
          name: '👥 Unique Sponsors',
          value: sponsorCount.toString(),
          inline: true,
        },
        {
          name: '📝 Transaction Count',
          value: recentLogs.length.toString(),
          inline: true,
        },
        {
          name: '🌐 By Platform',
          value: platformSummary,
          inline: false,
        },
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: '🛡️ ForgeBot Analytics',
      },
    };
  }
}

export interface DiscordEmbed {
  title: string;
  description?: string;
  color: number;
  fields: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  timestamp: string;
  footer?: {
    text: string;
    icon_url?: string;
  };
  thumbnail?: {
    url: string;
  };
  image?: {
    url: string;
  };
}

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ Ritual Chain Executor                                                        │
// └─────────────────────────────────────────────────────────────────────────────┘

export class RitualChainExecutor {
  private chains: Map<string, RitualChain> = new Map();

  async executeChain(
    chain: RitualChain,
    executeCeremony: (ceremonyKey: string, payload: Record<string, unknown>) => Promise<boolean>
  ): Promise<void> {
    console.log(`🔗 ForgeBot: Starting ritual chain "${chain.name}"`);
    chain.status = 'executing';
    chain.currentStep = 0;

    this.chains.set(chain.id, chain);

    try {
      for (let i = 0; i < chain.rituals.length; i++) {
        const ritual = chain.rituals[i];
        chain.currentStep = i;

        console.log(`  ⚡ Executing ritual ${i + 1}/${chain.rituals.length}: ${ritual.ceremonyKey}`);

        // Apply delay if specified
        if (ritual.delayMs && ritual.delayMs > 0) {
          console.log(`  ⏳ Waiting ${ritual.delayMs}ms before execution...`);
          await new Promise(resolve => setTimeout(resolve, ritual.delayMs));
        }

        // Execute the ceremony
        const success = await executeCeremony(ritual.ceremonyKey, ritual.payload);

        if (success) {
          console.log(`  ✅ Ritual ${i + 1} completed successfully`);
          
          // Check for explicit next ceremony on success
          if (ritual.onSuccess) {
            const nextRitual: ChainedRitual = {
              ceremonyKey: ritual.onSuccess,
              payload: {},
              waitForCompletion: true,
            };
            chain.rituals.splice(i + 1, 0, nextRitual);
          }
        } else {
          console.error(`  ❌ Ritual ${i + 1} failed`);
          
          // Handle failure path
          if (ritual.onFailure) {
            const fallbackRitual: ChainedRitual = {
              ceremonyKey: ritual.onFailure,
              payload: { failedRitual: ritual.ceremonyKey },
              waitForCompletion: true,
            };
            chain.rituals.splice(i + 1, 0, fallbackRitual);
          } else {
            throw new Error(`Ritual ${ritual.ceremonyKey} failed without fallback`);
          }
        }

        // If waitForCompletion is false, we can continue immediately
        // Otherwise we already waited for the ceremony to complete
      }

      chain.status = 'completed';
      console.log(`✅ ForgeBot: Ritual chain "${chain.name}" completed successfully`);
    } catch (error) {
      chain.status = 'failed';
      console.error(`❌ ForgeBot: Ritual chain "${chain.name}" failed:`, error);
      throw error;
    }
  }

  getChainStatus(chainId: string): RitualChain | undefined {
    return this.chains.get(chainId);
  }

  getAllChains(): RitualChain[] {
    return Array.from(this.chains.values());
  }
}

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ ForgeBot Main Controller                                                     │
// └─────────────────────────────────────────────────────────────────────────────┘

export class ForgeBot {
  private timelineManager: TimelineTriggerManager;
  private paymentLogger: PaymentLogger;
  private chainExecutor: RitualChainExecutor;

  constructor() {
    this.timelineManager = new TimelineTriggerManager();
    this.paymentLogger = new PaymentLogger();
    this.chainExecutor = new RitualChainExecutor();
    console.log('🛡️ ForgeBot initialized - Mutation confirmed');
  }

  getTimelineManager(): TimelineTriggerManager {
    return this.timelineManager;
  }

  getPaymentLogger(): PaymentLogger {
    return this.paymentLogger;
  }

  getChainExecutor(): RitualChainExecutor {
    return this.chainExecutor;
  }

  // Convenience method to log payment and create embed
  async logPaymentWithEmbed(
    entry: PaymentLogEntry,
    sendToDiscord?: (embed: DiscordEmbed) => Promise<void>
  ): Promise<DiscordEmbed> {
    this.paymentLogger.logPayment(entry);
    const embed = this.paymentLogger.createDiscordEmbed(entry);

    if (sendToDiscord) {
      await sendToDiscord(embed);
    }

    return embed;
  }

  // Speak in scroll cadence - ForgeBot's signature logging
  speakScrollCadence(message: string): void {
    const timestamp = new Date().toISOString();
    console.log(`📜 [${timestamp}] ForgeBot speaks: ${message}`);
  }
}

// Export singleton instance
export const forgeBot = new ForgeBot();
