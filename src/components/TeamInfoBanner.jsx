import PropTypes from 'prop-types';
import TeamHeader from './TeamHeader';
import WeekStatusBar from './WeekStatusBar';

/**
 * TeamInfoBanner Component
 * 
 * Wrapper component that composes team identity and week status displays.
 * Refactored from 685-line monolithic component to clean composition pattern.
 */
export default function TeamInfoBanner({ 
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
      <TeamHeader 
        teamId={teamId}
        team={team}
        username={username}
        teamName={teamName}
        wins={wins}
        losses={losses}
        coins={coins}
      />
      <WeekStatusBar 
        teamId={teamId}
        team={team}
        losses={losses}
        previewMode={previewMode}
      />
    </>
  );
}

TeamInfoBanner.propTypes = {
  username: PropTypes.string,
  teamName: PropTypes.string,
  wins: PropTypes.number,
  losses: PropTypes.number,
  coins: PropTypes.number,
  teamId: PropTypes.string,
  team: PropTypes.object,
  previewMode: PropTypes.bool
};
