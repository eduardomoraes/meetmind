import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, CheckSquare, ChevronRight, Calendar, Clock, Brain } from "lucide-react";
import { Link } from "wouter";
import type { Meeting, MeetingSummary } from "@shared/schema";

interface MeetingCardProps {
  meeting: Meeting & { summary: MeetingSummary | null };
}

export function MeetingCard({ meeting }: MeetingCardProps) {
  const formatDate = (dateValue: string | Date | null) => {
    if (!dateValue) return "No date";
    const date = new Date(dateValue);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    if (isToday) {
      return `Today, ${date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })}`;
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    if (isYesterday) {
      return `Yesterday, ${date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })}`;
    }
    
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "Unknown duration";
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="status-badge-completed">Completed</Badge>;
      case "recording":
        return <Badge className="status-badge-in-progress">Recording</Badge>;
      default:
        return <Badge className="status-badge-scheduled">Scheduled</Badge>;
    }
  };

  return (
    <Card className="meeting-card">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-semibold text-slate-900 mb-1">{meeting.title}</h4>
            <p className="text-slate-600 text-sm mb-3">
              {formatDate(meeting.startTime || meeting.createdAt)}
              {meeting.duration && ` • ${formatDuration(meeting.duration)}`}
            </p>
            
            {/* AI Summary Preview */}
            {meeting.summary && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Brain className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">AI Summary</span>
                </div>
                <p className="text-sm text-blue-800 line-clamp-2">
                  {meeting.summary.summary}
                </p>
              </div>
            )}

            <div className="flex items-center space-x-4 text-sm text-slate-500">
              <span className="flex items-center space-x-1">
                <Users className="w-4 h-4" />
                <span>{meeting.participantCount || 0} participants</span>
              </span>
              
              {meeting.wordCount && (
                <span className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>{meeting.wordCount.toLocaleString()} words</span>
                </span>
              )}
              
              {meeting.summary && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Summary Available
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {getStatusBadge(meeting.status)}
            <Link href={`/meetings/${meeting.id}`}>
              <Button variant="ghost" size="sm" className="p-1">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
