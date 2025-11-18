import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { getActivePlayers, getTeams, getStandings } from '../services/nflApi'
import { supabase } from '../services/supabase'
import NFLNavBanner from '../components/NFLNavBanner'

// Helper function to convert position to abbreviation
const getPositionAbbreviation = (position) => {
  const abbreviations = {
    'C': 'C',
    'G': 'G',
    'T': 'T',
    'Center': 'C',
    'Guard': 'G',
    'Tackle': 'T',
    'QB': 'QB',
    'Quarterback': 'QB',
    'RB': 'HB',
    'Running Back': 'HB',
    'Halfback': 'HB',
    'Runningback': 'HB',
    'WR': 'WR',
    'Wide Receiver': 'WR',
    'Receiver': 'WR',
    'TE': 'TE',
    'Tight End': 'TE',
    'K': 'K',
    'Kicker': 'K',
    'P': 'P',
    'Punter': 'P',
    'DL': 'DL',
    'LB': 'LB',
    'DB': 'DB',
    'DE': 'DE',
    'DT': 'DT',
    'CB': 'CB',
    'S': 'S',
    'FS': 'FS',
    'SS': 'SS',
    'OLB': 'OLB',
    'MLB': 'MLB',
    'ILB': 'ILB'
  }
  return abbreviations[position] || position
}

function NFLDashboard() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  
  // Active tab: 'players', 'teams', or 'standings'
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'players')
  
  // Players state
  const [players, setPlayers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [positionFilter, setPositionFilter] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [fantasyPoints, setFantasyPoints] = useState({})
  
  // Teams state
  const [teams, setTeams] = useState([])
  const [teamsConference, setTeamsConference] = useState('')
  
  // Standings state
  const [standings, setStandings] = useState([])
  const [standingsConference, setStandingsConference] = useState('')
  
  // Loading states
  const [loadingPlayers, setLoadingPlayers] = useState(false)
  const [loadingTeams, setLoadingTeams] = useState(false)
  const [loadingStandings, setLoadingStandings] = useState(false)

  // Update URL when tab changes
  useEffect(() => {
    const params = new URLSearchParams()
    if (activeTab !== 'players') params.set('tab', activeTab)
    navigate(`/nfl?${params.toString()}`, { replace: true })
  }, [activeTab, navigate])

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 'players') {
      fetchPlayers()
    } else if (activeTab === 'teams') {
      fetchTeams()
    } else if (activeTab === 'standings') {
      fetchStandings()
    }
  }, [activeTab, teamsConference, standingsConference])

  const fetchPlayers = async () => {
    try {
      setLoadingPlayers(true)
      
      // Fetch players from API
      const playersData = await getActivePlayers({ per_page: 100 })
      const apiPlayers = playersData?.data || []
      setPlayers(apiPlayers)
      
      // Load weekly projected points from player_cards table
      const { data: playerCards } = await supabase
        .from('player_cards')
        .select('player_id, weekly_projected_points')
        .eq('is_active', true)
      
      if (playerCards) {
        const pointsMap = playerCards.reduce((acc, card) => {
          acc[card.player_id] = parseFloat(card.weekly_projected_points) || 0
          return acc
        }, {})
        setFantasyPoints(pointsMap)
        console.log('📊 Loaded projections for', playerCards.length, 'players')
      }
    } catch (error) {
      console.error('Error fetching players:', error)
    } finally {
      setLoadingPlayers(false)
    }
  }

  const fetchTeams = async () => {
    try {
      setLoadingTeams(true)
      const options = {}
      if (teamsConference) {
        options.conference = teamsConference
      }
      const data = await getTeams(options)
      setTeams(data?.data || [])
    } catch (error) {
      console.error('Error fetching teams:', error)
    } finally {
      setLoadingTeams(false)
    }
  }

  const fetchStandings = async () => {
    try {
      setLoadingStandings(true)
      const data = await getStandings(2025)
      let filteredData = data?.data || []
      
      if (standingsConference) {
        filteredData = filteredData.filter(
          standing => standing.team?.conference === standingsConference
        )
      }
      
      setStandings(filteredData)
    } catch (error) {
      console.error('Error fetching standings:', error)
    } finally {
      setLoadingStandings(false)
    }
  }

  // Filter and sort players
  const filteredPlayers = useMemo(() => {
    let filtered = [...players]
    
    // Filter by search
    if (searchTerm) {
      filtered = filtered.filter(player =>
        `${player.first_name} ${player.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    // Filter by position
    if (positionFilter !== 'all') {
      filtered = filtered.filter(player => player.position === positionFilter)
    }
    
    // Sort players
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
        case 'position':
          return (a.position || '').localeCompare(b.position || '')
        case 'team':
          return (a.team?.abbreviation || '').localeCompare(b.team?.abbreviation || '')
        case 'jersey':
          return (a.jersey_number || 0) - (b.jersey_number || 0)
        case 'fantasy':
          const aPoints = fantasyPoints[a.id] || 0
          const bPoints = fantasyPoints[b.id] || 0
          return bPoints - aPoints
        default:
          return 0
      }
    })
    
    return filtered
  }, [players, searchTerm, positionFilter, sortBy, fantasyPoints])

  const handleSearch = (e) => {
    e.preventDefault()
    setSearchTerm(e.target.search.value)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setPositionFilter('all')
    setSortBy('name')
  }

  const groupByDivision = (items) => {
    return items.reduce((acc, item) => {
      const team = item.team || item
      const key = `${team.conference} ${team.division}`
      if (!acc[key]) acc[key] = []
      acc[key].push(item)
      return acc
    }, {})
  }

  const teamDivisions = groupByDivision(teams)
  const standingsDivisions = groupByDivision(standings)

  const getRarityColor = (position) => {
    // Color code by position - matching bench style
    switch (position) {
      case 'QB': return 'border-purple-500/50 bg-purple-500/5';
      case 'RB': return 'border-blue-500/50 bg-blue-500/5';
      case 'WR': return 'border-green-500/50 bg-green-500/5';
      case 'TE': return 'border-orange-500/50 bg-orange-500/5';
      default: return 'border-primary-black-600 bg-primary-black-800/30';
    }
  };

  const getPositionBadgeColor = (position) => {
    switch (position) {
      case 'QB': return 'bg-purple-600 text-purple-100';
      case 'RB': return 'bg-blue-600 text-blue-100';
      case 'WR': return 'bg-green-600 text-green-100';
      case 'TE': return 'bg-orange-600 text-orange-100';
      default: return 'bg-gray-600 text-gray-100';
    }
  };

  const getPositionFullName = (position) => {
    switch (position) {
      case 'QB': return 'Quarterback';
      case 'RB': return 'Running Back';
      case 'WR': return 'Wide Receiver';
      case 'TE': return 'Tight End';
      default: return position;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-black-950 via-primary-black-900 to-primary-black-950 bg-pattern">
      {/* NFL Nav Banner */}
      <NFLNavBanner />

      <div className="container-modern pb-8">


        {/* Players Tab Content */}
        {activeTab === 'players' && (
          <>
            {/* Search and Filter Section - Compact Card */}
            <div className="card mb-6">
              <form onSubmit={handleSearch} className="mb-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-primary-black-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      name="search"
                      placeholder="Search players by name..."
                      defaultValue={searchTerm}
                      className="w-full pl-12 pr-4 py-3 bg-primary-black-800 border border-primary-black-700 rounded-lg text-primary-black-50 placeholder-primary-black-400 font-dk focus:outline-none focus:ring-2 focus:ring-primary-green-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <button type="submit" className="btn px-6 py-3">
                    SEARCH
                  </button>
                </div>
              </form>
              
              {/* Filter Row */}
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-primary-black-400 text-xs font-dk-display font-semibold uppercase tracking-wider">Position:</span>
                {['all', 'QB', 'RB', 'WR', 'TE'].map((pos) => (
                  <button 
                    key={pos}
                    className={`px-3 py-1.5 rounded-lg font-dk-display font-bold transition-all duration-200 text-xs ${
                      positionFilter === pos 
                        ? (pos === 'all' ? 'bg-primary-green-500 text-primary-black-950' : 'bg-accent-orange-500 text-primary-black-50')
                        : 'bg-primary-black-800 text-primary-black-300 border border-primary-black-700 hover:bg-primary-black-700'
                    }`}
                    onClick={() => setPositionFilter(pos)}
                  >
                    {pos.toUpperCase()}
                  </button>
                ))}
                
                <div className="ml-auto flex items-center gap-2">
                  <select 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-1.5 bg-primary-black-800 border border-primary-black-700 rounded-lg text-primary-black-300 font-dk text-xs hover:bg-primary-black-700 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-green-500"
                  >
                    <option value="name">Sort: Name</option>
                    <option value="position">Sort: Position</option>
                    <option value="team">Sort: Team</option>
                    <option value="jersey">Sort: Jersey</option>
                    <option value="fantasy">Sort: Fantasy Pts</option>
                  </select>
                  
                  {(searchTerm || positionFilter !== 'all' || sortBy !== 'name') && (
                    <button 
                      onClick={clearFilters}
                      className="px-3 py-1.5 bg-primary-black-800 text-primary-black-300 border border-primary-black-700 rounded-lg font-dk-display font-bold text-xs hover:bg-primary-black-700 hover:text-primary-black-50 transition-all"
                    >
                      CLEAR
                    </button>
                  )}
                </div>
              </div>

              {/* Results Count */}
              {!loadingPlayers && filteredPlayers.length > 0 && (
                <div className="mt-4 pt-4 border-t border-primary-black-700">
                  <p className="text-sm text-primary-black-400">
                    Showing <span className="text-primary-green-400 font-bold">{filteredPlayers.length}</span> of {players.length} players
                  </p>
                </div>
              )}
            </div>

            {/* Players List - Exact Bench Style */}
            <div className="bg-primary-black-900 border-2 border-primary-black-700 rounded-xl">
              {/* Header */}
              <div className="sticky top-0 z-20 border-b-2 border-primary-black-700 rounded-t-xl transition-colors bg-primary-black-900">
                <div className="px-4 py-4">
                  <div className="flex items-center justify-between gap-6">
                    <div className="flex-shrink-0">
                      <h3 className="text-xl font-bold text-primary-black-50">NFL Players</h3>
                      <p className="text-xs text-primary-black-400 mt-0.5">
                        {loadingPlayers ? 'Loading...' : `${filteredPlayers.length} ${filteredPlayers.length === 1 ? 'player' : 'players'}`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* List View */}
              <div className="py-4 transition-all">
                {loadingPlayers ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="flex flex-col items-center gap-4">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-green-500"></div>
                      <p className="text-primary-green-400 font-dk-display font-bold">LOADING PLAYERS...</p>
                    </div>
                  </div>
                ) : filteredPlayers.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-center px-4">
                    <div>
                      <div className="text-4xl mb-2 opacity-30">🔍</div>
                      <p className="text-primary-black-400 font-semibold mb-1">No players found</p>
                      <p className="text-primary-black-500 text-sm">
                        {searchTerm 
                          ? `No results for "${searchTerm}"`
                          : 'Try adjusting your filters'
                        }
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    {filteredPlayers.map((player, index) => (
                      <Link
                        key={player.id}
                        to={`/players/${player.id}`}
                        className={`
                          flex items-center gap-4 px-4 py-4 transition-all cursor-pointer
                          hover:bg-primary-green-500/10 border-l-4 border-transparent hover:border-primary-green-500
                          ${index % 2 === 0 ? 'bg-primary-black-900' : 'bg-primary-black-800/50'}
                        `}
                      >
                        {/* Position Badge */}
                        <span className="px-2 py-0.5 bg-primary-black-700 text-primary-black-300 rounded text-xs font-semibold flex-shrink-0">
                          {getPositionAbbreviation(player.position)}
                        </span>

                        {/* Player Avatar */}
                        <div className="w-10 h-10 rounded-md bg-primary-black-700 flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-primary-black-300" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                          </svg>
                        </div>

                        {/* Player Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-primary-black-50 truncate text-base">
                              {player.first_name} {player.last_name}
                            </h4>
                            <span className="text-xs text-primary-black-500 font-medium">
                              {player.team?.abbreviation || 'FA'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-primary-black-400">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-600 text-gray-100">
                              c
                            </span>
                            <span className="font-medium">Level 1</span>
                          </div>
                        </div>

                        {/* Empty spacer to match bench layout */}
                        <div className="flex-1 flex items-center justify-center px-4"></div>

                        {/* Right side info */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {/* Game Matchup */}
                          <div>
                            <div className="px-2 py-1 bg-primary-black-700 text-primary-black-300 rounded text-xs text-center">
                              {player.team ? (
                                <>
                                  <div className="font-semibold">vs {player.team.abbreviation}</div>
                                  <div className="text-primary-black-400 mt-0.5 text-[10px]">Sun, Nov 9 • 1:00 PM</div>
                                </>
                              ) : (
                                <>
                                  <div className="font-semibold">BYE</div>
                                  <div className="text-primary-black-400 mt-0.5 text-[10px]">No game this week</div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Projected Points */}
                          <div className="text-primary-green-400 font-semibold text-sm">
                            {fantasyPoints[player.id] && fantasyPoints[player.id] > 0
                              ? `Proj: ${fantasyPoints[player.id].toFixed(1)} pts`
                              : <span className="text-primary-black-500 text-xs">No projection</span>
                            }
                          </div>
                        </div>

                        {/* Drag Handle */}
                        <div className="flex-shrink-0 text-primary-black-600 text-xl">
                          ⋮⋮
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Teams Tab Content */}
        {activeTab === 'teams' && (
          <>
            <div className="mb-8">
              <div className="flex flex-wrap gap-3">
                <button 
                  className={`px-6 py-3 rounded-dk font-dk-display font-bold transition-all duration-200 ${
                    teamsConference === '' 
                      ? 'bg-dk-green-primary text-dk-black-primary' 
                      : 'bg-dk-black-tertiary text-dk-white-secondary border border-dk-black-light hover:bg-dk-black-light'
                  }`}
                  onClick={() => setTeamsConference('')}
                >
                  ALL TEAMS
                </button>
                <button 
                  className={`px-6 py-3 rounded-dk font-dk-display font-bold transition-all duration-200 ${
                    teamsConference === 'AFC' 
                      ? 'bg-dk-orange-primary text-dk-white-primary' 
                      : 'bg-dk-black-tertiary text-dk-white-secondary border border-dk-black-light hover:bg-dk-black-light'
                  }`}
                  onClick={() => setTeamsConference('AFC')}
                >
                  AFC
                </button>
                <button 
                  className={`px-6 py-3 rounded-dk font-dk-display font-bold transition-all duration-200 ${
                    teamsConference === 'NFC' 
                      ? 'bg-dk-orange-primary text-dk-white-primary' 
                      : 'bg-dk-black-tertiary text-dk-white-secondary border border-dk-black-light hover:bg-dk-black-light'
                  }`}
                  onClick={() => setTeamsConference('NFC')}
                >
                  NFC
                </button>
              </div>
            </div>

            {loadingTeams ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dk-green-primary"></div>
                  <p className="text-dk-green-primary font-dk-display font-bold text-xl">LOADING TEAMS...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-12">
                {Object.entries(teamDivisions).map(([division, divTeams]) => (
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
          </>
        )}

        {/* Standings Tab Content */}
        {activeTab === 'standings' && (
          <>
            <div className="mb-8">
              <div className="flex flex-wrap gap-3">
                <button 
                  className={`px-6 py-3 rounded-dk font-dk-display font-bold transition-all duration-200 ${
                    standingsConference === '' 
                      ? 'bg-dk-green-primary text-dk-black-primary' 
                      : 'bg-dk-black-tertiary text-dk-white-secondary border border-dk-black-light hover:bg-dk-black-light'
                  }`}
                  onClick={() => setStandingsConference('')}
                >
                  ALL STANDINGS
                </button>
                <button 
                  className={`px-6 py-3 rounded-dk font-dk-display font-bold transition-all duration-200 ${
                    standingsConference === 'AFC' 
                      ? 'bg-dk-orange-primary text-dk-white-primary' 
                      : 'bg-dk-black-tertiary text-dk-white-secondary border border-dk-black-light hover:bg-dk-black-light'
                  }`}
                  onClick={() => setStandingsConference('AFC')}
                >
                  AFC
                </button>
                <button 
                  className={`px-6 py-3 rounded-dk font-dk-display font-bold transition-all duration-200 ${
                    standingsConference === 'NFC' 
                      ? 'bg-dk-orange-primary text-dk-white-primary' 
                      : 'bg-dk-black-tertiary text-dk-white-secondary border border-dk-black-light hover:bg-dk-black-light'
                  }`}
                  onClick={() => setStandingsConference('NFC')}
                >
                  NFC
                </button>
              </div>
            </div>

            {loadingStandings ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dk-green-primary"></div>
                  <p className="text-dk-green-primary font-dk-display font-bold text-xl">LOADING STANDINGS...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-12">
                {Object.entries(standingsDivisions).map(([division, divStandings]) => (
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
          </>
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

export default NFLDashboard
