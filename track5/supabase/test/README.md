# Database tests

`schema.sql` is the entire security boundary for Track 5. The anon key ships in
a public static file, so anyone can call the database directly with a
handwritten script — nothing in the browser code protects anything. These tests
exist because that claim needs proving rather than asserting.

They run against a plain PostgreSQL instance with no Supabase involved.

## Running them

```sh
# from a directory PostgreSQL's own user can read
initdb -D ./pgdata -U track5 --auth=trust
pg_ctl -D ./pgdata -o "-k /tmp/pgsock -p 5439" -l pg.log start

psql -h /tmp/pgsock -p 5439 -U track5 -d postgres -f 00-bootstrap.sql
psql -h /tmp/pgsock -p 5439 -U track5 -d postgres -f ../schema.sql
psql -h /tmp/pgsock -p 5439 -U track5 -d postgres -f 01-security.sql
```

`00-bootstrap.sql` supplies the small parts of Supabase the schema depends on:
an `auth.users` table, an `auth.uid()` that resolves from a session variable so
a test can switch identity mid-script, and the `anon` and `authenticated` roles.

## Reading the output

**Every `ERROR:` line in a passing run is a refusal that was supposed to
happen.** A clean run produces exactly these ten and nothing else:

```
ALREADY ANSWERED
BOTH SIGNAL SLOTS IN USE — WAIT FOR CONFIRMATION OR EXPIRY
CANNOT CONFIRM YOUR OWN SIGNAL
NOT ENOUGH XP
SLOW DOWN
XP IS AWARDED BY THE SYSTEM, NOT SET DIRECTLY
new row violates row-level security policy for table "confirmations"
new row violates row-level security policy for table "reports"
new row violates row-level security policy for table "user_cosmetics"
new row violates row-level security policy for table "xp_events"
```

Any other error is a regression.

Note that `01-security.sql` first grants full table privileges to `anon` and
`authenticated`. That is deliberate: Supabase grants them by default, and if a
write were blocked merely by a missing `GRANT` the test would prove nothing
about row-level security. The grants go in, and RLS still says no.

## What is covered

- profiles and notification preferences are created automatically on sign-up
- XP cannot be forged: direct inserts into `xp_events` and direct updates of
  `profiles.xp` are both refused
- reports and confirmations cannot be written directly, only through the RPCs
- a user cannot confirm their own report, or vote twice on the same one
- two ordinary confirmations reach CONFIRMED, and the reporter is paid for it
- the two-unconfirmed-signal cap holds, and a slot frees on confirmation and
  on expiry
- expired signals leave `active_signals` with no cron job involved
- one user cannot read another's XP ledger
- crews are invisible until you join with a code, then the roster appears
- chat is rate limited server-side
- cosmetics cannot be granted to yourself, and cannot be bought without the XP

## What these tests deliberately do NOT prove

The database cannot verify where anybody physically is. GPS is self-reported
and a determined client will lie about it. Proximity therefore only ever raises
a vote's weight here, never lowers it, and the full-weight-plus path depends on
saved journeys, which the server can actually see.

The real defences against a coordinated group are the ones tested above — no
self-voting, one vote per person, the signal cap, the cooldown, and rate limits
— plus the fact that reputation has to be earned. None of that stops a
determined person creating several anonymous accounts, and anonymous sign-in
makes that cheap. That is a known and accepted trade for having no signup wall,
not something this schema solves.
