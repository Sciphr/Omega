# Advanced Statistics System Setup

## Overview
This system provides real-time calculation and storage of advanced game-specific statistics for players and teams.

## Database Setup

1. **Run the Schema**: Execute `advanced_stats_schema.sql` in your Supabase SQL editor
2. **Verify Tables**: Confirm these tables were created:
   - `match_performance_data`
   - `player_advanced_stats`
   - `team_advanced_stats`
   - `stat_calculation_log`

## Implementation Steps

### Step 1: Update Match Completion APIs

Add to your match completion endpoint (e.g., `/api/matches/[id]/complete`):

```javascript
import { handleMatchCompletion } from '@/lib/api-integration-examples'

// After your existing match completion logic
await handleMatchCompletion(matchId, {
  game_id: match.game_id,
  is_team_match: match.tournament?.team_size > 1,
  duration_seconds: match.duration_seconds,
  participants: [
    {
      user_id: "user-uuid",
      team_id: "team-uuid", // null for individual matches
      placement: 1, // 1st place, 2nd place, etc.
      stats: {
        kills: 10,
        deaths: 3,
        assists: 8,
        // ... other game-specific stats
      }
    }
    // ... more participants
  ]
})
```

### Step 2: Update Tournament Completion APIs

Add to your tournament completion endpoint:

```javascript
import { handleTournamentCompletion } from '@/lib/api-integration-examples'

// After tournament is marked complete
await handleTournamentCompletion(tournamentId)
```

### Step 3: Update Player/Team Profile APIs

Replace demo data injection with real stats:

```javascript
import { getPlayerAdvancedStats, getTeamAdvancedStats } from '@/lib/advanced-stats-calculator'

// In player profile API
const advancedStats = await getPlayerAdvancedStats(userId, gameId)

// In team profile API
const advancedStats = await getTeamAdvancedStats(teamId, gameId)
```

### Step 4: Configure Game-Specific Data

Update the `parseGameSpecificData` function in `/lib/api-integration-examples.js` to match your game's data structure.

#### League of Legends Example:
```javascript
performance_data: {
  kills: matchData.kills,
  deaths: matchData.deaths,
  assists: matchData.assists,
  cs_per_min: matchData.creepScore / matchData.gameTimeMinutes,
  gold_per_min: matchData.goldEarned / matchData.gameTimeMinutes,
  damage_dealt: matchData.totalDamageDealtToChampions,
  vision_score_per_min: matchData.visionScore / matchData.gameTimeMinutes
}
```

#### Counter-Strike Example:
```javascript
performance_data: {
  kills: matchData.kills,
  deaths: matchData.deaths,
  assists: matchData.assists,
  headshot_percentage: (matchData.headshotKills / matchData.kills) * 100,
  adr: matchData.damage / matchData.roundsPlayed,
  clutch_success_rate: (matchData.clutchWins / matchData.clutchAttempts) * 100
}
```

## Features Included

### Real-time Updates
- Stats update immediately after each match
- Progressive calculation (running averages)
- ELO-style performance rating updates

### Game-Specific Stats
- **League of Legends**: KDA, CS/min, vision, objective participation
- **Counter-Strike**: Headshot %, ADR, clutch success
- **Super Smash Bros**: Stocks, edgeguards, neutral game
- **Extensible**: Easy to add new games

### Team Analytics
- Team chemistry calculations
- Synergy scoring based on individual performance variance
- Recent form tracking (last 10 matches)

### Monitoring & Logging
- Performance monitoring via `stat_calculation_log`
- Error tracking for failed calculations
- Processing time metrics

## Data Flow

1. **Match Completes** → Store raw performance data
2. **Calculate Stats** → Update rolling averages and advanced metrics
3. **Update Ratings** → ELO-style rating adjustments
4. **Team Stats** → Chemistry and synergy calculations
5. **Tournament End** → Update tournament-specific counters

## Performance Considerations

- Uses database-generated columns for calculated fields (win_rate, kda_ratio)
- Indexes on common query patterns
- Async processing to avoid blocking match completion
- Error isolation (stat failures don't break matches)

## Switching from Demo to Real Data

1. **Remove demo injection** from player/team profile APIs:
   ```javascript
   // Remove these lines:
   // const playerWithAnalytics = injectDemoPlayerStats(playerData, currentGame)
   // const teamWithAnalytics = injectDemoTeamStats(team, team.game)
   ```

2. **Add real stats queries**:
   ```javascript
   // Replace with:
   const advancedStats = await getPlayerAdvancedStats(userId, gameId)
   playerData.advanced_stats = advancedStats
   ```

3. **Update match completion flow** to include stat updates

## Testing

1. **Create a test match** with known performance data
2. **Complete the match** and verify stats are calculated
3. **Check the database** to see stored performance data
4. **View player/team profiles** to see updated analytics

## Monitoring

Check the `stat_calculation_log` table for:
- Failed calculations
- Processing performance
- System health

```sql
-- View recent calculation logs
SELECT * FROM stat_calculation_log
ORDER BY created_at DESC
LIMIT 50;

-- Check for errors
SELECT * FROM stat_calculation_log
WHERE success = false
ORDER BY created_at DESC;
```