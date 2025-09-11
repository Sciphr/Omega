# Tournament Flow & Design Decisions

## Key Issues Identified

### 1. Authentication Strategy
**Problem**: Guest-created tournaments have no management capabilities
**Options**:
- A) Require authentication for tournament creation ✅ **RECOMMENDED**
- B) Use session/localStorage for guest tournament management
- C) Generate temporary access tokens for guest creators

**Recommendation**: Require authentication for tournament creation because:
- Ensures tournament owners can manage their tournaments
- Prevents abandoned tournaments
- Enables proper participant management
- Simplifies permission system

### 2. Participant Management Flow
**Current Issue**: No way to add/manage participants during registration phase

**Proposed Flow**:
1. **Tournament Creation** (requires auth)
   - Creator sets tournament details
   - Chooses participation type: "Anyone can join" vs "Invite only"
   
2. **Registration Phase**
   - **Open Registration**: Anyone can join with name/email
   - **Invite Only**: Creator sends invite links or manually adds participants
   - **Participant List Management**: Creator can remove/edit participants

3. **Tournament Start**
   - Creator manually starts tournament when ready
   - System generates bracket with current participants
   - Minimum 4 participants required

### 3. Match Management Features Needed
**Missing Features**:
- Match details dialog with score reporting
- Draft/ban interface for supported games
- Match scheduling and notifications
- Dispute resolution system

### 4. Bracket Visualization Issues
**Current Problems**:
- Shows wrong number of participants
- No placeholder system for registration phase
- No interactive match details

## Recommended Implementation Plan

### Phase 1: Core Tournament Management
1. ✅ Require authentication for tournament creation
2. ✅ Fix bracket to show correct participant count
3. ✅ Add participant management interface
4. ✅ Add tournament start functionality

### Phase 2: Match Management
1. Match details dialog with score reporting
2. Tournament progression system
3. Winner determination and bracket advancement

### Phase 3: Advanced Features
1. Draft/ban system for supported games
2. Match scheduling system
3. Real-time updates and notifications

## Database Schema Updates Needed

### Add missing fields to tournaments table:
```sql
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS registration_deadline timestamptz;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS check_in_deadline timestamptz;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS start_time timestamptz;
```

### Add tournament management permissions:
```sql
-- Only tournament creators can manage their tournaments
-- Participants can join if allowed
-- Public can view if tournament is public
```

## UI/UX Flow

### Tournament Creator Dashboard
- View tournament details
- Manage participants (add/remove/edit)
- Start tournament when ready
- Monitor matches and resolve disputes

### Participant Experience
- Join tournament (if open registration)
- View bracket and upcoming matches
- Report match scores
- Participate in draft/ban phases

### Public Viewing
- Browse public tournaments
- View brackets and results
- Follow tournament progress

## Technical Implementation Priority

1. **High Priority**:
   - Require auth for tournament creation
   - Fix bracket participant display
   - Add participant management UI
   - Tournament start functionality

2. **Medium Priority**:
   - Match details and score reporting
   - Tournament progression system
   - Real-time bracket updates

3. **Low Priority**:
   - Draft/ban system
   - Advanced scheduling
   - Tournament analytics