import { useState, useCallback, useRef, type DragEvent, type ChangeEvent } from "react";
import type { ConnectionError, CredentialUploadProps } from "@/types";
import { parseCredentialFile } from "@/services/credentials/parser";
import { LoadingSpinner } from "@/components/LoadingSpinner";

/**
 * Credential upload component with drag-and-drop support
 */
export function CredentialUpload({ onCredentialLoaded, onError, disabled }: CredentialUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<ConnectionError | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setIsProcessing(true);
      setError(null);

      const result = await parseCredentialFile(file);

      setIsProcessing(false);

      if (result.success) {
        onCredentialLoaded(result.credential);
      } else {
        setError(result.error);
        onError(result.error);
      }
    },
    [onCredentialLoaded, onError]
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled || isProcessing) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        await handleFile(files[0]);
      }
    },
    [disabled, isProcessing, handleFile]
  );

  const handleFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        await handleFile(files[0]);
      }
      // Reset input to allow re-selecting same file
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [handleFile]
  );

  const handleClick = useCallback(() => {
    if (!disabled && !isProcessing) {
      fileInputRef.current?.click();
    }
  }, [disabled, isProcessing]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  return (
    <div className="w-full max-w-md">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative flex flex-col items-center justify-center
          rounded-lg border-2 border-dashed p-8
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${
            disabled
              ? "cursor-not-allowed border-gray-200 bg-gray-50"
              : isDragging
                ? "cursor-copy border-blue-500 bg-blue-50"
                : "cursor-pointer border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50"
          }
          ${error ? "border-red-300" : ""}
        `}
        aria-label="Upload credential file"
        aria-disabled={disabled}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".creds"
          onChange={handleFileChange}
          disabled={disabled || isProcessing}
          className="hidden"
          aria-hidden="true"
        />

        {isProcessing ? (
          <LoadingSpinner size="md" text="Processing credential file..." />
        ) : (
          <>
            <svg
              className={`mb-3 h-10 w-10 ${disabled ? "text-gray-300" : "text-gray-400"}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className={`text-sm ${disabled ? "text-gray-400" : "text-gray-600"}`}>
              {isDragging ? (
                <span className="font-medium text-blue-600">Drop your .creds file here</span>
              ) : (
                <>
                  <span className="font-medium">Click to upload</span> or drag and drop
                </>
              )}
            </p>
            <p className={`mt-1 text-xs ${disabled ? "text-gray-300" : "text-gray-500"}`}>
              .creds file only
            </p>
          </>
        )}
      </div>

      {error && (
        <div
          className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700"
          role="alert"
          aria-live="polite"
        >
          {error.userMessage}
        </div>
      )}
    </div>
  );
}

export { CredentialUpload as default };
