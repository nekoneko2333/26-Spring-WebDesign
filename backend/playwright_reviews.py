from __future__ import annotations

import argparse
import asyncio
from dataclasses import dataclass
from typing import List

from playwright.async_api import async_playwright

from db import bulk_insert_reviews


@dataclass
class ScrapedReview:
    author: str
    score: float
    comment: str
    source: str


def _clean_text(value: str) -> str:
    return ' '.join((value or '').split())


def _clean_score(value: str) -> float:
    digits = ''.join(ch for ch in (value or '') if ch.isdigit() or ch == '.')
    return float(digits or 0)


async def scrape_google_maps_reviews(place_query: str, max_reviews: int = 10) -> List[ScrapedReview]:
    reviews: List[ScrapedReview] = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto('https://www.google.com/maps', wait_until='domcontentloaded')
        await page.get_by_role('textbox', name='Search Google Maps').fill(place_query)
        await page.keyboard.press('Enter')
        await page.wait_for_timeout(4000)

        review_cards = page.locator('[data-review-id]')
        count = min(await review_cards.count(), max_reviews)
        for idx in range(count):
            card = review_cards.nth(idx)
            author = _clean_text(await card.locator('.d4r55').inner_text())
            comment = _clean_text(await card.locator('.wiI7pd').inner_text())
            score_text = await card.locator('.kvMYJc').get_attribute('aria-label') or '0'
            review = ScrapedReview(
                author=author,
                score=_clean_score(score_text),
                comment=comment,
                source='google-maps-playwright',
            )
            if review.author and review.comment:
                reviews.append(review)

        await browser.close()

    return reviews


async def run(place_query: str, landmark_id: str, max_reviews: int):
    scraped = await scrape_google_maps_reviews(place_query, max_reviews=max_reviews)
    inserted = bulk_insert_reviews(
        [
            {
                'landmark_id': landmark_id,
                'author': item.author,
                'score': item.score,
                'comment': item.comment,
                'source': item.source,
            }
            for item in scraped
        ]
    )
    print(f'Scraped {len(scraped)} reviews, inserted {inserted} rows for {landmark_id}.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Scrape landmark reviews and store them into PostgreSQL.')
    parser.add_argument('--place-query', required=True, help='Search query used on the target travel site.')
    parser.add_argument('--landmark-id', required=True, help='Landmark id to associate with the scraped reviews.')
    parser.add_argument('--max-reviews', type=int, default=10, help='Maximum number of reviews to scrape.')
    args = parser.parse_args()
    asyncio.run(run(args.place_query, args.landmark_id, args.max_reviews))
