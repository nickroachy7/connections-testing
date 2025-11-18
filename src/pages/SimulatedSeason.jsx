import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { useToast } from '../contexts/ToastContext'
import LoadingSpinner from '../components/LoadingSpinner'

export default function SimulatedSeason() {
  const { seasonId } = useParams()
  const navigate = useNavigate()
  const { success, error: showError } = useToast()
  
  const [season, setSeason] = useState(null)
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [simulating, setSimulating] = useState(false)
  const [weekResults, setWeekResults] = useState(null)

  useEffect(() => {
    loadSeasonData()
  }, [seasonId])

  const loadSeasonData = async () => {
    try {
      setLoading(true)
      
      // Load season info
      const { data: seasonData, error: seasonError } = await supabase
        .from('simulated_seasons')
        .select(`
          *,
          user_team:teams!simulated_seasons_user_team_id_fkey(
            id,
            team_name,
            wins,
            losses,
            total_points
          )
        `)
        .eq('id', seasonId)
        .single()

      if (seasonError) throw seasonError
      setSeason(seasonData)

      // Load all teams in the season (user team + bots)
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .eq('simulated_season_id', seasonId)
        .order('wins', { ascending: false })
        .order('total_points', { ascending: false })

      if (teamsError) throw teamsError
      setTeams(teamsData || [])
    } catch (error) {
      console.error('Error loading season:', error)
      showError('Failed to load season data')
    } finally {
      setLoading(false)
    }
  }

  const handleSimulateWeek = async () => {
    setSimulating(true)
    setWeekResults(null)
    try {
      const { data, error } = await supabase.rpc('simulate_week', {
        p_season_id: seasonId
      })

      if (error) throw error

      setWeekResults(data)
      success(`Week ${data.week} simulated!`)

      // Reload data to show updated standings
      await loadSeasonData()

      // If season is complete, auto-delete after showing results
      if (data.is_complete) {
        setTimeout(() => {
          handleDeleteSeason(true)
        }, 5000)
      }
    } catch (error) {
      console.error('Error simulating week:', error)
      showError(error.message || 'Failed to simulate week')
    } finally {
      setSimulating(false)
    }
  }

  const handleDeleteSeason = async (auto = false) => {
    if (!auto && !confirm('Are you sure you want to delete this simulated season? This will remove all bot teams.')) {
      return
    }

    try {
      const { error } = await supabase.rpc('delete_simulated_season', {
        p_season_id: seasonId,
        p_user_id: season.user_id
      })

      if (error) throw error

      if (!auto) {
        success('Simulated season deleted')
      }
      navigate('/fantasy')
    } catch (error) {
      console.error('Error deleting season:', error)
      showError(error.message || 'Failed to delete season')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading season..." />
      </div>
    )
  }

  if (!season) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-primary-black-400 text-lg mb-4">Season not found</p>
          <button
            onClick={() => navigate('/fantasy')}
            className="px-6 py-3 bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 font-bold rounded-lg transition-colors"
          >
            Back to Teams
          </button>
        </div>
      </div>
    )
  }

  const userTeam = teams.find(t => !t.is_bot)
  const userRank = teams.findIndex(t => t.id === userTeam?.id) + 1

  return (
    <div className="min-h-screen bg-primary-black-950 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/fantasy')}
            className="text-primary-black-400 hover:text-primary-green-500 mb-4 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Teams
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-primary-black-50 mb-2">
                🤖 {season.season_name}
              </h1>
              <p className="text-primary-black-400">
                Week {season.current_week} of {season.total_weeks}
                {season.is_complete && <span className="ml-2 text-primary-green-400">• Season Complete!</span>}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-primary-black-500">Your Rank</div>
              <div className="text-3xl font-bold text-primary-green-400">#{userRank}</div>
            </div>
          </div>
        </div>

        {/* Season Complete Message */}
        {season.is_complete && (
          <div className="mb-6 bg-primary-green-900/20 border-2 border-primary-green-500 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-primary-green-400 mb-2">
              🏆 Season Complete!
            </h2>
            <p className="text-primary-black-300 mb-4">
              Your team finished in <strong>#{userRank}</strong> place!
            </p>
            <p className="text-sm text-primary-black-400">
              This season and all bot teams will be automatically deleted in a few seconds, or you can delete it manually below.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mb-6 flex gap-4">
          {!season.is_complete && (
            <button
              onClick={handleSimulateWeek}
              disabled={simulating}
              className="flex-1 px-6 py-4 bg-primary-green-500 hover:bg-primary-green-400 disabled:bg-primary-black-700 disabled:text-primary-black-500 text-primary-black-950 font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {simulating ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Simulating Week {season.current_week}...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Simulate Week {season.current_week}</span>
                </>
              )}
            </button>
          )}
          <button
            onClick={() => handleDeleteSeason(false)}
            className="px-6 py-4 bg-red-500/20 border-2 border-red-500 hover:bg-red-500/30 text-red-400 font-bold rounded-lg transition-colors"
          >
            Delete Season
          </button>
        </div>

        {/* Week Results */}
        {weekResults && (
          <div className="mb-6 bg-primary-black-800 border-2 border-primary-green-500 rounded-xl p-6">
            <h3 className="text-xl font-bold text-primary-black-50 mb-4">
              Week {weekResults.week} Results
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {weekResults.results.map((matchup, index) => (
                <div key={index} className="bg-primary-black-900 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className={`font-bold ${matchup.winner_id === matchup.team1.team_id ? 'text-primary-green-400' : 'text-primary-black-400'}`}>
                        {matchup.team1.team_name} {!matchup.team1.is_bot && '👤'}
                      </div>
                      <div className="text-lg font-mono">{parseFloat(matchup.team1.points).toFixed(2)} pts</div>
                    </div>
                    <div className="text-primary-black-600 font-bold mx-4">VS</div>
                    <div className="flex-1 text-right">
                      <div className={`font-bold ${matchup.winner_id === matchup.team2.team_id ? 'text-primary-green-400' : 'text-primary-black-400'}`}>
                        {matchup.team2.team_name} {!matchup.team2.is_bot && '👤'}
                      </div>
                      <div className="text-lg font-mono">{parseFloat(matchup.team2.points).toFixed(2)} pts</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Standings */}
        <div className="bg-primary-black-900 border-2 border-primary-black-700 rounded-xl overflow-hidden">
          <div className="bg-primary-black-800 px-6 py-4 border-b-2 border-primary-black-700">
            <h2 className="text-xl font-bold text-primary-black-50">Standings</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-primary-black-800 border-b border-primary-black-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-primary-black-400 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-primary-black-400 uppercase tracking-wider">
                    Team
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-primary-black-400 uppercase tracking-wider">
                    W-L
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-primary-black-400 uppercase tracking-wider">
                    Points
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-black-800">
                {teams.map((team, index) => (
                  <tr
                    key={team.id}
                    className={`
                      ${team.id === userTeam?.id ? 'bg-primary-green-500/10 border-l-4 border-primary-green-500' : ''}
                      ${index % 2 === 0 ? 'bg-primary-black-900' : 'bg-primary-black-800/50'}
                      hover:bg-primary-black-700 transition-colors
                    `}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-lg font-bold text-primary-black-300">
                        #{index + 1}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-primary-black-50">
                          {team.team_name}
                        </div>
                        {!team.is_bot && (
                          <span className="px-2 py-0.5 bg-primary-green-500 text-primary-black-950 rounded text-xs font-bold">
                            YOU
                          </span>
                        )}
                        {team.is_bot && (
                          <span className="text-primary-black-500">🤖</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-mono font-bold">
                        <span className="text-primary-green-400">{team.wins}</span>
                        {' - '}
                        <span className="text-red-400">{team.losses}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="font-mono text-primary-black-300">
                        {parseFloat(team.total_points || 0).toFixed(2)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 bg-blue-900/20 border border-blue-700 rounded-lg p-4">
          <p className="text-sm text-blue-300">
            <strong>💡 Tip:</strong> Click "Simulate Week" to play through each week. The season will automatically clean up all bot teams when complete (18 weeks).
          </p>
        </div>
      </div>
    </div>
  )
}
