# TripSync - AI-Powered All-Inclusive Group Travel Platform

## Architecture
- Frontend: React 19 + Tailwind CSS + Shadcn UI + Framer Motion + PWA
- Backend: FastAPI + WebSocket on port 8001
- Database: MongoDB (motor async) — collections: trips, preferences, guest_availability, notifications, votes, destinations
- AI: OpenAI GPT-5.2 via Emergent LLM Key
- Auth: JWT + Google OAuth
- Payments: Stripe

## All Implemented Features

### Core (Phases 1-7 from GitHub)
Full MVP with auth, 10 destinations, matching, voting, itinerary, Google OAuth, WebSocket, Stripe, PWA, Smart Weekend Finder, Weather, Trip Templates, AI Chatbot, Deal Finder, Calendar Export, Group Availability Heatmap, Group Polling

### Session Work
1. **Date Range Picker** — Departure→Return pair selection, multiple ranges, color-coded DEP/RET labels
2. **Lock in Dates** — Owner-only lock/unlock, green banner, WebSocket + notifications
3. **Share Availability Link** — Guest page `/guest/:token`, no auth, name + optional email + ranges
4. **Mock Email Service** — Logs emails in-memory, sends to guests when dates locked
5. **Guest Edit on Revisit** — Auto-detects returning guest by name, pre-fills date ranges + email
6. **Auto Lock Suggestion** — Detects when ALL participants overlap, prompts owner with green banner
7. **Slot Price Comparison API** — Simulated flight+hotel prices per time slot across destinations
8. **Flight Coordination API** — Synchronized arrival suggestions for multi-city groups
9. **UI/UX Overhaul** — Cormorant Garamond headings, editorial luxury design, glassmorphism, aerial hero

## API Endpoints
- POST /api/trips/{id}/lock-dates, /unlock-dates, /guest-share-link
- GET /api/trips/{id}/locked-dates, /slot-prices, /flight-coordination
- GET /api/trips/guest/{token}, /guest/{token}/check/{name}
- POST /api/trips/guest/{token}/submit
- GET /api/email-log

## Pages: 25 (added GuestAvailability + SlotPrices coming)

## Backlog
- P0: Frontend UI for Slot Price Comparison + Flight Coordination pages
- P1: Continue UI overhaul on Dashboard, TripWorkspace, Recommendations
- P1: Accommodation & restaurant deep links in Destination Detail
- P2: Trip Budget Tracker
- P2: Real email integration (SendGrid/Resend)
