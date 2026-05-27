import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import Landing from "@/pages/Landing";
import Auth from "@/pages/Auth";
import AuthCallback from "@/pages/AuthCallback";
import Dashboard from "@/pages/Dashboard";
import CreateTrip from "@/pages/CreateTrip";
import TripWorkspace from "@/pages/TripWorkspace";
import PreferencesForm from "@/pages/PreferencesForm";
import Recommendations from "@/pages/Recommendations";
import DestinationDetail from "@/pages/DestinationDetail";
import Voting from "@/pages/Voting";
import FinalItinerary from "@/pages/FinalItinerary";
import JoinTrip from "@/pages/JoinTrip";
import AdminPanel from "@/pages/AdminPanel";
import CostSplitter from "@/pages/CostSplitter";
import PaymentSuccess from "@/pages/PaymentSuccess";
import SmartWeekendFinder from "@/pages/SmartWeekendFinder";
import Receipt from "@/pages/Receipt";
import TripTemplates from "@/pages/TripTemplates";
import DealFinder from "@/pages/DealFinder";
import AvailabilityHeatmap from "@/pages/AvailabilityHeatmap";
import GroupPolls from "@/pages/GroupPolls";
import GuestAvailability from "@/pages/GuestAvailability";
import BudgetTracker from "@/pages/BudgetTracker";
import SlotPriceComparison from "@/pages/SlotPriceComparison";
import FlightCoordination from "@/pages/FlightCoordination";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F6F2]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-3 border-[#2C4234] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#5C605E] font-['DM_Sans']">Loading TripSync...</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

function AppRouter() {
  const location = useLocation();
  // Check URL fragment for session_id (Google OAuth callback)
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/join/:inviteCode" element={<JoinTrip />} />
      <Route path="/guest/:token" element={<GuestAvailability />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/create-trip" element={<ProtectedRoute><CreateTrip /></ProtectedRoute>} />
      <Route path="/trip/:tripId" element={<ProtectedRoute><TripWorkspace /></ProtectedRoute>} />
      <Route path="/trip/:tripId/preferences" element={<ProtectedRoute><PreferencesForm /></ProtectedRoute>} />
      <Route path="/trip/:tripId/recommendations" element={<ProtectedRoute><Recommendations /></ProtectedRoute>} />
      <Route path="/trip/:tripId/destination/:destId" element={<ProtectedRoute><DestinationDetail /></ProtectedRoute>} />
      <Route path="/trip/:tripId/voting" element={<ProtectedRoute><Voting /></ProtectedRoute>} />
      <Route path="/trip/:tripId/itinerary" element={<ProtectedRoute><FinalItinerary /></ProtectedRoute>} />
      <Route path="/trip/:tripId/cost-splitter" element={<ProtectedRoute><CostSplitter /></ProtectedRoute>} />
      <Route path="/trip/:tripId/payment-success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
      <Route path="/trip/:tripId/smart-weekends" element={<ProtectedRoute><SmartWeekendFinder /></ProtectedRoute>} />
      <Route path="/trip/:tripId/receipt" element={<ProtectedRoute><Receipt /></ProtectedRoute>} />
      <Route path="/trip/:tripId/deals" element={<ProtectedRoute><DealFinder /></ProtectedRoute>} />
      <Route path="/trip/:tripId/availability" element={<ProtectedRoute><AvailabilityHeatmap /></ProtectedRoute>} />
      <Route path="/trip/:tripId/polls" element={<ProtectedRoute><GroupPolls /></ProtectedRoute>} />
      <Route path="/trip/:tripId/budget" element={<ProtectedRoute><BudgetTracker /></ProtectedRoute>} />
      <Route path="/trip/:tripId/slot-prices" element={<ProtectedRoute><SlotPriceComparison /></ProtectedRoute>} />
      <Route path="/trip/:tripId/flights" element={<ProtectedRoute><FlightCoordination /></ProtectedRoute>} />
      <Route path="/templates" element={<ProtectedRoute><TripTemplates /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <AppRouter />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
