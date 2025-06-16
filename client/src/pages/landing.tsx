import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, Mic, MessageSquare, Users, Zap, Shield } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">MeetingMind</h1>
          </div>
          <Button 
            onClick={() => window.location.href = '/api/login'}
            size="lg"
            className="bg-primary hover:bg-blue-700"
          >
            Get Started
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h2 className="text-5xl font-bold text-slate-900 mb-6">
            AI-Powered Meeting
            <span className="text-primary"> Productivity</span>
          </h2>
          <p className="text-xl text-slate-600 mb-12 leading-relaxed">
            Transform your meetings with real-time transcription, intelligent summarization, 
            and AI-powered insights. Never miss important details again.
          </p>
          
          <div className="flex items-center justify-center gap-4 mb-16">
            <Button 
              onClick={() => window.location.href = '/api/login'}
              size="lg"
              className="bg-primary hover:bg-blue-700 px-8 py-4 text-lg"
            >
              Start Free Trial
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="px-8 py-4 text-lg"
            >
              Watch Demo
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-8">
              <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                <Mic className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                Real-time Transcription
              </h3>
              <p className="text-slate-600">
                Powered by OpenAI Whisper, get accurate live transcription 
                without requiring meeting bots or dial-ins.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-8">
              <div className="w-14 h-14 bg-green-100 rounded-lg flex items-center justify-center mb-6">
                <Brain className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                AI Summarization
              </h3>
              <p className="text-slate-600">
                Automatically generate structured summaries with key takeaways, 
                decisions, and action items.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-8">
              <div className="w-14 h-14 bg-purple-100 rounded-lg flex items-center justify-center mb-6">
                <MessageSquare className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                AI Assistant
              </h3>
              <p className="text-slate-600">
                Query your meeting notes with natural language. 
                "What were the next steps?" - Get instant answers.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-8">
              <div className="w-14 h-14 bg-yellow-100 rounded-lg flex items-center justify-center mb-6">
                <Users className="w-8 h-8 text-yellow-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                Team Collaboration
              </h3>
              <p className="text-slate-600">
                Collaborative workspaces where teammates can review, 
                edit, and tag meeting notes together.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-8">
              <div className="w-14 h-14 bg-red-100 rounded-lg flex items-center justify-center mb-6">
                <Zap className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                Smart Integrations
              </h3>
              <p className="text-slate-600">
                Connect with Slack, Notion, Google Calendar, and email 
                to streamline your workflow.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-8">
              <div className="w-14 h-14 bg-slate-100 rounded-lg flex items-center justify-center mb-6">
                <Shield className="w-8 h-8 text-slate-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                Enterprise Security
              </h3>
              <p className="text-slate-600">
                Role-based access controls, secure data handling, 
                and compliance with enterprise security standards.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-white rounded-2xl shadow-xl p-12">
          <h3 className="text-3xl font-bold text-slate-900 mb-4">
            Ready to Transform Your Meetings?
          </h3>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            Join thousands of teams who are already using MeetingMind to make 
            their meetings more productive and actionable.
          </p>
          <Button 
            onClick={() => window.location.href = '/api/login'}
            size="lg"
            className="bg-primary hover:bg-blue-700 px-12 py-4 text-lg"
          >
            Get Started for Free
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-8 mt-20 border-t border-slate-200">
        <div className="text-center text-slate-500">
          <p>&copy; 2024 MeetingMind. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
