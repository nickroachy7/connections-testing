# 🚀 PRODUCTION READINESS - ACTION PLAN
**Quick Reference Guide for Engineers**

---

## ✅ COMPLETED TODAY (Nov 17, 2025)

### Critical Fixes Applied:
1. ✅ **Fixed PPR Scoring System** 
   - Updated `update-live-stats/index.ts` to respect contest type scoring
   - Updated `projections.js` to support standard/half/full PPR
   - Now calculates correctly based on team's contest type

2. ✅ **Added Database Unique Constraint**
   - Migration: `add_player_game_stats_unique_constraint`
   - Prevents duplicate stat entries
   - Data integrity guaranteed

3. ✅ **Verified API Integration**
   - Confirmed @balldontlie/sdk@1.2.2 installed correctly
   - No action needed

---

## 🚨 IMMEDIATE PRIORITIES (P0 - Blocking)

### 1. Enable RLS on 3 Tables
**File to Create:** `supabase/migrations/[timestamp]_enable_rls_on_public_tables.sql`

```sql
-- Enable RLS
ALTER TABLE public.edge_function_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfl_season_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulated_week_results ENABLE ROW LEVEL SECURITY;

-- edge_function_logs: Service role only
CREATE POLICY "Service role can access logs"
ON public.edge_function_logs FOR ALL TO service_role USING (true);

-- nfl_season_config: Read-only for users, service role for writes
CREATE POLICY "Anyone can read season config"
ON public.nfl_season_config FOR SELECT TO authenticated, anon
USING (is_active = true);

CREATE POLICY "Service role can manage season config"
ON public.nfl_season_config FOR ALL TO service_role USING (true);

-- simulated_week_results: Users see own results only
CREATE POLICY "Users see own simulation results"
ON public.simulated_week_results FOR SELECT TO authenticated
USING (
  season_id IN (
    SELECT id FROM simulated_seasons WHERE user_id = auth.uid()
  )
);
```

**Time:** 30 minutes  
**Test:** Query tables as different users

---

### 2. Fix SECURITY DEFINER Views
**File to Create:** `supabase/migrations/[timestamp]_fix_security_definer_views.sql`

```sql
-- Option 1: Change to SECURITY INVOKER (recommended)
ALTER VIEW public.leaderboard_by_contest SECURITY INVOKER;
ALTER VIEW public.teams_with_contest_info SECURITY INVOKER;
ALTER VIEW public.fantasy_data_health SECURITY INVOKER;

-- Then test views still work correctly
```

**Time:** 1 hour  
**Test:** Query views as different users, ensure no cross-user data

---

### 3. Test RLS with Multiple Users
**Steps:**
1. Create 2-3 test user accounts in Supabase Auth
2. Sign in as User A, create a team
3. Sign in as User B, try to query User A's data
4. Verify User B CANNOT see User A's data

**Critical Tables to Test:**
- teams
- user_player_inventory
- user_token_inventory
- weekly_lineups
- transactions

**Time:** 2-3 hours  
**Success Criteria:** Complete data isolation between users

---

## 🔧 HIGH PRIORITY (P1 - This Week)

### 4. Fix Search Path for Top 10 Functions

**Functions to Fix First:**
1. `award_player_xp`
2. `create_new_team`
3. `purchase_pack`
4. `calculate_fantasy_points`
5. `advance_nfl_week`
6. `increment_token_triggers`
7. `handle_new_user`
8. `get_current_nfl_week`
9. `give_starter_players`
10. `insert_player_to_inventory`

**Template for Each Function:**
```sql
CREATE OR REPLACE FUNCTION public.function_name(...)
RETURNS ...
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- ADD THIS LINE
AS $$
BEGIN
  -- existing function body
END;
$$;
```

**Time:** 30 min per function = 5 hours total  
**Can be batched** but review each carefully

---

### 5. Add Error Handling to Edge Functions

**Files to Update:**
- `supabase/functions/update-live-stats/index.ts` ✅ (already good)
- `supabase/functions/lock-lineups/index.ts`
- `supabase/functions/finalize-week/index.ts`

**Pattern to Add:**
```typescript
try {
  // Existing logic
  
  // Add retry logic for API calls
  // Add detailed logging
  // Add graceful fallbacks
  
} catch (error) {
  console.error('[Function Name] Error:', {
    error: error.message,
    stack: error.stack,
    context: { /* relevant context */ }
  });
  
  // Log to edge_function_logs table
  await supabase.from('edge_function_logs').insert({
    function_name: 'function-name',
    status: 'error',
    error_message: error.message,
    metadata: { /* context */ }
  });
  
  // Return graceful error response
  return new Response(
    JSON.stringify({ 
      error: 'User-friendly message',
      details: error.message 
    }),
    { status: 500, headers: corsHeaders }
  );
}
```

**Time:** 2-3 hours  

---

## 📋 TESTING CHECKLIST

### Security Testing
- [ ] Create User A, create team
- [ ] Create User B, try to access User A's team
- [ ] Verify User B gets 403/empty results
- [ ] Test all major tables
- [ ] Test all views
- [ ] Test as anonymous user

### Functional Testing
- [ ] Full week cycle (lock → update → finalize → advance)
- [ ] Pack opening flow
- [ ] Team creation flow
- [ ] Lineup management (drag & drop)
- [ ] Token application
- [ ] Scoring calculations
- [ ] Win/loss determination

### Performance Testing
- [ ] Create 10+ teams
- [ ] Simulate concurrent lineup updates
- [ ] Test with 100+ player cards
- [ ] Monitor query performance

---

## 🛠️ TOOLS & COMMANDS

### Check Current RLS Status
```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

### Test as Different User
```sql
-- In Supabase SQL Editor, set user context
SET request.jwt.claims = '{"sub": "user-uuid-here"}';

-- Then run queries to test
SELECT * FROM teams;
```

### View Current Policies
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Test Edge Function Locally
```bash
# Navigate to function directory
cd supabase/functions/function-name

# Run with Deno
deno run --allow-all index.ts
```

### Deploy Edge Function
```bash
# Via Supabase CLI
supabase functions deploy function-name

# Or deploy all
supabase functions deploy
```

---

## 📊 PROGRESS TRACKER

### Day 1 (Today - Nov 17)
- [x] Complete production review
- [x] Fix PPR scoring system
- [x] Add unique constraint
- [x] Create action plan documents
- [ ] Enable RLS on 3 tables
- [ ] Fix SECURITY DEFINER views

### Day 2 (Nov 18)
- [ ] Test RLS with multiple users
- [ ] Fix top 5 function search_paths
- [ ] Add error handling to lock-lineups

### Day 3 (Nov 19)
- [ ] Fix remaining 5 function search_paths
- [ ] Add error handling to finalize-week
- [ ] Security testing

### Day 4-5 (Nov 20-21)
- [ ] Input validation
- [ ] UI improvements
- [ ] Integration testing

### Day 6-7 (Nov 22-23)
- [ ] Fix remaining functions (33 more)
- [ ] Performance optimization
- [ ] Final QA

### Day 8-10 (Nov 25-27)
- [ ] Staging deployment
- [ ] Soft launch (5 test users)
- [ ] Monitor and iterate

---

## 🎯 DEFINITION OF DONE

### For Each Security Issue:
- [ ] Migration created and tested
- [ ] Tested with multiple users
- [ ] No cross-user data leaks
- [ ] Documentation updated
- [ ] Reviewed by another engineer

### For Each Edge Function:
- [ ] Error handling added
- [ ] Logging implemented
- [ ] Input validation added
- [ ] Tested with edge cases
- [ ] Performance measured

### For Overall Project:
- [ ] All P0 issues resolved
- [ ] All P1 issues resolved
- [ ] Security audit passed
- [ ] Load testing passed (10+ users)
- [ ] Zero critical bugs
- [ ] Documentation complete
- [ ] Deployment checklist completed

---

## 📞 ESCALATION

### If You Get Stuck:
1. Check `SECURITY_CRITICAL_ISSUES.md` for detailed fixes
2. Check `PRODUCTION_READINESS_REPORT.md` for context
3. Check `EXECUTIVE_SUMMARY.md` for big picture
4. Ask senior engineer for review
5. Don't ship if unsure - security first!

### Red Flags to Escalate Immediately:
- 🚩 Cross-user data leak discovered
- 🚩 Scoring calculation still wrong
- 🚩 Data corruption after migration
- 🚩 Can't fix security issue with existing architecture

---

## ✅ QUICK WINS (Low Effort, High Impact)

1. **Enable RLS on 3 tables** - 30 minutes, fixes P0 issue
2. **Fix SECURITY DEFINER views** - 1 hour, fixes P0 issue  
3. **Add error logging** - 2 hours, much better debugging
4. **Create test users** - 30 minutes, enables proper testing
5. **Document RLS policies** - 1 hour, makes testing easier

Start with these!

---

## 🎓 BEST PRACTICES

### When Writing Migrations:
```sql
-- Always start with safety check
DO $$
BEGIN
  -- Check if already applied
  IF NOT EXISTS (...) THEN
    -- Apply migration
  END IF;
END $$;
```

### When Writing RLS Policies:
```sql
-- Always test both SELECT and INSERT/UPDATE/DELETE
-- Test as: authenticated user, wrong user, anon user, service role
```

### When Writing Edge Functions:
```typescript
// Always:
// 1. Validate inputs
// 2. Use try-catch
// 3. Log errors
// 4. Return graceful errors
// 5. Test error cases
```

---

**REMEMBER: Security first, then speed. We're building trust with users.**

Good luck! 🚀
