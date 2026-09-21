import { expect, test, type Page } from '@playwright/test';

/**
 * Walks the demo path and saves a PNG at each stop.
 * These are screenshots for looking at, not visual assertions.
 */

const SHOTS = 'screenshots';

async function shot(page: Page, name: string): Promise<void> {
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

test.describe.configure({ mode: 'serial' });

test('walks every screen', async ({ page }) => {
  await page.goto('/');

  // 1. Onboarding, step 1.
  await expect(page.getByText('What would you like help with?')).toBeVisible();
  await shot(page, '01-onboarding-help');

  await page.getByRole('button', { name: 'starting tasks' }).click();
  await page.getByRole('button', { name: 'overwhelm', exact: true }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await shot(page, '02-onboarding-overwhelm');

  await page.getByRole('button', { name: 'I freeze' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await shot(page, '03-onboarding-cycle');

  await page.getByRole('button', { name: 'Next' }).click();
  await shot(page, '04-onboarding-partner');

  await page.getByRole('button', { name: 'Next' }).click();
  await shot(page, '05-onboarding-name');

  await page.getByRole('button', { name: 'Start' }).click();

  // 2. Morning check-in.
  await expect(page.getByText('How are you arriving today?')).toBeVisible();
  await shot(page, '06-check-in');

  await page.getByRole('radio', { name: 'Good' }).click();
  await page.getByRole('button', { name: 'Sharp' }).click();
  await page.getByRole('button', { name: 'calm' }).click();
  await shot(page, '07-check-in-filled');

  await page.getByRole('button', { name: 'Done' }).click();

  // 3. Today at normal capacity.
  await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening), Mia/ }))
    .toBeVisible();
  await shot(page, '08-today-normal');

  // 4. Complete a task.
  await page.getByRole('button', { name: 'Complete: Buy shampoo' }).click();
  await shot(page, '09-today-task-complete');

  // 5. Everything else, expanded.
  await page.getByRole('button', { name: /Everything else/ }).click();
  await shot(page, '10-today-everything-else');
  await page.getByRole('button', { name: /Everything else/ }).click();

  // 6. "I'm overwhelmed" -> bare minimum.
  await page.getByRole('button', { name: "I'm overwhelmed" }).click();
  await expect(page.getByText('How much can you handle right now?')).toBeVisible();
  await shot(page, '11-overwhelm-sheet');

  await page.getByRole('radio', { name: /Bare minimum/ }).click();
  await expect(page.getByText('Everything else can move.')).toBeVisible();
  await shot(page, '12-today-bare-minimum');

  // Back to normal so the rest of the walk has a full plan.
  await page.getByRole('button', { name: "I'm overwhelmed" }).click();
  await page.getByRole('radio', { name: /^Normal/ }).click();

  // 7. Floating AI helper.
  await page.getByRole('button', { name: 'Ask HerCode' }).first().click();
  await shot(page, '13-ai-prompts');

  await page.getByRole('button', { name: 'What should I do first?' }).click();
  await page.waitForTimeout(1100);
  await shot(page, '14-ai-what-first');
  await page.keyboard.press('Escape');

  // 8. "I can't start" on Clean kitchen.
  await page.getByRole('button', { name: /Everything else/ }).click();
  await page.getByRole('button', { name: /^Clean kitchen/ }).click();
  await page.getByRole('button', { name: "I can't start" }).click();
  await page.waitForTimeout(1100);
  await expect(page.getByText('Put cups and plates in the dishwasher')).toBeVisible();
  await shot(page, '15-ai-breakdown');

  await page.getByRole('button', { name: 'Give me 5-minute version' }).click();
  await page.waitForTimeout(1100);
  await shot(page, '16-ai-five-minute');

  await page.getByRole('button', { name: 'Keep these steps' }).click();
  await shot(page, '17-today-with-steps');

  // 9. Brain capture.
  await page.getByRole('button', { name: 'Brain', exact: true }).click();
  await shot(page, '18-brain-empty-input');

  await page.getByRole('button', { name: 'Speak instead' }).click();
  await page.waitForTimeout(900);
  await shot(page, '19-brain-dictated');

  await page.getByRole('button', { name: 'Empty my head' }).click();
  await page.waitForTimeout(1200);
  await expect(page.getByText('Here is what I heard')).toBeVisible();
  await shot(page, '20-brain-categorised');

  await page.getByRole('button', { name: 'Looks right' }).click();
  await shot(page, '21-brain-sections');

  // 10. Patterns, computed from the seeded history.
  await page.getByRole('button', { name: 'Patterns', exact: true }).click();
  await expect(page.getByText('HerCode noticed a possible pattern.').first()).toBeVisible();
  await shot(page, '22-patterns');

  await page.getByRole('button', { name: 'Why am I seeing this?' }).first().click();
  await shot(page, '23-patterns-evidence');
  await page.getByRole('button', { name: 'Hide the data' }).click();

  await page.getByRole('button', { name: /Why am I seeing this/ }).nth(1).click();
  await shot(page, '24-patterns-evidence-calls');

  // 11. Me.
  await page.getByRole('button', { name: 'Me', exact: true }).click();
  await shot(page, '25-me');

  // 12. BroCode before she has shared anything.
  await page.getByRole('button', { name: /Partner & BroCode/ }).click();
  await shot(page, '26-partner-setup');

  await page.getByRole('button', { name: 'Open BroCode preview' }).click();
  await expect(page.getByText('Mia has not shared anything today.')).toBeVisible();
  await shot(page, '27-brocode-empty');

  // 13. One toggle, and the preview fills in.
  await page.getByRole('button', { name: 'Manage sharing' }).click();
  await page.getByRole('switch', { name: /Household jobs/ }).click();
  await page.getByRole('button', { name: /^Low capacity/ }).click();
  await shot(page, '28-partner-shared');

  await page.getByRole('button', { name: 'Open BroCode preview' }).click();
  await expect(page.getByText('Things you can take over')).toBeVisible();
  await shot(page, '29-brocode-shared');

  // 14. The cycle toggle asks first.
  await page.getByRole('button', { name: 'Manage sharing' }).click();
  await page.getByRole('switch', { name: /Exact cycle detail/ }).click();
  await expect(page.getByText('Share your exact cycle day?')).toBeVisible();
  await shot(page, '30-cycle-confirm');
  await page.getByRole('button', { name: 'Cancel' }).click();

  // 15. Decision load.
  await page.getByRole('button', { name: 'Back' }).click();
  await page.getByRole('button', { name: /Decision load/ }).click();
  await shot(page, '31-decision-load');
  // Rows are collapsed to the rule she picked; open one and change it.
  await page.getByRole('button', { name: /^Cleaning/ }).click();
  await page.getByRole('button', { name: 'Ask me first', exact: true }).click();
  await shot(page, '32-decision-load-edited');

  // 16. Privacy overview.
  await page.getByRole('button', { name: 'Back' }).click();
  await page.getByRole('button', { name: /Privacy overview/ }).click();
  await shot(page, '33-privacy-overview');

  // 17. State survives a reload.
  await page.reload();
  await expect(page.getByRole('button', { name: 'Brain', exact: true })).toBeVisible();
  await shot(page, '34-after-reload');
});
