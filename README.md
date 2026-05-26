# Rosseland 2B – weekly plan (ukeplan) notifier

Automatically fetches the weekly plan for class **2B at Rosseland skole** and
emails it to you. Runs on GitHub Actions every Monday.

## How it works

The plan is published as a Word `.docx` linked from the class section page
(`https://www.minskole.no/rosseland/seksjon/23538`). The file name embeds the
ISO week number (e.g. `...Vekeplan-veke-22-...`) but ends in a per-week random
hash, so the URL changes every week and can't be guessed.

Each run, `scraper.py`:

1. Loads the section page and finds all `Vekeplan` `.docx` links.
2. Picks the link for the **current ISO week** (Europe/Oslo).
3. Downloads and parses that `.docx` (`python-docx`).
4. Emails a formatted summary via Gmail SMTP, flagging items like gym,
   swimming, library and homework.
5. Stores a hash of the plan in `data/state.json`. If the plan changes
   mid-week, the next run sends an updated email; if nothing changed, it stays
   quiet.

> Note: this scraper must run somewhere with internet access to `minskole.no`.
> GitHub Actions runners qualify; the Claude Code web sandbox does **not** (its
> network policy blocks that host), which is why the engine is a workflow.

## Setup

### 1. Add repository secrets
Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Required | Value |
| --- | --- | --- |
| `GMAIL_USER` | yes | The Gmail address that sends the mail |
| `GMAIL_APP_PASSWORD` | yes | A Gmail **App Password** (16 chars, no spaces) |
| `RECIPIENT` | optional | Where to send it (defaults to `thomasmoi87@gmail.com`) |
| `MINSKOLE_USER` / `MINSKOLE_PASS` | only if login is required | minskole.no credentials |

**Creating a Gmail App Password:** the Google account needs 2-Step Verification
on. Go to <https://myaccount.google.com/apppasswords>, create a password named
e.g. "ukeplan", and paste the generated 16-character value into
`GMAIL_APP_PASSWORD`.

### 2. Discovery run (confirm the page is reachable / not login-gated)
Repo → **Actions → Weekly school plan (2B) → Run workflow**, tick **dump**.
This saves the section HTML and the chosen `.docx` as downloadable artifacts and
does not send email. Use it to confirm the plan was found and parsed correctly.

### 3. Go live
The Monday schedule (`cron: "0 5 * * 1"`) only fires once this workflow file is
on the repository's **default branch**. Merge the branch, and the weekly email
starts arriving. Manual **Run workflow** works from any branch for testing.

## Running locally
```bash
pip install -r requirements.txt
python scraper.py --no-email        # fetch + parse + print, no email
python scraper.py --dump            # also save HTML + docx to debug/
python scraper.py --force           # send email even if unchanged
python scraper.py --week 23         # override the target week
```

## Adjusting
- **Send time:** edit the `cron` line in `.github/workflows/weekly-plan.yml`
  (it's UTC).
- **Highlighted keywords:** edit the `HIGHLIGHTS` map in `scraper.py`.
- GitHub disables scheduled workflows after ~60 days of repo inactivity; any
  push re-enables them.
