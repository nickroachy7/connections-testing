import { useState, useEffect } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { useToast } from '../contexts/ToastContext'
import LoadingSpinner from '../components/LoadingSpinner'

export default function TeamSelection() {
  const navigate = useNavigate()
  const { success, error: showError } = useToast()
  const { user, profile, teams, setTeams, isCreating, setIsCreating } = useOutletContext()
  
  const [newTeamName, setNewTeamName] = useState('')
  const [loading, setLoading] = useState(false)
  const [deletingTeamId, setDeletingTeamId] = useState(null)
  const [isSimulated, setIsSimulated] = useState(false)
  const [simulatedSeasons, setSimulatedSeasons] = useState([])
  const [loadingSeasons, setLoadingSeasons] = useState(true)
  const [contestTypes, setContestTypes] = useState([])
  const [selectedContestType, setSelectedContestType] = useState(null)

  useEffect(() => {
    if (!user) {
      navigate('/login')
    }
  }, [user, navigate])

  useEffect(() => {
    if (user) {
      loadSimulatedSeasons()
      loadContestTypes()
    }
  }, [user])

  const loadSimulatedSeasons = async () => {
    try {
      const { data, error } = await supabase
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
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSimulatedSeasons(data || [])
    } catch (error) {
      console.error('Error loading simulated seasons:', error)
    } finally {
      setLoadingSeasons(false)
    }
  }

  const loadContestTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('contest_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

      if (error) throw error
      setContestTypes(data || [])
      
      // Set default to first contest type (18 weeks half PPR)
      if (data && data.length > 0) {
        setSelectedContestType(data[0].id)
      }
    } catch (error) {
      console.error('Error loading contest types:', error)
    }
  }

  const handleCreateTeam = async (e) => {
    e.preventDefault()
    
    if (!newTeamName.trim()) {
      showError('Please enter a team name')
      return
    }

    if (newTeamName.length > 50) {
      showError('Team name must be 50 characters or less')
      return
    }

    setLoading(true)
    try {
      // Use first contest type as default if not selected
      const contestTypeId = selectedContestType || (contestTypes.length > 0 ? contestTypes[0].id : null)
      
      if (!contestTypeId) {
        showError('No contest types available')
        return
      }

      // Always create regular team (not simulated)
      // Regular team creation - use edge function instead of direct RPC
      const { data, error } = await supabase.functions.invoke('start-new-team', {
        body: {
          team_name: newTeamName.trim(),
          contest_type_id: contestTypeId,
          team_image_url: null
        }
      })

      if (error) throw error

      // Edge function returns {team, starter_pack_id, user_pack_id, message}
      const newTeamId = data.team.id
      const userPackId = data.user_pack_id

      success(`Team "${newTeamName}" created!`)
      
      // Navigate to pack opening experience
      navigate(`/teams/${newTeamId}/open-pack/${userPackId}`)
    } catch (error) {
      console.error('Error creating team:', error)
      showError(error.message || 'Failed to create team')
    } finally {
      setLoading(false)
      setNewTeamName('')
      setIsCreating(false)
    }
  }

  const handleDeleteTeam = async (teamId, teamName, e) => {
    e.stopPropagation() // Prevent navigation when clicking delete
    
    if (!confirm(`Are you sure you want to delete "${teamName}"? This will permanently delete all players, tokens, lineups, and data associated with this team.`)) {
      return
    }

    setDeletingTeamId(teamId)
    try {
      const { error } = await supabase.rpc('delete_team', {
        p_team_id: teamId,
        p_user_id: user.id
      })

      if (error) throw error

      success(`Team "${teamName}" has been deleted`)
      
      // Remove team from local state
      setTeams(teamsList.filter(t => t.id !== teamId))
    } catch (error) {
      console.error('Error deleting team:', error)
      showError(error.message || 'Failed to delete team')
    } finally {
      setDeletingTeamId(null)
    }
  }

  const handleSelectTeam = async (teamId) => {
    try {
      // Set this team as active
      await supabase
        .from('teams')
        .update({ is_active: false })
        .eq('user_id', user.id)

      await supabase
        .from('teams')
        .update({ is_active: true })
        .eq('id', teamId)

      navigate(`/teams/${teamId}/dashboard`)
    } catch (error) {
      console.error('Error selecting team:', error)
      showError('Failed to select team')
    }
  }

  if (!user) return null

  // Ensure teams is an array
  const teamsList = Array.isArray(teams) ? teams : [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Simulated Seasons Section */}
      {!loadingSeasons && simulatedSeasons.length > 0 && (
        <div className="mb-8 bg-blue-900/20 border-2 border-blue-700 rounded-xl">
          <div className="bg-blue-900/30 px-4 py-3 border-b-2 border-blue-700">
            <h2 className="text-lg font-bold text-blue-300">🤖 Simulated Seasons (Testing)</h2>
          </div>
          <div className="p-4 space-y-2">
            {simulatedSeasons.map((season) => (
              <button
                key={season.id}
                onClick={() => navigate(`/fantasy/simulated/${season.id}`)}
                className="w-full flex items-center justify-between p-4 bg-primary-black-800 hover:bg-primary-black-700 border border-blue-600 rounded-lg transition-colors"
              >
                <div className="text-left">
                  <div className="font-bold text-blue-300">{season.season_name}</div>
                  <div className="text-sm text-primary-black-400">
                    Week {season.current_week} of {season.total_weeks}
                    {season.is_complete && <span className="ml-2 text-primary-green-400">• Complete</span>}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs text-primary-black-500">Your Team</div>
                    <div className="font-bold text-primary-black-200">
                      {season.user_team.wins}W - {season.user_team.losses}L
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Create New Team Button/Section */}
      <div className="mb-6">
        {!isCreating ? (
          <button
            onClick={() => setIsCreating(true)}
            className="w-full px-4 py-3 bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 font-bold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 border-2 border-dashed border-primary-green-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Create New Team</span>
          </button>
        ) : (
          <div className="bg-primary-black-900 border-2 border-primary-green-500 rounded-xl p-6">
            <h3 className="text-xl font-bold text-primary-black-50 mb-4">Create New Team</h3>
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label htmlFor="teamName" className="block text-sm font-medium text-primary-black-300 mb-2">
                  Team Name
                </label>
                <input
                  type="text"
                  id="teamName"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="Enter your team name..."
                  maxLength={50}
                  className="w-full px-4 py-3 bg-primary-black-700 border border-primary-black-600 rounded-lg text-primary-black-50 placeholder-primary-black-500 focus:outline-none focus:border-primary-green-500 transition-colors"
                  autoFocus
                />
                <p className="text-xs text-primary-black-500 mt-1">
                  {newTeamName.length}/50 characters
                </p>
              </div>

              <div className="bg-primary-green-900/20 border border-primary-green-700 rounded-lg p-3">
                <p className="text-sm text-primary-green-300">
                  <strong>Starter Pack Included:</strong> 8 players + 3 tokens + 1,000 coins
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading || !newTeamName.trim()}
                  className="flex-1 px-4 py-3 bg-primary-green-500 hover:bg-primary-green-400 disabled:bg-primary-black-700 disabled:text-primary-black-500 text-primary-black-950 font-bold rounded-lg transition-colors flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">Creating...</span>
                    </>
                  ) : (
                    'Create Team'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false)
                    setNewTeamName('')
                  }}
                  className="px-4 py-3 bg-primary-black-700 hover:bg-primary-black-600 text-primary-black-300 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* YOUR TEAMS Heading */}
      <div className="mb-4">
        <h2 className="text-2xl font-dk-display font-bold text-dk-white-primary">
          YOUR TEAMS
        </h2>
      </div>

      {/* Teams List Container */}
      <div className="bg-primary-black-900 border-2 border-primary-black-700 rounded-xl">
          {/* Teams List */}
          <div className="py-4">
            {/* Team Items */}
            {teamsList.length > 0 ? (
              <div>
                {teamsList.map((team, index) => (
                  <div
                    key={team.id}
                    className={`
                      w-full flex items-center gap-4 px-4 py-4 transition-all
                      border-l-4
                      ${index % 2 === 0 ? 'bg-primary-black-900' : 'bg-primary-black-800/50'}
                      ${team.is_active ? 'border-primary-green-500' : 'border-transparent'}
                    `}
                  >
                    {/* Team Badge/Icon */}
                    <button
                      onClick={() => handleSelectTeam(team.id)}
                      className="flex-shrink-0 hover:scale-105 transition-transform"
                    >
                      {team.team_image_url ? (
                        <img 
                          src={team.team_image_url} 
                          alt={team.team_name}
                          className="w-12 h-12 rounded-lg object-cover border-2 border-primary-black-700"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary-green-500 to-primary-green-700 flex items-center justify-center border-2 border-primary-black-700">
                          <span className="text-2xl font-bold text-primary-black-950">
                            {team.team_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </button>

                    {/* Team Info */}
                    <button
                      onClick={() => handleSelectTeam(team.id)}
                      className="flex-1 min-w-0 text-left hover:bg-primary-green-500/5 -mx-2 px-2 py-2 rounded transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-primary-black-50 text-lg truncate">
                          {team.team_name}
                        </h4>
                        {team.is_active && (
                          <span className="px-2 py-0.5 bg-primary-green-500 text-primary-black-950 rounded text-xs font-bold">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-primary-black-400">
                        <span>
                          <span className="text-primary-green-400 font-semibold">{team.wins}W</span>
                          {' - '}
                          <span className="text-red-400 font-semibold">{team.losses}L</span>
                        </span>
                        <span>•</span>
                        <span className="text-primary-black-300">
                          {parseFloat(team.total_points || 0).toFixed(1)} pts
                        </span>
                      </div>
                    </button>

                    {/* Team Stats */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-center">
                        <div className="text-xs text-primary-black-500 mb-0.5">Coins</div>
                        <div className="text-sm text-yellow-400 font-bold">
                          💰 {team.coins}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-xs text-primary-black-500 mb-0.5">Record</div>
                        <div className="text-sm text-primary-black-300 font-semibold">
                          {team.wins}-{team.losses}
                        </div>
                      </div>
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={(e) => handleDeleteTeam(team.id, team.team_name, e)}
                      disabled={deletingTeamId === team.id}
                      className="flex-shrink-0 p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete team"
                    >
                      {deletingTeamId === team.id ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>

                    {/* Arrow */}
                    <button
                      onClick={() => handleSelectTeam(team.id)}
                      className="flex-shrink-0 hover:text-primary-green-500 transition-colors"
                    >
                      <svg className="w-6 h-6 text-primary-black-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              !isCreating && (
                <div className="px-4 py-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-black-800 flex items-center justify-center">
                    <svg className="w-8 h-8 text-primary-black-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <p className="text-primary-black-400 text-lg mb-2">
                    No teams yet
                  </p>
                  <p className="text-primary-black-500 text-sm">
                    Use the button above to create your first team
                  </p>
                </div>
              )
            )}
          </div>

          {/* Footer */}
          {teamsList.length > 0 && (
            <div className="border-t-2 border-primary-black-700 bg-primary-black-800/50 rounded-b-xl">
              <div className="px-4 py-3">
                <p className="text-xs text-primary-black-400 text-center">
                  💡 Click any team to view its dashboard
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
  )
}
