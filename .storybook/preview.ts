import type { Preview } from '@storybook/react-vite'
import { spyOn } from 'storybook/test'
import '../src/index.css' // Import Tailwind CSS

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#1a1a1a' },
      ],
    },
    options: {
      storySort: {
        order: ['Docs', ['Welcome', 'Getting Started', 'API Reference'], 'Examples', ['HoodiniVizDash', 'HoodiniViz', 'Components', 'Widgets']],
      },
    },
  },
};

export default preview;

// Ensure Storybook iframe provides full height for fullscreen layouts
// Note: Only apply overflow:hidden to story canvas, not docs pages
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    :root, html, body, #storybook-root, .sb-show-main { height: 100%; margin: 0; }
    /* Only hide overflow in story canvas, not in docs */
    .sb-show-main.sb-main-padded { overflow: auto; }
    #storybook-root:not(.sb-show-main) { overflow: hidden; }
  `;
  document.head.appendChild(style);
}

// Capture console logs globally in Storybook (SB9+ native API)
export const beforeEach = () => {
  try {
    spyOn(console, 'log').mockName('console.log')
    spyOn(console, 'warn').mockName('console.warn')
    spyOn(console, 'error').mockName('console.error')
    spyOn(console, 'info').mockName('console.info')
  } catch (e) {
    // Ignore if spyOn isn't available in environment
  }
}