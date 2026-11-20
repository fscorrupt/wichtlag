import { db, UPLOADS_DIR } from './db.js';
import fs from 'fs';
import path from 'path';

function unlinkUploadIfExists(uploadUrl) {
  if (!uploadUrl || !uploadUrl.startsWith('/uploads/')) return;
  const filePath = path.join(UPLOADS_DIR, path.basename(uploadUrl));
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

/**
 * Remove all uploaded banner and avatar files associated with an event.
 */
export function deleteEventUploads(eventId) {
  try {
    const evt = db.prepare(`SELECT banner_url FROM events WHERE id = ?`).get(eventId);
    if (evt) {
      unlinkUploadIfExists(evt.banner_url);
    }

    const participants = db.prepare(`SELECT avatar_url FROM participants WHERE event_id = ?`).all(eventId);
    for (const p of participants) {
      unlinkUploadIfExists(p.avatar_url);
    }
  } catch (fileErr) {
    console.error(`[Auto-Cleanup] Fehler beim Löschen von Dateien für Event ${eventId}:`, fileErr.message);
  }
}

/**
 * Automatically delete events that ended more than 14 days ago.
 * Requirement: "2 wochen nach aktionsende, aktion löschen."
 */
export function purgeExpiredEvents() {
  try {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const cutoffDateStr = fourteenDaysAgo.toISOString().split('T')[0]; // YYYY-MM-DD

    // Query events where event_date < cutoffDateStr
    const expiredEvents = db.prepare(`
      SELECT id, title, event_date FROM events
      WHERE event_date < ?
    `).all(cutoffDateStr);

    if (expiredEvents.length === 0) {
      return 0;
    }

    console.log(`[Auto-Cleanup] Gefundene abgelaufene Aktionen (>14 Tage alt): ${expiredEvents.length}`);

    const deleteStmt = db.prepare(`DELETE FROM events WHERE id = ?`);

    for (const evt of expiredEvents) {
      // Clean up uploaded files for this event if applicable
      deleteEventUploads(evt.id);

      // Delete from DB (cascades to participants & exclusions)
      deleteStmt.run(evt.id);
      console.log(`[Auto-Cleanup] Gelöscht: "${evt.title}" (${evt.id}), Aktionsdatum war ${evt.event_date}`);
    }

    return expiredEvents.length;
  } catch (err) {
    console.error('[Auto-Cleanup] Fehler beim Bereinigen abgelaufener Aktionen:', err);
    return 0;
  }
}

/**
 * Starts the periodic auto-cleanup task (runs every hour)
 */
export function startCleanupSchedule() {
  // Run once immediately on start
  purgeExpiredEvents();
  try {
    db.pragma('wal_checkpoint(PASSIVE)');
  } catch {}

  // Run every 60 minutes
  const ONE_HOUR = 60 * 60 * 1000;
  setInterval(() => {
    purgeExpiredEvents();
    try {
      db.pragma('wal_checkpoint(PASSIVE)');
    } catch {}
  }, ONE_HOUR);
}
