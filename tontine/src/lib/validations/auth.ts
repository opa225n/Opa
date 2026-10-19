import { z } from "zod";

// Numéro international simplifié (E.164) : + suivi de 8 à 15 chiffres.
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, "Numéro invalide. Utilisez le format international, ex: +2250700000000.");

export const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Nom complet requis (2 caractères minimum)."),
  phone: phoneSchema,
  email: z.union([z.email("Adresse e-mail invalide."), z.literal("")]).optional(),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
    .max(72, "Mot de passe trop long."),
  countryCode: z.string().trim().length(2, "Pays de résidence requis.").toUpperCase(),
  acceptTerms: z.literal(true, {
    error: "Vous devez accepter les conditions d'utilisation et la politique de confidentialité.",
  }),
});

export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, "Mot de passe requis."),
});

export type SignInInput = z.infer<typeof signInSchema>;

export const requestPasswordResetSchema = z.object({
  phone: phoneSchema,
});

export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, "Lien de réinitialisation invalide."),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
    .max(72, "Mot de passe trop long."),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
