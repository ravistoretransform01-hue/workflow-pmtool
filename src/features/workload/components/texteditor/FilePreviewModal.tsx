import React from "react";
import { Dialog, DialogContent } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
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

  const isDocx =
    src.toLowerCase().endsWith(".docx") ||
    src.toLowerCase().endsWith(".doc") ||
    (src.startsWith("blob:") &&
      (fileName?.toLowerCase().endsWith(".docx") ||
        fileName?.toLowerCase().endsWith(".doc") ||
        fileName?.includes("📝")));

  const handleDownload = () => {
    window.open(src, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        hideCloseButton
        className="max-w-[95vw] max-h-[95vh] p-0 overflow-visible border-none bg-transparent shadow-none"
      >
        <div className="relative w-full h-[90vh] flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-lg overflow-hidden">
          {/* Content Container */}
          <div className="w-full h-full p-4 flex items-center justify-center overflow-auto">
            {isPdf ? (
              <iframe
                src={src}
                className="w-full h-full rounded-sm shadow-2xl bg-white"
                title="PDF Preview"
              />
            ) : isDocx ? (
              <div className="flex flex-col items-center justify-center gap-6 p-12 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl max-w-md w-full text-center">
                <div className="w-20 h-20 bg-blue-500/20 rounded-2xl flex items-center justify-center ring-1 ring-blue-500/50">
                  <FileText className="h-10 w-10 text-blue-400" />
                </div>
                <div className="space-y-2">
                  {/* <h3 className="text-xl font-semibold text-white">
                    Word Document
                  </h3> */}
                  <p className="text-sm text-white/60">
                    {fileName || "Document.docx"}
                  </p>
                  <p className="text-xs text-white/40 mt-4 leading-relaxed">
                    Previews for Word documents are not supported directly in
                    the browser. Please download the file to view its contents.
                  </p>
                </div>
                <Button
                  onClick={handleDownload}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-11 rounded-lg transition-all shadow-lg hover:shadow-blue-500/20"
                >
                  Download Document
                </Button>
              </div>
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
            {isDocx ? <FileText className="h-3 w-3 text-blue-400" /> : null}
            {isPdf ? "PDF Preview" : isDocx ? "Word Document" : "Image Preview"}
            {fileName && (
              <span className="opacity-70 ml-1 border-l border-white/20 pl-2">
                {fileName}
              </span>
            )}
          </div>
        </div>

        {/* Controls Overlay - Positioned outside the main container */}
        <div className="absolute -top-12 right-0 z-[60] flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="bg-black/40 backdrop-blur-md border-white/20 text-white hover:bg-black/60 h-9 w-9 rounded-full shadow-lg"
            onClick={handleDownload}
            title="Open in new tab"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="bg-black/40 backdrop-blur-md border-white/20 text-white hover:bg-black/60 h-9 w-9 rounded-full shadow-lg"
            onClick={onClose}
            title="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
