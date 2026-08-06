import { useLocation, useNavigate, useParams } from 'react-router-dom'
import MovieModal from './MovieModal'

export default function MovieModalRoute() {
  const { tmdbId } = useParams<{ tmdbId: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  function close() {
    // location.key is 'default' when there is no prior in-app history entry
    // (a direct link, a new tab, or a refresh) - navigate(-1) in that case
    // would leave the app entirely instead of closing back to the parent page.
    if (location.key === 'default') {
      navigate('/')
    } else {
      navigate(-1)
    }
  }

  if (!tmdbId) return null
  return <MovieModal tmdbId={Number(tmdbId)} onClose={close} />
}
