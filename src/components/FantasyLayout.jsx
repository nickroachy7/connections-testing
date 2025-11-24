import { Outlet, useLoaderData, useLocation, useRevalidator } from 'react-router-dom';
import { FantasyProvider, useFantasy } from '../contexts/FantasyContext';
import FantasyNavBanner from './FantasyNavBanner';

// Inner component that uses the fantasy context
function FantasyLayoutInner() {
  const loaderData = useLoaderData();
  const { user, profile, activeTeam } = loaderData;
  const { lineup, projections, liveGameData, currentWeek, inventory, loadInventory } = useFantasy();
  const location = useLocation();
  const revalidator = useRevalidator();

  // Enable preview mode ONLY on starting-lineup page
  const isStartingLineupPage = location.pathname.includes('/starting-lineup');

  // Function to refresh profile data (including coins)
  const refreshProfile = () => {
    revalidator.revalidate();
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
          coins={activeTeam?.coins}
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
          projections,
          liveGameData,
          currentWeek,
          inventory,
          loadInventory,
          refreshProfile
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
