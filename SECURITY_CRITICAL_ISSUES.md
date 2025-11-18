# CRITICAL SECURITY ISSUES - IMMEDIATE ACTION REQUIRED

**Generated:** November 17, 2025  
**Priority:** P0 - BLOCKING PRODUCTION RELEASE

---

## 🚨 SECURITY DEFINER VIEWS (3 Critical Issues)

### Issue: Views bypassing RLS policies
Three views are defined with `SECURITY DEFINER` which means they run with creator privileges instead of user privileges, bypassing Row Level Security.

**Affected Views:**
1. `public.leaderboard_by_contest`
2. `public.teams_with_contest_info`
3. `public.fantasy_data_health`

**Risk:** Users could potentially access data from other teams/users through these views.

**Fix Required:**
```sql
-- For each view, either:
-- OPTION 1: Remove SECURITY DEFINER (preferred)
ALTER VIEW public.leaderboard_by_contest SECURITY INVOKER;
ALTER VIEW public.teams_with_contest_info SECURITY INVOKER;
ALTER VIEW public.fantasy_data_health SECURITY INVOKER;

-- OPTION 2: If SECURITY DEFINER is needed, add explicit RLS checks in view definition
```

---

## 🚨 RLS DISABLED ON PUBLIC TABLES (3 Critical Issues)

### Issue: Tables exposed without Row Level Security

**Affected Tables:**
1. **`edge_function_logs`** - Contains execution logs (medium risk)
2. **`nfl_season_config`** - Contains season configuration (low-medium risk)  
3. **`simulated_week_results`** - Contains simulation data (low risk)

**Risk:** Anyone with API access can read/write to these tables

**Fix Required:**
```sql
-- Enable RLS on all three tables
ALTER TABLE public.edge_function_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfl_season_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulated_week_results ENABLE ROW LEVEL SECURITY;

-- Add appropriate policies

-- edge_function_logs: Service role only (internal logging)
CREATE POLICY "Service role can access logs"
ON public.edge_function_logs
FOR ALL
TO service_role
USING (true);

-- nfl_season_config: Read-only for authenticated users, service role for writes
CREATE POLICY "Anyone can read season config"
ON public.nfl_season_config
FOR SELECT
TO authenticated, anon
USING (is_active = true);

CREATE POLICY "Service role can manage season config"
ON public.nfl_season_config
FOR ALL
TO service_role
USING (true);

-- simulated_week_results: Users can only see their own simulation results
CREATE POLICY "Users see own simulation results"
ON public.simulated_week_results
FOR SELECT
TO authenticated
USING (
  season_id IN (
    SELECT id FROM simulated_seasons WHERE user_id = auth.uid()
  )
);
```

---

## ⚠️ FUNCTION SEARCH PATH MUTABLE (43 Warnings)

### Issue: Functions vulnerable to search_path attacks

All 43 database functions have mutable search_path, which could be exploited by attackers to inject malicious code.

**Sample of Affected Functions:**
- `award_player_xp`
- `create_new_team`
- `purchase_pack`
- `advance_nfl_week`
- `calculate_fantasy_points`
- ... and 38 more

**Risk:** Medium - Requires DB access but could lead to privilege escalation

**Fix Required:**
Add `SET search_path = public` to each function definition:

```sql
-- Example fix for award_player_xp
CREATE OR REPLACE FUNCTION award_player_xp(...)
RETURNS ...
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- ADD THIS LINE
AS $$
BEGIN
  -- function body
END;
$$;
```

**Batch Fix Script:**
```sql
-- This needs to be done for all 43 functions
-- Can be scripted but requires careful review of each function
```

---

## ⚠️ AUTH CONFIGURATION

### Issue: Leaked password protection disabled

**Risk:** Low - Users could use compromised passwords

**Fix:**
Enable in Supabase Dashboard → Authentication → Password Protection
OR via SQL:
```sql
-- Enable Have I Been Pwned integration
-- (Usually done via dashboard)
```

---

## 📋 REMEDIATION PRIORITY

### Priority 1 - Block Production (Fix Today)
- [ ] Enable RLS on 3 public tables
- [ ] Fix SECURITY DEFINER views
- [ ] Test RLS policies with multiple users

### Priority 2 - Critical (Fix This Week)
- [ ] Fix search_path for top 10 most-used functions
  - `award_player_xp`
  - `create_new_team`
  - `purchase_pack`
  - `calculate_fantasy_points`
  - `advance_nfl_week`
  - `increment_token_triggers`
  - `handle_new_user`
  - `get_current_nfl_week`
  - `give_starter_players`
  - `insert_player_to_inventory`

### Priority 3 - Important (Fix Before Launch)
- [ ] Fix remaining 33 functions' search_path
- [ ] Enable leaked password protection
- [ ] Full security audit with test users

---

## 🧪 TESTING CHECKLIST

After fixes are applied:

### RLS Testing
- [ ] Create 2 test users
- [ ] User A creates a team
- [ ] User B tries to access User A's team data
- [ ] Verify User B CANNOT see User A's data
- [ ] Test all major tables (teams, inventory, lineups, etc.)

### View Security Testing
- [ ] Query each view as different users
- [ ] Verify only own data is returned
- [ ] Test with anon role
- [ ] Test with authenticated role

### Function Security Testing
- [ ] Test functions with malicious search_path injection
- [ ] Verify functions use correct schemas
- [ ] Test with service role vs authenticated role

---

## 🔍 DETAILED RLS POLICY REVIEW NEEDED

### Tables That Need Policy Verification:

1. **teams** - Verify users only see own teams
2. **user_player_inventory** - Verify users only see own players
3. **user_token_inventory** - Verify users only see own tokens
4. **weekly_lineups** - Verify users only see own lineups
5. **transactions** - Verify users only see own transactions
6. **user_packs** - Verify users only see own packs

### Recommended Policy Pattern:
```sql
-- Standard user isolation policy
CREATE POLICY "Users see only own [table]"
ON public.[table]
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users modify only own [table]"
ON public.[table]
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

---

## 🚀 DEPLOYMENT BLOCKER STATUS

**Current Status: BLOCKED FOR PRODUCTION**

Cannot release to test users until:
- ✅ RLS enabled on all public tables
- ✅ SECURITY DEFINER views fixed or removed
- ✅ RLS policies tested with multiple users
- ✅ Top 10 functions have search_path fixed

**Estimated Time to Fix:**
- RLS tables: 1-2 hours
- Views: 2-3 hours  
- Functions (top 10): 2-3 hours
- Testing: 2-3 hours
- **Total: 1-2 days**

---

## 📞 NEXT STEPS

1. **Immediate (Today):**
   - Apply RLS to 3 tables
   - Fix or remove SECURITY DEFINER views
   - Create test users and verify isolation

2. **Tomorrow:**
   - Fix top 10 functions' search_path
   - Comprehensive RLS policy review
   - Document security model

3. **This Week:**
   - Fix remaining functions
   - Security testing with penetration attempts
   - Get security approval before test user release

---

## ✅ POSITIVE FINDINGS

What's already good:
- Most tables already have RLS enabled
- Authentication is properly configured
- Database structure is sound
- Service role separation exists

The issues found are common in early development and are all fixable with focused effort.
