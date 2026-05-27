# TripSync - AI-Powered All-Inclusive Group Travel Platform

## Architecture
- Frontend: React 19 + Tailwind CSS + Shadcn UI + Framer Motion + PWA
- Backend: FastAPI + WebSocket on port 8001
- Database: MongoDB (motor async)
- AI: OpenAI GPT-5.2 via Emergent LLM Key
- Auth: JWT (sessionStorage) + Google OAuth
- Payments: Stripe

## All Implemented Features
1. Core MVP (Phases 1-7): Auth, 10 destinations, matching, voting, itinerary, Google OAuth, WebSocket, Stripe, PWA, Smart Weekend, Weather, Templates, AI Chatbot, Deal Finder, Calendar Export, Heatmap, Polling
2. Date Range Picker (departure→return pairs)
3. Lock in Dates (owner-only, notifications)
4. Share Availability Link (guest page, no auth)
5. Mock Email Service (guest notifications)
6. Guest Edit on Revisit (auto-detect by name)
7. Auto Lock Suggestion (all-overlap detection)
8. Slot Price Comparison API (mock prices per slot)
9. Flight Coordination API (synchronized arrivals)
10. UI/UX Overhaul (Cormorant Garamond, editorial luxury)

## Code Quality Session
- MD5 → SHA-256 for hashing
- localStorage → sessionStorage for auth tokens
- Added error logging to 6 empty catch blocks
- Extracted 3 helper functions from heatmap endpoint
- Cleaned up imports, removed unused variables

## Backlog
- P0: Trip Budget Tracker (dedicated page + floating widget)
- P0: Frontend UI for Slot Price Comparison + Flight Coordination
- P1: Replace index keys with stable IDs (Voting, TripWorkspace, etc.)
- P1: Component splitting (AvailabilityHeatmap, PreferencesForm)
- P2: Continue UI overhaul on remaining pages
