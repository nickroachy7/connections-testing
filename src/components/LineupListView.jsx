import PropTypes from 'prop-types';
import UnifiedItemList from './tables/UnifiedItemList';

/**
 * LineupListView Component
 * 
 * Traditional list view of lineup slots with player info.
 * Now uses UnifiedItemList with 'lineup' mode for consistency.
 */
export default function LineupListView({
  lineup,
  onPlayerClick,
  liveGameData,
  projections,
  inventory,
  isPreviewMode = false,
  onAddToken,
  onSell,
  isMobile = false
}) {
  const positionSlots = [
    { key: 'QB', label: 'Quarterback' },
    { key: 'RB1', label: 'Running Back' },
    { key: 'RB2', label: 'Running Back' },
    { key: 'WR1', label: 'Wide Receiver' },
    { key: 'WR2', label: 'Wide Receiver' },
    { key: 'WR3', label: 'Wide Receiver' },
    { key: 'TE', label: 'Tight End' },
    { key: 'FLEX', label: 'Flex (RB/WR/TE)' },
    { key: 'SUPERFLEX', label: 'SuperFlex (Any Position)' }
  ];

  return (
    <UnifiedItemList
      mode="lineup"
      itemType="player"
      positionSlots={positionSlots}
      lineup={lineup}
      onRowClick={onPlayerClick}
      liveGameData={liveGameData}
      projections={projections}
      inventory={inventory}
      isPreviewMode={isPreviewMode}
      onAddToken={onAddToken}
      onSell={onSell}
    />
  );
}

LineupListView.propTypes = {
  lineup: PropTypes.object.isRequired,
  onPlayerClick: PropTypes.func,
  liveGameData: PropTypes.instanceOf(Map),
  projections: PropTypes.instanceOf(Map),
  inventory: PropTypes.object,
  isPreviewMode: PropTypes.bool,
  onAddToken: PropTypes.func,
  onSell: PropTypes.func,
  isMobile: PropTypes.bool
};
