import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Sidebar } from "@/components/sidebar";
import { MeetingCard } from "@/components/meeting-card";
import { ActionItem } from "@/components/action-item";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, CheckSquare, Users, Plus } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | null>(null);

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

  // Fetch workspace stats
  const { data: stats } = useQuery({
    queryKey: ["/api/workspaces", selectedWorkspaceId, "stats"],
    enabled: !!selectedWorkspaceId,
  });

  // Fetch recent meetings
  const { data: meetings } = useQuery({
    queryKey: ["/api/workspaces", selectedWorkspaceId, "meetings"],
    enabled: !!selectedWorkspaceId,
  });

  // Debug log
  console.log("Meetings data:", meetings);

  // Fetch action items
  const { data: actionItems } = useQuery({
    queryKey: ["/api/workspaces", selectedWorkspaceId, "action-items"],
    enabled: !!selectedWorkspaceId,
  });

  if (isLoading || !isAuthenticated) {
    return <div>Loading...</div>;
  }

  const pendingActionItems = actionItems?.filter(item => item.status === "pending") || [];

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar 
        workspaces={workspaces || []}
        selectedWorkspaceId={selectedWorkspaceId}
        onWorkspaceChange={setSelectedWorkspaceId}
      />
      
      <main className="flex-1 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Dashboard</h2>
              <p className="text-slate-600 mt-1">
                Welcome back! Here's what's happening with your meetings.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Link href="/record">
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Start Recording
                </Button>
              </Link>
              <Button className="bg-primary hover:bg-blue-700">
                New Meeting
              </Button>
            </div>
          </div>
        </header>

        <div className="p-8 overflow-y-auto">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-slate-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-600 text-sm">This Week</p>
                    <p className="text-2xl font-semibold text-slate-900">
                      {stats?.weeklyMeetings || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-600 text-sm">Hours Saved</p>
                    <p className="text-2xl font-semibold text-slate-900">
                      {Math.round((stats?.weeklyMeetings || 0) * 2)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-600 text-sm">Action Items</p>
                    <p className="text-2xl font-semibold text-slate-900">
                      {stats?.pendingActionItems || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <CheckSquare className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-600 text-sm">Team Members</p>
                    <p className="text-2xl font-semibold text-slate-900">
                      {stats?.memberCount || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Meetings */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900">Recent Meetings</h3>
                <Button variant="ghost" className="text-primary hover:text-blue-700">
                  View all
                </Button>
              </div>
              
              <div className="space-y-4">
                {meetings?.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <p className="text-slate-500">No meetings yet. Start your first recording!</p>
                      <Link href="/record">
                        <Button className="mt-4 bg-primary hover:bg-blue-700">
                          Start Recording
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ) : (
                  meetings?.map((meeting) => (
                    <MeetingCard key={meeting.id} meeting={meeting} />
                  ))
                )}
              </div>
            </div>

            {/* Action Items & Settings */}
            <div className="space-y-8">
              {/* Pending Action Items */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Pending Action Items</h3>
                <div className="space-y-3">
                  {pendingActionItems.length === 0 ? (
                    <Card>
                      <CardContent className="p-4 text-center">
                        <p className="text-slate-500 text-sm">No pending action items</p>
                      </CardContent>
                    </Card>
                  ) : (
                    pendingActionItems.slice(0, 5).map((item) => (
                      <ActionItem key={item.id} actionItem={item} />
                    ))
                  )}
                </div>
              </div>

              {/* AI Model Settings */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">AI Configuration</h3>
                <Card>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Transcription Model
                        </label>
                        <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                          <option>OpenAI Whisper</option>
                          <option>Deepgram Nova</option>
                          <option>Azure Speech</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Summarization Model
                        </label>
                        <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                          <option>GPT-4</option>
                          <option>Claude 3.5 Sonnet</option>
                          <option>Gemini Pro</option>
                          <option>Mixtral 8x7B</option>
                          <option>LLaMA 2 70B</option>
                        </select>
                      </div>
                      <Button 
                        variant="secondary" 
                        className="w-full"
                      >
                        Configure Custom Endpoint
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
