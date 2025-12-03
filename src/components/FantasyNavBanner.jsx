import { useLocation } from 'react-router-dom';
import { usePrevious } from '../hooks/usePrevious';
import PropTypes from 'prop-types';
import TeamMatchupBanner from './TeamMatchupBanner';
import FantasyNavigation from './FantasyNavigation';

/**
 * FantasyNavBanner - Wrapper Component
 * 
 * Composes FantasyNavigation (tabs) and TeamMatchupBanner into a single unit.
 * Navigation tabs appear at the top (right below header).
 * Team banner only shows on the Starting Lineup page.
 * 
 * NOTE: TeamMatchupBanner is always mounted but visually hidden when not on
 * Starting Lineup to prevent data refetching on navigation.
 */
export default function FantasyNavBanner({ 
  username, 
  teamName, 
  wins, 
  losses, 
  coins,
  teamId,
  team,
  previewMode = false
}) {
  const location = useLocation();
  
  // Only show the team banner on the starting lineup page
  const isStartingLineupPage = location.pathname.includes('/starting-lineup') || 
    location.pathname.match(/\/teams\/[^/]+$/); // Also match /teams/:teamId (index route)
  
  // Track when user navigates TO the starting lineup page (from another page)
  const previousPathname = usePrevious(location.pathname);
  const navigatedToStartingLineup = isStartingLineupPage && 
    previousPathname && 
    !previousPathname.includes('/starting-lineup') && 
    !previousPathname.match(/\/teams\/[^/]+$/);

  return (
    <>
      {/* Navigation tabs appear first - right below the header */}
      <FantasyNavigation teamId={teamId} teamType={team?.team_type} />
      
      {/* Team banner - always mounted to preserve hook state, but hidden when not on Starting Lineup */}
      <div className={isStartingLineupPage ? '' : 'hidden'}>
        <TeamMatchupBanner
          username={username}
          teamName={teamName}
          wins={wins}
          losses={losses}
          coins={coins}
          teamId={teamId}
          team={team}
          previewMode={previewMode}
          shouldRefetchContests={navigatedToStartingLineup}
        />
      </div>
    </>
  );
}

FantasyNavBanner.propTypes = {
  username: PropTypes.string,
  teamName: PropTypes.string,
  wins: PropTypes.number,
  losses: PropTypes.number,
  coins: PropTypes.number,
  teamId: PropTypes.string.isRequired,
  team: PropTypes.object,
  previewMode: PropTypes.bool
};