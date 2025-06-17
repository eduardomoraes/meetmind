import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Send, 
  Bot, 
  FileText, 
  BarChart3, 
  Settings,
  Download,
  Trash2
} from "lucide-react";

interface ChatMessage {
  id: number;
  message: string;
  response: string;
  createdAt: string;
  model: string;
}

export default function AIChat() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [selectedMeetings, setSelectedMeetings] = useState<string>("all");
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
  const { data: workspaces } = useQuery({
    queryKey: ["/api/workspaces"],
    enabled: isAuthenticated,
  });

  // Set default workspace
  useEffect(() => {
    if (workspaces?.length > 0 && !selectedWorkspaceId) {
      setSelectedWorkspaceId(workspaces[0].id);
    }
  }, [workspaces, selectedWorkspaceId]);

  // Fetch recent meetings for context selection
  const { data: meetings } = useQuery({
    queryKey: ["/api/workspaces", selectedWorkspaceId, "meetings"],
    enabled: !!selectedWorkspaceId,
  });

  // Fetch chat history
  const { data: chatHistory, isLoading: isChatLoading } = useQuery({
    queryKey: ["/api/workspaces", selectedWorkspaceId, "chat-history"],
    enabled: !!selectedWorkspaceId,
  });

  // Debug chat history loading
  useEffect(() => {
    if (chatHistory) {
      console.log("Chat history loaded:", chatHistory);
    }
  }, [chatHistory]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      const meetingIds = selectedMeetings === "all" 
        ? meetings?.slice(0, 5).map(m => m.id) || []
        : selectedMeetings === "none"
        ? []
        : [parseInt(selectedMeetings)];

      const response = await apiRequest('POST', '/api/chat', {
        workspaceId: selectedWorkspaceId,
        message: messageText,
        meetingIds: meetingIds.length > 0 ? meetingIds : undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ 
        queryKey: ["/api/workspaces", selectedWorkspaceId, "chat-history"] 
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
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const handleSendMessage = () => {
    if (!message.trim() || sendMessageMutation.isPending) return;
    
    sendMessageMutation.mutate(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const suggestedQuestions = [
    "What decisions were made in recent meetings?",
    "Show me all action items assigned to me",
    "Summarize key themes from this week",
    "What topics came up most frequently?",
    "Who has the most pending action items?",
    "What are the upcoming deadlines?"
  ];

  const quickActions = [
    { icon: FileText, label: "Generate Report", action: () => {} },
    { icon: Download, label: "Export Action Items", action: () => {} },
    { icon: BarChart3, label: "Meeting Analytics", action: () => {} },
  ];

  if (isLoading || !isAuthenticated) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar 
        workspaces={workspaces || []}
        selectedWorkspaceId={selectedWorkspaceId}
        onWorkspaceChange={setSelectedWorkspaceId}
        currentPage="chat"
      />
      
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Chat Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">AI Assistant</h2>
              <p className="text-slate-600 mt-1">
                Ask questions about your meetings and get instant answers
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <select 
                value={selectedMeetings}
                onChange={(e) => setSelectedMeetings(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">All Recent Meetings</option>
                <option value="none">No Specific Meeting</option>
                {meetings?.map((meeting) => (
                  <option key={meeting.id} value={meeting.id.toString()}>
                    {meeting.title}
                  </option>
                ))}
              </select>
              <Button variant="secondary">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Chat Messages */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Welcome Message */}
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <Card className="bg-blue-50 border-blue-200 max-w-2xl">
                    <CardContent className="p-4">
                      <p className="text-slate-800">
                        Hello! I'm your AI meeting assistant. I can help you find information from your meetings, 
                        summarize key points, track action items, and answer questions about past discussions. 
                        What would you like to know?
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Chat History */}
                {isChatLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="spinner" />
                  </div>
                ) : !chatHistory || chatHistory.length === 0 ? (
                  <div className="flex justify-center py-8">
                    <p className="text-slate-500">No chat history yet. Send a message to get started!</p>
                  </div>
                ) : (
                  chatHistory?.map((chat: ChatMessage) => (
                    <div key={chat.id} className="space-y-4">
                      {/* User Message */}
                      <div className="flex items-start space-x-3 justify-end">
                        <Card className="chat-bubble-user">
                          <CardContent className="p-4">
                            <p className="text-white">{chat.message}</p>
                          </CardContent>
                        </Card>
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarImage src={user?.profileImageUrl} />
                          <AvatarFallback>
                            {user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      {/* AI Response */}
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                          <Bot className="w-5 h-5 text-white" />
                        </div>
                        <Card className="chat-bubble-ai">
                          <CardContent className="p-4">
                            <div className="prose prose-sm max-w-none">
                              {(chat.response || '').split('\n').map((paragraph, index) => (
                                <p key={index} className="text-slate-800 mb-2 last:mb-0">
                                  {paragraph}
                                </p>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  ))
                )}

                {/* Loading indicator for new message */}
                {sendMessageMutation.isPending && (
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <Card className="chat-bubble-ai">
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <div className="spinner" />
                          <span className="text-slate-600 text-sm">Thinking...</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Chat Input */}
            <div className="border-t border-slate-200 p-6">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-end space-x-3">
                  <div className="flex-1">
                    <Textarea
                      placeholder="Ask anything about your meetings..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      rows={3}
                    />
                  </div>
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!message.trim() || sendMessageMutation.isPending}
                    className="bg-primary hover:bg-blue-700 px-6 py-3"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send
                  </Button>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center space-x-4 text-sm text-slate-500">
                    <span>Powered by GPT-4</span>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Online</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-600">
                      <Trash2 className="w-3 h-3 mr-1" />
                      Clear Chat
                    </Button>
                    <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-600">
                      <Download className="w-3 h-3 mr-1" />
                      Export
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Suggested Questions & Actions */}
          <div className="w-80 bg-surface border-l border-slate-200 p-6">
            <div className="space-y-6">
              {/* Suggested Questions */}
              <div>
                <h4 className="font-semibold text-slate-900 mb-3">Suggested Questions</h4>
                <div className="space-y-2">
                  {suggestedQuestions.map((question, index) => (
                    <Button
                      key={index}
                      variant="secondary"
                      className="w-full text-left text-sm h-auto p-3 justify-start whitespace-normal"
                      onClick={() => setMessage(question)}
                    >
                      {question}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <h4 className="font-semibold text-slate-900 mb-3">Quick Actions</h4>
                <div className="space-y-2">
                  {quickActions.map((action, index) => (
                    <Button
                      key={index}
                      variant="secondary"
                      className="w-full justify-start"
                      onClick={action.action}
                    >
                      <action.icon className="w-4 h-4 mr-2" />
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* AI Model Selection */}
              <div>
                <h4 className="font-semibold text-slate-900 mb-3">AI Model</h4>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option>GPT-4</option>
                  <option>Claude 3.5 Sonnet</option>
                  <option>Gemini Pro</option>
                  <option>Custom Endpoint</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Choose your preferred AI model for responses
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
