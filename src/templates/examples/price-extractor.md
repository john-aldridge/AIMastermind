# Price Extractor Agent

## Overview

This agent extracts product prices from e-commerce websites using JavaScript execution. It demonstrates how to use JavaScript snippets within config-based agents.

## Features

- **JavaScript Execution**: Uses executeScript action for complex logic
- **Multiple Selectors**: Tries various common price element selectors
- **Currency Detection**: Identifies currency symbols
- **Price Parsing**: Extracts numeric values from formatted strings

## How It Works

1. Runs JavaScript in page context to search for price elements
2. Tries multiple common selectors (.price, [data-price], etc.)
3. Extracts numeric value and currency symbol
4. Returns structured price data
5. Shows notification with found price

## Security

**⚠️ Contains JavaScript:**
- This agent requires JavaScript execution to be enabled in Settings > Security
- JavaScript runs in page context (isolated from extension)
- Cannot access chrome.* APIs or extension storage
- User must explicitly allow JavaScript execution

## Usage

1. Enable JavaScript execution in Settings > Security
2. Navigate to a product page (e.g., Amazon, eBay)
3. Open Synergy AI sidepanel
4. Go to Agents tab
5. Find "Price Extractor"
6. Click "Execute" on the "extract_price" capability
7. Price appears in notification!

## Example Use Cases

- Track product prices across sites
- Compare prices between retailers
- Build a price history database
- Alert when prices drop

## Technical Details

**executeScript Action:**
- Runs JavaScript in page context via BrowserClient
- Has access to page DOM and JavaScript
- Returns data back to agent engine
- Timeout: 5000ms by default

**Price Detection:**
The script tries these selectors in order:
1. `.price` - Generic price class
2. `[data-price]` - Data attribute
3. `.product-price` - Product-specific class
4. `[itemprop="price"]` - Schema.org markup
5. `.sale-price` - Sale price class

## JavaScript Code

```javascript
// Find price elements using multiple selectors
const priceSelectors = [
  '.price',
  '[data-price]',
  '.product-price',
  '[itemprop="price"]',
  '.sale-price'
];

for (const selector of priceSelectors) {
  const el = document.querySelector(selector);
  if (el) {
    let priceText = el.textContent || el.getAttribute('content') || el.getAttribute('data-price');

    // Extract numeric value
    const match = priceText.match(/[\d,]+\.?\d*/);
    if (match) {
      const price = parseFloat(match[0].replace(/,/g, ''));
      const currency = priceText.match(/[$£€¥]/)?.[0] || 'USD';

      return {
        price: price,
        currency: currency,
        originalText: priceText.trim(),
        selector: selector
      };
    }
  }
}

return null;
```

## Learn More

This example demonstrates:
- JavaScript snippets in configs
- executeScript action
- Conditional logic based on script results
- Security implications of JavaScript
- User opt-in requirements

Study this example to learn how to use JavaScript for complex operations that can't be done with declarative actions!
