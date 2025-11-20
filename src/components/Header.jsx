import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { signOut, getUserTeams } from '../services/supabase'

const Header = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [teams, setTeams] = useState([])
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Load user's teams when logged in
  useEffect(() => {
    const loadTeams = async () => {
      if (user) {
        try {
          const userTeams = await getUserTeams(user.id)
          setTeams(userTeams || [])
        } catch (error) {
          console.error('Error loading teams:', error)
          setTeams([])
        }
      } else {
        setTeams([])
      }
    }
    loadTeams()
  }, [user])

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // Don't show sidebar on login/signup pages
  if (location.pathname === '/login' || location.pathname === '/signup') {
    return null
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-primary-black-900/95 backdrop-blur-md border-r border-primary-black-700 flex-col z-50">
        {/* Logo Section */}
        <div className="p-6 border-b border-primary-black-700">
          <Link 
            to="/" 
            className="flex items-center justify-center group transition-all duration-200 hover:scale-105"
          >
            <img 
              src="/yapsports-logo.webp" 
              alt="YapSports" 
              className="h-12 w-auto"
            />
          </Link>
        </div>

        {/* Teams Section */}
        {user && teams.length > 0 && (
          <div className="flex-1 overflow-y-auto p-4">
            {/* Fantasy Home Button */}
            <Link
              to="/fantasy"
              className="mb-4 block px-3 py-2.5 rounded-lg text-primary-black-300 hover:text-primary-black-50 hover:bg-primary-black-800 transition-all duration-200 text-center text-sm font-medium flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Fantasy Home
            </Link>
            
            <div className="mb-2">
              <h3 className="text-xs font-semibold text-primary-black-400 uppercase tracking-wider px-2">
                Your Teams
              </h3>
            </div>
            <nav className="space-y-1">
              {teams.map((team) => (
                <Link
                  key={team.id}
                  to={`/teams/${team.id}/dashboard`}
                  className={`block px-3 py-2.5 rounded-lg transition-all duration-200 ${
                    location.pathname.includes(`/teams/${team.id}`)
                      ? 'bg-primary-green-500 text-primary-black-950 font-semibold'
                      : 'text-primary-black-300 hover:text-primary-black-50 hover:bg-primary-black-800'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{team.team_name}</span>
                    <span className="text-xs opacity-75 mt-0.5">
                      {team.wins || 0}-{team.losses || 0} • {team.coins || 0} coins
                    </span>
                  </div>
                </Link>
              ))}
            </nav>
            
            {/* Add New Team Button */}
            <Link
              to="/fantasy"
              className="mt-4 block px-3 py-2.5 rounded-lg border-2 border-dashed border-primary-black-600 text-primary-black-400 hover:border-primary-green-500 hover:text-primary-green-500 transition-all duration-200 text-center text-sm font-medium"
            >
              + New Team
            </Link>
          </div>
        )}

        {/* User Profile Section */}
        <div className="p-4 border-t border-primary-black-700">
          {user ? (
            <>
              <div className="mb-3 px-3 py-2.5 bg-primary-black-800 rounded-lg border border-primary-black-700">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-primary-green-500 rounded-full flex items-center justify-center text-primary-black-950 font-bold text-sm">
                    {profile?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary-black-50 truncate">
                      {profile?.username || 'User'}
                    </p>
                    <p className="text-xs text-primary-black-400 truncate">
                      {teams.length} {teams.length === 1 ? 'team' : 'teams'}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors duration-200 text-sm"
              >
                Sign Out
              </button>
            </>
          ) : (
            <div className="space-y-2">
              <Link
                to="/login"
                className="block w-full px-4 py-2.5 text-center text-primary-black-50 border border-primary-black-600 hover:bg-primary-black-800 rounded-lg font-medium transition-colors duration-200 text-sm"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="block w-full px-4 py-2.5 text-center bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 rounded-lg font-semibold transition-colors duration-200 text-sm"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-primary-black-900/80 backdrop-blur-md border-b border-primary-black-700 sticky top-0 z-50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <Link 
              to="/" 
              className="flex items-center"
            >
              <img 
                src="/yapsports-logo.webp" 
                alt="YapSports" 
                className="h-8 w-auto"
              />
            </Link>

            <button 
              className="text-primary-black-300 hover:text-primary-black-50 p-2 transition-colors duration-200"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <svg 
                className={`w-6 h-6 transition-transform duration-200 ${isMobileMenuOpen ? 'rotate-90' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div className={`border-t border-primary-black-700 transition-all duration-300 overflow-hidden ${
          isMobileMenuOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className="p-4">
            {/* Fantasy Home */}
            {user && teams.length > 0 && (
              <Link
                to="/fantasy"
                className="mb-4 block px-3 py-2.5 rounded-lg text-primary-black-300 hover:text-primary-black-50 hover:bg-primary-black-800 transition-all duration-200 text-center text-sm font-medium flex items-center justify-center gap-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Fantasy Home
              </Link>
            )}
            
            {/* Teams List */}
            {user && teams.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-primary-black-400 uppercase tracking-wider mb-2">
                  Your Teams
                </h3>
                <div className="space-y-1">
                  {teams.map((team) => (
                    <Link
                      key={team.id}
                      to={`/teams/${team.id}/dashboard`}
                      className={`block px-3 py-2.5 rounded-lg ${
                        location.pathname.includes(`/teams/${team.id}`)
                          ? 'bg-primary-green-500 text-primary-black-950'
                          : 'text-primary-black-300 hover:text-primary-black-50 hover:bg-primary-black-800'
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{team.team_name}</span>
                        <span className="text-xs opacity-75">
                          {team.wins || 0}-{team.losses || 0} • {team.coins || 0} coins
                        </span>
                      </div>
                    </Link>
                  ))}
                  <Link
                    to="/fantasy"
                    className="block px-3 py-2.5 rounded-lg border-2 border-dashed border-primary-black-600 text-primary-black-400 text-center text-sm font-medium"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    + New Team
                  </Link>
                </div>
              </div>
            )}
            
            {/* User Section */}
            <div className="pt-4 border-t border-primary-black-700">
              {user ? (
                <>
                  <div className="px-3 py-2.5 bg-primary-black-800 rounded-lg mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-primary-green-500 rounded-full flex items-center justify-center text-primary-black-950 font-bold text-sm">
                        {profile?.username?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-primary-black-50">
                          {profile?.username || 'User'}
                        </p>
                        <p className="text-xs text-primary-black-400">
                          {teams.length} {teams.length === 1 ? 'team' : 'teams'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      handleSignOut()
                      setIsMobileMenuOpen(false)
                    }}
                    className="w-full px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors duration-200"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <div className="space-y-2">
                  <Link
                    to="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block w-full px-4 py-2.5 text-center text-primary-black-50 border border-primary-black-600 hover:bg-primary-black-800 rounded-lg font-medium transition-colors duration-200"
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block w-full px-4 py-2.5 text-center bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 rounded-lg font-semibold transition-colors duration-200"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  )
}

export default Header