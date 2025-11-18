import { Link } from 'react-router-dom'

function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section - Modern Minimalist */}
      <section className="relative overflow-hidden section-spacing">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-green-500/5 via-transparent to-accent-orange-500/5"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-primary-black-950 via-transparent to-transparent"></div>
        
        <div className="container-modern relative">
          <div className="text-center max-w-5xl mx-auto">
            {/* Live Indicator */}
            <div className="flex justify-center mb-8 animate-scale-in">
              <div className="live-indicator">
                <div className="live-dot"></div>
                <span className="text-primary-green-500 font-dk-display font-bold text-sm uppercase tracking-wider">
                  Live Data
                </span>
              </div>
            </div>
            
            {/* Main Title */}
            <h1 className="mb-8 leading-tight animate-slide-up">
              NFL <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-green-500 to-primary-green-400">STATS</span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-primary-black-300 font-dk max-w-4xl mx-auto mb-12 animate-slide-up" style={{ animationDelay: '100ms' }}>
              Complete Player Data • Game Analytics • Real-Time Statistics
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-slide-up" style={{ animationDelay: '200ms' }}>
              <Link to="/players" className="btn btn-lg shadow-medium">
                🔍 SEARCH PLAYERS
              </Link>
              <Link to="/test" className="btn btn-secondary btn-lg">
                ⚡ TEST API
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Dashboard */}
      <section className="section-spacing">
        <div className="container-modern">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-16">
            <div className="stat-card animate-scale-in" style={{ animationDelay: '0ms' }}>
              <div className="text-4xl font-dk-display font-bold text-primary-green-500 mb-2">32</div>
              <div className="stat-label">Teams</div>
            </div>
            <div className="stat-card animate-scale-in" style={{ animationDelay: '50ms' }}>
              <div className="text-4xl font-dk-display font-bold text-accent-orange-500 mb-2">1,696</div>
              <div className="stat-label">Players</div>
            </div>
            <div className="stat-card animate-scale-in" style={{ animationDelay: '100ms' }}>
              <div className="text-4xl font-dk-display font-bold text-primary-green-500 mb-2">272</div>
              <div className="stat-label">Games</div>
            </div>
            <div className="stat-card animate-scale-in" style={{ animationDelay: '150ms' }}>
              <div className="text-4xl font-dk-display font-bold text-accent-orange-500 mb-2">18</div>
              <div className="stat-label">Weeks</div>
            </div>
          </div>

          {/* Getting Started */}
          <div className="betting-slip mb-16 animate-scale-in" style={{ animationDelay: '200ms' }}>
            <div className="flex items-start mb-6">
              <div className="flex-shrink-0 mr-6">
                <div className="w-14 h-14 bg-gradient-to-br from-accent-orange-500 to-accent-orange-600 rounded-xl flex items-center justify-center shadow-glow-orange">
                  <span className="text-2xl">⚡</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-3xl font-dk-display font-bold text-primary-black-50 mb-6">
                  Getting Started
                </h3>
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="stat-row">
                      <span className="stat-label-modern">Search Examples</span>
                      <span className="stat-value-modern text-primary-green-500">Mahomes • Jackson</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label-modern">API Rate Limit</span>
                      <span className="stat-value-modern text-accent-orange-500">5/Min</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="stat-row">
                      <span className="stat-label-modern">Error Recovery</span>
                      <span className="stat-value-modern text-primary-green-500">Wait 60s</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label-modern">API Test</span>
                      <Link to="/test" className="stat-value-modern text-accent-orange-500 hover:text-accent-orange-400 transition-colors">
                        Test Connection →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Navigation Cards */}
          <div className="grid-responsive mb-16">
            <Link to="/players" className="odds-card card-hover group animate-scale-in" style={{ animationDelay: '300ms' }}>
              <div className="text-center">
                <div className="w-24 h-24 bg-primary-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-primary-green-500/20 transition-all duration-300 group-hover:scale-110">
                  <span className="text-5xl">🔍</span>
                </div>
                <h3 className="text-2xl font-dk-display font-bold text-primary-black-50 mb-3">Players</h3>
                <p className="text-primary-black-400 font-dk text-sm mb-4">Search player database</p>
                <div className="inline-flex">
                  <span className="price-tag">1,696</span>
                </div>
              </div>
            </Link>

            <Link to="/games" className="odds-card odds-card-orange card-hover group animate-scale-in" style={{ animationDelay: '350ms' }}>
              <div className="text-center">
                <div className="w-24 h-24 bg-accent-orange-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-accent-orange-500/20 transition-all duration-300 group-hover:scale-110">
                  <span className="text-5xl">🏈</span>
                </div>
                <h3 className="text-2xl font-dk-display font-bold text-primary-black-50 mb-3">Games</h3>
                <p className="text-primary-black-400 font-dk text-sm mb-4">Weekly schedule & scores</p>
                <div className="inline-flex">
                  <span className="price-tag price-tag-orange">272</span>
                </div>
              </div>
            </Link>

            <Link to="/fantasy" className="odds-card card-hover group animate-scale-in" style={{ animationDelay: '400ms' }}>
              <div className="text-center">
                <div className="w-24 h-24 bg-primary-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-primary-green-500/20 transition-all duration-300 group-hover:scale-110">
                  <span className="text-5xl">⚡</span>
                </div>
                <h3 className="text-2xl font-dk-display font-bold text-primary-black-50 mb-3">Teams</h3>
                <p className="text-primary-black-400 font-dk text-sm mb-4">All 32 NFL teams</p>
                <div className="inline-flex">
                  <span className="price-tag">32</span>
                </div>
              </div>
            </Link>

            <Link to="/standings" className="odds-card odds-card-orange card-hover group animate-scale-in" style={{ animationDelay: '450ms' }}>
              <div className="text-center">
                <div className="w-24 h-24 bg-accent-orange-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-accent-orange-500/20 transition-all duration-300 group-hover:scale-110">
                  <span className="text-5xl">🏆</span>
                </div>
                <h3 className="text-2xl font-dk-display font-bold text-primary-black-50 mb-3">Standings</h3>
                <p className="text-primary-black-400 font-dk text-sm mb-4">Conference rankings</p>
                <div className="inline-flex">
                  <span className="price-tag price-tag-orange">LIVE</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Features Grid */}
          <div className="grid-responsive-2 content-spacing">
            <div className="player-card-modern animate-scale-in" style={{ animationDelay: '500ms' }}>
              <div className="flex items-start">
                <div className="flex-shrink-0 mr-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary-green-500 to-primary-green-600 rounded-xl flex items-center justify-center shadow-glow-green">
                    <span className="text-3xl">📊</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-dk-display font-bold text-primary-black-50 mb-4">
                    Player Profiles
                  </h3>
                  <div className="space-y-3">
                    <div className="stat-row">
                      <span className="stat-label-modern">Stats</span>
                      <span className="stat-value-modern text-primary-green-500">Complete</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label-modern">Season Averages</span>
                      <span className="stat-value-modern text-primary-green-500">2024</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label-modern">Game Logs</span>
                      <span className="stat-value-modern text-primary-green-500">Week by Week</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="player-card-modern animate-scale-in" style={{ animationDelay: '550ms' }}>
              <div className="flex items-start">
                <div className="flex-shrink-0 mr-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-accent-orange-500 to-accent-orange-600 rounded-xl flex items-center justify-center shadow-glow-orange">
                    <span className="text-3xl">📅</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-dk-display font-bold text-primary-black-50 mb-4">
                    Game Schedule
                  </h3>
                  <div className="space-y-3">
                    <div className="stat-row">
                      <span className="stat-label-modern">Weekly Games</span>
                      <span className="stat-value-modern text-accent-orange-500">16</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label-modern">Quarter Breakdown</span>
                      <span className="stat-value-modern text-accent-orange-500">Q1-Q4 + OT</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label-modern">Game Details</span>
                      <span className="stat-value-modern text-accent-orange-500">Venue • Summary</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="player-card-modern animate-scale-in" style={{ animationDelay: '600ms' }}>
              <div className="flex items-start">
                <div className="flex-shrink-0 mr-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary-green-500 to-primary-green-600 rounded-xl flex items-center justify-center shadow-glow-green">
                    <span className="text-3xl">🏢</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-dk-display font-bold text-primary-black-50 mb-4">
                    Team Information
                  </h3>
                  <div className="space-y-3">
                    <div className="stat-row">
                      <span className="stat-label-modern">Conferences</span>
                      <span className="stat-value-modern text-primary-green-500">AFC • NFC</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label-modern">Divisions</span>
                      <span className="stat-value-modern text-primary-green-500">8 Total</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label-modern">Standings</span>
                      <span className="stat-value-modern text-primary-green-500">Live Rankings</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="player-card-modern animate-scale-in" style={{ animationDelay: '650ms' }}>
              <div className="flex items-start">
                <div className="flex-shrink-0 mr-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-accent-orange-500 to-accent-orange-600 rounded-xl flex items-center justify-center shadow-glow-orange">
                    <span className="text-3xl">📈</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-dk-display font-bold text-primary-black-50 mb-4">
                    Season Stats
                  </h3>
                  <div className="space-y-3">
                    <div className="stat-row">
                      <span className="stat-label-modern">Season</span>
                      <span className="stat-value-modern text-accent-orange-500">2024</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label-modern">Player Stats</span>
                      <span className="stat-value-modern text-accent-orange-500">Comprehensive</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label-modern">Team Analysis</span>
                      <span className="stat-value-modern text-accent-orange-500">Data Driven</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home
