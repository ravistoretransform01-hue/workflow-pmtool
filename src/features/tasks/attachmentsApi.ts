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

export const attachmentsApi = {
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
};
