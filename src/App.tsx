import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import NavBar from './components/NavBar'
import HomePage from './pages/HomePage'
import BrowsePage from './pages/BrowsePage'
import WatchlistPage from './pages/WatchlistPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ActivateAccountPage from './pages/ActivateAccountPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import MovieModalRoute from './components/MovieModalRoute'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <NavBar />
        <Routes>
          <Route path="/" element={<HomePage />}>
            <Route path="filme/:tmdbId" element={<MovieModalRoute />} />
          </Route>
          <Route path="/streaming/:providerKey" element={<BrowsePage />}>
            <Route path="filme/:tmdbId" element={<MovieModalRoute />} />
          </Route>
          <Route path="/minha-lista" element={<WatchlistPage />}>
            <Route path="filme/:tmdbId" element={<MovieModalRoute />} />
          </Route>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cadastro" element={<RegisterPage />} />
          {/* Alvos dos links enviados por e-mail: /rota?uid=...&token=... */}
          <Route path="/ativar-conta" element={<ActivateAccountPage />} />
          <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
          <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
