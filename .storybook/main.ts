import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';
import base64Plugin from '../vite-plugin-base64.ts';

const config: StorybookConfig = {
  "stories": [
    "../src/stories/**/*.mdx",
    "../src/stories/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs"
  ],
  "framework": "@storybook/react-vite",
  async viteFinal(config) {
    return mergeConfig(config, {
      plugins: [base64Plugin()],
      assetsInclude: ['**/*.gff', '**/*.parquet', '**/*.nwk', '**/*.txt'],
      resolve: {
        alias: {
          '@': '/src'
        }
      }
    });
  }
};
export default config;