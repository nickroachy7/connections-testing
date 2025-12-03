import PropTypes from 'prop-types';
import BottomSheet from './BottomSheet';
import PositionBadge from './PositionBadge';
import PlayerRow from '../tables/PlayerRow';
import TokenRow from '../tables/TokenRow';
import { ShoppingBag, Gem, Users, Inbox } from 'lucide-react';

/**
 * SwapModal - UNIFIED modal for all swap/selection operations
 * 
 * This is the SINGLE component for:
 * - Swapping lineup players with bench players
 * - Adding players to empty lineup slots
 * - Placing bench players into lineup positions
 * - Selecting tokens for players
 * - Applying tokens to lineup players
 * 
 * MODE REFERENCE:
 * | Mode           | Current Item    | Choose From       | Action              |
 * |----------------|-----------------|-------------------|---------------------|
 * | swap-player    | Lineup player   | Bench players     | Swap player         |
 * | add-player     | Empty slot      | Bench players     | Add to slot         |
 * | place-player   | Bench player    | Lineup slots      | Place in slot       |
 * | select-token   | Player          | Tokens            | Apply token         |
 * | apply-token    | Token           | Lineup players    | Apply to player     |
 * 
 * VISUAL CONSISTENCY:
 * Uses the SAME PlayerRow and TokenRow components as the main bench/inventory lists
 * to ensure identical visual appearance across the app.
 */

// Position label helper
const getPositionLabel = (key) => {
  if (!key) return 'BN';
  if (key === 'FLEX') return 'FLX';
  if (key === 'SUPERFLEX') return 'SFLX';
  if (key.startsWith('QB')) return 'QB';
  if (key.startsWith('RB')) return 'RB';
  if (key.startsWith('WR')) return 'WR';
  if (key.startsWith('TE')) return 'TE';
  return key;
};

// Render empty slot option
const EmptySlotOption = ({ slotKey, onClick }) => (
  <div
    onClick={onClick}
    className="grid py-3 px-4 transition-all min-h-[72px] cursor-pointer hover:bg-primary-black-700/50 bg-primary-black-800/30"
    style={{ 
      gridTemplateColumns: '36px 44px 1fr 56px',
      gap: '10px',
      alignItems: 'center'
    }}
  >
    <div className="flex items-center justify-center">
      <PositionBadge position={slotKey} size="sm" />
    </div>
    <div className="rounded bg-primary-black-800/50 flex items-center justify-center w-11 h-11 border-2 border-dashed border-primary-black-600">
      <span className="text-xl text-primary-black-500 font-bold">+</span>
    </div>
    <div className="min-w-0">
      <p className="font-semibold text-primary-black-300 text-sm">Empty Slot</p>
      <p className="text-xs text-primary-black-500">Tap to add here</p>
    </div>
    <div className="text-center">
      <span className="text-primary-black-600 text-sm">--</span>
    </div>
  </div>
);

// Empty state component
const EmptyState = ({ icon: Icon, title, subtitle, action }) => (
  <div className="py-10 text-center">
    <Icon className="w-12 h-12 mx-auto mb-3 text-primary-black-600" />
    <p className="text-primary-black-300 font-semibold">{title}</p>
    <p className="text-xs text-primary-black-500 mt-1">{subtitle}</p>
    {action && (
      <button
        onClick={action.onClick}
        className="mt-4 px-4 py-2 bg-primary-green-600 hover:bg-primary-green-700 text-white rounded-lg font-semibold text-sm transition-colors"
      >
        {action.label}
      </button>
    )}
  </div>
);

// Section header
const ModalSectionHeader = ({ children, centered = false }) => (
  <div className={`px-4 py-2 text-xs font-semibold text-primary-black-400 uppercase tracking-wide bg-primary-black-900 ${centered ? 'flex items-center justify-center' : ''}`}>
    {centered ? (
      <>
        <div className="h-px flex-1 bg-primary-black-800" />
        <span className="px-3">{children}</span>
        <div className="h-px flex-1 bg-primary-black-800" />
      </>
    ) : children}
  </div>
);

export default function SwapModal({
  mode,
  isOpen = true,
  onClose,
  onSelect,
  
  // Current item (what's selected/being acted upon)
  currentPlayer = null,
  currentToken = null,
  currentSlot = null,
  
  // Options to choose from
  players = [],
  tokens = [],
  slots = [],
  lineup = {},
  
  // Data for display
  liveGameData = null,
  projections = null,
  
  // Optional actions
  onNavigateToShop = null
}) {
  // Determine title and subtitle based on mode
  const getModalHeader = () => {
    switch (mode) {
      case 'swap-player':
        return {
          title: 'Swap Player',
          subtitle: `${getPositionLabel(currentSlot)} Position`
        };
      case 'add-player':
        return {
          title: 'Select Player',
          subtitle: `Add to ${getPositionLabel(currentSlot)}`
        };
      case 'place-player':
        return {
          title: 'Add to Lineup',
          subtitle: `Choose position for ${currentPlayer?.player_card?.player_name || 'player'}`
        };
      case 'select-token':
        return {
          title: 'Add Token',
          subtitle: 'Choose token to apply'
        };
      case 'apply-token':
        return {
          title: 'Apply Token',
          subtitle: 'Choose player to boost'
        };
      default:
        return { title: 'Select', subtitle: '' };
    }
  };

  const { title, subtitle } = getModalHeader();

  // Render current item section
  const renderCurrentItem = () => {
    // Player-based modes - show current player using canonical PlayerRow
    if ((mode === 'swap-player' || mode === 'select-token') && currentPlayer) {
      return (
        <div className="border-b border-primary-black-800">
          <ModalSectionHeader>Current Player</ModalSectionHeader>
          <PlayerRow
            player={currentPlayer}
            index={0}
            liveGameData={liveGameData}
            projections={projections}
            slotKey={currentPlayer.lineup_position || currentSlot}
            isLocked={true}
            showBenchBadge={false}
          />
        </div>
      );
    }

    // Bench player being placed
    if (mode === 'place-player' && currentPlayer) {
      return (
        <div className="border-b border-primary-black-800">
          <ModalSectionHeader>Selected Player</ModalSectionHeader>
          <PlayerRow
            player={currentPlayer}
            index={0}
            liveGameData={liveGameData}
            projections={projections}
            showBenchBadge={true}
            isLocked={true}
          />
        </div>
      );
    }

    // Token being applied - show current token using canonical TokenRow
    if (mode === 'apply-token' && currentToken) {
      return (
        <div className="border-b border-primary-black-800">
          <ModalSectionHeader>Selected Token</ModalSectionHeader>
          <TokenRow
            token={currentToken}
            index={0}
            isLocked={true}
          />
        </div>
      );
    }

    // Empty slot being filled
    if (mode === 'add-player' && currentSlot) {
      return (
        <div className="border-b border-primary-black-800">
          <ModalSectionHeader>Target Slot</ModalSectionHeader>
          <EmptySlotOption slotKey={currentSlot} onClick={() => {}} />
        </div>
      );
    }

    return null;
  };

  // Render options section
  const renderOptions = () => {
    // Player selection modes - use canonical PlayerRow
    if (mode === 'swap-player' || mode === 'add-player') {
      if (players.length === 0) {
        return (
          <EmptyState
            icon={onNavigateToShop ? ShoppingBag : Inbox}
            title="No eligible players"
            subtitle={mode === 'swap-player' ? 'No bench players can fill this position' : 'Add players to your roster first'}
            action={onNavigateToShop ? { label: 'Go to Shop', onClick: onNavigateToShop } : null}
          />
        );
      }

      return (
        <>
          <ModalSectionHeader centered>
            {mode === 'swap-player' ? 'Choose Replacement' : 'Choose Player'}
          </ModalSectionHeader>
          <div>
            {players.map((player, index) => {
              const gameData = liveGameData?.get(player.player_card?.player_id);
              const gameStatus = gameData?.gameStatus?.toLowerCase();
              const isGameLiveOrFinal = gameStatus === 'live' || gameStatus === 'halftime' || gameStatus === 'final';
              const isLocked = player.is_locked || isGameLiveOrFinal;
              
              return (
                <PlayerRow
                  key={player.id}
                  player={player}
                  index={index}
                  liveGameData={liveGameData}
                  projections={projections}
                  showBenchBadge={true}
                  isLocked={isLocked}
                  onClick={() => !isLocked && onSelect(player)}
                />
              );
            })}
          </div>
        </>
      );
    }

    // Slot selection mode (place bench player into lineup)
    if (mode === 'place-player') {
      if (slots.length === 0) {
        return (
          <EmptyState
            icon={Inbox}
            title="No available slots"
            subtitle="No lineup positions can accept this player"
          />
        );
      }

      return (
        <>
          <ModalSectionHeader centered>Choose Lineup Position</ModalSectionHeader>
          <div>
            {slots.map((slotKey, index) => {
              const slotPlayer = lineup[slotKey];
              
              if (slotPlayer) {
                // Show player currently in that slot (will be swapped)
                return (
                  <PlayerRow
                    key={slotKey}
                    player={slotPlayer}
                    index={index}
                    liveGameData={liveGameData}
                    projections={projections}
                    slotKey={slotKey}
                    onClick={() => onSelect(slotKey)}
                  />
                );
              }
              
              return (
                <EmptySlotOption
                  key={slotKey}
                  slotKey={slotKey}
                  onClick={() => onSelect(slotKey)}
                />
              );
            })}
          </div>
        </>
      );
    }

    // Token selection mode - use canonical TokenRow
    if (mode === 'select-token') {
      if (tokens.length === 0) {
        return (
          <EmptyState
            icon={Gem}
            title="No tokens available"
            subtitle="All tokens are already applied"
          />
        );
      }

      return (
        <>
          <ModalSectionHeader centered>Choose Token</ModalSectionHeader>
          <div>
            {tokens.map((token, index) => (
              <TokenRow
                key={token.id}
                token={token}
                index={index}
                onClick={() => onSelect(token)}
              />
            ))}
          </div>
        </>
      );
    }

    // Apply token to player mode - use canonical PlayerRow
    if (mode === 'apply-token') {
      if (players.length === 0) {
        return (
          <EmptyState
            icon={Users}
            title="No eligible players"
            subtitle="All lineup players have tokens or are locked"
          />
        );
      }

      return (
        <>
          <ModalSectionHeader centered>Choose Player to Boost</ModalSectionHeader>
          <div>
            {players.map((player, index) => {
              const gameData = liveGameData?.get(player.player_card?.player_id);
              const gameStatus = gameData?.gameStatus?.toLowerCase();
              const isFinal = gameStatus === 'final';
              
              return (
                <PlayerRow
                  key={player.id}
                  player={player}
                  index={index}
                  liveGameData={liveGameData}
                  projections={projections}
                  slotKey={player.lineup_position}
                  isLocked={isFinal}
                  onClick={() => !isFinal && onSelect(player)}
                />
              );
            })}
          </div>
        </>
      );
    }

    return null;
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      footer={
        <div className="p-4 border-t border-primary-black-800">
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-xl bg-primary-black-800 hover:bg-primary-black-700 text-primary-black-200 font-semibold transition-colors active:scale-[0.98]"
          >
            Cancel
          </button>
        </div>
      }
    >
      {renderCurrentItem()}
      {renderOptions()}
    </BottomSheet>
  );
}

SwapModal.propTypes = {
  mode: PropTypes.oneOf(['swap-player', 'add-player', 'place-player', 'select-token', 'apply-token']).isRequired,
  isOpen: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired,
  currentPlayer: PropTypes.object,
  currentToken: PropTypes.object,
  currentSlot: PropTypes.string,
  players: PropTypes.array,
  tokens: PropTypes.array,
  slots: PropTypes.array,
  lineup: PropTypes.object,
  liveGameData: PropTypes.instanceOf(Map),
  projections: PropTypes.instanceOf(Map),
  onNavigateToShop: PropTypes.func
};
