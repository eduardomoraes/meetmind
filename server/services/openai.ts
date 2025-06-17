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
    if (!audioBuffer || audioBuffer.length === 0) {
      return { text: "" };
    }

    if (audioBuffer.length < 1024) {
      return { text: "" };
    }

    // Create FormData for the OpenAI API
    const formData = new FormData();
    const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' });
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'text');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`OpenAI API error: ${response.status} ${response.statusText}`, errorData);
      
      // Handle quota exceeded error specifically
      if (response.status === 429 && errorData.includes('insufficient_quota')) {
        console.log("OpenAI quota exceeded - transcription unavailable");
      }
      
      return { text: "" };
    }

    const text = await response.text();
    console.log("Transcription:", text.slice(0, 50) + "...");
    return { text: text.trim() };
  } catch (error) {
    console.error("Transcription error:", error);
    return { text: "" };
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
  } catch (error: any) {
    console.error("Query answering error:", error);
    
    // Handle specific OpenAI API errors
    if (error?.status === 429 && error?.code === 'insufficient_quota') {
      return "I'm unable to process your request because the OpenAI API quota has been exceeded. Please check your OpenAI billing settings and add credits to continue using the AI features.";
    }
    
    if (error?.status === 401) {
      return "There's an issue with the OpenAI API authentication. Please verify your API key is valid and has the necessary permissions.";
    }
    
    if (error?.status >= 500) {
      return "The OpenAI service is temporarily unavailable. Please try again in a few moments.";
    }
    
    return "I'm experiencing technical difficulties and cannot process your request right now. Please try again later.";
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
