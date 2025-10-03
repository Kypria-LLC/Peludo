// ════════════════════════════════════════════════════════════════════════════════
// 🛡️ FORGEBOT USAGE EXAMPLES — Integration Guide
// ════════════════════════════════════════════════════════════════════════════════
//
// This file demonstrates how to integrate ForgeBot with existing systems:
// - Discord bot integration
// - Payment logging
// - Ritual chain execution
// - Timeline triggers
//
// ════════════════════════════════════════════════════════════════════════════════

import { forgebotService, createPaymentEntryFromPatreon } from './forgebot-integration';
import { forgeBot } from './forgebot-core';
import type { RitualChain } from './forgebot-core';

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ Example 1: Initialize ForgeBot with Discord Bot                             │
// └─────────────────────────────────────────────────────────────────────────────┘

export function exampleInitializeForgeBot(discordClient: any, logChannelId: string) {
  forgebotService.initialize({
    discordClient,
    logChannelId,
    startTimelineService: true,
  });

  console.log('🛡️ ForgeBot initialized and ready');
}

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ Example 2: Log Payment from Patreon Webhook                                 │
// └─────────────────────────────────────────────────────────────────────────────┘

export async function exampleLogPatreonPayment(
  transactionId: string,
  discordId: string,
  patronName: string,
  amount: number,
  tier: string
) {
  // Create payment log entry
  const paymentEntry = createPaymentEntryFromPatreon(
    transactionId,
    discordId,
    patronName,
    amount,
    tier
  );

  // Log to Discord with embed
  await forgebotService.logPayment(paymentEntry);

  console.log(`✅ Payment logged: ${patronName} - $${amount} (${tier})`);
}

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ Example 3: Execute Ritual Chain for New Sponsor                             │
// └─────────────────────────────────────────────────────────────────────────────┘

export async function exampleNewSponsorOnboarding(sponsorId: string) {
  // Execute the new sponsor onboarding ritual chain
  await forgebotService.executeChain('new-sponsor-onboarding');

  forgeBot.speakScrollCadence(
    `New sponsor onboarding complete for ${sponsorId}`
  );
}

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ Example 4: Execute Scroll Pack Drop Chain                                   │
// └─────────────────────────────────────────────────────────────────────────────┘

export async function exampleScrollPackDrop(transactionId: string) {
  forgeBot.speakScrollCadence(
    `Initiating scroll pack drop for transaction ${transactionId}`
  );

  // Execute the scroll pack drop ritual chain
  await forgebotService.executeChain('scroll-pack-drop');
}

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ Example 5: Custom Ritual Chain Definition                                   │
// └─────────────────────────────────────────────────────────────────────────────┘

export function exampleDefineCustomRitualChain(): RitualChain {
  return {
    id: 'custom-celebration',
    name: 'Custom Celebration Ritual',
    description: 'A custom ritual for special celebrations',
    rituals: [
      {
        ceremonyKey: 'generate_celebration_content',
        payload: { theme: 'legendary' },
        waitForCompletion: true,
      },
      {
        ceremonyKey: 'publish_to_discord',
        payload: { channel: 'announcements' },
        waitForCompletion: true,
        delayMs: 2000,
      },
      {
        ceremonyKey: 'publish_to_twitter',
        payload: { hashtags: ['Kypria', 'Shrine'] },
        waitForCompletion: true,
        delayMs: 1000,
      },
      {
        ceremonyKey: 'log_celebration',
        payload: {},
        waitForCompletion: false,
      },
    ],
    status: 'pending',
    currentStep: 0,
  };
}

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ Example 6: Register Custom Timeline Trigger                                 │
// └─────────────────────────────────────────────────────────────────────────────┘

export function exampleRegisterCustomTrigger() {
  const timelineManager = forgeBot.getTimelineManager();

  // Register a custom trigger for midnight content drops
  timelineManager.registerTrigger({
    id: 'midnight-content-drop',
    name: 'Midnight Content Drop',
    triggerType: 'interval',
    triggerData: {
      intervalMs: 24 * 60 * 60 * 1000, // Daily
    },
    ceremonyKey: 'content_generation',
    payload: {
      theme: 'midnight-mystery',
      count: 1,
    },
    enabled: true,
  });

  forgeBot.speakScrollCadence('Custom midnight trigger registered');
}

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ Example 7: Monitor Payment Metrics                                          │
// └─────────────────────────────────────────────────────────────────────────────┘

export function exampleGetPaymentMetrics() {
  const paymentLogger = forgeBot.getPaymentLogger();

  // Get total revenue
  const totalRevenue = paymentLogger.getTotalRevenue();
  console.log(`💰 Total Revenue: $${totalRevenue.toFixed(2)}`);

  // Get revenue by platform
  const byPlatform = paymentLogger.getRevenueByPlatform();
  console.log('📊 Revenue by Platform:', byPlatform);

  // Get recent logs
  const recentLogs = paymentLogger.getRecentLogs(5);
  console.log('📜 Recent Payments:', recentLogs);
}

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ Example 8: Update Milestone Progress                                        │
// └─────────────────────────────────────────────────────────────────────────────┘

export function exampleUpdateMilestoneProgress(
  sponsorCount: number,
  monthlyRevenue: number
) {
  const { updateMilestoneValue } = require('./forgebot-config');

  // Update sponsor count milestone
  updateMilestoneValue('milestone-100-sponsors', sponsorCount);

  // Update revenue milestone
  updateMilestoneValue('revenue-1k-milestone', monthlyRevenue);

  forgeBot.speakScrollCadence(
    `Milestone progress updated: ${sponsorCount} sponsors, $${monthlyRevenue} MRR`
  );
}

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ Example 9: Integration with Existing production_deployment.js               │
// └─────────────────────────────────────────────────────────────────────────────┘

/**
 * Enhanced version of processPatronPledge from production_deployment.js
 * that integrates ForgeBot payment logging
 */
export async function exampleEnhancedPatronPledge(
  discordClient: any,
  discordId: string,
  amount: number,
  patronName: string
) {
  try {
    const guild = await discordClient.guilds.fetch(process.env.GUILD_ID);
    const member = await guild.members.fetch(discordId);

    // Determine tier based on amount
    let tier = 'bronze';
    if (amount >= 50) tier = 'gold';
    else if (amount >= 15) tier = 'silver';

    // Assign role (existing logic)
    const ROLE_MAP: Record<string, string> = {
      bronze: process.env.PATREON_BRONZE_ROLE_ID || '',
      silver: process.env.PATREON_SILVER_ROLE_ID || '',
      gold: process.env.PATREON_GOLD_ROLE_ID || '',
    };
    const roleId = ROLE_MAP[tier];
    await member.roles.add(roleId, `Patreon pledge: $${amount}`);

    // 🛡️ ForgeBot: Log payment with rich embed
    const transactionId = `patreon-${Date.now()}-${discordId}`;
    await exampleLogPatreonPayment(
      transactionId,
      discordId,
      patronName,
      amount,
      tier
    );

    // 🛡️ ForgeBot: Execute new sponsor onboarding ritual chain
    await exampleNewSponsorOnboarding(discordId);

    forgeBot.speakScrollCadence(
      `Processed pledge: ${patronName} ($${amount}) -> ${tier} tier`
    );
  } catch (error) {
    console.error('🔴 Error processing pledge:', error);
  }
}

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ Example 10: Graceful Shutdown                                                │
// └─────────────────────────────────────────────────────────────────────────────┘

export function exampleGracefulShutdown() {
  forgeBot.speakScrollCadence('Initiating graceful shutdown...');
  
  // Stop timeline service
  forgebotService.shutdown();
  
  // Get final metrics
  const paymentLogger = forgeBot.getPaymentLogger();
  const totalRevenue = paymentLogger.getTotalRevenue();
  
  forgeBot.speakScrollCadence(
    `Shutdown complete. Total revenue processed: $${totalRevenue.toFixed(2)}`
  );
}

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ Example 11: Send Daily Summary                                               │
// └─────────────────────────────────────────────────────────────────────────────┘

export async function exampleSendDailySummary() {
  const discordIntegration = forgebotService.getDiscordIntegration();
  
  // Send 24-hour payment summary
  await discordIntegration.sendPaymentSummary(24);
  
  forgeBot.speakScrollCadence('Daily summary sent to Discord');
}

// ════════════════════════════════════════════════════════════════════════════════
// Export all examples
// ════════════════════════════════════════════════════════════════════════════════

export const FORGEBOT_EXAMPLES = {
  initializeForgeBot: exampleInitializeForgeBot,
  logPatreonPayment: exampleLogPatreonPayment,
  newSponsorOnboarding: exampleNewSponsorOnboarding,
  scrollPackDrop: exampleScrollPackDrop,
  defineCustomRitualChain: exampleDefineCustomRitualChain,
  registerCustomTrigger: exampleRegisterCustomTrigger,
  getPaymentMetrics: exampleGetPaymentMetrics,
  updateMilestoneProgress: exampleUpdateMilestoneProgress,
  enhancedPatronPledge: exampleEnhancedPatronPledge,
  gracefulShutdown: exampleGracefulShutdown,
  sendDailySummary: exampleSendDailySummary,
};
