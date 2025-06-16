import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Workspaces for team collaboration
export const workspaces = pgTable("workspaces", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Workspace members
export const workspaceMembers = pgTable("workspace_members", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => workspaces.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: varchar("role").notNull().default("member"), // owner, admin, member
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Meetings
export const meetings = pgTable("meetings", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  workspaceId: integer("workspace_id").notNull().references(() => workspaces.id),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  status: varchar("status").notNull().default("scheduled"), // scheduled, recording, completed
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // in seconds
  participantCount: integer("participant_count").default(0),
  wordCount: integer("word_count").default(0),
  audioUrl: varchar("audio_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Meeting participants
export const meetingParticipants = pgTable("meeting_participants", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").notNull().references(() => meetings.id),
  userId: varchar("user_id").references(() => users.id),
  name: varchar("name").notNull(), // for non-registered participants
  email: varchar("email"),
  avatar: varchar("avatar"),
  role: varchar("role"),
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Transcript segments
export const transcriptSegments = pgTable("transcript_segments", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").notNull().references(() => meetings.id),
  speakerName: varchar("speaker_name").notNull(),
  speakerAvatar: varchar("speaker_avatar"),
  text: text("text").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  confidence: integer("confidence"), // 0-100
  startTime: integer("start_time"), // seconds from meeting start
  endTime: integer("end_time"), // seconds from meeting start
  createdAt: timestamp("created_at").defaultNow(),
});

// AI-generated meeting summaries
export const meetingSummaries = pgTable("meeting_summaries", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").notNull().references(() => meetings.id),
  summary: text("summary").notNull(),
  keyTakeaways: jsonb("key_takeaways").notNull(), // array of strings
  decisions: jsonb("decisions").notNull(), // array of strings
  createdAt: timestamp("created_at").defaultNow(),
});

// Action items
export const actionItems = pgTable("action_items", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").notNull().references(() => meetings.id),
  task: text("task").notNull(),
  assigneeId: varchar("assignee_id").references(() => users.id),
  assigneeName: varchar("assignee_name").notNull(),
  dueDate: timestamp("due_date"),
  priority: varchar("priority").notNull().default("medium"), // high, medium, low
  status: varchar("status").notNull().default("pending"), // pending, completed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Meeting tags
export const meetingTags = pgTable("meeting_tags", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").notNull().references(() => meetings.id),
  tag: varchar("tag").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// AI chat messages
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => workspaces.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  message: text("message").notNull(),
  response: text("response").notNull(),
  meetingIds: jsonb("meeting_ids"), // array of meeting IDs queried
  model: varchar("model").notNull().default("gpt-4o"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  ownedWorkspaces: many(workspaces),
  workspaceMemberships: many(workspaceMembers),
  createdMeetings: many(meetings),
  meetingParticipations: many(meetingParticipants),
  assignedActionItems: many(actionItems),
  chatMessages: many(chatMessages),
}));

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(users, {
    fields: [workspaces.ownerId],
    references: [users.id],
  }),
  members: many(workspaceMembers),
  meetings: many(meetings),
  chatMessages: many(chatMessages),
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceMembers.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [workspaceMembers.userId],
    references: [users.id],
  }),
}));

export const meetingsRelations = relations(meetings, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [meetings.workspaceId],
    references: [workspaces.id],
  }),
  creator: one(users, {
    fields: [meetings.createdBy],
    references: [users.id],
  }),
  participants: many(meetingParticipants),
  transcriptSegments: many(transcriptSegments),
  summary: one(meetingSummaries),
  actionItems: many(actionItems),
  tags: many(meetingTags),
}));

export const meetingParticipantsRelations = relations(meetingParticipants, ({ one }) => ({
  meeting: one(meetings, {
    fields: [meetingParticipants.meetingId],
    references: [meetings.id],
  }),
  user: one(users, {
    fields: [meetingParticipants.userId],
    references: [users.id],
  }),
}));

export const transcriptSegmentsRelations = relations(transcriptSegments, ({ one }) => ({
  meeting: one(meetings, {
    fields: [transcriptSegments.meetingId],
    references: [meetings.id],
  }),
}));

export const meetingSummariesRelations = relations(meetingSummaries, ({ one }) => ({
  meeting: one(meetings, {
    fields: [meetingSummaries.meetingId],
    references: [meetings.id],
  }),
}));

export const actionItemsRelations = relations(actionItems, ({ one }) => ({
  meeting: one(meetings, {
    fields: [actionItems.meetingId],
    references: [meetings.id],
  }),
  assignee: one(users, {
    fields: [actionItems.assigneeId],
    references: [users.id],
  }),
}));

export const meetingTagsRelations = relations(meetingTags, ({ one }) => ({
  meeting: one(meetings, {
    fields: [meetingTags.meetingId],
    references: [meetings.id],
  }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [chatMessages.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertWorkspaceSchema = createInsertSchema(workspaces).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMeetingSchema = createInsertSchema(meetings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTranscriptSegmentSchema = createInsertSchema(transcriptSegments).omit({
  id: true,
  createdAt: true,
});

export const insertActionItemSchema = createInsertSchema(actionItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertWorkspace = z.infer<typeof insertWorkspaceSchema>;
export type Workspace = typeof workspaces.$inferSelect;
export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type Meeting = typeof meetings.$inferSelect;
export type MeetingParticipant = typeof meetingParticipants.$inferSelect;
export type TranscriptSegment = typeof transcriptSegments.$inferSelect;
export type InsertTranscriptSegment = z.infer<typeof insertTranscriptSegmentSchema>;
export type MeetingSummary = typeof meetingSummaries.$inferSelect;
export type ActionItem = typeof actionItems.$inferSelect;
export type InsertActionItem = z.infer<typeof insertActionItemSchema>;
export type MeetingTag = typeof meetingTags.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
