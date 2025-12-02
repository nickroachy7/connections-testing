import { useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import TeamMatchupBanner from './TeamMatchupBanner';
import FantasyNavigation from './FantasyNavigation';

/**
 * FantasyNavBanner - Wrapper Component
 * 
 * Composes FantasyNavigation (tabs) and TeamMatchupBanner into a single unit.
 * Navigation tabs appear at the top (right below header).
 * Team banner only shows on the Starting Lineup page.
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

  return (
    <>
      {/* Navigation tabs appear first - right below the header */}
      <FantasyNavigation teamId={teamId} teamType={team?.team_type} />
      
      {/* Team banner only shows on Starting Lineup page */}
      {isStartingLineupPage && (
        <TeamMatchupBanner
          username={username}
          teamName={teamName}
          wins={wins}
          losses={losses}
          coins={coins}
          teamId={teamId}
          team={team}
          previewMode={previewMode}
        />
      )}
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