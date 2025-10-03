// scroll-pack-drop.ts
import { emitBadge, logEvent, celebrateSponsor, vaultDrop } from "./forge-utils";
import { getSponsorByTransaction, unsealVault } from "./vault-api";

export async function launchScrollPackDrop(transactionId: string) {
  const sponsor = await getSponsorByTransaction(transactionId);
  if (!sponsor) throw new Error("No sponsor found. Mutation aborted.");

  // 1. Unseal and mutate scroll fragments
  const fragments = await unsealVault("scroll-pack-i");
  await vaultDrop(sponsor.id, fragments);

  // 2. Canonize supporter
  await celebrateSponsor(sponsor.id, {
    ritual: "Scroll Pack Drop I",
    artifactSet: "scroll-pack-i",
    canonDate: new Date("2025-07-28"),
  });

  // 3. Emit badge with shrine echo
  await emitBadge(sponsor.id, "Scroll Pioneer");
  logEvent("scroll-pack-drop", {
    supporter: sponsor.username,
    fragments,
    badge: "Scroll Pioneer",
    date: Date.now(),
  });

  return `Scroll Drop complete for ${sponsor.username}. Legend etched.`;
}
