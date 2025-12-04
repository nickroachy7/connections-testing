import { useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import TeamBanner from './TeamBanner';
import FantasyNavigation from './FantasyNavigation';

/**
 * FantasyNavBanner - Wrapper Component
 * 
 * Composes FantasyNavigation (tabs) and TeamBanner into a single unit.
 * Navigation tabs appear at the top (right below header).
 * Team banner only shows on the Starting Lineup page.
 * 
 * NOTE: TeamBanner is always mounted but visually hidden when not on
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
  previewMode = false,
  onExpandedChange
}) {
  const location = useLocation();
  
  // Only show the team banner on the starting lineup page
  const isStartingLineupPage = location.pathname.includes('/starting-lineup') || 
    location.pathname.match(/\/teams\/[^/]+$/); // Also match /teams/:teamId (index route)
  
  // Note: Contest data is now cached in hooks with module-level caching
  // No need to force refetch on navigation - cache handles staleness

  return (
    <>
      {/* Navigation tabs appear first - right below the header */}
      <FantasyNavigation teamId={teamId} teamType={team?.team_type} />
      
      {/* Team banner - always mounted to preserve hook state, but hidden when not on Starting Lineup */}
      <div className={isStartingLineupPage ? '' : 'hidden'}>
        <TeamBanner
          username={username}
          teamName={teamName}
          wins={wins}
          losses={losses}
          coins={coins}
          teamId={teamId}
          team={team}
          previewMode={previewMode}
          onExpandedChange={onExpandedChange}
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
  previewMode: PropTypes.bool,
  onExpandedChange: PropTypes.func
};