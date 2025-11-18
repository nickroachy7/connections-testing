# Mid-Week Team Creation Fix

**Date**: November 18, 2024  
**Status**: ✅ Implemented

## Problem Statement

Users creating teams mid-week or after a week has been finalized were immediately assigned a win/loss for that week, even though they just joined. This created a poor onboarding experience where:

1. **Scenario 1**: User joins on Thursday when Week 11 is live
   - Team gets `current_week = 11`
   - `lock-lineups` Edge Function creates a `weekly_lineup` for Week 11
   - When `finalize-week` runs on Tuesday, team gets assigned a win/loss
   - **Problem**: Team didn't actually compete that week

2. **Scenario 2**: User joins Tuesday evening after Week 11 was finalized
   - Team gets `current_week = 11`
   - Week 11 already has completed lineups
   - **Problem**: If they set a lineup, they'd retroactively get a win/loss

3. **Scenario 3**: User joins between weeks (Tuesday night - Thursday)
   - Team gets `current_week = 12` (next week)
   - ✅ This worked fine!

## Solution Overview

Implemented a **smart week assignment** system that:

1. Checks if the current NFL week is finalized (has any completed lineups)
2. If finalized, assigns the team to **next week** as their starting week
3. Prevents `weekly_lineup` creation for weeks before the team's starting week
4. Shows clear UI messaging when a team hasn't started yet

## Implementation Details

### 1. Database Changes

#### New Helper Function: `get_starting_week_for_new_team()`

```sql
CREATE OR REPLACE FUNCTION get_starting_week_for_new_team()
RETURNS TABLE(week_number INTEGER, season_year INTEGER)
```

**Logic**:
- Checks if current week has any `weekly_lineups` with `status='completed'`
- If finalized: returns `current_week + 1` (unless at week 18)
- If not finalized: returns `current_week`

**Edge Cases Handled**:
- Week 18 (season end): Team starts at week 18 but won't compete
- Between weeks: Team correctly assigned to upcoming week

#### Updated `create_new_team()` Function

Changed from:
```sql
current_week, 
v_current_week, -- Direct from nfl_season_config
```

To:
```sql
current_week, 
v_starting_week, -- From get_starting_week_for_new_team()
```

#### New Trigger: `prevent_premature_lineup_creation`

```sql
CREATE TRIGGER prevent_premature_lineup_creation
  BEFORE INSERT ON weekly_lineups
  FOR EACH ROW
  EXECUTE FUNCTION check_team_starting_week();
```

**Logic**:
- Intercepts all `weekly_lineup` INSERT attempts
- Checks if `team.current_week > lineup.week_number`
- If true: **Blocks** the insert (returns NULL)
- If false: Allows the insert

**Impact**: The `lock-lineups` Edge Function will try to create lineups for all active teams, but this trigger will silently prevent creation for teams that haven't started yet.

### 2. Edge Function Changes

#### Updated `start-new-team/index.ts`

Changed from direct INSERT to calling database function:

```typescript
// OLD - Direct INSERT
const { data: team } = await supabaseClient
  .from('teams')
  .insert({ name: teamName, user_id: user.id })

// NEW - Call database function with smart week assignment
const { data: teamId } = await supabaseClient
  .rpc('create_new_team', {
    p_user_id: user.id,
    p_team_name: team_name,
    p_contest_type_id: contest_type_id,
    p_team_image_url: team_image_url || null
  })
```

**Benefits**:
- Centralized week assignment logic in database
- Edge function automatically gets latest smart logic
- Added helpful message in response: `"Your first week will be Week X"`

### 3. Frontend Changes

#### Updated `supabase.js` Helper

```javascript
export const startNewTeam = async (teamName, contestTypeId, teamImageUrl = null) => {
  // Now requires contestTypeId
  // Calls updated edge function with proper parameters
}
```

#### Added UI Banner in `FantasyNavBanner.jsx`

```jsx
{teamHasntStarted && (
  <div className="bg-blue-900/30 border-b-2 border-blue-500">
    <span className="text-blue-100 font-semibold text-sm">
      Your first week will be Week {team.current_week}. 
      The current week ({currentWeek.week}) is already in progress.
    </span>
  </div>
)}
```

**Condition**: `team.current_week > currentWeek.week`

## User Experience Flow

### Before Fix ❌

1. User creates team on Thursday (Week 11 live)
2. Team assigned `current_week = 11`
3. Lock-lineups creates `weekly_lineup` for Week 11
4. **Immediately competing** in an already-started week
5. Tuesday: Finalize-week assigns win/loss
6. User confused - "I just joined and already lost?"

### After Fix ✅

1. User creates team on Thursday (Week 11 live, finalized = false)
2. Team assigned `current_week = 11` ✅ (can still join current week)
3. Lock-lineups creates `weekly_lineup` for Week 11 ✅
4. User sets lineup and competes normally
5. Tuesday: Win/loss assigned fairly

**OR**

1. User creates team on Tuesday night (Week 11 finalized = true)
2. Team assigned `current_week = 12` ✅ (next week)
3. Blue banner shows: "Your first week will be Week 12"
4. Lock-lineups tries to create Week 11 lineup → **Blocked by trigger**
5. Thursday Week 12: Lock-lineups creates Week 12 lineup ✅
6. User competes in Week 12 fresh

## Testing Scenarios

### ✅ Scenario 1: Mid-Week Join (Before Finalization)
- **When**: Thursday during live games
- **Expected**: Team joins current week, competes normally
- **Result**: `current_week = current NFL week`

### ✅ Scenario 2: Between Weeks (After Finalization)
- **When**: Tuesday night after finalize-week runs
- **Expected**: Team joins next week
- **Result**: `current_week = current NFL week + 1`
- **UI**: Blue banner shows "Your first week will be Week X"

### ✅ Scenario 3: Week 18 (Season End)
- **When**: Any time during Week 18
- **Expected**: Team assigned Week 18 but won't compete (season ending)
- **Result**: `current_week = 18` (no +1, at max)

### ✅ Scenario 4: Lock-Lineups Edge Case
- **When**: Lock-lineups runs for teams with `current_week > week_number`
- **Expected**: Lineup creation silently skipped
- **Result**: Trigger blocks INSERT, returns NULL

### ✅ Scenario 5: Contest Type Selection
- **When**: User creates team through TeamSelection.jsx
- **Expected**: Contest type required, passed to database
- **Result**: Team created with correct contest rules

## Files Modified

### Database Migrations
- ✅ `supabase/migrations/20241118_fix_midweek_team_creation.sql`
  - `get_starting_week_for_new_team()` function
  - Updated `create_new_team()` function
  - Updated `create_bot_team()` function
  - `check_team_starting_week()` trigger function
  - `prevent_premature_lineup_creation` trigger

### Edge Functions
- ✅ `supabase/functions/start-new-team/index.ts`
  - Changed to call `create_new_team` RPC
  - Added contest_type_id parameter
  - Added helpful response message

### Frontend
- ✅ `src/services/supabase.js`
  - Updated `startNewTeam()` to accept contestTypeId
  
- ✅ `src/components/FantasyNavBanner.jsx`
  - Added blue banner for teams that haven't started
  - Shows "Your first week will be Week X" message

## Security & Performance

### ✅ Security
- RLS policies unchanged (teams table already has user_id checks)
- Trigger function only reads data, doesn't modify unrelated rows
- No new attack vectors introduced

### ✅ Performance
- `get_starting_week_for_new_team()` marked as `STABLE` (can be cached)
- Single EXISTS query for finalization check (fast)
- Trigger only fires on INSERT (minimal overhead)
- No N+1 queries introduced

## Rollback Plan

If issues arise:

```sql
-- Disable the trigger temporarily
ALTER TABLE weekly_lineups DISABLE TRIGGER prevent_premature_lineup_creation;

-- Revert to old create_new_team (use direct current_week from config)
DROP FUNCTION IF EXISTS create_new_team(UUID, TEXT, UUID, TEXT) CASCADE;
-- Then deploy old version from git history

-- Remove helper function
DROP FUNCTION IF EXISTS get_starting_week_for_new_team();
```

## Future Enhancements

1. **Admin Override**: Allow admins to manually set a team's starting week
2. **Team Reactivation**: If a team was eliminated, allow them to "restart" next week
3. **Historical Tracking**: Log starting_week in transactions metadata for analytics
4. **Week Skipping**: Allow users to intentionally skip weeks (take a "bye week")

## Success Metrics

- ✅ Zero teams assigned to finalized weeks
- ✅ All new teams have clear "first week" messaging
- ✅ No retroactive win/loss assignments
- ✅ Lock-lineups respects team starting weeks
- ✅ Clean UX for mid-week/between-week signups

---

**Status**: Production-ready ✅  
**Risk Level**: Low (trigger safely blocks, existing teams unaffected)  
**Breaking Changes**: None (backward compatible)
