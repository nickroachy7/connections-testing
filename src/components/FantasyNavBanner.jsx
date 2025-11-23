import PropTypes from 'prop-types';
import TeamMatchupBanner from './TeamMatchupBanner';
import FantasyNavigation from './FantasyNavigation';

/**
 * FantasyNavBanner - Wrapper Component
 * 
 * Composes TeamMatchupBanner and FantasyNavigation into a single unit.
 * This keeps the parent component simple and delegates to focused sub-components.
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
  return (
    <>
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
      <FantasyNavigation teamId={teamId} />
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