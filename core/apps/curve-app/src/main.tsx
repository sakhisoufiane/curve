import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryProvider } from './providers/query-provider';
import { CookiesProvider } from 'react-cookie';
import '@curveroyaltysystems/i18n';
import { router } from './routing/router';
import { ErrorBoundary } from './pages/misc/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <CookiesProvider>
        <QueryProvider>
          <RouterProvider router={router} />
        </QueryProvider>
      </CookiesProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
