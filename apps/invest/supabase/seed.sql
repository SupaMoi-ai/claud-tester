-- Seed: the real portfolio as at 2026-09-14.
--
-- Run this AFTER creating your account, in the Supabase SQL Editor. It binds
-- everything to the single existing auth user.
--
-- What this file does NOT do is invent anything. The Firi holdings have no
-- purchase history on record, so their cost basis is written as UNKNOWN rather
-- than zero, and the Otovo cost is marked ESTIMATED because it is derived
-- arithmetic, not a figure you supplied.

do $$
declare
  uid uuid;
  firi_id uuid;
  nordnet_id uuid;
  btc_id uuid;
  xrp_id uuid;
  cash_id uuid;
  otovo_id uuid;
begin
  select id into uid from auth.users order by created_at limit 1;
  if uid is null then
    raise exception 'No user found. Sign in to the app once before running the seed.';
  end if;

  -- ------------------------------------------------------------- settings
  insert into user_settings (user_id) values (uid)
  on conflict (user_id) do nothing;

  -- ------------------------------------------------------------- accounts
  insert into accounts (user_id, name, kind, provider, currency, tax_wrapper)
  values (uid, 'Firi', 'EXCHANGE', 'firi', 'NOK', 'NONE')
  on conflict (user_id, name) do nothing;
  select id into firi_id from accounts where user_id = uid and name = 'Firi';

  -- Nordnet wrapper: change to 'ASK' or 'IPS' if that is what this account is.
  -- It changes how a return should be read; the app makes no tax claims.
  insert into accounts (user_id, name, kind, provider, currency, tax_wrapper)
  values (uid, 'Nordnet', 'BROKERAGE', 'nordnet', 'NOK', 'ORDINARY')
  on conflict (user_id, name) do nothing;
  select id into nordnet_id from accounts where user_id = uid and name = 'Nordnet';

  -- ---------------------------------------------------------- instruments
  insert into instruments (user_id, kind, symbol, name, currency, qty_precision, price_precision)
  values
    (uid, 'CRYPTO', 'BTC', 'Bitcoin', 'NOK', 18, 2),
    (uid, 'CRYPTO', 'XRP', 'XRP', 'NOK', 18, 4),
    (uid, 'CASH',   'NOK', 'Norske kroner', 'NOK', 2, 2)
  on conflict do nothing;

  insert into instruments (user_id, kind, symbol, mic, isin, name, currency, country)
  values (uid, 'EQUITY', 'OTOVO', 'XOSL', 'NO0010860540', 'Otovo ASA', 'NOK', 'NO')
  on conflict do nothing;

  select id into btc_id   from instruments where user_id = uid and symbol = 'BTC';
  select id into xrp_id   from instruments where user_id = uid and symbol = 'XRP';
  select id into cash_id  from instruments where user_id = uid and symbol = 'NOK';
  select id into otovo_id from instruments where user_id = uid and symbol = 'OTOVO';

  -- ------------------------------------------------------- provider ids
  insert into instrument_provider_ids (instrument_id, user_id, provider, provider_symbol, is_primary)
  values
    (btc_id,   uid, 'firi',       'BTCNOK',   true),
    (btc_id,   uid, 'coingecko',  'bitcoin',  false),
    (xrp_id,   uid, 'firi',       'XRPNOK',   true),
    (xrp_id,   uid, 'coingecko',  'ripple',   false),
    (otovo_id, uid, 'eodhd',      'OTOVO.OL', true),
    (otovo_id, uid, 'yahoo',      'OTOVO.OL', false)
  on conflict do nothing;

  -- ---------------------------------------------------------- exposures
  insert into instrument_exposures (user_id, instrument_id, dimension, tag, weight)
  values
    (uid, btc_id,   'ASSET_CLASS', 'CRYPTO', 1),
    (uid, xrp_id,   'ASSET_CLASS', 'CRYPTO', 1),
    (uid, cash_id,  'ASSET_CLASS', 'CASH',   1),
    (uid, otovo_id, 'ASSET_CLASS', 'EQUITY', 1),
    (uid, btc_id,   'CURRENCY',    'BTC',    1),
    (uid, xrp_id,   'CURRENCY',    'XRP',    1),
    (uid, cash_id,  'CURRENCY',    'NOK',    1),
    (uid, otovo_id, 'CURRENCY',    'NOK',    1),
    (uid, otovo_id, 'GEOGRAPHY',   'Norway', 1),
    (uid, otovo_id, 'SECTOR',      'Fornybar energi', 1),
    (uid, otovo_id, 'THEME',       'Solenergi', 1)
  on conflict do nothing;

  -- --------------------------------------------------- corporate actions
  -- Otovo ASA consolidated ten shares into one, ex-date 2026-02-03. Without
  -- this row the position below reads as 80 shares and every pre-February
  -- price is wrong by a factor of ten.
  insert into corporate_actions
    (user_id, instrument_id, type, ex_date, ratio_num, ratio_den, source, note)
  values (
    uid, otovo_id, 'REVERSE_SPLIT', '2026-02-03', 1, 10, 'MANUAL',
    'Registered 2026-02-25. Holdings not divisible by 10 were rounded down with cash compensation, so the true share count may not be exactly 8.'
  )
  on conflict do nothing;

  -- ------------------------------------------------------- opening balances
  -- Firi: quantities are known exactly, cost basis is not. Recorded as UNKNOWN
  -- (price null) so the app reports "cost basis unknown" instead of implying
  -- these were acquired for nothing.
  insert into transactions
    (user_id, account_id, instrument_id, type, trade_date, quantity, price, currency,
     cost_basis_confidence, source, note)
  values
    (uid, firi_id, btc_id,  'OPENING_BALANCE', '2026-09-14', 0.01022079, null, 'NOK',
     'UNKNOWN', 'MANUAL', 'Fra Firi-skjermbilde. Kjøpshistorikk ikke registrert.'),
    (uid, firi_id, xrp_id,  'OPENING_BALANCE', '2026-09-14', 60.950208,  null, 'NOK',
     'UNKNOWN', 'MANUAL', 'Fra Firi-skjermbilde. Kjøpshistorikk ikke registrert.'),
    (uid, firi_id, cash_id, 'OPENING_BALANCE', '2026-09-14', 0.01,       1,    'NOK',
     'KNOWN',   'MANUAL', 'Kontanter på Firi.')
  on conflict do nothing;

  -- Nordnet / Otovo: entered in PRE-SPLIT terms so the corporate action above
  -- does the restating. 80 shares at 14.406 becomes 8 at 144.06.
  --
  -- Where 14.406 comes from: Nordnet displayed -92.26% at a price of 11.15, so
  -- the average cost is 11.15 / (1 - 0.9226) = 144.06 post-split, i.e. 14.406
  -- before it. That is arithmetic on a displayed percentage, not a figure from
  -- a contract note -- hence ESTIMATED. Confirm or correct it in the app.
  insert into transactions
    (user_id, account_id, instrument_id, type, trade_date, quantity, price, currency,
     cost_basis_confidence, source, note)
  values (
    uid, nordnet_id, otovo_id, 'OPENING_BALANCE', '2021-06-01', 80, 14.406, 'NOK',
    'ESTIMATED', 'DERIVED',
    'Antall og kostpris utledet fra Nordnet-skjermbilde (89 kr, 11,15 kr/aksje, -92,26%). Må bekreftes.'
  )
  on conflict do nothing;

  -- --------------------------------------------------------- last prices
  -- Manually entered, and labelled as such. Back-solved from the screenshot
  -- values: 0.01022079 x 732625.36 = 7488.01, 60.950208 x 13.1401 = 800.89.
  insert into prices (instrument_id, as_of, close, currency, source, is_split_adjusted)
  values
    (btc_id,   '2026-09-14', 732625.36, 'NOK', 'manual',   false),
    (xrp_id,   '2026-09-14', 13.1401,   'NOK', 'manual',   false),
    (cash_id,  '2026-09-14', 1,         'NOK', 'identity', false),
    (otovo_id, '2026-09-14', 11.15,     'NOK', 'manual',   true)
  on conflict do nothing;

  raise notice 'Seeded portfolio for user %. Expected total: 8 378.11 NOK (98.94%% crypto).', uid;
end $$;
