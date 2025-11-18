import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getPlayer, getPlayerStats, getPlayerSeasonStats, getPlayerInjuries, getGames } from '../services/nflApi'

function PlayerProfile() {
  const { id } = useParams()
  const [player, setPlayer] = useState(null)
  const [gameStats, setGameStats] = useState([])
  const [allGames, setAllGames] = useState([])
  const [seasonStats, setSeasonStats] = useState(null)
  const [injuryStatus, setInjuryStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedSeason, setSelectedSeason] = useState(2025)
  const [availableSeasons] = useState([2025, 2024, 2023, 2022, 2021, 2020])

  useEffect(() => {
    const fetchPlayerData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Fetch sequentially to avoid rate limiting
        const playerData = await getPlayer(id)
        setPlayer(playerData)
        
        await new Promise(resolve => setTimeout(resolve, 300))
        const statsData = await getPlayerStats(id, selectedSeason)
        setGameStats(statsData?.data || [])
        
        await new Promise(resolve => setTimeout(resolve, 300))
        const seasonData = await getPlayerSeasonStats(id, selectedSeason)
        
        if (seasonData?.data && seasonData.data.length > 0) {
          const stats = seasonData.data[0];
          setSeasonStats(stats);
        } else {
          setSeasonStats(null);
        }
        
        // Fetch all games for the player's team
        if (playerData?.team?.id) {
          await new Promise(resolve => setTimeout(resolve, 300))
          const gamesData = await getGames({
            seasons: [selectedSeason],
            team_ids: [playerData.team.id]
          })
          setAllGames(gamesData?.data || [])
        }
        
        // Fetch injury status (may not be available on free tier)
        try {
          await new Promise(resolve => setTimeout(resolve, 300))
          const injuryData = await getPlayerInjuries({ player_ids: [parseInt(id)] })
          if (injuryData?.data && injuryData.data.length > 0) {
            setInjuryStatus(injuryData.data[0])
          }
        } catch {
          // Injury data not available - that's okay, just don't show it
          console.log('Injury data not available (may require paid tier)')
        }
      } catch (err) {
        if (err?.status === 429) {
          setError('Rate limit reached. Please wait a moment and refresh.')
        } else if (err?.status === 401) {
          setError('API key issue. Please check your .env file.')
        } else {
          setError('Failed to load player data')
        }
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchPlayerData()
  }, [id, selectedSeason])

  if (loading) {
    return (
      <div className="min-h-screen bg-dk-black-primary flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center space-x-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-dk-green-primary"></div>
            <p className="text-dk-green-primary font-dk-display font-black text-2xl uppercase">Loading Player...</p>
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
              <Link to="/players" className="link-orange font-dk-display font-bold">
                ← Back to Players
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!player) {
    return (
      <div className="min-h-screen bg-dk-black-primary flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-4xl font-dk-display font-black text-dk-white-primary mb-4">Player Not Found</h2>
          <Link to="/players" className="link-orange text-xl font-dk-display font-bold">
            ← Back to Players
          </Link>
        </div>
      </div>
    )
  }

  const isQB = player.position_abbreviation === 'QB'
  const isRB = player.position_abbreviation === 'RB'
  const isWR = player.position_abbreviation === 'WR' || player.position_abbreviation === 'TE'

  return (
    <div className="min-h-screen bg-dk-black-primary">
      {/* Player Header */}
      <div className="bg-dk-black-secondary border-b-2 border-dk-green-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
            <div className="flex items-center space-x-6 mb-6 md:mb-0">
              {/* Jersey Number */}
              <div className="w-24 h-24 bg-dk-green-primary rounded-lg flex items-center justify-center">
                <span className="text-4xl font-dk-display font-black text-dk-black-primary">
                  #{player.jersey_number || 'N/A'}
                </span>
              </div>
              
              {/* Player Info */}
              <div>
                <h1 className="text-5xl md:text-6xl font-dk-display font-black text-dk-white-primary mb-2 uppercase leading-none">
                  {player.first_name} <span className="text-dk-green-primary">{player.last_name}</span>
                </h1>
                <div className="flex items-center space-x-4">
                  <span className="price-tag price-tag-orange text-lg">
                    {player.position_abbreviation}
                  </span>
                  <span className="text-dk-orange-primary font-dk-display font-bold text-xl uppercase">
                    {player.team?.full_name}
                  </span>
                  {injuryStatus && (
                    <span className="badge badge-orange">
                      🚑 {injuryStatus.status}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="text-right">
              <div className="text-3xl font-dk-display font-black text-dk-green-primary">
                {seasonStats?.games_played || 0}
              </div>
              <div className="text-sm text-dk-white-muted font-dk uppercase tracking-wider">Games Played</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Injury Alert */}
        {injuryStatus && (
          <div className="betting-slip border-l-4 border-l-dk-orange-primary mb-8">
            <div className="flex items-start">
              <div className="flex-shrink-0 mr-4">
                <div className="w-12 h-12 bg-dk-orange-primary rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🚑</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-dk-display font-black text-dk-orange-primary mb-3 uppercase">
                  Injury Report
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="stat-row">
                    <span className="stat-label">Status</span>
                    <span className="stat-value text-dk-orange-primary">{injuryStatus.status}</span>
                  </div>
                  {injuryStatus.date && (
                    <div className="stat-row">
                      <span className="stat-label">Last Updated</span>
                      <span className="stat-value text-dk-white-primary">
                        {new Date(injuryStatus.date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
                {injuryStatus.comment && (
                  <div className="mt-4">
                    <span className="stat-label">Details</span>
                    <p className="text-dk-white-secondary mt-2">{injuryStatus.comment}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Player Details Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="odds-card text-center">
            <div className="text-2xl font-dk-display font-black text-dk-green-primary mb-2">
              {player.height || 'N/A'}
            </div>
            <div className="text-dk-white-muted font-dk text-sm uppercase tracking-wider">Height</div>
          </div>
          <div className="odds-card text-center">
            <div className="text-2xl font-dk-display font-black text-dk-orange-primary mb-2">
              {player.weight ? `${player.weight}lbs` : 'N/A'}
            </div>
            <div className="text-dk-white-muted font-dk text-sm uppercase tracking-wider">Weight</div>
          </div>
          <div className="odds-card text-center">
            <div className="text-2xl font-dk-display font-black text-dk-green-primary mb-2">
              {player.age || 'N/A'}
            </div>
            <div className="text-dk-white-muted font-dk text-sm uppercase tracking-wider">Age</div>
          </div>
          <div className="odds-card text-center">
            <div className="text-2xl font-dk-display font-black text-dk-orange-primary mb-2">
              {player.college || 'N/A'}
            </div>
            <div className="text-dk-white-muted font-dk text-sm uppercase tracking-wider">College</div>
          </div>
          <div className="odds-card text-center">
            <div className="text-2xl font-dk-display font-black text-dk-green-primary mb-2">
              {player.experience || 'Rookie'}
            </div>
            <div className="text-dk-white-muted font-dk text-sm uppercase tracking-wider">Experience</div>
          </div>
          <div className="odds-card text-center">
            <div className="text-2xl font-dk-display font-black text-dk-orange-primary mb-2">
              {player.position_abbreviation}
            </div>
            <div className="text-dk-white-muted font-dk text-sm uppercase tracking-wider">Position</div>
          </div>
        </div>

        {/* Season Selector */}
        <div className="betting-slip mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
            <h3 className="text-2xl font-dk-display font-black text-dk-white-primary mb-4 sm:mb-0 uppercase">
              Season Statistics
            </h3>
            <select 
              value={selectedSeason} 
              onChange={(e) => setSelectedSeason(parseInt(e.target.value))}
              className="input"
            >
              {availableSeasons.map(year => (
                <option key={year} value={year}>{year} Season</option>
              ))}
            </select>
          </div>
        </div>

        {/* Season Stats */}
        {loading ? (
          <div className="text-center py-12 mb-12 betting-slip">
            <div className="inline-flex items-center space-x-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-dk-green-primary"></div>
              <p className="text-dk-green-primary font-dk-display font-black text-xl uppercase">Loading Stats...</p>
            </div>
          </div>
        ) : seasonStats ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-12">
            <div className="player-card-dk text-center">
              <div className="text-3xl font-dk-display font-black text-dk-green-primary mb-2">
                {seasonStats.games_played || 0}
              </div>
              <div className="text-dk-white-muted font-dk text-sm uppercase tracking-wider">Games</div>
            </div>

            {isQB && (
              <>
                <div className="player-card-dk text-center">
                  <div className="text-3xl font-dk-display font-black text-dk-green-primary mb-2">
                    {seasonStats.passing?.yards || seasonStats.passing_yards || 0}
                  </div>
                  <div className="text-dk-white-muted font-dk text-sm uppercase tracking-wider">Pass Yds</div>
                </div>
                <div className="player-card-dk text-center">
                  <div className="text-3xl font-dk-display font-black text-dk-orange-primary mb-2">
                    {seasonStats.passing?.touchdowns || seasonStats.passing_touchdowns || 0}
                  </div>
                  <div className="text-dk-white-muted font-dk text-sm uppercase tracking-wider">Pass TD</div>
                </div>
                <div className="player-card-dk text-center">
                  <div className="text-3xl font-dk-display font-black text-dk-green-primary mb-2">
                    {(seasonStats.passing?.completion_pct || seasonStats.passing_completion_pct)?.toFixed(1) || 0}%
                  </div>
                  <div className="text-dk-white-muted font-dk text-sm uppercase tracking-wider">Comp %</div>
                </div>
                <div className="player-card-dk text-center">
                  <div className="text-3xl font-dk-display font-black text-dk-orange-primary mb-2">
                    {seasonStats.passing?.interceptions || seasonStats.passing_interceptions || 0}
                  </div>
                  <div className="text-dk-white-muted font-dk text-sm uppercase tracking-wider">INT</div>
                </div>
                <div className="player-card-dk text-center">
                  <div className="text-3xl font-dk-display font-black text-dk-green-primary mb-2">
                    {(seasonStats.qbr || seasonStats.passer_rating)?.toFixed(1) || 'N/A'}
                  </div>
                  <div className="text-dk-white-muted font-dk text-sm uppercase tracking-wider">QBR</div>
                </div>
              </>
            )}

            {(isRB || isQB) && (
              <>
                <div className="player-card-dk text-center">
                  <div className="text-3xl font-dk-display font-black text-dk-green-primary mb-2">
                    {seasonStats.rushing?.yards || seasonStats.rushing_yards || 0}
                  </div>
                  <div className="text-dk-white-muted font-dk text-sm uppercase tracking-wider">Rush Yds</div>
                </div>
                <div className="player-card-dk text-center">
                  <div className="text-3xl font-dk-display font-black text-dk-orange-primary mb-2">
                    {seasonStats.rushing?.touchdowns || seasonStats.rushing_touchdowns || 0}
                  </div>
                  <div className="text-dk-white-muted font-dk text-sm uppercase tracking-wider">Rush TD</div>
                </div>
                <div className="player-card-dk text-center">
                  <div className="text-3xl font-dk-display font-black text-dk-green-primary mb-2">
                    {(seasonStats.rushing?.yards_per_attempt || seasonStats.yards_per_rush_attempt)?.toFixed(1) || 0}
                  </div>
                  <div className="text-dk-white-muted font-dk text-sm uppercase tracking-wider">YPC</div>
                </div>
              </>
            )}

            {isWR && (
              <>
                <div className="player-card-dk text-center">
                  <div className="text-3xl font-dk-display font-black text-dk-green-primary mb-2">
                    {seasonStats.receiving?.receptions || seasonStats.receptions || 0}
                  </div>
                  <div className="text-dk-white-muted font-dk text-sm uppercase tracking-wider">Rec</div>
                </div>
                <div className="player-card-dk text-center">
                  <div className="text-3xl font-dk-display font-black text-dk-orange-primary mb-2">
                    {seasonStats.receiving?.yards || seasonStats.receiving_yards || 0}
                  </div>
                  <div className="text-dk-white-muted font-dk text-sm uppercase tracking-wider">Rec Yds</div>
                </div>
                <div className="player-card-dk text-center">
                  <div className="text-3xl font-dk-display font-black text-dk-green-primary mb-2">
                    {seasonStats.receiving?.touchdowns || seasonStats.receiving_touchdowns || 0}
                  </div>
                  <div className="text-dk-white-muted font-dk text-sm uppercase tracking-wider">Rec TD</div>
                </div>
                <div className="player-card-dk text-center">
                  <div className="text-3xl font-dk-display font-black text-dk-orange-primary mb-2">
                    {seasonStats.receiving?.targets || seasonStats.receiving_targets || 0}
                  </div>
                  <div className="text-dk-white-muted font-dk text-sm uppercase tracking-wider">Targets</div>
                </div>
                <div className="player-card-dk text-center">
                  <div className="text-3xl font-dk-display font-black text-dk-green-primary mb-2">
                    {(seasonStats.receiving?.yards_per_reception || seasonStats.yards_per_reception)?.toFixed(1) || 0}
                  </div>
                  <div className="text-dk-white-muted font-dk text-sm uppercase tracking-wider">YPR</div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-center py-12 mb-12 betting-slip">
            <span className="text-6xl">📊</span>
            <p className="text-xl text-dk-white-secondary font-dk mt-4">
              No season statistics available for {selectedSeason}
            </p>
          </div>
        )}

        {/* Game Logs */}
        <div className="betting-slip">
          <h3 className="text-2xl font-dk-display font-black text-dk-white-primary mb-6 uppercase">
            Game Log - {selectedSeason}
          </h3>
          
          {allGames.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="data-table compact-table">
                <thead>
                  <tr>
                    <th className="text-center">Week</th>
                    <th>Opponent</th>
                    <th className="text-center">Result</th>
                    {isQB && (
                      <>
                        <th className="text-center">CMP/ATT</th>
                        <th className="text-center">Pass Yds</th>
                        <th className="text-center">Pass TD</th>
                        <th className="text-center">INT</th>
                      </>
                    )}
                    {(isRB || isQB) && (
                      <>
                        <th className="text-center">Rush Att</th>
                        <th className="text-center">Rush Yds</th>
                        <th className="text-center">Rush TD</th>
                      </>
                    )}
                    {isWR && (
                      <>
                        <th className="text-center">Rec</th>
                        <th className="text-center">Rec Yds</th>
                        <th className="text-center">Rec TD</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {allGames.map((game, idx) => {
                    const isHome = game?.home_team?.id === player.team?.id
                    const opponent = isHome ? game?.visitor_team : game?.home_team
                    const teamScore = game?.home_team_score
                    const oppScore = game?.visitor_team_score
                    
                    // Check if game has been played
                    const isPlayed = teamScore !== null && oppScore !== null
                    
                    // Find matching player stats for this game
                    const stat = gameStats.find(s => s.game?.id === game.id)
                    
                    // Determine if player participated
                    const didNotPlay = isPlayed && !stat
                    const notPlayedYet = !isPlayed
                    
                    let result = ''
                    if (isPlayed) {
                      const playerTeamScore = isHome ? teamScore : oppScore
                      const opponentScore = isHome ? oppScore : teamScore
                      result = playerTeamScore > opponentScore ? 'W' : playerTeamScore < opponentScore ? 'L' : 'T'
                    }

                    return (
                      <tr 
                        key={idx} 
                        className={notPlayedYet ? 'opacity-50' : didNotPlay ? 'opacity-75' : ''}
                      >
                        <td className="text-center font-dk-display font-bold">
                          {game?.week}
                        </td>
                        <td className="font-dk-display font-bold">
                          {isHome ? 'vs' : '@'} {opponent?.abbreviation}
                        </td>
                        <td className="text-center">
                          {notPlayedYet ? (
                            <span className="badge badge-dark">Upcoming</span>
                          ) : didNotPlay ? (
                            <span className="badge badge-orange">DNP</span>
                          ) : (
                            <span className={`font-dk-display font-black ${
                              result === 'W' ? 'text-dk-green-primary' : 
                              result === 'L' ? 'text-dk-orange-primary' : 
                              'text-dk-white-secondary'
                            }`}>
                              {result} {isHome ? teamScore : oppScore}-{isHome ? oppScore : teamScore}
                            </span>
                          )}
                        </td>
                        {isQB && (
                          <>
                            <td className="text-center font-dk-display font-bold">
                              {notPlayedYet ? '-' : didNotPlay ? '-' : `${stat?.passing?.completions || stat?.passing_completions || 0}/${stat?.passing?.attempts || stat?.passing_attempts || 0}`}
                            </td>
                            <td className="text-center font-dk-display font-bold text-dk-green-primary">
                              {notPlayedYet ? '-' : didNotPlay ? '-' : stat?.passing?.yards || stat?.passing_yards || 0}
                            </td>
                            <td className="text-center font-dk-display font-bold text-dk-orange-primary">
                              {notPlayedYet ? '-' : didNotPlay ? '-' : stat?.passing?.touchdowns || stat?.passing_touchdowns || 0}
                            </td>
                            <td className="text-center font-dk-display font-bold text-dk-orange-primary">
                              {notPlayedYet ? '-' : didNotPlay ? '-' : stat?.passing?.interceptions || stat?.passing_interceptions || 0}
                            </td>
                          </>
                        )}
                        {(isRB || isQB) && (
                          <>
                            <td className="text-center font-dk-display font-bold">
                              {notPlayedYet ? '-' : didNotPlay ? '-' : stat?.rushing?.attempts || stat?.rushing_attempts || 0}
                            </td>
                            <td className="text-center font-dk-display font-bold text-dk-green-primary">
                              {notPlayedYet ? '-' : didNotPlay ? '-' : stat?.rushing?.yards || stat?.rushing_yards || 0}
                            </td>
                            <td className="text-center font-dk-display font-bold text-dk-orange-primary">
                              {notPlayedYet ? '-' : didNotPlay ? '-' : stat?.rushing?.touchdowns || stat?.rushing_touchdowns || 0}
                            </td>
                          </>
                        )}
                        {isWR && (
                          <>
                            <td className="text-center font-dk-display font-bold">
                              {notPlayedYet ? '-' : didNotPlay ? '-' : stat?.receiving?.receptions || stat?.receptions || 0}
                            </td>
                            <td className="text-center font-dk-display font-bold text-dk-green-primary">
                              {notPlayedYet ? '-' : didNotPlay ? '-' : stat?.receiving?.yards || stat?.receiving_yards || 0}
                            </td>
                            <td className="text-center font-dk-display font-bold text-dk-orange-primary">
                              {notPlayedYet ? '-' : didNotPlay ? '-' : stat?.receiving?.touchdowns || stat?.receiving_touchdowns || 0}
                            </td>
                          </>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <span className="text-6xl">📅</span>
              <p className="text-xl text-dk-white-secondary font-dk mt-4">
                No game schedule available for this season
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="mt-12 pt-8 border-t border-dk-black-light">
          <Link to="/players" className="link-orange text-xl font-dk-display font-bold uppercase">
            ← Back to Players
          </Link>
        </nav>
      </div>
    </div>
  )
}

export default PlayerProfile