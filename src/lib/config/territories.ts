const CITY_ZIP_CODES: Record<string, string> = {
  anaheim: "92805",
  brea: "92821",
  "buena park": "90620",
  "costa mesa": "92626",
  cypress: "90630",
  "fountain valley": "92708",
  fullerton: "92832",
  "garden grove": "92840",
  huntington: "92648",
  "huntington beach": "92648",
  irvine: "92618",
  "la habra": "90631",
  "laguna beach": "92651",
  "laguna hills": "92653",
  "laguna niguel": "92677",
  "lake forest": "92630",
  "los alamitos": "90720",
  "newport beach": "92660",
  orange: "92866",
  placentia: "92870",
  "san clemente": "92672",
  "san juan capistrano": "92675",
  "santa ana": "92701",
  seal: "90740",
  "seal beach": "90740",
  tustin: "92780",
  westminster: "92683",
  yorba: "92886",
  "yorba linda": "92886"
};

export type CitySearchArea = {
  city: string;
  slug: string;
  zipCode?: string;
};

export function searchAreasForCities(cities: string[]): CitySearchArea[] {
  const areas = cities
    .map((city) => city.trim())
    .filter(Boolean)
    .map((city) => {
      const normalized = normalizeCity(city);
      return {
        city: toTitleCase(normalized),
        slug: slugify(normalized),
        zipCode: city.match(/\b\d{5}\b/)?.[0] ?? CITY_ZIP_CODES[normalized]
      };
    })
    .filter((area) => area.slug);

  return uniqueBy(areas, (area) => `${area.slug}:${area.zipCode ?? ""}`);
}

export function zipCodesForCities(cities: string[]): string[] {
  const zips = cities
    .map((city) => city.trim())
    .flatMap((city) => {
      const zip = city.match(/\b\d{5}\b/)?.[0];

      if (zip) {
        return [zip];
      }

      const normalized = normalizeCity(city);
      return CITY_ZIP_CODES[normalized] ? [CITY_ZIP_CODES[normalized]] : [];
    });

  return unique(zips);
}

export function slugsForCities(cities: string[]): string[] {
  return unique(
    cities
      .map(normalizeCity)
      .filter(Boolean)
      .map(slugify)
      .filter(Boolean)
  );
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function uniqueBy<T>(values: T[], getKey: (value: T) => string): T[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = getKey(value);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function normalizeCity(city: string): string {
  return city.toLowerCase().replace(/\b\d{5}\b/g, "").replace(/,\s*ca$/i, "").replace(/\s+/g, " ").trim();
}

function slugify(value: string): string {
  return value.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function toTitleCase(value: string): string {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
