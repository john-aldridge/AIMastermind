/**
 * JavaScript Review Dialog
 *
 * Shows JavaScript snippets from configs for user review before execution.
 * Allows user to approve/deny execution and remember their choice.
 */

import React, { useState } from 'react';
import { AgentConfig, Action } from '@/types/agentConfig';

interface JavaScriptReviewDialogProps {
  config: AgentConfig;
  onApprove: () => void;
  onDeny: () => void;
  isOpen: boolean;
}

export const JavaScriptReviewDialog: React.FC<JavaScriptReviewDialogProps> = ({
  config,
  onApprove,
  onDeny,
  isOpen,
}) => {
  const [rememberChoice, setRememberChoice] = useState(false);

  if (!isOpen) return null;

  // Extract all JavaScript snippets from the config
  const jsSnippets = extractJavaScriptSnippets(config);

  const handleApprove = () => {
    if (rememberChoice) {
      // Store approval in local storage
      localStorage.setItem(`js-approved-${config.id}`, 'true');
    }
    onApprove();
  };

  const handleDeny = () => {
    if (rememberChoice) {
      // Store denial in local storage
      localStorage.setItem(`js-approved-${config.id}`, 'false');
    }
    onDeny();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">
                Review JavaScript Code
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                The agent "{config.name}" contains JavaScript code that will run in the page context.
                Please review the code below before allowing execution.
              </p>
            </div>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Security Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-amber-900 mb-2">Security Information</h4>
            <div className="text-sm text-amber-800 space-y-1">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>JavaScript runs in page context (isolated from extension)</span>
              </div>
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>Cannot access extension APIs or stored credentials</span>
              </div>
            </div>
          </div>

          {/* JavaScript Snippets */}
          <div className="space-y-4">
            {jsSnippets.map((snippet, index) => (
              <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Snippet {index + 1} of {jsSnippets.length}
                    </span>
                    <span className="text-xs text-gray-500">
                      {snippet.capability} → {snippet.action}
                    </span>
                  </div>
                </div>
                <div className="bg-gray-900 p-4 overflow-x-auto">
                  <pre className="text-sm text-gray-100 font-mono">
                    <code>{snippet.code}</code>
                  </pre>
                </div>
              </div>
            ))}
          </div>

          {/* Additional Info */}
          <div className="mt-4 text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
            <p className="mb-1">
              <strong>What this code can do:</strong> Access and manipulate the page's DOM,
              read page variables, execute in the context of the current webpage.
            </p>
            <p>
              <strong>What this code cannot do:</strong> Access chrome extension APIs,
              read stored credentials, access other tabs, or make requests that bypass CORS.
            </p>
          </div>
        </div>

        {/* Footer - Actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          {/* Remember Choice */}
          <label className="flex items-center gap-2 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberChoice}
              onChange={(e) => setRememberChoice(e.target.checked)}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">
              Remember my choice for this agent
            </span>
          </label>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleDeny}
              className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Deny Execution
            </button>
            <button
              onClick={handleApprove}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              Approve & Execute
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Extract all JavaScript snippets from an agent config
 */
function extractJavaScriptSnippets(config: AgentConfig): Array<{
  capability: string;
  action: string;
  code: string;
}> {
  const snippets: Array<{ capability: string; action: string; code: string }> = [];

  for (const capability of config.capabilities) {
    extractFromActions(capability.actions, capability.name, snippets);
  }

  return snippets;
}

/**
 * Recursively extract executeScript actions from action list
 */
function extractFromActions(
  actions: Action[],
  capabilityName: string,
  snippets: Array<{ capability: string; action: string; code: string }>
): void {
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];

    if (action.type === 'executeScript') {
      snippets.push({
        capability: capabilityName,
        action: `Action ${i + 1}`,
        code: action.script.trim(),
      });
    }

    // Recursively check nested actions
    if (action.type === 'if') {
      extractFromActions(action.then, capabilityName, snippets);
      if (action.else) {
        extractFromActions(action.else, capabilityName, snippets);
      }
    } else if (action.type === 'forEach') {
      extractFromActions(action.do, capabilityName, snippets);
    } else if (action.type === 'while') {
      extractFromActions(action.do, capabilityName, snippets);
    } else if (action.type === 'startProcess') {
      extractFromActions(action.actions, capabilityName, snippets);
    } else if (action.type === 'registerCleanup') {
      extractFromActions(action.actions, capabilityName, snippets);
    }
  }
}

/**
 * Check if user has previously approved this agent's JavaScript
 */
export function hasJavaScriptApproval(agentId: string): boolean {
  const approval = localStorage.getItem(`js-approved-${agentId}`);
  return approval === 'true';
}

/**
 * Clear JavaScript approval for an agent
 */
export function clearJavaScriptApproval(agentId: string): void {
  localStorage.removeItem(`js-approved-${agentId}`);
}
