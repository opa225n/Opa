// Chaque erreur métier porte un code stable (cf. TRD §API) consommé par le client mobile.
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const Errors = {
  notAMember: () => new ApiError(403, "NOT_A_MEMBER", "Vous n'êtes pas membre de cette tontine."),
  notPresident: () => new ApiError(403, "NOT_PRESIDENT", "Action réservée au président."),
  notTreasurerOrPresident: () =>
    new ApiError(403, "NOT_TREASURER_OR_PRESIDENT", "Action réservée au trésorier ou au président."),
  unauthorized: () => new ApiError(401, "UNAUTHORIZED", "Authentification requise."),
  invalidOtp: () => new ApiError(400, "INVALID_OTP", "Code incorrect."),
  otpExpired: () => new ApiError(400, "OTP_EXPIRED", "Code expiré, demandez-en un nouveau."),
  otpLocked: () => new ApiError(429, "OTP_LOCKED", "Trop de tentatives, réessayez dans 15 minutes."),
  rateLimited: () => new ApiError(429, "RATE_LIMITED", "Trop de demandes, réessayez plus tard."),
  notFound: (what = "Ressource") => new ApiError(404, "NOT_FOUND", `${what} introuvable.`),
  tontineFull: () => new ApiError(409, "TONTINE_FULL", "Cette tontine a atteint son nombre maximum de membres."),
  cycleAlreadyStarted: () =>
    new ApiError(409, "CYCLE_ALREADY_STARTED", "Le cycle a déjà démarré, impossible de rejoindre directement."),
  alreadyMember: () => new ApiError(409, "ALREADY_MEMBER", "Vous êtes déjà membre de cette tontine."),
  invitationExpired: () => new ApiError(410, "INVITATION_EXPIRED", "Ce lien d'invitation a expiré."),
  invitationUsed: () => new ApiError(410, "INVITATION_USED", "Ce lien d'invitation a déjà été utilisé."),
  roundNotOpen: () => new ApiError(409, "ROUND_NOT_OPEN", "Ce tour n'est pas ouvert aux cotisations."),
  paymentAlreadyPending: () =>
    new ApiError(409, "PAYMENT_ALREADY_PENDING", "Un paiement est déjà en cours pour cette cotisation."),
  contributionAlreadyPaid: () => new ApiError(409, "CONTRIBUTION_ALREADY_PAID", "Cette cotisation est déjà payée."),
  notEnoughMembers: () => new ApiError(409, "NOT_ENOUGH_MEMBERS", "Il faut au moins 3 membres actifs pour lancer le cycle."),
  validation: (details: unknown) => new ApiError(400, "VALIDATION_ERROR", "Données invalides.", details),
  forbidden: (message = "Action non autorisée.") => new ApiError(403, "FORBIDDEN", message),
  conflict: (code: string, message: string) => new ApiError(409, code, message),
};
