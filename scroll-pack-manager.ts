// scroll-pack-manager.ts

import { getSponsorByTransaction, unsealVault } from "./vault-api";
import { validateSponsor, routePayment }               from "./payment-api";
import { emitBadge, celebrateSponsor, logEvent, vaultDrop } from "./forge-utils";

type ScrollPackConfig = {
  name: string;
  launchDate: string;
  tier: string;
  badge: string;
  ritual: string;
  fragments: string[];
};

const registry: Record<string, ScrollPackConfig> = {
  "scroll-pack-i": {
    name: "Scroll Pack Drop I",
    launchDate: "2025-07-28",
    tier: "Pioneer",
    badge: "Scroll Pioneer",
    ritual: "Vault Unsealing Ceremony",
    fragments: ["glyph-ember", "sigil-thread", "myth-scroll"],
  },
};

const eventLog: Array<{
  supporter: string;
  ritual: string;
  date: string;
  fragments: string[];
  badge: string;
}> = [];

async function validateAndRoutePayment(
  sponsorId: string,
  artifactId: string
): Promise<void> {
  const verified = await validateSponsor(sponsorId);
  if (!verified) throw new Error("Sponsor validation failed.");
  await routePayment({
    sponsorId,
    artifactId,
    echoShrine: true,
    logAudit: true,
  });
}

export async function processScrollPack(
  transactionId: string,
  artifactId: keyof typeof registry
): Promise<string> {
  // 1. Resolve sponsor and payment
  const sponsor = await getSponsorByTransaction(transactionId);
  if (!sponsor) throw new Error("Sponsor not found.");
  await validateAndRoutePayment(sponsor.id, artifactId);

  // 2. Unseal vault and distribute fragments
  const fragments = await unsealVault(artifactId);
  await vaultDrop(sponsor.id, fragments);

  // 3. Canonize the sponsor
  const cfg = registry[artifactId];
  await celebrateSponsor(sponsor.id, {
    ritual: cfg.ritual,
    artifactSet: artifactId,
    canonDate: new Date(cfg.launchDate),
  });

  // 4. Emit badge and log the event
  await emitBadge(sponsor.id, cfg.badge);
  const event = {
    supporter: sponsor.username,
    ritual: cfg.ritual,
    date: new Date().toISOString(),
    fragments,
    badge: cfg.badge,
  };
  eventLog.push(event);
  logEvent("scroll-pack-drop", event);

  return `🎉 ${cfg.name} dropped for ${sponsor.username}! Legend etched.`;
}
