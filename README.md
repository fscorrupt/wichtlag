# WichtlAG

<p align="center">
  <img src="public/logo.png" alt="WichtlAG Logo" width="140" />
</p>

Eine moderne, selbstgehostete Wichtel-Web-App (Secret Santa), die komplett ohne E-Mail-Server, Registrierung und Passwörter auskommt. Alles läuft über sichere Links und Token. Der Admin kann zu keinem Zeitpunkt einsehen, wer wen gezogen hat.

---

## Highlights & Features

- **Rein linkbasiert (Kein E-Mail-Server):** Kein SMTP-Setup, keine fehlerhaften Mail-Zustellungen. Teilnehmer treten einfach per Einladungslink oder QR-Code (WhatsApp, Signal, Telegram) bei.
- **100% Geheim vor dem Admin:** Der Organisator sieht im Admin-Dashboard nur den Status (wer beigetreten ist und wer fertig ist). Auch nach der Auslosung kann weder der Admin noch sonst jemand einsehen, wer wen beschenkt.
- **Wunschzettel jederzeit anpassbar:** Teilnehmer können Geschenkideen, Notizen und Links zu externen Wunschlisten (z. B. Amazon, Wunschbrille) eintragen – **auch nach der Auslosung** kann der Wunschzettel jederzeit weiter ergänzt werden.
- **Nachträglich anpassbare Aktionen:**
  - **Details & Banner:** Titel, Datum (Bescherung), Budget, Notizen und das Banner-Design (Presets oder eigenes Bild) können vom Admin jederzeit nachträglich geändert werden.
  - **Teilnehmer verwalten:** Vor der Auslosung können neue Teilnehmer hinzugefügt, Namen korrigiert oder Personen entfernt werden – **ohne bestehende Teilnehmer-Links zu verändern**.
  - **Ausschlussregeln:** Regeln wie „A darf nicht B ziehen“ können flexibel definiert, geprüft und einzeln wieder gelöscht werden.
- **Für Mobiltelefone optimiert:**
  - Speziell für Smartphones und Tablets ausgelegtes Layout.
  - Berücksichtigung von iOS-Safe-Areas (Notch & Dynamic Island) und System-Theme-Colors.
  - Schutz vor störendem iOS-Safari-Auto-Zoom bei Formularfeldern.
  - Touch-freundliche Bedienflächen und responsive Stacking aller Listen und Modals.
- **Grafische Themes & Avatare:** Große Auswahl festlicher Hintergrund-Themes und bunter Wichtel-Avatare oder Bilduploads.
- **Automatisches Aufräumen (Datensparsamkeit):** Genau 14 Tage nach dem Bescherungsdatum werden alle Event-Daten, Wunschzettel und Bild-Uploads automatisch und rückstandslos aus der Datenbank gelöscht.

---

## Schnellstart mit Docker Compose

```bash
docker compose up -d
```

Die Webanwendung ist anschließend standardmäßig unter `http://localhost:3000` erreichbar. Die SQLite-Datenbank (`wichtlag.sqlite`) und Uploads werden persistent im gemounteten Verzeichnis `./data` gespeichert.

---

## Manuelle Installation (Node.js)

Voraussetzung: **Node.js 18+**

```bash
# 1. Abhängigkeiten installieren
npm install

# 2. Frontend kompilieren
npm run build

# 3. Server starten
npm start
```

Standard-Port: `3001` (über die Umgebungsvariable `PORT` anpassbar).

---

## Konfiguration

| Umgebungsvariable | Standard | Beschreibung |
|---|---|---|
| `PORT` | `3000` (Docker) / `3001` (Lokal) | HTTP-Port der Express-App |
| `DATA_DIR` | `/app/data` (Docker) / `./data` | Pfad für SQLite-Datenbank (`wichtlag.sqlite`) und Bilduploads |

---

## Sicherheit & externer Betrieb

Wenn WichtlAG über das Internet (z. B. hinter einem Reverse Proxy wie Traefik, Caddy oder Nginx) bereitgestellt wird:

- **Isolierter Container:** Läuft ohne Host-Rechte unter dem unprivilegierten Benutzer `node` (UID 1000).
- **Read-Only Root-Dateisystem:** Das Dateisystem des Containers ist schreibgeschützt gemountet (`read_only: true`). Lediglich `/app/data` ist beschreibbar.
- **Entzogene Capabilities:** Alle Linux-Kernel-Capabilities sind entzogen (`cap_drop: [ALL]`), Rechteausweitung ist unterbunden (`no-new-privileges: true`).
- **Keine Shell-Befehle:** Der Server führt intern keine Shell-Aufrufe aus. Datenbankabfragen erfolgen über Prepared Statements (`better-sqlite3` mit WAL-Modus).
- **Admin-Privatsphäre per Design:** Die Auslosungs-Paarungen werden niemals in Admin-API-Responses übertragen.

---

## Entwicklung

```bash
npm run dev
```

Startet den Backend-Server auf Port 3001 und das Vite-Frontend mit Hot-Reloading auf Port 5173.

---

## Lizenz

MIT
