import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getPlayerInjuries, getTeams } from '../services/nflApi'

function Injuries() {
  const [injuries, setInjuries] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedTeam, setSelectedTeam] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const teamsData = await getTeams()
        setTeams(teamsData.data || [])
      } catch (err) {
        console.error('Error fetching teams:', err)
      }
    }
    fetchTeams()
  }, [])

  useEffect(() => {
    const fetchInjuries = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const options = { per_page: 50 }
        if (selectedTeam) {
          options.team_ids = [parseInt(selectedTeam)]
        }
        
        const data = await getPlayerInjuries(options)
        let injuriesData = data.data || []
        
        // Filter by status if selected
        if (selectedStatus) {
          injuriesData = injuriesData.filter(inj => inj.status === selectedStatus)
        }
        
        setInjuries(injuriesData)
      } catch (err) {
        if (err?.status === 429) {
          setError('Rate limit reached. Please wait 60 seconds.')
        } else if (err?.status === 401) {
          setError('This feature requires a paid API tier.')
        } else {
          setError('Failed to load injury data')
        }
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchInjuries()
  }, [selectedTeam, selectedStatus])

  const statusColors = {
    'Out': 'status-out',
    'Doubtful': 'status-doubtful',
    'Questionable': 'status-questionable',
    'Probable': 'status-probable'
  }

  return (
    <div className="injuries-page">
      <h1>🚑 NFL Injury Report</h1>
      
      <div className="filters">
        <select 
          value={selectedTeam} 
          onChange={(e) => setSelectedTeam(e.target.value)}
          className="filter-select"
        >
          <option value="">All Teams</option>
          {teams.map(team => (
            <option key={team.id} value={team.id}>
              {team.full_name}
            </option>
          ))}
        </select>

        <select 
          value={selectedStatus} 
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="filter-select"
        >
          <option value="">All Statuses</option>
          <option value="Out">Out</option>
          <option value="Doubtful">Doubtful</option>
          <option value="Questionable">Questionable</option>
          <option value="Probable">Probable</option>
        </select>
      </div>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p>Loading injury report...</p>
      ) : (
        <div className="injuries-grid">
          {injuries.length > 0 ? (
            injuries.map((injury, idx) => (
              <div key={`${injury.player?.id}-${idx}`} className="injury-card">
                <div className="injury-header">
                  <Link to={`/players/${injury.player?.id}`} className="player-name-link">
                    <h3>{injury.player?.first_name} {injury.player?.last_name}</h3>
                  </Link>
                  <span className={`status-badge ${statusColors[injury.status] || ''}`}>
                    {injury.status}
                  </span>
                </div>
                
                <div className="injury-details">
                  <div className="player-info">
                    <span className="position">{injury.player?.position}</span>
                    <span>•</span>
                    <span className="team">{injury.player?.team?.abbreviation}</span>
                    <span>•</span>
                    <span className="jersey">#{injury.player?.jersey_number}</span>
                  </div>
                  
                  {injury.comment && (
                    <p className="injury-comment">{injury.comment}</p>
                  )}
                  
                  {injury.date && (
                    <p className="injury-date">
                      Updated: {new Date(injury.date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="no-injuries">
              <p>No injury reports found for the selected filters</p>
              <p className="sub-note">Note: Injury data requires a paid API tier</p>
            </div>
          )}
        </div>
      )}

      <nav className="page-nav">
        <Link to="/">← Back to Home</Link>
      </nav>
    </div>
  )
}

export default Injuries
