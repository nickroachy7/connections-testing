import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { quickSellCard } from '../services/supabase';
import { calculatePlayerSellValue, calculateTokenSellValue } from '../utils/sellValueCalculator';
import InventoryPanel from '../components/InventoryPanel';
import RosterLimitBanner from '../components/RosterLimitBanner';
import RosterCount from '../components/RosterCount';

export default function Inventory() {
  // Use shared data from FantasyContext via outlet
  const { user, profile, activeTeam, inventory: contextInventory, refreshProfile, projections, liveGameData, currentWeek, loadInventory: reloadInventory } = useOutletContext();
  const [inventory, setInventory] = useState(contextInventory || { players: [], tokens: [] });
  const [filters, setFilters] = useState({
    position: 'all',
    rarity: 'all',
    tokenType: 'all',
    search: ''
  });
  const [selling, setSelling] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'

  // Sync inventory when context changes
  useEffect(() => {
    if (contextInventory && contextInventory.players) {
      setInventory(contextInventory);
    }
  }, [contextInventory]);


  const handleQuickSell = async (inventoryId, cardType, baseValue, skipConfirm = false) => {
    if (!skipConfirm && !window.confirm(`Are you sure you want to sell this card for ${baseValue} coins?`)) {
      return;
    }

    setSelling(prev => ({ ...prev, [inventoryId]: true }));
    setError('');
    setSuccess('');

    try {
      const result = await quickSellCard(inventoryId, cardType);
      setSuccess(`Card sold for ${result.coins_earned} coins! New balance: ${result.new_balance}`);
      
      // Remove sold item from inventory
      if (cardType === 'player') {
        setInventory(prev => ({
          ...prev,
          players: prev.players.filter(p => p.id !== inventoryId)
        }));
      } else {
        setInventory(prev => ({
          ...prev,
          tokens: prev.tokens.filter(t => t.id !== inventoryId)
        }));
      }
    } catch (err) {
      console.error('Error selling card:', err);
      setError(err.message || 'Failed to sell card');
    } finally {
      setSelling(prev => ({ ...prev, [inventoryId]: false }));
    }
  };

  const filteredTokens = inventory.tokens.filter(token => {
    const matchesType = filters.tokenType === 'all' || token.token_card.token_type === filters.tokenType;
    const matchesRarity = filters.rarity === 'all' || token.token_card.rarity === filters.rarity;
    const matchesSearch = filters.search === '' || 
      token.token_card.token_name.toLowerCase().includes(filters.search.toLowerCase());
    
    return matchesType && matchesRarity && matchesSearch;
  });

  if (!user || !profile || !activeTeam) {
    return null;
  }

  return (
    <>
      {/* Alerts and Team Selector - Only shown when needed */}
      {(error || success) && (
        <div className="max-w-7xl mx-auto mt-3 sm:mt-6 mb-3 sm:mb-6 px-2 sm:px-4">
            {/* Team Selector - Removed */}

            {/* Alerts */}
            {error && (
              <div className="p-3 sm:p-4 bg-red-900/50 border border-red-600 text-red-300 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            {success && (
              <div className="p-3 sm:p-4 bg-green-900/50 border border-green-600 text-green-300 rounded-lg text-sm">
                {success}
              </div>
            )}
        </div>
      )}

      <div className="min-h-screen bg-primary-black-950">
        <div className="max-w-7xl mx-auto py-3 sm:py-8">
          {/* Page Header */}
          <div className="mb-3 sm:mb-4 px-2 sm:px-4 py-2 sm:py-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-shrink">
                <h1 className="text-sm sm:text-xl font-bold text-primary-black-50">Inventory</h1>
                <p className="text-[10px] sm:text-xs text-primary-black-400 mt-0.5">Roster: {inventory.players?.length || 0}/20</p>
              </div>
              
              {/* Filter Tabs and View Toggle */}
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                {/* View Toggle Buttons */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 sm:p-2 rounded border transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-primary-green-500/20 border-primary-green-500 text-primary-green-400'
                        : 'bg-primary-black-800 border-primary-black-600 text-primary-black-400 hover:border-primary-black-500 hover:text-primary-black-300'
                    }`}
                    title="Grid View"
                  >
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 sm:p-2 rounded border transition-colors ${
                      viewMode === 'list'
                        ? 'bg-primary-green-500/20 border-primary-green-500 text-primary-green-400'
                        : 'bg-primary-black-800 border-primary-black-600 text-primary-black-400 hover:border-primary-black-500 hover:text-primary-black-300'
                    }`}
                    title="List View"
                  >
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </button>
                </div>
                
                {/* Filter Tabs */}
                <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                <button
                  onClick={() => setFilters({ position: 'all', rarity: 'all', tokenType: 'all', search: '' })}
                  className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-[10px] sm:text-sm font-semibold transition-all ${
                    filters.tokenType === 'all'
                      ? 'bg-primary-green-500 text-white'
                      : 'bg-primary-black-800 text-primary-black-300 hover:bg-primary-black-700'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilters({ position: 'all', rarity: 'all', tokenType: 'none', search: '' })}
                  className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-[10px] sm:text-sm font-semibold transition-all ${
                    filters.tokenType === 'none'
                      ? 'bg-primary-green-500 text-white'
                      : 'bg-primary-black-800 text-primary-black-300 hover:bg-primary-black-700'
                  }`}
                >
                  Players
                </button>
                <button
                  onClick={() => setFilters({ position: 'all', rarity: 'all', tokenType: 'tokens-only', search: '' })}
                  className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-[10px] sm:text-sm font-semibold transition-all ${
                    filters.tokenType === 'tokens-only'
                      ? 'bg-primary-green-500 text-white'
                      : 'bg-primary-black-800 text-primary-black-300 hover:bg-primary-black-700'
                  }`}
                >
                  Tokens
                </button>
              </div>
              </div>
            </div>
          </div>

          {/* Inventory Panel Section */}
          <div className={error || success ? 'mt-0' : 'mt-3 sm:mt-6'}>
            <InventoryPanel
              players={inventory.players || []}
              tokens={inventory.tokens || []}
              projections={projections || new Map()}
              loadingProjections={false}
              liveGameData={liveGameData || new Map()}
              onQuickSell={handleQuickSell}
              onBulkSellComplete={reloadInventory}
              onReloadProfile={refreshProfile}
              selling={Object.keys(selling).length > 0}
              filters={filters}
              onFilterChange={setFilters}
              inventory={inventory}
              viewMode={viewMode}
            />
          </div>
        </div>
      </div>
    </>
  );
}
