# Overlay Remover Agent

## Overview

This agent automatically removes annoying modal overlays, popups, and paywalls from web pages. It's a config-based agent that uses declarative actions - no JavaScript code required!

## Features

- **Declarative Actions**: Uses pure config without custom JavaScript
- **Aggressive Mode**: Toggle between normal and aggressive overlay removal
- **One-Time Execution**: Removes overlays with a single click
- **Body Scroll Restoration**: Automatically restores scrolling after removal

## How It Works

1. Queries the DOM for common overlay selectors
2. Removes all matching elements
3. Restores body scroll styles
4. Shows a notification with the count of removed overlays

## Configuration

**Aggressive Mode:**
- **Normal**: Only removes obvious overlay elements (recommended)
- **Aggressive**: Removes all elements that might be overlays (may affect legitimate UI)

## Usage

1. Navigate to a page with annoying overlays
2. Open Synergy AI sidepanel
3. Go to Agents tab
4. Find "Overlay Remover"
5. Click "Execute" on the "remove_overlays_once" capability
6. All overlays disappear!

## Example Use Cases

- Bypass newsletter signup popups
- Remove "Accept Cookies" banners
- Get rid of paywall overlays
- Clear promotional modals

## Technical Details

**Config Schema:**
- Uses `querySelectorAll` action to find overlays
- Uses `forEach` loop to remove each overlay
- Uses `addStyle` action to restore body scroll
- Uses conditional logic (`if`) for aggressive mode

**No JavaScript Required:**
This agent is 100% declarative - it uses config actions only, making it safe and easy to understand.

## Learn More

This example demonstrates:
- Config-based agent architecture
- Declarative DOM manipulation
- Conditional logic in configs
- User configuration fields
- Notification actions

Study this example to learn how to create your own config-based agents!
