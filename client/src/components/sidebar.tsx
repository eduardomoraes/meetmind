import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Brain, 
  Home, 
  Mic, 
  Folder, 
  MessageSquare, 
  Plus, 
  Settings,
  LogOut
} from "lucide-react";
import { Link, useLocation } from "wouter";
import type { Workspace } from "@shared/schema";

interface SidebarProps {
  workspaces: Workspace[];
  selectedWorkspaceId: number | null;
  onWorkspaceChange?: (workspaceId: number) => void;
  currentPage?: string;
}

export function Sidebar({ 
  workspaces, 
  selectedWorkspaceId, 
  onWorkspaceChange,
  currentPage 
}: SidebarProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");

  // Create workspace mutation
  const createWorkspaceMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest('POST', '/api/workspaces', { name });
      return response.json();
    },
    onSuccess: (workspace) => {
      setIsCreatingWorkspace(false);
      setNewWorkspaceName("");
      onWorkspaceChange?.(workspace.id);
      queryClient.invalidateQueries({ queryKey: ["/api/workspaces"] });
      toast({
        title: "Success",
        description: "Workspace created successfully.",
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
        description: "Failed to create workspace.",
        variant: "destructive",
      });
    },
  });

  const handleCreateWorkspace = () => {
    if (!newWorkspaceName.trim()) return;
    createWorkspaceMutation.mutate(newWorkspaceName);
  };

  const getNavItemClass = (page: string) => {
    const isActive = currentPage === page || 
      (page === "dashboard" && location === "/") ||
      (page === "record" && location === "/recording") ||
      (page === "meetings" && location.startsWith("/meetings")) ||
      (page === "chat" && location === "/chat");
    
    return `nav-item ${isActive ? 'active' : ''}`;
  };

  const selectedWorkspace = workspaces.find(w => w.id === selectedWorkspaceId);

  return (
    <aside className="w-64 bg-surface border-r border-slate-200 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">MeetingMind</h1>
        </div>
      </div>

      {/* Workspace Selector */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-slate-700">Workspace</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCreatingWorkspace(true)}
            className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600"
          >
            <Plus className="w-3 h-3" />
          </Button>
        </div>
        
        {isCreatingWorkspace ? (
          <div className="space-y-2">
            <Input
              placeholder="Workspace name"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateWorkspace()}
              className="text-sm"
              autoFocus
            />
            <div className="flex space-x-1">
              <Button
                size="sm"
                onClick={handleCreateWorkspace}
                disabled={!newWorkspaceName.trim() || createWorkspaceMutation.isPending}
                className="flex-1 text-xs"
              >
                Create
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsCreatingWorkspace(false);
                  setNewWorkspaceName("");
                }}
                className="flex-1 text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <select 
            value={selectedWorkspaceId || ""}
            onChange={(e) => onWorkspaceChange?.(parseInt(e.target.value))}
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          <li>
            <Link href="/">
              <button className={getNavItemClass("dashboard")}>
                <Home className="w-4 h-4" />
                <span>Dashboard</span>
              </button>
            </Link>
          </li>
          <li>
            <Link href="/recording">
              <button className={getNavItemClass("record")}>
                <Mic className="w-4 h-4" />
                <span>Record Meeting</span>
              </button>
            </Link>
          </li>
          <li>
            <Link href="/">
              <button className={getNavItemClass("meetings")}>
                <Folder className="w-4 h-4" />
                <span>All Meetings</span>
              </button>
            </Link>
          </li>
          <li>
            <Link href="/chat">
              <button className={getNavItemClass("chat")}>
                <MessageSquare className="w-4 h-4" />
                <span>AI Assistant</span>
              </button>
            </Link>
          </li>
        </ul>

        {/* Integrations */}
        <div className="mt-8">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Integrations
          </h3>
          <ul className="space-y-2">
            <li>
              <button className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Google Calendar</span>
                <Badge className="ml-auto integration-connected">Connected</Badge>
              </button>
            </li>
            <li>
              <button className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5.042 15.165a2.528 2.528 0 0 0-2.52 2.523A2.528 2.528 0 0 0 5.042 20.21a2.528 2.528 0 0 0 2.52-2.522 2.528 2.528 0 0 0-2.52-2.523zm6.906 4.402c-.781.781-2.047.781-2.828 0a1.997 1.997 0 0 1 0-2.828l7.071-7.071a2 2 0 0 1 2.828 0 1.997 1.997 0 0 1 0 2.828L11.948 19.567z"/>
                  <path d="M18.958 8.835a2.528 2.528 0 0 0 2.52-2.523 2.528 2.528 0 0 0-2.52-2.523 2.528 2.528 0 0 0-2.52 2.523 2.528 2.528 0 0 0 2.52 2.523z"/>
                </svg>
                <span>Slack</span>
                <Badge className="ml-auto integration-setup">Setup</Badge>
              </button>
            </li>
            <li>
              <button className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l8.893-.865c.183 0 .028-.215-.056-.25l-1.446-.773c-.448-.248-.972-.466-2.04-.312L3.611 3.208c-.557.093-.746.372-.651.653l.499 1.347z"/>
                  <path d="M5.89 6.518c-.043.32 0 .639.043.958l8.988 8.367c.62.62 1.226.744 2.04.124l6.15-4.27c.465-.34.402-.827-.183-1.006L5.89 6.518z"/>
                  <path d="M17.106 21.182c.62 0 .992-.216 1.455-.68l2.668-2.668c.464-.464.68-.835.68-1.455V8.02c0-.62-.216-.992-.68-1.455L18.561 3.897c-.464-.464-.835-.68-1.455-.68H8.747c-.62 0-.992.216-1.455.68L4.624 6.565c-.464.464-.68.835-.68 1.455v8.36c0 .62.216.992.68 1.455l2.668 2.668c.464.464.835.68 1.455.68h8.36z"/>
                </svg>
                <span>Notion</span>
                <Badge className="ml-auto integration-setup">Setup</Badge>
              </button>
            </li>
          </ul>
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center space-x-3 mb-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user?.profileImageUrl} />
            <AvatarFallback>
              {user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">
              {user?.firstName && user?.lastName 
                ? `${user.firstName} ${user.lastName}`
                : user?.email || 'User'
              }
            </p>
            <p className="text-xs text-slate-500 truncate">
              {selectedWorkspace?.name || 'No workspace'}
            </p>
          </div>
          <div className="flex space-x-1">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Settings className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => window.location.href = '/api/logout'}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
