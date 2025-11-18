import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { signOut } from '../services/supabase'

const Header = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navItems = [
    { path: '/nfl', label: 'NFL' },
  ]

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <header className="bg-primary-black-900/80 backdrop-blur-md border-b border-primary-black-700 sticky top-0 z-50 animate-slide-down">
      <div className="mx-auto px-12 py-2">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-6">
            <Link 
              to="/" 
              className="flex items-center group transition-all duration-200 hover:scale-105"
            >
              <img 
                src="/yapsports-logo.webp" 
                alt="YapSports" 
                className="h-10 w-auto"
              />
            </Link>

            <nav className="hidden md:flex items-center space-x-2">
              {navItems
                .filter(item => !item.protected || item.path !== '/dashboard')
                .map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-link transition-all duration-200 ${
                    location.pathname === item.path
                      ? 'nav-link-active'
                      : ''
                  }`}
                >
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-3">
            <Link
              to="/how-to-play"
              className={`nav-link transition-all duration-200 ${
                location.pathname === '/how-to-play'
                  ? 'nav-link-active'
                  : ''
              }`}
            >
              <span>How to Play</span>
            </Link>
            {user && (
              <Link
                to="/fantasy"
                className={`nav-link transition-all duration-200 ${
                  location.pathname.startsWith('/fantasy') || location.pathname.startsWith('/teams')
                    ? 'nav-link-active'
                    : ''
                }`}
              >
                <span>Fantasy</span>
              </Link>
            )}
            {user ? (
              <>
                <div className="flex items-center space-x-2 bg-primary-black-800 px-3 py-2 rounded-lg border border-primary-black-700">
                  <span className="text-primary-black-50 text-sm font-medium">{profile?.username || 'User'}</span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors duration-200"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-primary-black-50 hover:text-primary-green-400 font-medium transition-colors duration-200"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 rounded-lg font-semibold transition-colors duration-200"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          <div className="md:hidden">
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
      </div>

      {/* Mobile menu with smooth animation */}
      <div className={`md:hidden border-t border-primary-black-700 transition-all duration-300 overflow-hidden ${
        isMobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="container-modern py-2">
          {navItems.map((item, index) => (
            <Link
              key={item.path}
              to={item.path}
              className={`block px-4 py-3 rounded-lg font-dk text-base font-medium transition-all duration-200 flex items-center space-x-3 ${
                location.pathname === item.path
                  ? 'bg-primary-green-500 text-primary-black-950'
                  : 'text-primary-black-300 hover:text-primary-black-50 hover:bg-primary-black-800'
              }`}
              style={{ 
                animationDelay: `${index * 50}ms`,
                animation: isMobileMenuOpen ? 'slide-up 0.3s ease-out forwards' : 'none'
              }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span>{item.label}</span>
            </Link>
          ))}
          
          {/* How to Play Link */}
          <Link
            to="/how-to-play"
            className={`block px-4 py-3 rounded-lg font-dk text-base font-medium transition-all duration-200 flex items-center space-x-3 ${
              location.pathname === '/how-to-play'
                ? 'bg-primary-green-500 text-primary-black-950'
                : 'text-primary-black-300 hover:text-primary-black-50 hover:bg-primary-black-800'
            }`}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <span>How to Play</span>
          </Link>

          {/* Fantasy Link (only if user is logged in) */}
          {user && (
            <Link
              to="/fantasy"
              className={`block px-4 py-3 rounded-lg font-dk text-base font-medium transition-all duration-200 flex items-center space-x-3 ${
                location.pathname.startsWith('/fantasy') || location.pathname.startsWith('/teams')
                  ? 'bg-primary-green-500 text-primary-black-950'
                  : 'text-primary-black-300 hover:text-primary-black-50 hover:bg-primary-black-800'
              }`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span>Fantasy</span>
            </Link>
          )}
          
          {/* Mobile user menu */}
          <div className="mt-3 pt-3 border-t border-primary-black-700">
            {user ? (
              <>
                <div className="px-4 py-3 bg-primary-black-800 rounded-lg mb-2">
                  <div className="flex justify-between items-center">
                    <span className="text-primary-black-300 text-sm">User:</span>
                    <span className="text-primary-black-50 font-medium">{profile?.username || 'User'}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    handleSignOut()
                    setIsMobileMenuOpen(false)
                  }}
                  className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors duration-200"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="space-y-2">
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block w-full px-4 py-3 text-center text-primary-black-50 border border-primary-black-600 hover:bg-primary-black-800 rounded-lg font-medium transition-colors duration-200"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block w-full px-4 py-3 text-center bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 rounded-lg font-semibold transition-colors duration-200"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header