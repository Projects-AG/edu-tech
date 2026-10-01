import { useState, useRef, type DragEvent, type ChangeEvent } from "react";
import { fileApi } from "../api/files";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";

interface UploadResult {
  name: string;
  status: "success" | "error";
  message: string;
}

export default function FileUpload() {
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const newResults: UploadResult[] = [];

    for (const file of Array.from(files)) {
      try {
        await fileApi.upload(file);
        newResults.push({ name: file.name, status: "success", message: "Uploaded successfully" });
      } catch {
        newResults.push({ name: file.name, status: "error", message: "Upload failed" });
      }
    }

    setResults((prev) => [...newResults, ...prev]);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">File Upload</h1>
        <p className="text-sm text-gray-500 mt-1">Upload evidence files for accreditation</p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`bg-white rounded-xl border-2 border-dashed p-12 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-indigo-400 bg-indigo-50"
            : "border-gray-300 hover:border-indigo-300 hover:bg-gray-50"
        }`}
      >
        <Upload size={40} className="mx-auto text-gray-400 mb-4" />
        <p className="text-sm font-medium text-gray-700">
          {uploading ? "Uploading..." : "Click or drag files here to upload"}
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Supports any file type
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e: ChangeEvent<HTMLInputElement>) => handleFiles(e.target.files)}
          disabled={uploading}
        />
      </div>

      {results.length > 0 && (
        <div className="mt-6 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-700">Upload History</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-6 py-3">
                {r.status === "success" ? (
                  <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                ) : (
                  <AlertCircle size={16} className="text-red-500 shrink-0" />
                )}
                <FileText size={14} className="text-gray-400 shrink-0" />
                <span className="text-sm text-gray-900 truncate">{r.name}</span>
                <span className={`text-xs ml-auto shrink-0 ${r.status === "success" ? "text-emerald-600" : "text-red-600"}`}>
                  {r.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
