import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAudioRecording } from "@/hooks/useAudioRecording";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Pause, Square, Bookmark, CheckSquare, Share, Volume2 } from "lucide-react";
import { useLocation } from "wouter";
import type { Workspace } from "@shared/schema";

// No longer using real-time transcript segments - processing complete audio after recording

export default function Recording() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | null>(null);
  const [meetingTitle, setMeetingTitle] = useState("New Meeting");
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentMeetingId, setCurrentMeetingId] = useState<number | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');
  const [processingMessage, setProcessingMessage] = useState('');
  const [stats, setStats] = useState({
    duration: 0,
    wordsTranscribed: 0,
    speakersDetected: 1,
    confidence: 95,
  });

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Fetch workspaces
  const { data: workspaces } = useQuery<Workspace[]>({
    queryKey: ["/api/workspaces"],
    enabled: isAuthenticated,
  });

  // Set default workspace
  useEffect(() => {
    if (Array.isArray(workspaces) && workspaces.length > 0 && !selectedWorkspaceId) {
      setSelectedWorkspaceId(workspaces[0].id);
    }
  }, [workspaces, selectedWorkspaceId]);

  // WebSocket connection
  const { sendMessage, lastMessage, connectionStatus } = useWebSocket('/ws');

  // Use a ref to store the current meeting ID for the audio callback
  const currentMeetingIdRef = useRef<number | null>(null);

  // Update the ref whenever currentMeetingId changes
  useEffect(() => {
    currentMeetingIdRef.current = currentMeetingId;
  }, [currentMeetingId]);

  // Audio recording hook
  const {
    startRecording: startAudioRecording,
    stopRecording: stopAudioRecording,
    isRecording: isAudioRecording,
    error: audioError,
  } = useAudioRecording({
    onDataAvailable: (audioData) => {
      const meetingId = currentMeetingIdRef.current;
      console.log(`Complete recording finished: ${audioData.length} characters (base64)`);
      if (meetingId && sendMessage && connectionStatus === 'Connected') {
        console.log(`Sending complete audio for meeting ${meetingId}: ${audioData.length} chars`);
        sendMessage({
          type: 'complete-audio',
          audio: audioData,
          meetingId: meetingId,
        });
      } else {
        console.error(`Cannot send complete audio - meetingId: ${meetingId}, sendMessage: ${!!sendMessage}, connection: ${connectionStatus}`);
        setProcessingStatus('error');
        setProcessingMessage('Failed to send audio for processing - connection lost');
      }
    },
    onError: (error) => {
      console.error('Audio recording error:', error);
      toast({
        title: "Audio Error",
        description: error,
        variant: "destructive",
      });
    },
    // No timeslice - record complete conversation
  });

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      const data = JSON.parse(lastMessage.data);
      
      switch (data.type) {
        case 'complete-transcript':
          setProcessingStatus('completed');
          setProcessingMessage('Transcription completed successfully');
          
          // Update stats with final transcript
          const wordCount = data.text.split(/\s+/).length;
          setStats(prev => ({
            ...prev,
            wordsTranscribed: wordCount,
          }));

          // Show success message and redirect to meeting detail
          toast({
            title: "Recording Processed",
            description: `Successfully transcribed ${wordCount} words`,
          });

          // Now send stop-meeting to close WebSocket session
          if (sendMessage) {
            sendMessage({
              type: 'stop-meeting',
            });
          }

          // Clear meeting ID and redirect to meeting detail page
          const meetingIdToView = currentMeetingId;
          setCurrentMeetingId(null);
          setTimeout(() => {
            setLocation(`/meeting/${meetingIdToView}`);
          }, 2000);
          break;
          
        case 'transcript-error':
          setProcessingStatus('error');
          setProcessingMessage(data.error || 'Failed to process recording');
          
          toast({
            title: "Processing Error",
            description: data.error || 'Failed to process the recording',
            variant: "destructive",
          });

          // Send stop-meeting to close WebSocket session even on error
          if (sendMessage) {
            sendMessage({
              type: 'stop-meeting',
            });
          }

          // Clear meeting ID after error
          setCurrentMeetingId(null);
          break;
          
        case 'error':
          toast({
            title: "Transcription Error",
            description: data.message,
            variant: "destructive",
          });
          break;
      }
    }
  }, [lastMessage, toast]);

  // Start meeting mutation
  const startMeetingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/meetings/start', {
        workspaceId: selectedWorkspaceId,
        title: meetingTitle,
      });
      return response.json();
    },
    onSuccess: async (meeting) => {
      setCurrentMeetingId(meeting.id);
      setIsRecording(true);
      
      // Wait for WebSocket connection to be ready
      let retries = 0;
      const maxRetries = 10;
      while (connectionStatus !== 'Connected' && retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 200));
        retries++;
      }
      
      if (connectionStatus === 'Connected' && sendMessage) {
        console.log(`Starting WebSocket session for meeting ${meeting.id}`);
        sendMessage({
          type: 'start-meeting',
          meetingId: meeting.id,
        });
        
        // Small delay to ensure server processes the start message
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Start audio recording
        startAudioRecording();
        
        toast({
          title: "Recording Started",
          description: "Meeting is now being recorded and transcribed.",
        });
      } else {
        console.error('Failed to establish WebSocket connection');
        toast({
          title: "Connection Error",
          description: "Failed to connect to transcription service. Please try again.",
          variant: "destructive",
        });
        setIsRecording(false);
        setCurrentMeetingId(null);
      }
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "Error",
        description: "Failed to start meeting recording.",
        variant: "destructive",
      });
    },
  });

  // Stop meeting mutation
  const stopMeetingMutation = useMutation({
    mutationFn: async () => {
      if (!currentMeetingId) return;
      
      const response = await apiRequest('POST', `/api/meetings/${currentMeetingId}/stop`);
      return response.json();
    },
    onSuccess: () => {
      setIsRecording(false);
      setIsPaused(false);
      
      // Stop audio recording first to capture complete audio
      stopAudioRecording();
      
      // Keep WebSocket connection open for complete audio processing
      // Don't send stop-meeting until after audio is processed
      
      // Invalidate meetings cache to update dashboard
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${selectedWorkspaceId}/meetings`] });
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${selectedWorkspaceId}/stats`] });
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${selectedWorkspaceId}/action-items`] });
      
      toast({
        title: "Recording Stopped",
        description: "Meeting recording has been saved. Generating summary...",
      });
      
      // Set processing status and wait for audio processing
      setProcessingStatus('processing');
      setProcessingMessage('Processing recording and generating transcript...');
      
      // Reset stats but keep meetingId until processing is complete
      setStats({
        duration: 0,
        wordsTranscribed: 0,
        speakersDetected: 1,
        confidence: 95,
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "Error",
        description: "Failed to stop meeting recording.",
        variant: "destructive",
      });
    },
  });

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
        setStats(prev => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = () => {
    if (!selectedWorkspaceId) {
      toast({
        title: "Error",
        description: "Please select a workspace first.",
        variant: "destructive",
      });
      return;
    }
    
    startMeetingMutation.mutate();
  };

  const handleStopRecording = () => {
    stopMeetingMutation.mutate();
  };

  const handlePauseResume = () => {
    setIsPaused(!isPaused);
    if (isPaused) {
      startAudioRecording();
    } else {
      stopAudioRecording();
    }
  };

  if (isLoading || !isAuthenticated) {
    return <div>Loading...</div>;
  }

  if (audioError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-4">Audio Access Error</h2>
            <p className="text-slate-600 mb-4">{audioError}</p>
            <p className="text-sm text-slate-500">
              Please ensure your browser has microphone permissions enabled.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar 
        workspaces={workspaces || []}
        selectedWorkspaceId={selectedWorkspaceId}
        onWorkspaceChange={setSelectedWorkspaceId}
        currentPage="record"
      />
      
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Recording Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {isRecording && (
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-slate-900">Recording</span>
                  <span className="text-sm text-slate-500">
                    {formatDuration(recordingDuration)}
                  </span>
                </div>
              )}
              {isRecording && <div className="h-4 w-px bg-slate-300"></div>}
              <Input
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                className="text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-0 p-0"
                disabled={isRecording}
              />
            </div>
            <div className="flex items-center space-x-3">
              {!isRecording ? (
                <Button 
                  onClick={handleStartRecording}
                  disabled={startMeetingMutation.isPending || !selectedWorkspaceId}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Volume2 className="w-4 h-4 mr-2" />
                  {startMeetingMutation.isPending ? 'Starting...' : 'Start Recording'}
                </Button>
              ) : (
                <>
                  <Button 
                    onClick={handlePauseResume}
                    variant="secondary"
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    {isPaused ? 'Resume' : 'Pause'}
                  </Button>
                  <Button 
                    onClick={handleStopRecording}
                    disabled={stopMeetingMutation.isPending}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    {stopMeetingMutation.isPending ? 'Stopping...' : 'Stop Recording'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Live Transcription */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Live Transcription</h3>
                <div className="flex items-center space-x-2">
                  <p className="text-slate-600 text-sm">Powered by OpenAI Whisper</p>
                  <Badge 
                    variant={connectionStatus === 'Connected' ? 'default' : 'secondary'}
                    className={connectionStatus === 'Connected' ? 'bg-green-600' : ''}
                  >
                    {connectionStatus}
                  </Badge>
                </div>
              </div>

              <Card>
                <CardContent className="p-8 text-center">
                  {processingStatus === 'idle' && (
                    <p className="text-slate-500">
                      {isRecording 
                        ? "Recording conversation... Audio will be processed when you stop the recording."
                        : "Start recording to capture the full conversation."
                      }
                    </p>
                  )}
                  
                  {processingStatus === 'processing' && (
                    <div className="space-y-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-slate-700 font-medium">Processing Recording</p>
                      <p className="text-slate-500 text-sm">{processingMessage}</p>
                    </div>
                  )}
                  
                  {processingStatus === 'completed' && (
                    <div className="space-y-3">
                      <div className="rounded-full h-8 w-8 bg-green-100 text-green-600 flex items-center justify-center mx-auto">
                        <CheckSquare className="h-5 w-5" />
                      </div>
                      <p className="text-green-700 font-medium">Processing Complete</p>
                      <p className="text-slate-500 text-sm">{processingMessage}</p>
                    </div>
                  )}
                  
                  {processingStatus === 'error' && (
                    <div className="space-y-3">
                      <div className="rounded-full h-8 w-8 bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                        <Square className="h-5 w-5" />
                      </div>
                      <p className="text-red-700 font-medium">Processing Failed</p>
                      <p className="text-slate-500 text-sm">{processingMessage}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Recording Controls & Stats */}
          <div className="w-80 bg-slate-50 border-l border-slate-200 p-6">
            <div className="space-y-6">
              {/* Audio Settings */}
              <div>
                <h4 className="font-semibold text-slate-900 mb-3">Audio Settings</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Input Source</label>
                    <select 
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      disabled={isRecording}
                    >
                      <option>System Audio + Microphone</option>
                      <option>Microphone Only</option>
                      <option>System Audio Only</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Noise Cancellation</span>
                    <div className="w-11 h-6 bg-primary rounded-full relative">
                      <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Meeting Stats */}
              <div>
                <h4 className="font-semibold text-slate-900 mb-3">Meeting Stats</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Duration</span>
                    <span className="text-sm font-medium">
                      {formatDuration(stats.duration)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Words Transcribed</span>
                    <span className="text-sm font-medium">
                      {stats.wordsTranscribed.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Speakers Detected</span>
                    <span className="text-sm font-medium">{stats.speakersDetected}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Confidence</span>
                    <span className="text-sm font-medium text-green-600">
                      {stats.confidence}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <h4 className="font-semibold text-slate-900 mb-3">Quick Actions</h4>
                <div className="space-y-2">
                  <Button 
                    variant="secondary" 
                    className="w-full justify-start"
                    disabled={!isRecording}
                  >
                    <Bookmark className="w-4 h-4 mr-2" />
                    Add Bookmark
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="w-full justify-start"
                    disabled={!isRecording}
                  >
                    <CheckSquare className="w-4 h-4 mr-2" />
                    Create Action Item
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="w-full justify-start"
                    disabled={!isRecording}
                  >
                    <Share className="w-4 h-4 mr-2" />
                    Share Live Link
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
