import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { signOut, getUserTeams } from '../services/supabase'
import TeamMenuCard from './TeamMenuCard'

const Header = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [teams, setTeams] = useState([])
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      // Save current scroll position
      const scrollY = window.scrollY
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'
    } else {
      // Restore scroll position
      const scrollY = document.body.style.top
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      document.body.style.overflow = ''
      window.scrollTo(0, parseInt(scrollY || '0') * -1)
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

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

  // Check if on a team page
  const isOnTeamPage = location.pathname.includes('/teams/');

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-primary-black-900/95 backdrop-blur-md border-r-2 border-primary-black-700 flex-col z-50 shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
        {/* Logo Section */}
        <div className="p-6 border-b border-primary-black-700">
          <div className="flex items-center justify-center gap-2">
            {isOnTeamPage && (
              <button
                onClick={() => navigate('/fantasy')}
                className="p-1.5 rounded-md bg-primary-black-800/50 hover:bg-primary-black-700 transition-all group"
                title="Back to Fantasy Home"
              >
                <svg className="w-4 h-4 text-primary-black-400 group-hover:text-primary-black-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
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
                  to={`/teams/${team.id}/starting-lineup`}
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
      <header className="md:hidden bg-primary-black-900/95 backdrop-blur-md border-b border-primary-black-700 sticky top-0 z-[110]">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo - Left */}
            <div className="flex items-center gap-2 z-[111]">
              {isOnTeamPage && (
                <button
                  onClick={() => navigate('/fantasy')}
                  className="p-1.5 rounded-md bg-primary-black-800/50 hover:bg-primary-black-700 transition-all active:scale-95"
                  title="Back to Fantasy Home"
                >
                  <svg className="w-4 h-4 text-primary-black-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
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
            </div>

            {/* User Menu - Right */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-primary-black-50 hover:bg-primary-black-800 rounded-lg transition-colors z-[111]"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Menu Drawer */}
        <div
          className={`fixed top-0 right-0 h-screen w-80 bg-primary-black-900 border-l border-primary-black-700 transform transition-transform duration-300 ease-in-out z-[120] ${
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-primary-black-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-primary-black-50">Menu</h2>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-primary-black-50 hover:bg-primary-black-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Teams */}
            {user && teams.length > 0 && (
              <div className="flex-1 overflow-y-auto p-4">
                {/* Fantasy Home Button */}
                <Link
                  to="/fantasy"
                  onClick={() => setIsMobileMenuOpen(false)}
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
                      to={`/teams/${team.id}/starting-lineup`}
                      onClick={() => setIsMobileMenuOpen(false)}
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
                  onClick={() => setIsMobileMenuOpen(false)}
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
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block w-full px-4 py-2.5 text-center text-primary-black-50 border border-primary-black-600 hover:bg-primary-black-800 rounded-lg font-medium transition-colors duration-200 text-sm"
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block w-full px-4 py-2.5 text-center bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 rounded-lg font-semibold transition-colors duration-200 text-sm"
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
