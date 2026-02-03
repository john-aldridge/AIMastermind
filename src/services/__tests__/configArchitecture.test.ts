/**
 * Test suite for config-based architecture
 *
 * Tests the core functionality of:
 * - ConfigStorageService
 * - ConfigRegistry
 * - AgentEngine (basic validation)
 * - ClientEngine (basic validation)
 */

import { describe, test, expect } from '@jest/globals';
import { ConfigStorageService } from '../../storage/configStorage';
import { OverlayRemoverAgentConfig, WeatherClientConfig } from '../../examples/configExamples';

describe('Config-Based Architecture', () => {
  describe('ConfigStorageService', () => {
    test('should validate agent config', () => {
      const validation = ConfigStorageService.validateAgentConfig(OverlayRemoverAgentConfig);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should detect JavaScript in agent config', () => {
      const hasJS = ConfigStorageService.detectJavaScriptInAgent(OverlayRemoverAgentConfig);
      expect(hasJS).toBe(false);
    });

    test('should validate client config', () => {
      const validation = ConfigStorageService.validateClientConfig(WeatherClientConfig);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should reject invalid agent config', () => {
      const invalidConfig = {
        id: 'test',
        // Missing required fields
      } as any;

      const validation = ConfigStorageService.validateAgentConfig(invalidConfig);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('AgentConfig Schema', () => {
    test('OverlayRemoverAgent should have correct structure', () => {
      expect(OverlayRemoverAgentConfig.id).toBe('overlay-remover');
      expect(OverlayRemoverAgentConfig.name).toBe('Overlay Remover');
      expect(OverlayRemoverAgentConfig.containsJavaScript).toBe(false);
      expect(OverlayRemoverAgentConfig.capabilities).toHaveLength(1);
      expect(OverlayRemoverAgentConfig.capabilities[0].name).toBe('remove_overlays_once');
    });

    test('OverlayRemoverAgent should have valid actions', () => {
      const capability = OverlayRemoverAgentConfig.capabilities[0];
      expect(Array.isArray(capability.actions)).toBe(true);
      expect(capability.actions.length).toBeGreaterThan(0);

      // Check for required action types
      const actionTypes = capability.actions.map(a => a.type);
      expect(actionTypes).toContain('if');
      expect(actionTypes).toContain('forEach');
      expect(actionTypes).toContain('addStyle');
      expect(actionTypes).toContain('notify');
      expect(actionTypes).toContain('return');
    });
  });

  describe('ClientConfig Schema', () => {
    test('WeatherClient should have correct structure', () => {
      expect(WeatherClientConfig.id).toBe('weather-client');
      expect(WeatherClientConfig.name).toBe('Weather API Client');
      expect(WeatherClientConfig.auth.type).toBe('apikey');
      expect(WeatherClientConfig.baseUrl).toBe('https://api.openweathermap.org/data/2.5');
      expect(WeatherClientConfig.capabilities).toHaveLength(1);
    });

    test('WeatherClient capability should have valid structure', () => {
      const capability = WeatherClientConfig.capabilities[0];
      expect(capability.name).toBe('get_current_weather');
      expect(capability.method).toBe('GET');
      expect(capability.path).toBe('/weather');
      expect(Array.isArray(capability.parameters)).toBe(true);
      expect(capability.parameters.length).toBeGreaterThan(0);
    });

    test('WeatherClient should have response transform', () => {
      const capability = WeatherClientConfig.capabilities[0];
      expect(capability.responseTransform).toBeDefined();
      expect(capability.responseTransform?.map).toBeDefined();
      expect(capability.responseTransform?.map?.temperature).toBe('main.temp');
    });
  });
});
