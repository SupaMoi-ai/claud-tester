import { MoneySplit } from "@/lib/supabase/types";

export interface AmountSplit {
  mamma: number;
  pappa: number;
}

/**
 * Splits a whole-kroner NOK amount between the two homes.
 * For "50/50" with an odd amount, the extra krone goes to mamma — an
 * arbitrary but fixed, documented tie-break so the split is always
 * deterministic and sums exactly back to the original amount.
 */
export function splitAmount(amountNok: number, split: MoneySplit): AmountSplit {
  if (split === "mamma") {
    return { mamma: amountNok, pappa: 0 };
  }
  if (split === "pappa") {
    return { mamma: 0, pappa: amountNok };
  }
  const half = Math.floor(amountNok / 2);
  const remainder = amountNok - half * 2;
  return { mamma: half + remainder, pappa: half };
}
