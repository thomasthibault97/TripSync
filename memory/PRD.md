# TripSync - AI-Powered All-Inclusive Group Travel Platform

## Original Problem Statement
Pull TripSync project from GitHub and modify the availability date picker:
- Change from individual date selection to date RANGE selection (departure→return pairs)
- 1st click = departure, 2nd = return, 3rd = new departure, 4th = new return, etc.
- All ranges from all users visible on heatmap
- Sidebar shows "Most Probable Travel Dates" highlighting best overlapping ranges

## Architecture
- Frontend: React 19 + Tailwind CSS + Shadcn UI + Framer Motion + PWA
- Backend: FastAPI + WebSocket on port 8001
- Database: MongoDB (motor async)
- AI: OpenAI GPT-5.2 via Emergent LLM Key
- Auth: JWT + Google OAuth (Emergent-managed)
- Payments: Stripe via Emergent integrations

## What's Been Implemented

### From GitHub (Phases 1-7)
- Phase 1: Core MVP - Auth, 10 destinations, matching engine, voting, itinerary
- Phase 2: Google OAuth, WebSocket, Stripe payments, Cost Splitter
- Phase 3: PWA, Smart Weekend Finder, Weather, Notifications, Receipts
- Phase 4: Trip Templates, AI Chatbot (GPT-5.2), Deal Finder, Calendar Export
- Phase 5: Dashboard redesign, Departure/Return city+time preferences, Time scoring
- Phase 6: Group Availability Heatmap
- Phase 7: Group Polling

### Session Work (Jan 13, 2026)
- **Date Range Picker**: Replaced FlexibleDatePicker with DateRangePicker
  - Departure→Return pair selection mode
  - Multiple ranges with color coding
  - DEP/RET labels on calendar
  - Removable range list
  - Hover preview during selection
- **Backend**: Added `date_ranges` field to PreferencesInput model
  - Backward compatible with old `available_dates` format
  - Computes `most_probable_ranges` with overlap analysis
  - Participant grid includes ranges per user
- **Heatmap Sidebar**: "Most Probable Travel Dates" section
  - Ranked by overlap score
  - Shows full/partial overlap users
  - Progress bars and user chips

## Pages: 23
Landing, Auth, AuthCallback, Dashboard, CreateTrip, TripTemplates,
TripWorkspace, PreferencesForm, Recommendations, DestinationDetail,
Voting, FinalItinerary, CostSplitter, PaymentSuccess, Receipt,
SmartWeekendFinder, DealFinder, AvailabilityHeatmap, GroupPolls,
JoinTrip, AdminPanel

## Backlog / P1
- Multi-user overlap testing with real group data
- "Lock in dates" feature when group consensus reached
- Share availability link for non-registered users

## P2 / Future
- Calendar sync (Google Calendar integration)
- Push notifications for date changes
