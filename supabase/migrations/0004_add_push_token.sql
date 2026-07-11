-- Added for push notifications (build step 8) — not in the original spec's
-- schema, needed so a member's device can be targeted for reminders.
alter table members add column push_token text;
