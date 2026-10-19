import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Séparé de rbac.ts volontairement : ce module ne doit dépendre que de Prisma, jamais de
 * next-auth (qui importe next/server). Des contextes sans requête HTTP — traitement de
 * webhooks, scripts, tests — doivent pouvoir écrire dans le journal d'audit sans jamais
 * tirer next-auth dans leur chaîne d'imports.
 */
export async function writeAuditLog(params: {
  tontineId?: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      tontineId: params.tontineId,
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}
