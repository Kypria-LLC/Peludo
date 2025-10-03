// ════════════════════════════════════════════════════════════════════════════════
// 🛡️ FORGEBOT CONFIGURATION — Timeline Triggers and Ritual Chain Definitions
// ════════════════════════════════════════════════════════════════════════════════
//
// This module contains pre-configured timeline triggers and ritual chains
// that ForgeBot uses to orchestrate automated ceremonies across the Shrine.
//
// ════════════════════════════════════════════════════════════════════════════════

import type {
  TimelineTrigger,
  RitualChain,
  ChainedRitual,
} from './forgebot-core';

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ Timeline Trigger Definitions                                                 │
// └─────────────────────────────────────────────────────────────────────────────┘

export const TIMELINE_TRIGGERS: TimelineTrigger[] = [
  // Daily content generation trigger
  {
    id: 'daily-content-generation',
    name: 'Daily Content Generation',
    triggerType: 'interval',
    triggerData: {
      intervalMs: 24 * 60 * 60 * 1000, // 24 hours
    },
    ceremonyKey: 'content_generation',
    payload: {
      theme: 'daily-shrine-update',
      count: 3,
    },
    enabled: true,
  },

  // Weekly analytics report
  {
    id: 'weekly-analytics',
    name: 'Weekly Analytics Report',
    triggerType: 'interval',
    triggerData: {
      intervalMs: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
    ceremonyKey: 'analytics_generation',
    payload: {
      reportType: 'weekly',
      includeCharts: true,
    },
    enabled: true,
  },

  // Milestone: 100 sponsors achieved
  {
    id: 'milestone-100-sponsors',
    name: '100 Sponsors Milestone',
    triggerType: 'milestone',
    triggerData: {
      milestoneType: 'sponsor_count',
      threshold: 100,
      currentValue: 0, // Updated dynamically
    },
    ceremonyKey: 'milestone_celebration',
    payload: {
      milestone: '100-sponsors',
      celebrationType: 'epic',
    },
    enabled: true,
  },

  // Revenue threshold: $1000 monthly recurring
  {
    id: 'revenue-1k-milestone',
    name: '$1000 MRR Milestone',
    triggerType: 'milestone',
    triggerData: {
      milestoneType: 'revenue_threshold',
      threshold: 1000,
      currentValue: 0, // Updated dynamically
    },
    ceremonyKey: 'revenue_milestone',
    payload: {
      threshold: 1000,
      celebrationType: 'legendary',
    },
    enabled: true,
  },

  // Scheduled: First Light Anniversary (July 28, 2026)
  {
    id: 'first-light-anniversary-2026',
    name: 'First Light Anniversary 2026',
    triggerType: 'date',
    triggerData: {
      scheduledDate: new Date('2026-07-28T00:00:00Z'),
      timezone: 'UTC',
    },
    ceremonyKey: 'anniversary_celebration',
    payload: {
      anniversary: 'first-light',
      year: 2026,
    },
    enabled: true,
  },

  // Platform sync trigger - every 6 hours
  {
    id: 'platform-sync-regular',
    name: 'Regular Platform Sync',
    triggerType: 'interval',
    triggerData: {
      intervalMs: 6 * 60 * 60 * 1000, // 6 hours
    },
    ceremonyKey: 'platform_sync',
    payload: {
      platforms: ['twitter', 'discord', 'patreon'],
      syncType: 'full',
    },
    enabled: true,
  },
];

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ Ritual Chain Definitions                                                     │
// └─────────────────────────────────────────────────────────────────────────────┘

export const RITUAL_CHAINS: Record<string, RitualChain> = {
  // New sponsor onboarding chain
  'new-sponsor-onboarding': {
    id: 'new-sponsor-onboarding',
    name: 'New Sponsor Onboarding Ritual',
    description: 'Complete onboarding sequence for new sponsors',
    rituals: [
      {
        ceremonyKey: 'validate_sponsor',
        payload: {},
        waitForCompletion: true,
        onSuccess: 'assign_discord_role',
        onFailure: 'notify_admin_validation_failed',
      },
      {
        ceremonyKey: 'assign_discord_role',
        payload: {},
        waitForCompletion: true,
        delayMs: 1000,
      },
      {
        ceremonyKey: 'send_welcome_message',
        payload: {
          messageType: 'sponsor-welcome',
        },
        waitForCompletion: true,
        delayMs: 2000,
      },
      {
        ceremonyKey: 'log_sponsor_event',
        payload: {
          eventType: 'onboarding_complete',
        },
        waitForCompletion: false,
      },
    ],
    status: 'pending',
    currentStep: 0,
  },

  // Scroll pack processing chain
  'scroll-pack-drop': {
    id: 'scroll-pack-drop',
    name: 'Scroll Pack Drop Ritual',
    description: 'Complete scroll pack drop ceremony with vault unsealing',
    rituals: [
      {
        ceremonyKey: 'validate_payment',
        payload: {},
        waitForCompletion: true,
        onFailure: 'payment_validation_failed',
      },
      {
        ceremonyKey: 'unseal_vault',
        payload: {},
        waitForCompletion: true,
        delayMs: 1500,
      },
      {
        ceremonyKey: 'distribute_fragments',
        payload: {},
        waitForCompletion: true,
        delayMs: 1000,
      },
      {
        ceremonyKey: 'emit_badge',
        payload: {},
        waitForCompletion: true,
        delayMs: 500,
      },
      {
        ceremonyKey: 'celebrate_sponsor',
        payload: {},
        waitForCompletion: true,
        delayMs: 1000,
      },
      {
        ceremonyKey: 'log_scroll_pack_event',
        payload: {
          eventType: 'scroll-pack-complete',
        },
        waitForCompletion: false,
      },
    ],
    status: 'pending',
    currentStep: 0,
  },

  // Monthly analytics pipeline
  'monthly-analytics-pipeline': {
    id: 'monthly-analytics-pipeline',
    name: 'Monthly Analytics Pipeline',
    description: 'Generate and distribute monthly analytics reports',
    rituals: [
      {
        ceremonyKey: 'collect_metrics',
        payload: {
          period: 'monthly',
        },
        waitForCompletion: true,
      },
      {
        ceremonyKey: 'generate_analytics_report',
        payload: {
          reportType: 'comprehensive',
        },
        waitForCompletion: true,
        delayMs: 3000,
      },
      {
        ceremonyKey: 'create_visualizations',
        payload: {
          chartTypes: ['revenue', 'engagement', 'growth'],
        },
        waitForCompletion: true,
        delayMs: 2000,
      },
      {
        ceremonyKey: 'publish_to_discord',
        payload: {
          channel: 'analytics',
        },
        waitForCompletion: true,
        delayMs: 1000,
      },
      {
        ceremonyKey: 'archive_report',
        payload: {},
        waitForCompletion: false,
      },
    ],
    status: 'pending',
    currentStep: 0,
  },

  // Emergency notification chain
  'emergency-alert': {
    id: 'emergency-alert',
    name: 'Emergency Alert Chain',
    description: 'Critical issue notification across all channels',
    rituals: [
      {
        ceremonyKey: 'validate_emergency',
        payload: {},
        waitForCompletion: true,
        onFailure: 'log_false_alarm',
      },
      {
        ceremonyKey: 'notify_discord_admin',
        payload: {
          priority: 'critical',
        },
        waitForCompletion: false,
      },
      {
        ceremonyKey: 'notify_email_admin',
        payload: {
          priority: 'critical',
        },
        waitForCompletion: false,
      },
      {
        ceremonyKey: 'create_incident_log',
        payload: {},
        waitForCompletion: true,
      },
    ],
    status: 'pending',
    currentStep: 0,
  },

  // Platform convergence ritual
  'platform-convergence': {
    id: 'platform-convergence',
    name: 'Platform Convergence Ritual',
    description: 'Sync content and status across all platforms',
    rituals: [
      {
        ceremonyKey: 'sync_discord',
        payload: {},
        waitForCompletion: true,
      },
      {
        ceremonyKey: 'sync_twitter',
        payload: {},
        waitForCompletion: true,
        delayMs: 500,
      },
      {
        ceremonyKey: 'sync_patreon',
        payload: {},
        waitForCompletion: true,
        delayMs: 500,
      },
      {
        ceremonyKey: 'sync_github',
        payload: {},
        waitForCompletion: true,
        delayMs: 500,
      },
      {
        ceremonyKey: 'verify_sync_status',
        payload: {},
        waitForCompletion: true,
        delayMs: 1000,
      },
      {
        ceremonyKey: 'log_convergence_complete',
        payload: {},
        waitForCompletion: false,
      },
    ],
    status: 'pending',
    currentStep: 0,
  },
};

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ Configuration Helpers                                                        │
// └─────────────────────────────────────────────────────────────────────────────┘

export function getTimelineTriggerById(id: string): TimelineTrigger | undefined {
  return TIMELINE_TRIGGERS.find(trigger => trigger.id === id);
}

export function getRitualChainById(id: string): RitualChain | undefined {
  return RITUAL_CHAINS[id];
}

export function getAllActiveTimelineTriggers(): TimelineTrigger[] {
  return TIMELINE_TRIGGERS.filter(trigger => trigger.enabled);
}

export function updateMilestoneValue(
  triggerId: string,
  currentValue: number
): void {
  const trigger = TIMELINE_TRIGGERS.find(t => t.id === triggerId);
  if (trigger && trigger.triggerType === 'milestone') {
    const milestoneData = trigger.triggerData as any;
    milestoneData.currentValue = currentValue;
  }
}

// Export all configurations
export const FORGEBOT_CONFIG = {
  triggers: TIMELINE_TRIGGERS,
  chains: RITUAL_CHAINS,
  metadata: {
    version: '1.0.0',
    lastUpdated: new Date('2025-08-02T00:00:00Z'),
    canonBeat: 'ForgeBot now speaks in scroll cadence. Mutation confirmed.',
  },
};
