# Documentation Index

This folder contains all technical and reference documentation for the NFL Fantasy Connections project.

---

## 📚 Documentation Structure

### Living Documents (Update Frequently)
- **[DEVELOPMENT_STATUS.md](./DEVELOPMENT_STATUS.md)** - Current project status, progress tracker, known issues, and roadmap
- **[WEEKLY_AUTOMATION.md](./WEEKLY_AUTOMATION.md)** - Complete guide to automated weekly workflow, cron jobs, and edge functions

### Core Game Design
- **[../GAMEPLAY_FLOW.md](../GAMEPLAY_FLOW.md)** ⭐ - **CRITICAL** - Single source of truth for user experience and gameplay mechanics (kept in root for visibility)

### Technical Reference (Stable)
- **[SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md)** - Database schema, relationships, and technical architecture
- **[EDGE_FUNCTIONS_GUIDE.md](./EDGE_FUNCTIONS_GUIDE.md)** - Detailed guide to all edge functions, when to use them, deployment
- **[PROJECTION_SYSTEM.md](./PROJECTION_SYSTEM.md)** - How player projections are calculated and updated
- **[CONTEST_TYPES_IMPLEMENTATION.md](./CONTEST_TYPES_IMPLEMENTATION.md)** - Contest types system implementation details

### Getting Started
- **[../QUICK_START.md](../QUICK_START.md)** - Quick start guide for new developers (in root for easy access)

---

## 📖 Quick Navigation

### For New Developers
1. Start with **QUICK_START.md** to set up your environment
2. Read **GAMEPLAY_FLOW.md** to understand what we're building
3. Review **SYSTEM_ARCHITECTURE.md** for technical details
4. Check **DEVELOPMENT_STATUS.md** for current priorities

### For Understanding Automation
1. **WEEKLY_AUTOMATION.md** - Complete automation flow
2. **EDGE_FUNCTIONS_GUIDE.md** - Individual function details

### For Working on Features
1. **GAMEPLAY_FLOW.md** - Ensure your feature matches the design
2. **DEVELOPMENT_STATUS.md** - Check current priorities and known issues
3. **SYSTEM_ARCHITECTURE.md** - Understand data relationships

---

## 🔄 Document Update Guidelines

### When to Update DEVELOPMENT_STATUS.md
- Completing major milestones
- Identifying new blockers or issues
- Changing project priorities
- After security audits or testing sessions
- Weekly progress updates

### When to Update GAMEPLAY_FLOW.md
- Implementing new gameplay features
- Modifying user flows or journeys
- Changing reward/token mechanics
- Altering contest rules or scoring
- Any changes to user-facing experience

### When to Update WEEKLY_AUTOMATION.md
- Adding new edge functions
- Modifying cron schedules
- Changing automation logic
- Adding new automated processes

### When to Update Technical Docs
- Database schema changes → Update SYSTEM_ARCHITECTURE.md
- New edge functions → Update EDGE_FUNCTIONS_GUIDE.md
- Projection logic changes → Update PROJECTION_SYSTEM.md
- Contest type changes → Update CONTEST_TYPES_IMPLEMENTATION.md

---

## 🗂️ What Was Consolidated

The following older documents were consolidated into the current structure:

**Consolidated into DEVELOPMENT_STATUS.md:**
- ACTION_PLAN.md (Nov 17 status - outdated)
- EXECUTIVE_SUMMARY.md (production readiness report)
- PRODUCTION_READINESS_REPORT.md (duplicate info)
- SECURITY_CRITICAL_ISSUES.md (ongoing security tasks)

**Consolidated into WEEKLY_AUTOMATION.md:**
- AUTOMATION_GUIDE.md (duplicate of weekly automation)
- WEEKLY_AUTOMATION_FLOW.md (renamed and enhanced)
- WEEKLY_SCHEDULE.md (merged schedule info)
- CRON_SETUP_INSTRUCTIONS.md (one-time setup, already applied)

---

## 📝 Documentation Best Practices

1. **Keep docs updated** - Stale docs are worse than no docs
2. **Use clear headers** - Make docs easy to scan
3. **Include examples** - Show, don't just tell
4. **Link between docs** - Help readers find related info
5. **Mark status** - Use ✅, 🚧, ❌ to show completion status
6. **Date updates** - Add "Last Updated" to living documents

---

## 🎯 Document Ownership

### GAMEPLAY_FLOW.md
**Owner:** Product/Design  
**Audience:** Everyone  
**Update Frequency:** When user experience changes

### DEVELOPMENT_STATUS.md
**Owner:** Engineering Lead  
**Audience:** Engineering team, stakeholders  
**Update Frequency:** Weekly or when status changes

### WEEKLY_AUTOMATION.md
**Owner:** Backend Engineering  
**Audience:** Developers working on automation  
**Update Frequency:** When automation changes

### Technical Docs (SYSTEM_ARCHITECTURE, EDGE_FUNCTIONS_GUIDE, etc.)
**Owner:** Engineering team  
**Audience:** Developers  
**Update Frequency:** When implementation changes

---

For questions about documentation, see `.github/copilot-instructions.md` for project guidelines.
