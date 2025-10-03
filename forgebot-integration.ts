// ════════════════════════════════════════════════════════════════════════════════
// 🛡️ FORGEBOT INTEGRATION — Connect ForgeBot to Discord and Ceremony Systems
// ════════════════════════════════════════════════════════════════════════════════
//
// This module integrates ForgeBot with:
// - Discord bot (production_deployment.js)
// - Kypria Worker ceremony system (kypria_worker_deno.ts)
// - Scroll pack manager (scroll-pack-manager.ts)
//
// ════════════════════════════════════════════════════════════════════════════════

import { forgeBot } from './forgebot-core';
import type { PaymentLogEntry, DiscordEmbed } from './forgebot-core';
import { TIMELINE_TRIGGERS, RITUAL_CHAINS } from './forgebot-config';

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ Discord Integration                                                          │
// └─────────────────────────────────────────────────────────────────────────────┘

export interface DiscordClient {
  channels: {
    fetch(channelId: string): Promise<DiscordChannel>;
  };
}

export interface DiscordChannel {
  send(options: { embeds: DiscordEmbed[] }): Promise<void>;
}

export class ForgebotDiscordIntegration {
  private discordClient?: DiscordClient;
  private logChannelId?: string;

  constructor(discordClient?: DiscordClient, logChannelId?: string) {
    this.discordClient = discordClient;
    this.logChannelId = logChannelId;
  }

  setDiscordClient(client: DiscordClient): void {
    this.discordClient = client;
  }

  setLogChannel(channelId: string): void {
    this.logChannelId = channelId;
  }

  async sendEmbed(embed: DiscordEmbed, channelId?: string): Promise<void> {
    if (!this.discordClient) {
      console.warn('⚠️ ForgeBot: Discord client not configured, skipping embed send');
      return;
    }

    const targetChannelId = channelId || this.logChannelId;
    if (!targetChannelId) {
      console.warn('⚠️ ForgeBot: No channel ID specified');
      return;
    }

    try {
      const channel = await this.discordClient.channels.fetch(targetChannelId);
      await channel.send({ embeds: [embed] });
      console.log('✅ ForgeBot: Embed sent to Discord');
    } catch (error) {
      console.error('❌ ForgeBot: Failed to send embed to Discord:', error);
      throw error;
    }
  }

  async logPaymentToDiscord(entry: PaymentLogEntry): Promise<void> {
    const embed = await forgeBot.logPaymentWithEmbed(entry);
    await this.sendEmbed(embed);
  }

  async sendPaymentSummary(periodHours: number = 24): Promise<void> {
    const embed = forgeBot.getPaymentLogger().createSummaryEmbed(periodHours);
    await this.sendEmbed(embed);
  }
}

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ Ceremony Execution Integration                                               │
// └─────────────────────────────────────────────────────────────────────────────┘

export type CeremonyExecutor = (
  ceremonyKey: string,
  payload: Record<string, unknown>
) => Promise<boolean>;

export class ForgebotCeremonyBridge {
  private ceremonyExecutor?: CeremonyExecutor;

  setCeremonyExecutor(executor: CeremonyExecutor): void {
    this.ceremonyExecutor = executor;
  }

  async executeCeremony(
    ceremonyKey: string,
    payload: Record<string, unknown>
  ): Promise<boolean> {
    if (!this.ceremonyExecutor) {
      console.error('❌ ForgeBot: Ceremony executor not configured');
      return false;
    }

    forgeBot.speakScrollCadence(
      `Invoking ceremony: ${ceremonyKey} with payload ${JSON.stringify(payload)}`
    );

    try {
      return await this.ceremonyExecutor(ceremonyKey, payload);
    } catch (error) {
      console.error(`❌ ForgeBot: Ceremony ${ceremonyKey} failed:`, error);
      return false;
    }
  }

  async executeRitualChain(chainId: string): Promise<void> {
    const chain = RITUAL_CHAINS[chainId];
    if (!chain) {
      throw new Error(`Ritual chain not found: ${chainId}`);
    }

    const executor = forgeBot.getChainExecutor();
    await executor.executeChain(chain, this.executeCeremony.bind(this));
  }
}

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ Timeline Trigger Integration                                                 │
// └─────────────────────────────────────────────────────────────────────────────┘

export class ForgebotTimelineService {
  private ceremonyBridge: ForgebotCeremonyBridge;
  private isRunning: boolean = false;

  constructor(ceremonyBridge: ForgebotCeremonyBridge) {
    this.ceremonyBridge = ceremonyBridge;
  }

  start(): void {
    if (this.isRunning) {
      console.warn('⚠️ ForgeBot: Timeline service already running');
      return;
    }

    // Register all timeline triggers
    const timelineManager = forgeBot.getTimelineManager();
    for (const trigger of TIMELINE_TRIGGERS) {
      timelineManager.registerTrigger(trigger);
    }

    // Start the timeline manager with ceremony executor
    timelineManager.start(async (ceremonyKey, payload) => {
      await this.ceremonyBridge.executeCeremony(ceremonyKey, payload);
    });

    this.isRunning = true;
    forgeBot.speakScrollCadence('Timeline service activated - triggers armed');
  }

  stop(): void {
    forgeBot.getTimelineManager().stop();
    this.isRunning = false;
    forgeBot.speakScrollCadence('Timeline service deactivated');
  }
}

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ Unified ForgeBot Service                                                     │
// └─────────────────────────────────────────────────────────────────────────────┘

export class ForgebotService {
  private discordIntegration: ForgebotDiscordIntegration;
  private ceremonyBridge: ForgebotCeremonyBridge;
  private timelineService: ForgebotTimelineService;

  constructor() {
    this.discordIntegration = new ForgebotDiscordIntegration();
    this.ceremonyBridge = new ForgebotCeremonyBridge();
    this.timelineService = new ForgebotTimelineService(this.ceremonyBridge);
  }

  initialize(config: ForgebotServiceConfig): void {
    console.log('🛡️ ForgeBot: Initializing service...');

    // Setup Discord integration
    if (config.discordClient && config.logChannelId) {
      this.discordIntegration.setDiscordClient(config.discordClient);
      this.discordIntegration.setLogChannel(config.logChannelId);
      console.log('✅ ForgeBot: Discord integration configured');
    }

    // Setup ceremony executor
    if (config.ceremonyExecutor) {
      this.ceremonyBridge.setCeremonyExecutor(config.ceremonyExecutor);
      console.log('✅ ForgeBot: Ceremony executor configured');
    }

    // Start timeline service if requested
    if (config.startTimelineService) {
      this.timelineService.start();
    }

    forgeBot.speakScrollCadence('ForgeBot service initialization complete');
  }

  getDiscordIntegration(): ForgebotDiscordIntegration {
    return this.discordIntegration;
  }

  getCeremonyBridge(): ForgebotCeremonyBridge {
    return this.ceremonyBridge;
  }

  getTimelineService(): ForgebotTimelineService {
    return this.timelineService;
  }

  // High-level convenience methods
  async logPayment(entry: PaymentLogEntry): Promise<void> {
    await this.discordIntegration.logPaymentToDiscord(entry);
  }

  async executeChain(chainId: string): Promise<void> {
    await this.ceremonyBridge.executeRitualChain(chainId);
  }

  shutdown(): void {
    this.timelineService.stop();
    forgeBot.speakScrollCadence('ForgeBot service shutting down');
  }
}

export interface ForgebotServiceConfig {
  discordClient?: DiscordClient;
  logChannelId?: string;
  ceremonyExecutor?: CeremonyExecutor;
  startTimelineService?: boolean;
}

// Export singleton service instance
export const forgebotService = new ForgebotService();

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ Helper Functions for Integration                                             │
// └─────────────────────────────────────────────────────────────────────────────┘

/**
 * Convert a Patreon pledge to a PaymentLogEntry
 */
export function createPaymentEntryFromPatreon(
  transactionId: string,
  sponsorId: string,
  sponsorName: string,
  amount: number,
  tier: string
): PaymentLogEntry {
  return {
    transactionId,
    sponsorId,
    sponsorName,
    amount,
    tier,
    timestamp: new Date(),
    platform: 'patreon',
    metadata: {
      source: 'patreon-webhook',
    },
  };
}

/**
 * Create a ceremony executor that wraps the Kypria Worker RPC
 */
export function createSupabaseCeremonyExecutor(
  supabaseClient: any
): CeremonyExecutor {
  return async (ceremonyKey: string, payload: Record<string, unknown>): Promise<boolean> => {
    try {
      const { data, error } = await supabaseClient.rpc('enqueue_invocation', {
        p_ceremony_key: ceremonyKey,
        p_invocation_data: payload,
      });

      if (error) {
        console.error(`Failed to enqueue ceremony ${ceremonyKey}:`, error);
        return false;
      }

      console.log(`✅ Ceremony ${ceremonyKey} enqueued successfully`);
      return true;
    } catch (error) {
      console.error(`Exception enqueueing ceremony ${ceremonyKey}:`, error);
      return false;
    }
  };
}
