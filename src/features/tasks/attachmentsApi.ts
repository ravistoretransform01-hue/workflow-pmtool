import axios from "axios"; // Use fresh axios to avoid interceptors with main API auth

export interface AttachmentResponse {
  file_name: string;
  file_url: string;
  file_path: string;
  file_type: string;
  file_size: number;
}

const S3_CONFIG = {
  PRESIGNED_URL_ENDPOINT: "https://ukapxnx0ni.execute-api.ap-south-1.amazonaws.com/default/pm-upload-api",
};

// Internal registry for blob URLs to File objects
const pendingFiles = new Map<string, File>();

export const attachmentsApi = {
  /**
   * Register a local blob URL with its corresponding File object for later upload
   */
  registerPendingFile: (url: string, file: File) => {
    pendingFiles.set(url, file);
  },

  /**
   * Upload files to S3 using presigned URLs
   */
  uploadFiles: async (files: File[]): Promise<AttachmentResponse[]> => {
    try {
      const results: AttachmentResponse[] = [];

      for (const file of files) {
        // 1. Get presigned URL
        const presignedResponse = await axios.get(S3_CONFIG.PRESIGNED_URL_ENDPOINT, {
          params: {
            file_name: file.name,
            file_type: file.type,
          },
        });

        if (!presignedResponse.data.success) {
          throw new Error("Failed to get presigned URL");
        }

        const { presigned_url, file_url, file_name, file_path, file_type } = presignedResponse.data.data;

        // 2. Upload to S3 using PUT
        await axios.put(presigned_url, file, {
          headers: {
            "Content-Type": file.type,
          },
        });

        results.push({
          file_name,
          file_url,
          file_path,
          file_type,
          file_size: file.size,
        });
      }

      return results;
    } catch (error) {
      console.error("Failed to upload files to S3:", error);
      throw error;
    }
  },

  /**
   * Scans HTML for blob: URLs, uploads them, and replaces them with S3 URLs
   */
  uploadAndReplace: async (html: string): Promise<string> => {
    if (!html) return html;

    // Regex to find all blob: URLs in src attributes
    const blobRegex = /src="(blob:.*?)"/g;
    const matches = Array.from(html.matchAll(blobRegex));
    
    if (matches.length === 0) return html;

    let updatedHtml = html;
    
    for (const match of matches) {
      const blobUrl = match[1];
      const file = pendingFiles.get(blobUrl);
      
      if (file) {
        try {
          const uploaded = await attachmentsApi.uploadFiles([file]);
          if (uploaded.length > 0) {
            const s3Url = uploaded[0].file_url;
            // ESCAPE special characters in blobUrl for regex if necessary, 
            // but for safety we can just use replaceAll with the literal string
            updatedHtml = updatedHtml.split(blobUrl).join(s3Url);
            
            // Cleanup: remove from map and revoke blob URL
            pendingFiles.delete(blobUrl);
            URL.revokeObjectURL(blobUrl);
          }
        } catch (error) {
          console.error(`Failed to upload deferred file ${blobUrl}:`, error);
          // Keep the blob URL if upload fails so the user doesn't lose the image
        }
      }
    }

    return updatedHtml;
  },
};
