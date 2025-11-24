import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { getUserTeams, getAvailablePacks, openPack, getUserInventory, supabase } from '../services/supabase';
import { getRosterStatus } from '../utils/rosterLimits';
import RosterLimitBanner from '../components/RosterLimitBanner';
import RosterCount from '../components/RosterCount';

// Helper function for baseline projections
function getBaselineProjection(position) {
  const baselines = {
    'Quarterback': 18,
    'Running Back': 12,
    'Wide Receiver': 10,
    'Tight End': 8,
  };
  return baselines[position] || 8;
}

export default function PackShop() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [packs, setPacks] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedTeamData, setSelectedTeamData] = useState(null); // Store full team object
  const [opening, setOpening] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [inventory, setInventory] = useState({ players: [], tokens: [] });

  const loadTeams = useCallback(async () => {
    try {
      const userTeams = await getUserTeams(user?.id);
      setTeams(userTeams);
      const activeTeam = userTeams.find(t => t.is_active);
      if (activeTeam) {
        setSelectedTeam(activeTeam.id);
        setSelectedTeamData(activeTeam); // Store full team object with coins
      }
    } catch (err) {
      console.error('Error loading teams:', err);
      setError('Failed to load teams');
    }
  }, [user?.id]);

  const loadPacks = useCallback(async () => {
    try {
      const availablePacks = await getAvailablePacks();
      setPacks(availablePacks);
    } catch (err) {
      console.error('Error loading packs:', err);
      setError('Failed to load packs');
    }
  }, []);

  const loadInventory = useCallback(async () => {
    if (!user?.id || !selectedTeam) return;
    
    try {
      const data = await getUserInventory(user.id, selectedTeam);
      setInventory(data);
    } catch (err) {
      console.error('Error loading inventory:', err);
    }
  }, [user?.id, selectedTeam]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
      return;
    }

    if (user && profile) {
      loadTeams();
      loadPacks();
    }
  }, [user, profile, loading, navigate, loadTeams, loadPacks]);

  useEffect(() => {
    if (selectedTeam) {
      loadInventory();
    }
  }, [selectedTeam, loadInventory]);

  const handleOpenPack = async (pack) => {
    if (!selectedTeam) {
      setError('Please select a team first');
      return;
    }

    // Check team-specific coins, not profile coins
    const teamCoins = selectedTeamData?.coins ?? 0;
    if (teamCoins < pack.coin_cost) {
      setError('Insufficient coins');
      return;
    }

    if (!window.confirm(`Purchase ${pack.pack_name} for ${pack.coin_cost} coins?`)) {
      return;
    }

    setOpening(prev => ({ ...prev, [pack.id]: true }));
    setError('');
    setSuccess('');

    try {
      // Purchase the pack and add it to user_packs as unopened
      const { data: purchasedPack, error: purchaseError } = await supabase.rpc('purchase_pack', {
        p_user_id: user.id,
        p_team_id: selectedTeam,
        p_pack_id: pack.id
      });

      if (purchaseError) throw purchaseError;

      // Refresh team data to update coins display
      await loadTeams();
      
      // Redirect to pack opening page
      navigate(`/teams/${selectedTeam}/open-pack/${purchasedPack}`);
    } catch (err) {
      console.error('Error purchasing pack:', err);
      setError(err.message || 'Failed to purchase pack');
      setOpening(prev => ({ ...prev, [pack.id]: false }));
    }
  };

  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'legendary': return 'bg-yellow-600 text-yellow-100 border-yellow-500';
      case 'epic': return 'bg-purple-600 text-purple-100 border-purple-500';
      case 'rare': return 'bg-blue-600 text-blue-100 border-blue-500';
      default: return 'bg-gray-600 text-gray-100 border-gray-500';
    }
  };

  const getPackTypeColor = (packType) => {
    switch (packType) {
      case 'elite': return 'from-yellow-600 to-yellow-500';
      case 'gold': return 'from-yellow-700 to-yellow-600';
      case 'silver': return 'from-gray-500 to-gray-400';
      case 'bronze': return 'from-orange-700 to-orange-600';
      default: return 'from-green-600 to-green-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-primary-black-50 text-xl">Loading...</div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  return (
    <>
      {/* Main Content Section */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 pb-4 sm:pb-8">
        {/* Page Header */}
        <div className="mb-3 sm:mb-4 px-3 sm:px-4 py-2 sm:py-4 mt-3 sm:mt-6">
          <h1 className="text-sm sm:text-xl font-bold text-primary-black-50">Pack Shop</h1>
          <p className="text-[10px] sm:text-xs text-primary-black-400 mt-0.5">Purchase packs to expand your roster</p>
        </div>

        {/* Team Selector Section - Removed */}

        {/* Alerts Section */}
        {(error || success) && (
          <div className="mt-6 mb-6">
            {error && (
              <div className="p-4 bg-red-900/50 border border-red-600 text-red-300 rounded-lg mb-6">
                {error}
              </div>
            )}
            
            {success && (
              <div className="p-4 bg-green-900/50 border border-green-600 text-green-300 rounded-lg">
                {success}
              </div>
            )}
          </div>
        )}

        {/* Packs Grid Section */}
        <div className={error || success ? 'mt-0' : 'mt-6'}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {packs.map((pack) => (
            <div key={pack.id} className="bg-primary-black-800 rounded-xl overflow-hidden border border-primary-black-700 hover:border-primary-green-500 transition-all duration-200">
              {/* Pack Header */}
              <div className={`h-32 bg-gradient-to-br ${getPackTypeColor(pack.pack_type)} p-6 relative`}>
                <div className="absolute top-4 right-4">
                  <span className="bg-black/30 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-semibold">
                    {pack.pack_type.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-center h-full">
                  <div className="text-6xl">📦</div>
                </div>
              </div>

              {/* Pack Content */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-primary-black-50 mb-2">
                  {pack.pack_name}
                </h3>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-primary-black-400">Players:</span>
                    <span className="text-primary-black-50 font-medium">{pack.player_count} cards</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-primary-black-400">Tokens:</span>
                    <span className="text-primary-black-50 font-medium">{pack.token_count} tokens</span>
                  </div>
                </div>

                {/* Pack Description */}
                {pack.description && (
                  <div className="mb-4">
                    <p className="text-sm text-primary-black-300 italic">
                      {pack.description}
                    </p>
                  </div>
                )}

                {/* Tier System Note */}
                <div className="mb-4 p-3 bg-primary-black-700/50 rounded-lg border border-primary-black-600">
                  <p className="text-xs text-primary-green-400">
                    ✨ All cards start at <span className="font-bold">Base</span> tier and <span className="font-bold">Level 1</span>
                  </p>
                  <p className="text-xs text-primary-black-400 mt-1">
                    Progress through gameplay to unlock higher tiers!
                  </p>
                </div>

                {/* Price and Action */}
                <div className="border-t border-primary-black-700 pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-2xl font-bold text-primary-green-400">
                      💰 {pack.coin_cost}
                    </span>
                    {(selectedTeamData?.coins ?? 0) < pack.coin_cost && (
                      <span className="text-xs bg-red-600 text-red-100 px-2 py-1 rounded">
                        Insufficient Coins
                      </span>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handleOpenPack(pack)}
                    disabled={opening[pack.id] || !selectedTeam || (selectedTeamData?.coins ?? 0) < pack.coin_cost}
                    className="w-full py-3 px-4 bg-primary-green-500 hover:bg-primary-green-400 disabled:bg-gray-600 disabled:cursor-not-allowed text-primary-black-950 rounded-lg font-semibold transition-colors"
                  >
                    {opening[pack.id] ? 'Opening...' : 'Open Pack'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        </div>

        {/* Empty State */}
        {packs.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-primary-black-50 mb-2">
              No packs available
            </h3>
            <p className="text-primary-black-400">
              Check back later for new pack offerings!
            </p>
          </div>
        )}
      </div>
    </>
  );
}