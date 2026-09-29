import { DomainError, DomainErrorCode } from "@/lib/errors"

export type PriceQuote = {
  unitPricePaisa: number
  unitDepositPaisa: number
  units: number
  totalPaisa: number
  depositPaisa: number
  balancePaisa: number
}

export function quoteUnits(pricePaisa: number, depositPaisa: number, units: number): PriceQuote {
  if (!Number.isInteger(pricePaisa) || pricePaisa < 0) {
    throw new DomainError(DomainErrorCode.PRICE_INVALID, "Departure price must be a non-negative integer in paise")
  }
  if (!Number.isInteger(depositPaisa) || depositPaisa < 0 || depositPaisa > pricePaisa) {
    throw new DomainError(DomainErrorCode.PRICE_INVALID, "Deposit must be an integer paise amount within the unit price")
  }
  if (!Number.isInteger(units) || units < 1) {
    throw new DomainError(DomainErrorCode.INVALID_PARTY, "Party size must be at least one seat or rider slot")
  }
  if (pricePaisa > Math.floor(Number.MAX_SAFE_INTEGER / units)) {
    throw new DomainError(DomainErrorCode.PRICE_INVALID, "Quoted total exceeds a safe integer")
  }

  const totalPaisa = pricePaisa * units
  const depositTotal = depositPaisa * units
  return {
    unitPricePaisa: pricePaisa,
    unitDepositPaisa: depositPaisa,
    units,
    totalPaisa,
    depositPaisa: depositTotal,
    balancePaisa: totalPaisa - depositTotal,
  }
}

export function formatInrFromPaisa(paisa: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(paisa / 100)
}
