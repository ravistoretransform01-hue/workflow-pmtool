import axios from "@/lib/axios";

export interface AttachmentResponse {
  file_name: string;
  file_url: string;
  file_path: string;
  file_type: string;
  file_size: number;
}

export interface UploadResponse {
  code: number;
  status: string;
  message: string;
  data: AttachmentResponse[];
  errors: any[];
}

const ATTACHMENTS_ENDPOINTS = {
  UPLOAD: "/attachments/upload",
};

export const attachmentsApi = {
  /**
   * Upload files to the server
   */
  uploadFiles: async (files: File[]): Promise<AttachmentResponse[]> => {
    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files[]", file);
      });

      const response = await axios.post<UploadResponse>(
        ATTACHMENTS_ENDPOINTS.UPLOAD,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.status === "success" && Array.isArray(response.data.data)) {
        return response.data.data;
      }

      throw new Error(response.data.message || "Failed to upload files");
    } catch (error) {
      console.error("Failed to upload files:", error);
      throw error;
    }
  },
};
