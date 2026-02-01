# Sport Refactor - Remaining Work

## ✅ Completed
- Sport configuration system (`src/config/sports.js`)
- Sport context (`src/contexts/SportContext.jsx`)
- Position colors made sport-aware
- Sorting utilities made sport-aware
- Position filter buttons component
- Players page fully dynamic
- App wrapped in SportProvider

## 🔧 In Progress
- TeamManager lineup structure

## 📋 Remaining Work

### High Priority
1. **Lineup Templates**
   - Move hard-coded lineup structure to sport config
   - Define lineup slots per sport (e.g., NFL: QB, RB1, RB2, WR1-3, TE, FLEX, SUPERFLEX)
   - Consider storing in database for flexibility
   - Update TeamManager to use dynamic lineup

2. **Stats Display**
   - PlayerProfile page - use sport-specific display stats
   - Dashboard - sport-specific stat cards
   - Make stat labels dynamic (passing yards vs points vs RBIs)

3. **Remaining Pages**
   - Dashboard: Update any hard-coded NFL references
   - Games page: Make sport-agnostic if needed
   - Leaderboard: Ensure works across sports

### Medium Priority
4. **Sport Selector UI**
   - Add sport selector component (when NBA/MLB enabled)
   - Let users switch between sports
   - Save preference to localStorage/user settings

5. **Database Integration**
   - Ensure sport_players table used correctly
   - Test with multi-sport data
   - Update loaders to filter by current sport

### Low Priority
6. **Polish**
   - Sport-specific color themes?
   - Sport-specific branding/logos
   - Sport-specific terminology (games vs matches)

## Notes
- Lineup structure is the biggest remaining piece
- Consider if lineup templates should be:
  - In sport config (simple, fixed)
  - In database (flexible, per-contest-type)
  - Hybrid approach?
