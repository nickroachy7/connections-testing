import { useState, useEffect } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { useToast } from '../contexts/ToastContext'
import LoadingSpinner from '../components/LoadingSpinner'
import TeamMenuCard from '../components/TeamMenuCard'

export default function TeamSelection() {
  const navigate = useNavigate()
  const { success, error: showError } = useToast()
  const { user, profile, teams, setTeams, isCreating, setIsCreating } = useOutletContext()
  
  const [newTeamName, setNewTeamName] = useState('')
  const [loading, setLoading] = useState(false)
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

      navigate(`/teams/${teamId}/starting-lineup`)
    } catch (error) {
      console.error('Error selecting team:', error)
      showError('Failed to select team')
    }
  }

  if (!user) return null

  // Ensure teams is an array - all teams are now DFS (public) teams
  const teamsList = Array.isArray(teams) ? teams : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Simulated Seasons Section */}
      {!loadingSeasons && simulatedSeasons.length > 0 && (
        <div className="mb-8 bg-blue-900/20 border-2 border-blue-700 rounded-lg">
          <div className="bg-blue-900/30 px-4 py-3 border-b-2 border-blue-700">
            <h2 className="text-lg font-dk-display font-bold text-blue-300">🤖 Simulated Seasons (Testing)</h2>
          </div>
          <div className="p-4 space-y-2">
            {simulatedSeasons.map((season) => (
              <button
                key={season.id}
                onClick={() => navigate(`/fantasy/simulated/${season.id}`)}
                className="w-full flex items-center justify-between p-4 bg-dk-black-tertiary hover:bg-dk-black-light border border-blue-600 rounded-lg transition-colors"
              >
                <div className="text-left">
                  <div className="font-bold text-blue-300">{season.season_name}</div>
                  <div className="text-sm text-dk-white-muted">
                    Week {season.current_week} of {season.total_weeks}
                    {season.is_complete && <span className="ml-2 text-dk-green-primary">• Complete</span>}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs text-dk-white-muted">Your Team</div>
                    <div className="font-bold text-dk-white-secondary">
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
            className="px-5 py-2.5 bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 font-bold rounded-xl transition-all duration-200 flex items-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Create New Team</span>
          </button>
        ) : (
          <div className="bg-dk-black-secondary border-2 border-dk-green-primary rounded-lg p-6">
            <h3 className="text-2xl font-dk-display font-black text-dk-white-primary mb-4">Create New Team</h3>
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label htmlFor="teamName" className="block text-sm font-dk font-semibold text-dk-white-secondary mb-2">
                  Team Name
                </label>
                <input
                  type="text"
                  id="teamName"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="Enter your team name..."
                  maxLength={50}
                  className="w-full px-4 py-3 bg-dk-black-tertiary border border-dk-black-light rounded-lg text-dk-white-primary placeholder-dk-white-muted focus:outline-none focus:border-dk-green-primary transition-colors"
                  autoFocus
                />
                <p className="text-xs text-dk-white-muted mt-1">
                  {newTeamName.length}/50 characters
                </p>
              </div>

              <div className="bg-dk-green-primary/10 border border-dk-green-primary/30 rounded-lg p-4">
                <p className="text-sm text-dk-white-secondary">
                  <strong className="text-dk-green-primary">Starter Pack Included:</strong> 8 players + 3 tokens + 1,000 coins
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading || !newTeamName.trim()}
                  className="flex-1 px-4 py-3 bg-dk-green-primary hover:bg-dk-green-secondary disabled:bg-dk-black-light disabled:text-dk-white-muted text-dk-black-primary font-dk-display font-bold rounded-lg transition-colors flex items-center justify-center"
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
                  className="px-4 py-3 bg-dk-black-tertiary hover:bg-dk-black-light text-dk-white-secondary font-dk font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* DFS Teams Grid */}
      {teamsList.length > 0 && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamsList.map((team) => (
              <TeamMenuCard
                key={team.id}
                team={team}
                isActive={team.is_active}
                onClick={() => handleSelectTeam(team.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* No Teams Message */}
      {teamsList.length === 0 && !isCreating && (
        <div className="bg-dk-black-secondary border-2 border-dk-black-light rounded-lg p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-dk-black-tertiary flex items-center justify-center">
            <svg className="w-10 h-10 text-dk-white-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-dk-white-secondary text-xl font-dk-display font-bold mb-2">
            No teams yet
          </p>
          <p className="text-dk-white-muted text-sm">
            Use the button above to create your first team
          </p>
        </div>
      )}
    </div>
  )
}
