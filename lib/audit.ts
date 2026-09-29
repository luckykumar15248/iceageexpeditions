import { type AuditAction, type Prisma } from "@/app/generated/prisma/client"
import type { DbClient } from "@/lib/db"
import { DomainError, DomainErrorCode } from "@/lib/errors"

export async function writeAudit(
  db: DbClient,
  entry: {
    actorStaffId?: string | null
    action: AuditAction
    entityType: string
    entityId: string
    reason: string
    before?: Prisma.InputJsonValue
    after?: Prisma.InputJsonValue
  },
): Promise<void> {
  const reason = entry.reason.trim()
  if (reason.length < 3 || reason.length > 500) {
    throw new DomainError(DomainErrorCode.REASON_REQUIRED, "Audit reason must be between 3 and 500 characters")
  }

  await db.auditLog.create({
    data: {
      actorStaffId: entry.actorStaffId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      reason,
      before: entry.before,
      after: entry.after,
    },
  })
}
