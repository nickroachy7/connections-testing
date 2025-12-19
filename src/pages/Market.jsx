import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { getUserTeams, getAvailablePacks, supabase } from '../services/supabase';
import { getRosterStatus } from '../utils/rosterLimits';
import PageHeader from '../components/PageHeader';
import SectionHeader from '../components/ui/SectionHeader';

/**
 * Market Page
 * 
 * Single page with two sections:
 * 1. Pack Shop - Purchase card packs (row-based design)
 * 2. Free Agency - Claim individual waiver-wire players
 * 
 * Both sections use consistent row-based design matching player lists
 */

// Tier display info
const TIER_INFO = {
  bronze: { label: 'Bronze', bgColor: 'bg-amber-700/30', textColor: 'text-amber-400' },
  silver: { label: 'Silver', bgColor: 'bg-gray-500/30', textColor: 'text-gray-300' },
  gold: { label: 'Gold', bgColor: 'bg-yellow-500/30', textColor: 'text-yellow-400' },
  elite: { label: 'Elite', bgColor: 'bg-purple-500/30', textColor: 'text-purple-400' },
  starter: { label: 'Starter', bgColor: 'bg-primary-green-500/30', textColor: 'text-primary-green-400' }
};

// Position abbreviations for free agents
const POSITION_ABBREV = {
  'Quarterback': 'QB',
  'Running Back': 'RB',
  'Wide Receiver': 'WR',
  'Tight End': 'TE',
};

export default function Market() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  
  // Get context from FantasyLayout
  const outletContext = useOutletContext() || {};
  const contextTeam = outletContext.activeTeam;
  const contextRefresh = outletContext.refreshProfile;
  const inventory = outletContext.inventory;
  
  // Packs state
  const [packs, setPacks] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(contextTeam?.id || null);
  const [selectedTeamData, setSelectedTeamData] = useState(contextTeam || null);
  const [opening, setOpening] = useState({});
  
  // Free agency state
  const [freeAgents, setFreeAgents] = useState([]);
  const [claiming, setClaiming] = useState({});
  const [freeAgencyLoading, setFreeAgencyLoading] = useState(false);
  
  // Shared state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load teams if not provided by context
  const loadTeams = useCallback(async () => {
    if (contextTeam) {
      setSelectedTeam(contextTeam.id);
      setSelectedTeamData(contextTeam);
      return;
    }
    
    try {
      const userTeams = await getUserTeams(user?.id);
      setTeams(userTeams);
      const activeTeam = userTeams.find(t => t.is_active);
      if (activeTeam) {
        setSelectedTeam(activeTeam.id);
        setSelectedTeamData(activeTeam);
      }
    } catch (err) {
      console.error('Error loading teams:', err);
      setError('Failed to load teams');
    }
  }, [user?.id, contextTeam]);

  // Load packs
  const loadPacks = useCallback(async () => {
    try {
      const availablePacks = await getAvailablePacks();
      setPacks(availablePacks);
    } catch (err) {
      console.error('Error loading packs:', err);
      setError('Failed to load packs');
    }
  }, []);

  // Load free agents
  const loadFreeAgents = useCallback(async () => {
    if (!selectedTeam) return;
    
    setFreeAgencyLoading(true);
    try {
      const { data, error: fetchError } = await supabase.rpc('get_available_free_agents', {
        p_team_id: selectedTeam
      });
      
      if (fetchError) throw fetchError;
      setFreeAgents(data || []);
    } catch (err) {
      console.error('Error loading free agents:', err);
      // Don't show error for this - just show empty state
      setFreeAgents([]);
    } finally {
      setFreeAgencyLoading(false);
    }
  }, [selectedTeam]);

  // Sync with context team
  useEffect(() => {
    if (contextTeam) {
      setSelectedTeam(contextTeam.id);
      setSelectedTeamData(contextTeam);
    }
  }, [contextTeam]);

  // Initial load
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

  // Load free agents when team is selected (no tab dependency now)
  useEffect(() => {
    if (selectedTeam) {
      loadFreeAgents();
    }
  }, [selectedTeam, loadFreeAgents]);

  // Handle pack purchase
  const handlePurchasePack = async (pack) => {
    if (!selectedTeam) {
      setError('Please select a team first');
      return;
    }

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
      const { data: purchasedPack, error: purchaseError } = await supabase.rpc('purchase_pack', {
        p_user_id: user.id,
        p_team_id: selectedTeam,
        p_pack_id: pack.id
      });

      if (purchaseError) throw purchaseError;

      // Refresh team data
      if (contextRefresh) {
        contextRefresh();
      } else {
        await loadTeams();
      }
      
      // Redirect to pack opening page
      navigate(`/teams/${selectedTeam}/open-pack/${purchasedPack}`);
    } catch (err) {
      console.error('Error purchasing pack:', err);
      setError(err.message || 'Failed to purchase pack');
      setOpening(prev => ({ ...prev, [pack.id]: false }));
    }
  };

  // Handle free agent claim
  const handleClaimFreeAgent = async (player) => {
    if (!selectedTeam) {
      setError('Please select a team first');
      return;
    }

    const teamCoins = selectedTeamData?.coins ?? 0;
    if (teamCoins < player.coin_cost) {
      setError('Insufficient coins');
      return;
    }

    // Check roster limit
    const rosterStatus = getRosterStatus(inventory?.players?.length || 0, inventory?.tokens?.length || 0);
    if (rosterStatus.isAtHardCap) {
      setError('Your roster is full! Sell some players first.');
      return;
    }

    if (!window.confirm(`Claim ${player.player_name} for ${player.coin_cost} coins?`)) {
      return;
    }

    setClaiming(prev => ({ ...prev, [player.id]: true }));
    setError('');
    setSuccess('');

    try {
      const { data, error: claimError } = await supabase.rpc('claim_free_agent', {
        p_user_id: user.id,
        p_team_id: selectedTeam,
        p_free_agency_id: player.id
      });

      if (claimError) throw claimError;

      setSuccess(`${player.player_name} claimed and added to your roster!`);
      
      // Refresh data
      if (contextRefresh) {
        contextRefresh();
      }
      
      // Reload free agents to update status
      await loadFreeAgents();
    } catch (err) {
      console.error('Error claiming free agent:', err);
      setError(err.message || 'Failed to claim player');
    } finally {
      setClaiming(prev => ({ ...prev, [player.id]: false }));
    }
  };

  // Get next refresh time (midnight local time)
  const getNextRefreshTime = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const hours = Math.floor((tomorrow - now) / (1000 * 60 * 60));
    const minutes = Math.floor(((tomorrow - now) % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
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

  const teamCoins = selectedTeamData?.coins ?? 0;

  // Pack row component - styled exactly like PlayerRow mobile
  const PackRow = ({ pack, index }) => {
    const canAfford = teamCoins >= pack.coin_cost;
    const isPurchasable = selectedTeam && canAfford && !opening[pack.id];
    
    return (
      <div
        className={`
          grid transition-all items-center py-2.5 px-3
          ${index % 2 === 0 ? 'bg-primary-black-900' : 'bg-[#121212]'}
          ${isPurchasable ? 'cursor-pointer hover:bg-primary-black-700/50' : ''}
          ${!canAfford ? 'opacity-60' : ''}
        `}
        style={{ 
          gridTemplateColumns: '40px 1fr auto',
          gap: '10px',
          minHeight: '76px'
        }}
        onClick={() => isPurchasable && handlePurchasePack(pack)}
      >
        {/* Pack Image */}
        <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
          <img 
            src="/green-pack.png" 
            alt={pack.pack_name}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Pack Info */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-semibold text-white text-sm truncate">
              {pack.pack_name}
            </span>
          </div>
          <div className="text-xs text-primary-black-400 truncate">
            {pack.player_count} players · {pack.token_count} tokens
          </div>
        </div>

        {/* Price + CTA */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="8" />
            </svg>
            <span className="text-sm font-semibold text-white">{pack.coin_cost}</span>
          </div>
          
          {opening[pack.id] ? (
            <div className="w-12 flex justify-center">
              <svg className="animate-spin h-4 w-4 text-primary-black-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : !canAfford ? (
            <span className="text-xs text-accent-orange-400 whitespace-nowrap">
              Need {pack.coin_cost - teamCoins}
            </span>
          ) : (
            <button className="px-2.5 py-1 bg-primary-green-600 hover:bg-primary-green-500 rounded transition-colors">
              <span className="text-[11px] font-semibold text-white">Buy</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  // Free Agent row component - styled exactly like PlayerRow mobile
  const FreeAgentRow = ({ player, index }) => {
    const canAfford = teamCoins >= player.coin_cost;
    const alreadyClaimed = player.already_claimed || player.in_inventory;
    const isClaimable = selectedTeam && canAfford && !claiming[player.id] && !alreadyClaimed;
    const positionAbbrev = POSITION_ABBREV[player.player_position] || player.player_position?.substring(0, 2);
    
    return (
      <div
        className={`
          grid transition-all items-center py-2.5 px-3
          ${index % 2 === 0 ? 'bg-primary-black-900' : 'bg-[#121212]'}
          ${alreadyClaimed ? 'opacity-50' : isClaimable ? 'cursor-pointer hover:bg-primary-black-700/50' : ''}
        `}
        style={{ 
          gridTemplateColumns: '32px 40px 1fr auto',
          gap: '10px',
          minHeight: '76px'
        }}
        onClick={() => isClaimable && handleClaimFreeAgent(player)}
      >
        {/* Position Badge */}
        <div className="flex items-center justify-center">
          <span className="px-2 py-1 rounded text-[10px] font-bold bg-primary-black-700 text-primary-black-300">
            {positionAbbrev}
          </span>
        </div>

        {/* Player Avatar */}
        <div className="w-10 h-10 rounded bg-primary-black-700 flex items-center justify-center overflow-hidden border-2 border-gray-600">
          <svg className="w-6 h-6 text-primary-black-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>

        {/* Player Info */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-semibold text-white text-sm truncate">
              {player.player_name}
            </span>
            <span className="px-1.5 py-0.5 bg-primary-black-700 text-primary-black-400 rounded text-[10px] font-semibold flex-shrink-0">
              {player.team_abbreviation}
            </span>
          </div>
          <div className="text-xs text-primary-black-400 truncate">
            Proj: <span className="text-primary-green-400 font-medium">{Number(player.weekly_projected_points).toFixed(1)}</span> pts
          </div>
        </div>

        {/* Price + CTA */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="8" />
            </svg>
            <span className="text-sm font-semibold text-white">{player.coin_cost}</span>
          </div>
          
          {claiming[player.id] ? (
            <div className="w-14 flex justify-center">
              <svg className="animate-spin h-5 w-5 text-primary-black-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : player.in_inventory ? (
            <span className="text-xs text-primary-black-500 whitespace-nowrap">In Roster</span>
          ) : player.already_claimed ? (
            <span className="text-xs text-primary-black-500 whitespace-nowrap">Claimed</span>
          ) : !canAfford ? (
            <span className="text-xs text-accent-orange-400 whitespace-nowrap">
              Need {player.coin_cost - teamCoins}
            </span>
          ) : (
            <button className="px-3 py-1.5 bg-primary-green-600 hover:bg-primary-green-500 rounded transition-colors">
              <span className="text-xs font-semibold text-white">Claim</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      {/* Main Content Section */}
      <div className="pb-4 sm:pb-8">
        <PageHeader
          title="Market"
          className="mt-2 px-2 sm:px-4"
          actions={
            <div className="flex items-center gap-1.5 bg-primary-black-800 px-2.5 py-1.5 rounded">
              <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="8" />
              </svg>
              <span className="text-sm font-semibold text-white">{teamCoins.toLocaleString()}</span>
            </div>
          }
        />

        {/* Alerts Section */}
        {(error || success) && (
          <div className="mb-4 px-2 sm:px-4">
            {error && (
              <div className="p-3 bg-red-900/50 border border-red-600 text-red-300 rounded-lg text-sm mb-2">
                {error}
              </div>
            )}
            
            {success && (
              <div className="p-3 bg-green-900/50 border border-green-600 text-green-300 rounded-lg text-sm">
                {success}
              </div>
            )}
          </div>
        )}

        {/* Packs Section */}
        <div className="mb-6">
          <SectionHeader 
            title="PACKS" 
            count={packs.length}
          />
          
          {packs.length > 0 ? (
            <div>
              {packs.map((pack, index) => (
                <PackRow key={pack.id} pack={pack} index={index} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-primary-black-400 text-sm">
              No packs available
            </div>
          )}
        </div>

        {/* Free Agency Section */}
        <div>
          <SectionHeader 
            title="FREE AGENCY" 
            count={freeAgents.length}
            actions={
              <span className="text-xs text-primary-black-500">
                Refreshes in {getNextRefreshTime()}
              </span>
            }
          />
          
          {freeAgencyLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3">
                <svg className="animate-spin h-5 w-5 text-primary-green-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-primary-black-300 text-sm">Loading free agents...</span>
              </div>
            </div>
          ) : freeAgents.length > 0 ? (
            <div>
              {freeAgents.map((player, index) => (
                <FreeAgentRow key={player.id} player={player} index={index} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-primary-black-400 text-sm">
              No free agents available. Check back tomorrow.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
