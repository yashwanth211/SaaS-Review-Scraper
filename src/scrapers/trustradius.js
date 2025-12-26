const { DateTime } = require('luxon');

const SELECTORS = {
  reviewCard: 'article',
  title: 'h4, [class*="Header_heading"]',
  date: '[class*="Header_date"]',
  reviewer: '[class*="Byline_name"]',
  bodySections: '[class*="ReviewAnswer_longForm"]',
  ratingContainer: '[data-testid="stars-container"]',
  nextButton: 'a[aria-label="Next Page"], a:has-text("Next")',
  viewAllLink: 'a:has-text("View all reviews")'
};

async function scrapeTrustRadius(page, company, startDate, endDate) {
  const reviews = [];
  let hasNextPage = true;

  const url = company.includes('http')
    ? company
    : `https://www.trustradius.com/products/${company}/reviews`;

  console.log(`Navigating: ${url}`);

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

  const reviewCount = await page.locator(SELECTORS.reviewCard).count();
  if (reviewCount === 0) {
    const viewAll = page.locator(SELECTORS.viewAllLink);
    if (await viewAll.count() > 0) {
      console.log('Loading full review list...');
      await viewAll.first().click();
      await page.waitForLoadState('domcontentloaded');
    }
  }

  while (hasNextPage) {
    try {
      await page.waitForSelector(SELECTORS.reviewCard, { timeout: 15000 });
    } catch (e) {
      console.log('No reviews found.');
      break;
    }

    const reviewElements = await page.locator(SELECTORS.reviewCard).all();

    for (const element of reviewElements) {
      try {
        const rawDate = await element.locator(SELECTORS.date).first().innerText().catch(() => "");
        const reviewDate = DateTime.fromFormat(rawDate, "MMMM dd, yyyy");

        if (!reviewDate.isValid) continue;

        if (reviewDate < startDate) {
          hasNextPage = false;
          break;
        }
        if (reviewDate > endDate) continue;

        const textSections = await element.locator(SELECTORS.bodySections).allInnerTexts();
        const fullBody = textSections.join('\n\n');

        const title = await element.locator(SELECTORS.title).first().innerText().catch(() => "Review");
        const reviewer = await element.locator(SELECTORS.reviewer).first().innerText().catch(() => "Verified User");

        const ratingElement = element.locator(SELECTORS.ratingContainer).first();
        const rating = await ratingElement.getAttribute('data-rating').catch(() => "N/A");

        reviews.push({
          source: 'TrustRadius',
          title: title.trim(),
          description: fullBody.trim(),
          date: reviewDate.toISODate(),
          rating: rating ? `${rating}/10` : "N/A",
          reviewer: reviewer.trim()
        });

      } catch (err) {
        continue;
      }
    }

    if (!hasNextPage) break;

    const nextBtn = page.locator(SELECTORS.nextButton);
    if (await nextBtn.count() > 0 && await nextBtn.isVisible()) {
      await nextBtn.click();
      await page.waitForTimeout(3000);
    } else {
      hasNextPage = false;
    }
  }

  return reviews;
}

module.exports = scrapeTrustRadius;