import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface MeetingSummaryData {
  title: string;
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
    console.log("Processing audio buffer for transcription:", audioBuffer.length, "bytes");

    if (audioBuffer.length < 1000) {
      console.log("Audio buffer too small for transcription:", audioBuffer.length, "bytes");
      return { text: "" };
    }

    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    
    // Try multiple file extensions that OpenAI supports
    const extensions = ['.m4a', '.mp3', '.wav', '.webm'];
    let successfulTranscription = null;
    
    for (const ext of extensions) {
      const tempFilePath = path.join(os.tmpdir(), `audio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`);
      
      try {
        console.log(`Trying transcription with ${ext} format...`);
        
        // Write the audio buffer
        fs.writeFileSync(tempFilePath, audioBuffer);
        
        // Verify file was written
        const stats = fs.statSync(tempFilePath);
        console.log(`Temp file created: ${tempFilePath} (${stats.size} bytes)`);
        
        if (stats.size < 1000) {
          console.log("Temp file too small, skipping");
          fs.unlinkSync(tempFilePath);
          continue;
        }
        
        // Create a readable stream for the OpenAI API
        const audioFile = fs.createReadStream(tempFilePath);
        
        console.log(`Sending audio to OpenAI Whisper API as ${ext.substring(1).toUpperCase()} format`);
        const transcription = await openai.audio.transcriptions.create({
          file: audioFile,
          model: "whisper-1",
          response_format: "text",
          language: "en",
        });

        // Clean up the temporary file
        fs.unlinkSync(tempFilePath);
        console.log(`Temp file cleaned up: ${tempFilePath}`);
        
        const text = typeof transcription === 'string' ? transcription.trim() : '';
        if (text) {
          console.log(`Transcription successful with ${ext}:`, text.slice(0, 100) + (text.length > 100 ? "..." : ""));
          return { text };
        } else {
          console.log(`OpenAI returned empty transcription for ${ext}, trying next format`);
        }
        
      } catch (formatError) {
        // Clean up temp file if it exists
        try {
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
        } catch (cleanupError) {
          console.error("Error cleaning up temp file:", cleanupError);
        }
        
        console.log(`Format ${ext} failed:`, formatError instanceof Error ? formatError.message : 'Unknown error');
        // Continue to next format
        continue;
      }
    }
    
    // If we get here, all formats failed
    console.log("All audio formats failed transcription - chunk may be corrupted or silent");
    return { text: "" };
    
  } catch (error) {
    console.error("Transcription error:", error);
    const errorMessage = error instanceof Error 
      ? `Audio transcription failed: ${error.message}`
      : "Unknown transcription error";
    
    return { text: "" }; // Return empty instead of throwing to continue processing
  }
}

export async function generateMeetingSummary(transcript: string, meetingTitle: string): Promise<MeetingSummaryData> {
  console.log("Generating meeting summary for:", meetingTitle);
  
  if (!transcript || transcript.trim().length === 0) {
    return {
      title: meetingTitle || "Meeting Summary",
      summary: "This meeting was recorded but no transcript content was captured.",
      keyTakeaways: ["No audio content was transcribed"],
      decisions: ["No decisions recorded"],
      actionItems: []
    };
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are an expert meeting assistant. Analyze the meeting transcript and provide a comprehensive summary in JSON format with the following structure:
          {
            "title": "A descriptive meeting title (max 50 characters)",
            "summary": "A concise summary of the meeting (2-3 sentences)",
            "keyTakeaways": ["Array of 3-5 key takeaways from the meeting"],
            "decisions": ["Array of decisions made during the meeting"],
            "actionItems": [
              {
                "task": "Description of the task",
                "assignee": "Person responsible (use 'Unknown' if not specified)",
                "priority": "high|medium|low",
                "dueDate": "YYYY-MM-DD format or null if not specified"
              }
            ]
          }
          
          Focus on extracting concrete information. If information is unclear or missing, use appropriate defaults.`
        },
        {
          role: "user",
          content: `Please analyze this meeting transcript and provide a summary:\n\n${transcript}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    // Validate and set defaults for required fields
    return {
      title: result.title || meetingTitle || "Meeting Summary",
      summary: result.summary || "Meeting summary could not be generated from the available transcript.",
      keyTakeaways: Array.isArray(result.keyTakeaways) ? result.keyTakeaways : ["Meeting content analysis unavailable"],
      decisions: Array.isArray(result.decisions) ? result.decisions : [],
      actionItems: Array.isArray(result.actionItems) ? result.actionItems.map((item: any) => ({
        task: item.task || "Task description unavailable",
        assignee: item.assignee || "Unknown",
        priority: ["high", "medium", "low"].includes(item.priority) ? item.priority : "medium",
        dueDate: item.dueDate || undefined
      })) : []
    };
  } catch (error) {
    console.error("Error generating meeting summary:", error);
    return {
      title: meetingTitle || "Meeting Summary",
      summary: "Meeting summary generation failed due to processing error.",
      keyTakeaways: ["Summary generation encountered an error"],
      decisions: [],
      actionItems: []
    };
  }
}

export async function answerMeetingQuery(query: string, meetingContext: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that answers questions about meeting content. Provide accurate, concise answers based only on the provided meeting context. If the information is not available in the context, clearly state that."
        },
        {
          role: "user",
          content: `Meeting context:\n${meetingContext}\n\nQuestion: ${query}`
        }
      ],
      temperature: 0.3,
    });

    return response.choices[0].message.content || "I couldn't generate a response to your question.";
  } catch (error) {
    console.error("Error answering meeting query:", error);
    return "I encountered an error while processing your question. Please try again.";
  }
}

export async function extractSpeakerInfo(transcriptSegment: string): Promise<{ speaker: string; text: string }> {
  try {
    // Simple speaker detection - in a real implementation, you might use more sophisticated methods
    const speakerMatch = transcriptSegment.match(/^([A-Za-z\s]+):\s*(.+)$/);
    
    if (speakerMatch) {
      return {
        speaker: speakerMatch[1].trim(),
        text: speakerMatch[2].trim()
      };
    }
    
    // If no speaker format detected, return as unknown speaker
    return {
      speaker: "Unknown Speaker",
      text: transcriptSegment.trim()
    };
  } catch (error) {
    console.error("Error extracting speaker info:", error);
    return {
      speaker: "Unknown Speaker",
      text: transcriptSegment
    };
  }
}