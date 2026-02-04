import React, { useRef } from 'react';
import Editor, { Monaco, loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

// Configure Monaco to use local files instead of CDN
loader.config({ monaco });

// Monaco workers are configured globally in EditorApp.tsx
// They work in both editor and sidepanel contexts

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  theme?: 'vs-dark' | 'light';
  readOnly?: boolean;
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({
  value,
  onChange,
  language = 'typescript',
  theme = 'vs-dark',
  readOnly = false,
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: Monaco) => {
    editorRef.current = editor;

    // Configure TypeScript compiler options
    monacoInstance.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monacoInstance.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monacoInstance.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monacoInstance.languages.typescript.ModuleKind.ESNext,
      noEmit: true,
      esModuleInterop: true,
      jsx: monacoInstance.languages.typescript.JsxEmit.React,
      allowJs: true,
      typeRoots: ['node_modules/@types'],
    });

    // Add AgentBase type definitions
    monacoInstance.languages.typescript.typescriptDefaults.addExtraLib(
      `
      declare module '../plugins/AgentBase' {
        export interface CapabilityParameter {
          name: string;
          type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';
          description: string;
          required: boolean;
        }

        export interface Capability {
          name: string;
          description: string;
          parameters: CapabilityParameter[];
        }

        export interface AgentMetadata {
          id: string;
          name: string;
          description: string;
          version: string;
          author?: string;
        }

        export abstract class AgentBase {
          abstract getMetadata(): AgentMetadata;
          abstract getCapabilities(): Capability[];
          abstract executeCapability(capabilityName: string, parameters: Record<string, any>): Promise<any>;
        }
      }
      `,
      'file:///node_modules/@types/plugin-base/index.d.ts'
    );

    // Enable auto-formatting on save
    editor.addAction({
      id: 'format-document',
      label: 'Format Document',
      keybindings: [monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS],
      run: (ed) => {
        ed.getAction('editor.action.formatDocument')?.run();
      },
    });

    // Custom edge-scroll handling for selection
    const editorDomNode = editor.getDomNode();
    if (editorDomNode) {
      let isMouseDown = false;
      let scrollInterval: number | null = null;

      const startEdgeScroll = (direction: 'up' | 'down') => {
        if (scrollInterval) return;
        const scrollAmount = direction === 'down' ? 3 : -3;
        scrollInterval = window.setInterval(() => {
          editor.setScrollTop(editor.getScrollTop() + scrollAmount * 10);
        }, 16); // ~60fps
      };

      const stopEdgeScroll = () => {
        if (scrollInterval) {
          clearInterval(scrollInterval);
          scrollInterval = null;
        }
      };

      editorDomNode.addEventListener('mousedown', () => {
        isMouseDown = true;
      });

      window.addEventListener('mouseup', () => {
        isMouseDown = false;
        stopEdgeScroll();
      });

      editorDomNode.addEventListener('mousemove', (e: MouseEvent) => {
        if (!isMouseDown) {
          stopEdgeScroll();
          return;
        }

        const rect = editorDomNode.getBoundingClientRect();
        const edgeThreshold = 30; // pixels from edge to trigger scroll

        if (e.clientY < rect.top + edgeThreshold) {
          startEdgeScroll('up');
        } else if (e.clientY > rect.bottom - edgeThreshold) {
          startEdgeScroll('down');
        } else {
          stopEdgeScroll();
        }
      });

      editorDomNode.addEventListener('mouseleave', () => {
        if (isMouseDown) {
          // Continue scrolling based on where mouse exited
          // This is handled by the mousemove on parent elements
        }
      });
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    onChange(value || '');
  };

  return (
    <Editor
      height="100%"
      language={language}
      theme={theme}
      value={value}
      onChange={handleEditorChange}
      onMount={handleEditorDidMount}
      options={{
        minimap: { enabled: false },
        fontSize: 13,
        lineNumbers: 'on',
        scrollBeyondLastLine: true,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: 'off',
        readOnly,
        contextmenu: true,
        quickSuggestions: true,
        suggestOnTriggerCharacters: true,
        acceptSuggestionOnEnter: 'on',
        snippetSuggestions: 'inline',
        dragAndDrop: true,
        smoothScrolling: false,
        cursorSurroundingLines: 0,
        mouseWheelScrollSensitivity: 2,
        fastScrollSensitivity: 7,
        scrollbar: {
          vertical: 'visible',
          horizontal: 'visible',
          useShadows: false,
          verticalScrollbarSize: 14,
          horizontalScrollbarSize: 14,
        },
      }}
    />
  );
};
