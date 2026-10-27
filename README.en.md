# WichtlAG

<p align="center">
  <img src="public/logo.png" alt="WichtlAG Logo" width="120" />
</p>

<p align="center">
  <a href="README.md"><strong>🇩🇪 Deutsche Version</strong></a> &nbsp;|&nbsp; <strong>🇬🇧 English Version</strong>
</p>

Little gifts. Big excitement. WichtlAG is a self-hosted Secret Santa web application for friends, family, and teams: no registration, no passwords, and no email server needed. Invitations and personal access work via links. The organizer sees round progress and readiness, but never the secret gift pairings.

## Sneak Peek

A cozy winter look with falling snowflakes, dark and light themes, and an interface optimized for both mobile and desktop. The screenshots show the actual interface using fictional demo data. Names, wish lists, and access links belong to no real-world group.

### On Desktop

![WichtlAG on desktop: Homepage in dark winter theme with invitation code input](docs/screenshots/startseite-desktop.png)

<details>
<summary>View on Mobile</summary>

<p align="center">
  <img src="docs/screenshots/startseite-mobil.png" alt="Mobile homepage with snowflakes, event creation, and invite code input" width="320" />
</p>

</details>

### Feature Insights

<details>
<summary>Create Event: Date, budget, and shared notes</summary>

Set a title, gift exchange date, and budget. A shared note keeps meeting location and details accessible for everyone.

![First step of event creation with demo data](docs/screenshots/aktion-erstellen.png)

</details>

<details>
<summary>Set participants and exclusion rules</summary>

Add names to the group and define who must not gift whom. Built-in validation shows immediately whether a complete valid draw is mathematically possible.

![Participant list with mutual exclusion and successful draw check](docs/screenshots/teilnehmer-ausschluesse.png)

</details>

<details>
<summary>14 Banner Themes: Christmas first, other occasions included</summary>

Winter forest, northern lights, ice crystals, red-gold, and pine green are included alongside confetti, flowers, and summer motifs. Custom banners can also be uploaded.

![Gallery of all 14 event themes](docs/screenshots/themes.png)

</details>

<details>
<summary>Open invitation and select your own name</summary>

The shared invitation shows date, budget, and current status. Each person selects their own available name and receives their personal access key.

![Invitation view with event details, progress, and name selection](docs/screenshots/einladung.png)

</details>

<details>
<summary>Admin Dashboard: organize, share, and draw</summary>

The organizer manages details, participants, and exclusions, shares the invite link, and starts the draw. Personal participant links and pairings are never displayed in the admin dashboard.

![Admin dashboard with demo links, readiness status, participants, and exclusions](docs/screenshots/admin-dashboard.png)

</details>

<details>
<summary>Invite via QR Code</summary>

The shared invitation can also be displayed as a QR code and opened directly on a smartphone.

<p align="center">
  <img src="docs/screenshots/qr-einladung.png" alt="QR code modal with fictional demo invite link" width="480" />
</p>

</details>

<details>
<summary>Wish lists, 28 avatars, and ready status</summary>

Pick an avatar or upload a custom picture, list your wishes, and mark yourself ready. Wish lists can be updated anytime up until the gift exchange, even after the draw.

![Personal wish list with 28 avatars, gift ideas, and activated ready status](docs/screenshots/wunschzettel-avatare.png)

</details>

<details>
<summary>Reveal your Secret Santa giftee</summary>

After the draw, each participant opens the mystery present via their personal link to reveal their giftee and view their wish list.

![Revealed demo giftee with budget and personal gift ideas](docs/screenshots/wichtelkind.png)

</details>

## Highlights

- **No accounts or emails:** Share the invite link in your group chat or scan the QR code.
- **Secret pairings:** The admin dashboard shows participation and readiness, but never draw pairings.
- **Flexible organization:** Modify event details and banners later; add, rename, or remove participants before the draw.
- **Exclusion rules:** Prevent partners or siblings from drawing each other; optional mutual exclusions.
- **Personal wish lists:** Gift ideas, notes, and links to external wish lists (Amazon, Notion, etc.).
- **14 Themes and 28 Avatars:** Festive themes, seasonal motifs, and custom image uploads.
- **Winter design for mobile and desktop:** Falling snowflakes, persistent dark/light theme, touch-friendly, and reduced-motion support.
- **Multilingual (DE / EN):** One-click toggle between German and English in the navigation bar; centralized translation dictionary in `src/i18n/translations.js`.
- **Little surprises:** The gift icon on the homepage holds confetti and changing jokes.
- **Automatic cleanup:** Event data and uploads are automatically deleted 14 days after the gift exchange date.

## How It Works

1. Create an event with date, budget, banner, and participants.
2. Share the invitation link or QR code with your group.
3. Everyone chooses their name, fills out their wish list, and marks themselves ready.
4. The organizer triggers the draw; everyone reveals their giftee using their personal link.

**Keep personal links safe:** Your link is your access key. Do not share admin or personal participant links publicly. There is no email password-reset or login.

## Run Locally with Docker

Prerequisite: Docker with a running container engine. These commands build the current repository and publish the application locally on port 3000:

```bash
docker build -t wichtlag:local .
docker run -d --name wichtlag -p 3000:3000 --mount source=wichtlag-data,target=/app/data wichtlag:local
```

Then open **http://localhost:3000** in your browser. The named volume `wichtlag-data` persists database and uploads.

### Existing Docker Compose Configuration

The included `docker-compose.yml` is intended for operation behind **Traefik**, not for direct local port access. It uses the published image `ghcr.io/fscorrupt/wichtlag:latest` and does not automatically build local source files.

Before starting, configure `APPFOLDER` and `DOMAIN`, ensure the external network `proxy` exists, and adapt Traefik labels to your environment. `APPFOLDER` defines the persistent host directory. Then:

```bash
docker compose up -d
```

The sample route is `https://wichtel.${DOMAIN}`. For local changes, build the image as shown above or configure your Compose setup accordingly.

## Manual Installation

Recommended: **Node.js 22 LTS (22.12+)** or **Node.js 24 LTS** and npm. Modern Vite requires at least Node.js 20.19 or 22.12; Node.js 18 is not supported.

```bash
npm ci
npm run build
npm start
```

The application is accessible by default at **http://localhost:3001**. Express serves the built frontend and the API.

`better-sqlite3` requires a native module. If a prebuilt binary is not available, Python and platform C++ build tools are required (on Windows, the Visual Studio Build Tools with Desktop Development with C++). The Docker build includes these tools automatically.

## Configuration

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` locally, `3000` in Docker | Express server port |
| `DATA_DIR` | `./data` locally, `/app/data` in Docker | Directory for SQLite database and uploaded files |

New installations use `wichtlag.sqlite`. An existing `wichtelmat.sqlite` will continue to be used if no `wichtlag.sqlite` exists yet. Uploads reside in the `uploads` subdirectory.

## Privacy and Operations

- The API never transmits pairings to the admin area and never transmits personal links to the organizer.
- Access links contain secret cryptographic tokens. Use HTTPS for public deployments and treat links like passwords.
- Data stays on your own server. Anyone with direct server or database access can inspect stored data; admin UI secrecy does not replace server-side encryption against operators.
- The Docker image runs as unprivileged user `node`. The included Compose config specifies `no-new-privileges`.
- Database queries use prepared statements; SQLite operates in WAL mode.
- For backups, ensure consistent SQLite snapshots including the WAL state. Back up the uploads directory as well.

## Development

```bash
npm run dev
```

Starts the API on port 3001 and Vite on port 5173. Vite proxies `/api` and `/uploads` to the backend.

```bash
npm run build
```

Builds the production bundle into `dist`.

### Updating Screenshots

Static PNG files under `docs/screenshots` provide a real interface preview using isolated demo responses without needing a running backend.

```bash
# Terminal 1: start frontend
npm run client

# Terminal 2: generate ten screenshots
npm run screenshots
```

Playwright uses installed Microsoft Edge by default on Windows. On other platforms, install Chromium first via `npx playwright install chromium`. The optional environment variable `PLAYWRIGHT_CHANNEL` selects an alternative browser channel; `SCREENSHOT_BASE_URL` overrides the default `http://127.0.0.1:5173`.

### Logo and Browser Icons

The mascot with the red winter cap is stored as scalable SVG in `public/logo.svg`. Navigation and modern browsers consume this SVG directly. PNG logos, a 32px favicon, and a 180px Apple touch icon are also generated.

Regenerate PNG variants after modifying the SVG:

```bash
npm run icons
```

### Theme Photos

Photos are bundled locally in `public/themes`. No external connection to Unsplash is made when loading the page. Original sources: [Gift](https://images.unsplash.com/photo-1513201099705-a9746e1e201f), [Party](https://images.unsplash.com/photo-1492684223066-81342ee5ff30), [Plants](https://images.unsplash.com/photo-1416879595882-3373a0480b5b), [Summer](https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1), [City](https://images.unsplash.com/photo-1519608487953-e999c86e7455), and [Flowers](https://images.unsplash.com/photo-1490750967868-88aa4486c946).

### Translations and Localization (i18n)

All texts across the entire web application are centralized in `src/i18n/translations.js`. You can edit existing German and English texts or add new languages in that single file. The language switcher button in the top navigation bar toggles between languages and stores the selection permanently in the browser (`localStorage`).

## License

MIT
