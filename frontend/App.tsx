import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import TicketList from "./pages/TicketList";
import TicketDetail from "./pages/TicketDetail";
import CreateTicket from "./pages/CreateTicket";
import BulkImport from "./pages/BulkImport";
import UserManagement from "./pages/UserManagement";
import Settings from "./pages/Settings";
import AssetList from "./pages/AssetList";
import AssetDetail from "./pages/AssetDetail";
import CreateAsset from "./pages/CreateAsset";
import BulkImportAssets from "./pages/BulkImportAssets";
import AssetDashboard from "./pages/AssetDashboard";
import AssetAudit from "./pages/AssetAudit";
import PrintAssetLabel from "./pages/PrintAssetLabel";

const queryClient = new QueryClient();

function AppRoutes() {
  const { isAuthenticated, user } = useAuth();

  return (
    <Layout>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Landing />} />
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* Protected routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute allowedRoles={["admin", "engineer"]}>
            <Dashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/tickets" element={
          <ProtectedRoute allowedRoles={["admin", "engineer", "reporter"]}>
            <TicketList />
          </ProtectedRoute>
        } />
        
        <Route path="/tickets/new" element={
          <ProtectedRoute allowedRoles={["admin", "reporter"]}>
            <CreateTicket />
          </ProtectedRoute>
        } />
        
        <Route path="/tickets/bulk-import" element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <BulkImport />
          </ProtectedRoute>
        } />
        
        <Route path="/tickets/:id" element={
          <ProtectedRoute allowedRoles={["admin", "engineer", "reporter"]}>
            <TicketDetail />
          </ProtectedRoute>
        } />

        {/* Asset Management Routes */}
        <Route path="/assets" element={
          <ProtectedRoute allowedRoles={["admin", "engineer", "reporter"]}>
            <AssetList />
          </ProtectedRoute>
        } />
        <Route path="/assets/dashboard" element={
          <ProtectedRoute allowedRoles={["admin", "engineer"]}>
            <AssetDashboard />
          </ProtectedRoute>
        } />
        <Route path="/assets/new" element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <CreateAsset />
          </ProtectedRoute>
        } />
        <Route path="/assets/bulk-import" element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <BulkImportAssets />
          </ProtectedRoute>
        } />
        <Route path="/assets/audit" element={
          <ProtectedRoute allowedRoles={["admin", "engineer"]}>
            <AssetAudit />
          </ProtectedRoute>
        } />
        <Route path="/assets/:id" element={
          <ProtectedRoute allowedRoles={["admin", "engineer", "reporter"]}>
            <AssetDetail />
          </ProtectedRoute>
        } />
        <Route path="/assets/:id/qr-label" element={
          <ProtectedRoute allowedRoles={["admin", "engineer"]}>
            <PrintAssetLabel />
          </ProtectedRoute>
        } />
        
        <Route path="/users" element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <UserManagement />
          </ProtectedRoute>
        } />
        
        <Route path="/settings" element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Settings />
          </ProtectedRoute>
        } />
        
        {/* Redirect based on role */}
        <Route path="*" element={
          isAuthenticated ? (
            user?.role === "admin" ? <Navigate to="/dashboard" replace /> : 
            user?.role === "engineer" ? <Navigate to="/dashboard" replace /> :
            <Navigate to="/tickets" replace />
          ) : (
            <Navigate to="/" replace />
          )
        } />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <AppRoutes />
          <Toaster />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}
