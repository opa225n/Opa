-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "refundReference" TEXT,
ADD COLUMN     "refundedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PaymentWebhookEvent" ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_providerEventId_fkey" FOREIGN KEY ("providerEventId") REFERENCES "PaymentWebhookEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
