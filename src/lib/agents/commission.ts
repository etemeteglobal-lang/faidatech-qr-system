export const MAX_COMMISSION_RATE_BPS = 10_000;

export function calculateCommissionMinor(amountMinor: number, rateBps: number): number {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) throw new RangeError("amountMinor must be a non-negative safe integer");
  if (!Number.isInteger(rateBps) || rateBps < 0 || rateBps > MAX_COMMISSION_RATE_BPS) throw new RangeError("rateBps must be between 0 and 10000");
  return Math.round((amountMinor * rateBps) / MAX_COMMISSION_RATE_BPS);
}

export function agentLeadScope(organizationId: string, role: string, agentId?: string) {
  return role === "AGENT" ? { organizationId, agentId: agentId ?? "__missing_agent__" } : { organizationId };
}
