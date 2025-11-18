import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getStandings } from '../services/nflApi'

function Standings() {
  const [standings, setStandings] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedConference, setSelectedConference] = useState('')

  useEffect(() => {
    const fetchStandings = async () => {
      try {
        setLoading(true)
        const data = await getStandings(2025)
        let filteredData = data?.data || []
        
        if (selectedConference) {
          filteredData = filteredData.filter(
            standing => standing.team?.conference === selectedConference
          )
        }
        
        setStandings(filteredData)
      } catch (error) {
        console.error('Error fetching standings:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStandings()
  }, [selectedConference])

  const groupByDivision = (standings) => {
    return standings.reduce((acc, standing) => {
      const key = `${standing.team?.conference} ${standing.team?.division}`
      if (!acc[key]) acc[key] = []
      acc[key].push(standing)
      return acc
    }, {})
  }

  const divisions = groupByDivision(standings)

  return (
    <div className="min-h-screen bg-dk-black-primary">
      {/* Header */}
      <div className="bg-dk-black-secondary border-b border-dk-black-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-dk-display font-black text-dk-white-primary mb-2">
                NFL <span className="text-dk-green-primary">STANDINGS</span>
              </h1>
              <p className="text-dk-white-secondary font-dk text-lg">2024 Season Conference & Division Rankings</p>
            </div>
            <div className="hidden md:block">
              <div className="text-right">
                <div className="text-3xl font-dk-display font-black text-dk-green-primary">
                  2024
                </div>
                <div className="text-sm text-dk-white-muted font-dk">SEASON</div>
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
              ALL STANDINGS
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
              <p className="text-dk-green-primary font-dk-display font-bold text-xl">LOADING STANDINGS...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-12">
            {Object.entries(divisions).map(([division, divStandings]) => (
              <div key={division} className="card">
                <div className="mb-6">
                  <h2 className="text-2xl font-dk-display font-black text-dk-white-primary flex items-center">
                    {division.includes('AFC') ? (
                      <span className="text-dk-orange-primary mr-3">🏆</span>
                    ) : (
                      <span className="text-dk-green-primary mr-3">🏆</span>
                    )}
                    {division}
                  </h2>
                  <div className="w-16 h-1 bg-dk-green-primary mt-2"></div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="data-table w-full">
                    <thead>
                      <tr>
                        <th className="text-center">RANK</th>
                        <th>TEAM</th>
                        <th className="text-center">W</th>
                        <th className="text-center">L</th>
                        <th className="text-center">T</th>
                        <th className="text-center">PCT</th>
                        <th className="text-center">PF</th>
                        <th className="text-center">PA</th>
                        <th className="text-center">DIFF</th>
                      </tr>
                    </thead>
                    <tbody>
                      {divStandings.map((standing) => {
                        const winPct = standing.wins / (standing.wins + standing.losses + standing.ties)
                        const isPlayoffTeam = standing.playoff_seed && standing.playoff_seed <= 7
                        
                        return (
                          <tr 
                            key={standing.team?.id}
                            className={isPlayoffTeam ? 'bg-dk-green-primary/5' : ''}
                          >
                            <td className="text-center">
                              {isPlayoffTeam ? (
                                <span className="badge badge-green text-xs">
                                  {standing.playoff_seed}
                                </span>
                              ) : (
                                <span className="text-dk-white-muted">-</span>
                              )}
                            </td>
                            <td>
                              <Link 
                                to={`/teams/${standing.team?.id}`}
                                className="group flex items-center space-x-3"
                              >
                                <div>
                                  <div className="font-dk-display font-bold text-dk-white-primary group-hover:text-dk-green-primary transition-colors">
                                    {standing.team?.abbreviation}
                                  </div>
                                  <div className="text-dk-white-muted text-sm">
                                    {standing.team?.name}
                                  </div>
                                </div>
                              </Link>
                            </td>
                            <td className="text-center font-dk-display font-bold text-dk-green-primary">
                              {standing.wins}
                            </td>
                            <td className="text-center font-dk-display font-bold text-dk-orange-primary">
                              {standing.losses}
                            </td>
                            <td className="text-center font-dk-display font-bold text-dk-white-secondary">
                              {standing.ties}
                            </td>
                            <td className="text-center font-dk-display font-bold text-dk-white-primary">
                              {winPct.toFixed(3)}
                            </td>
                            <td className="text-center font-dk-display font-bold text-dk-white-secondary">
                              {standing.points_for}
                            </td>
                            <td className="text-center font-dk-display font-bold text-dk-white-secondary">
                              {standing.points_against}
                            </td>
                            <td className={`text-center font-dk-display font-bold ${
                              standing.point_differential > 0 
                                ? 'text-dk-green-primary' 
                                : standing.point_differential < 0 
                                ? 'text-dk-orange-primary' 
                                : 'text-dk-white-secondary'
                            }`}>
                              {standing.point_differential > 0 ? '+' : ''}
                              {standing.point_differential}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Division Legend */}
                <div className="mt-6 pt-4 border-t border-dk-black-light">
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center">
                      <span className="badge badge-green text-xs mr-2">P</span>
                      <span className="text-dk-white-muted">Playoff Position</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-dk-green-primary font-dk-display font-bold mr-2">W</span>
                      <span className="text-dk-white-muted">Wins</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-dk-orange-primary font-dk-display font-bold mr-2">L</span>
                      <span className="text-dk-white-muted">Losses</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-dk-white-secondary font-dk-display font-bold mr-2">T</span>
                      <span className="text-dk-white-muted">Ties</span>
                    </div>
                  </div>
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

export default Standings
