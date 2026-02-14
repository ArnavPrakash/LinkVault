import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Success from './pages/Success';
import ViewPaste from './pages/ViewPaste';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/success" element={<Success />} />
        <Route path="/paste/:id" element={<ViewPaste />} />
      </Routes>
    </Router>
  );
}

export default App;
