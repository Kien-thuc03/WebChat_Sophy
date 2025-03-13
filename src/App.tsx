// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Signin from "./components/auth/Signin";
import Dashboard from "./pages/Dashboard";
import PrivateRoute from "./components/routes/PrivateRoute";

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Signin />} />
        <Route
          path="/main"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;