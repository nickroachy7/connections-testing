# Backend Infrastructure Revamp Plan

## 📋 Overview

This document outlines a comprehensive plan to rebuild the Supabase backend infrastructure (database, edge functions, cron jobs) for the Connections Testing fantasy NFL application. The goal is to create a clean, maintainable, and properly sequenced system.

**Created:** December 18, 2025  
**Last Updated:** December 18, 2025  
**Status:** ✅ PHASE 0-1 COMPLETE - Database & Security Fixes Applied

---

## 🎉 Completed Work Summary

### Phase 0: Critical Database Fixes ✅
| Task | Status | Details |
|------|--------|--------|
| Add Missing FK Indexes | ✅ Complete | Added 5 indexes for FK columns |
| Remove Duplicate Constraints | ✅ Complete | Dropped `player_game_stats_game_player_unique` and `weekly_global_stats_week_season_key` |
| Fix RLS Policy Performance | ✅ Complete | Converted 27 policies from `auth.uid()` to `(select auth.uid())` |
| Consolidate Permissive Policies | ✅ Complete | Merged overlapping SELECT policies on 6 tables |

### Phase 1: Security Fixes ✅
| Task | Status | Details |
|------|--------|--------|
| Fix SECURITY_DEFINER Views | ✅ Complete | Converted 4 views to SECURITY INVOKER |
| Fix Function search_path | ✅ Complete | Fixed 63 functions with `SET search_path = public` |
| Leaked Password Protection | ⚠️ Manual | Enable in Supabase Dashboard → Auth → Security |

### Remaining Manual Tasks ⚠️
1. **Delete deprecated edge functions** - Must be done via Supabase Dashboard:
   - `finalize-week-new` 
   - `create-lineup-snapshots`

2. **Enable Leaked Password Protection** - Supabase Dashboard → Authentication → Security
