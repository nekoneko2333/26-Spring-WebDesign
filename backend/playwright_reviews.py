from __future__ import annotations

import asyncio
from dataclasses import dataclass, asdict
from typing import List

from playwright.async_api import async_playwright


@dataclass
class ScrapedReview:
    author: str
    score: float
    comment: str
    source: str


async def scrape_google_maps_reviews(place_query: str, max_reviews: int = 10) -> List[ScrapedReview]:
    reviews: List[ScrapedReview] = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto('https://www.google.com/maps', wait_until='domcontentloaded')
        await page.get_by_role('textbox', name='Search Google Maps').fill(place_query)
        await page.keyboard.press('Enter')
        await page.wait_for_timeout(4000)

        # 模板：根据实际页面结构补充更稳定的定位器
        review_cards = page.locator('[data-review-id]')
        count = min(await review_cards.count(), max_reviews)
        for idx in range(count):
            card = review_cards.nth(idx)
            author = await card.locator('.d4r55').inner_text()
            comment = await card.locator('.wiI7pd').inner_text()
            score_text = await card.locator('.kvMYJc').get_attribute('aria-label') or '0'
            digits = ''.join(ch for ch in score_text if ch.isdigit() or ch == '.')
            reviews.append(
                ScrapedReview(
                    author=author.strip(),
                    score=float(digits or 0),
                    comment=comment.strip(),
                    source='google-maps-playwright',
                )
            )

        await browser.close()

    return reviews


async def main():
    data = await scrape_google_maps_reviews('Colosseum Rome', max_reviews=5)
    for item in data:
        print(asdict(item))


if __name__ == '__main__':
    asyncio.run(main())
