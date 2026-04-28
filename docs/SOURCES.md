# Source Playbook

## Source Priority

1. Craigslist
2. OfferUp
3. EstateSales.net
4. StorageTreasures
5. AuctionZip
6. EstateSales.org
7. MovingSales / garage sale aggregators

## Scrape Schedule

| Source | Schedule |
|---|---|
| Craigslist | Every 2-4 hours |
| OfferUp | Every 4-8 hours |
| EstateSales.net | Every 8 hours |
| EstateSales.org | Every 8-12 hours |
| AuctionZip | Every 8-12 hours |
| StorageTreasures | Every 8 hours |
| MovingSales aggregators | Daily |

## Connector Contract

Each connector must return normalized candidates with:

- Source.
- Source listing id when available.
- URL.
- Title.
- Description.
- City/state.
- Price when available.
- Image count.
- Event or auction dates when available.
- Raw payload.
