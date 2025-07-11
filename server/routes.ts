import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { meetingService } from "./services/meeting";
import { answerMeetingQuery } from "./services/openai";
import { 
  insertWorkspaceSchema,
  insertMeetingSchema,
  insertActionItemSchema,
  insertChatMessageSchema,
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Workspace routes
  app.post('/api/workspaces', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const workspaceData = insertWorkspaceSchema.parse({
        ...req.body,
        ownerId: userId,
      });

      const workspace = await storage.createWorkspace(workspaceData);
      res.json(workspace);
    } catch (error) {
      console.error("Error creating workspace:", error);
      res.status(500).json({ message: "Failed to create workspace" });
    }
  });

  app.get('/api/workspaces', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const workspaces = await storage.getUserWorkspaces(userId);
      res.json(workspaces);
    } catch (error) {
      console.error("Error fetching workspaces:", error);
      res.status(500).json({ message: "Failed to fetch workspaces" });
    }
  });

  app.get('/api/workspaces/:id', isAuthenticated, async (req, res) => {
    try {
      const workspaceId = parseInt(req.params.id);
      const workspace = await storage.getWorkspace(workspaceId);
      
      if (!workspace) {
        return res.status(404).json({ message: "Workspace not found" });
      }

      res.json(workspace);
    } catch (error) {
      console.error("Error fetching workspace:", error);
      res.status(500).json({ message: "Failed to fetch workspace" });
    }
  });

  app.get('/api/workspaces/:id/stats', isAuthenticated, async (req, res) => {
    try {
      const workspaceId = parseInt(req.params.id);
      const stats = await storage.getWorkspaceStats(workspaceId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching workspace stats:", error);
      res.status(500).json({ message: "Failed to fetch workspace stats" });
    }
  });

  // Meeting routes
  app.post('/api/meetings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const meetingData = insertMeetingSchema.parse({
        ...req.body,
        createdBy: userId,
      });

      const meeting = await storage.createMeeting(meetingData);
      res.json(meeting);
    } catch (error) {
      console.error("Error creating meeting:", error);
      res.status(500).json({ message: "Failed to create meeting" });
    }
  });

  app.post('/api/meetings/start', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { workspaceId, title } = req.body;

      if (!workspaceId || !title) {
        return res.status(400).json({ message: "workspaceId and title are required" });
      }

      const meeting = await meetingService.startMeeting(workspaceId, userId, title);
      res.json(meeting);
    } catch (error) {
      console.error("Error starting meeting:", error);
      res.status(500).json({ message: "Failed to start meeting" });
    }
  });

  app.post('/api/meetings/:id/stop', isAuthenticated, async (req, res) => {
    try {
      const meetingId = parseInt(req.params.id);
      await meetingService.stopMeeting(meetingId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error stopping meeting:", error);
      res.status(500).json({ message: "Failed to stop meeting" });
    }
  });

  app.get('/api/meetings/:id', isAuthenticated, async (req, res) => {
    try {
      const meetingId = parseInt(req.params.id);
      const meetingData = await storage.getMeetingWithDetails(meetingId);
      
      if (!meetingData) {
        return res.status(404).json({ message: "Meeting not found" });
      }

      res.json(meetingData);
    } catch (error) {
      console.error("Error fetching meeting:", error);
      res.status(500).json({ message: "Failed to fetch meeting" });
    }
  });

  app.get('/api/workspaces/:id/meetings', isAuthenticated, async (req, res) => {
    try {
      const workspaceId = parseInt(req.params.id);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      console.log(`Fetching meetings for workspace ${workspaceId} with limit ${limit}`);
      const meetings = await storage.getWorkspaceMeetings(workspaceId, limit);
      console.log(`Found ${meetings.length} meetings`, meetings.map(m => ({ id: m.id, title: m.title, hasSummary: !!m.summary })));
      res.json(meetings);
    } catch (error) {
      console.error("Error fetching meetings:", error);
      res.status(500).json({ message: "Failed to fetch meetings" });
    }
  });

  app.delete('/api/meetings/:id', isAuthenticated, async (req, res) => {
    try {
      const meetingId = parseInt(req.params.id);
      await storage.deleteMeeting(meetingId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting meeting:", error);
      res.status(500).json({ message: "Failed to delete meeting" });
    }
  });

  // Action item routes
  app.get('/api/workspaces/:id/action-items', isAuthenticated, async (req, res) => {
    try {
      const workspaceId = parseInt(req.params.id);
      const actionItems = await storage.getWorkspaceActionItems(workspaceId);
      res.json(actionItems);
    } catch (error) {
      console.error("Error fetching action items:", error);
      res.status(500).json({ message: "Failed to fetch action items" });
    }
  });

  app.post('/api/action-items', isAuthenticated, async (req, res) => {
    try {
      const actionItemData = insertActionItemSchema.parse(req.body);
      const actionItem = await storage.createActionItem(actionItemData);
      res.json(actionItem);
    } catch (error) {
      console.error("Error creating action item:", error);
      res.status(500).json({ message: "Failed to create action item" });
    }
  });

  app.patch('/api/action-items/:id', isAuthenticated, async (req, res) => {
    try {
      const actionItemId = parseInt(req.params.id);
      const updates = req.body;
      const actionItem = await storage.updateActionItem(actionItemId, updates);
      res.json(actionItem);
    } catch (error) {
      console.error("Error updating action item:", error);
      res.status(500).json({ message: "Failed to update action item" });
    }
  });

  // AI Chat routes
  app.post('/api/chat', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { workspaceId, message, meetingIds } = req.body;

      if (!workspaceId || !message) {
        return res.status(400).json({ message: "workspaceId and message are required" });
      }

      // Get context from meetings
      const context = meetingIds && meetingIds.length > 0 
        ? await meetingService.getMeetingContext(meetingIds)
        : await meetingService.getMeetingContext(
            // Get recent meetings if no specific meetings provided
            (await storage.getWorkspaceMeetings(workspaceId, 5)).map(m => m.id)
          );

      const response = await answerMeetingQuery(message, context);

      // Save the chat message - always save even if AI response indicates an error
      const chatMessage = await storage.createChatMessage({
        workspaceId,
        userId,
        message,
        response,
        meetingIds: meetingIds || null,
        model: "gpt-4o",
      });

      res.json({
        message: chatMessage.message,
        response: chatMessage.response,
        id: chatMessage.id,
      });
    } catch (error) {
      console.error("Error processing chat:", error);
      res.status(500).json({ message: "Failed to process chat message" });
    }
  });

  app.get('/api/workspaces/:id/chat-history', isAuthenticated, async (req, res) => {
    try {
      const workspaceId = parseInt(req.params.id);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const chatHistory = await storage.getWorkspaceChatHistory(workspaceId, limit);
      res.json(chatHistory);
    } catch (error) {
      console.error("Error fetching chat history:", error);
      res.status(500).json({ message: "Failed to fetch chat history" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  // WebSocket server for real-time transcription
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req) => {
    console.log('WebSocket client connected');
    
    let currentMeetingId: number | null = null;
    let audioChunks: Buffer[] = [];
    let lastProcessTime = Date.now();

    ws.on('message', async (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        console.log(`WebSocket received message type: ${data.type}, meetingId: ${data.meetingId || 'none'}, currentMeetingId: ${currentMeetingId}`);

        if (data.type === 'start-meeting') {
          currentMeetingId = data.meetingId;
          console.log(`Started real-time transcription for meeting ${currentMeetingId}`);
          
          ws.send(JSON.stringify({
            type: 'meeting-started',
            meetingId: currentMeetingId,
          }));
        } else if (data.type === 'complete-audio' && currentMeetingId) {
          // Process complete conversation audio after recording ends
          const audioBuffer = Buffer.from(data.audio, 'base64');
          console.log(`Received complete audio: ${audioBuffer.length} bytes for meeting ${currentMeetingId}`);
          console.log(`Audio buffer hex preview: ${audioBuffer.slice(0, 32).toString('hex')}`);
          
          if (audioBuffer.length > 1000) { // Lower threshold for testing
            try {
              console.log(`Starting processing of ${audioBuffer.length} bytes for meeting ${currentMeetingId}`);
              const text = await meetingService.processCompleteAudio(currentMeetingId, audioBuffer);
              console.log(`Transcription completed. Result length: ${text.length} characters`);
              
              if (text.trim()) {
                console.log(`Sending successful transcript for meeting ${currentMeetingId}: "${text.slice(0, 100)}..."`);
                ws.send(JSON.stringify({
                  type: 'complete-transcript',
                  meetingId: currentMeetingId,
                  text,
                  timestamp: new Date().toISOString(),
                }));
              } else {
                console.log('Transcription returned empty text - sending error response');
                ws.send(JSON.stringify({
                  type: 'transcript-error',
                  meetingId: currentMeetingId,
                  error: 'No speech detected in audio recording',
                }));
              }
            } catch (error: any) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              console.error(`Complete audio processing failed for meeting ${currentMeetingId}:`, error);
              console.error(`Error stack:`, error.stack);
              ws.send(JSON.stringify({
                type: 'transcript-error',
                meetingId: currentMeetingId,
                error: `Transcription failed: ${errorMessage}`,
              }));
            }
          } else {
            console.log(`Audio too small for processing: ${audioBuffer.length} bytes (minimum: 1KB)`);
            ws.send(JSON.stringify({
              type: 'transcript-error',
              meetingId: currentMeetingId,
              error: 'Recording too short - please record for at least 5 seconds',
            }));
          }
        } else if (data.type === 'stop-meeting' && currentMeetingId) {
          console.log(`Stopped real-time transcription for meeting ${currentMeetingId}`);
          currentMeetingId = null;
          
          ws.send(JSON.stringify({
            type: 'meeting-stopped',
          }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
        }));
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  return httpServer;
}
