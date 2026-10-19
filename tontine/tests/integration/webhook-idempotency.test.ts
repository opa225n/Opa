import { describe, it, expect, afterAll } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Les prestataires Mobile Money peuvent renvoyer la même notification plusieurs fois
 * (retry réseau). L'idempotence doit être garantie au niveau base de données, pas
 * seulement en mémoire applicative.
 */
describe("Idempotence des webhooks de paiement (PaymentWebhookEvent)", () => {
  const externalEventId = "TEST-EVENT-0001";

  afterAll(async () => {
    await prisma.paymentWebhookEvent
      .deleteMany({ where: { externalEventId } })
      .catch(() => {});
  });

  it("accepte le premier événement", async () => {
    const event = await prisma.paymentWebhookEvent.create({
      data: {
        providerCode: "ORANGE_MONEY",
        externalEventId,
        rawPayload: { status: "SUCCESS" },
        signatureValid: true,
      },
    });
    expect(event.externalEventId).toBe(externalEventId);
  });

  it("rejette un doublon (même prestataire + même id d'événement externe)", async () => {
    await expect(
      prisma.paymentWebhookEvent.create({
        data: {
          providerCode: "ORANGE_MONEY",
          externalEventId,
          rawPayload: { status: "SUCCESS" },
          signatureValid: true,
        },
      })
    ).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
  });

  it("autorise le même id d'événement externe pour un prestataire différent", async () => {
    const event = await prisma.paymentWebhookEvent.create({
      data: {
        providerCode: "WAVE",
        externalEventId,
        rawPayload: { status: "SUCCESS" },
        signatureValid: true,
      },
    });
    expect(event.providerCode).toBe("WAVE");
    await prisma.paymentWebhookEvent.delete({ where: { id: event.id } });
  });
});
