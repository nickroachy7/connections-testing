import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getTeams } from '../services/nflApi'

function Teams() {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedConference, setSelectedConference] = useState('')

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoading(true)
        const options = {}
        if (selectedConference) {
          options.conference = selectedConference
        }
        const data = await getTeams(options)
        setTeams(data?.data || [])
      } catch (error) {
        console.error('Error fetching teams:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTeams()
  }, [selectedConference])

  const groupByDivision = (teams) => {
    return teams.reduce((acc, team) => {
      const key = `${team.conference} ${team.division}`
      if (!acc[key]) acc[key] = []
      acc[key].push(team)
      return acc
    }, {})
  }

  const divisions = groupByDivision(teams)

  return (
    <div className="min-h-screen bg-dk-black-primary">
      {/* Header */}
      <div className="bg-dk-black-secondary border-b border-dk-black-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-dk-display font-black text-dk-white-primary mb-2">
                NFL <span className="text-dk-green-primary">TEAMS</span>
              </h1>
              <p className="text-dk-white-secondary font-dk text-lg">All 32 teams by conference and division</p>
            </div>
            <div className="hidden md:block">
              <div className="text-right">
                <div className="text-3xl font-dk-display font-black text-dk-green-primary">
                  {teams.length}
                </div>
                <div className="text-sm text-dk-white-muted font-dk">TOTAL TEAMS</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Conference Filters */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-3">
            <button 
              className={`px-6 py-3 rounded-dk font-dk-display font-bold transition-all duration-200 ${
                selectedConference === '' 
                  ? 'bg-dk-green-primary text-dk-black-primary' 
                  : 'bg-dk-black-tertiary text-dk-white-secondary border border-dk-black-light hover:bg-dk-black-light'
              }`}
              onClick={() => setSelectedConference('')}
            >
              ALL TEAMS
            </button>
            <button 
              className={`px-6 py-3 rounded-dk font-dk-display font-bold transition-all duration-200 ${
                selectedConference === 'AFC' 
                  ? 'bg-dk-orange-primary text-dk-white-primary' 
                  : 'bg-dk-black-tertiary text-dk-white-secondary border border-dk-black-light hover:bg-dk-black-light'
              }`}
              onClick={() => setSelectedConference('AFC')}
            >
              AFC
            </button>
            <button 
              className={`px-6 py-3 rounded-dk font-dk-display font-bold transition-all duration-200 ${
                selectedConference === 'NFC' 
                  ? 'bg-dk-orange-primary text-dk-white-primary' 
                  : 'bg-dk-black-tertiary text-dk-white-secondary border border-dk-black-light hover:bg-dk-black-light'
              }`}
              onClick={() => setSelectedConference('NFC')}
            >
              NFC
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center space-x-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dk-green-primary"></div>
              <p className="text-dk-green-primary font-dk-display font-bold text-xl">LOADING TEAMS...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-12">
            {Object.entries(divisions).map(([division, divTeams]) => (
              <div key={division} className="card">
                <div className="mb-6">
                  <h2 className="text-2xl font-dk-display font-black text-dk-white-primary flex items-center">
                    {division.includes('AFC') ? (
                      <span className="text-dk-orange-primary mr-3">🏈</span>
                    ) : (
                      <span className="text-dk-green-primary mr-3">🏈</span>
                    )}
                    {division}
                  </h2>
                  <div className="w-16 h-1 bg-dk-green-primary mt-2"></div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {divTeams.map(team => (
                    <Link 
                      key={team.id} 
                      to={`/teams/${team.id}`}
                      className="card card-hover group p-4"
                    >
                      <div className="text-center">
                        <div className="w-16 h-16 bg-dk-black-tertiary rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:bg-dk-green-primary/10 transition-colors">
                          <span className="text-2xl font-dk-display font-black text-dk-green-primary">
                            {team.abbreviation}
                          </span>
                        </div>
                        <h3 className="text-lg font-dk-display font-bold text-dk-white-primary mb-1 group-hover:text-dk-green-primary transition-colors">
                          {team.full_name}
                        </h3>
                        <p className="text-dk-white-muted text-sm">
                          {team.location}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
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

export default Teams
