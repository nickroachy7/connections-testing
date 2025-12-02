import { useState, useEffect } from 'react';
import { Outlet, useLoaderData, useLocation, useRevalidator } from 'react-router-dom';
import { FantasyProvider, useFantasy } from '../contexts/FantasyContext';
import { usePrevious } from '../hooks/usePrevious';
import FantasyNavBanner from './FantasyNavBanner';

// Inner component that uses the fantasy context
function FantasyLayoutInner() {
  const loaderData = useLoaderData();
  const { user, profile, activeTeam } = loaderData;
  const { lineup, setLineup, projections, liveGameData, currentWeek, weekStatus, inventory, loadInventory, updateInventory, teamStartsNextWeek } = useFantasy();
  const location = useLocation();
  const revalidator = useRevalidator();
  const previousWeekStatus = usePrevious(weekStatus);
  
  // Local state for optimistic coin updates
  const [displayCoins, setDisplayCoins] = useState(activeTeam?.coins || 0);
  
  // Refresh team data when week status changes to 'finalized'
  // This updates wins/losses/lives in the banner immediately
  useEffect(() => {
    if (previousWeekStatus && previousWeekStatus !== 'finalized' && weekStatus === 'finalized') {
      console.log('🏆 [FantasyLayout] Week finalized! Refreshing team data...');
      revalidator.revalidate();
    }
  }, [weekStatus, previousWeekStatus, revalidator]);

  // Sync displayCoins when activeTeam.coins changes from server
  useEffect(() => {
    if (activeTeam?.coins !== undefined) {
      setDisplayCoins(activeTeam.coins);
    }
  }, [activeTeam?.coins]);

  // Enable preview mode ONLY on starting-lineup page
  const isStartingLineupPage = location.pathname.includes('/starting-lineup');

  // Function to refresh profile data (including coins)
  const refreshProfile = () => {
    revalidator.revalidate();
  };
  
  // Function to update coins optimistically (for instant UI feedback)
  const updateCoins = (coinsToAdd) => {
    setDisplayCoins(prev => prev + coinsToAdd);
  };

  return (
    <div className="min-h-screen bg-dk-black-primary overflow-x-hidden">
      {/* Header Section - Navigation Banner - Persistent across all routes */}
      <header>
        <FantasyNavBanner 
          username={profile?.username}
          teamName={activeTeam?.team_name}
          wins={activeTeam?.wins}
          losses={activeTeam?.losses}
          coins={displayCoins}
          teamId={activeTeam?.id}
          userId={user?.id}
          team={activeTeam}
          currentWeek={currentWeek}
          previewMode={isStartingLineupPage}
        />
      </header>

      {/* Main Content - Rendered by child routes */}
      <main>
        {/* Pass loader data AND fantasy context data to child routes */}
        <Outlet context={{
          ...loaderData,
          lineup,
          setLineup,
          projections,
          liveGameData,
          currentWeek,
          inventory,
          loadInventory,
          updateInventory,
          refreshProfile,
          updateCoins,
          teamStartsNextWeek
        }} />
      </main>
    </div>
  );
}

// Outer component that provides the context
export default function FantasyLayout() {
  const loaderData = useLoaderData();
  const { user, activeTeam, inventory } = loaderData;

  return (
    <FantasyProvider user={user} activeTeam={activeTeam} initialInventory={inventory}>
      <FantasyLayoutInner />
    </FantasyProvider>
  );
}
