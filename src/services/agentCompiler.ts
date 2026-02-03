import * as ts from 'typescript';
import { CompilationResult } from '../types/agentSource';

export class AgentCompiler {
  /**
   * Compile TypeScript code to JavaScript
   */
  static compile(typescript: string): CompilationResult {
    try {
      const result = ts.transpileModule(typescript, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2020,
          jsx: ts.JsxEmit.React,
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
          moduleResolution: ts.ModuleResolutionKind.NodeNext,
        },
      });

      // Check for diagnostics
      if (result.diagnostics && result.diagnostics.length > 0) {
        const errors = result.diagnostics.map((diagnostic) => {
          const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
          if (diagnostic.file && diagnostic.start !== undefined) {
            const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
            return `Line ${line + 1}:${character + 1} - ${message}`;
          }
          return message;
        });

        return {
          success: false,
          errors,
        };
      }

      return {
        success: true,
        javascript: result.outputText,
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown compilation error'],
      };
    }
  }

  /**
   * Validate TypeScript syntax without full compilation
   */
  static validateSyntax(typescript: string): { valid: boolean; errors: string[] } {
    try {
      const sourceFile = ts.createSourceFile('temp.ts', typescript, ts.ScriptTarget.ES2020, true);

      const errors: string[] = [];

      function visit(node: ts.Node) {
        // Basic syntax validation happens during parsing
        // We can add custom validation rules here if needed
        ts.forEachChild(node, visit);
      }

      visit(sourceFile);

      // Check for parse errors using getPreEmitDiagnostics
      const program = ts.createProgram(['temp.ts'], {
        noEmit: true,
        target: ts.ScriptTarget.ES2020,
      });

      const diagnostics = ts.getPreEmitDiagnostics(program, sourceFile);

      if (diagnostics && diagnostics.length > 0) {
        diagnostics.forEach((diagnostic) => {
          const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
          if (diagnostic.file && diagnostic.start !== undefined) {
            const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
            errors.push(`Line ${line + 1}:${character + 1} - ${message}`);
          } else {
            errors.push(message);
          }
        });

        return { valid: false, errors };
      }

      return { valid: true, errors: [] };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Unknown syntax error'],
      };
    }
  }

  /**
   * Extract agent metadata from code (class name, capabilities, etc.)
   */
  static extractMetadata(code: string): {
    className?: string;
    capabilities?: string[];
    description?: string;
  } {
    try {
      const sourceFile = ts.createSourceFile('temp.ts', code, ts.ScriptTarget.ES2020, true);

      let className: string | undefined;
      let capabilities: string[] = [];
      let description: string | undefined;

      function visit(node: ts.Node) {
        // Find class declaration
        if (ts.isClassDeclaration(node) && node.name) {
          className = node.name.text;

          // Look for JSDoc comment
          const jsDoc = (node as any).jsDoc;
          if (jsDoc && jsDoc.length > 0) {
            const comment = jsDoc[0].comment;
            if (typeof comment === 'string') {
              description = comment;
            }
          }
        }

        // Find getCapabilities method
        if (ts.isMethodDeclaration(node) && node.name.getText(sourceFile) === 'getCapabilities') {
          // Try to extract capability names from return statement
          const body = node.body;
          if (body) {
            ts.forEachChild(body, (child) => {
              if (ts.isReturnStatement(child) && child.expression) {
                // Simple extraction - look for array literals with objects containing "name" property
                const returnText = child.expression.getText(sourceFile);
                const nameMatches = returnText.matchAll(/name:\s*['"]([^'"]+)['"]/g);
                capabilities = Array.from(nameMatches, (m) => m[1]);
              }
            });
          }
        }

        ts.forEachChild(node, visit);
      }

      visit(sourceFile);

      return { className, capabilities, description };
    } catch (error) {
      console.error('Error extracting metadata:', error);
      return {};
    }
  }
}
