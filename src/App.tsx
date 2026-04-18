import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AuthProvider, useAuth } from "@/context/auth-context"

import HomePage from "@/routes/home"
import LoginPage from "@/routes/login"
import PlaceholderPage from "@/routes/placeholder"
import CpPage from "@/routes/cp"
import CustomerSearchPage from "@/routes/customer-search"
import CustomerRegistrationPage from "@/routes/customer-registration"
import LoanRegistrationPage from "@/routes/loan-registration"
import LoanSearchPage from "@/routes/loan-search"
import LoanDetailPage from "@/routes/loan-detail"
import RepaymentSinglePage from "@/routes/repayment-single"
import RepaymentBatchPage from "@/routes/repayment-batch"
import OverdueRegistrationPage from "@/routes/overdue-registration"
import OverdueManagementPage from "@/routes/overdue-management"
import OverdueSearchPage from "@/routes/overdue-search"
import GuarantorRegistrationPage from "@/routes/guarantor-registration"
import GuarantorSearchPage from "@/routes/guarantor-search"
import ReportPage from "@/routes/report"
import HrPage from "@/routes/hr"
import FixedAssetsPage from "@/routes/fixed-assets"
import CollateralPage from "@/routes/collateral"
import SettingsPage from "@/routes/settings"

function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/home" replace />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/registration/customer" element={<CustomerRegistrationPage />} />
              <Route path="/registration/guarantor" element={<GuarantorRegistrationPage />} />
              <Route path="/registration/loan" element={<LoanRegistrationPage />} />
              <Route path="/search/customer" element={<CustomerSearchPage />} />
              <Route path="/search/guarantor" element={<GuarantorSearchPage />} />
              <Route path="/search/loan" element={<LoanSearchPage />} />
              <Route path="/loan/detail" element={<LoanDetailPage />} />
              <Route path="/repayment/single" element={<RepaymentSinglePage />} />
              <Route path="/repayment/batch" element={<RepaymentBatchPage />} />
              <Route path="/overdue/registration" element={<OverdueRegistrationPage />} />
              <Route path="/overdue/management" element={<OverdueManagementPage />} />
              <Route path="/overdue/search" element={<OverdueSearchPage />} />
              <Route path="/cp" element={<CpPage />} />
              <Route path="/report" element={<ReportPage />} />
              <Route path="/hr" element={<HrPage />} />
              <Route path="/fixed-assets" element={<FixedAssetsPage />} />
              <Route path="/collateral" element={<CollateralPage />} />
              <Route path="/calculator" element={<PlaceholderPage />} />
              <Route path="/user" element={<PlaceholderPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
