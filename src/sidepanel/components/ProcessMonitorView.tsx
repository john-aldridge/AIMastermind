import React, { useState, useEffect } from 'react';
import { MessageType } from '@/utils/messaging';
import type { RegisteredProcess } from '@/types/processRegistry';

export const ProcessMonitorView: React.FC = () => {
  const [processes, setProcesses] = useState<RegisteredProcess[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadProcesses();
    const interval = setInterval(loadProcesses, 2000); // Auto-refresh every 2 seconds
    return () => clearInterval(interval);
  }, []);

  const loadProcesses = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;

      const response = await chrome.tabs.sendMessage(tab.id, {
        type: MessageType.LIST_PROCESSES,
      });

      if (response.success) {
        setProcesses(response.data || []);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Failed to load processes:', error);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleStopProcess = async (processId: string) => {
    try {
      setLoading(true);
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;

      const response = await chrome.tabs.sendMessage(tab.id, {
        type: MessageType.STOP_PROCESS,
        payload: { processId },
      });

      if (response.success) {
        showNotification('success', 'Process stopped successfully');
        await loadProcesses();
      } else {
        showNotification('error', 'Failed to stop process');
      }
    } catch (error) {
      showNotification('error', 'Failed to stop process: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleStopAgentProcesses = async (agentId: string) => {
    if (!confirm(`Stop all processes for agent "${agentId}"?`)) return;

    try {
      setLoading(true);
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;

      const response = await chrome.tabs.sendMessage(tab.id, {
        type: MessageType.STOP_AGENT_PROCESSES,
        payload: { agentId },
      });

      if (response.success) {
        showNotification('success', `Stopped ${response.data.stoppedCount} process(es)`);
        await loadProcesses();
      } else {
        showNotification('error', 'Failed to stop agent processes');
      }
    } catch (error) {
      showNotification('error', 'Failed to stop agent processes');
    } finally {
      setLoading(false);
    }
  };

  const handleStopAll = async () => {
    if (!confirm('Stop ALL active processes on this page?')) return;

    try {
      setLoading(true);
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;

      const response = await chrome.tabs.sendMessage(tab.id, {
        type: MessageType.STOP_ALL_PROCESSES,
      });

      if (response.success) {
        showNotification('success', `Stopped ${response.data.stoppedCount} process(es)`);
        await loadProcesses();
      } else {
        showNotification('error', 'Failed to stop all processes');
      }
    } catch (error) {
      showNotification('error', 'Failed to stop all processes');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (startTime: number) => {
    const seconds = Math.floor((Date.now() - startTime) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  const getProcessIcon = (type: string) => {
    switch (type) {
      case 'mutation-observer':
        return '👁️';
      case 'interval':
        return '⏱️';
      case 'timeout':
        return '⏰';
      case 'event-listener':
        return '👂';
      case 'websocket':
        return '🔌';
      case 'intersection-observer':
        return '🔍';
      case 'animation-frame':
        return '🎬';
      default:
        return '⚙️';
    }
  };

  const groupedProcesses = processes.reduce((acc, proc) => {
    if (!acc[proc.agentId]) {
      acc[proc.agentId] = [];
    }
    acc[proc.agentId].push(proc);
    return acc;
  }, {} as Record<string, RegisteredProcess[]>);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white`}
        >
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Active Processes</h2>
            <p className="text-sm text-gray-600 mt-1">
              Monitor and manage long-running agent processes on this page
            </p>
            {lastUpdate && (
              <p className="text-xs text-gray-500 mt-1">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadProcesses}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
            {processes.length > 0 && (
              <button
                onClick={handleStopAll}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Stop All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Process List */}
      <div className="flex-1 overflow-auto p-4">
        {processes.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-2">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-gray-500 mb-4">No active processes on this page</p>
            <p className="text-sm text-gray-400">
              Processes will appear here when agents start long-running operations
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedProcesses).map(([agentId, agentProcesses]) => (
              <div key={agentId} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Agent Header */}
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{agentId}</h3>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {agentProcesses.length} active process{agentProcesses.length !== 1 ? 'es' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => handleStopAgentProcesses(agentId)}
                    disabled={loading}
                    className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    Stop All
                  </button>
                </div>

                {/* Processes */}
                <div className="divide-y divide-gray-200">
                  {agentProcesses.map((proc, idx) => (
                    <div key={idx} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl">{getProcessIcon(proc.type)}</span>
                            <div>
                              <p className="font-medium text-gray-900">{proc.capabilityName}</p>
                              <p className="text-xs text-gray-500">
                                {proc.type.replace('-', ' ')} • Running for {formatDuration(proc.metadata?.startTime || proc.registeredAt)}
                              </p>
                            </div>
                          </div>
                          {proc.metadata?.description && (
                            <p className="text-sm text-gray-600 ml-9 mt-1">{proc.metadata.description}</p>
                          )}
                          {proc.metadata?.target && (
                            <p className="text-xs text-gray-500 ml-9 mt-0.5">
                              Target: <code className="bg-gray-100 px-1 py-0.5 rounded">{proc.metadata.target}</code>
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleStopProcess(proc.id)}
                          disabled={loading}
                          className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          title="Stop this process"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
