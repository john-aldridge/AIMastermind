import React from 'react';
import { ProviderConfig, AuthField } from '@/utils/providers';

interface DynamicAuthFormProps {
  provider: ProviderConfig;
  credentials: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export const DynamicAuthForm: React.FC<DynamicAuthFormProps> = ({
  provider,
  credentials,
  onChange,
}) => {
  const renderField = (field: AuthField) => {
    const value = credentials[field.key] || '';

    switch (field.type) {
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => onChange(field.key, e.target.value)}
            className="input-field text-sm"
          >
            <option value="">Select {field.label}</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'password':
        return (
          <input
            type="password"
            value={value}
            onChange={(e) => onChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            className="input-field text-sm"
          />
        );

      case 'url':
        return (
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            className="input-field text-sm"
          />
        );

      default: // text
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            className="input-field text-sm"
          />
        );
    }
  };

  return (
    <div className="space-y-4">
      {provider.authFields.map((field) => (
        <div key={field.key}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {renderField(field)}
          {field.helpText && (
            <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>
          )}
        </div>
      ))}

      {/* Model Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Model
        </label>
        <select
          value={credentials.model || provider.defaultModel}
          onChange={(e) => onChange('model', e.target.value)}
          className="input-field text-sm"
        >
          {provider.models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
              {model.pricing && ` ($${model.pricing.input}/$${model.pricing.output})`}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Choose the model to use for this provider
        </p>
      </div>

      {/* Get API Key Link */}
      <div className="p-3 bg-blue-50 rounded-lg">
        <p className="text-xs text-blue-900 font-medium mb-1">
          Need an API key?
        </p>
        <a
          href={provider.apiKeyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-700 underline hover:text-blue-800"
        >
          Get your {provider.displayName} API key →
        </a>
      </div>
    </div>
  );
};
