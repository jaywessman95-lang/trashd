export type RealtorContact = {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  brokerage?: string;
  profileUrl?: string;
  source: string;
  scrapedAt: string;
};

export type ContactScrapeResult = {
  source: string;
  contacts: RealtorContact[];
  pagesScraped: number;
  error?: string;
};
