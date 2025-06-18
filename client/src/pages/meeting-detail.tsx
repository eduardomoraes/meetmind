import { useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Sidebar } from "@/components/sidebar";
import { ActionItem } from "@/components/action-item";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  ArrowLeft, 
  Share, 
  Download, 
  MessageSquare, 
  Brain, 
  Lightbulb, 
  CheckCircle,
  FileText,
  Plus,
  Slack,
  StickyNote,
  Mail
} from "lucide-react";
import { Link } from "wouter";

export default function MeetingDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const meetingId = parseInt(id || "0");

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

  // Fetch meeting details
  const { data: meetingData, isLoading: isMeetingLoading } = useQuery({
    queryKey: [`/api/meetings/${meetingId}`],
    enabled: isAuthenticated && !!meetingId,
  });

  // Update action item mutation
  const updateActionItemMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const response = await apiRequest('PATCH', `/api/action-items/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/meetings/${meetingId}`] });
      toast({
        title: "Success",
        description: "Action item updated successfully.",
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
        description: "Failed to update action item.",
        variant: "destructive",
      });
    },
  });

  const handleActionItemToggle = (actionItemId: number, completed: boolean) => {
    updateActionItemMutation.mutate({
      id: actionItemId,
      updates: { status: completed ? "completed" : "pending" },
    });
  };

  if (isLoading || !isAuthenticated || isMeetingLoading) {
    return <div>Loading...</div>;
  }

  if (!meetingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Meeting Not Found</h2>
            <p className="text-slate-600 mb-4">
              The meeting you're looking for doesn't exist or you don't have access to it.
            </p>
            <Link href="/">
              <Button>Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { meeting, participants, transcriptSegments, summary, actionItems, tags } = meetingData;

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar 
        workspaces={workspaces || []}
        selectedWorkspaceId={meeting.workspaceId}
        currentPage="meetings"
      />
      
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Meeting Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">{meeting.title}</h2>
                <p className="text-slate-600 mt-1">
                  {formatDate(meeting.createdAt)} • {formatTime(meeting.startTime || meeting.createdAt)}
                  {meeting.endTime && ` - ${formatTime(meeting.endTime)}`}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="secondary">
                <Share className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button variant="secondary">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Link href="/chat">
                <Button className="bg-primary hover:bg-blue-700">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Ask AI
                </Button>
              </Link>
            </div>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Meeting Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto p-8">
              {/* AI Summary */}
              {summary && (
                <Card className="bg-blue-50 border-blue-200 mb-8">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                      <Brain className="w-5 h-5 mr-2 text-blue-600" />
                      AI Summary
                    </h3>
                    <p className="text-slate-800 leading-relaxed">{summary.summary}</p>
                  </CardContent>
                </Card>
              )}

              {/* Key Takeaways */}
              {summary?.keyTakeaways && (summary.keyTakeaways as string[]).length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                    <Lightbulb className="w-5 h-5 mr-2 text-yellow-600" />
                    Key Takeaways
                  </h3>
                  <div className="space-y-3">
                    {(summary.keyTakeaways as string[]).map((takeaway, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <p className="text-slate-800">{takeaway}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Items */}
              {actionItems.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                    Action Items
                  </h3>
                  <div className="space-y-4">
                    {actionItems.map((item) => (
                      <Card key={item.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-3">
                            <input
                              type="checkbox"
                              checked={item.status === "completed"}
                              onChange={(e) => handleActionItemToggle(item.id, e.target.checked)}
                              className="mt-1 rounded border-slate-300 text-primary focus:ring-primary/20"
                            />
                            <div className="flex-1">
                              <p className="font-medium text-slate-900">{item.task}</p>
                              <div className="flex items-center space-x-4 mt-2 text-sm text-slate-500">
                                <span className="flex items-center space-x-1">
                                  <span>Assigned to: {item.assigneeName}</span>
                                </span>
                                {item.dueDate && (
                                  <span className="flex items-center space-x-1">
                                    <span>Due: {formatDate(item.dueDate)}</span>
                                  </span>
                                )}
                                <Badge
                                  variant={
                                    item.priority === "high" 
                                      ? "destructive" 
                                      : item.priority === "medium" 
                                      ? "default" 
                                      : "secondary"
                                  }
                                >
                                  {item.priority} priority
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Decisions Made */}
              {summary?.decisions && (summary.decisions as string[]).length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                    Decisions Made
                  </h3>
                  <div className="space-y-3">
                    {(summary.decisions as string[]).map((decision, index) => (
                      <Card key={index} className="bg-green-50 border-green-200">
                        <CardContent className="p-4">
                          <p className="text-slate-800">{decision}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Full Transcript */}
              {transcriptSegments.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-slate-600" />
                    Full Transcript
                  </h3>
                  <Card className="bg-slate-50">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {transcriptSegments.map((segment) => (
                          <div key={segment.id} className="flex items-start space-x-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={segment.speakerAvatar} />
                              <AvatarFallback>
                                {segment.speakerName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="font-medium text-slate-900">
                                  {segment.speakerName}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {formatTime(segment.timestamp)}
                                </span>
                              </div>
                              <p className="text-slate-800">{segment.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>

          {/* Meeting Metadata */}
          <div className="w-80 bg-slate-50 border-l border-slate-200 p-6">
            <div className="space-y-6">
              {/* Meeting Info */}
              <div>
                <h4 className="font-semibold text-slate-900 mb-3">Meeting Details</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Duration</span>
                    <span className="font-medium">
                      {meeting.duration ? formatDuration(meeting.duration) : "Unknown"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Participants</span>
                    <span className="font-medium">{participants.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Words</span>
                    <span className="font-medium">
                      {meeting.wordCount?.toLocaleString() || "0"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Status</span>
                    <Badge variant={meeting.status === "completed" ? "default" : "secondary"}>
                      {meeting.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Participants */}
              {participants.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-900 mb-3">Participants</h4>
                  <div className="space-y-3">
                    {participants.map((participant) => (
                      <div key={participant.id} className="flex items-center space-x-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={participant.avatar} />
                          <AvatarFallback>
                            {participant.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">
                            {participant.name}
                          </p>
                          {participant.role && (
                            <p className="text-xs text-slate-500">{participant.role}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              <div>
                <h4 className="font-semibold text-slate-900 mb-3">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge key={tag.id} variant="secondary">
                      {tag.tag}
                    </Badge>
                  ))}
                </div>
                <Button variant="ghost" size="sm" className="mt-2 text-primary">
                  <Plus className="w-3 h-3 mr-1" />
                  Add Tag
                </Button>
              </div>

              {/* Actions */}
              <div>
                <h4 className="font-semibold text-slate-900 mb-3">Actions</h4>
                <div className="space-y-2">
                  <Button variant="secondary" className="w-full justify-start">
                    <Slack className="w-4 h-4 mr-2" />
                    Send to Slack
                  </Button>
                  <Button variant="secondary" className="w-full justify-start">
                    <StickyNote className="w-4 h-4 mr-2" />
                    Save to Notion
                  </Button>
                  <Button variant="secondary" className="w-full justify-start">
                    <Mail className="w-4 h-4 mr-2" />
                    Email Summary
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
