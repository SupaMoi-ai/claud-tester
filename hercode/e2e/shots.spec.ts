import { expect, test, type Page } from '@playwright/test';

/**
 * Walks the Milestone 1 demo path and saves a PNG at each stop.
 * These are screenshots for looking at, not visual assertions.
 */

const SHOTS = 'screenshots';

async function shot(page: Page, name: string): Promise<void> {
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

test.describe.configure({ mode: 'serial' });

test('walks every Milestone 1 screen', async ({ page }) => {
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

  // 10. State survives a reload.
  await page.reload();
  await expect(page.getByRole('button', { name: 'Brain', exact: true })).toBeVisible();
  await shot(page, '22-after-reload');
});
