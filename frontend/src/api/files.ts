import api from "./axios";

export interface FileUploadRecord {
  id: string;
  institution_id: string;
  uploaded_by_id: string;
  file_name: string;
  storage_key: string;
  mime_type: string;
  size_bytes: number;
  checksum: string;
  created_at: string;
}

export const fileApi = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post<FileUploadRecord>("/files/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};
