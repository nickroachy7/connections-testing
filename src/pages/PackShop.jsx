import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { getUserTeams, getAvailablePacks, openPack, getUserInventory, supabase } from '../services/supabase';
import { getRosterStatus } from '../utils/rosterLimits';
import RosterLimitBanner from '../components/RosterLimitBanner';
import RosterCount from '../components/RosterCount';
import PageHeader from '../components/PageHeader';
import PackListItem from '../components/PackListItem';

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
        <PageHeader
          title="Pack Shop"
          subtitle="Purchase packs to expand your roster"
          className="mt-3 sm:mt-6"
        />

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

        {/* Packs List Section */}
        <div className={`max-w-4xl mx-auto space-y-3 ${error || success ? 'mt-0' : 'mt-6'}`}>
          {packs.map((pack) => (
            <PackListItem
              key={pack.id}
              pack={pack}
              onPurchase={handleOpenPack}
              isOpening={opening[pack.id]}
              userCoins={selectedTeamData?.coins ?? 0}
              disabled={!selectedTeam}
            />
          ))}
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
