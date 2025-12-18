import { Link, useLocation, useNavigate } from 'react-router-dom'

const Header = () => {
  const location = useLocation()
  const navigate = useNavigate()

  // Don't show header on login/signup pages
  if (location.pathname === '/login' || location.pathname === '/signup') {
    return null
  }

  // Main navigation pages - don't show back button on these
  const mainPages = ['/home', '/fantasy', '/tbd', '/profile']
  const showBackButton = !mainPages.includes(location.pathname)

  return (
    <header className="bg-primary-black-900/95 backdrop-blur-md sticky top-0 z-[110]">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between relative h-8">
          {/* Back Button - Left */}
          <div className="w-10 z-[111] flex items-center">
            {showBackButton && (
              <button
                onClick={() => navigate('/fantasy')}
                className="p-1.5 rounded-md bg-primary-black-800/50 hover:bg-primary-black-700 transition-all active:scale-95"
                title="Back to Fantasy Home"
              >
                <svg className="w-5 h-5 text-primary-black-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
          </div>

          {/* Logo - Center */}
          <Link 
            to="/fantasy" 
            className="flex items-center absolute left-1/2 transform -translate-x-1/2"
          >
            <img 
              src="/yapsports-logo.webp" 
              alt="YapSports" 
              className="h-8 w-auto"
            />
          </Link>

          {/* Empty spacer - Right (for balance) */}
          <div className="w-10" />
        </div>
      </div>
    </header>
  )
}

export default Header
