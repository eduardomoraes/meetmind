import { storage } from "../storage";
import { generateMeetingSummary, transcribeAudio, extractSpeakerInfo } from "./openai";
import type { Meeting, TranscriptSegment } from "@shared/schema";

export class MeetingService {
  async startMeeting(workspaceId: number, userId: string, title: string): Promise<Meeting> {
    const meeting = await storage.createMeeting({
      title,
      workspaceId,
      createdBy: userId,
      status: "recording",
      startTime: new Date(),
    });

    return meeting;
  }

  async stopMeeting(meetingId: number): Promise<void> {
    const meeting = await storage.getMeeting(meetingId);
    if (!meeting) {
      throw new Error("Meeting not found");
    }

    const endTime = new Date();
    const duration = meeting.startTime 
      ? Math.floor((endTime.getTime() - meeting.startTime.getTime()) / 1000)
      : 0;

    await storage.updateMeeting(meetingId, {
      status: "completed",
      endTime,
      duration,
    });

    // Generate AI summary after stopping the meeting
    setTimeout(() => this.generateMeetingSummary(meetingId), 1000);
  }

  async addTranscriptSegment(
    meetingId: number,
    text: string,
    speakerName?: string,
    speakerAvatar?: string
  ): Promise<TranscriptSegment> {
    let finalSpeakerName = speakerName;
    let finalText = text;

    // If no speaker provided, try to extract from text using AI
    if (!speakerName) {
      try {
        const extracted = await extractSpeakerInfo(text);
        finalSpeakerName = extracted.speaker;
        finalText = extracted.text;
      } catch (error) {
        finalSpeakerName = "Unknown Speaker";
      }
    }

    const segment = await storage.addTranscriptSegment({
      meetingId,
      speakerName: finalSpeakerName || "Unknown Speaker",
      speakerAvatar,
      text: finalText,
      timestamp: new Date(),
      confidence: 95, // Default confidence for live transcription
    });

    // Update meeting word count
    const meeting = await storage.getMeeting(meetingId);
    if (meeting) {
      const wordCount = (meeting.wordCount || 0) + finalText.split(/\s+/).length;
      await storage.updateMeeting(meetingId, { wordCount });
    }

    return segment;
  }

  async processAudioChunk(meetingId: number, audioBuffer: Buffer): Promise<string> {
    try {
      const { text } = await transcribeAudio(audioBuffer);
      
      if (text.trim()) {
        await this.addTranscriptSegment(meetingId, text);
      }

      return text;
    } catch (error) {
      console.error("Error processing audio chunk:", error);
      throw error;
    }
  }

  async processCompleteAudio(meetingId: number, audioBuffer: Buffer): Promise<string> {
    try {
      console.log(`Processing complete conversation audio for meeting ${meetingId}: ${audioBuffer.length} bytes`);
      
      // Add detailed logging for debugging
      console.log(`Audio buffer first 32 bytes:`, audioBuffer.slice(0, 32));
      
      const { text } = await transcribeAudio(audioBuffer);
      console.log(`Transcription result: "${text}"`);
      
      if (text.trim()) {
        // Add the complete transcript as a single segment
        await this.addTranscriptSegment(meetingId, text);
        
        // Update meeting word count
        const meeting = await storage.getMeeting(meetingId);
        if (meeting) {
          const wordCount = text.split(/\s+/).length;
          await storage.updateMeeting(meetingId, { wordCount });
        }
        
        console.log(`Complete transcript processed: ${text.length} characters, ${text.split(/\s+/).length} words`);
        
        // Generate meeting summary after processing transcript
        await this.generateMeetingSummary(meetingId);
      } else {
        console.log("No text transcribed from audio - audio may be silent or incompatible format");
      }

      return text;
    } catch (error) {
      console.error("Error processing complete audio:", error);
      throw error;
    }
  }

  async generateMeetingSummary(meetingId: number): Promise<void> {
    try {
      const meeting = await storage.getMeeting(meetingId);
      if (!meeting) {
        console.log("Meeting not found for summary generation:", meetingId);
        return;
      }

      const transcript = await storage.getMeetingTranscript(meetingId);
      const fullTranscript = transcript
        .map(segment => `${segment.speakerName}: ${segment.text}`)
        .join("\n");

      if (!fullTranscript.trim()) {
        console.log("No transcript available for meeting", meetingId);
        // Create a basic summary indicating no content was recorded
        await storage.createMeetingSummary(
          meetingId,
          "This meeting was recorded but no transcript content was captured.",
          ["No audio content was transcribed"],
          ["No decisions recorded"]
        );
        return;
      }

      const summaryData = await generateMeetingSummary(fullTranscript, meeting.title);

      // Update meeting title with AI-generated title
      if (summaryData.title && summaryData.title !== "New Meeting") {
        await storage.updateMeeting(meetingId, { title: summaryData.title });
      }

      // Save the summary
      await storage.createMeetingSummary(
        meetingId,
        summaryData.summary,
        summaryData.keyTakeaways,
        summaryData.decisions
      );

      // Save action items
      for (const item of summaryData.actionItems) {
        await storage.createActionItem({
          meetingId,
          task: item.task,
          assigneeName: item.assignee,
          priority: item.priority,
          dueDate: item.dueDate ? new Date(item.dueDate) : null,
        });
      }

      console.log(`Generated summary for meeting ${meetingId}`);
    } catch (error) {
      console.error("Error generating meeting summary:", error);
    }
  }

  async getMeetingContext(meetingIds: number[]): Promise<string> {
    const meetings = await Promise.all(
      meetingIds.map(id => storage.getMeetingWithDetails(id))
    );

    let context = "";

    for (const meetingData of meetings) {
      if (!meetingData) continue;

      const { meeting, transcriptSegments, summary, actionItems } = meetingData;
      
      context += `\n=== Meeting: ${meeting.title} ===\n`;
      context += `Date: ${meeting.createdAt}\n`;
      
      if (summary) {
        context += `\nSummary: ${summary.summary}\n`;
        context += `\nKey Takeaways:\n${(summary.keyTakeaways as string[]).map(t => `- ${t}`).join('\n')}\n`;
        context += `\nDecisions:\n${(summary.decisions as string[]).map(d => `- ${d}`).join('\n')}\n`;
      }

      if (actionItems.length > 0) {
        context += `\nAction Items:\n`;
        actionItems.forEach(item => {
          context += `- ${item.task} (Assigned to: ${item.assigneeName}, Priority: ${item.priority})\n`;
        });
      }

      // Include some transcript snippets for context
      if (transcriptSegments.length > 0) {
        context += `\nKey Discussion Points:\n`;
        transcriptSegments.slice(0, 10).forEach(segment => {
          context += `${segment.speakerName}: ${segment.text}\n`;
        });
      }
    }

    return context;
  }
}

export const meetingService = new MeetingService();
