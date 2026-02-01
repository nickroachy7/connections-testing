#!/usr/bin/env node

/**
 * Test script for NFL API abstraction layer
 * Verifies all endpoints work with live BallDontLie data
 */

import { NFLDataSource } from './src/services/sportsData/NFLDataSource.js';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.VITE_BALLDONTLIE_API_KEY;

if (!API_KEY) {
  console.error('❌ VITE_BALLDONTLIE_API_KEY not found in environment');
  process.exit(1);
}

async function testNFLDataSource() {
  console.log('🏈 Testing NFL Data Source...\n');
  
  const nfl = new NFLDataSource(API_KEY);
  
  try {
    // Test 1: Get Teams
    console.log('1️⃣ Testing getTeams()...');
    const teams = await nfl.getTeams();
    console.log(`✅ Found ${teams.length} teams`);
    console.log(`   Sample: ${teams[0]?.name} (${teams[0]?.abbreviation})\n`);
    
    // Test 2: Get Players
    console.log('2️⃣ Testing getPlayers()...');
    const players = await nfl.getPlayers({ active: true });
    console.log(`✅ Found ${players.length} active players`);
    console.log(`   Sample: ${players[0]?.fullName} (${players[0]?.position})\n`);
    
    // Test 3: Get Player Stats
    if (players.length > 0) {
      console.log('3️⃣ Testing getPlayerStats()...');
      const playerId = players[0].id;
      const stats = await nfl.getPlayerStats(playerId, { season: 2024 });
      console.log(`✅ Found ${stats.length} stat entries for player ${playerId}`);
      if (stats.length > 0) {
        console.log(`   Sample: Week ${stats[0]?.week}, Points: ${stats[0]?.fantasyPoints}\n`);
      }
    }
    
    // Test 4: Get Schedule
    console.log('4️⃣ Testing getSchedule()...');
    const schedule = await nfl.getSchedule({ season: 2024, week: 1 });
    console.log(`✅ Found ${schedule.length} games for Week 1`);
    if (schedule.length > 0) {
      console.log(`   Sample: ${schedule[0]?.homeTeam?.name} vs ${schedule[0]?.awayTeam?.name}\n`);
    }
    
    console.log('🎉 All core tests passed!\n');
    console.log('📊 Summary:');
    console.log(`   ✅ Teams: ${teams.length}`);
    console.log(`   ✅ Players: ${players.length}`);
    console.log(`   ✅ Schedule: ${schedule.length} games`);
    console.log('\n✅ NFL API abstraction layer is working correctly!');
    console.log('\n💡 Note: BallDontLie API does not support projections or live box scores yet.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

testNFLDataSource();
