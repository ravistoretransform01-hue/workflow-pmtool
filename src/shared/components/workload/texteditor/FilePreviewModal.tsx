import React from "react";
import { Dialog, DialogContent } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { ExternalLink, X, FileText } from "lucide-react";

interface FilePreviewModalProps {
  src: string | null;
  isOpen: boolean;
  onClose: () => void;
  fileName?: string;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  src,
  isOpen,
  onClose,
  fileName,
}) => {
  if (!src) return null;

  const isPdf =
    src.toLowerCase().endsWith(".pdf") ||
    (src.startsWith("blob:") &&
      (fileName?.toLowerCase().endsWith(".pdf") || fileName?.includes("📄")));

  const handleDownload = () => {
    window.open(src, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden border-none bg-transparent shadow-none">
        <div className="relative w-full h-[90vh] flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-lg overflow-hidden">
          {/* Controls Overlay */}
          <div className="absolute top-4 right-4 z-[60] flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="bg-background/20 backdrop-blur-md border-white/20 text-white hover:bg-background/40 h-9 w-9"
              onClick={handleDownload}
              title="Open in new tab"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="bg-background/20 backdrop-blur-md border-white/20 text-white hover:bg-background/40 h-9 w-9"
              onClick={onClose}
              title="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content Container */}
          <div className="w-full h-full p-4 flex items-center justify-center overflow-auto">
            {isPdf ? (
              <iframe
                src={src}
                className="w-full h-full rounded-sm shadow-2xl bg-white"
                title="PDF Preview"
              />
            ) : (
              <img
                src={src}
                alt="Preview"
                className="max-w-full max-h-[85vh] object-contain shadow-2xl rounded-sm transition-transform duration-300"
              />
            )}
          </div>

          {/* Bottom Info */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 backdrop-blur-md rounded-full text-white text-xs font-medium flex items-center gap-2">
            {isPdf ? <FileText className="h-3 w-3" /> : null}
            {isPdf ? "PDF Preview" : "Image Preview"}
            {fileName && (
              <span className="opacity-70 ml-1 border-l border-white/20 pl-2">
                {fileName}
              </span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
