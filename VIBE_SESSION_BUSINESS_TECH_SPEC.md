# Vibe Sessions Studio - Business & Technical Specification

## 1. Executive Summary
Vibe Sessions Karaoke is an enterprise-grade, reseller-ready karaoke and digital signage edge platform. Designed with "Billion-Dollar" aesthetics and industrial-grade reliability, it transforms any standard commercial display into a high-end karaoke performance stage. The system is controlled entirely remotely via mobile devices (tablets/smartphones) acting as dedicated kiosks, creating a seamless, touchless experience for venue patrons. 

## 2. Business Model & Value Proposition
The platform is designed for B2B rapid scalability. It solves two major pain points for hospitality venues: providing interactive entertainment, and maximizing idle screen time for internal marketing.

### Value Proposition
*   **For the Venue:** A dual-purpose entertainment and marketing tool. During active sessions, it drives drink sales through high-energy entertainment. During idle periods, the Stage display converts into a premium digital billboard (Digital Signage) upselling promotions.
*   **For the Patrons:** A modern, mobile-first, Netflix-style interface for song selection without waiting in line for a physical karaoke book or an outdated terminal.

### Revenue Model Strategy (Hybrid SaaS)
*   **Tier 1: Cloud SaaS (Software Only)** 
    *   **Structure:** $99-$199/month recurring subscription per venue.
    *   **Deployment:** The venue uses their own hardware (Smart TV browser + iPads). They access the application via a unique tenant URL (e.g., `venueA.vibesessions.com`).
    *   **Pro:** Infinitely scalable, zero hardware fulfillment costs, high margin.
*   **Tier 2: Hardware Appliance (Concierge Setup)** 
    *   **Structure:** $500-$1,500 upfront hardware sale + monthly subscription.
    *   **Deployment:** Reseller provides a pre-configured Micro-PC (e.g., Raspberry Pi 5, Intel NUC) that boots directly into the Stage display upon receiving power.
    *   **Pro:** High upfront revenue, "Applesque" unboxing experience, lower technical barrier for the venue owner.

---

## 3. Core Architecture & Technology Stack
The application follows a lightweight, real-time decoupled architecture.

*   **Frontend (UI Layer):** React 18, Vite. Vanilla CSS is utilized for UI styling to allow for extreme, un-opinionated customization (Glassmorphism, Neon typography, 60fps Kinetic animations).
*   **Backend (API & State):** Node.js with Express.js. Maintains the in-memory queue and handles external API routing.
*   **Real-time Communication:** Socket.IO. Handles bidirectional sub-100ms synchronization between the Kiosk clients and the Stage display.
*   **Media Provider:** Official YouTube Data API v3 (for high-fidelity search), with an autonomous fallback to `yt-search` (HTML scraping) to bypass strict API quotas or restrictive content flags.

---

## 4. Key Components

### A. The "Stage" (Display Output)
The Stage is the visual output meant for the main television or projector.
*   **Browser Autoplay Bypass:** Implements a stateful "Interaction Gate" requiring a single initial click to appease modern Chrome/Safari autoplay policies, ensuring uninterrupted looping playback.
*   **Intelligence Fallback:** Monitors the YouTube IFrame Player API. If the `ended` event fails to fire (due to YouTube tracking blockers), a proprietary logic block detects 99.5% completion and forces the transition.
*   **Connection Watchdog:** A background routine polls the WebSocket connection. If the television loses internet for >30 seconds, the frontend forces a hard reload upon reconnection to prevent infinite hang states.
*   **Cinematic Transitions:** Features complex CSS lifecycle animations (e.g., a 20-second countdown preparation timer, dynamic "Next Singer" scrolling marquees).

### B. The "Kiosk" (Input Controller)
The Kiosk is the web application loaded on iPads or patrons' phones.
*   **Billion-Dollar UI:** Netflix-style horizontal carousels and glassmorphic modal overlays. 
*   **Real-time Queue Control:** Searching, adding with custom singer names, and remote cancellation of the currently playing song instantly updates the active Stage.
*   **Stateless Feed:** Retrieves categorized recommended playlists (`/api/feed`) directly from the Node backend on load.

### C. Infrastructure & Reseller Configuration
*   **`settings.json` Abstraction:** All branding (Business Name, Logo Paths, API Keys) is decoupled from the compiled React source into a root `settings.json` file. This allows resellers to rebrand the application per venue instantly without requiring a new webpack build.
*   **One-Click Installer:** Includes `vibe-setup.sh` for instant dependency installation and daemon management on macOS/Linux hardware targets.

---

## 5. Deployment & DevOps Strategy
The application is fully containerized for modern cloud deployment.

*   **Docker Integration:** Features a multi-stage `Dockerfile`. 
    *   *Stage 1:* Compiles the Vite React bundle.
    *   *Stage 2:* Injects the static bundle into a lightweight Node.js Alpine image.
*   **Coolify / PaaS Ready:** The repository can be linked directly to Coolify (or Render/Heroku). Coolify will automatically read the Dockerfile, build the image, expose port `3001`, and attach SSL certificates via Traefik/Caddy.

---

## 6. Future Roadmap (Phase 13+)

**1. The Digital Signage Pivot (Admin Portal):**
*   Develop a secure `/admin` react route.
*   Allow venue managers to upload promotional images or type promotional ticker text (e.g., "Happy Hour Specials").
*   Update the Stage's idle lifecycle to rotate through these promotions alongside the Vibe Session branding.

**2. Multi-Tenant Room Isolation:**
*   Implement URL-parameter based socket rooms (`?room=venue-x`).
*   This will allow a single deployment on Coolify to serve thousands of completely isolated bars simultaneously, validating the pure SaaS business model.
