const { DateTime } = require('luxon');

const SELECTORS = {
  reviewCard: 'div.review-card',
  title: 'h3',
  reviewer: 'div.fw-600',
  bodyText: '.text-neutral-99',
  dateSection: 'div.text-neutral-90',
  ratingText: '.star-rating-component span.ms-1',
  starContainer: '.star-rating-component',
  nextButton: 'button:has-text("Next")'
};

async function scrapeCapterra(page, company, startDate, endDate) {
  const reviews = [];
  let hasNextPage = true;
  
  const url = company.includes('http') 
    ? company 
    : `https://www.capterra.in/software/${company}`;

  console.log(`Navigating: ${url}`);
  
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

  while (hasNextPage) {
    try {
      await page.waitForSelector(SELECTORS.reviewCard, { timeout: 15000 });
    } catch (e) {
      console.log('No reviews found or page blocked.');
      break;
    }

    const reviewElements = await page.locator(SELECTORS.reviewCard).all();

    for (const element of reviewElements) {
      try {
        let rating = "N/A";
        
        const directRating = await element.locator(SELECTORS.ratingText).first().innerText().catch(() => "");
        if (directRating) {
            rating = `${directRating.trim()}/5`;
        } else {
            const starSection = element.locator(SELECTORS.starContainer).first();
            const ariaLabel = await starSection.getAttribute('aria-label').catch(() => null);
            if (ariaLabel) {
                rating = ariaLabel.split(' ')[0] + "/5";
            }
        }

        const headerTexts = await element.locator(SELECTORS.dateSection).allInnerTexts();
        let reviewDate = DateTime.now();
        const dateRegex = /(\d{1,2})\s([A-Za-z]+)\s(\d{4})/;
        
        for (const text of headerTexts) {
          const match = text.match(dateRegex);
          if (match) {
            const parsedDate = DateTime.fromFormat(match[0], "d MMMM yyyy");
            if (parsedDate.isValid) {
              reviewDate = parsedDate;
              break; 
            }
          }
        }

        const title = await element.locator(SELECTORS.title).innerText().catch(() => "Review");
        const reviewer = await element.locator(SELECTORS.reviewer).first().innerText().catch(() => "Anonymous");
        const textBlocks = await element.locator(SELECTORS.bodyText).allInnerTexts();
        const fullBody = textBlocks.join('\n'); 

        if (reviewDate < startDate) {
          hasNextPage = false;
          break;
        }

        if (reviewDate >= startDate && reviewDate <= endDate) {
          reviews.push({
            source: 'Capterra',
            title: title.trim(),
            description: fullBody.trim(),
            date: reviewDate.toISODate(),
            rating: rating,
            reviewer: reviewer.trim()
          });
        }
      } catch (err) {
        continue;
      }
    }

    if (!hasNextPage) break;

    const nextBtn = page.locator(SELECTORS.nextButton);
    if (await nextBtn.isVisible() && await nextBtn.isEnabled()) {
      await nextBtn.click();
      await page.waitForTimeout(3000);
    } else {
      hasNextPage = false;
    }
  }

  return reviews;
}

module.exports = scrapeCapterra;