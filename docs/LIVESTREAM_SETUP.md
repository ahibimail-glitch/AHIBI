# Mux Live Streaming Setup Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LIVE STREAMING ARCHITECTURE                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     RTMP      ┌──────────────┐     HLS      ┌──────────────┐
│  OBS Studio  │ ────────────► │   Mux Live   │ ───────────► │   Viewers    │
│  (Encoder)   │               │   (Ingest)   │              │  (Frontend)  │
└──────────────┘               └──────────────┘              └──────────────┘
                                      │
                                      │ Webhooks
                                      ▼
                               ┌──────────────┐
                               │   Backend    │
                               │  (Express)   │
                               └──────────────┘
                                      │
                                      │ MongoDB
                                      ▼
                               ┌──────────────┐
                               │  LiveStream  │
                               │    Model     │
                               └──────────────┘

Data Flow:
1. Admin creates stream via backend → Mux API creates live stream
2. Admin configures OBS with RTMP URL + Stream Key
3. OBS sends video to Mux via RTMP
4. Mux transcodes and delivers via HLS
5. Viewer requests playback token from backend (JWT authenticated)
6. Backend validates user access (ticket holder, subscriber, etc.)
7. Backend generates signed Mux playback token
8. Frontend uses token with Mux Player to watch stream
9. Mux webhooks notify backend of stream status changes
10. After stream ends, Mux creates VOD asset for replay
```

## Environment Variables

Add these to your server `.env` file:

```env
# Mux API Credentials (from Mux Dashboard > Settings > API Access Tokens)
MUX_TOKEN_ID=your_mux_token_id
MUX_TOKEN_SECRET=your_mux_token_secret

# Mux Signing Keys (from Mux Dashboard > Settings > Signing Keys)
# Used for generating signed playback tokens
MUX_SIGNING_KEY_ID=your_signing_key_id
MUX_SIGNING_KEY_SECRET=your_base64_encoded_private_key

# Mux Webhook Secret (optional, for webhook signature verification)
MUX_WEBHOOK_SECRET=your_webhook_secret
```

### How to Get Mux Credentials

1. **Create Mux Account**: Go to [mux.com](https://mux.com) and sign up
2. **API Access Tokens**:
   - Navigate to Settings > API Access Tokens
   - Create a new token with "Mux Video" permissions
   - Copy `Token ID` and `Token Secret`
3. **Signing Keys** (for secure playback):
   - Navigate to Settings > Signing Keys
   - Create a new signing key
   - Copy `Key ID` and download the private key
   - Base64 encode the private key: `base64 -i private-key.pem`
   - Use the encoded string as `MUX_SIGNING_KEY_SECRET`

## Installation

### Backend Dependencies

```bash
cd server
npm install @mux/mux-node
```

### Frontend Dependencies

```bash
cd client
npm install @mux/mux-player-react
```

## OBS Studio Configuration

### Step 1: Open OBS Settings
1. Open OBS Studio
2. Go to **Settings** > **Stream**

### Step 2: Configure Stream Settings
- **Service**: Custom
- **Server**: `rtmps://global-live.mux.com:443/app`
- **Stream Key**: (Get from admin panel after creating stream)

### Step 3: Configure Output Settings
Go to **Settings** > **Output** > **Streaming**:

| Setting | Recommended Value |
|---------|-------------------|
| Encoder | x264 or NVENC |
| Rate Control | CBR |
| Bitrate | 4000-6000 kbps |
| Keyframe Interval | 2 seconds |
| CPU Usage Preset | veryfast |
| Profile | high |
| Tune | zerolatency |

### Step 4: Configure Video Settings
Go to **Settings** > **Video**:

| Setting | Recommended Value |
|---------|-------------------|
| Base Resolution | 1920x1080 |
| Output Resolution | 1920x1080 |
| Downscale Filter | Lanczos |
| FPS | 30 |

### Step 5: Configure Audio Settings
Go to **Settings** > **Audio**:

| Setting | Recommended Value |
|---------|-------------------|
| Sample Rate | 48 kHz |
| Channels | Stereo |

### Bitrate Guidelines by Resolution

| Resolution | Bitrate Range | Use Case |
|------------|---------------|----------|
| 720p | 2500-4000 kbps | Standard quality |
| 1080p | 4000-6000 kbps | High quality |
| 1080p60 | 6000-8000 kbps | Sports/Gaming |

## API Endpoints

### Admin Endpoints (Requires Admin Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/livestream/admin/create` | Create new live stream |
| GET | `/api/livestream/admin/streams` | List all streams |
| GET | `/api/livestream/admin/streams/:id` | Get stream details (includes OBS config) |
| POST | `/api/livestream/admin/streams/:id/enable` | Enable stream |
| POST | `/api/livestream/admin/streams/:id/disable` | Disable stream |
| POST | `/api/livestream/admin/streams/:id/reset-key` | Reset stream key |
| DELETE | `/api/livestream/admin/streams/:id` | Delete stream |

### Public/User Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/livestream/active` | Get active/upcoming streams |
| GET | `/api/livestream/streams/:id` | Get public stream info |
| GET | `/api/livestream/streams/:id/playback-token` | Get signed playback token (auth required) |

### Webhook Endpoint

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/livestream/webhook/mux` | Mux webhook handler |

## Create Stream Request Example

```json
POST /api/livestream/admin/create
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "title": "Wrestling Championship 2025",
  "description": "Live coverage of the championship finals",
  "eventId": "optional_event_id",
  "sportsEventId": "optional_sports_event_id",
  "accessType": "ticket_holders",
  "price": 0,
  "scheduledStartTime": "2025-02-15T18:00:00Z",
  "latencyMode": "low"
}
```

### Response

```json
{
  "success": true,
  "message": "Live stream created successfully",
  "data": {
    "id": "stream_id",
    "title": "Wrestling Championship 2025",
    "status": "idle",
    "obsConfig": {
      "rtmpUrl": "rtmps://global-live.mux.com:443/app",
      "streamKey": "your_stream_key",
      "fullUrl": "rtmps://global-live.mux.com:443/app/your_stream_key"
    },
    "obsRecommendedSettings": {
      "encoder": "x264 or NVENC",
      "bitrate": "4000-6000 kbps",
      "resolution": "1920x1080",
      "framerate": "30 fps",
      "keyframeInterval": "2 seconds",
      "profile": "high",
      "tune": "zerolatency"
    }
  }
}
```

## Access Types

| Type | Description |
|------|-------------|
| `public` | Anyone can watch |
| `ticket_holders` | Only users with confirmed booking for linked event |
| `subscribers` | Only subscribed users |
| `private` | Admin-only access |

## Latency Modes

| Mode | Latency | Use Case |
|------|---------|----------|
| `low` | ~5 seconds | Interactive events, sports |
| `reduced` | ~10 seconds | General live events |
| `standard` | ~30 seconds | Maximum quality, non-interactive |

## Mux Webhook Configuration

1. Go to Mux Dashboard > Settings > Webhooks
2. Add webhook URL: `https://your-backend-domain.com/api/livestream/webhook/mux`
3. Select events:
   - `video.live_stream.active`
   - `video.live_stream.idle`
   - `video.live_stream.disabled`
   - `video.asset.ready`

## Security Best Practices

### 1. Never Expose Sensitive Data
- Stream keys are only shown to admin once during creation
- Playback IDs are never sent unsigned to frontend
- All playback requires signed tokens

### 2. Token Expiration
- Signed playback tokens expire after 1 hour
- Frontend automatically refreshes tokens before expiry

### 3. Access Control
- All playback token requests require JWT authentication
- Backend validates user has appropriate access (ticket, subscription, etc.)

### 4. Webhook Verification
- Configure `MUX_WEBHOOK_SECRET` for signature verification
- Verify webhook signatures in production

### 5. Environment Variables
- Never commit `.env` files to version control
- Use different credentials for development/production
- Rotate credentials periodically

## Troubleshooting

### Stream Not Starting
1. Verify OBS is connected (check OBS status bar)
2. Check stream key is correct
3. Verify stream is enabled in admin panel
4. Check Mux dashboard for errors

### Playback Issues
1. Verify user is authenticated
2. Check user has valid ticket/access
3. Verify token hasn't expired
4. Check browser console for errors

### High Latency
1. Use "low" latency mode
2. Reduce OBS bitrate
3. Set keyframe interval to 2 seconds
4. Use "zerolatency" tune in OBS

### VOD Not Available
1. Wait for Mux to process the recording
2. Check webhook is receiving `video.asset.ready` events
3. Verify stream was properly ended (not just disconnected)

## Cost Optimization

### Mux Pricing Factors
- **Encoding**: Per minute of live stream
- **Delivery**: Per GB of video delivered
- **Storage**: Per GB of stored VOD

### Tips to Reduce Costs
1. Use appropriate resolution (don't stream 4K if 1080p suffices)
2. Disable recording if VOD not needed
3. Delete old VOD assets
4. Use lower bitrates for non-premium content

## Frontend Usage

```tsx
import { LiveStreamPlayer } from '@/components/livestream';

// In your page component
<LiveStreamPlayer streamId="your_stream_id" />
```

The component handles:
- Loading states
- Authentication
- Access validation
- Token refresh
- Live/VOD/Offline states
- Error handling

## Files Created

### Backend
- `server/services/muxService.js` - Mux API client
- `server/models/LiveStream.js` - MongoDB model
- `server/controllers/livestreamController.js` - API controllers
- `server/routes/livestream.routes.js` - Express routes

### Frontend
- `client/components/livestream/MuxPlayer.tsx` - Mux Player wrapper
- `client/components/livestream/LiveStreamPlayer.tsx` - Full player with states
- `client/app/livestream/[id]/page.tsx` - Stream viewing page
- `client/app/admin/livestream/page.tsx` - Admin management page
