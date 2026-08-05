import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import NavBar from './components/NavBar'
import HomePage from './pages/HomePage'
import SearchPage from './pages/SearchPage'
import BrowsePage from './pages/BrowsePage'
import WatchlistPage from './pages/WatchlistPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import MovieModal from './components/MovieModal'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <NavBar />
        <Routes>
          <Route path="/" element={<HomePage />}>
            <Route path="filme/:tmdbId" element={<MovieModal />} />
          </Route>
          <Route path="/busca" element={<SearchPage />}>
            <Route path="filme/:tmdbId" element={<MovieModal />} />
          </Route>
          <Route path="/streaming/:providerKey" element={<BrowsePage />}>
            <Route path="filme/:tmdbId" element={<MovieModal />} />
          </Route>
          <Route path="/minha-lista" element={<WatchlistPage />}>
            <Route path="filme/:tmdbId" element={<MovieModal />} />
          </Route>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cadastro" element={<RegisterPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
