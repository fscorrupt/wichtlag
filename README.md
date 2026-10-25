# WichtlAG

<p align="center">
  <img src="public/logo.png" alt="WichtlAG Logo" width="140" />
</p>

Eine selbstgehostete Wichtel-Web-App (Secret Santa), die komplett ohne E-Mail-Server auskommt. Alles läuft über Links und Token. Der Admin kann zu keinem Zeitpunkt einsehen, wer wen gezogen hat.

![preview](https://github.com/fscorrupt/wichtlag/blob/main/sneak-peek.gif)

## Features

- **Rein linkbasiert:** Kein SMTP oder Mail-Server nötig. Einladungslink oder QR-Code genügt.
- **Admin-Geheimnis:** Auch der Ersteller der Aktion kann die Zuteilungen weder im UI noch über API-Responses einsehen.
- **Ausschlussregeln:** Ausschlüsse definierbar (z. B. Person A darf nicht Person B ziehen) mit automatischer Prüfung, ob eine Auslosung mathematisch möglich ist.
- **Wunschzettel:** Freitext für Wünsche/Abneigungen und optionaler Link zu einer externen Wunschliste.
- **Vordefinierte Namen:** Admin legt die Teilnehmer fest; jeder Name kann beim Beitreten nur einmal gewählt werden.
- **Statusübersicht:** Admin sieht, wer beigetreten ist und den Wunschzettel ausgefüllt hat, bevor die Auslosung gestartet wird.
- **Banner und Avatare:** Auswahl vorgefertigter Themes oder eigene Bilduploads.
- **Automatisches Aufräumen:** Aktionen werden 14 Tage nach dem Aktionsdatum mitsamt Datenbankeinträgen und Uploads automatisch gelöscht.

## Schnellstart mit Docker Compose

```bash
docker compose up -d
```

Die Anwendung ist anschließend unter `http://localhost:3000` erreichbar. Die SQLite-Datenbank und Uploads werden persistent unter `./data` abgelegt.

## Manuelle Installation (Node.js)

Voraussetzung: Node.js 18+

```bash
npm install
npm run build
npm start
```

Standard-Port: `3001` (über die Umgebungsvariable `PORT` anpassbar).

## Konfiguration

| Variable | Standard | Beschreibung |
|---|---|---|
| `PORT` | `3000` (Docker) / `3001` | HTTP-Port |
| `DATA_DIR` | `/app/data` (Docker) / `./data` | Pfad für SQLite-Datenbank (`wichtlag.sqlite`) und Uploads |

## Sicherheit und externer Betrieb

Wenn die Anwendung über das Internet (z. B. hinter einem Reverse Proxy) bereitgestellt wird:

- **Isolierter Container:** Der Container läuft ohne Host-Rechte.
- **Read-Only Root-Dateisystem:** Das Dateisystem des Containers ist schreibgeschützt gemountet (`read_only: true`). Lediglich `/app/data` ist beschreibbar.
- **Non-Root:** Die App läuft unter dem unprivilegierten Benutzer `node` (UID 1000).
- **Entzogene Capabilities:** Alle Linux-Kernel-Capabilities sind entzogen (`cap_drop: [ALL]`), Rechteausweitung ist unterbunden (`no-new-privileges: true`).
- **Keine Shell-Befehle:** Der Server führt intern keine Shell-Aufrufe aus. Datenbankabfragen erfolgen ausschließlich über Prepared Statements.

## Entwicklung

```bash
npm run dev
```

Startet den Express-Server auf Port 3001 und Vite mit Hot-Reloading auf Port 5173.

## Lizenz

MIT
