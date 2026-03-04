// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Characters View', () => {

  /** Login + Demo Proje yükle → appRoot açılsın */
  async function setupApp(page) {
    await page.goto('http://localhost:8080/public/index.html', { waitUntil: 'networkidle' });

    await page.waitForFunction(() => {
      const lm = document.getElementById('loadMsg');
      return lm && lm.style.display === 'none';
    }, { timeout: 15000 });

    const authVisible = await page.evaluate(() => {
      const el = document.getElementById('authScreen');
      return el && el.style.display !== 'none';
    });

    if (authVisible) {
      console.log('Auth screen visible, logging in...');
      await page.fill('#loginEmail', 'testuser1_sync@test.com');
      await page.fill('#loginPass', 'Test123456!');
      await page.click('#authLoginForm button.btn-p');
      await page.waitForFunction(() => {
        const ps = document.getElementById('projectsScreen');
        return ps && ps.style.display !== 'none';
      }, { timeout: 15000 });
    }

    // Demo Proje yükle
    const demoBtn = page.locator('#projectsScreen button', { hasText: 'Demo Proje' });
    await expect(demoBtn).toBeVisible({ timeout: 10000 });
    await demoBtn.click();

    await page.waitForFunction(() => {
      const ar = document.getElementById('appRoot');
      return ar && ar.style.display !== 'none';
    }, { timeout: 15000 });

    // Render stabilize
    await page.waitForTimeout(1000);
  }

  test('Karakterler butonu görünmeli ve view açılmalı', async ({ page }) => {
    test.setTimeout(60_000);
    await setupApp(page);

    // Karakterler butonunu bul
    const btn = page.locator('button.view-mode[data-vm="karakterler"]');
    await expect(btn).toBeVisible({ timeout: 5000 });

    // Tıkla
    await btn.click();
    await page.waitForTimeout(500);

    // body.karakterler-active olmalı
    const hasClass = await page.evaluate(() => document.body.classList.contains('karakterler-active'));
    expect(hasClass).toBe(true);

    // Karakter kartları grid mevcut
    const grid = page.locator('.char-cards-grid');
    await expect(grid).toBeVisible({ timeout: 3000 });

    // En az 1 kart olmalı
    const cardCount = await page.locator('.char-card').count();
    console.log(`Karakter kart sayısı: ${cardCount}`);
    expect(cardCount).toBeGreaterThan(0);
  });

  test('Kartlarda doğru istatistikler görünmeli', async ({ page }) => {
    test.setTimeout(60_000);
    await setupApp(page);

    await page.click('button.view-mode[data-vm="karakterler"]');
    await page.waitForTimeout(500);

    // İlk kartın stats alanı
    const firstCard = page.locator('.char-card').first();
    await expect(firstCard).toBeVisible();

    // Stats span'ları mevcut (sahne, süre, kelime)
    const statsSpans = firstCard.locator('.char-card-stats span');
    const count = await statsSpans.count();
    expect(count).toBe(3); // sahne, süre, kelime

    // "sahne" kelimesi içermeli
    const firstStat = await statsSpans.nth(0).textContent();
    expect(firstStat).toContain('sahne');
  });

  test('Arama çalışmalı', async ({ page }) => {
    test.setTimeout(60_000);
    await setupApp(page);

    await page.click('button.view-mode[data-vm="karakterler"]');
    await page.waitForTimeout(500);

    const initialCount = await page.locator('.char-card').count();
    console.log(`Başlangıç kart: ${initialCount}`);

    // "Sakal" ara
    await page.fill('.char-search', 'Sakal');
    await page.waitForTimeout(300);

    const filteredCount = await page.locator('.char-card').count();
    console.log(`Filtrelenmiş kart: ${filteredCount}`);
    expect(filteredCount).toBeLessThan(initialCount);
    expect(filteredCount).toBeGreaterThan(0);

    // Temizle
    await page.fill('.char-search', '');
    await page.waitForTimeout(300);
    const resetCount = await page.locator('.char-card').count();
    expect(resetCount).toBe(initialCount);
  });

  test('Bar chart\'lar sıralı görünmeli', async ({ page }) => {
    test.setTimeout(60_000);
    await setupApp(page);

    await page.click('button.view-mode[data-vm="karakterler"]');
    await page.waitForTimeout(500);

    // Ekran süresi chart satırları
    const chartRows = page.locator('.char-chart-row');
    const rowCount = await chartRows.count();
    console.log(`Chart satır sayısı: ${rowCount}`);
    expect(rowCount).toBeGreaterThan(0);

    // İlk bar %100 olmalı (en yüksek)
    const firstBar = chartRows.first().locator('.char-chart-bar');
    const width = await firstBar.evaluate(el => el.style.width);
    expect(width).toBe('100%');
  });

  test('Heatmap mevcut', async ({ page }) => {
    test.setTimeout(60_000);
    await setupApp(page);

    await page.click('button.view-mode[data-vm="karakterler"]');
    await page.waitForTimeout(500);

    // SVG heatmap container
    const heatmap = page.locator('.char-heatmap-container');
    await expect(heatmap).toBeVisible({ timeout: 3000 });

    // İçinde SVG olmalı
    const svg = heatmap.locator('svg');
    await expect(svg).toBeVisible();

    // rect elementleri olmalı (matrix hücreleri)
    const rectCount = await svg.locator('rect').count();
    console.log(`Heatmap rect sayısı: ${rectCount}`);
    expect(rectCount).toBeGreaterThan(10);
  });

  test('Karta tıkla → sağ panel açılmalı, düzenleme ve kaydet', async ({ page }) => {
    test.setTimeout(60_000);
    await setupApp(page);

    await page.click('button.view-mode[data-vm="karakterler"]');
    await page.waitForTimeout(500);

    // İlk karta tıkla
    const firstCard = page.locator('.char-card').first();
    await firstCard.click();
    await page.waitForTimeout(500);

    // rPanel açık olmalı
    const rPanelOpen = await page.evaluate(() => document.getElementById('rPanel').classList.contains('open'));
    expect(rPanelOpen).toBe(true);

    // Karakter Detayı başlığı
    const detailTitle = page.locator('#rPanel h3', { hasText: 'Karakter Detayı' });
    await expect(detailTitle).toBeVisible();

    // İsim input mevcut ve dolu
    const nameInput = page.locator('#charDetailName');
    await expect(nameInput).toBeVisible();
    const nameValue = await nameInput.inputValue();
    expect(nameValue.length).toBeGreaterThan(0);
    console.log(`Seçilen karakter: ${nameValue}`);

    // İsmi değiştir ve kaydet
    await nameInput.fill(nameValue + ' TEST');
    await page.click('#rPanel button.btn-p'); // Kaydet
    await page.waitForTimeout(500);

    // Geri al
    await nameInput.fill(nameValue);
    await page.click('#rPanel button.btn-p');
    await page.waitForTimeout(300);
  });

  test('Diğer view\'ler sorunsuz çalışmalı', async ({ page }) => {
    test.setTimeout(60_000);
    await setupApp(page);

    // Karakterler view'a geç
    await page.click('button.view-mode[data-vm="karakterler"]');
    await page.waitForTimeout(500);

    // Split'e geri dön
    await page.click('button.view-mode[data-vm="split"]');
    await page.waitForTimeout(500);

    // body.karakterler-active kalkmalı
    const hasKarakterler = await page.evaluate(() => document.body.classList.contains('karakterler-active'));
    expect(hasKarakterler).toBe(false);

    // Timeline view
    await page.click('button.view-mode[data-vm="timeline"]');
    await page.waitForTimeout(500);
    const hasTimeline = await page.evaluate(() => !document.body.classList.contains('karakterler-active'));
    expect(hasTimeline).toBe(true);

    // Senaryo view
    await page.click('button.view-mode[data-vm="screenplay"]');
    await page.waitForTimeout(500);
    const hasScreenplay = await page.evaluate(() => document.body.classList.contains('screenplay-editor-active'));
    expect(hasScreenplay).toBe(true);

    // Tekrar karakterler — sorunsuz geçiş
    await page.click('button.view-mode[data-vm="karakterler"]');
    await page.waitForTimeout(500);
    const backToChars = await page.evaluate(() => document.body.classList.contains('karakterler-active'));
    expect(backToChars).toBe(true);

    // Kartlar olmalı
    const cardCount = await page.locator('.char-card').count();
    expect(cardCount).toBeGreaterThan(0);

    console.log('Tüm view geçişleri başarılı!');
  });

});
