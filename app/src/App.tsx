import { Routes, Route } from "react-router-dom";
import { NavBar } from "./components/NavBar";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Import from "./pages/Import";
import "./App.css";

export default function App() {
  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/import" element={<Import />} />
      </Routes>
    </>
  );
}
