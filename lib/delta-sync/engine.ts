import { createAdminClient } from "../supabase/admin.ts";
import { decodeDeltaHtml, parseDeltaUpdates, type ClubItem } from "./parser.ts";
import { emitSystemEvent, recordChangeHistory } from "../events/emitter.ts";

export const DELTA_URL = "https://www.delta.warszawa.pl/pilka.php?a=druzyny&druzyna=108";
const FETCH_TIMEOUT_MS = 15_000;
const MAX_HTML_BYTES = 5_000_000;

export interface SyncResult {
  success: boolean;
  status: "SUCCESS" | "WARNING" | "ERROR" | "TIMEOUT" | "PARSER_ERROR";
  duration_ms: number;
  items_found: number;
  items_inserted: number;
  items_updated: number;
  changes_detected: number;
  error?: string;
  details?: Record<string, any>;
}

/**
 * Executes a resilient fetch with retry on network error.
 */
async function fetchDeltaPageWithRetry(url: string, retries = 2): Promise<ArrayBuffer> {
  let lastError: any = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: {
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 DELTA-Hub/2.0",
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      });

      if (!response.ok) {
        throw new Error(`DELTA_HTTP_${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      if (buffer.byteLength < 500) {
        throw new Error(`DELTA_RESPONSE_TOO_SMALL_${buffer.byteLength}`);
      }
      if (buffer.byteLength > MAX_HTML_BYTES) {
        throw new Error(`DELTA_RESPONSE_TOO_LARGE_${buffer.byteLength}`);
      }

      return buffer;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
  }

  throw lastError;
}

/**
 * Extracts potential match schedule changes (time, venue) from update text.
 */
function extractScheduleDetails(text: string): { time?: string; venue?: string } {
  const result: { time?: string; venue?: string } = {};
  
  // Time regex e.g. "godz. 10:30", "11:00", "godzina 12:15"
  const timeMatch = text.match(/(?:godz(?:ina|\.)?|zbiórka[:\s]+)(\d{1,2}[:.]\d{2})/i);
  if (timeMatch) {
    result.time = timeMatch[1].replace(".", ":");
  }

  // Venue regex
  const venueMatch = text.match(/(?:boisko|hala|stadion|ul\.|adres)[:\s]+([^,\.\n]+)/i);
  if (venueMatch) {
    result.venue = venueMatch[1].trim();
  }

  return result;
}

/**
 * DELTA SYNC 2.0 Core Execution Engine
 */
export async function runDeltaSync(options?: { triggeredBy?: string }): Promise<SyncResult> {
  const startedAt = Date.now();
  const admin = createAdminClient();

  try {
    // 1. Fetch raw page
    const buffer = await fetchDeltaPageWithRetry(DELTA_URL);

    // 2. Decode and parse
    const decodedHtml = decodeDeltaHtml(buffer);
    const parsedItems = parseDeltaUpdates(decodedHtml, DELTA_URL);

    // 3. Load existing rows from DB (NON-DESTRUCTIVE: existing records are never wiped)
    const { data: existingRows, error: existingError } = await admin
      .from("club_updates")
      .select("source_key,title,body,priority,published_at")
      .eq("source_url", DELTA_URL);

    if (existingError) throw existingError;

    const existingByKey = new Map((existingRows || []).map((row: any) => [row.source_key, row]));
    
    let newCount = 0;
    let updatedCount = 0;
    let changesCount = 0;

    const newItems: ClubItem[] = [];
    const updatedItems: ClubItem[] = [];

    for (const item of parsedItems) {
      // 1. Direct match with current source_key
      // 2. Compatibility match with legacy source_key to prevent re-importing historical records
      let existing = existingByKey.get(item.source_key);
      if (!existing && item.legacy_source_key) {
        existing = existingByKey.get(item.legacy_source_key);
        if (existing) {
          // Adopt existing row's source_key to maintain database consistency and FK integrity
          item.source_key = existing.source_key;
        }
      }

      if (!existing) {
        newItems.push(item);
        newCount++;

        // Emit central system event for new club article
        const isUrgent = item.priority >= 90 || /odwołan|zmiana/i.test(item.title);
        await emitSystemEvent({
          type: "CLUB_NEWS",
          title: item.title,
          message: item.body ? item.body.slice(0, 200) + "..." : "Nowy komunikat z klubu K.S. Delta Warszawa",
          source: "DELTA_SYNC",
          importance: isUrgent ? "IMPORTANT" : "NORMAL",
          related_entity_type: "club_update",
          related_entity_id: item.source_key,
          metadata: { published_at: item.published_at, priority: item.priority }
        });
      } else {
        const titleChanged = existing.title !== item.title;
        const bodyChanged = (existing.body || "") !== (item.body || "");

        if (titleChanged || bodyChanged) {
          updatedItems.push(item);
          updatedCount++;

          // CHANGE DETECTOR: Record field-level diff
          if (titleChanged) {
            changesCount++;
            await recordChangeHistory({
              entity_type: "club_update",
              entity_id: item.source_key,
              field_name: "title",
              old_value: existing.title,
              new_value: item.title,
              source: "DELTA_SYNC"
            });
          }

          if (bodyChanged) {
            changesCount++;
            await recordChangeHistory({
              entity_type: "club_update",
              entity_id: item.source_key,
              field_name: "body",
              old_value: (existing.body || "").slice(0, 100),
              new_value: (item.body || "").slice(0, 100),
              source: "DELTA_SYNC"
            });

            // Check if schedule time or venue was altered in the update
            const oldDetails = extractScheduleDetails(existing.body || "");
            const newDetails = extractScheduleDetails(item.body || "");

            if (newDetails.time && newDetails.time !== oldDetails.time) {
              await emitSystemEvent({
                type: "MATCH_UPDATED",
                title: `Zmiana godziny: ${item.title}`,
                message: `Nowa godzina: ${newDetails.time} (wcześniej: ${oldDetails.time || "brak"})`,
                source: "DELTA_SYNC",
                importance: "IMPORTANT",
                related_entity_type: "club_update",
                related_entity_id: item.source_key
              });
            }

            if (newDetails.venue && newDetails.venue !== oldDetails.venue) {
              await emitSystemEvent({
                type: "MATCH_UPDATED",
                title: `Zmiana miejsca: ${item.title}`,
                message: `Nowe miejsce: ${newDetails.venue}`,
                source: "DELTA_SYNC",
                importance: "IMPORTANT",
                related_entity_type: "club_update",
                related_entity_id: item.source_key
              });
            }
          }
        }
      }
    }

    // 4. Save updates to Supabase
    const now = new Date().toISOString();
    const rowsToUpsert = parsedItems.map(({ content_hash: _, legacy_source_key: __, ...item }) => ({
      ...item,
      source_name: "K.S. Delta Warszawa",
      synced_at: now
    }));

    if (rowsToUpsert.length > 0) {
      const { error: upsertError } = await admin
        .from("club_updates")
        .upsert(rowsToUpsert, { onConflict: "source_key" });
      if (upsertError) throw upsertError;
    }

    const durationMs = Date.now() - startedAt;

    // 5. Log to delta_sync_history
    const logDetails = {
      source: DELTA_URL,
      duration_ms: durationMs,
      new: newCount,
      updated: updatedCount,
      changes: changesCount,
      triggeredBy: options?.triggeredBy || "cron"
    };

    try {
      await admin.from("delta_sync_history").insert({
        status: "SUCCESS",
        items_found: parsedItems.length,
        items_inserted: newCount,
        items_updated: updatedCount,
        changes_detected: changesCount,
        errors_count: 0,
        duration_ms: durationMs,
        details: logDetails,
        created_at: now
      });
    } catch (logErr) {
      console.warn("Could not insert into delta_sync_history:", logErr);
    }

    return {
      success: true,
      status: "SUCCESS",
      duration_ms: durationMs,
      items_found: parsedItems.length,
      items_inserted: newCount,
      items_updated: updatedCount,
      changes_detected: changesCount,
      details: logDetails
    };
  } catch (err: any) {
    const durationMs = Date.now() - startedAt;
    const errorMessage = String(err?.message || err);
    let status: SyncResult["status"] = "ERROR";

    if (err?.name === "TimeoutError" || err?.name === "AbortError" || /timeout/i.test(errorMessage)) {
      status = "TIMEOUT";
    } else if (err?.name === "DeltaParserError") {
      status = "PARSER_ERROR";
    }

    // Log failure
    try {
      await admin.from("delta_sync_history").insert({
        status,
        items_found: 0,
        items_inserted: 0,
        items_updated: 0,
        changes_detected: 0,
        errors_count: 1,
        duration_ms: durationMs,
        details: { error: errorMessage },
        created_at: new Date().toISOString()
      });

      // Emit admin alert for sync failure
      await emitSystemEvent({
        type: "SYNC_ERROR",
        title: "Błąd synchronizacji DELTA Sync",
        message: `Nie udało się pobrać aktualności ze strony klubu: ${errorMessage}`,
        source: "DELTA_SYNC",
        importance: "URGENT"
      });
    } catch {}

    return {
      success: false,
      status,
      duration_ms: durationMs,
      items_found: 0,
      items_inserted: 0,
      items_updated: 0,
      changes_detected: 0,
      error: errorMessage
    };
  }
}
