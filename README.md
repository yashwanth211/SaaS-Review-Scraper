# SaaS Review Scraper

SaaS Review Scraper is a modular CLI tool designed to extract customer reviews from major SaaS platforms like **G2**, **Capterra**, and **TrustRadius**.
I built this project to demonstrate a robust approach to web scraping, focusing on modular architecture and reliable data extraction.

## Design & Architecture

The core of the application is built using **Node.js** and **Playwright**. I structured the codebase using the **Strategy Design Pattern** to handle the differences between platforms.
Since every site (G2, Capterra, etc.) has a completely different DOM structure and security mechanism, keeping the logic separated in the `src/scrapers/` folder makes the tool easy to maintain and extend. 
If we needed to add a new source later, we wouldn't need to touch the main execution logic.

## How to Run

### Installation
First, clone the repository and install the dependencies. I used `playwright-extra` and the stealth plugin to ensure the browser session handles standard anti-bot checks smoothly.

The tool is controlled entirely via the command line. You need to specify the company, the source, and the date range you are interested in.

1.G2 Reviews:
  node src/index.js --company slack --source g2 --start_date 2024-01-01 --end_date 2024-12-31

2.Capterra:
  node src/index.js --company "[https://www.capterra.in/software/135003/slack](https://www.capterra.in/software/135003/slack)" --source capterra --start_date 2024-01-01 --end_date 2024-12-31

3.TrustRadius:
  node src/index.js --company slack --source trustradius --start_date 2024-01-01 --end_date 2024-12-31

## OUTPUT

The scraper processes the raw HTML and standardizes the data into a clean JSON format. Results are automatically saved to the output/ directory with a timestamped filename (e.g., slack_capterra_20251226.json).

{
    "source": "Capterra",
    "title": "\"Slack for realtime communication with team\"",
    "description": "Finally my experience with slack was its good to use slack instead of sending and receiving excessive mails. Its features also good like scheduled messages etc.\nI am using slack for realtime communication with team for productive work. I impressed with its scheduled messages and its ease of use and for its effectiveness in customer support. I can say its value for money buy.\nI am facing some issues while file sharing and noticed some issues in login it leads to login again and again for every week.",
    "date": "2025-10-27",
    "rating": "4.0/5",
    "reviewer": "chaitanya prasad reddy"
  }

## STRUCTURE

src/index.js: The main entry point and controller.

src/scrapers/: Individual strategy files for each platform.

output/: Where the extracted data is saved.
