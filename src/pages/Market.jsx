import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { getUserTeams, getAvailablePacks, supabase } from '../services/supabase';
import { getRosterStatus } from '../utils/rosterLimits';
import RosterLimitBanner from '../components/RosterLimitBanner';
import RosterCount from '../components/RosterCount';
import PageHeader from '../components/PageHeader';
import PackCard from '../components/PackCard';
import FreeAgentCard from '../components/FreeAgentCard';

/**
 * Market Page
 * 
 * Two sections:
 * 1. Pack Shop - Purchase card packs (redesigned)
 * 2. Free Agency - Claim individual waiver-wire players (new)
 */
export default function Market() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  
  // Get context from FantasyLayout
  const outletContext = useOutletContext() || {};
  const contextTeam = outletContext.activeTeam;
  const contextRefresh = outletContext.refreshProfile;
  const inventory = outletContext.inventory;
  
  // Tab state
  const [activeTab, setActiveTab] = useState('packs'); // 'packs' | 'freeagency'
  
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

  // Load free agents when team changes or tab switches
  useEffect(() => {
    if (selectedTeam && activeTab === 'freeagency') {
      loadFreeAgents();
    }
  }, [selectedTeam, activeTab, loadFreeAgents]);

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

  return (
    <>
      {/* Main Content Section */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 pb-4 sm:pb-8">
        <PageHeader
          title="Market"
          subtitle="Purchase packs or claim free agents"
          className="mt-3 sm:mt-6"
          actions={
            <div className="flex items-center gap-2 bg-primary-black-800 px-3 py-1.5 rounded-lg border border-primary-black-700">
              <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-bold text-white">{teamCoins.toLocaleString()}</span>
            </div>
          }
        />

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 p-1 bg-primary-black-900 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('packs')}
            className={`
              px-4 py-2 rounded-md font-medium text-sm transition-all
              ${activeTab === 'packs'
                ? 'bg-primary-black-700 text-white'
                : 'text-primary-black-400 hover:text-white'
              }
            `}
          >
            Packs
          </button>
          <button
            onClick={() => setActiveTab('freeagency')}
            className={`
              px-4 py-2 rounded-md font-medium text-sm transition-all
              ${activeTab === 'freeagency'
                ? 'bg-primary-black-700 text-white'
                : 'text-primary-black-400 hover:text-white'
              }
            `}
          >
            Free Agency
          </button>
        </div>

        {/* Alerts Section */}
        {(error || success) && (
          <div className="mb-6">
            {error && (
              <div className="p-4 bg-red-900/50 border border-red-600 text-red-300 rounded-lg mb-4">
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

        {/* Content based on active tab */}
        <div className="max-w-4xl mx-auto">
          {activeTab === 'packs' && (
            <>
              {/* Packs List */}
              <div className="space-y-2">
                {packs.map((pack) => (
                  <PackCard
                    key={pack.id}
                    pack={pack}
                    onPurchase={handlePurchasePack}
                    isOpening={opening[pack.id]}
                    userCoins={teamCoins}
                    disabled={!selectedTeam}
                  />
                ))}
              </div>

              {/* Empty State */}
              {packs.length === 0 && (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 mx-auto text-primary-black-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <h3 className="text-lg font-semibold text-primary-black-50 mb-2">
                    No packs available
                  </h3>
                  <p className="text-sm text-primary-black-400">
                    Check back later for new pack offerings.
                  </p>
                </div>
              )}
            </>
          )}

          {activeTab === 'freeagency' && (
            <>
              {/* Free Agency Section Header */}
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-primary-black-400">
                  Claim budget players to fill roster gaps.
                </p>
                <span className="text-xs text-primary-black-500">
                  Refreshes in {getNextRefreshTime()}
                </span>
              </div>

              {/* Free Agents Loading */}
              {freeAgencyLoading && (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center gap-3">
                    <svg className="animate-spin h-5 w-5 text-primary-green-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-primary-black-300">Loading free agents...</span>
                  </div>
                </div>
              )}

              {/* Free Agents List */}
              {!freeAgencyLoading && freeAgents.length > 0 && (
                <div className="divide-y divide-primary-black-700 bg-primary-black-800 rounded-lg overflow-hidden">
                  {freeAgents.map((player) => (
                    <FreeAgentCard
                      key={player.id}
                      player={player}
                      onClaim={handleClaimFreeAgent}
                      isClaiming={claiming[player.id]}
                      userCoins={teamCoins}
                      disabled={!selectedTeam}
                    />
                  ))}
                </div>
              )}

              {/* Empty State */}
              {!freeAgencyLoading && freeAgents.length === 0 && (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 mx-auto text-primary-black-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-primary-black-50 mb-2">
                    No free agents available
                  </h3>
                  <p className="text-sm text-primary-black-400">
                    Check back tomorrow for new waiver wire players.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
