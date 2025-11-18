import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getGames } from '../services/nflApi'

function Games() {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedWeek, setSelectedWeek] = useState(8) // Default to current week
  const [selectedSeason] = useState(2025)

  useEffect(() => {
    const fetchGames = async () => {
      try {
        setLoading(true)
        setError(null)
        const options = { 
          seasons: [selectedSeason],
          per_page: 25
        }
        if (selectedWeek) {
          options.weeks = [selectedWeek]
        }
        const data = await getGames(options)
        setGames(data?.data || [])
      } catch (err) {
        console.error('Error fetching games:', err)
        if (err?.status === 429) {
          setError('Rate limit reached. Please wait 60 seconds and try again.')
        } else if (err?.status === 401) {
          setError('API key error. Please check your .env file.')
        } else {
          setError('Failed to load games. Please try again.')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchGames()
  }, [selectedWeek, selectedSeason])

  const weeks = Array.from({ length: 18 }, (_, i) => i + 1)

  return (
    <div className="min-h-screen bg-dk-black-primary">
      {/* Header - Enhanced DraftKings Style */}
      <div className="bg-dk-black-secondary border-b-2 border-dk-orange-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-5xl md:text-6xl font-dk-display font-black text-dk-white-primary mb-2 uppercase">
                NFL <span className="text-dk-orange-primary">Games</span>
              </h1>
              <p className="text-xl text-dk-white-secondary font-dk">Complete Schedule • Live Scores • Game Analysis</p>
            </div>
            <div className="hidden md:block">
              <div className="text-right">
                <div className="text-5xl font-dk-display font-black text-dk-orange-primary">
                  {games.length}
                </div>
                <div className="text-sm text-dk-white-muted font-dk uppercase tracking-wider">Games This Week</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Week Filter - Enhanced */}
        <div className="betting-slip mb-8">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center space-x-4">
              <label className="text-dk-white-secondary font-dk-display font-bold text-lg uppercase">Week</label>
              <select 
                value={selectedWeek || ''} 
                onChange={(e) => setSelectedWeek(e.target.value ? parseInt(e.target.value) : null)}
                className="input bg-dk-black-tertiary border-dk-black-light text-dk-white-primary text-lg px-6 py-3"
              >
                <option value="">All Weeks</option>
                {weeks.map(week => (
                  <option key={week} value={week}>Week {week}</option>
                ))}
              </select>
            </div>
            {selectedWeek && (
              <div className="flex items-center space-x-3">
                <span className="badge badge-orange text-lg px-4 py-2">
                  Week {selectedWeek}
                </span>
                <span className="text-dk-white-secondary font-dk">• {games.length} Games</span>
              </div>
            )}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="card border-l-4 border-l-dk-orange-primary mb-8">
            <div className="flex items-start">
              <span className="text-2xl text-dk-orange-primary mr-3">⚠</span>
              <div>
                <p className="text-dk-orange-primary font-dk-display font-bold">{error}</p>
                <p className="text-dk-white-secondary text-sm mt-1">
                  Free tier has rate limits. Please wait a moment before trying again.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center space-x-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dk-green-primary"></div>
              <p className="text-dk-green-primary font-dk-display font-bold text-xl">LOADING GAMES...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {games.length > 0 ? (
              games.map(game => (
                <div key={game.id} className="odds-card odds-card-orange">
                  {/* Game Header - Enhanced */}
                  <div className="flex items-center justify-between mb-8 pb-6 border-b-2 border-dk-black-tertiary">
                    <div className="flex items-center space-x-6">
                      <span className="price-tag price-tag-orange text-lg">Week {game.week}</span>
                      <span className={`badge text-lg px-4 py-2 ${
                        game.status === 'Final' ? 'badge-green' : 
                        game.status === 'In Progress' ? 'badge-orange' : 
                        'badge-dark'
                      }`}>
                        {game.status}
                      </span>
                    </div>
                    <div className="text-dk-white-secondary font-dk-display font-bold text-lg">
                      {new Date(game.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                  </div>
                  
                  {/* Game Matchup - Enhanced */}
                  <div className="mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                      {/* Away Team */}
                      <div className="text-center md:text-right">
                        <Link 
                          to={`/teams/${game.visitor_team?.id}`}
                          className="group inline-block"
                        >
                          <div className="team-logo-placeholder w-16 h-16 mx-auto mb-4 group-hover:bg-dk-green-primary/20 transition-colors">
                            {game.visitor_team?.abbreviation?.substring(0, 3) || 'AWAY'}
                          </div>
                          <div className="text-xl font-dk-display font-black text-dk-white-primary group-hover:text-dk-green-primary transition-colors mb-2 uppercase">
                            {game.visitor_team?.full_name}
                          </div>
                          <div className="text-dk-white-muted font-dk-display font-bold text-lg">
                            {game.visitor_team?.abbreviation}
                          </div>
                        </Link>
                      </div>

                      {/* Score Display - Enhanced */}
                      <div className="text-center">
                        <div className="bg-dk-black-tertiary rounded-lg p-6 border-2 border-dk-black-light">
                          <div className="grid grid-cols-3 gap-4 items-center">
                            <div className={`text-4xl font-dk-display font-black ${
                              game.visitor_team_score > game.home_team_score 
                                ? 'text-dk-green-primary winner-score' 
                                : 'text-dk-white-secondary loser-score'
                            }`}>
                              {game.visitor_team_score}
                            </div>
                            <div className="text-dk-white-muted font-dk-display font-black text-2xl">@</div>
                            <div className={`text-4xl font-dk-display font-black ${
                              game.home_team_score > game.visitor_team_score 
                                ? 'text-dk-green-primary winner-score' 
                                : 'text-dk-white-secondary loser-score'
                            }`}>
                              {game.home_team_score}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Home Team */}
                      <div className="text-center md:text-left">
                        <Link 
                          to={`/teams/${game.home_team?.id}`}
                          className="group inline-block"
                        >
                          <div className="team-logo-placeholder w-16 h-16 mx-auto mb-4 group-hover:bg-dk-green-primary/20 transition-colors">
                            {game.home_team?.abbreviation?.substring(0, 3) || 'HOME'}
                          </div>
                          <div className="text-xl font-dk-display font-black text-dk-white-primary group-hover:text-dk-green-primary transition-colors mb-2 uppercase">
                            {game.home_team?.full_name}
                          </div>
                          <div className="text-dk-white-muted font-dk-display font-bold text-lg">
                            {game.home_team?.abbreviation}
                          </div>
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Game Details */}
                  <div className="space-y-3">
                    {game.venue && (
                      <div className="flex items-center text-dk-white-secondary text-sm">
                        <span className="text-dk-green-primary mr-2">📍</span>
                        {game.venue}
                      </div>
                    )}

                    {game.summary && (
                      <div className="bg-dk-black-tertiary rounded-dk p-3">
                        <p className="text-dk-white-secondary text-sm">{game.summary}</p>
                      </div>
                    )}

                    {/* Quarter Scores */}
                    {game.status === 'Final' && (
                      <div className="bg-dk-black-tertiary rounded-dk p-4">
                        <div className="text-dk-white-secondary font-dk font-semibold mb-3">Quarter Breakdown</div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                          <div className="text-center">
                            <div className="text-dk-white-muted mb-1">Q1</div>
                            <div className="font-dk-display font-bold">
                              {game.visitor_team_q1 || 0}-{game.home_team_q1 || 0}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-dk-white-muted mb-1">Q2</div>
                            <div className="font-dk-display font-bold">
                              {game.visitor_team_q2 || 0}-{game.home_team_q2 || 0}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-dk-white-muted mb-1">Q3</div>
                            <div className="font-dk-display font-bold">
                              {game.visitor_team_q3 || 0}-{game.home_team_q3 || 0}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-dk-white-muted mb-1">Q4</div>
                            <div className="font-dk-display font-bold">
                              {game.visitor_team_q4 || 0}-{game.home_team_q4 || 0}
                            </div>
                          </div>
                          {game.visitor_team_ot !== null && (
                            <div className="text-center">
                              <div className="text-dk-white-muted mb-1">OT</div>
                              <div className="font-dk-display font-bold text-dk-orange-primary">
                                {game.visitor_team_ot || 0}-{game.home_team_ot || 0}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-16">
                <div className="mb-4">
                  <span className="text-6xl">🏈</span>
                </div>
                <h3 className="text-2xl font-dk-display font-bold text-dk-white-primary mb-2">
                  NO GAMES FOUND
                </h3>
                <p className="text-dk-white-secondary">
                  {selectedWeek 
                    ? `No games found for Week ${selectedWeek}`
                    : 'No games found for the selected filters'
                  }
                </p>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="mt-12 pt-8 border-t border-dk-black-light">
          <Link to="/" className="link-orange text-lg font-dk-display font-semibold">
            ← BACK TO HOME
          </Link>
        </nav>
      </div>
    </div>
  )
}

export default Games
