# TripSync - AI-Powered All-Inclusive Group Travel Platform

## Original Problem Statement
Pull TripSync from GitHub + enhance availability features:
1. Date range picker (departure→return pairs) instead of individual date clicks
2. Lock in Dates — owner locks final dates, can unlock, notifies all participants  
3. Share Availability Link — guests submit dates via shareable link, no account needed

## Architecture
- Frontend: React 19 + Tailwind CSS + Shadcn UI + Framer Motion + PWA
- Backend: FastAPI + WebSocket on port 8001
- Database: MongoDB (motor async) — collections: trips, preferences, guest_availability, notifications
- AI: OpenAI GPT-5.2 via Emergent LLM Key
- Auth: JWT + Google OAuth (Emergent-managed)
- Payments: Stripe

## Implemented (Phases 1-7 from GitHub + Session Work)

### From GitHub (Phases 1-7)
Phases 1-7: Full MVP with auth, destinations, matching, voting, itinerary, Google OAuth, WebSocket, Stripe, PWA, Smart Weekend Finder, Weather, Trip Templates, AI Chatbot, Deal Finder, Calendar Export, Dashboard redesign, Group Availability Heatmap, Group Polling

### Session Work (Jan 13, 2026)
1. **Date Range Picker** — Departure→Return pair selection, multiple ranges, color-coded calendar with DEP/RET labels
2. **Lock in Dates** — Owner-only lock/unlock, green banner, WebSocket + notification broadcasts
3. **Share Availability Link** — Guest page at `/guest/:token`, name + optional email + date ranges, no auth required
4. **Heatmap Integration** — Guest data merged into heatmap, most probable ranges sidebar, participant ranges display

## API Endpoints Added
- POST /api/trips/{trip_id}/lock-dates
- POST /api/trips/{trip_id}/unlock-dates  
- GET /api/trips/{trip_id}/locked-dates
- POST /api/trips/{trip_id}/guest-share-link
- GET /api/trips/guest/{token}
- POST /api/trips/guest/{token}/submit

## Pages: 24 (added GuestAvailability)

## Backlog
- P1: Email notifications to guests when dates locked
- P1: Guest edit submissions on re-visit
- P2: Auto-suggest lock when all participants overlap
- P2: Calendar sync integration
