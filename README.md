# 🏠 HOMZ - Smart Home Assistant Dashboard

A futuristic, high-performance Smart Home dashboard interface built with React, Vite, TypeScript, Tailwind CSS, Visx charts, Three.js 3D visualizers, and an integrated Node.js Express server.

---

## 🐳 Docker Deployment on NAS

The dashboard is packaged as an optimized, multi-architecture (`linux/amd64` and `linux/arm64`) Docker container suitable for NAS platforms (UGREEN, Synology Container Manager, TrueNAS, unRAID, CasaOS, Portainer) or any Docker host.

---

### Method 1: Using `docker-compose` (Recommended)

1. **Download `docker-compose.yml`** to a folder on your NAS (e.g. `/docker/homz/` or `/volume1/docker/homz/`):

```yaml
services:
  homz-dashboard:
    image: ghcr.io/samerberjawi/had-homeassistantdashboard:latest
    container_name: homz-dashboard
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - GEMINI_API_KEY=
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
Open your browser or wall tablet at:
`http://<YOUR-NAS-IP>:3000`

---

### Method 2: UGREEN NAS / Synology / Portainer / CasaOS UI

- **Image Name**: `ghcr.io/samerberjawi/had-homeassistantdashboard:latest`
- **Port Forwarding / Mapping**:
  - Container Port: `3000`
  - Local / Host Port: `3000` (or any available port)
- **Restart Policy**: `Unless Stopped` (or `Always`)
- **Environment Variables**:
  - `NODE_ENV`: `production`
  - `PORT`: `3000`
  - `GEMINI_API_KEY`: *(Optional)* Your Google Gemini API key for live search-grounded weather.

---

### Method 3: One-line Docker Run

```bash
docker run -d \
  --name homz-dashboard \
  --restart unless-stopped \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e GEMINI_API_KEY="your_api_key_optional" \
  ghcr.io/samerberjawi/had-homeassistantdashboard:latest
```

---

## ⚙️ Environment Variables

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | No | `production` | Node execution environment |
| `PORT` | No | `3000` | Port on which the Express server listens inside the container |
| `GEMINI_API_KEY` | No | `""` | Optional Google Gemini API key for live AI weather grounding with Google Search. Fallback telemetry is used when omitted. |

---

## 🔄 Automatic Updates (Watchtower)

If you use [Watchtower](https://containrrr.dev/watchtower/) on your NAS, add the label or include the container to automatically pull new image updates as soon as they are pushed to GitHub:

```yaml
services:
  homz-dashboard:
    image: ghcr.io/samerberjawi/had-homeassistantdashboard:latest
    container_name: homz-dashboard
    restart: unless-stopped
    ports:
      - "3000:3000"
    labels:
      - "com.centurylinklabs.watchtower.enable=true"
```

---

## 🛠️ Local Development & Building from Source

To build and run locally on your development machine:

```bash
# Clone the repository
git clone https://github.com/SamerBerjawi/had-homeassistantdashboard.git
cd had-homeassistantdashboard

# Install dependencies
npm install

# Start development server
npm run dev

# Build and run production bundle locally
npm run build
npm start

# Build Docker image locally
docker build -t homz-dashboard .
docker run -p 3000:3000 homz-dashboard
```

---

## 🚀 GitHub Actions CI/CD

Every push to the `main` branch or Git release tag automatically triggers the GitHub Actions workflow [`.github/workflows/docker-publish.yml`](.github/workflows/docker-publish.yml), building multi-architecture Docker images (`linux/amd64`, `linux/arm64`) and publishing them to GitHub Container Registry (`ghcr.io`).
