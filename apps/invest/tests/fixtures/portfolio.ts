import { dec } from '@/domain/money'
import type { CorporateAction, Instrument, Transaction } from '@/domain/types'
import type { FxRecord, PriceRecord } from '@/domain/valuation/pricebook'

/**
 * The real portfolio, as at 2026-09-14.
 *
 * These are the actual figures from the Firi and Nordnet screenshots, and they
 * are the regression net for the whole calculation layer: if the total below
 * ever changes without a deliberate reason, something in the valuation path
 * broke.
 *
 * Firi    BTC   0.01022079  ->  7 488.01 NOK
 * Firi    XRP  60.950208    ->    800.89 NOK
 * Firi    NOK   0.01        ->      0.01 NOK
 * Nordnet OTOVO 8           ->     89.20 NOK  (post 10-for-1 reverse split)
 *                              ------------
 *                                8 378.11 NOK
 *
 * Note the Otovo line: Nordnet *displays* 89 kr, but 8 x 11.15 is 89.20. The
 * screenshot figure is a rounded presentation, not the underlying value, and
 * the engine computes from quantity x price rather than trusting the display.
 */

export const AS_OF = '2026-09-14'

export const ACCOUNT_FIRI = 'acct-firi'
export const ACCOUNT_NORDNET = 'acct-nordnet'

export const INSTRUMENTS: Record<string, Instrument> = {
  btc: { id: 'btc', kind: 'CRYPTO', symbol: 'BTC', name: 'Bitcoin', currency: 'NOK' },
  xrp: { id: 'xrp', kind: 'CRYPTO', symbol: 'XRP', name: 'XRP', currency: 'NOK' },
  nok: { id: 'nok', kind: 'CASH', symbol: 'NOK', name: 'Norske kroner', currency: 'NOK' },
  otovo: {
    id: 'otovo',
    kind: 'EQUITY',
    symbol: 'OTOVO',
    name: 'Otovo ASA',
    currency: 'NOK',
    mic: 'XOSL',
    isin: 'NO0010860540',
  },
}

/**
 * Otovo ASA consolidated ten shares into one, ex-date 2026-02-03.
 *
 * Every Otovo quantity recorded before that date is a tenth of itself today,
 * and every price before it is ten times larger in present-day terms.
 */
export const OTOVO_REVERSE_SPLIT: CorporateAction = {
  id: 'ca-otovo-2026-02-03',
  instrumentId: 'otovo',
  type: 'REVERSE_SPLIT',
  exDate: '2026-02-03',
  ratioNum: dec(1),
  ratioDen: dec(10),
}

/**
 * Opening balances. Firi holdings have no purchase history on record, so their
 * cost basis is deliberately absent rather than invented.
 *
 * Otovo is the one position with a derived cost: the displayed -92.26% return
 * at a price of 11.15 implies 11.15 / (1 - 0.9226) = 144.06 NOK per share
 * post-split. Entered as 80 shares at 14.406 pre-split, which the reverse
 * split restates to 8 shares at 144.06 -- so the derivation is exercised by
 * the engine rather than hard-coded. Flagged unconfirmed in the database.
 */
export const TRANSACTIONS: Transaction[] = [
  {
    id: 'txn-btc-open',
    accountId: ACCOUNT_FIRI,
    instrumentId: 'btc',
    type: 'OPENING_BALANCE',
    tradeDate: '2026-09-14',
    quantity: dec('0.01022079'),
    price: null,
    fee: dec(0),
    currency: 'NOK',
    fxRateToNok: null,
  },
  {
    id: 'txn-xrp-open',
    accountId: ACCOUNT_FIRI,
    instrumentId: 'xrp',
    type: 'OPENING_BALANCE',
    tradeDate: '2026-09-14',
    quantity: dec('60.950208'),
    price: null,
    fee: dec(0),
    currency: 'NOK',
    fxRateToNok: null,
  },
  {
    id: 'txn-nok-open',
    accountId: ACCOUNT_FIRI,
    instrumentId: 'nok',
    type: 'OPENING_BALANCE',
    tradeDate: '2026-09-14',
    quantity: dec('0.01'),
    price: dec(1),
    fee: dec(0),
    currency: 'NOK',
    fxRateToNok: null,
  },
  {
    id: 'txn-otovo-open',
    accountId: ACCOUNT_NORDNET,
    instrumentId: 'otovo',
    type: 'OPENING_BALANCE',
    tradeDate: '2021-06-01',
    quantity: dec(80),
    price: dec('14.406'),
    fee: dec(0),
    currency: 'NOK',
    fxRateToNok: null,
  },
]

export const CORPORATE_ACTIONS: CorporateAction[] = [OTOVO_REVERSE_SPLIT]

/**
 * Last recorded prices, at realistic quote precision.
 *
 * Firi reports a position's value rather than a unit price, so the BTC and XRP
 * prices here are back-solved from the screenshot values and then rounded to
 * the precision a venue would actually quote. Both reproduce the screenshot
 * figures to the øre.
 */
export const PRICES: PriceRecord[] = [
  // 0.01022079 x 732 625.36 = 7 488.01 NOK
  { instrumentId: 'btc', asOf: AS_OF, price: dec('732625.36'), currency: 'NOK', source: 'manual' },
  // 60.950208 x 13.1401 = 800.89 NOK
  { instrumentId: 'xrp', asOf: AS_OF, price: dec('13.1401'), currency: 'NOK', source: 'manual' },
  { instrumentId: 'nok', asOf: AS_OF, price: dec(1), currency: 'NOK', source: 'identity' },
  { instrumentId: 'otovo', asOf: AS_OF, price: dec('11.15'), currency: 'NOK', source: 'manual' },
]

export const FX: FxRecord[] = [
  { base: 'USD', quote: 'NOK', asOf: AS_OF, rate: dec('10.42'), source: 'norgesbank' },
  { base: 'EUR', quote: 'NOK', asOf: AS_OF, rate: dec('11.68'), source: 'norgesbank' },
]
