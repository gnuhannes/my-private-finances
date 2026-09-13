import { Navigate, Routes, Route, useLocation, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { NavBar } from "./components/NavBar";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Categories from "./pages/Categories";
import CategorizationRules from "./pages/CategorizationRules";
import Budgets from "./pages/Budgets";
import Recurring from "./pages/Recurring";
import Transfers from "./pages/Transfers";
import NetWorth from "./pages/NetWorth";
import SpendingTrends from "./pages/SpendingTrends";
import AnnualOverview from "./pages/AnnualOverview";
import Import from "./pages/Import";
import Settings from "./pages/Settings";
import Suggestions from "./pages/Suggestions";
import WelcomeWizard from "./pages/Welcome/WelcomeWizard";
import { useAppSettings } from "./hooks/useAppSettings";
import "./App.css";

export default function App() {
  const { t } = useTranslation();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { data: settings, isLoading } = useAppSettings();

  if (isLoading) {
    return <div className="app-splash">{t("common.loading")}</div>;
  }

  const isWelcomeRoute = location.pathname === "/welcome";
  const rerun = searchParams.get("rerun") === "1";
  const onboardingComplete = settings?.onboarding_completed_at != null;

  if (!isWelcomeRoute && !onboardingComplete) {
    return <Navigate to="/welcome" replace />;
  }
  if (isWelcomeRoute && onboardingComplete && !rerun) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      {!isWelcomeRoute && <NavBar />}
      <Routes>
        <Route path="/welcome" element={<WelcomeWizard />} />
        <Route path="/" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/budgets" element={<Budgets />} />
        <Route path="/recurring" element={<Recurring />} />
        <Route path="/transfers" element={<Transfers />} />
        <Route path="/net-worth" element={<NetWorth />} />
        <Route path="/spending-trends" element={<SpendingTrends />} />
        <Route path="/annual" element={<AnnualOverview />} />
        <Route path="/rules" element={<CategorizationRules />} />
        <Route path="/import" element={<Import />} />
        <Route path="/suggestions" element={<Suggestions />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </>
  );
}
