import "server-only";
import type { PaymentProviderCode } from "@prisma/client";
import type { MobileMoneyAdapter } from "./types";
import { orangeMoneyAdapter } from "./providers/orange-money";
import { mtnMomoAdapter } from "./providers/mtn-momo";
import { moovMoneyAdapter } from "./providers/moov-money";
import { waveAdapter } from "./providers/wave";

const ADAPTERS: Record<PaymentProviderCode, MobileMoneyAdapter> = {
  ORANGE_MONEY: orangeMoneyAdapter,
  MTN_MOMO: mtnMomoAdapter,
  MOOV_MONEY: moovMoneyAdapter,
  WAVE: waveAdapter,
};

export function getAdapter(code: PaymentProviderCode): MobileMoneyAdapter {
  return ADAPTERS[code];
}

export function isProviderConfigured(code: PaymentProviderCode): boolean {
  return ADAPTERS[code].isConfigured();
}

export function getProviderLabel(code: PaymentProviderCode): string {
  return ADAPTERS[code].label;
}

export function listProviders(): MobileMoneyAdapter[] {
  return Object.values(ADAPTERS);
}
