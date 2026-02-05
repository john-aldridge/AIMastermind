/**
 * Descriptions for each node/action type in the flow editor
 */

export const NODE_DESCRIPTIONS: Record<string, string> = {
  // Entry point
  capability: 'The entry point for this agent capability. When triggered, execution flows down from here.',

  // DOM Actions
  querySelector: 'Finds a single element on the page using a CSS selector.',
  querySelectorAll: 'Finds all elements matching a CSS selector and returns them as a list.',
  click: 'Clicks on an element on the page.',
  remove: 'Removes an element from the page DOM.',
  setValue: 'Sets the value of an input field or textarea.',
  getAttribute: 'Gets an attribute value from an element.',
  setAttribute: 'Sets an attribute on an element.',
  getText: 'Gets the text content from an element.',
  getHTML: 'Gets the HTML content from an element.',
  scrollTo: 'Scrolls to a specific element or position on the page.',
  focus: 'Focuses on an element (useful for inputs).',
  blur: 'Removes focus from an element.',
  addClass: 'Adds a CSS class to an element.',
  removeClass: 'Removes a CSS class from an element.',
  toggleClass: 'Toggles a CSS class on an element.',
  setStyle: 'Sets inline CSS styles on an element.',

  // Wait Actions
  wait: 'Pauses execution for a specified number of milliseconds.',
  waitFor: 'Waits until an element appears on the page.',
  waitForHidden: 'Waits until an element is hidden or removed.',

  // Data Actions
  set: 'Sets a variable to a value for use later in the flow.',
  get: 'Gets the value of a previously set variable.',
  transform: 'Transforms data using a JavaScript expression.',
  extract: 'Extracts data from an element or page.',
  parseJSON: 'Parses a JSON string into an object.',
  stringify: 'Converts an object to a JSON string.',

  // Notification Actions
  notify: 'Shows a notification to the user.',
  log: 'Logs a message to the console for debugging.',
  alert: 'Shows an alert dialog to the user.',

  // API Actions
  callClient: 'Calls a method on an integrated client (e.g., Jira, Slack).',
  fetch: 'Makes an HTTP request to an API endpoint.',
  apiRequest: 'Makes an API request with advanced options.',

  // Script Actions
  executeScript: 'Runs custom JavaScript code on the page.',
  evaluate: 'Evaluates a JavaScript expression and returns the result.',

  // Control Flow
  if: 'Branches the flow based on a condition. Green = true, Red = false.',
  condition: 'Branches the flow based on a condition. Green = true, Red = false.',
  forEach: 'Loops through each item in a list, executing the body for each.',
  while: 'Repeats the body while a condition is true.',
  break: 'Exits the current loop early.',
  continue: 'Skips to the next iteration of the loop.',
  return: 'Exits the capability and optionally returns a value.',

  // Storage Actions
  storageGet: 'Gets a value from browser storage.',
  storageSet: 'Saves a value to browser storage.',
  storageRemove: 'Removes a value from browser storage.',

  // Misc Actions
  navigate: 'Navigates to a different URL.',
  reload: 'Reloads the current page.',
  screenshot: 'Takes a screenshot of the page or element.',
  copy: 'Copies text to the clipboard.',
};

/**
 * Get description for a node type
 */
export function getNodeDescription(actionType: string): string {
  return NODE_DESCRIPTIONS[actionType] || `Performs the "${actionType}" action.`;
}
