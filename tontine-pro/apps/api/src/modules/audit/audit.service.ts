import type { Prisma } from "@prisma/client";
import { prisma } from "../../common/prisma";

// Journal en écriture seule (cf. TRD : REVOKE UPDATE/DELETE sur audit_log). Jamais modifié ni supprimé par l'app.
export async function recordAudit(
  tontineId: string | null,
  actorId: string | null,
  action: string,
  details: Record<string, unknown> = {},
) {
  await prisma.auditLog.create({ data: { tontineId, actorId, action, details: details as Prisma.InputJsonValue } });
}
