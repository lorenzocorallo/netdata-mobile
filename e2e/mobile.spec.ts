import { expect, test } from '@playwright/test'

test('works as a mobile Netdata dashboard without horizontal overflow', async ({ page }) => {
  const browserErrors: string[] = []
  page.on('pageerror', (error) => browserErrors.push(error.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening)/ })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Primary navigation' }).last()).toBeVisible()
  await page.locator('.chart-compact').first().scrollIntoViewIfNeeded()
  await expect(page.locator('.chart-compact svg').first()).toBeVisible()

  const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }))
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth)

  await page.getByRole('button', { name: /CPU utilization/ }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'CPU utilization' })).toBeVisible()
  await page.getByRole('button', { name: 'Close metric details' }).click()

  await page.getByRole('button', { name: 'Search metrics' }).click()
  const searchDialog = page.getByRole('dialog', { name: 'Search metrics' })
  await searchDialog.getByRole('textbox').fill('memory')
  await expect(searchDialog.getByRole('button', { name: /Memory used/ })).toBeVisible()
  await page.getByRole('button', { name: 'Close search' }).click()

  await page.getByRole('button', { name: /Metrics/ }).last().click()
  await expect(page.getByRole('heading', { name: 'Metrics' })).toBeVisible()
  await page.getByRole('textbox', { name: 'Search metrics' }).fill('zfs')
  await expect(page.getByText(/charts$/)).toBeVisible()

  await page.getByRole('button', { name: /Alerts/ }).last().click()
  await expect(page.getByRole('heading', { name: 'Alerts' })).toBeVisible()
  await expect(page.getByText('Disk Space Usage')).toBeVisible()

  await page.getByRole('button', { name: /Settings/ }).last().click()
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  await expect(page.getByText('API base path')).toBeVisible()

  expect(browserErrors).toEqual([])
  await page.screenshot({ path: 'artifacts/mobile-settings.png', fullPage: true })
})
