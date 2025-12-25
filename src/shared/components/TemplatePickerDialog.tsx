import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
// import { supabase } from "@/integrations/supabase/client";
import { FileText, Loader2, Trash2 } from "lucide-react";
// import { useToast } from "@/hooks/use-toast";

interface Template {
  id: string;
  name: string;
  template_type: string;
  created_at: string;
}

interface TemplatePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (templateId: string) => void;
}

export function TemplatePickerDialog({
  open,
  onOpenChange,
  onSelectTemplate,
}: TemplatePickerDialogProps) {
  // const [templates, setTemplates] = useState<Template[]>([]);
  const [templates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // const { toast } = useToast();


  useEffect(() => {
    if (open) {
      loadTemplates();
    }
  }, [open]);

  const loadTemplates = async () => {
    setLoading(true);
    // const { data, error } = await supabase
    //   .from('board_templates')
    //   .select('id, name, template_type, created_at')
    //   .order('created_at', { ascending: false });
    
    // if (!error && data) {
    //   setTemplates(data);
    // }
    setLoading(false);
  };

  // const handleDelete = async (e: React.MouseEvent, templateId: string) => {
  const handleDelete = async ( ) => {
    // e.stopPropagation();
    // const { error } = await supabase
    //   .from('board_templates')
    //   .delete()
    //   .eq('id', templateId);
    
    // if (error) {
    //   toast({
    //     title: "Error",
    //     description: "Failed to delete template",
    //     variant: "destructive",
    //   });
    // } else {
    //   toast({
    //     title: "Success",
    //     description: "Template deleted",
    //   });
    //   setTemplates(prev => prev.filter(t => t.id !== templateId));
    //   if (selectedId === templateId) {
    //     setSelectedId(null);
    //   }
    // }
  };

  const handleUse = () => {
    if (selectedId) {
      onSelectTemplate(selectedId);
      onOpenChange(false);
      setSelectedId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#1e293b] border-[#3e4c63]">
        <DialogHeader>
          <DialogTitle className="text-foreground">Saved Templates</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No templates available. Create a template from an existing board first.
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => setSelectedId(template.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors cursor-pointer ${
                    selectedId === template.id
                      ? "bg-primary/20 border border-primary"
                      : "bg-[#283548] hover:bg-hover border border-transparent"
                  }`}
                >
                  <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground font-medium truncate">{template.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {template.template_type === 'structure' && 'Structure only'}
                      {template.template_type === 'structure-items' && 'Structure & items'}
                      {template.template_type === 'structure-items-updates' && 'Structure, items & updates'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-red-500 flex-shrink-0"
                    // onClick={(e) => handleDelete(e, template.id)}
                    onClick={() => handleDelete()}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="border-[#3e4c63]">
              Close
            </Button>
            <Button 
              onClick={handleUse} 
              disabled={!selectedId}
              className="bg-primary hover:bg-primary/90"
            >
              Use Template
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
