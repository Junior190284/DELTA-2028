import crypto from "node:crypto";
import { decodeHtmlEntities } from "../text.ts";

export type ClubItem = {
  source_key: string;
  content_hash: string;
  title: string;
  body: string;
  published_at: string;
  priority: number;
  source_url: string;
};

type Headline = { title: string; date: string; headIndex: number; dateIndex: number };

export class DeltaParserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeltaParserError";
  }
}

function decoderScore(text: string) {
  let score = 0;
  const good = ["Powołania", "Górny Mokotów", "Zbiórka", "piłk", "zajęcia", "drużyna", "trening", "Warszawa", "Święto"];
  for (const x of good) if (text.includes(x)) score += 20;
  const bad = ["", "Ã", "Å", "Ä", "Â", "â€", "PowoĹ", "GĂłrny", "piĹ"];
  for (const x of bad) score -= 50 * (text.split(x).length - 1);
  return score;
}

export function decodeDeltaHtml(buffer: ArrayBuffer) {
  const candidates: string[] = [];
  for (const enc of ["windows-1250", "utf-8", "iso-8859-2"]) {
    try { candidates.push(new TextDecoder(enc).decode(buffer)); } catch {}
  }
  if (!candidates.length) return new TextDecoder().decode(buffer);
  return candidates.sort((a, b) => decoderScore(b) - decoderScore(a))[0];
}

function htmlToTokens(html: string) {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(br|\/p|\/div|\/li|\/tr|\/td|\/h\d|\/a)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  return decodeHtmlEntities(cleaned)
    .replace(/\r/g, "")
    .split(/\n+/)
    .map(x => x.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function digest(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function stableId(title: string, date: string) {
  // Stable identity format: sha256 of title + publication date
  return digest(`${title}|${date}`);
}

function isDateToken(value: string) {
  return /^\d{2}-\d{2}-\d{4}$/.test(value.trim());
}

function extractHeadlineAndDate(tokens: string[], index: number) {
  const inline = tokens[index].match(/^(.*?)\s+(\d{2}-\d{2}-\d{4})$/);
  if (inline) {
    return { title: inline[1].trim(), date: inline[2], dateIndex: index, headIndex: index };
  }
  if (isDateToken(tokens[index]) && index > 0) {
    return { title: tokens[index - 1].trim(), date: tokens[index].trim(), dateIndex: index, headIndex: index - 1 };
  }
  return null;
}

function isBadHeadline(title: string) {
  const value = title.trim();
  if (!value || value.length < 4 || value.length > 180) return true;
  if (/^\d{4}$/.test(value) || /^kolejka\b/i.test(value) || /^sezon \d{4}/i.test(value)) return true;
  if (/^(SENIORZY|Trener|Asystent|Praktykant|Trener Bramkarzy)$/i.test(value)) return true;
  if (/^(Zbiórka|Zabieramy|Zawodnicy|Mecz ligowy|Mecz wewnętrzny)$/i.test(value)) return true;
  if (/K\.S\. Delta Warszawa .* - |FC Vizja|MUKS Julianów|RKS Ursus|Alfa Przymierze Rodzin/.test(value)) return true;
  return false;
}

function collectHeadlines(tokens: string[]) {
  const heads: Headline[] = [];
  for (let index = 0; index < tokens.length; index++) {
    const found = extractHeadlineAndDate(tokens, index);
    if (!found || isBadHeadline(found.title)) continue;
    const looksLikeNews = /[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]/.test(found.title)
      && !/^\d{1,2}[:.]\d{2}/.test(found.title)
      && !/^(od|do)\s+\d{2}-\d{2}-\d{4}/i.test(found.title);
    if (!looksLikeNews || heads.some(x => x.dateIndex === found.dateIndex)) continue;
    heads.push({ ...found });
  }
  return heads;
}

function newsScope(tokens: string[]) {
  const markers = tokens.flatMap((token, index) => token.includes(">>>") ? [index] : []);
  for (let markerIndex = 0; markerIndex < markers.length; markerIndex++) {
    const start = markers[markerIndex] + 1;
    const end = markers[markerIndex + 1] ?? tokens.length;
    const scoped = tokens.slice(start, end);
    if (collectHeadlines(scoped).length >= 3) return scoped;
  }

  // Safe fallback for a cosmetic pagination change
  return tokens;
}

function relevantScheduleExcerpt(parts: string[]) {
  const keep: string[] = [];
  for (let index = 0; index < parts.length; index++) {
    const value = parts[index];
    const lower = value.toLocaleLowerCase("pl-PL");
    const relevant = lower.includes("2018") || lower.includes("dni wolne") || lower.includes("rozpoczęcie zajęć")
      || lower.includes("zakończenie zajęć") || lower.includes("przerwa świąteczna")
      || lower.includes("majówka") || lower.includes("boże ciało");
    if (!relevant) continue;
    if (index > 0 && !keep.includes(parts[index - 1])) keep.push(parts[index - 1]);
    keep.push(value);
    if (index + 1 < parts.length) keep.push(parts[index + 1]);
  }
  return [...new Set(keep)].join(" ").replace(/\s+/g, " ").trim().slice(0, 3000);
}

function buildBody(title: string, parts: string[]) {
  const cleaned = parts
    .filter(value => value && !/^\[?\d+\]?$/.test(value))
    .filter(value => !/^>>>$/.test(value))
    .filter(value => !/^Copyright/i.test(value))
    .filter(value => !/^ZAPISY$/i.test(value));
  if (/^Grafik sezon/i.test(title)) return relevantScheduleExcerpt(cleaned);
  return cleaned.join(" ").replace(/\s+/g, " ").trim().slice(0, 3200);
}

function itemPriority(title: string) {
  const value = title.toLocaleLowerCase("pl-PL");
  if (value.includes("powołania 2018 górny mokotów")) return 100;
  if (value.includes("powołania 2018")) return 95;
  if (value.includes("zmiana miejsca treningu")) return 95;
  if (value.includes("grafik sezon")) return 90;
  if (value.includes("zgrupowanie")) return 80;
  if (value.includes("trening") || value.includes("zajęcia")) return 75;
  return 60;
}

export function parseDeltaUpdates(html: string, sourceUrl: string): ClubItem[] {
  const scoped = newsScope(htmlToTokens(html));
  const heads = collectHeadlines(scoped);
  const items: ClubItem[] = [];

  for (let index = 0; index < heads.length; index++) {
    const head = heads[index];
    const next = heads[index + 1];
    
    // Boundary strictly ends before next article's title/heading
    const bodySlice = scoped.slice(
      head.dateIndex + 1, 
      next ? next.headIndex : Math.min(scoped.length, head.dateIndex + 101)
    );
    const body = buildBody(head.title, bodySlice);

    const [day, month, year] = head.date.split("-");
    const publishedAt = `${year}-${month}-${day}T12:00:00+02:00`;
    const priority = itemPriority(head.title);

    items.push({
      source_key: stableId(head.title, head.date),
      content_hash: digest(JSON.stringify([head.title, body, publishedAt, priority])),
      title: head.title,
      body,
      published_at: publishedAt,
      priority,
      source_url: sourceUrl
    });
  }

  const unique = [...new Map(items.map(item => [item.source_key, item])).values()]
    .filter(item => item.title !== "2018" && !/^\d{4}$/.test(item.title))
    .sort((a, b) => b.published_at.localeCompare(a.published_at))
    .slice(0, 30);

  if (unique.length < 3) {
    throw new DeltaParserError(`Parser DELTY zwrócił podejrzany wynik (${unique.length} wpisów). Istniejące wiadomości pozostają bez zmian.`);
  }
  return unique;
}
