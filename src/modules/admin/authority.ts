import type { Actor, Assignment } from "@/modules/identity/policy";

// Identity control must not outlive the administrator's own authority.
// Past time is irrelevant: cover the target's remaining active or future interval.
export function authorityForRemainingValidity(actor: Actor, target: Pick<Assignment, "validFrom" | "validUntil">, now: Date): Actor {
  const current = now.getTime();
  const targetStart = target.validFrom?.getTime() ?? -Infinity;
  const targetEnd = target.validUntil?.getTime() ?? Infinity;
  if (!Number.isFinite(current) || !(targetStart < targetEnd)) return { ...actor, assignments: [] };
  if (targetEnd <= current) return actor;
  const effectiveStart = Math.max(current, targetStart);
  return { ...actor, assignments: actor.assignments.filter((assignment) => {
    const start = assignment.validFrom?.getTime() ?? -Infinity;
    const end = assignment.validUntil?.getTime() ?? Infinity;
    return start < end && start <= effectiveStart && end >= targetEnd;
  }) };
}
