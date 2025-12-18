import { Outlet, useLoaderData } from 'react-router-dom';
import FantasyHomeBanner from './FantasyHomeBanner';
import { useState, useEffect } from 'react';

export default function TeamsLayout() {
  const loaderData = useLoaderData();
  const { user, profile, teams: initialTeams } = loaderData;
  const [teams, setTeams] = useState(initialTeams || []);
  const [isCreating, setIsCreating] = useState(false);

  // Update teams when loader data changes
  useEffect(() => {
    if (initialTeams) {
      setTeams(initialTeams);
    }
  }, [initialTeams]);

  return (
    <div className="min-h-screen bg-primary-black-800">
      {/* Header Section - Navigation Tabs - Persistent */}
      <header>
        <FantasyHomeBanner />
      </header>

      {/* Main Content - Rendered by child routes */}
      <main>
        {/* Pass data and controls to child routes via context */}
        <Outlet context={{ user, profile, teams, setTeams, isCreating, setIsCreating }} />
      </main>
    </div>
  );
}
