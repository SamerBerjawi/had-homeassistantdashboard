# 🏠 HAD - Home Assistant Dashboard

A futuristic, high-performance Smart Home dashboard interface built with **React 19**, **Vite**, **TypeScript**, **Tailwind CSS**, **Visx charts**, **Framer Motion**, and an integrated **Node.js Express** backend. Designed for wall-mounted tablets, desktops, and mobile devices with native **Progressive Web App (PWA)** support.

---

## ✨ Features & Capabilities

- **🎛️ Dynamic Smart Home Control**: Live Home Assistant entity controls for lights, climate, covers/blinds, switches, media players, locks, and sensors.
- **🛡️ Security & Access Hub**: Live camera feeds (HLS/WebRTC), person presence detection, door/window perimeter monitoring, alarm panel integration, and security badges.
- **⚡ Energy Flow & Grid Analytics**: Interactive energy flow visualizers and Sankey diagrams tracking solar generation, battery storage, and grid import/export.
- **🚗 Mobility & EV Telemetry**: Real-time vehicle range, battery SoC, tire pressures, location tracking, and custom vehicle asset uploads.
- **🛋️ Rooms & Multi-Floor Layout**: Floor-by-floor navigation, area card sorting, favorite areas, and custom area icon/name overrides.
- **🌤️ Grounded Weather & Forecasting**: Hourly and 7-day weather telemetry with optional Google Gemini AI grounding and local sensor failover.
- **🎨 Obsidian & Custom Theme Engine**: Custom color palettes, dark/light presets, and real-time layout personalization.
- **📱 PWA & Tablet Ready**: Optimized for iPad, Android tablets, and wall displays with offline caching and touch-friendly controls.
- **🔄 Real-Time Multi-Device Sync**: Server-Sent Events (`/api/config/stream`) and `BroadcastChannel` instantly propagate configuration changes across all open screens and tablets.

---

## 💾 NAS Storage Reliability Architecture (Database-Free)

HAD implements **database-grade reliability directly on your NAS filesystem** without requiring a database container:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Primary NAS Volume Storage (/api/config)                 │
│    • Authoritative serverVersion & optimistic concurrency   │
│    • Database-grade atomic writes with fsync                │
│    • Rolling .bak snapshots & self-healing auto-recovery    │
│    • Dual-sided material data safeguards (anti-wipeout)     │
│    • NAS HDD spin-up tolerance (retry with backoff)         │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Only if NAS is unreachable)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Home Assistant WebSocket User Storage                    │
│    • Secondary remote sync via HA frontend storage          │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Only if both NAS & HA are offline)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Browser Shadow Mirror Cache (LocalStorage)               │
│    • Instant offline read-through fallback                  │
│    • Emits 'offline_fallback' sync status in the UI         │
└─────────────────────────────────────────────────────────────┘
```

### Reliability Pillars:
1. **NAS-First Storage Priority**: When opening the dashboard, the app always attempts to read from the NAS first with spin-up retry tolerance before falling back to browser storage.
2. **Dual-Sided Material Data Safeguards**: Both client and server inspect data structures (`hasMaterialDashboardConfig`). If persistent storage contains customized rooms/entities, blank or uninitialized saves are rejected (`409 Conflict`) to eliminate accidental wipeouts.
3. **Atomic Writes with `fsync`**: File saves write to a temporary file, physically commit data to the NAS disk platters/SSD flash via `fsync` (`handle.sync()`), and atomically rename the file into place.
4. **Rolling Backups & Self-Healing**: HAD automatically maintains `dashboard-config.json.bak` and timestamped snapshots in `data/config/backups/`. If the primary JSON file is ever damaged or corrupted, HAD auto-heals the primary file from the verified backup on next read.
5. **NAS Drive Spin-Up Resiliency**: Client saves use exponential backoff retries (up to 3 attempts) and an expanded 8-second timeout, ensuring sleeping NAS hard drives have ample time to spin up without dropping saves.
6. **Tab-Close Persistence (`keepalive: true`)**: A `beforeunload` lifecycle hook flushes pending debounced modifications immediately using `fetch(..., { keepalive: true })` when closing or refreshing the tab.

---

## 🐳 Docker Deployment on NAS

The dashboard is packaged as an optimized, multi-architecture (`linux/amd64` and `linux/arm64`) Docker container suitable for NAS platforms (UGREEN, Synology Container Manager, TrueNAS, unRAID, CasaOS, Portainer) or any Docker host.

### Method 1: Using `docker-compose` (Recommended)

1. **Create a folder on your NAS** (e.g., `/volume1/docker/homz/` or `/docker/homz/`) and save the following `docker-compose.yml`:

```yaml
services:
  homz-dashboard:
    image: ghcr.io/samerberjawi/had-homeassistantdashboard:latest
    container_name: homz-dashboard
    restart: unless-stopped
    ports:
      - "${PORT:-3000}:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - GEMINI_API_KEY=${GEMINI_API_KEY:-}
    # Persistent storage volume for dashboard config JSON and uploaded vehicle assets
    volumes:
      - ./data:/app/data
    healthcheck:
      test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
```

2. **(Optional) Create a `.env` file** in the same directory:
```bash
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
```

3. **Start the container**:
```bash
docker compose up -d
```

4. **Access the Dashboard**:
Open your browser or tablet at:
`http://<YOUR-NAS-IP>:3000`

---

### Method 2: UGREEN NAS / Synology / Portainer / CasaOS UI

- **Image Name**: `ghcr.io/samerberjawi/had-homeassistantdashboard:latest`
- **Port Mapping**: Host `3000` ➔ Container `3000`
- **Volume / Directory Binding**: Host `/docker/homz/data` ➔ Container `/app/data` (Read/Write)
- **Restart Policy**: `Unless Stopped` (or `Always`)
- **Environment Variables**:
  - `NODE_ENV`: `production`
  - `PORT`: `3000`
  - `GEMINI_API_KEY`: *(Optional)* Your Google Gemini API key for live search-grounded weather.

---

### Method 3: One-Line Docker Run

```bash
docker run -d \
  --name homz-dashboard \
  --restart unless-stopped \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -e NODE_ENV=production \
  -e GEMINI_API_KEY="your_api_key_optional" \
  ghcr.io/samerberjawi/had-homeassistantdashboard:latest
```

---

## ⚙️ Environment Variables

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | No | `production` | Node execution environment |
| `PORT` | No | `3000` | Port on which the Express server listens |
| `DATA_DIR` | No | `/app/data` | Base directory for persistent files inside container |
| `DASHBOARD_CONFIG_DIR` | No | `/app/data/config` | Directory where `dashboard-config.json` and backups are stored |
| `DASHBOARD_ASSETS_DIR` | No | `/app/data/assets` | Directory where uploaded vehicle PNGs and icons are stored |
| `GEMINI_API_KEY` | No | `""` | Optional Google Gemini API key for live AI weather grounding with Google Search |
| `HASS_URL` | No | `http://homeassistant.local:8123` | Default fallback Home Assistant URL (can also be configured in the UI) |

---

## 🔄 Automatic Container Updates (Watchtower)

If you use [Watchtower](https://containrrr.dev/watchtower/) on your NAS, enable automatic updates to pull new releases immediately:

```yaml
services:
  homz-dashboard:
    image: ghcr.io/samerberjawi/had-homeassistantdashboard:latest
    container_name: homz-dashboard
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    labels:
      - "com.centurylinklabs.watchtower.enable=true"
```

---

## 🛠️ Local Development & Testing

```bash
# Clone repository
git clone https://github.com/SamerBerjawi/had-homeassistantdashboard.git
cd had-homeassistantdashboard

# Install dependencies
npm install

# Start development server (Vite + Express)
npm run dev

# Run NAS Storage automated verification test suite
npx tsx scripts/test-nas-storage.ts

# Build production bundle
npm run build

# Start production server
npm start
```

---

## 🚀 GitHub Actions CI/CD

Every push to the `main` branch or Git release tag automatically triggers [`.github/workflows/docker-publish.yml`](.github/workflows/docker-publish.yml), compiling the multi-platform Docker container (`linux/amd64`, `linux/arm64`) and publishing to GitHub Container Registry (`ghcr.io`).
