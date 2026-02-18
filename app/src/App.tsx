import { Routes, Route } from "react-router-dom";
import { NavBar } from "./components/NavBar";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Categories from "./pages/Categories";
import CategorizationRules from "./pages/CategorizationRules";
import Budgets from "./pages/Budgets";
import Recurring from "./pages/Recurring";
import Transfers from "./pages/Transfers";
import Import from "./pages/Import";
import "./App.css";

export default function App() {
  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/budgets" element={<Budgets />} />
        <Route path="/recurring" element={<Recurring />} />
        <Route path="/transfers" element={<Transfers />} />
        <Route path="/rules" element={<CategorizationRules />} />
        <Route path="/import" element={<Import />} />
      </Routes>
    </>
  );
}
