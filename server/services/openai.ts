import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key" 
});

export interface MeetingSummaryData {
  summary: string;
  keyTakeaways: string[];
  decisions: string[];
  actionItems: Array<{
    task: string;
    assignee: string;
    priority: "high" | "medium" | "low";
    dueDate?: string;
  }>;
}

export async function transcribeAudio(audioBuffer: Buffer): Promise<{ text: string }> {
  try {
    // Convert buffer to a format OpenAI can handle
    const file = new File([audioBuffer], "audio.webm", { type: "audio/webm" });
    
    const transcription = await openai.audio.transcriptions.create({
      file: file as any,
      model: "whisper-1",
      response_format: "text",
    });

    return { text: transcription };
  } catch (error) {
    console.error("Transcription error:", error);
    throw new Error("Failed to transcribe audio: " + (error as Error).message);
  }
}

export async function generateMeetingSummary(transcript: string, meetingTitle: string): Promise<MeetingSummaryData> {
  try {
    const prompt = `Please analyze the following meeting transcript and provide a structured summary. The meeting title is: "${meetingTitle}"

Transcript:
${transcript}

Please provide a JSON response with the following structure:
{
  "summary": "A concise overall summary of the meeting",
  "keyTakeaways": ["Array of key insights and takeaways"],
  "decisions": ["Array of decisions that were made"],
  "actionItems": [
    {
      "task": "Description of the action item",
      "assignee": "Person assigned to the task",
      "priority": "high|medium|low",
      "dueDate": "Due date if mentioned (YYYY-MM-DD format or null)"
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert meeting analyst. Analyze meeting transcripts and extract structured information including summaries, key takeaways, decisions, and action items. Always respond with valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Validate the response structure
    if (!result.summary || !Array.isArray(result.keyTakeaways) || !Array.isArray(result.decisions) || !Array.isArray(result.actionItems)) {
      throw new Error("Invalid response structure from OpenAI");
    }

    return result;
  } catch (error) {
    console.error("Meeting summary error:", error);
    throw new Error("Failed to generate meeting summary: " + (error as Error).message);
  }
}

export async function answerMeetingQuery(query: string, meetingContext: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an AI assistant that helps users query their meeting notes. You have access to meeting transcripts, summaries, action items, and decisions. Provide helpful, accurate responses based on the meeting context provided. If you cannot find the answer in the context, say so clearly.`,
        },
        {
          role: "user",
          content: `Context from meetings:
${meetingContext}

User question: ${query}`,
        },
      ],
      temperature: 0.1,
    });

    return response.choices[0].message.content || "I'm sorry, I couldn't generate a response to your query.";
  } catch (error) {
    console.error("Query answering error:", error);
    throw new Error("Failed to answer query: " + (error as Error).message);
  }
}

export async function extractSpeakerInfo(transcriptSegment: string): Promise<{ speaker: string; text: string }> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Extract the speaker name and their spoken text from meeting transcript segments. If no speaker is identifiable, use 'Unknown Speaker'. Respond with JSON format: {\"speaker\": \"Speaker Name\", \"text\": \"What they said\"}",
        },
        {
          role: "user",
          content: transcriptSegment,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      speaker: result.speaker || "Unknown Speaker",
      text: result.text || transcriptSegment,
    };
  } catch (error) {
    console.error("Speaker extraction error:", error);
    return {
      speaker: "Unknown Speaker",
      text: transcriptSegment,
    };
  }
}
