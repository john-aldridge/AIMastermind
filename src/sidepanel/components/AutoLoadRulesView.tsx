import React, { useState, useEffect } from 'react';
import { AutoLoadRuleStorageService } from '@/storage/autoLoadRuleStorage';
import { AddRuleModal } from './AddRuleModal';
import type { AutoLoadRule } from '@/types/autoLoadRule';

export const AutoLoadRulesView: React.FC = () => {
  const [rules, setRules] = useState<AutoLoadRule[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutoLoadRule | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    const allRules = await AutoLoadRuleStorageService.getAllRules();
    setRules(allRules);
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCreateRule = async (
    agentId: string,
    agentName: string,
    urlPattern: string,
    description?: string,
    executeOnLoad?: boolean,
    watchForReloads?: boolean,
    capabilityName?: string,
    parameters?: Record<string, any>
  ) => {
    try {
      await AutoLoadRuleStorageService.createRule(
        agentId,
        agentName,
        urlPattern,
        description,
        executeOnLoad,
        watchForReloads,
        capabilityName,
        undefined, // reloadCapabilityName - defaults to capabilityName
        parameters
      );
      await loadRules();
      showNotification('success', 'Rule created successfully');
    } catch (error) {
      showNotification('error', 'Failed to create rule: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleUpdateRule = async (
    agentId: string,
    agentName: string,
    urlPattern: string,
    description?: string,
    executeOnLoad?: boolean,
    watchForReloads?: boolean,
    capabilityName?: string,
    parameters?: Record<string, any>
  ) => {
    if (!editingRule) return;

    try {
      await AutoLoadRuleStorageService.updateRule(editingRule.id, {
        agentId,
        agentName,
        urlPattern,
        description,
        executeOnLoad,
        watchForReloads,
        capabilityName,
        parameters,
      });
      await loadRules();
      setEditingRule(null);
      showNotification('success', 'Rule updated successfully');
    } catch (error) {
      showNotification('error', 'Failed to update rule: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      await AutoLoadRuleStorageService.deleteRule(ruleId);
      await loadRules();
      showNotification('success', 'Rule deleted successfully');
    } catch (error) {
      showNotification('error', 'Failed to delete rule: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleToggleStatus = async (ruleId: string) => {
    try {
      await AutoLoadRuleStorageService.toggleRuleStatus(ruleId);
      await loadRules();
    } catch (error) {
      showNotification('error', 'Failed to toggle rule status');
    }
  };

  const handleTestPattern = async (rule: AutoLoadRule) => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url) {
        alert('No active tab found');
        return;
      }

      const matches = AutoLoadRuleStorageService.matchesPattern(tab.url, rule.urlPattern);
      alert(
        matches
          ? `✓ Pattern matches current page!\n\nURL: ${tab.url}\nPattern: ${rule.urlPattern}`
          : `✗ Pattern does not match current page.\n\nURL: ${tab.url}\nPattern: ${rule.urlPattern}`
      );
    } catch (error) {
      showNotification('error', 'Failed to test pattern');
    }
  };

  const filteredRules = rules.filter(
    (rule) =>
      rule.agentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.urlPattern.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <h2 className="text-xl font-bold text-gray-800">Auto-Load Rules</h2>
            <p className="text-sm text-gray-600 mt-1">
              Automatically activate agents when visiting specific URLs
            </p>
          </div>
          <button
            onClick={() => {
              setEditingRule(null);
              setIsAddModalOpen(true);
            }}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Rule
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search rules by agent, URL pattern, or description..."
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <svg
            className="w-5 h-5 absolute left-3 top-2.5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Rules Table */}
      <div className="flex-1 overflow-auto p-4">
        {filteredRules.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-2">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <p className="text-gray-500 mb-4">
              {searchQuery ? 'No rules match your search' : 'No auto-load rules configured'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => {
                  setEditingRule(null);
                  setIsAddModalOpen(true);
                }}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Create Your First Rule
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Agent
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    URL Pattern
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{rule.agentName}</div>
                      {rule.description && <div className="text-xs text-gray-500 mt-0.5">{rule.description}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded">{rule.urlPattern}</code>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleStatus(rule.id)}
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          rule.status === 'active'
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        } transition-colors`}
                      >
                        {rule.status === 'active' ? '● Active' : '○ Paused'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleTestPattern(rule)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Test pattern"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            setEditingRule(rule);
                            setIsAddModalOpen(true);
                          }}
                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          title="Edit rule"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete rule"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Rule Modal */}
      <AddRuleModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingRule(null);
        }}
        onSave={editingRule ? handleUpdateRule : handleCreateRule}
        editingRule={
          editingRule
            ? {
                id: editingRule.id,
                agentId: editingRule.agentId,
                agentName: editingRule.agentName,
                urlPattern: editingRule.urlPattern,
                description: editingRule.description,
              }
            : null
        }
      />
    </div>
  );
};
