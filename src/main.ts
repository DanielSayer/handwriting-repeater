import { mount } from 'svelte';
import App from './App.svelte';
import './app.css';
import { initAnalytics } from './lib/analytics';

const target = document.getElementById('app');
if (!target) throw new Error('Application root was not found.');

mount(App, { target });

// Give the board a paint before downloading or initialising optional analytics.
requestAnimationFrame(() => {
  setTimeout(() => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => void initAnalytics(), { timeout: 2000 });
    } else {
      void initAnalytics();
    }
  }, 0);
});
