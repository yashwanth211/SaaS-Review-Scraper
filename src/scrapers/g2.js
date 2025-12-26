const { DateTime } = require('luxon');

const SELECTORS = {
  reviewCard: 'article',
  dateMeta: 'meta[itemprop="datePublished"]',
  title: 'h3',
  body: '[itemprop="reviewBody"]',
  reviewer: '[itemprop="author"]',
  nextButton: 'a:has-text("Next"), [rel="next"]'
};

async function scrapeG2(page, company, startDate, endDate) {
  const reviews = [];
  let hasNextPage = true;
  const url = `https://www.g2.com/products/${company}/reviews`;

  console.log(`Navigating: ${url}`);

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

  try {
    await page.waitForSelector(SELECTORS.reviewCard, { timeout: 5000 });
  } catch (e) {
    console.log('Security check detected. Please solve the CAPTCHA manually.');
    console.log('The script is paused and waiting for you to verify...');

    await page.waitForSelector(SELECTORS.reviewCard, { timeout: 0 });
    console.log('Access granted. Resuming extraction.');
  }

  await humanBehavior(page);

  while (hasNextPage) {
    try {
      await page.waitForSelector(SELECTORS.reviewCard, { timeout: 15000 });
    } catch (e) {
      console.log('Page load failed or blocked.');
      break;
    }

    const reviewElements = await page.locator(SELECTORS.reviewCard).all();

    for (const element of reviewElements) {
      try {
        let reviewDate;
        const dateMeta = await element.locator(SELECTORS.dateMeta).getAttribute('content').catch(() => null);

        if (dateMeta) {
          reviewDate = DateTime.fromISO(dateMeta);
        } else {
          reviewDate = DateTime.now();
        }

        const title = await element.locator(SELECTORS.title).first().innerText().catch(() => "Review");
        const body = await element.locator(SELECTORS.body).first().innerText().catch(() => "");
        const reviewer = await element.locator(SELECTORS.reviewer).first().innerText().catch(() => "Anonymous");

        if (reviewDate < startDate) {
          hasNextPage = false;
          break;
        }

        if (reviewDate >= startDate && reviewDate <= endDate) {
          reviews.push({
            source: 'G2',
            title: title.trim(),
            description: body.trim().replace(/\n/g, " "),
            date: reviewDate.toISODate(),
            reviewer: reviewer.trim()
          });
        }
      } catch (err) {
        continue;
      }
    }

    if (!hasNextPage) break;

    const nextBtn = page.locator(SELECTORS.nextButton);
    if (await nextBtn.count() > 0 && await nextBtn.isVisible()) {
      await nextBtn.click();
      await page.waitForTimeout(3000);
      await humanBehavior(page);
    } else {
      hasNextPage = false;
    }
  }

  return reviews;
}

async function humanBehavior(page) {
  const waitTime = Math.floor(Math.random() * 3000) + 2000;
  await page.waitForTimeout(waitTime);

  try {
    await page.mouse.move(
      Math.floor(Math.random() * 500),
      Math.floor(Math.random() * 500),
      { steps: 10 }
    );
  } catch (e) {}

  await page.evaluate(() => {
    window.scrollBy(0, Math.floor(Math.random() * 300) + 100);
  });
}

module.exports = scrapeG2;