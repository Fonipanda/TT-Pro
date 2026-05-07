import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth.jsx";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import LiveScores from "@/pages/LiveScores";
import Matches from "@/pages/Matches";
import MatchDetail from "@/pages/MatchDetail";
import Players from "@/pages/Players";
import PlayerDetail from "@/pages/PlayerDetail";
import Competitions from "@/pages/Competitions";
import CompetitionDetail from "@/pages/CompetitionDetail";
import CalendarPage from "@/pages/CalendarPage";
import SearchPage from "@/pages/SearchPage";
import Favorites from "@/pages/Favorites";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Notifications from "@/pages/Notifications";
import BracketPredictor from "@/pages/BracketPredictor";

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/live" element={<LiveScores />} />
              <Route path="/matches" element={<Matches />} />
              <Route path="/match/:id" element={<MatchDetail />} />
              <Route path="/players" element={<Players />} />
              <Route path="/player/:id" element={<PlayerDetail />} />
              <Route path="/competitions" element={<Competitions />} />
              <Route path="/competition/:id" element={<CompetitionDetail />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/bracket-predictor" element={<BracketPredictor />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
