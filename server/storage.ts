import {
  users,
  workspaces,
  workspaceMembers,
  meetings,
  meetingParticipants,
  transcriptSegments,
  meetingSummaries,
  actionItems,
  meetingTags,
  chatMessages,
  type User,
  type UpsertUser,
  type Workspace,
  type InsertWorkspace,
  type Meeting,
  type InsertMeeting,
  type MeetingParticipant,
  type TranscriptSegment,
  type InsertTranscriptSegment,
  type MeetingSummary,
  type ActionItem,
  type InsertActionItem,
  type MeetingTag,
  type ChatMessage,
  type InsertChatMessage,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, inArray, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Workspace operations
  createWorkspace(workspace: InsertWorkspace): Promise<Workspace>;
  getUserWorkspaces(userId: string): Promise<Workspace[]>;
  getWorkspace(id: number): Promise<Workspace | undefined>;
  addWorkspaceMember(workspaceId: number, userId: string, role?: string): Promise<void>;

  // Meeting operations
  createMeeting(meeting: InsertMeeting): Promise<Meeting>;
  getMeeting(id: number): Promise<Meeting | undefined>;
  getMeetingWithDetails(id: number): Promise<{
    meeting: Meeting;
    participants: MeetingParticipant[];
    transcriptSegments: TranscriptSegment[];
    summary: MeetingSummary | null;
    actionItems: ActionItem[];
    tags: MeetingTag[];
  } | undefined>;
  getWorkspaceMeetings(workspaceId: number, limit?: number): Promise<Meeting[]>;
  updateMeeting(id: number, updates: Partial<Meeting>): Promise<Meeting>;
  deleteMeeting(id: number): Promise<void>;

  // Transcript operations
  addTranscriptSegment(segment: InsertTranscriptSegment): Promise<TranscriptSegment>;
  getMeetingTranscript(meetingId: number): Promise<TranscriptSegment[]>;

  // Summary operations
  createMeetingSummary(meetingId: number, summary: string, keyTakeaways: string[], decisions: string[]): Promise<MeetingSummary>;
  getMeetingSummary(meetingId: number): Promise<MeetingSummary | null>;

  // Action item operations
  createActionItem(actionItem: InsertActionItem): Promise<ActionItem>;
  getActionItems(meetingId: number): Promise<ActionItem[]>;
  getWorkspaceActionItems(workspaceId: number): Promise<ActionItem[]>;
  updateActionItem(id: number, updates: Partial<ActionItem>): Promise<ActionItem>;

  // Tag operations
  addMeetingTag(meetingId: number, tag: string): Promise<void>;
  getMeetingTags(meetingId: number): Promise<MeetingTag[]>;

  // Chat operations
  createChatMessage(chatMessage: InsertChatMessage): Promise<ChatMessage>;
  getWorkspaceChatHistory(workspaceId: number, limit?: number): Promise<ChatMessage[]>;

  // Analytics
  getWorkspaceStats(workspaceId: number): Promise<{
    weeklyMeetings: number;
    totalActionItems: number;
    pendingActionItems: number;
    memberCount: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Workspace operations
  async createWorkspace(workspace: InsertWorkspace): Promise<Workspace> {
    const [newWorkspace] = await db.insert(workspaces).values(workspace).returning();
    
    // Add the owner as a member
    await this.addWorkspaceMember(newWorkspace.id, workspace.ownerId, "owner");
    
    return newWorkspace;
  }

  async getUserWorkspaces(userId: string): Promise<Workspace[]> {
    const userWorkspaces = await db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        ownerId: workspaces.ownerId,
        createdAt: workspaces.createdAt,
        updatedAt: workspaces.updatedAt,
      })
      .from(workspaces)
      .innerJoin(workspaceMembers, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(eq(workspaceMembers.userId, userId));
    
    return userWorkspaces;
  }

  async getWorkspace(id: number): Promise<Workspace | undefined> {
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id));
    return workspace;
  }

  async addWorkspaceMember(workspaceId: number, userId: string, role: string = "member"): Promise<void> {
    await db.insert(workspaceMembers).values({
      workspaceId,
      userId,
      role,
    });
  }

  // Meeting operations
  async createMeeting(meeting: InsertMeeting): Promise<Meeting> {
    const [newMeeting] = await db.insert(meetings).values(meeting).returning();
    return newMeeting;
  }

  async getMeeting(id: number): Promise<Meeting | undefined> {
    const [meeting] = await db.select().from(meetings).where(eq(meetings.id, id));
    return meeting;
  }

  async getMeetingWithDetails(id: number) {
    const meeting = await this.getMeeting(id);
    if (!meeting) return undefined;

    const [participants, meetingTranscript, summary, actionItems, tags] = await Promise.all([
      db.select().from(meetingParticipants).where(eq(meetingParticipants.meetingId, id)),
      db.select().from(transcriptSegments).where(eq(transcriptSegments.meetingId, id)).orderBy(transcriptSegments.timestamp),
      this.getMeetingSummary(id),
      this.getActionItems(id),
      this.getMeetingTags(id),
    ]);

    return {
      meeting,
      participants,
      transcriptSegments: meetingTranscript,
      summary,
      actionItems,
      tags,
    };
  }

  async getWorkspaceMeetings(workspaceId: number, limit: number = 10): Promise<Meeting[]> {
    const meetingList = await db
      .select()
      .from(meetings)
      .where(eq(meetings.workspaceId, workspaceId))
      .orderBy(desc(meetings.createdAt))
      .limit(limit);
    
    return meetingList;
  }

  async updateMeeting(id: number, updates: Partial<Meeting>): Promise<Meeting> {
    const [updatedMeeting] = await db
      .update(meetings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(meetings.id, id))
      .returning();
    
    return updatedMeeting;
  }

  async deleteMeeting(id: number): Promise<void> {
    await db.delete(meetings).where(eq(meetings.id, id));
  }

  // Transcript operations
  async addTranscriptSegment(segment: InsertTranscriptSegment): Promise<TranscriptSegment> {
    const [newSegment] = await db.insert(transcriptSegments).values(segment).returning();
    return newSegment;
  }

  async getMeetingTranscript(meetingId: number): Promise<TranscriptSegment[]> {
    const transcript = await db
      .select()
      .from(transcriptSegments)
      .where(eq(transcriptSegments.meetingId, meetingId))
      .orderBy(transcriptSegments.timestamp);
    
    return transcript;
  }

  // Summary operations
  async createMeetingSummary(
    meetingId: number,
    summary: string,
    keyTakeaways: string[],
    decisions: string[]
  ): Promise<MeetingSummary> {
    const [newSummary] = await db
      .insert(meetingSummaries)
      .values({
        meetingId,
        summary,
        keyTakeaways,
        decisions,
      })
      .returning();
    
    return newSummary;
  }

  async getMeetingSummary(meetingId: number): Promise<MeetingSummary | null> {
    const [summary] = await db
      .select()
      .from(meetingSummaries)
      .where(eq(meetingSummaries.meetingId, meetingId));
    
    return summary || null;
  }

  // Action item operations
  async createActionItem(actionItem: InsertActionItem): Promise<ActionItem> {
    const [newActionItem] = await db.insert(actionItems).values(actionItem).returning();
    return newActionItem;
  }

  async getActionItems(meetingId: number): Promise<ActionItem[]> {
    const items = await db
      .select()
      .from(actionItems)
      .where(eq(actionItems.meetingId, meetingId))
      .orderBy(actionItems.createdAt);
    
    return items;
  }

  async getWorkspaceActionItems(workspaceId: number): Promise<ActionItem[]> {
    const items = await db
      .select({
        id: actionItems.id,
        meetingId: actionItems.meetingId,
        task: actionItems.task,
        assigneeId: actionItems.assigneeId,
        assigneeName: actionItems.assigneeName,
        dueDate: actionItems.dueDate,
        priority: actionItems.priority,
        status: actionItems.status,
        createdAt: actionItems.createdAt,
        updatedAt: actionItems.updatedAt,
      })
      .from(actionItems)
      .innerJoin(meetings, eq(actionItems.meetingId, meetings.id))
      .where(eq(meetings.workspaceId, workspaceId))
      .orderBy(desc(actionItems.createdAt));
    
    return items;
  }

  async updateActionItem(id: number, updates: Partial<ActionItem>): Promise<ActionItem> {
    const [updatedItem] = await db
      .update(actionItems)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(actionItems.id, id))
      .returning();
    
    return updatedItem;
  }

  // Tag operations
  async addMeetingTag(meetingId: number, tag: string): Promise<void> {
    await db.insert(meetingTags).values({ meetingId, tag });
  }

  async getMeetingTags(meetingId: number): Promise<MeetingTag[]> {
    const tags = await db
      .select()
      .from(meetingTags)
      .where(eq(meetingTags.meetingId, meetingId));
    
    return tags;
  }

  // Chat operations
  async createChatMessage(chatMessage: InsertChatMessage): Promise<ChatMessage> {
    const [newMessage] = await db.insert(chatMessages).values(chatMessage).returning();
    return newMessage;
  }

  async getWorkspaceChatHistory(workspaceId: number, limit: number = 50): Promise<ChatMessage[]> {
    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.workspaceId, workspaceId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
    
    return messages.reverse(); // Return in chronological order
  }

  // Analytics
  async getWorkspaceStats(workspaceId: number) {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const [weeklyMeetingsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(meetings)
      .where(
        and(
          eq(meetings.workspaceId, workspaceId),
          sql`${meetings.createdAt} >= ${oneWeekAgo}`
        )
      );

    const [totalActionItemsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(actionItems)
      .innerJoin(meetings, eq(actionItems.meetingId, meetings.id))
      .where(eq(meetings.workspaceId, workspaceId));

    const [pendingActionItemsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(actionItems)
      .innerJoin(meetings, eq(actionItems.meetingId, meetings.id))
      .where(
        and(
          eq(meetings.workspaceId, workspaceId),
          eq(actionItems.status, "pending")
        )
      );

    const [memberCountResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, workspaceId));

    return {
      weeklyMeetings: weeklyMeetingsResult?.count || 0,
      totalActionItems: totalActionItemsResult?.count || 0,
      pendingActionItems: pendingActionItemsResult?.count || 0,
      memberCount: memberCountResult?.count || 0,
    };
  }
}

export const storage = new DatabaseStorage();
