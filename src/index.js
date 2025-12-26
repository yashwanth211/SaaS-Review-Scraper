#!/usr/bin/env node
const { Command } = require('commander');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const fs = require('fs');
const path = require('path');
const { DateTime } = require('luxon');

const scrapeG2 = require('./scrapers/g2');
const scrapeCapterra = require('./scrapers/capterra');
const scrapeTrustRadius = require('./scrapers/trustradius');

chromium.use(stealth);

const program = new Command();

program
  .name('pulse-scraper')
  .description('SaaS review scraper')
  .version('1.0.0')
  .requiredOption('-c, --company <name>', 'Company name or Full URL')
  .requiredOption('-s, --start_date <date>', 'Start date (YYYY-MM-DD)')
  .requiredOption('-e, --end_date <date>', 'End date (YYYY-MM-DD)')
  .requiredOption('--source <source>', 'Source (g2, capterra, trustradius)')
  .parse(process.argv);

const options = program.opts();

const strategies = {
  g2: scrapeG2,
  capterra: scrapeCapterra,
  trustradius: scrapeTrustRadius
};

(async () => {
  const startDate = DateTime.fromISO(options.start_date);
  const endDate = DateTime.fromISO(options.end_date);

  if (!startDate.isValid || !endDate.isValid) {
    console.error('Error: Invalid date format. Use YYYY-MM-DD.');
    process.exit(1);
  }

  if (startDate > endDate) {
    console.error('Error: Start date cannot be after end date.');
    process.exit(1);
  }

  const selectedStrategy = strategies[options.source.toLowerCase()];
  if (!selectedStrategy) {
    console.error(`Error: Source "${options.source}" not supported.`);
    process.exit(1);
  }

  let safeCompanyName = options.company;
  if (safeCompanyName.includes('http')) {
    const parts = safeCompanyName.split('/');
    safeCompanyName = parts[parts.length - 1] || parts[parts.length - 2]; 
  }

  console.log(`Target: ${safeCompanyName}`);
  console.log(`Source: ${options.source}`);
  console.log('Launching browser...');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US',
    timezoneId: 'America/New_York'
  });

  const page = await context.newPage();

  try {
    console.log('Starting extraction...');
    const reviews = await selectedStrategy(page, options.company, startDate, endDate);

    const outputDir = path.resolve(__dirname, '../output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `${safeCompanyName}_${options.source}_${DateTime.now().toFormat('yyyyMMdd')}.json`;
    const outputPath = path.join(outputDir, filename);

    fs.writeFileSync(outputPath, JSON.stringify(reviews, null, 2));

    console.log(`Extracted ${reviews.length} reviews.`);
    console.log(`Data saved to ${outputPath}`);

  } catch (error) {
    console.error('Runtime error:', error.message);
  } finally {
    await browser.close();
  }
})();