import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { db, DATA_DIR, UPLOADS_DIR } from './db.js';
import { matchSecretSanta, validateDrawPossibility } from './matcher.js';
import { startCleanupSchedule, deleteEventUploads } from './cleanup.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseBooleanEnv(value, defaultValue = true) {
  if (value === undefined || value === null || value === '') return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  return defaultValue;
}

const ALLOW_EVENT_CREATION = parseBooleanEnv(process.env.ALLOW_EVENT_CREATION, true);
const CREATION_PASSWORD = process.env.CREATION_PASSWORD || '';
const ALLOW_IMAGE_UPLOADS = parseBooleanEnv(process.env.ALLOW_IMAGE_UPLOADS, true);

const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const CREATION_AUTH_WINDOW_MS = 15 * 60 * 1000;
const CREATION_AUTH_MAX_FAILURES = 10;
const creationAuthFailures = new Map();

function isValidCreationPassword(provided) {
  if (!CREATION_PASSWORD) return true;
  if (typeof provided !== 'string' || !provided) return false;
  // Compare SHA-256 digests so timingSafeEqual works on equal-length buffers without leaking password length
  const expectedHash = crypto.createHash('sha256').update(CREATION_PASSWORD, 'utf8').digest();
  const providedHash = crypto.createHash('sha256').update(provided, 'utf8').digest();
  return crypto.timingSafeEqual(expectedHash, providedHash);
}

function getCreationAuthClientKey(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function pruneExpiredAuthFailures(now) {
  for (const [key, entry] of creationAuthFailures.entries()) {
    if (now - entry.windowStart >= CREATION_AUTH_WINDOW_MS) {
      creationAuthFailures.delete(key);
    }
  }
}

function checkCreationAuthRateLimit(req) {
  const now = Date.now();
  pruneExpiredAuthFailures(now);
  const entry = creationAuthFailures.get(getCreationAuthClientKey(req));
  return Boolean(entry && entry.count >= CREATION_AUTH_MAX_FAILURES);
}

function recordCreationAuthFailure(req) {
  const now = Date.now();
  const key = getCreationAuthClientKey(req);
  const existing = creationAuthFailures.get(key);
  if (!existing || now - existing.windowStart >= CREATION_AUTH_WINDOW_MS) {
    creationAuthFailures.set(key, { count: 1, windowStart: now });
  } else {
    existing.count += 1;
  }
}

function clearCreationAuthFailures(req) {
  creationAuthFailures.delete(getCreationAuthClientKey(req));
}

function requireCreationAccess(req, res, next) {
  if (!ALLOW_EVENT_CREATION) {
    return res.status(403).json({
      error: 'Das Erstellen neuer Aktionen wurde vom Administrator deaktiviert.',
      code: 'EVENT_CREATION_DISABLED'
    });
  }

  if (CREATION_PASSWORD) {
    if (checkCreationAuthRateLimit(req)) {
      return res.status(429).json({
        error: 'Zu viele fehlgeschlagene Versuche. Bitte warte einen Moment.',
        code: 'TOO_MANY_ATTEMPTS'
      });
    }
    const headerPassword = typeof req.headers['x-creation-password'] === 'string'
      ? req.headers['x-creation-password']
      : undefined;
    const supplied = headerPassword ?? req.body?.creation_password ?? '';
    if (!isValidCreationPassword(supplied)) {
      recordCreationAuthFailure(req);
      return res.status(403).json({
        error: 'Ungültiges Passwort für die Aktionserstellung.',
        code: 'INVALID_CREATION_PASSWORD'
      });
    }
    clearCreationAuthFailures(req);
  }

  next();
}

function requireUploadAccess(req, res, next) {
  if (!ALLOW_IMAGE_UPLOADS) {
    return res.status(403).json({
      error: 'Der Bildupload wurde vom Administrator deaktiviert.',
      code: 'IMAGE_UPLOADS_DISABLED'
    });
  }

  const eventId = typeof req.headers['x-event-id'] === 'string'
    ? req.headers['x-event-id']
    : typeof req.query.eventId === 'string'
    ? req.query.eventId
    : '';
  const adminToken = typeof req.headers['x-admin-token'] === 'string' ? req.headers['x-admin-token'] : '';
  const participantToken = typeof req.headers['x-participant-token'] === 'string' ? req.headers['x-participant-token'] : '';

  if (adminToken) {
    const validAdmin = eventId && db.prepare(`SELECT id FROM events WHERE id = ? AND admin_token = ?`).get(eventId, adminToken);
    if (!validAdmin) {
      return res.status(403).json({ error: 'Ungültiges Admin-Token.', code: 'UPLOAD_UNAUTHORIZED' });
    }
    return next();
  }

  if (participantToken) {
    const validParticipant = eventId && db.prepare(`SELECT id FROM participants WHERE event_id = ? AND participant_token = ?`).get(eventId, participantToken);
    if (!validParticipant) {
      return res.status(403).json({ error: 'Ungültiger Teilnehmer-Zugang.', code: 'UPLOAD_UNAUTHORIZED' });
    }
    return next();
  }

  return requireCreationAccess(req, res, next);
}

function detectImageExtension(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return '.jpg';
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) return '.png';
  const header6 = buffer.subarray(0, 6).toString('ascii');
  if (header6 === 'GIF87a' || header6 === 'GIF89a') return '.gif';
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) return '.webp';
  return null;
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Serve uploaded files with strict anti-sniffing and script-blocking headers
app.use('/uploads', express.static(UPLOADS_DIR, {
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'");
  }
}));

// Setup multer in memory so magic bytes are verified before writing to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_MIMES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Nur Bilddateien (JPG, PNG, WebP, GIF) sind erlaubt.'));
    }
  }
});

// Helper for generating short clean IDs
function generateId(bytes = 6) {
  return crypto.randomBytes(bytes).toString('hex');
}

function getEventStats(eventId) {
  const statsRow = db.prepare(`
    SELECT COUNT(*) AS totalCount,
           SUM(CASE WHEN is_claimed = 1 THEN 1 ELSE 0 END) AS claimedCount,
           SUM(CASE WHEN is_ready = 1 THEN 1 ELSE 0 END) AS readyCount
    FROM participants
    WHERE event_id = ?
  `).get(eventId);

  const totalCount = statsRow?.totalCount || 0;
  const claimedCount = statsRow?.claimedCount || 0;
  const readyCount = statsRow?.readyCount || 0;
  const allReady = totalCount > 0 && readyCount === totalCount;
  return { totalCount, claimedCount, readyCount, allReady };
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

/**
 * Public runtime configuration flags (never expose secrets)
 */
app.get('/api/config', (req, res) => {
  res.json({
    allowEventCreation: ALLOW_EVENT_CREATION,
    creationPasswordRequired: ALLOW_EVENT_CREATION && Boolean(CREATION_PASSWORD),
    allowImageUploads: ALLOW_IMAGE_UPLOADS
  });
});

/**
 * Verify creation password before starting the event wizard
 */
app.post('/api/creation-auth', requireCreationAccess, (req, res) => {
  res.json({ authorized: true });
});

/**
 * Upload an image (banner or avatar)
 */
app.post('/api/upload', requireUploadAccess, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? 'Datei ist zu groß (maximal 5 MB erlaubt).'
        : err.message || 'Fehler beim Hochladen der Datei.';
      return res.status(400).json({ error: message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Keine Datei hochgeladen.' });
    }
    const ext = detectImageExtension(req.file.buffer);
    if (!ext) {
      return res.status(400).json({ error: 'Nur Bilddateien (JPG, PNG, WebP, GIF) sind erlaubt.' });
    }
    const uniqueName = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`;
    fs.writeFile(path.join(UPLOADS_DIR, uniqueName), req.file.buffer, (writeErr) => {
      if (writeErr) {
        console.error('Fehler beim Speichern des Uploads:', writeErr);
        return res.status(500).json({ error: 'Fehler beim Speichern der Datei.' });
      }
      res.json({ url: `/uploads/${uniqueName}` });
    });
  });
});

/**
 * Create a new Secret Santa event
 */
app.post('/api/events', requireCreationAccess, (req, res) => {
  try {
    const { title, description, event_date, max_budget, banner_url, names, exclusions } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Titel der Aktion ist erforderlich.' });
    }
    if (!event_date) {
      return res.status(400).json({ error: 'Aktionsdatum ist erforderlich.' });
    }
    if (!Array.isArray(names) || names.filter(n => n && n.trim()).length < 2) {
      return res.status(400).json({ error: 'Mindestens zwei Teilnehmernamen müssen angegeben werden.' });
    }

    // Clean names and remove duplicates
    const cleanNames = [...new Set(names.map(n => n.trim()).filter(Boolean))];
    if (cleanNames.length < 2) {
      return res.status(400).json({ error: 'Die Namen müssen eindeutig sein (mindestens 2 verschiedene Personen).' });
    }

    const eventId = generateId(5); // e.g. "a1b2c3d4e5"
    const adminToken = generateId(16); // 32 hex chars

    const createTransaction = db.transaction(() => {
      // 1. Insert event
      db.prepare(`
        INSERT INTO events (id, title, description, event_date, max_budget, banner_url, admin_token)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        eventId,
        title.trim(),
        description ? description.trim() : '',
        event_date,
        max_budget ? max_budget.trim() : '',
        banner_url || 'preset:winterwald',
        adminToken
      );

      // 2. Insert predefined participants
      const insertParticipant = db.prepare(`
        INSERT INTO participants (id, event_id, name, is_claimed, is_ready)
        VALUES (?, ?, ?, 0, 0)
      `);

      for (const name of cleanNames) {
        insertParticipant.run(generateId(6), eventId, name);
      }

      // 3. Insert exclusions if provided
      if (Array.isArray(exclusions)) {
        const insertExclusion = db.prepare(`
          INSERT INTO exclusions (id, event_id, giver_name, receiver_name)
          VALUES (?, ?, ?, ?)
        `);
        for (const ex of exclusions) {
          if (ex.giver_name && ex.receiver_name && ex.giver_name !== ex.receiver_name) {
            insertExclusion.run(generateId(6), eventId, ex.giver_name.trim(), ex.receiver_name.trim());
          }
        }
      }
    });

    createTransaction();

    res.json({
      success: true,
      id: eventId,
      admin_token: adminToken,
      admin_url: `/event/${eventId}/admin?token=${adminToken}`,
      join_url: `/event/${eventId}/join`
    });
  } catch (err) {
    console.error('Fehler beim Erstellen der Aktion:', err);
    res.status(500).json({ error: 'Interner Serverfehler beim Erstellen der Aktion.' });
  }
});

/**
 * Public event information (for join / claim page)
 */
app.get('/api/events/:id', (req, res) => {
  try {
    const event = db.prepare(`
      SELECT id, title, description, event_date, max_budget, banner_url, is_drawn, drawn_at, created_at
      FROM events WHERE id = ?
    `).get(req.params.id);

    if (!event) {
      return res.status(404).json({ error: 'Wichtel-Aktion nicht gefunden.' });
    }

    // List participants with claim status (no private tokens/targets!)
    const participants = db.prepare(`
      SELECT id, name, is_claimed, avatar_url, is_ready
      FROM participants WHERE event_id = ?
      ORDER BY name COLLATE NOCASE ASC
    `).all(event.id);

    const totalCount = participants.length;
    const claimedCount = participants.filter(p => p.is_claimed === 1).length;
    const readyCount = participants.filter(p => p.is_ready === 1).length;
    const allReady = totalCount > 0 && readyCount === totalCount;

    res.json({
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        event_date: event.event_date,
        max_budget: event.max_budget,
        banner_url: event.banner_url,
        is_drawn: event.is_drawn === 1,
        drawn_at: event.drawn_at,
        created_at: event.created_at
      },
      participants,
      stats: {
        totalCount,
        claimedCount,
        readyCount,
        allReady
      }
    });
  } catch (err) {
    console.error('Fehler beim Laden des Events:', err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

/**
 * Claim a predefined name in the event
 */
app.post('/api/events/:id/claim', (req, res) => {
  try {
    const { participant_id } = req.body;
    const eventId = req.params.id;

    if (!participant_id) {
      return res.status(400).json({ error: 'Kein Teilnehmer ausgewählt.' });
    }

    const event = db.prepare(`SELECT is_drawn FROM events WHERE id = ?`).get(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Aktion existiert nicht.' });
    }

    // Get participant
    const participant = db.prepare(`
      SELECT id, name, is_claimed, participant_token, avatar_url
      FROM participants WHERE id = ? AND event_id = ?
    `).get(participant_id, eventId);

    if (!participant) {
      return res.status(404).json({ error: 'Teilnehmer nicht gefunden.' });
    }

    if (participant.is_claimed === 1) {
      return res.status(409).json({ error: `Der Name "${participant.name}" wurde bereits ausgewählt!` });
    }

    // Generate unique participant token
    const participantToken = generateId(16);

    db.prepare(`
      UPDATE participants
      SET is_claimed = 1,
          claimed_at = CURRENT_TIMESTAMP,
          participant_token = ?
      WHERE id = ?
    `).run(participantToken, participant.id);

    res.json({
      success: true,
      participant_id: participant.id,
      participant_token: participantToken,
      name: participant.name,
      my_url: `/event/${eventId}/me?token=${participantToken}`
    });
  } catch (err) {
    console.error('Fehler beim Auswählen des Namens:', err);
    res.status(500).json({ error: 'Fehler beim Auswählen des Namens.' });
  }
});

/**
 * Participant's personal portal view (Wishlist & Secret Draw Result)
 */
app.get('/api/events/:id/me', (req, res) => {
  try {
    const eventId = req.params.id;
    const token = req.query.token || req.headers['x-participant-token'];

    if (!token) {
      return res.status(401).json({ error: 'Kein Teilnehmer-Token angegeben.' });
    }

    const event = db.prepare(`
      SELECT id, title, description, event_date, max_budget, banner_url, is_drawn
      FROM events WHERE id = ?
    `).get(eventId);

    if (!event) {
      return res.status(404).json({ error: 'Aktion nicht gefunden.' });
    }

    const participant = db.prepare(`
      SELECT id, name, avatar_url, wishlist_text, wishlist_url, wishlist_updated_at, is_ready, target_participant_id
      FROM participants
      WHERE event_id = ? AND participant_token = ?
    `).get(eventId, token);

    if (!participant) {
      return res.status(403).json({ error: 'Ungültiger Teilnehmer-Zugang.' });
    }

    // If drawn, load target recipient info (their wishlist & name & avatar)
    let target = null;
    if (event.is_drawn === 1 && participant.target_participant_id) {
      const recipient = db.prepare(`
        SELECT name, avatar_url, wishlist_text, wishlist_url, wishlist_updated_at
        FROM participants
        WHERE id = ?
      `).get(participant.target_participant_id);

      if (recipient) {
        target = {
          name: recipient.name,
          avatar_url: recipient.avatar_url,
          wishlist_text: recipient.wishlist_text,
          wishlist_url: recipient.wishlist_url,
          wishlist_updated_at: recipient.wishlist_updated_at
        };
      }
    }

    // Stats for the round
    const stats = getEventStats(eventId);

    res.json({
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        event_date: event.event_date,
        max_budget: event.max_budget,
        banner_url: event.banner_url,
        is_drawn: event.is_drawn === 1
      },
      participant: {
        id: participant.id,
        name: participant.name,
        avatar_url: participant.avatar_url,
        wishlist_text: participant.wishlist_text,
        wishlist_url: participant.wishlist_url,
        wishlist_updated_at: participant.wishlist_updated_at,
        is_ready: participant.is_ready === 1
      },
      stats,
      target
    });
  } catch (err) {
    console.error('Fehler beim Abrufen des Teilnehmer-Portals:', err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

/**
 * Participant updates their own profile & wishlist
 * Works both before and after the draw!
 */
app.put('/api/events/:id/me', (req, res) => {
  try {
    const eventId = req.params.id;
    const token = req.query.token || req.headers['x-participant-token'];
    const { avatar_url, wishlist_text, wishlist_url, is_ready } = req.body;

    if (!token) {
      return res.status(401).json({ error: 'Kein Teilnehmer-Token.' });
    }

    const event = db.prepare(`SELECT is_drawn FROM events WHERE id = ?`).get(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Aktion nicht gefunden.' });
    }

    const participant = db.prepare(`
      SELECT id FROM participants WHERE event_id = ? AND participant_token = ?
    `).get(eventId, token);

    if (!participant) {
      return res.status(403).json({ error: 'Ungültiger Zugang.' });
    }

    const finalReady = event.is_drawn === 1 ? 1 : (is_ready ? 1 : 0);

    db.prepare(`
      UPDATE participants
      SET avatar_url = COALESCE(?, avatar_url),
          wishlist_text = ?,
          wishlist_url = ?,
          wishlist_updated_at = CURRENT_TIMESTAMP,
          is_ready = ?
      WHERE id = ?
    `).run(
      avatar_url !== undefined ? avatar_url : null,
      wishlist_text !== undefined ? wishlist_text.trim() : '',
      wishlist_url !== undefined ? wishlist_url.trim() : '',
      finalReady,
      participant.id
    );

    const stats = getEventStats(eventId);
    res.json({ success: true, is_ready: finalReady === 1, stats });
  } catch (err) {
    console.error('Fehler beim Aktualisieren des Wunschzettels:', err);
    res.status(500).json({ error: 'Fehler beim Speichern.' });
  }
});

/**
 * Admin Dashboard View
 * STRICT PRIVACY: Admin CANNOT see target assignments!
 * Allows admin to copy participant personal links if a participant lost access.
 */
app.get('/api/events/:id/admin', (req, res) => {
  try {
    const eventId = req.params.id;
    const token = req.query.token || req.headers['x-admin-token'];

    if (!token) {
      return res.status(401).json({ error: 'Kein Admin-Token übergeben.' });
    }

    const event = db.prepare(`
      SELECT id, title, description, event_date, max_budget, banner_url, admin_token, is_drawn, drawn_at, created_at
      FROM events WHERE id = ?
    `).get(eventId);

    if (!event || event.admin_token !== token) {
      return res.status(403).json({ error: 'Ungültiges Admin-Token.' });
    }

    // STRICT PRIVACY: Admin NEVER receives participant_token!
    // This cryptographically ensures the admin can never open participant links or see drawn targets.
    const participants = db.prepare(`
      SELECT id, name, is_claimed, avatar_url, is_ready,
             CASE WHEN (wishlist_text IS NOT NULL AND length(wishlist_text) > 0)
                    OR (wishlist_url IS NOT NULL AND length(wishlist_url) > 0)
                  THEN 1 ELSE 0 END AS has_wishlist
      FROM participants
      WHERE event_id = ?
      ORDER BY name COLLATE NOCASE ASC
    `).all(eventId);

    // Fetch exclusions
    const exclusions = db.prepare(`
      SELECT id, giver_name, receiver_name
      FROM exclusions
      WHERE event_id = ?
    `).all(eventId);

    const totalCount = participants.length;
    const claimedCount = participants.filter(p => p.is_claimed === 1).length;
    const readyCount = participants.filter(p => p.is_ready === 1).length;
    const allReady = totalCount > 0 && readyCount === totalCount;

    // Check if draw is mathematically possible
    const drawValidation = validateDrawPossibility(participants, exclusions);

    res.json({
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        event_date: event.event_date,
        max_budget: event.max_budget,
        banner_url: event.banner_url,
        is_drawn: event.is_drawn === 1,
        drawn_at: event.drawn_at,
        created_at: event.created_at
      },
      participants,
      exclusions,
      stats: {
        totalCount,
        claimedCount,
        readyCount,
        allReady
      },
      validation: drawValidation
    });
  } catch (err) {
    console.error('Fehler im Admin-Dashboard:', err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

/**
 * Admin updates event settings or exclusions (before or after draw for metadata)
 */
app.put('/api/events/:id/admin', (req, res) => {
  try {
    const eventId = req.params.id;
    const token = req.query.token || req.headers['x-admin-token'];
    const { title, description, event_date, max_budget, banner_url, exclusions, new_participants } = req.body;

    const event = db.prepare(`SELECT admin_token, is_drawn FROM events WHERE id = ?`).get(eventId);
    if (!event || event.admin_token !== token) {
      return res.status(403).json({ error: 'Ungültiges Admin-Token.' });
    }

    if (event.is_drawn === 1 && ((Array.isArray(new_participants) && new_participants.length > 0) || Array.isArray(exclusions))) {
      return res.status(400).json({ error: 'Teilnehmer und Ausschlussregeln können nach der Auslosung nicht mehr geändert werden.' });
    }

    const updateTx = db.transaction(() => {
      // Update event metadata
      const updates = [];
      const params = [];
      if (title !== undefined && title.trim()) {
        updates.push('title = ?');
        params.push(title.trim());
      }
      if (description !== undefined) {
        updates.push('description = ?');
        params.push(description.trim());
      }
      if (event_date !== undefined && event_date) {
        updates.push('event_date = ?');
        params.push(event_date);
      }
      if (max_budget !== undefined) {
        updates.push('max_budget = ?');
        params.push(max_budget.trim());
      }
      if (banner_url !== undefined && banner_url) {
        updates.push('banner_url = ?');
        params.push(banner_url);
      }
      if (updates.length > 0) {
        params.push(eventId);
        db.prepare(`UPDATE events SET ${updates.join(', ')} WHERE id = ?`).run(...params);
      }

      // Add new participants if supplied (bulk support)
      if (Array.isArray(new_participants) && event.is_drawn !== 1) {
        const insertP = db.prepare(`
          INSERT INTO participants (id, event_id, name, is_claimed, is_ready)
          VALUES (?, ?, ?, 0, 0)
        `);
        for (const name of new_participants) {
          if (name && name.trim()) {
            const clean = name.trim();
            const exists = db.prepare('SELECT id FROM participants WHERE event_id = ? AND LOWER(name) = LOWER(?)').get(eventId, clean);
            if (!exists) {
              insertP.run(generateId(6), eventId, clean);
            }
          }
        }
      }

      // Update exclusions if provided
      if (Array.isArray(exclusions) && event.is_drawn !== 1) {
        db.prepare(`DELETE FROM exclusions WHERE event_id = ?`).run(eventId);
        const insertEx = db.prepare(`
          INSERT INTO exclusions (id, event_id, giver_name, receiver_name)
          VALUES (?, ?, ?, ?)
        `);
        for (const ex of exclusions) {
          if (ex.giver_name && ex.receiver_name && ex.giver_name !== ex.receiver_name) {
            insertEx.run(generateId(6), eventId, ex.giver_name.trim(), ex.receiver_name.trim());
          }
        }
      }
    });

    updateTx();
    res.json({ success: true });
  } catch (err) {
    console.error('Fehler beim Speichern der Event-Änderungen:', err);
    res.status(500).json({ error: 'Fehler beim Speichern.' });
  }
});

/**
 * Admin adds a single participant to an existing event (before draw)
 */
app.post('/api/events/:id/admin/participants', (req, res) => {
  try {
    const eventId = req.params.id;
    const token = req.query.token || req.headers['x-admin-token'];
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name darf nicht leer sein.' });
    }
    const cleanName = name.trim();

    const event = db.prepare(`SELECT admin_token, is_drawn FROM events WHERE id = ?`).get(eventId);
    if (!event || event.admin_token !== token) {
      return res.status(403).json({ error: 'Ungültiges Admin-Token.' });
    }

    if (event.is_drawn === 1) {
      return res.status(400).json({ error: 'Die Aktion wurde bereits ausgelost. Teilnehmer können nur vor der Auslosung hinzugefügt werden.' });
    }

    // Check duplicate name in this event
    const exists = db.prepare(`SELECT id FROM participants WHERE event_id = ? AND LOWER(name) = LOWER(?)`).get(eventId, cleanName);
    if (exists) {
      return res.status(400).json({ error: `Ein Teilnehmer mit dem Namen "${cleanName}" existiert bereits in dieser Aktion.` });
    }

    const newId = generateId(6);
    db.prepare(`
      INSERT INTO participants (id, event_id, name, is_claimed, is_ready)
      VALUES (?, ?, ?, 0, 0)
    `).run(newId, eventId, cleanName);

    res.json({
      success: true,
      participant: {
        id: newId,
        name: cleanName,
        is_claimed: 0,
        is_ready: 0
      }
    });
  } catch (err) {
    console.error('Fehler beim Hinzufügen des Teilnehmers:', err);
    res.status(500).json({ error: 'Serverfehler beim Hinzufügen des Teilnehmers.' });
  }
});

/**
 * Admin deletes a participant from an event (before draw)
 */
app.delete('/api/events/:id/admin/participants/:participantId', (req, res) => {
  try {
    const { id: eventId, participantId } = req.params;
    const token = req.query.token || req.headers['x-admin-token'];

    const event = db.prepare(`SELECT admin_token, is_drawn FROM events WHERE id = ?`).get(eventId);
    if (!event || event.admin_token !== token) {
      return res.status(403).json({ error: 'Ungültiges Admin-Token.' });
    }

    if (event.is_drawn === 1) {
      return res.status(400).json({ error: 'Die Aktion wurde bereits ausgelost. Teilnehmer können nach der Auslosung nicht mehr entfernt werden.' });
    }

    const participant = db.prepare(`SELECT id, name FROM participants WHERE id = ? AND event_id = ?`).get(participantId, eventId);
    if (!participant) {
      return res.status(404).json({ error: 'Teilnehmer nicht gefunden.' });
    }

    const deleteTx = db.transaction(() => {
      // Remove any exclusions referencing this participant
      db.prepare(`
        DELETE FROM exclusions
        WHERE event_id = ? AND (giver_name = ? OR receiver_name = ?)
      `).run(eventId, participant.name, participant.name);

      // Delete the participant (other participants are untouched!)
      db.prepare(`DELETE FROM participants WHERE id = ? AND event_id = ?`).run(participantId, eventId);
    });

    deleteTx();
    res.json({ success: true, message: `Teilnehmer "${participant.name}" wurde entfernt.` });
  } catch (err) {
    console.error('Fehler beim Entfernen des Teilnehmers:', err);
    res.status(500).json({ error: 'Serverfehler beim Entfernen des Teilnehmers.' });
  }
});

/**
 * Admin renames a participant (before draw)
 */
app.put('/api/events/:id/admin/participants/:participantId', (req, res) => {
  try {
    const { id: eventId, participantId } = req.params;
    const token = req.query.token || req.headers['x-admin-token'];
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name darf nicht leer sein.' });
    }
    const cleanName = name.trim();

    const event = db.prepare(`SELECT admin_token, is_drawn FROM events WHERE id = ?`).get(eventId);
    if (!event || event.admin_token !== token) {
      return res.status(403).json({ error: 'Ungültiges Admin-Token.' });
    }

    if (event.is_drawn === 1) {
      return res.status(400).json({ error: 'Namen können nach der Auslosung nicht mehr geändert werden.' });
    }

    const participant = db.prepare(`SELECT id, name FROM participants WHERE id = ? AND event_id = ?`).get(participantId, eventId);
    if (!participant) {
      return res.status(404).json({ error: 'Teilnehmer nicht gefunden.' });
    }

    // Check duplicate name
    const exists = db.prepare(`
      SELECT id FROM participants
      WHERE event_id = ? AND LOWER(name) = LOWER(?) AND id != ?
    `).get(eventId, cleanName, participantId);
    if (exists) {
      return res.status(400).json({ error: `Ein Teilnehmer mit dem Namen "${cleanName}" existiert bereits.` });
    }

    const oldName = participant.name;
    const renameTx = db.transaction(() => {
      // Update exclusions referencing old name
      db.prepare(`UPDATE exclusions SET giver_name = ? WHERE event_id = ? AND giver_name = ?`).run(cleanName, eventId, oldName);
      db.prepare(`UPDATE exclusions SET receiver_name = ? WHERE event_id = ? AND receiver_name = ?`).run(cleanName, eventId, oldName);

      // Update participant name (token, wishlist, etc. are untouched!)
      db.prepare(`UPDATE participants SET name = ? WHERE id = ?`).run(cleanName, participantId);
    });

    renameTx();
    res.json({ success: true, name: cleanName });
  } catch (err) {
    console.error('Fehler beim Umbenennen des Teilnehmers:', err);
    res.status(500).json({ error: 'Serverfehler beim Umbenennen des Teilnehmers.' });
  }
});

/**
 * Admin resets a participant claim (ONLY before draw)
 * In case a participant picked the wrong name or lost their link before the draw.
 * Admin still NEVER sees any participant token!
 */
app.post('/api/events/:id/admin/participants/:participantId/reset', (req, res) => {
  try {
    const { id: eventId, participantId } = req.params;
    const token = req.query.token || req.headers['x-admin-token'];

    const event = db.prepare(`SELECT admin_token, is_drawn FROM events WHERE id = ?`).get(eventId);
    if (!event || event.admin_token !== token) {
      return res.status(403).json({ error: 'Ungültiges Admin-Token.' });
    }

    if (event.is_drawn === 1) {
      return res.status(400).json({ error: 'Beitritte können nach der Auslosung nicht mehr zurückgesetzt werden.' });
    }

    const participant = db.prepare(`SELECT id, name FROM participants WHERE id = ? AND event_id = ?`).get(participantId, eventId);
    if (!participant) {
      return res.status(404).json({ error: 'Teilnehmer nicht gefunden.' });
    }

    db.prepare(`
      UPDATE participants
      SET is_claimed = 0,
          claimed_at = NULL,
          participant_token = NULL,
          is_ready = 0,
          avatar_url = NULL,
          wishlist_text = '',
          wishlist_url = '',
          wishlist_updated_at = NULL
      WHERE id = ? AND event_id = ?
    `).run(participantId, eventId);

    res.json({ success: true, message: `Beitritt für "${participant.name}" wurde freigegeben.` });
  } catch (err) {
    console.error('Fehler beim Zurücksetzen des Beitritts:', err);
    res.status(500).json({ error: 'Serverfehler beim Zurücksetzen des Beitritts.' });
  }
});

/**
 * Admin deletes a single exclusion rule (before draw)
 */
app.delete('/api/events/:id/admin/exclusions/:exclusionId', (req, res) => {
  try {
    const { id: eventId, exclusionId } = req.params;
    const token = req.query.token || req.headers['x-admin-token'];

    const event = db.prepare(`SELECT admin_token, is_drawn FROM events WHERE id = ?`).get(eventId);
    if (!event || event.admin_token !== token) {
      return res.status(403).json({ error: 'Ungültiges Admin-Token.' });
    }

    if (event.is_drawn === 1) {
      return res.status(400).json({ error: 'Ausschlussregeln können nach der Auslosung nicht mehr geändert werden.' });
    }

    db.prepare(`DELETE FROM exclusions WHERE id = ? AND event_id = ?`).run(exclusionId, eventId);
    res.json({ success: true });
  } catch (err) {
    console.error('Fehler beim Löschen des Ausschlusses:', err);
    res.status(500).json({ error: 'Serverfehler beim Löschen des Ausschlusses.' });
  }
});

/**
 * Admin triggers the Secret Santa draw!
 * Matches everyone respecting exclusions, records in DB, but NEVER displays pairings to admin!
 */
app.post('/api/events/:id/draw', (req, res) => {
  try {
    const eventId = req.params.id;
    const token = req.query.token || req.headers['x-admin-token'];

    const event = db.prepare(`SELECT admin_token, is_drawn FROM events WHERE id = ?`).get(eventId);
    if (!event || event.admin_token !== token) {
      return res.status(403).json({ error: 'Ungültiges Admin-Token.' });
    }

    if (event.is_drawn === 1) {
      return res.status(400).json({ error: 'Diese Wichtel-Aktion wurde bereits ausgelost!' });
    }

    const participants = db.prepare(`SELECT id, name FROM participants WHERE event_id = ?`).all(eventId);
    if (participants.length < 2) {
      return res.status(400).json({ error: 'Es werden mindestens 2 Teilnehmer für die Auslosung benötigt.' });
    }

    const exclusions = db.prepare(`SELECT giver_name, receiver_name FROM exclusions WHERE event_id = ?`).all(eventId);

    // Compute Secret Santa pairings
    const pairings = matchSecretSanta(participants, exclusions, true);
    if (!pairings) {
      return res.status(400).json({
        error: 'Auslosung nicht möglich! Mit den aktuellen Ausschlussregeln gibt es keine gültige Lösung. Bitte lockere die Ausschlüsse.'
      });
    }

    // Save pairings in DB
    const drawTx = db.transaction(() => {
      const updateTargetStmt = db.prepare(`UPDATE participants SET target_participant_id = ? WHERE id = ?`);
      for (const [giverId, receiverId] of Object.entries(pairings)) {
        updateTargetStmt.run(receiverId, giverId);
      }

      db.prepare(`
        UPDATE events
        SET is_drawn = 1,
            drawn_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(eventId);
    });

    drawTx();

    console.log(`[WichtlAG] Aktion ${eventId} erfolgreich ausgelost für ${participants.length} Teilnehmer!`);

    // We do NOT return the pairings to the admin!
    res.json({
      success: true,
      message: 'Auslosung erfolgreich durchgeführt! Alle Teilnehmer können ihren Wichtelpartner nun über ihren persönlichen Link sehen.'
    });
  } catch (err) {
    console.error('Fehler bei der Auslosung:', err);
    res.status(500).json({ error: 'Serverfehler bei der Auslosung.' });
  }
});

// Delete event manually (admin only)
app.delete('/api/events/:id', (req, res) => {
  try {
    const eventId = req.params.id;
    const token = req.query.token || req.headers['x-admin-token'];

    const event = db.prepare(`SELECT admin_token FROM events WHERE id = ?`).get(eventId);
    if (!event || event.admin_token !== token) {
      return res.status(403).json({ error: 'Ungültiges Admin-Token.' });
    }

    deleteEventUploads(eventId);
    db.prepare(`DELETE FROM events WHERE id = ?`).run(eventId);
    res.json({ success: true, message: 'Aktion wurde erfolgreich gelöscht.' });
  } catch (err) {
    console.error('Fehler beim Löschen des Events:', err);
    res.status(500).json({ error: 'Fehler beim Löschen.' });
  }
});

// In production, serve frontend client build
const clientDistPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.use((req, res, next) => {
    // If request is not an API call or upload, send SPA index.html
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      return res.sendFile(path.join(clientDistPath, 'index.html'));
    }
    next();
  });
}

// Start auto-cleanup service (runs every hour)
startCleanupSchedule();

// Graceful shutdown handling (e.g. docker stop / compose down)
function handleExit(signal) {
  console.log(`[WichtlAG] Empfange ${signal}, führe WAL-Checkpoint durch und beende Server...`);
  try {
    // Flush all WAL changes into the main sqlite file and truncate WAL
    db.pragma('wal_checkpoint(TRUNCATE)');
    db.close();
    console.log('[WichtlAG] Datenbank sauber geschlossen.');
  } catch (err) {
    console.error('[WichtlAG] Fehler beim Schließen der Datenbank:', err);
  }
  process.exit(0);
}

process.on('SIGTERM', () => handleExit('SIGTERM'));
process.on('SIGINT', () => handleExit('SIGINT'));

app.listen(PORT, () => {
  console.log(`[WichtlAG] Server läuft auf Port ${PORT}`);
  console.log(`[WichtlAG] Datenverzeichnis: ${DATA_DIR}`);
  console.log(
    `[WichtlAG] Konfiguration: Aktionserstellung=${ALLOW_EVENT_CREATION ? (CREATION_PASSWORD ? 'passwortgeschützt' : 'aktiv') : 'deaktiviert'}, Bildupload=${ALLOW_IMAGE_UPLOADS ? 'aktiv' : 'deaktiviert'}`
  );
});
