import React, { useRef } from 'react';
import Editor, { Monaco, loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

// Configure Monaco to use local files instead of CDN
loader.config({ monaco });

// Disable web workers to avoid CSP issues
if (typeof window !== 'undefined') {
  (window as any).MonacoEnvironment = {
    getWorker() {
      return null;
    }
  };
}

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

  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;

    // Configure TypeScript compiler options
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      allowJs: true,
      typeRoots: ['node_modules/@types'],
    });

    // Add AgentBase type definitions
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
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
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: (ed) => {
        ed.getAction('editor.action.formatDocument')?.run();
      },
    });
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
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: 'on',
        readOnly,
        contextmenu: true,
        quickSuggestions: true,
        suggestOnTriggerCharacters: true,
        acceptSuggestionOnEnter: 'on',
        snippetSuggestions: 'inline',
      }}
    />
  );
};
