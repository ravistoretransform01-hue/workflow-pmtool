import { useState, useRef } from "react";
import { Button } from "@/shared/components/ui/button";
import { Paperclip, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { attachmentsApi } from "@/features/tasks/attachmentsApi";

interface FileUploadDropdownProps {
  onFileSelect?: (fileInfo: {
    name: string;
    size: number;
    type: string;
    url: string;
  }) => void;
}

export function FileUploadDropdown({ onFileSelect }: FileUploadDropdownProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const uploadedFiles = await attachmentsApi.uploadFiles([file]);

      if (uploadedFiles.length > 0 && onFileSelect) {
        const uploadedFile = uploadedFiles[0];
        onFileSelect({
          name: uploadedFile.file_name,
          size: uploadedFile.file_size,
          type: uploadedFile.file_type,
          url: uploadedFile.file_url,
        });
      }

      toast.success("File Uploaded Successfully");
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to Upload File");
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = "";
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileInputChange}
        disabled={uploading}
      />

      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2 text-xs gap-1"
        onClick={() => fileInputRef.current?.click()}
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
