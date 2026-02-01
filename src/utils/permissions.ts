/**
 * Permission Manager
 * Handles optional Chrome extension permissions
 */

export class PermissionManager {

  async requestPermission(permission: string): Promise<boolean> {
    try {
      console.log(`Requesting permission: ${permission}`);
      const granted = await chrome.permissions.request({
        permissions: [permission]
      });
      console.log(`Permission ${permission} ${granted ? 'granted' : 'denied'}`);
      return granted;
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }

  async hasPermission(permission: string): Promise<boolean> {
    try {
      return await chrome.permissions.contains({ permissions: [permission] });
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  }

  async removePermission(permission: string): Promise<boolean> {
    try {
      return await chrome.permissions.remove({ permissions: [permission] });
    } catch (error) {
      console.error('Permission removal failed:', error);
      return false;
    }
  }

  async getGrantedPermissions(): Promise<string[]> {
    try {
      const permissions = await chrome.permissions.getAll();
      return permissions.permissions || [];
    } catch (error) {
      console.error('Failed to get permissions:', error);
      return [];
    }
  }
}

export const permissionManager = new PermissionManager();
