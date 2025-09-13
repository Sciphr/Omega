# Social Account Linking Setup Guide

This guide explains how to set up social account linking for Discord, Riot Games, and Steam.

## 🔑 Required Environment Variables

Add these to your `.env.local` file:

```env
# Discord OAuth
DISCORD_CLIENT_ID=your_discord_app_client_id
DISCORD_CLIENT_SECRET=your_discord_app_client_secret

# Riot Games OAuth
RIOT_CLIENT_ID=your_riot_client_id
RIOT_CLIENT_SECRET=your_riot_client_secret

# Steam API
STEAM_API_KEY=your_steam_api_key

# Your app URL (for OAuth redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🎮 Platform Setup Instructions

### Discord
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to OAuth2 section
4. Add redirect URI: `http://localhost:3000/api/auth/link/discord/callback`
5. Copy Client ID and Client Secret

### Riot Games
1. Go to [Riot Developer Portal](https://developer.riotgames.com/)
2. Create a new application
3. Set redirect URI: `http://localhost:3000/api/auth/link/riot/callback`
4. Copy Client ID and Client Secret

### Steam
1. Go to [Steam Web API Key](https://steamcommunity.com/dev/apikey)
2. Register for an API key with your domain
3. Copy the API key

## 🗄️ Database Setup

Run these SQL files in your Supabase SQL Editor:

1. `database/social-account-linking.sql` - Creates the linking tables
2. `database/auto-complete-tournament.sql` - Tournament completion (if not done)

## 🚀 Features

### For Users:
- **Link Gaming Accounts**: Connect Discord, Riot, Steam accounts
- **Public/Private Toggle**: Control who can see your linked accounts
- **Verification Status**: See which accounts are verified
- **Easy Management**: Link/unlink accounts with OAuth flow

### For Discord Bot Integration:
- **User Identification**: Match Discord users to tournament accounts
- **Automatic Notifications**: Send match updates to linked Discord users
- **Role Management**: Assign tournament-based roles
- **Commands**: Allow Discord commands to interact with tournaments

### For Tournament Features:
- **Auto-populate Usernames**: Pull gamertags from linked accounts
- **Skill Verification**: Show ranks/levels from game platforms
- **Social Features**: Display gaming profiles on user pages

## 🔒 Security Notes

- OAuth tokens are stored securely in the database
- Users control visibility of their linked accounts
- Unique constraints prevent account sharing
- Session-based linking with CSRF protection

## 🎯 Next Steps

1. **Run the database setup SQL**
2. **Add environment variables**
3. **Test linking flow** on `/profile` page
4. **Set up Discord bot** (separate setup guide)

## 📝 API Endpoints

- `GET /api/user/linked-accounts` - Get user's linked accounts
- `PUT /api/user/linked-accounts` - Update account settings
- `DELETE /api/user/linked-accounts?id=X` - Unlink account
- `GET /api/auth/link/[platform]` - Start OAuth flow
- `GET /api/auth/link/[platform]/callback` - OAuth callback

The linking system is now ready for use and Discord bot integration!