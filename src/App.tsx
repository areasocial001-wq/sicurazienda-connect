import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import NewClient from "./pages/NewClient";
import ExistingClient from "./pages/ExistingClient";
import Documents from "./pages/Documents";
import MyDocuments from "./pages/MyDocuments";
import Attestati from "./pages/Attestati";
import QRCodeHistory from "./pages/QRCodeHistory";
import QRCodeStats from "./pages/QRCodeStats";
import QRRedirect from "./pages/QRRedirect";
import AdminDashboard from "./pages/AdminDashboard";
import UserRoleManager from "./pages/UserRoleManager";
import PermissionStatus from "./pages/PermissionStatus";
import AuditLog from "./pages/AuditLog";
import ContactRequest from "./pages/ContactRequest";
import Profile from "./pages/Profile";
import AppDocumentation from "./pages/AppDocumentation";
import Assistente from "./pages/Assistente";
import CRM from "./pages/CRM";
import CRMContactDetail from "./pages/CRMContactDetail";
import CRMAnalytics from "./pages/CRMAnalytics";
import CRMCalendar from "./pages/CRMCalendar";
import CRMDocumentStats from "./pages/CRMDocumentStats";
import CRMDashboard from "./pages/CRMDashboard";
import CRMEmployeeDeadlines from "./pages/CRMEmployeeDeadlines";
import CRMOrphanedItems from "./pages/CRMOrphanedItems";
import NotFound from "./pages/NotFound";
import AuthConfirm from "./pages/AuthConfirm";
import ResetPassword from "./pages/ResetPassword";
import ScanNotifications from "./components/ScanNotifications";
import { FloatingChat } from "./components/FloatingChat";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScanNotifications />
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/confirm" element={<AuthConfirm />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/qr/:id" element={<QRRedirect />} />
          <Route path="/new-client" element={<NewClient />} />
          <Route path="/existing-client" element={<ExistingClient />} />
          <Route path="/contact-request" element={<ContactRequest />} />
          
          {/* Protected routes - require authentication */}
          <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
          <Route path="/my-documents" element={<ProtectedRoute><MyDocuments /></ProtectedRoute>} />
          <Route path="/attestati" element={<ProtectedRoute><Attestati /></ProtectedRoute>} />
          <Route path="/qr-history" element={<ProtectedRoute><QRCodeHistory /></ProtectedRoute>} />
          <Route path="/qr-stats/:id" element={<ProtectedRoute><QRCodeStats /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/documentazione" element={<ProtectedRoute><AppDocumentation /></ProtectedRoute>} />
          <Route path="/assistente" element={<ProtectedRoute><Assistente /></ProtectedRoute>} />
          <Route path="/crm" element={<ProtectedRoute><CRM /></ProtectedRoute>} />
          <Route path="/crm/contact/:id" element={<ProtectedRoute><CRMContactDetail /></ProtectedRoute>} />
          <Route path="/crm/analytics" element={<ProtectedRoute><CRMAnalytics /></ProtectedRoute>} />
          <Route path="/crm/calendar" element={<ProtectedRoute><CRMCalendar /></ProtectedRoute>} />
          <Route path="/crm/document-stats" element={<ProtectedRoute><CRMDocumentStats /></ProtectedRoute>} />
          <Route path="/crm/dashboard" element={<ProtectedRoute><CRMDashboard /></ProtectedRoute>} />
          <Route path="/crm/employee-deadlines" element={<ProtectedRoute><CRMEmployeeDeadlines /></ProtectedRoute>} />
          <Route path="/crm/orphaned" element={<ProtectedRoute><CRMOrphanedItems /></ProtectedRoute>} />
          
          {/* Admin routes - require admin role */}
          <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute requireAdmin><UserRoleManager /></ProtectedRoute>} />
          <Route path="/admin/permission-status" element={<ProtectedRoute requireAdmin><PermissionStatus /></ProtectedRoute>} />
          <Route path="/admin/audit-log" element={<ProtectedRoute requireAdmin><AuditLog /></ProtectedRoute>} />
          <Route path="/user-roles" element={<ProtectedRoute requireAdmin><UserRoleManager /></ProtectedRoute>} />
          
          {/* Catch-all route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <FloatingChat />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
