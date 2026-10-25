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
import { startCleanupSchedule } from './cleanup.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(UPLOADS_DIR));

// Setup multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const uniqueName = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
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

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

/**
 * Upload an image (banner or avatar)
 */
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Keine Datei hochgeladen.' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
});

/**
 * Create a new Secret Santa event
 */
app.post('/api/events', (req, res) => {
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
        banner_url || 'preset:winter1',
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

    res.json({
      event,
      participants
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
      SELECT id, name, avatar_url, wishlist_text, wishlist_url, is_ready, target_participant_id
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
        SELECT name, avatar_url, wishlist_text, wishlist_url
        FROM participants
        WHERE id = ?
      `).get(participant.target_participant_id);

      if (recipient) {
        target = {
          name: recipient.name,
          avatar_url: recipient.avatar_url,
          wishlist_text: recipient.wishlist_text,
          wishlist_url: recipient.wishlist_url
        };
      }
    }

    res.json({
      event,
      participant: {
        id: participant.id,
        name: participant.name,
        avatar_url: participant.avatar_url,
        wishlist_text: participant.wishlist_text,
        wishlist_url: participant.wishlist_url,
        is_ready: participant.is_ready === 1
      },
      target
    });
  } catch (err) {
    console.error('Fehler beim Abrufen des Teilnehmer-Portals:', err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

/**
 * Participant updates their own profile & wishlist
 */
app.put('/api/events/:id/me', (req, res) => {
  try {
    const eventId = req.params.id;
    const token = req.query.token || req.headers['x-participant-token'];
    const { avatar_url, wishlist_text, wishlist_url, is_ready } = req.body;

    if (!token) {
      return res.status(401).json({ error: 'Kein Teilnehmer-Token.' });
    }

    const participant = db.prepare(`
      SELECT id FROM participants WHERE event_id = ? AND participant_token = ?
    `).get(eventId, token);

    if (!participant) {
      return res.status(403).json({ error: 'Ungültiger Zugang.' });
    }

    db.prepare(`
      UPDATE participants
      SET avatar_url = COALESCE(?, avatar_url),
          wishlist_text = ?,
          wishlist_url = ?,
          is_ready = ?
      WHERE id = ?
    `).run(
      avatar_url !== undefined ? avatar_url : null,
      wishlist_text !== undefined ? wishlist_text.trim() : '',
      wishlist_url !== undefined ? wishlist_url.trim() : '',
      is_ready ? 1 : 0,
      participant.id
    );

    res.json({ success: true, is_ready: !!is_ready });
  } catch (err) {
    console.error('Fehler beim Aktualisieren des Wunschzettels:', err);
    res.status(500).json({ error: 'Fehler beim Speichern.' });
  }
});

/**
 * Admin Dashboard View
 * STRICT PRIVACY: Admin CANNOT see target assignments or other participants' private tokens!
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

    // Fetch participants without sensitive pairings
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
 * Admin updates event settings or exclusions (before draw)
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

    if (event.is_drawn === 1) {
      return res.status(400).json({ error: 'Aktion wurde bereits ausgelost und kann nicht mehr geändert werden.' });
    }

    const updateTx = db.transaction(() => {
      // Update event metadata
      db.prepare(`
        UPDATE events
        SET title = COALESCE(?, title),
            description = COALESCE(?, description),
            event_date = COALESCE(?, event_date),
            max_budget = COALESCE(?, max_budget),
            banner_url = COALESCE(?, banner_url)
        WHERE id = ?
      `).run(title, description, event_date, max_budget, banner_url, eventId);

      // Add new participants if supplied
      if (Array.isArray(new_participants)) {
        const insertP = db.prepare(`
          INSERT INTO participants (id, event_id, name, is_claimed, is_ready)
          VALUES (?, ?, ?, 0, 0)
        `);
        for (const name of new_participants) {
          if (name && name.trim()) {
            insertP.run(generateId(6), eventId, name.trim());
          }
        }
      }

      // Update exclusions if provided
      if (Array.isArray(exclusions)) {
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

app.listen(PORT, () => {
  console.log(`[WichtlAG] Server läuft auf Port ${PORT}`);
  console.log(`[WichtlAG] Datenverzeichnis: ${DATA_DIR}`);
});
