import { mount } from 'svelte';
import App from './App.svelte';
import './app.css';
import { initAnalytics } from './lib/analytics';

const target = document.getElementById('app');
if (!target) throw new Error('Application root was not found.');

initAnalytics();
mount(App, { target });
