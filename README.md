# Omega - Tournament Bracket Generator

A modern, full-featured tournament management system built with Next.js 14, Supabase, and Tailwind CSS. Create and manage professional tournament brackets with real-time updates, game-specific features, and comprehensive participant management.

## 🎯 Features

### Core Tournament System

- **Single & Double Elimination**: Support for both tournament formats
- **Up to 128 Participants**: Scalable tournament system
- **Shareable URLs**: Each tournament gets a unique, shareable link
- **Password Protection**: Optional private tournaments
- **Anonymous & Registered Users**: Flexible participation options

### Game Templates

Pre-configured setups for popular competitive games:

- **League of Legends**: Draft/ban system, 5v5 teams
- **Super Smash Bros**: Stage selection, individual play
- **Counter-Strike 2**: Map pools, team-based matches
- **Valorant**: Agent selection, tactical gameplay

### Real-time Features

- **Live Bracket Updates**: Instant synchronization across all viewers
- **Draft/Ban Interface**: Turn-based pick/ban system with timers
- **Live Score Reporting**: Real-time score updates with confirmations
- **WebSocket Connections**: Powered by Supabase Realtime

### Tournament Management

- **Creation Wizard**: Step-by-step tournament setup
- **Interactive Brackets**: Zoom, pan, and navigate large tournaments
- **Admin Dashboard**: Complete tournament control panel
- **Player Management**: Add, remove, and organize participants
- **Match Scheduling**: Automated bracket generation and progression
- **Dispute Resolution**: Admin override capabilities

### User Experience

- **Modern UI**: Clean, responsive design with Tailwind CSS
- **Mobile-First**: Fully responsive across all devices
- **Discovery Page**: Browse and search active tournaments
- **Player Profiles**: Game-specific rankings and statistics
- **Social Sharing**: Easy tournament promotion

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React 19
- **Styling**: Tailwind CSS v4, Shadcn/ui components
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Supabase Realtime subscriptions
- **State Management**: Zustand
- **Data Fetching**: React Query (@tanstack/react-query)
- **Validation**: Zod schemas with React Hook Form
- **Authentication**: Supabase Auth
- **Icons**: Lucide React

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Supabase account
- Git

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd omega
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**

   - Copy `.env.example` to `.env.local`
   - Update with your Supabase credentials:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   NEXTAUTH_SECRET=your_random_secret_key_here
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Database Setup**

   - Run the SQL schema in your Supabase SQL editor:

   ```bash
   # Copy content from database/schema.sql and execute in Supabase
   ```

5. **Start Development Server**

   ```bash
   npm run dev
   ```

   Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 📁 Project Structure

```
omega/
├── app/                    # Next.js App Router pages
│   ├── create/            # Tournament creation page
│   ├── tournament/[id]/   # Tournament detail pages
│   ├── tournaments/       # Tournament discovery
│   ├── login/            # Authentication pages
│   └── register/
├── components/            # React components
│   ├── ui/               # Shadcn/ui components
│   ├── tournament-wizard.jsx
│   ├── bracket-visualization.jsx
│   ├── tournament-management.jsx
│   └── navigation.jsx
├── lib/                   # Utility libraries
│   ├── supabase.js       # Supabase client setup
│   ├── types.js          # TypeScript-like type definitions
│   ├── validations.js    # Zod validation schemas
│   ├── bracket-utils.js  # Tournament logic
│   ├── database.js       # Database service layer
│   └── utils.js          # General utilities
├── stores/               # Zustand state stores
│   ├── tournament-store.js
│   └── auth-store.js
├── database/             # Database schema and migrations
│   └── schema.sql
└── public/              # Static assets
```

## 🎮 Usage

### Creating a Tournament

1. **Navigate to Create Tournament**

   - Click "Create Tournament" from the homepage or navigation

2. **Tournament Setup Wizard**

   - **Basic Info**: Name, description, organizer details
   - **Game & Format**: Choose game template and tournament format
   - **Participants**: Set capacity, participation rules, seeding method
   - **Settings**: Configure rules, prizes, match formats

3. **Participant Management**

   - Players join via shareable URL
   - Admin can manually add/remove participants
   - Support for both individual and team tournaments

4. **Tournament Execution**
   - Start tournament when ready (minimum 4 participants)
   - Automatic bracket generation and match creation
   - Real-time score reporting and bracket progression

### Managing Tournaments

- **Admin Dashboard**: Complete control panel for tournament creators
- **Participant Management**: Add, remove, or modify participants
- **Match Management**: Reset matches, resolve disputes
- **Settings Control**: Update tournament rules and configuration

### Real-time Features

- **Live Updates**: All changes sync instantly across viewers
- **Draft/Ban System**: For games that support pick/ban phases
- **Score Reporting**: Players can report match results
- **Bracket Progression**: Automatic advancement to next rounds

## 🔧 Configuration

### Game Templates

Add new games by updating `lib/types.js`:

```javascript
export const GAME_TEMPLATES = {
  YOUR_GAME: {
    id: "your_game",
    name: "Your Game",
    defaultFormat: MATCH_FORMAT.BO1,
    hasDraftBan: false,
    teamSize: 1,
    settings: {
      // Game-specific settings
    },
  },
};
```

### Tournament Formats

Currently supported formats:

- Single Elimination
- Double Elimination (with loser bracket)

### Match Formats

- Best of 1 (BO1)
- Best of 3 (BO3)
- Best of 5 (BO5)

## 🔒 Security Features

- **Row Level Security**: Supabase RLS policies protect data
- **Password Protection**: Optional tournament passwords
- **User Authentication**: Supabase Auth integration
- **Input Validation**: Zod schemas prevent malicious input
- **Admin Permissions**: Role-based tournament management

## 📊 Database Schema

The application uses a comprehensive PostgreSQL schema:

- **tournaments**: Main tournament data and settings
- **participants**: Individual or team participants
- **teams**: Team management for team-based tournaments
- **matches**: Individual match data and results
- **match_events**: Draft/ban events and match history
- **users**: User accounts and profiles
- **tournament_invitations**: Team invitation system

## 🌐 Deployment

### Vercel (Recommended)

1. **Deploy to Vercel**

   ```bash
   npm run build
   vercel --prod
   ```

2. **Environment Variables**

   - Configure all environment variables in Vercel dashboard
   - Update `NEXT_PUBLIC_APP_URL` to your production URL

3. **Database**
   - Supabase handles database hosting
   - Run schema migrations in production Supabase project

### Other Platforms

The application can be deployed to any platform supporting Next.js:

- Netlify
- Railway
- AWS Amplify
- Self-hosted with Docker

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔮 Roadmap

### Phase 1 (Current)

- ✅ Basic tournament creation and management
- ✅ Single/double elimination brackets
- ✅ Real-time updates
- ✅ Game templates
- ✅ User authentication

### Phase 2 (Planned)

- [ ] Swiss system tournaments
- [ ] Round-robin format
- [ ] Advanced scheduling system
- [ ] Tournament streaming integration
- [ ] Mobile app (React Native)

### Phase 3 (Future)

- [ ] Tournament analytics and statistics
- [ ] Payment integration for entry fees
- [ ] API for third-party integrations
- [ ] Multi-language support
- [ ] Advanced admin tools

## 💬 Support

For questions, issues, or feature requests:

- Open an issue on GitHub
- Join our Discord community
- Check the documentation wiki

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Supabase](https://supabase.com/) - Backend as a Service
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Shadcn/ui](https://ui.shadcn.com/) - Component library
- [Lucide](https://lucide.dev/) - Icon library
