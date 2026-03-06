# Session Enforcement Fix - One Device at a Time

## Problem
Multiple devices could watch the same livestream simultaneously under one account, violating the "one device at a time" restriction.

## Root Cause
1. **Backend**: The heartbeat endpoint wasn't properly validating if the session still existed after being taken over by another device
2. **Frontend**: Session state wasn't being cleared when the session expired or was taken over
3. **Frontend**: Video player was accessible even without a valid session token

## Changes Made

### Backend (`server/controllers/livestreamController.js`)

**Modified `heartbeatStream` function (lines 1049-1078)**:
- Added stream ID parameter validation
- Changed from `findOneAndUpdate` to `findOne` to check session existence first
- Now properly detects when a session has been deleted (taken over by another device)
- Returns `SESSION_EXPIRED` error code when session is invalid

### Frontend (`client/app/livestream/[id]/page.tsx`)

**Modified `startHeartbeat` function (lines 94-117)**:
- Added proper cleanup when session expires
- Clears `heartbeatRef`, `sessionToken`, and `sessionTokenRef`
- Sets `sessionBlocked` to true to show the blocking screen

**Modified `joinSession` function (lines 65-96)**:
- Properly clears session state when blocked (409 status)
- Clears session token and heartbeat interval
- Ensures clean state management

**Added session token validation (lines 802-812)**:
- Video player only renders when a valid `sessionToken` exists
- Shows loading screen if no session token is present
- Prevents unauthorized access to the video stream

## How It Works

### Initial Connection
1. User opens livestream page
2. Frontend calls `/streams/:id/join` to create a session
3. Backend creates a session with a unique token
4. Frontend stores the token and starts heartbeat (every 25 seconds)

### Second Device Attempts to Watch
1. Second device calls `/streams/:id/join`
2. Backend detects existing active session (heartbeat within last 90 seconds)
3. Returns 409 status with "Already Watching" message
4. Second device shows blocking screen with "Watch Here Instead" button

### Force Takeover
1. User clicks "Watch Here Instead" on second device
2. Frontend calls `/streams/:id/join` with `force: true`
3. Backend deletes the old session and creates a new one
4. First device's next heartbeat (within 25 seconds) fails with `SESSION_EXPIRED`
5. First device clears session and shows blocking screen

### Session Expiry
- Sessions automatically expire after 90 seconds without heartbeat (MongoDB TTL index)
- If heartbeat fails, session is cleared and user sees blocking screen
- User must rejoin to continue watching

## Testing Instructions

### Test 1: Basic Session Creation
1. Login to an account
2. Open a livestream
3. Verify you can watch the stream
4. Check browser console - should see no session errors

### Test 2: Second Device Blocking
1. Login to the same account on Device A
2. Open a livestream and start watching
3. On Device B (different browser/device), login with same account
4. Open the same livestream
5. **Expected**: Device B shows "Already Watching" screen
6. **Expected**: Device A continues playing normally

### Test 3: Force Takeover
1. Continue from Test 2 (Device B showing blocking screen)
2. On Device B, click "Watch Here Instead"
3. **Expected**: Device B starts playing the stream
4. **Expected**: Within 25 seconds, Device A shows "Already Watching" screen
5. **Expected**: Device A's video stops playing

### Test 4: Session Expiry
1. Start watching on Device A
2. Close the browser tab (don't logout)
3. Wait 90+ seconds
4. Open the livestream again on Device A
5. **Expected**: New session is created automatically
6. **Expected**: Stream plays normally

### Test 5: Multiple Tabs (Same Browser)
1. Login and open livestream in Tab 1
2. Open same livestream in Tab 2 (same browser)
3. **Expected**: Tab 2 shows "Already Watching" screen
4. Click "Watch Here Instead" on Tab 2
5. **Expected**: Tab 1 shows blocking screen within 25 seconds

## Technical Details

### Session Model
- **Collection**: `LivestreamSession`
- **Fields**: `user`, `stream`, `sessionToken`, `lastHeartbeat`, `ipAddress`, `userAgent`
- **Indexes**: 
  - Compound index on `user` + `stream`
  - TTL index on `lastHeartbeat` (90 seconds)

### Heartbeat Interval
- **Client**: 25 seconds (HEARTBEAT_INTERVAL_MS)
- **Server**: 90 seconds expiry (HEARTBEAT_EXPIRY_MS)
- **Buffer**: 65 seconds grace period for network issues

### Security
- Session tokens are cryptographically random (32 bytes hex)
- Tokens are validated on every heartbeat
- Sessions are tied to user ID and stream ID
- IP address and user agent are logged for audit

## Monitoring

Check for these in logs:
- `Session join error` - Issues creating sessions
- `Heartbeat error` - Network or session validation failures
- `SESSION_EXPIRED` - Session takeover or expiry events

## Known Limitations

1. **Takeover delay**: Up to 25 seconds for first device to detect takeover
2. **Network issues**: Poor connectivity may cause false session expiry
3. **Clock skew**: Server and client time differences may affect TTL

## Future Improvements

1. WebSocket notifications for instant session invalidation
2. Configurable heartbeat intervals per stream
3. Session analytics dashboard
4. Grace period for network reconnection
