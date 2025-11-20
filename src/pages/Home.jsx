import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

function Home() {
  const { user } = useAuth()
  const [leaderboard, setLeaderboard] = useState([])
  const [currentWeek, setCurrentWeek] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLeaderboard()
  }, [])

  const loadLeaderboard = async () => {
    try {
      setLoading(true)
      
      // Get current week
      const { data: configData } = await supabase
        .from('nfl_season_config')
        .select('current_week, season_year')
        .eq('is_active', true)
        .single()
      
      if (!configData) {
        setLoading(false)
        return
      }
      
      setCurrentWeek(configData)
      
      // Load top 50 weekly lineups
      const { data: lineups } = await supabase
        .from('weekly_lineups')
        .select(`
          id,
          total_points,
          team:teams!inner(
            id,
            team_name,
            team_image_url,
            is_bot,
            user:users(
              id,
              username,
              avatar_url
            )
          )
        `)
        .eq('week_number', configData.current_week)
        .eq('season_year', configData.season_year)
        .order('total_points', { ascending: false })
        .limit(50)
      
      // Fill remaining slots with empty entries
      const filledLineups = [...(lineups || [])]
      const totalSlots = 50
      
      for (let i = filledLineups.length; i < totalSlots; i++) {
        filledLineups.push({
          id: `empty-${i}`,
          isEmpty: true,
          total_points: null,
          team: null
        })
      }
      
      setLeaderboard(filledLineups)
      setLoading(false)
    } catch (error) {
      console.error('Error loading leaderboard:', error)
      setLoading(false)
    }
  }

  const getRankColor = (rank) => {
    if (rank === 1) return 'text-yellow-400'
    if (rank === 2) return 'text-gray-300'
    if (rank === 3) return 'text-amber-600'
    return 'text-primary-black-300'
  }

  return (
    <div className="min-h-screen">
      {/* Hero CTA Section */}
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-green-500/5 via-transparent to-accent-orange-500/5"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="mb-6 leading-tight">
              WHERE DO YOU <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-green-500 to-primary-green-400">RANK?</span>
            </h1>
            
            <p className="text-xl text-primary-black-300 font-dk mb-10">
              Build your roster. Set your lineup. Beat the median. Climb the leaderboard.
            </p>
            
            {!user ? (
              <Link to="/signup" className="btn btn-lg inline-flex items-center gap-2">
                <span>🏆</span>
                <span>CREATE YOUR TEAM</span>
              </Link>
            ) : (
              <Link to="/dashboard" className="btn btn-lg inline-flex items-center gap-2">
                <span>⚡</span>
                <span>GO TO DASHBOARD</span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Leaderboard Section */}
      <section className="pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-primary-black-50">
              Top 50 Teams - Week {currentWeek?.current_week || '—'}
            </h2>
          </div>

          {/* Leaderboard Table */}
          <div className="bg-primary-black-900 border-2 border-primary-black-700 rounded-xl">
            {loading ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-green-500 border-t-transparent mb-4"></div>
                <p className="text-primary-black-400">Loading leaderboard...</p>
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-primary-black-400 text-lg mb-6">
                  No teams have competed this week yet.
                </p>
                {!user && (
                  <Link to="/signup" className="btn">
                    Be the First to Compete
                  </Link>
                )}
              </div>
            ) : (
              <>
                {leaderboard.map((entry, index) => {
                  const rank = index + 1
                  const isCurrentUser = user && !entry.isEmpty && entry.team?.user?.id === user.id
                  
                  return (
                    <div
                      key={entry.id}
                      className={`
                        flex items-center gap-4 px-4 py-4 transition-all
                        hover:bg-primary-green-500/10 border-l-4 border-transparent hover:border-primary-green-500
                        ${index % 2 === 0 ? 'bg-primary-black-900' : 'bg-primary-black-800/50'}
                        ${isCurrentUser ? 'border-l-primary-green-500 bg-primary-green-500/5' : ''}
                        ${entry.isEmpty ? 'opacity-30' : ''}
                      `}
                    >
                      {/* Rank */}
                      <span className="px-2 py-0.5 bg-primary-black-700 text-primary-black-300 rounded text-xs font-semibold flex-shrink-0 min-w-[40px] text-center">
                        <span className={`${getRankColor(rank)}`}>
                          #{rank}
                        </span>
                      </span>

                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-md bg-primary-black-700 flex items-center justify-center flex-shrink-0">
                        {!entry.isEmpty && entry.team?.team_image_url ? (
                          <img
                            src={entry.team.team_image_url}
                            alt={entry.team.team_name}
                            className="w-10 h-10 rounded-md object-cover"
                          />
                        ) : !entry.isEmpty && entry.team?.user?.avatar_url ? (
                          <img
                            src={entry.team.user.avatar_url}
                            alt={entry.team.user.username}
                            className="w-10 h-10 rounded-md object-cover"
                          />
                        ) : !entry.isEmpty ? (
                          <div className="w-10 h-10 rounded-md bg-primary-green-500 flex items-center justify-center text-primary-black-950 text-sm font-bold">
                            {entry.team?.is_bot ? '🤖' : (entry.team?.team_name?.[0]?.toUpperCase() || entry.team?.user?.username?.[0]?.toUpperCase())}
                          </div>
                        ) : (
                          <svg className="w-6 h-6 text-primary-black-300" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                          </svg>
                        )}
                      </div>

                      {/* Team Name */}
                      <div className="flex-1 min-w-0">
                        <div className="text-primary-black-50 font-semibold truncate">
                          {!entry.isEmpty ? (
                            <>
                              {entry.team?.team_name || 'Unknown Team'}
                              {isCurrentUser && (
                                <span className="ml-2 text-xs text-primary-green-500">(You)</span>
                              )}
                            </>
                          ) : (
                            <span className="text-primary-black-500">—</span>
                          )}
                        </div>
                        <div className="text-primary-black-400 text-sm">
                          {!entry.isEmpty && (entry.team?.is_bot ? 'Bot' : `@${entry.team?.user?.username || 'unknown'}`)}
                        </div>
                      </div>

                      {/* Points */}
                      <div className="text-right flex-shrink-0">
                        <div className="text-xl font-bold text-primary-green-500">
                          {!entry.isEmpty ? entry.total_points?.toFixed(1) || '0.0' : '—'}
                        </div>
                        <div className="text-xs text-primary-black-400">PTS</div>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>

          {/* Call to Action for Non-Users */}
          {!user && leaderboard.length > 0 && (
            <div className="mt-8 text-center">
              <p className="text-primary-black-400 mb-4">
                Ready to compete?
              </p>
              <Link to="/signup" className="btn btn-lg">
                🏆 CREATE YOUR TEAM
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 border-t border-primary-black-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-primary-black-50 mb-8 text-center">
            How It Works
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-green-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🎁</span>
              </div>
              <h3 className="text-lg font-bold text-primary-black-50 mb-2">
                Open Packs
              </h3>
              <p className="text-sm text-primary-black-400">
                Get player cards and build your roster
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-accent-orange-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚡</span>
              </div>
              <h3 className="text-lg font-bold text-primary-black-50 mb-2">
                Set Lineup
              </h3>
              <p className="text-sm text-primary-black-400">
                Choose your best players each week
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary-green-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🏆</span>
              </div>
              <h3 className="text-lg font-bold text-primary-black-50 mb-2">
                Win Games
              </h3>
              <p className="text-sm text-primary-black-400">
                Beat the median score and climb the ranks
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home
