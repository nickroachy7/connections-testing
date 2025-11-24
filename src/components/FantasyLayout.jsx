import { useState, useEffect } from 'react';
import { Outlet, useLoaderData, useLocation, useRevalidator } from 'react-router-dom';
import { FantasyProvider, useFantasy } from '../contexts/FantasyContext';
import FantasyNavBanner from './FantasyNavBanner';

// Inner component that uses the fantasy context
function FantasyLayoutInner() {
  const loaderData = useLoaderData();
  const { user, profile, activeTeam } = loaderData;
  const { lineup, setLineup, projections, liveGameData, currentWeek, inventory, loadInventory, updateInventory } = useFantasy();
  const location = useLocation();
  const revalidator = useRevalidator();
  
  // Local state for optimistic coin updates
  const [displayCoins, setDisplayCoins] = useState(activeTeam?.coins || 0);

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
          updateCoins
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
