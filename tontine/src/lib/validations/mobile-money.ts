import { z } from "zod";

export const initiateMobileMoneySchema = z.object({
  contributionId: z.string().min(1),
  providerCode: z.enum(["ORANGE_MONEY", "MTN_MOMO", "MOOV_MONEY", "WAVE"]),
  amountXof: z.coerce.number().int().positive(),
});

export type InitiateMobileMoneyInput = z.infer<typeof initiateMobileMoneySchema>;
