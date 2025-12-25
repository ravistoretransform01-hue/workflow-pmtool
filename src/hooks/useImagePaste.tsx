import { useEffect } from "react";

interface UseImagePasteProps {
  onImagePaste: (imageDataUrl: string) => void;
  enabled?: boolean;
}

export function useImagePaste({ onImagePaste, enabled = true }: UseImagePasteProps) {
  useEffect(() => {
    if (!enabled) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        if (item.type.indexOf("image") !== -1) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const imageDataUrl = event.target?.result as string;
              onImagePaste(imageDataUrl);
            };
            reader.readAsDataURL(file);
          }
        }
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [onImagePaste, enabled]);
}
