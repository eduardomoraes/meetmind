# Meeting Productivity Application

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

> AI-powered meeting productivity application that transforms collaboration through advanced transcription, intelligent assistance, and comprehensive meeting analysis.

## Features

- **Complete Conversation Recording**: Capture entire meetings with high-quality audio processing
- **AI-Powered Transcription**: Leverage OpenAI Whisper for accurate speech-to-text conversion
- **Intelligent Meeting Summaries**: Generate comprehensive summaries with key takeaways and action items
- **Context-Aware Chat**: Ask questions about meeting content with AI-powered responses
- **Meeting Analytics**: Track meeting duration, word count, and participant engagement
- **Workspace Management**: Organize meetings by teams and projects
- **Real-time Processing**: Complete audio processing after meeting ends for optimal accuracy

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Wouter** for lightweight routing
- **TanStack Query** for efficient data fetching
- **Tailwind CSS** with shadcn/ui components
- **Framer Motion** for smooth animations

### Backend
- **Express.js** with TypeScript
- **WebSocket** for real-time communication
- **PostgreSQL** with Drizzle ORM
- **Replit Auth** for secure authentication
- **OpenAI API** (Whisper + GPT-4o)

### Infrastructure
- **Replit** hosting platform
- **Neon** PostgreSQL database
- **Vite** for fast development builds

## Getting Started

### Prerequisites

- Node.js 18.0.0 or higher
- PostgreSQL database
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd meeting-productivity-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Database
DATABASE_URL=your_postgresql_connection_string

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# These are automatically configured in Replit
PGHOST=your_db_host
PGUSER=your_db_user
PGPASSWORD=your_db_password
PGDATABASE=your_db_name
PGPORT=your_db_port
```

4. Initialize the database:
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Usage

### Recording a Meeting

1. **Start Recording**: Click the "Start Recording" button to begin capturing audio
2. **Speak Naturally**: The application records complete conversations for optimal transcription
3. **Stop Recording**: Click "Stop Recording" when finished
4. **Processing**: The system processes the complete audio and generates transcripts
5. **View Results**: Access transcripts, summaries, and action items in the meeting details

### Meeting Management

- **Workspaces**: Organize meetings by team or project
- **Meeting History**: View all past meetings with summaries
- **Action Items**: Track tasks and assignments from meetings
- **Analytics**: Monitor meeting statistics and productivity metrics

### AI Chat

- Ask questions about meeting content
- Get contextual responses based on transcripts
- Clarify action items and decisions

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Application pages
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utility functions
├── server/                # Express backend
│   ├── services/          # Business logic
│   ├── routes.ts          # API routes
│   └── db.ts             # Database configuration
├── shared/                # Shared types and schemas
│   └── schema.ts         # Database schema
└── README.md             # This file
```

## API Endpoints

### Authentication
- `GET /api/auth/user` - Get current user
- `GET /api/login` - Initiate login
- `GET /api/callback` - Handle auth callback

### Meetings
- `POST /api/meetings/start` - Start a new meeting
- `POST /api/meetings/:id/stop` - Stop a meeting
- `GET /api/meetings/:id` - Get meeting details
- `GET /api/workspaces/:id/meetings` - List workspace meetings

### Workspaces
- `GET /api/workspaces` - List user workspaces
- `GET /api/workspaces/:id/stats` - Get workspace statistics
- `GET /api/workspaces/:id/action-items` - Get workspace action items

### Chat
- `POST /api/chat` - Send chat message
- `GET /api/workspaces/:id/chat` - Get chat history

## Database Schema

The application uses PostgreSQL with the following key tables:

- `users` - User accounts and profiles
- `workspaces` - Team/project organization
- `meetings` - Meeting records and metadata
- `transcript_segments` - Audio transcription data
- `meeting_summaries` - AI-generated summaries
- `action_items` - Tasks and assignments
- `chat_messages` - AI chat interactions

## Development

### Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open database management UI

### Code Style

- TypeScript with strict type checking
- ESLint for code linting
- Prettier for code formatting
- Conventional commits for version control

### Testing

Run tests with:
```bash
npm test
```

## Deployment

The application is designed for Replit deployment:

1. Push changes to your repository
2. Configure environment variables in Replit
3. Use the "Deploy" button in Replit interface
4. Application will be available at `https://your-app.replit.app`

## Audio Processing

The application uses a complete conversation processing approach:

1. **Recording**: Audio is captured using MediaRecorder API in MP4 format
2. **Accumulation**: Complete audio is stored until recording stops
3. **Processing**: Full conversation is sent to OpenAI Whisper for transcription
4. **Enhancement**: AI generates summaries, action items, and insights
5. **Storage**: Results are stored in PostgreSQL for future reference

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please contact eduardodmoraes@gmail.com or open an issue in the repository.

## Acknowledgments

- OpenAI for Whisper and GPT-4o APIs
- Replit for hosting and development platform
- The open-source community for various packages and tools

---

Built with ❤️ using Replit