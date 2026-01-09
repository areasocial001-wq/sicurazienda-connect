import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import NewClient from "./pages/NewClient";
import ExistingClient from "./pages/ExistingClient";
import Documents from "./pages/Documents";
import Attestati from "./pages/Attestati";
import QRCodeHistory from "./pages/QRCodeHistory";
import QRCodeStats from "./pages/QRCodeStats";
import QRRedirect from "./pages/QRRedirect";
import AdminDashboard from "./pages/AdminDashboard";
import UserRoleManager from "./pages/UserRoleManager";
import ContactRequest from "./pages/ContactRequest";
import Profile from "./pages/Profile";
import AppDocumentation from "./pages/AppDocumentation";
import Assistente from "./pages/Assistente";
import CRM from "./pages/CRM";
import CRMAnalytics from "./pages/CRMAnalytics";
import CRMCalendar from "./pages/CRMCalendar";
import NotFound from "./pages/NotFound";
import ScanNotifications from "./components/ScanNotifications";
import { FloatingChat } from "./components/FloatingChat";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScanNotifications />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/new-client" element={<NewClient />} />
          <Route path="/existing-client" element={<ExistingClient />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/attestati" element={<Attestati />} />
          <Route path="/qr-history" element={<QRCodeHistory />} />
          <Route path="/qr-stats/:id" element={<QRCodeStats />} />
          <Route path="/qr/:id" element={<QRRedirect />} />
          <Route path="/admin" element={<AdminDashboard />} />
          {/* Alias: percorso richiesto */}
          <Route path="/admin/users" element={<UserRoleManager />} />
          <Route path="/user-roles" element={<UserRoleManager />} />
          <Route path="/contact-request" element={<ContactRequest />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/documentazione" element={<AppDocumentation />} />
          <Route path="/assistente" element={<Assistente />} />
          <Route path="/crm" element={<CRM />} />
          <Route path="/crm/analytics" element={<CRMAnalytics />} />
          <Route path="/crm/calendar" element={<CRMCalendar />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <FloatingChat />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
