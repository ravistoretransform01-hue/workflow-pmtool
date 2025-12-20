import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Sparkles, MessageSquare, Star, Send, Loader2, Play, Pause, Camera, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Task {
  id: string;
  title: string;
  description?: string;
  client_summary?: string;
  project_name?: string;
  priority: string;
  status: string;
  deadline?: string;
  created_at: string;
}

interface Comment {
  id: string;
  comment: string;
  created_at: string;
  user_id: string;
}

interface TrackingSession {
  id: string;
  start_time: string;
  end_time: string | null;
  total_seconds: number | null;
}

interface Screenshot {
  id: string;
  screenshot_url: string;
  captured_at: string;
}

interface TaskDetailDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDetailDialog({ task, open, onOpenChange }: TaskDetailDialogProps) {
  const { toast } = useToast();
  const [aiSuggestions, setAiSuggestions] = useState<string>("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [rating, setRating] = useState(0);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  
  // Time tracking states
  const [isTracking, setIsTracking] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [trackingSessions, setTrackingSessions] = useState<TrackingSession[]>([]);
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const timerRef = useRef<number | null>(null);
  const screenshotIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (task && open) {
      fetchComments();
      fetchAISuggestions();
      fetchTrackingSessions();
      fetchScreenshots();
      checkActiveSession();
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (screenshotIntervalRef.current) clearInterval(screenshotIntervalRef.current);
    };
  }, [task, open]);

  useEffect(() => {
    if (isTracking) {
      timerRef.current = window.setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);

      // Screenshot every 5-10 minutes randomly
      const scheduleNextScreenshot = () => {
        const randomDelay = Math.random() * (600000 - 300000) + 300000; // 5-10 min
        screenshotIntervalRef.current = window.setTimeout(() => {
          captureScreenshot();
          scheduleNextScreenshot();
        }, randomDelay);
      };
      scheduleNextScreenshot();
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (screenshotIntervalRef.current) {
        clearTimeout(screenshotIntervalRef.current);
        screenshotIntervalRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (screenshotIntervalRef.current) clearTimeout(screenshotIntervalRef.current);
    };
  }, [isTracking]);

  const checkActiveSession = async () => {
    if (!task) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('time_tracking_sessions')
        .select('*')
        .eq('task_id', task.id)
        .eq('user_id', user.id)
        .is('end_time', null)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCurrentSessionId(data.id);
        setIsTracking(true);
        const startTime = new Date(data.start_time).getTime();
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setElapsedTime(elapsed);
      }
    } catch (error) {
      console.error('Error checking active session:', error);
    }
  };

  const fetchTrackingSessions = async () => {
    if (!task) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('time_tracking_sessions')
        .select('*')
        .eq('task_id', task.id)
        .eq('user_id', user.id)
        .order('start_time', { ascending: false });

      if (error) throw error;
      setTrackingSessions(data || []);
    } catch (error) {
      console.error('Error fetching tracking sessions:', error);
    }
  };

  const fetchScreenshots = async () => {
    if (!task) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('task_screenshots')
        .select('*')
        .eq('task_id', task.id)
        .eq('user_id', user.id)
        .order('captured_at', { ascending: false });

      if (error) throw error;
      setScreenshots(data || []);
    } catch (error) {
      console.error('Error fetching screenshots:', error);
    }
  };

  const startTracking = async () => {
    if (!task) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to track time",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from('time_tracking_sessions')
        .insert({
          task_id: task.id,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentSessionId(data.id);
      setIsTracking(true);
      setElapsedTime(0);
      
      toast({
        title: "Time tracking started",
        description: "Your work time is being tracked. Screenshots will be captured periodically.",
      });
    } catch (error) {
      console.error('Error starting tracking:', error);
      toast({
        title: "Error",
        description: "Failed to start time tracking",
        variant: "destructive",
      });
    }
  };

  const stopTracking = async () => {
    if (!currentSessionId) return;

    try {
      const { error } = await supabase
        .from('time_tracking_sessions')
        .update({
          end_time: new Date().toISOString(),
          total_seconds: elapsedTime,
        })
        .eq('id', currentSessionId);

      if (error) throw error;

      setIsTracking(false);
      setCurrentSessionId(null);
      setElapsedTime(0);
      fetchTrackingSessions();

      toast({
        title: "Time tracking stopped",
        description: `Logged ${formatTime(elapsedTime)} of work time`,
      });
    } catch (error) {
      console.error('Error stopping tracking:', error);
      toast({
        title: "Error",
        description: "Failed to stop time tracking",
        variant: "destructive",
      });
    }
  };

  const captureScreenshot = async () => {
    if (!task || !currentSessionId) return;

    try {
      // Request screen capture permission
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true
      });

      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      // Wait for video to be ready
      await new Promise(resolve => {
        video.onloadedmetadata = resolve;
      });

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        
        // Convert to blob
        canvas.toBlob(async (blob) => {
          if (blob) {
            // In a real app, upload to storage bucket
            // For now, convert to data URL and store
            const reader = new FileReader();
            reader.onloadend = async () => {
              const dataUrl = reader.result as string;
              
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) return;

              await supabase
                .from('task_screenshots')
                .insert({
                  session_id: currentSessionId,
                  task_id: task.id,
                  user_id: user.id,
                  screenshot_url: dataUrl,
                });

              fetchScreenshots();
            };
            reader.readAsDataURL(blob);
          }
        }, 'image/png');
      }

      // Stop the stream
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      // Don't show error toast for screenshot failures as they might be due to user denial
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTotalTrackedTime = () => {
    return trackingSessions.reduce((total, session) => {
      return total + (session.total_seconds || 0);
    }, 0);
  };

  const fetchAISuggestions = async () => {
    if (!task) return;
    
    setLoadingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('task-ai-suggestions', {
        body: {
          taskTitle: task.title,
          taskDescription: task.description,
          clientSummary: task.client_summary,
        },
      });

      if (error) throw error;
      setAiSuggestions(data.suggestions);
    } catch (error) {
      console.error('Error fetching AI suggestions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch AI suggestions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingAI(false);
    }
  };

  const fetchComments = async () => {
    if (!task) return;

    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', task.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    if (!task || !newComment.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to comment",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('task_comments')
        .insert({
          task_id: task.id,
          user_id: user.id,
          comment: newComment.trim(),
        });

      if (error) throw error;

      setNewComment("");
      fetchComments();
      toast({
        title: "Success",
        description: "Comment added successfully. Client will be notified.",
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSubmitFeedback = async () => {
    if (!task || rating === 0) {
      toast({
        title: "Error",
        description: "Please select a rating before submitting feedback",
        variant: "destructive",
      });
      return;
    }

    setSubmittingFeedback(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to submit feedback",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('task_feedback')
        .insert({
          task_id: task.id,
          developer_id: user.id,
          client_id: user.id,
          rating,
          feedback_text: feedbackText.trim() || null,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Feedback submitted successfully. Developer rating has been updated.",
      });
      setRating(0);
      setFeedbackText("");
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (!task) return null;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "high":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "medium":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "low":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">{task.title}</DialogTitle>
          <div className="flex items-center gap-3 mt-2">
            <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
            <Badge variant="outline">{task.status}</Badge>
            {task.project_name && <span className="text-sm text-muted-foreground">{task.project_name}</span>}
            {task.deadline && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(task.deadline).toLocaleDateString()}
              </span>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {/* Time Tracking Section */}
            <Card className="bg-gradient-to-br from-green-500/10 to-blue-500/10 border-green-500/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-5 w-5 text-green-500" />
                  Time Tracking
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold font-mono">{formatTime(elapsedTime)}</p>
                    <p className="text-sm text-muted-foreground">Current session</p>
                  </div>
                  <Button
                    size="lg"
                    onClick={isTracking ? stopTracking : startTracking}
                    variant={isTracking ? "destructive" : "default"}
                  >
                    {isTracking ? (
                      <>
                        <Pause className="h-4 w-4 mr-2" />
                        Stop Tracking
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Start Tracking
                      </>
                    )}
                  </Button>
                </div>

                {isTracking && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                    <p className="text-sm text-green-400 flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      Screenshots will be captured automatically at random intervals (5-10 minutes)
                    </p>
                  </div>
                )}

                {trackingSessions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Total time: {formatTime(getTotalTrackedTime())}</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {trackingSessions.slice(0, 5).map((session) => (
                        <div key={session.id} className="text-xs text-muted-foreground flex justify-between">
                          <span>{format(new Date(session.start_time), 'MMM dd, HH:mm')}</span>
                          <span>{session.total_seconds ? formatTime(session.total_seconds) : 'In progress'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Screenshots Gallery */}
            {screenshots.length > 0 && (
              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Screenshots ({screenshots.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-48">
                    <div className="grid grid-cols-3 gap-2">
                      {screenshots.map((screenshot) => (
                        <div key={screenshot.id} className="relative group">
                          <img
                            src={screenshot.screenshot_url}
                            alt="Task screenshot"
                            className="w-full h-24 object-cover rounded-lg border border-border"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                            <p className="text-xs text-white text-center px-2">
                              {format(new Date(screenshot.captured_at), 'MMM dd, HH:mm')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Description */}
            {task.description && (
              <div>
                <h3 className="font-semibold text-foreground mb-2">Description</h3>
                <p className="text-muted-foreground">{task.description}</p>
              </div>
            )}

            {/* Client Summary */}
            {task.client_summary && (
              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle className="text-base">Client Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground">{task.client_summary}</p>
                </CardContent>
              </Card>
            )}

            {/* AI Suggestions */}
            <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI-Generated Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingAI ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating suggestions...
                  </div>
                ) : aiSuggestions ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap text-foreground font-sans">{aiSuggestions}</pre>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No suggestions available</p>
                )}
              </CardContent>
            </Card>

            {/* Comments Section */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Comments & Updates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingComments ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading comments...
                  </div>
                ) : comments.length > 0 ? (
                  <div className="space-y-3">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>U</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm text-foreground">{comment.comment}</p>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No comments yet</p>
                )}

                <Separator />

                <div className="space-y-2">
                  <Textarea
                    placeholder="Write an update for the client..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <Button onClick={handleAddComment} size="sm" className="w-full">
                    <Send className="h-4 w-4 mr-2" />
                    Send Update to Client
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Feedback Section (only shown for completed tasks) */}
            {task.status === 'done' && (
              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Client Feedback & Rating
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Rate this task completion:</p>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setRating(star)}
                          className="focus:outline-none"
                        >
                          <Star
                            className={`h-8 w-8 transition-colors ${
                              star <= rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-600 hover:text-yellow-400"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <Textarea
                    placeholder="Share your feedback (optional)..."
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <Button
                    onClick={handleSubmitFeedback}
                    disabled={submittingFeedback || rating === 0}
                    className="w-full"
                  >
                    {submittingFeedback ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Feedback"
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
