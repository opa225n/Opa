import { z } from "zod";

export const createTontineSchema = z
  .object({
    name: z.string().trim().min(3, "Le nom doit contenir au moins 3 caractères.").max(120),
    description: z.string().trim().max(500).optional(),
    contributionAmountXof: z.coerce
      .number()
      .int("Le montant doit être un nombre entier de FCFA.")
      .positive("Le montant doit être supérieur à zéro."),
    frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "CUSTOM_WEEKLY"]),
    customWeekdays: z.array(z.coerce.number().int().min(0).max(6)).max(7).optional().default([]),
    startDate: z.coerce.date(),
    feeAmountXof: z.coerce.number().int().min(0).default(0),
    latePenaltyAmountXof: z.coerce.number().int().min(0).default(0),
    latePenaltyGraceDays: z.coerce.number().int().min(0).default(0),
    beneficiarySelectionMode: z.enum(["FIXED", "VOTE"]).default("FIXED"),
  })
  .refine((data) => data.frequency !== "CUSTOM_WEEKLY" || data.customWeekdays.length > 0, {
    message: "Sélectionnez au moins un jour de la semaine pour la fréquence personnalisée.",
    path: ["customWeekdays"],
  });

export type CreateTontineInput = z.infer<typeof createTontineSchema>;

export const inviteMemberSchema = z.object({
  tontineId: z.string().min(1),
  phone: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{7,14}$/, "Numéro invalide (format international, ex: +2250700000000).")
    .optional()
    .or(z.literal("")),
  role: z.enum(["MEMBRE", "TRESORIER", "SECRETAIRE", "RESPONSABLE"]).default("MEMBRE"),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const recordPaymentSchema = z.object({
  contributionId: z.string().min(1),
  amountXof: z.coerce.number().int().positive("Le montant doit être supérieur à zéro."),
  method: z.enum(["CASH", "BANK_TRANSFER", "MOBILE_MONEY"]),
  paidAt: z.coerce.date(),
  transactionRef: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(500).optional(),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
