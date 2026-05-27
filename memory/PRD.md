# TripSync — AI-Powered Group Travel Platform

## Architecture
React 19 + Tailwind + Shadcn + Framer Motion | FastAPI + WebSocket | MongoDB | JWT (sessionStorage) + Google OAuth | Stripe

## 28 Pages
Landing, Auth, AuthCallback, Dashboard, CreateTrip, TripTemplates, TripWorkspace, PreferencesForm, Recommendations, DestinationDetail, Voting, FinalItinerary, CostSplitter, PaymentSuccess, Receipt, SmartWeekendFinder, DealFinder, AvailabilityHeatmap, GroupPolls, JoinTrip, AdminPanel, GuestAvailability, BudgetTracker, SlotPriceComparison, FlightCoordination

## 17 Major Features
1. Core MVP (Auth, 10 destinations, matching, voting, itinerary)
2. Google OAuth + WebSocket + Stripe
3. PWA + Smart Weekend Finder + Weather
4. Trip Templates + AI Chatbot (GPT-5.2) + Deal Finder + Calendar Export
5. Date Range Picker (departure→return pairs)
6. Lock in Dates + Unlock (owner-only, notifications)
7. Share Availability Link (guest page, no auth)
8. Mock Email Service + Guest Edit on Revisit
9. Auto Lock Suggestion
10. Slot Price Comparison (mock prices per slot)
11. Flight Coordination (synchronized arrivals within 1h)
12. Trip Budget Tracker (dedicated page + floating widget + suggestions)
13. UI/UX Overhaul (Cormorant Garamond, editorial luxury)
14. Code Quality (SHA256, sessionStorage, error handling, refactoring)
15. Component Splitting (Heatmap 686→457, PreferencesForm 612→401)
16. Trip Progress Bar (6-step visual pipeline)
17. Trip Readiness Score + Smart Summary + Next Action
