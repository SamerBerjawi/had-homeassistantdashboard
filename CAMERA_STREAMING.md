# Camera Streaming Pipeline Architecture & Configuration Guide

This document describes the multi-tier camera streaming pipeline in the HOMZ Home Assistant Dashboard, including the two-mode player architecture, negotiation concurrency gating, go2rtc discovery across multi-host / NAS deployments, and H.265 (HEVC) transcode requirements for RTSP cameras.

---

## 1. Two-Mode Player Architecture (`Preview` vs. `Live`)

To eliminate CPU and network saturation when displaying dashboards with multiple cameras, the dashboard separates camera feeds into two explicit modes:

### A. Preview Mode (Grid Tiles, Cards & List Views)
- **Where**: `CameraCard`, `CameraFeedSection` (Overview grid), and `AreaDetailView`.
- **Behavior**: Renders periodically-refreshed, authenticated snapshots (`/api/camera_proxy/{entity_id}` or go2rtc `/api/frame.jpeg`) every 4 seconds.
- **Resource Impact**: **Zero** `RTCPeerConnection` negotiations, **zero** continuous video decoding, and **zero** WebSocket offer/answer traffic.
- **Affordance**: Displays a subtle "Tap for Live Stream" overlay on hover or tap.

### B. Live Mode (Detail Modals, Fullscreen, Single Player)
- **Where**: `CameraStreamModal`, `CameraDetailModal`, `CameraControlView`.
- **Behavior**: Runs the full multi-tier fallback cascade:
  1. **Tier 1: Native WebRTC** (Duplex HA WebSocket signaling / go2rtc direct, 4s budget) &rarr; Ultra-low latency (< 500ms).
  2. **Tier 2: HLS Stream** (`camera/get_stream` via Hls.js / Native WebKit HLS, 6s budget) &rarr; Resilient buffered stream.
  3. **Tier 3: MJPEG Proxy** (`/api/camera_proxy_stream`) &rarr; Universal fallback.
  4. **Tier 4: Snapshot Stills** (`/api/camera_proxy`) &rarr; Offline / last resort.
- **Session Tier Memory**: Remembers the successful streaming tier for each camera during the session to avoid re-paying the 4s WebRTC timeout on subsequent opens, with a manual **"Retry WebRTC"** action in the player UI.

---

## 2. Stream Concurrency Limiter (`streamConcurrencyManager`)

- **Concurrency Cap**: Strictly limits simultaneous in-flight WebRTC and HLS stream negotiations to **2** across the entire application.
- **Backpressure & Queueing**: Additional live player requests queue seamlessly and display a `"Waiting for stream slot..."` status until an active negotiation completes or falls back.
- **Slot Release**: Slots are released as soon as a stream connects, falls back to MJPEG/snapshot, errors out, or the player component unmounts.

---

## 3. go2rtc Discovery for Multi-Host / NAS Deployments

In typical setups where the HOMZ dashboard container runs on a NAS or separate server from the Home Assistant host:
- **Automatic Derivation**: By default, go2rtc endpoints are derived from the configured Home Assistant server URL's hostname (e.g. `http://<home-assistant-ip>:1984`), not `localhost` or `window.location.hostname`.
- **Manual Override in Settings**: In **Settings &rarr; Connection & WebSockets**, users can explicitly set the go2rtc URL.
  - *Recommended setting for separate NAS deployment*: `http://<home-assistant-ip>:1984`
- **Real-Time Health Monitoring**: The Settings UI continuously monitors go2rtc availability and round-trip latency. If go2rtc is unreachable, an app-level diagnostic banner indicates that RTSP feeds will use degraded MJPEG proxy fallback.

---

## 4. H.265 / HEVC Transcode Handling (e.g. Eufy E21, RTSP Generic Cameras)

### The Problem
WebRTC in standard web browsers (Chrome, Safari, Firefox, Edge) requires **H.264**, VP8, or VP9 video codecs. Many modern security cameras (such as the **Eufy E21** and certain RTSP generics) default their primary RTSP stream to **H.265 (HEVC)**. When relayed over WebRTC without transcoding, the browser cannot decode the incoming video track, causing negotiation failure.

### The Solution: go2rtc Transcode Directive
Configure the camera in your go2rtc configuration (`go2rtc.yaml` or Home Assistant go2rtc add-on configuration) with the `#video=h264` directive:

```yaml
streams:
  # Eufy E21 or generic H.265 RTSP camera
  driveway_camera:
    - rtsp://admin:password@192.168.1.120:554/live/ch0#video=h264

  # Tapo C260 (Native H.264 RTSP — no transcode directive required)
  backyard_tapo:
    - rtsp://admin:password@192.168.1.130:554/stream1
```

### In-App Codec Controls
- **Detection & Actionable Guidance**: When a stream fails due to H.265 codec mismatch, the player displays a diagnostic banner with a one-click button to copy the exact `streams:` YAML config snippet to the clipboard.
- **Per-Camera Codec Preference**: In the camera detail and controls modal, users can select:
  - `Auto`: Automatic detection (default).
  - `Force H.264 Transcode`: Appends `#video=h264` to go2rtc stream requests.
  - `Copy (Passthrough)`: Relays native codec without transcoding.

---

## 5. Supported Camera Reference

| Camera Model / Type | Integration Path | Default Codec | Recommended Mode |
|---|---|---|---|
| **Tapo C260** | Official Tapo Cameras HA Integration | H.264 | Native WebRTC (Direct passthrough) |
| **Eufy E21** | Generic Camera (RTSP) / go2rtc | H.265 (HEVC) | WebRTC with `#video=h264` transcode |
| **Any Generic RTSP** | Generic Camera / go2rtc | H.264 or H.265 | Auto / Force H.264 if H.265 |
