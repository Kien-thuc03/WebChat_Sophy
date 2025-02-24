import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Signin from "./components/auth/Signin";
import Dashboard from "./layouts/Dashboard";

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Signin />} />
        <Route path="/main" element={<Dashboard />} />
      </Routes>
    </Router>
  );
};

export default App;