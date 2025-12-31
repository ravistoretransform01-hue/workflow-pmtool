import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu";
import { Paperclip, Loader2 } from "lucide-react";
// import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FileUploadDropdownProps {
  onFileSelect?: (fileInfo: { name: string; size: number; type: string; url: string }) => void;
}

export function FileUploadDropdown({ onFileSelect }: FileUploadDropdownProps) {
  const [uploading, setUploading] = useState(false);

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // // Generate unique file path
      // const fileExt = file.name.split('.').pop();
      // const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      // const filePath = fileName;

      // // Upload to Supabase Storage
      // const { data, error } = await supabase.storage
      //   .from('update-files')
      //   .upload(filePath, file, {
      //     cacheControl: '3600',
      //     upsert: false
      //   });

      // if (error) throw error;

      // // Get public URL
      // const { data: { publicUrl } } = supabase.storage
      //   .from('update-files')
      //   .getPublicUrl(filePath);

      // // Call callback with file info
      // if (onFileSelect) {
      //   onFileSelect({
      //     name: file.name,
      //     size: file.size,
      //     type: file.type,
      //     url: publicUrl
      //   });
      // }

      toast.success('File uploaded successfully');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  return (
    <>
      <input
        type="file"
        id="computer-file-upload"
        className="hidden"
        onChange={handleFileInputChange}
        disabled={uploading}
      />
      
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-8 px-2 text-xs gap-1"
        onClick={() => document.getElementById('computer-file-upload')?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Paperclip className="h-4 w-4" />
            Add files
          </>
        )}
      </Button>
    </>
  );
}
