# TripSync - AI-Powered All-Inclusive Group Travel Platform

## Architecture
- Frontend: React 19 + Tailwind CSS + Shadcn UI + Framer Motion + PWA
- Backend: FastAPI + WebSocket on port 8001
- Database: MongoDB (motor async)
- Auth: JWT (sessionStorage) + Google OAuth

## All Implemented Features
1. Core MVP (Phases 1-7): Auth, 10 destinations, matching, voting, itinerary, Google OAuth, WebSocket, Stripe, PWA, Smart Weekend, Weather, Templates, AI Chatbot, Deal Finder, Calendar Export, Heatmap, Polling
2. Date Range Picker (departure→return pairs)
3. Lock in Dates (owner-only, unlock, notifications)
4. Share Availability Link (guest page, no auth)
5. Mock Email Service (guest notifications on lock)
6. Guest Edit on Revisit (auto-detect by name)
7. Auto Lock Suggestion (all-overlap detection banner)
8. Slot Price Comparison (mock prices per slot, 5 destinations)
9. Flight Coordination (synchronized arrivals within 1h)
10. UI/UX Overhaul (Cormorant Garamond, editorial luxury)
11. Code Quality (MD5→SHA256, localStorage→sessionStorage, error handling)
12. Trip Budget Tracker (dedicated page + floating widget)
13. Budget Suggestions (pre-populated from destination data)
14. Slot Price Comparison Page (frontend)
15. Flight Coordination Page (frontend)
16. Stable IDs (replaced index keys across Voting, TripWorkspace, PreferencesForm, GroupPolls)
17. Component Splitting (AvailabilityHeatmap 686→457, PreferencesForm 612→401)

## Pages: 28
Landing, Auth, AuthCallback, Dashboard, CreateTrip, TripTemplates, TripWorkspace, PreferencesForm, Recommendations, DestinationDetail, Voting, FinalItinerary, CostSplitter, PaymentSuccess, Receipt, SmartWeekendFinder, DealFinder, AvailabilityHeatmap, GroupPolls, JoinTrip, AdminPanel, GuestAvailability, BudgetTracker, SlotPriceComparison, FlightCoordination

## Extracted Components
- components/DateRangePicker.js (162 lines)
- components/BudgetWidget.js (floating tracker)
- components/heatmap/HeatmapTooltip.js (43 lines)
- components/heatmap/BestPeriodsSection.js (66 lines)
- components/heatmap/HeatmapSidebar.js (142 lines — MostProbableRanges, ParticipantRangesSidebar, BestWeekendsSidebar)

## Backlog
- P1: Packing list feature
- P2: Real flight API (Amadeus/Skyscanner)
- P2: Push notifications for budget alerts
- P2: Trip photo gallery
