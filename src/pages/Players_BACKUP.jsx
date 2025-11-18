import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams, useLoaderData, useNavigate } from 'react-router-dom'

function Players() {
  const { players: initialPlayers, fantasyPoints: initialFantasyPoints, searchTerm: initialSearch, positionFilter: initialPosition, sortBy: initialSort } = useLoaderData();
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate();
  
  const [players] = useState(initialPlayers);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [positionFilter, setPositionFilter] = useState(initialPosition);
  const [sortBy, setSortBy] = useState(initialSort);
  const [fantasyPoints] = useState(initialFantasyPoints);

  // REMOVED: useEffect for fetching players - now handled by loader
  // REMOVED: useEffect for fetching fantasy points - now handled by loader

  // Use useMemo instead of useEffect for filtering/sorting
  const filteredPlayers = useMemo(() => {
    let filtered = [...players]
    
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
          return bPoints - aPoints // Descending order
        default:
          return 0
      }
    })
    
    return filtered;
  }, [players, positionFilter, sortBy, fantasyPoints])

  const handleSearch = (e) => {
    e.preventDefault()
    const value = e.target.search.value
    // Navigate to trigger loader
    const params = new URLSearchParams();
    if (value) params.set('search', value);
    if (positionFilter !== 'all') params.set('position', positionFilter);
    if (sortBy !== 'name') params.set('sort', sortBy);
    navigate(`/players?${params.toString()}`);
  }

  const handlePositionFilter = (position) => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (position !== 'all') params.set('position', position);
    if (sortBy !== 'name') params.set('sort', sortBy);
    navigate(`/players?${params.toString()}`);
  }

  const handleSort = (sort) => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (positionFilter !== 'all') params.set('position', positionFilter);
    if (sort !== 'name') params.set('sort', sort);
    navigate(`/players?${params.toString()}`);
  }

  const clearFilters = () => {
    navigate('/players');
  }

return (
    <div className="min-h-screen bg-dk-black-primary">
      {/* Header */}
      <div className="bg-dk-black-secondary border-b border-dk-black-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-dk-display font-black text-dk-white-primary mb-2">
                NFL <span className="text-dk-green-primary">PLAYERS</span>
              </h1>
              <p className="text-dk-white-secondary font-dk text-lg">Search player database by name, position, and team</p>
            </div>
            <div className="hidden md:block">
              <div className="text-right">
                <div className="text-3xl font-dk-display font-black text-dk-green-primary">
                  {filteredPlayers.length}
                </div>
                <div className="text-sm text-dk-white-muted font-dk">SHOWING PLAYERS</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filter Section - Replaces tab buttons */}
        <div className="mb-8">
          <form onSubmit={handleSearch} className="mb-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  name="search"
                  placeholder="Search players by name..."
                  defaultValue={searchTerm}
                  className="w-full px-4 py-3 bg-dk-black-tertiary border border-dk-black-light rounded-dk text-dk-white-primary placeholder-dk-white-muted font-dk focus:outline-none focus:ring-2 focus:ring-dk-green-primary focus:border-transparent transition-all"
                />
              </div>
              <button type="submit" className="px-6 py-3 bg-dk-green-primary hover:bg-dk-green-secondary text-dk-black-primary font-dk-display font-bold rounded-dk transition-all duration-200">
                SEARCH
              </button>
            </div>
          </form>
          
          {/* Filter Options Row */}
          <div className="flex flex-wrap gap-3">
            {/* Position Filter Buttons */}
            <button 
              className={`px-4 py-2 rounded-dk font-dk-display font-bold transition-all duration-200 text-sm ${
                positionFilter === 'all' 
                  ? 'bg-dk-green-primary text-dk-black-primary' 
                  : 'bg-dk-black-tertiary text-dk-white-secondary border border-dk-black-light hover:bg-dk-black-light'
              }`}
              onClick={() => handlePositionFilter('all')}
            >
              ALL
            </button>
            <button 
              className={`px-4 py-2 rounded-dk font-dk-display font-bold transition-all duration-200 text-sm ${
                positionFilter === 'QB' 
                  ? 'bg-dk-orange-primary text-dk-white-primary' 
                  : 'bg-dk-black-tertiary text-dk-white-secondary border border-dk-black-light hover:bg-dk-black-light'
              }`}
              onClick={() => handlePositionFilter('QB')}
            >
              QB
            </button>
            <button 
              className={`px-4 py-2 rounded-dk font-dk-display font-bold transition-all duration-200 text-sm ${
                positionFilter === 'RB' 
                  ? 'bg-dk-orange-primary text-dk-white-primary' 
                  : 'bg-dk-black-tertiary text-dk-white-secondary border border-dk-black-light hover:bg-dk-black-light'
              }`}
              onClick={() => handlePositionFilter('RB')}
            >
              RB
            </button>
            <button 
              className={`px-4 py-2 rounded-dk font-dk-display font-bold transition-all duration-200 text-sm ${
                positionFilter === 'WR' 
                  ? 'bg-dk-orange-primary text-dk-white-primary' 
                  : 'bg-dk-black-tertiary text-dk-white-secondary border border-dk-black-light hover:bg-dk-black-light'
              }`}
              onClick={() => handlePositionFilter('WR')}
            >
              WR
            </button>
            <button 
              className={`px-4 py-2 rounded-dk font-dk-display font-bold transition-all duration-200 text-sm ${
                positionFilter === 'TE' 
                  ? 'bg-dk-orange-primary text-dk-white-primary' 
                  : 'bg-dk-black-tertiary text-dk-white-secondary border border-dk-black-light hover:bg-dk-black-light'
              }`}
              onClick={() => handlePositionFilter('TE')}
            >
              TE
            </button>
            
            {/* Sort Dropdown */}
            <select 
              value={sortBy} 
              onChange={(e) => handleSort(e.target.value)}
              className="px-4 py-2 bg-dk-black-tertiary border border-dk-black-light rounded-dk text-dk-white-secondary font-dk-display font-bold text-sm hover:bg-dk-black-light transition-all cursor-pointer"
            >
              <option value="name">SORT: NAME</option>
              <option value="position">SORT: POSITION</option>
              <option value="team">SORT: TEAM</option>
              <option value="jersey">SORT: JERSEY</option>
              <option value="fantasy">SORT: FANTASY PTS</option>
            </select>
            
            {/* Clear Filters Button */}
            {(searchTerm || positionFilter !== 'all' || sortBy !== 'name') && (
              <button 
                onClick={clearFilters}
                className="px-4 py-2 bg-dk-black-tertiary text-dk-white-muted border border-dk-black-light rounded-dk font-dk-display font-bold text-sm hover:bg-dk-black-light hover:text-dk-white-primary transition-all"
              >
                CLEAR
              </button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {/* REMOVED: Loading state - handled by loader */}
        
        {/* Error State - Can still show if API fails */}
        {players.length === 0 && searchTerm && (
          <div className="text-center py-16">
            <div className="inline-flex items-center space-x-3">
              <span className="text-4xl">⚠</span>
              <p className="text-dk-orange-primary font-dk-display font-bold text-xl">NO PLAYERS FOUND</p>
            </div>
          </div>
        )}

         {/* Results Header */}
         {filteredPlayers.length > 0 && (
           <div className="mb-6">
             <p className="text-dk-white-muted font-dk">
               Showing <span className="text-dk-green-primary font-bold">{filteredPlayers.length}</span> of {players.length} players
             </p>
           </div>
         )}

         {/* Players List - Modern Table View */}
         <div className="card">
           {filteredPlayers.length > 0 ? (
             <div className="overflow-x-auto">
               <table className="w-full">
                 <thead>
                   <tr className="border-b border-dk-black-light">
                     <th className="text-left py-4 px-4 text-dk-white-muted font-dk-display text-sm uppercase tracking-wider">Player</th>
                     <th className="text-left py-4 px-4 text-dk-white-muted font-dk-display text-sm uppercase tracking-wider">Position</th>
                     <th className="text-left py-4 px-4 text-dk-white-muted font-dk-display text-sm uppercase tracking-wider">Team</th>
                     <th className="text-left py-4 px-4 text-dk-white-muted font-dk-display text-sm uppercase tracking-wider">Jersey</th>
                     <th className="text-left py-4 px-4 text-dk-white-muted font-dk-display text-sm uppercase tracking-wider">Physical</th>
                     <th className="text-left py-4 px-4 text-dk-white-muted font-dk-display text-sm uppercase tracking-wider">Fantasy Pts</th>
                     <th className="text-left py-4 px-4 text-dk-white-muted font-dk-display text-sm uppercase tracking-wider">College</th>
                     <th className="text-center py-4 px-4 text-dk-white-muted font-dk-display text-sm uppercase tracking-wider">Actions</th>
                   </tr>
                 </thead>
                 <tbody>
                   {filteredPlayers.map((player, index) => (
                     <tr 
                       key={player.id} 
                       className="border-t border-dk-black-light hover:bg-dk-black-tertiary transition-colors duration-150"
                     >
                       <td className="py-4 px-4">
                         <Link 
                           to={`/players/${player.id}`}
                           className="flex items-center space-x-3 group"
                         >
                           <div className="w-10 h-10 bg-dk-black-tertiary rounded-lg flex items-center justify-center group-hover:bg-dk-green-primary/10 transition-colors duration-200">
                             <span className="text-dk-green-primary font-dk-display font-bold text-sm">
                               {player.jersey_number || '#'}
                             </span>
                           </div>
                           <div>
                             <div className="font-dk-display font-semibold text-dk-white-primary group-hover:text-dk-green-primary transition-colors duration-200">
                               {player.first_name} {player.last_name}
                             </div>
                             <div className="text-sm text-dk-white-muted">
                               ID: {player.id}
                             </div>
                           </div>
                         </Link>
                       </td>
                       <td className="py-4 px-4">
                         <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-dk-display font-bold bg-dk-green-primary/10 text-dk-green-primary border border-dk-green-primary/20">
                           {player.position || 'N/A'}
                         </span>
                       </td>
                       <td className="py-4 px-4">
                         {player.team ? (
                           <div>
                             <div className="font-dk-display font-semibold text-dk-white-primary">
                               {player.team.abbreviation}
                             </div>
                             <div className="text-sm text-dk-white-muted">
                               {player.team.full_name}
                             </div>
                           </div>
                         ) : (
                           <span className="text-dk-white-muted">N/A</span>
                         )}
                       </td>
                       <td className="py-4 px-4">
                         <div className="text-lg font-dk-display font-bold text-dk-white-primary">
                           {player.jersey_number || 'N/A'}
                         </div>
                       </td>
                       <td className="py-4 px-4">
                         <div className="text-sm text-dk-white-secondary font-dk">
                           {player.height && player.weight ? (
                             <div>
                               <div>{player.height}</div>
                               <div>{player.weight}lbs</div>
                             </div>
                           ) : (
                             player.height || player.weight || 'N/A'
                           )}
                         </div>
                       </td>
                       <td className="py-4 px-4">
                         {fantasyPoints[player.id] ? (
                           <div className="text-lg font-dk-display font-bold text-dk-green-primary">
                             {fantasyPoints[player.id].toFixed(1)}
                           </div>
                         ) : (
                           <div className="text-sm text-dk-white-muted">N/A</div>
                         )}
                       </td>
                       <td className="py-4 px-4">
                         <div className="text-sm text-dk-white-secondary font-dk">
                           {player.college || 'N/A'}
                         </div>
                       </td>
                       <td className="py-4 px-4 text-center">
                         <Link 
                           to={`/players/${player.id}`}
                           className="inline-flex items-center px-4 py-2 bg-dk-green-primary hover:bg-dk-green-secondary text-dk-black-primary font-dk-display font-bold text-sm rounded-dk transition-all duration-200"
                         >
                           View Stats
                         </Link>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           ) : (
             <div className="text-center py-20">
               <div className="mb-6">
                 <span className="text-8xl">🔍</span>
               </div>
               <h3 className="text-4xl font-dk-display font-black text-dk-white-primary mb-4 uppercase">
                 No Players Found
               </h3>
               <p className="text-xl text-dk-white-secondary mb-8 font-dk">
                 {searchTerm 
                   ? `No results for "${searchTerm}"`
                   : 'Try searching for a player name'
                 }
               </p>
             </div>
           )}
         </div>

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

export default Players
