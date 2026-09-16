import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { StoreProvider } from './state/store';
import { App } from './App';
import './styles/global.css';

/**
 * HashRouter rather than BrowserRouter: the production build is served from a
 * GitHub Pages sub-path with no server-side rewrites, and a hash route works
 * there, from a file:// open, and in the dev server alike.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <StoreProvider>
        <App />
      </StoreProvider>
    </HashRouter>
  </StrictMode>,
);
