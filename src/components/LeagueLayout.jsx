import { Outlet, useLoaderData } from 'react-router-dom';
import LeagueBanner from './LeagueBanner';
import LeagueNavigation from './LeagueNavigation';

export default function LeagueLayout() {
  const loaderData = useLoaderData();
  const { user, profile, league, memberCount, totalTeams, userTeamsCount } = loaderData;

  return (
    <div className="min-h-screen bg-primary-black">
      {/* Header Section - League Banner - Persistent */}
      <header>
        <LeagueBanner 
          league={league}
          memberCount={memberCount}
          totalTeams={totalTeams}
          userTeamsCount={userTeamsCount}
        />
        <LeagueNavigation 
          isCommissioner={league.is_commissioner}
        />
      </header>

      {/* Main Content - Rendered by child routes */}
      <main className="pb-20">
        {/* Pass loader data to child routes via context */}
        <Outlet context={{ user, profile, league, memberCount, totalTeams, userTeamsCount }} />
      </main>
    </div>
  );
}
