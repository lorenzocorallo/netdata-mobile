import { expect, test } from '@playwright/test'

test('stays compact and in bounds across every mobile page', async ({ page }) => {
  const browserErrors: string[] = []
  page.on('pageerror', (error) => browserErrors.push(error.message))
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Disk/ }).first()).not.toHaveText(/0 GiB/)
  await expect(page.getByText('ZFS ARC cache', { exact: true })).toBeVisible()
  await expect(page.getByText('VM / LXC memory', { exact: true })).toBeVisible()
  await expect(page.locator('nav[aria-label="Primary navigation"]').getByRole('button', { name: 'ZFS', exact: true })).toHaveCount(0)
  await expect(page.locator('header')).toHaveCount(0)
  await assertNoHorizontalOverflow(page)

  await page.getByRole('button', { name: /CPU utilization/ }).click()
  const metricDialog = page.getByRole('dialog')
  await expect(metricDialog).toBeVisible()
  await expect(page.getByRole('heading', { name: 'CPU utilization' })).toBeVisible()
  await expect(metricDialog.getByTestId('current-metric-value')).not.toHaveText('0%')
  await metricDialog.getByLabel('Time window').selectOption('3600')
  await expect(metricDialog.getByLabel('Time window')).toHaveValue('3600')
  await expect(metricDialog.getByText('Updating')).toBeHidden()
  await expect(metricDialog.getByText('60 points')).toBeVisible()
  await assertNoHorizontalOverflow(page)
  await page.screenshot({ path: 'artifacts/mobile-metric-range.png', fullPage: true })
  await page.getByRole('button', { name: 'Close metric details' }).click()

  await expect(page.getByRole('heading', { name: 'ZFS storage' })).toBeVisible()
  await expect(page.getByText('pool12/media', { exact: true })).toBeVisible()
  await expect(page.getByText('fast/custom-volume', { exact: true })).toBeVisible()
  const volumeGroup = page.locator('details').filter({ hasText: 'VM / LXC volumes' })
  await expect(volumeGroup).toBeVisible()
  await expect(volumeGroup.getByText('fast/subvol-200-disk-0', { exact: true })).toBeHidden()
  await expect(volumeGroup.locator('summary').getByText(/allocated$/)).toBeVisible()
  await expect(volumeGroup.locator('summary').getByText('logical size', { exact: true })).toBeVisible()
  await expect(volumeGroup.getByText('fast/vm-200-disk-0', { exact: true })).toBeHidden()
  await volumeGroup.locator('summary').click()
  await expect(volumeGroup.getByText('fast/vm-200-disk-0', { exact: true })).toBeVisible()
  await expect(volumeGroup.getByText('fast/subvol-200-disk-0', { exact: true })).toBeVisible()
  await expect(volumeGroup.getByText(/% allocated/)).toBeVisible()
  await expect(page.getByText('Aggregate', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Limited', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('High quota', { exact: true })).toBeVisible()
  await expect(page.getByText('Unlimited', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('thick', { exact: true })).toBeVisible()
  await expect(page.getByText('ZFS allocated', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Logical blocks', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Disk size', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('VM block volume · guest free space unavailable').first()).toBeVisible()
  await expect(page.getByText('Pool free', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Refquota', { exact: true })).toBeVisible()
  await assertNoHorizontalOverflow(page)
  await page.screenshot({ path: 'artifacts/mobile-zfs.png', fullPage: true })

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(50)
  await expect(page.locator('nav[data-compact]')).toHaveAttribute('data-compact', 'true')
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(50)
  await expect(page.locator('nav[data-compact]')).toHaveAttribute('data-compact', 'false')

  await page.getByRole('button', { name: 'Metrics' }).last().click()
  await expect(page.getByRole('heading', { name: 'Metrics' })).toBeVisible()
  await page.getByLabel('Filter metric type').selectOption('system.cpu')
  await expect(page.getByText(/loaded charts/)).toBeVisible()
  await page.getByLabel('Filter metric type').selectOption('disk.space')
  await expect(page.getByText(/4 targets/)).toBeVisible()
  await page.getByRole('button', { name: /Root filesystem/ }).click()
  await expect(page.getByLabel('Metric target')).toBeVisible()
  await page.getByLabel('Metric target').selectOption('disk_space._pool12_media')
  await expect(page.getByRole('heading', { name: 'Media dataset space' })).toBeVisible()
  await page.getByRole('button', { name: 'Close metric details' }).click()
  await assertNoHorizontalOverflow(page)


  await assertNoHorizontalOverflow(page)

  await page.getByRole('button', { name: /Alerts/ }).last().click()
  await expect(page.getByRole('heading', { name: 'Alerts' })).toBeVisible()
  await assertNoHorizontalOverflow(page)

  await page.getByRole('button', { name: /Settings/ }).last().click()
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  await expect(page.getByText('API base path')).toBeVisible()
  await assertNoHorizontalOverflow(page)
  expect(browserErrors).toEqual([])
})

async function assertNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const dimensions = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    document: document.documentElement.scrollWidth,
    viewport: window.innerWidth
  }))
  expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport)
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport)
}
