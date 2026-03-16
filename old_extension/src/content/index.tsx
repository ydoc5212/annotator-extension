import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from '../components/App';

function initAnnotator() {
  // Check if already initialized
  if (document.getElementById('web-annotator-root')) {
    return;
  }

  // Create a container for our React app
  const container = document.createElement('div');
  container.id = 'web-annotator-root';
  container.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 2147483646;
  `;

  document.body.appendChild(container);

  // Create and render the React app
  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  console.log('Web Annotator initialized!');
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAnnotator);
} else {
  // DOM is already ready
  initAnnotator();
}
