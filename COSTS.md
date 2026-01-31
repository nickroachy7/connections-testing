# Cost Breakdown & Budget

**Philosophy:** Build scrappy, scale profitably. Use free tiers aggressively.

---

## Current Expenses

### Confirmed
| Service | Cost | Status | Notes |
|---------|------|--------|-------|
| Apple Developer | $99/year | Required | One-time for TestFlight + App Store |
| Supabase | TBD | Active | Need to check current tier |
| BallDontLie API | TBD | Active | Need to verify pricing |
| Model Usage (Max) | Variable | Active | OpenClaw operating costs |

**Action Items:**
- [ ] Verify BallDontLie pricing/limits
- [ ] Check Supabase current tier and usage
- [ ] Estimate monthly API costs at scale

---

## Free Tier Services (Leverage These)

### Hosting & Infrastructure
| Service | Free Tier | What We Use It For |
|---------|-----------|-------------------|
| **Vercel** | Unlimited hobby projects, 100GB bandwidth | Frontend hosting |
| **Expo EAS** | 100 builds/month | iOS/Android app builds |
| **GitHub Actions** | 2,000 minutes/month (public repos) | CI/CD pipeline |

### Development Tools
| Service | Free Tier | What We Use It For |
|---------|-----------|-------------------|
| **Sentry** | 5,000 errors/month | Error tracking |
| **PostHog** | 1M events/month | User analytics |
| **Expo Notifications** | Unlimited | Push notifications |

### Data Sources (FREE Alternatives)

#### NBA Data
- ✅ **NBA Stats API** - Official, free, comprehensive
- ✅ **ESPN API** - Free, good for scores/schedules
- ❌ BallDontLie - Has NBA but check if cheaper alternatives exist

#### MLB Data
- ✅ **MLB Stats API** - Official, free
- ✅ **ESPN API** - Free, scores/schedules
- ✅ **Baseball Reference** (scraping possible if needed)

#### NFL Data
- Current: BallDontLie (verify cost)
- Alternatives: ESPN API (free but limited), NFL API (if accessible)

---

## Cost Optimization Strategy

### Phase 1: MVP (Current)
**Goal:** $0-100/month total

**Tactics:**
- Use Supabase free tier (500MB database, 2GB bandwidth)
- Vercel free tier (sufficient for early users)
- Free APIs wherever possible
- No paid analytics/monitoring until necessary

**Breaking Point:** ~1,000 active users or 10GB database

### Phase 2: Beta (TestFlight)
**Goal:** <$200/month

**Tactics:**
- Upgrade Supabase only if we hit limits
- Stay on Vercel free tier
- Monitor API rate limits
- Use free tier analytics

**Breaking Point:** ~5,000 active users

### Phase 3: Launch (App Store)
**Goal:** <$500/month (aim to be profitable)

**Tactics:**
- Upgrade services only as needed
- Negotiate API pricing at volume
- Consider caching to reduce API calls
- Monetization should exceed costs by this point

---

## When to Upgrade (Decision Framework)

### Supabase
**Free Tier:**
- 500MB database
- 2GB bandwidth/month
- 50,000 monthly active users

**Upgrade Trigger:** Hit 400MB database OR 1.5GB bandwidth  
**Cost:** $25/month (Pro tier)  
**Approval Required:** Yes

### API Costs
**Upgrade Trigger:** Rate limits affecting user experience  
**Action:** Explore caching, batch requests, or negotiate pricing  
**Approval Required:** Yes

### Analytics/Monitoring
**Upgrade Trigger:** Only if free tiers limit critical insights  
**Cost:** $0 (stick with free tiers)  
**Approval Required:** N/A

---

## Cost Avoidance Tactics

### 1. API Caching
- Cache player stats (update twice daily)
- Cache game schedules (weekly)
- Cache projections (twice weekly)
- **Savings:** 80-90% reduction in API calls

### 2. Database Optimization
- Archive old seasons to reduce active data
- Compress JSON fields
- Use database functions instead of API queries
- **Savings:** Stay on free tier longer

### 3. CDN Usage
- Serve static assets via Vercel CDN
- Lazy load images
- Compress assets
- **Savings:** Reduce bandwidth costs

### 4. Batch Processing
- Process stats updates in batches
- Use cron jobs efficiently
- Avoid redundant queries
- **Savings:** Reduce compute costs

---

## Revenue Targets (When Budget Can Expand)

**Goal:** Revenue > Costs by 3x minimum

### Monetization Ideas (Future)
- Premium subscriptions ($5-10/month)
- In-app coin purchases
- Premium contest entry fees
- Ads (ethical placement only)

**Budget Expansion Trigger:** $1,000/month revenue  
**New Budget:** Up to $300/month on infrastructure

---

## Monthly Cost Projection

### Current (MVP)
- Supabase: $0 (free tier)
- Vercel: $0 (free tier)
- APIs: $0-50 (depends on BallDontLie)
- Apple Developer: $8/month (amortized)
- **Total: $8-58/month**

### At 1,000 Users
- Supabase: $25 (Pro tier)
- Vercel: $0 (still free)
- APIs: $50-100 (volume)
- Apple Developer: $8/month
- **Total: $83-133/month**

### At 10,000 Users (Profitable)
- Supabase: $99 (Team tier)
- Vercel: $20 (Pro tier if needed)
- APIs: $200-300 (negotiated rates)
- Tools: $50 (paid monitoring)
- Apple Developer: $8/month
- **Total: $377-477/month**
- **Revenue Target: $1,500+/month**

---

## Action Items

**Immediate:**
- [ ] Audit BallDontLie pricing and usage
- [ ] Check current Supabase tier and usage stats
- [ ] Research free NBA/MLB API alternatives
- [ ] Set up cost tracking dashboard

**Before Launch:**
- [ ] Implement aggressive caching
- [ ] Optimize database queries
- [ ] Set up usage alerts (Supabase, Vercel)
- [ ] Document all expenses

**Post-Launch:**
- [ ] Monitor costs weekly
- [ ] Track cost per user
- [ ] Optimize hot spots
- [ ] Negotiate API pricing at scale

---

**Last Updated:** 2026-01-31  
**Budget Owner:** Nick (approval required for new expenses)  
**Cost Guardian:** Max (monitor and optimize)

**Remember:** Scrappy > fancy. Ship fast, scale profitably. 💰⚡
