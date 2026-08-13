import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Profile from './pages/Profile'
import OptionsPricing from './pages/OptionsPricing'
import HousePricing from './pages/HousePricing'
import SentimentAnalysis from './pages/SentimentAnalysis'
import About from './pages/About'
import Portfolio from './pages/Portfolio'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="bg-black h-screen font-sans flex flex-col overflow-hidden">
          <Navbar />
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              {/* Remove ProtectedRoute from Options Pricing */}
              <Route path="/options-pricing" element={<OptionsPricing />} />
              <Route path="/house-pricing" element={<HousePricing />} />
              <Route path="/sentiment-analysis" element={<SentimentAnalysis />} />
              <Route path="/about" element={<About />} />
              {/* Keep Portfolio protected since it needs user data */}
              <Route path="/portfolio" element={
                <ProtectedRoute>
                  <Portfolio />
                </ProtectedRoute>
              } />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
