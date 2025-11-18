import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getTeam, getGames, getStandings } from '../services/nflApi'

function TeamProfile() {
  const { id } = useParams()
  const [team, setTeam] = useState(null)
  const [recentGames, setRecentGames] = useState([])
  const [standing, setStanding] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchTeamData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Fetch team details
        const teamData = await getTeam(id)
        setTeam(teamData.data)
        
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // Fetch recent games for this team
        const gamesData = await getGames({ 
          team_ids: [id], 
          seasons: [2024],
          per_page: 10
        })
        setRecentGames(gamesData.data || [])
        
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // Fetch standings
        const standingsData = await getStandings(2024)
        const teamStanding = standingsData.data?.find(s => s.team?.id === parseInt(id))
        setStanding(teamStanding)
        
      } catch (err) {
        setError('Failed to load team data')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchTeamData()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-dk-black-primary flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center space-x-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-dk-green-primary"></div>
            <p className="text-dk-green-primary font-dk-display font-black text-2xl uppercase">Loading Team...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dk-black-primary flex items-center justify-center">
        <div className="betting-slip border-l-4 border-l-dk-orange-primary max-w-2xl mx-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 mr-4">
              <div className="w-12 h-12 bg-dk-orange-primary rounded-lg flex items-center justify-center">
                <span className="text-2xl">⚠</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-dk-orange-primary font-dk-display font-black text-xl mb-2 uppercase">{error}</p>
              <Link to="/teams" className="link-orange font-dk-display font-bold">
                ← Back to Teams
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-dk-black-primary flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-4xl font-dk-display font-black text-dk-white-primary mb-4">Team Not Found</h2>
          <Link to="/teams" className="link-orange text-xl font-dk-display font-bold">
            ← Back to Teams
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dk-black-primary">
      {/* Team Header */}
      <div className="bg-dk-black-secondary border-b-2 border-dk-green-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
            <div className="flex items-center space-x-6 mb-6 md:mb-0">
              {/* Team Logo/Abbreviation */}
              <div className="w-24 h-24 bg-dk-green-primary rounded-lg flex items-center justify-center">
                <span className="text-4xl font-dk-display font-black text-dk-black-primary">
                  {team.abbreviation}
                </span>
              </div>
              
              {/* Team Info */}
              <div>
                <h1 className="text-5xl md:text-6xl font-dk-display font-black text-dk-white-primary mb-2 uppercase leading-none">
                  {team.name}
                </h1>
                <div className="flex items-center space-x-4">
                  <span className="price-tag price-tag-orange text-lg">
                    {team.abbreviation}
                  </span>
                  <span className="text-dk-orange-primary font-dk-display font-bold text-xl uppercase">
                    {team.conference} {team.division}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="text-right">
              <div className="text-3xl font-dk-display font-black text-dk-green-primary">
                {standing?.overall_record || 'N/A'}
              </div>
              <div className="text-sm text-dk-white-muted font-dk uppercase tracking-wider">2024 Record</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Season Stats */}
        {standing && (
          <div className="betting-slip mb-8">
            <h3 className="text-2xl font-dk-display font-black text-dk-white-primary mb-6 uppercase">
              2024 Season Statistics
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
              <div className="odds-card text-center">
                <div className="text-3xl font-dk-display font-black text-dk-green-primary mb-2">
                  {standing.overall_record}
                </div>
                <div className="text-dk-white-muted font-dk text-sm uppercase tracking-wider">Overall</div>
              </div>
              <div className="odds-card text-center">
                <div className="text-3xl font-dk-display font-black text-dk-orange-primary mb-2">
                  {standing.conference_record}
                </div>
                <div className="text-dk-white-muted font-dk text-sm uppercase tracking-wider">Conference</div>
              </div>
              <div className="odds-card text-center">
                <div className="text-3xl font-dk-display font-black text-dk-green-primary mb-2">
                  {standing.division_record}
                </div>
                <div className="text-dk-white-muted font-dk text-sm uppercase tracking-wider">Division</div>
              </div>
              <div className="odds-card text-center">
                <div className="text-3xl font-dk-display font-black text-dk-orange-primary mb-2">
                  {standing.home_record}
                </div>
                <div className="text-dk-white-muted font-dk text-sm uppercase tracking-wider">Home</div>
              </div>
              <div className="odds-card text-center">
                <div className="text-3xl font-dk-display font-black text-dk-green-primary mb-2">
                  {standing.road_record}
                </div>
                <div className="text-dk-white-muted font-dk text-sm uppercase tracking-wider">Away</div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="player-card-dk text-center">
                <div className="text-3xl font-dk-display font-black text-dk-green-primary mb-2">
                  {standing.points_for || 0}
                </div>
                <div className="text-dk-white-muted font-dk text-sm uppercase tracking-wider">Points For</div>
              </div>
              <div className="player-card-dk text-center">
                <div className="text-3xl font-dk-display font-black text-dk-orange-primary mb-2">
                  {standing.points_against || 0}
                </div>
                <div className="text-dk-white-muted font-dk text-sm uppercase tracking-wider">Points Against</div>
              </div>
              <div className="player-card-dk text-center">
                <div className={`text-3xl font-dk-display font-black mb-2 ${
                  standing.point_differential > 0 ? 'text-dk-green-primary' : 
                  standing.point_differential < 0 ? 'text-dk-orange-primary' : 
                  'text-dk-white-secondary'
                }`}>
                  {standing.point_differential > 0 ? '+' : ''}{standing.point_differential || 0}
                </div>
                <div className="text-dk-white-muted font-dk text-sm uppercase tracking-wider">Point Diff</div>
              </div>
              <div className="player-card-dk text-center">
                <div className="text-3xl font-dk-display font-black text-dk-green-primary mb-2">
                  {standing.playoff_seed ? `#${standing.playoff_seed}` : 'N/A'}
                </div>
                <div className="text-dk-white-muted font-dk text-sm uppercase tracking-wider">Playoff Seed</div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Games */}
        <div className="betting-slip">
          <h3 className="text-2xl font-dk-display font-black text-dk-white-primary mb-6 uppercase">
            Recent Games
          </h3>
          
          {recentGames.length > 0 ? (
            <div className="space-y-4">
              {recentGames.map(game => {
                const isHome = game.home_team?.id === parseInt(id)
                const opponent = isHome ? game.visitor_team : game.home_team
                const teamScore = isHome ? game.home_team_score : game.visitor_team_score
                const oppScore = isHome ? game.visitor_team_score : game.home_team_score
                const result = teamScore > oppScore ? 'W' : teamScore < oppScore ? 'L' : 'T'
                
                return (
                  <div key={game.id} className="player-card-dk">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {/* Game Result */}
                        <div className="text-center">
                          <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${
                            result === 'W' ? 'bg-dk-green-primary' : 
                            result === 'L' ? 'bg-dk-orange-primary' : 
                            'bg-dk-black-tertiary'
                          }`}>
                            <span className="text-2xl font-dk-display font-black text-dk-white-primary">
                              {result}
                            </span>
                          </div>
                          <div className="text-lg font-dk-display font-bold text-dk-white-primary mt-1">
                            {teamScore}-{oppScore}
                          </div>
                        </div>
                        
                        {/* Game Details */}
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-dk-white-secondary font-dk-display font-bold">
                              {isHome ? 'vs' : '@'}
                            </span>
                            <span className="text-dk-white-primary font-dk-display font-bold text-lg">
                              {opponent?.full_name}
                            </span>
                            <span className="badge badge-dark">
                              {opponent?.abbreviation}
                            </span>
                          </div>
                          <div className="flex items-center space-x-3 text-dk-white-muted text-sm">
                            <span className="font-dk-display font-bold">Week {game.week}</span>
                            <span>•</span>
                            <span>{new Date(game.date).toLocaleDateString()}</span>
                            <span>•</span>
                            <span className="font-dk-display font-bold">{game.status}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Opponent Logo */}
                      <div className="w-12 h-12 bg-dk-black-tertiary rounded-lg flex items-center justify-center">
                        <span className="text-lg font-dk-display font-black text-dk-green-primary">
                          {opponent?.abbreviation}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <span className="text-6xl">📅</span>
              <p className="text-xl text-dk-white-secondary font-dk mt-4">
                No recent games available
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="mt-12 pt-8 border-t border-dk-black-light">
          <Link to="/teams" className="link-orange text-xl font-dk-display font-bold uppercase">
            ← Back to Teams
          </Link>
        </nav>
      </div>
    </div>
  )
}

export default TeamProfile