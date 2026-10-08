import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { I18nProvider, detectLocale } from './i18n';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <I18nProvider locale={detectLocale()}>
        <App />
      </I18nProvider>
    </ErrorBoundary>
  </StrictMode>,
);
