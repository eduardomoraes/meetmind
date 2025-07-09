# Meeting Productivity Application

## Project Overview
AI-powered meeting productivity application that transforms collaboration through advanced transcription, intelligent assistance, and comprehensive meeting analysis.

## User Preferences
- Process complete conversation after meeting ends (not real-time chunks)
- Store full transcript and provide comprehensive summary
- Enable chat functionality with conversation context

## Recent Changes
- **2025-07-08**: Created comprehensive README.md file with best practices
- **2025-07-02**: Fixed WebSocket timing issue preventing complete audio processing
- **2025-06-23**: Modified audio processing from real-time chunks to full conversation analysis
- **2025-06-23**: Implemented multi-format audio transcription with fallback system
- **2025-06-23**: Enhanced OpenAI integration for post-meeting processing

## Project Architecture
**Frontend**: React with TypeScript, Wouter routing, TanStack Query
**Backend**: Express.js with WebSocket support
**Database**: PostgreSQL with Drizzle ORM
**AI Services**: OpenAI Whisper for transcription, GPT-4o for summaries
**Audio**: MediaRecorder API with format optimization

## Key Features
- Complete conversation recording and storage
- Post-meeting transcript generation
- AI-powered meeting summaries with action items
- Context-aware chat functionality
- Meeting history and analytics