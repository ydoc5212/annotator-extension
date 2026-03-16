import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Feed from './Feed';
import '../index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Feed />
  </StrictMode>
);
