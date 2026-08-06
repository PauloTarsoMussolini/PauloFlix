import { Link } from 'react-router-dom'
import type { Provider } from '../types/movie'

export default function ProviderFilter({ providers, activeKey }: { providers: Provider[]; activeKey?: string }) {
  return (
    <nav className="provider-filter">
      {providers.map(p => (
        <Link
          key={p.key}
          to={'/streaming/' + p.key}
          className={p.key === activeKey ? 'provider-filter-item active' : 'provider-filter-item'}
        >
          {p.displayName}
        </Link>
      ))}
    </nav>
  )
}
