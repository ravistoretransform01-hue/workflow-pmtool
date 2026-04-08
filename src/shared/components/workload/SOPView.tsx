import React, { useEffect, useState } from "react";
import { tasksApi } from "@/features/tasks/tasksApi";
import type { BoardSOP } from "@/features/tasks/types";
import { format, parseISO } from "date-fns";
import { renderFormattedContent } from "./TaskUpdates/utils";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { FileText, Search } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Input } from "@/shared/components/ui/input";
import { ChevronDown, ChevronUp } from "lucide-react";

interface SOPViewProps {
  boardId: string | number;
  onTaskClick?: (taskId: string) => void;
}

export const SOPView: React.FC<SOPViewProps> = ({ boardId, onTaskClick }) => {
  const [sops, setSops] = useState<BoardSOP[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSops, setExpandedSops] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number) => {
    setExpandedSops(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  useEffect(() => {
    const fetchSOPs = async () => {
      setIsLoading(true);
      try {
        const data = await tasksApi.getBoardSOPs(boardId);
        setSops(data);
      } catch (error) {
        console.error("Failed to fetch SOPs:", error);
        toast.error("Failed to load SOPs");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSOPs();
  }, [boardId]);

  const filteredSops = sops.filter(sop => 
    sop.task_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sop.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sop.user_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex-1 p-6 space-y-6 overflow-auto bg-background/30">
        <div className="space-y-6">
          <Skeleton className="h-12 w-64 mb-8" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/50 dark:bg-slate-950/20">
      <div className="px-6 py-6 border-b border-border bg-background/60 backdrop-blur-md sticky top-0 z-20 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-xl ring-1 ring-primary/20 shadow-inner">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">SOP Updates</h2>
              <p className="text-sm text-muted-foreground font-medium">Standard Operating Procedures</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground mr-1" />
              <Input 
                placeholder="Search SOPs..." 
                className="pl-9 bg-background/50 border-border/50 focus:border-primary/50 transition-all rounded-lg h-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Badge variant="secondary" className="px-4 py-1.5 h-10 rounded-lg bg-primary/5 text-primary border-primary/10 font-bold text-sm shadow-sm shrink-0">
              {filteredSops.length} {filteredSops.length === 1 ? 'Entry' : 'Entries'}
            </Badge>
          </div>
        </div>
      </div>

      {filteredSops.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-6 bg-background/20">
          <div className="bg-muted/30 p-8 rounded-full mb-6 border border-border/50 shadow-inner">
            <FileText className="h-16 w-16 opacity-20" />
          </div>
          <h3 className="text-xl font-semibold text-foreground/70">No SOPs matched</h3>
          <p className="max-w-xs text-center mt-2">Try adjusting your search terms or mark comments as SOP to see them here.</p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="px-6 py-8 space-y-10 pb-32">
            {filteredSops.map((sop) => {
              const isExpanded = expandedSops.has(sop.id);
              
              return (
                <Card key={sop.id} className="border-border/60 bg-card shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden group">
                  <CardHeader className="p-4 bg-slate-50/80 dark:bg-slate-900/40 border-b border-border/40">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
                        {getInitials(sop.user_name)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
                          <span className="font-bold text-foreground text-base">{sop.user_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(parseISO(sop.created_at), "M/d/yyyy, h:mm:ss a")}
                          </span>
                          <Badge variant="secondary" className="ml-auto text-[10px] py-0 px-2 h-5 bg-primary/10 text-primary border-primary/20">SOP</Badge>
                        </div>
                        
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                          <span className="opacity-70">From:</span>
                          <button 
                            onClick={() => onTaskClick?.(String(sop.task_id))}
                            className="font-bold text-foreground hover:underline decoration-primary/30 underline-offset-2"
                          >
                            {sop.task_name}
                          </button>
                        </div>
                      </div>

                      <button 
                        onClick={() => toggleExpand(sop.id)}
                        className="p-1 hover:bg-muted rounded-full transition-colors self-center ml-2"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="px-6 py-6 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none 
                        prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-p:leading-relaxed
                        prose-headings:text-slate-800 dark:prose-headings:text-slate-200 prose-headings:font-bold
                        prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                        prose-strong:text-slate-900 dark:prose-strong:text-slate-50
                        prose-img:rounded-xl prose-img:shadow-md prose-img:my-6
                        prose-ul:my-4 prose-li:my-1 prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:rounded-lg prose-pre:p-4">
                        <div dangerouslySetInnerHTML={renderFormattedContent(sop.content)} />
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};
