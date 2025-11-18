import { Outlet, useLoaderData, useLocation } from 'react-router-dom';
import { FantasyProvider, useFantasy } from '../contexts/FantasyContext';
import FantasyNavBanner from './FantasyNavBanner';

// Inner component that uses the fantasy context
function FantasyLayoutInner() {
  const loaderData = useLoaderData();
  const { user, profile, activeTeam } = loaderData;
  const { lineup, projections, liveGameData, currentWeek, inventory } = useFantasy();
  const location = useLocation();

  // Enable preview mode ONLY on starting-lineup page
  const isStartingLineupPage = location.pathname.includes('/starting-lineup');

  return (
    <div className="min-h-screen bg-dk-black-primary">
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
          liveGameData={liveGameData}
          lineup={lineup}
          projections={projections}
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
          inventory
        }} />
      </main>
    </div>
  );
}

// Outer component that provides the context
export default function FantasyLayout() {
  const loaderData = useLoaderData();
  const { user, activeTeam } = loaderData;

  return (
    <FantasyProvider user={user} activeTeam={activeTeam}>
      <FantasyLayoutInner />
    </FantasyProvider>
  );
}