import React, { useState, useEffect } from 'react';
import { sendToBackground } from '@/utils/messaging';
import { MessageType } from '@/utils/messaging';

interface DownloadInfo {
  id: number;
  filePath: string;  // Full path to the downloaded file
  url: string;
  fileSize: number;
  mime: string;
  downloadTime: number;
}

interface FileAnalysisProps {
  onFileSelected: (filename: string, content: string, fileInfo: DownloadInfo) => void;
  onClose: () => void;
}

export const FileAnalysis: React.FC<FileAnalysisProps> = ({ onFileSelected, onClose }) => {
  const [recentDownloads, setRecentDownloads] = useState<DownloadInfo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRecentDownloads();
  }, []);

  const loadRecentDownloads = async () => {
    const response = await sendToBackground({ type: MessageType.GET_RECENT_DOWNLOADS });
    if (response.success && response.data) {
      setRecentDownloads(response.data);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);

    try {
      let content = '';

      // Handle different file types
      if (file.type.startsWith('text/') || file.type === 'application/json') {
        content = await file.text();
      } else if (file.type === 'application/pdf') {
        content = '[PDF file - content extraction not yet supported]';
      } else if (file.type.startsWith('image/')) {
        content = '[Image file - visual analysis not yet supported]';
      } else {
        content = `[${file.type || 'Unknown'} file - content extraction not yet supported]`;
      }

      // Create a pseudo-DownloadInfo for manually selected files
      const fileInfo: DownloadInfo = {
        id: Date.now(),
        filePath: file.name,  // For manually selected files, we only have the name
        url: '',
        fileSize: file.size,
        mime: file.type,
        downloadTime: Date.now()
      };

      onFileSelected(file.name, content, fileInfo);
    } catch (error) {
      console.error('Error reading file:', error);
      alert(`Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getFilename = (filePath: string): string => {
    // Extract filename from full path (handles both Windows and Unix paths)
    return filePath.split(/[\\/]/).pop() || filePath;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Analyze File with AI</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Manual File Selection */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Select a File</h3>
            <label className="block">
              <input
                type="file"
                onChange={handleFileSelect}
                disabled={loading}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary-50 file:text-primary-700
                  hover:file:bg-primary-100
                  disabled:opacity-50 disabled:cursor-not-allowed
                  cursor-pointer"
              />
            </label>
            <p className="text-xs text-gray-500 mt-2">
              Supported: Text files, JSON, CSV, and more
            </p>
          </div>

          {/* Recent Downloads */}
          {recentDownloads.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Recent Downloads</h3>
              <div className="space-y-2">
                {recentDownloads.map((download) => (
                  <div
                    key={download.id}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 break-words">
                          {getFilename(download.filePath)}
                        </p>
                        <p className="text-xs text-gray-600 break-all mt-1 font-mono">
                          {download.filePath}
                        </p>
                        <p className="text-xs text-gray-500 mt-1.5">
                          {formatFileSize(download.fileSize)} • {formatTime(download.downloadTime)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-900">
                  <strong>Note:</strong> For security, Chrome requires you to manually select files using the file picker above.
                  Use the paths above to locate your downloaded files.
                </p>
              </div>
            </div>
          )}

          {recentDownloads.length === 0 && (
            <div className="text-center py-8">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-gray-500">No recent downloads</p>
              <p className="text-xs text-gray-400 mt-1">Use the file picker above to select a file</p>
            </div>
          )}
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-3"></div>
              <p className="text-sm text-gray-600">Reading file...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
