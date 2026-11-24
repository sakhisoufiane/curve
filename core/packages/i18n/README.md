# `@curveroyaltysystems/i18n`

Internationalization package for Curve applications, providing translation support using i18next and react-i18next.

## Features

- **7 supported languages**: English, Spanish, Japanese, French, German, Italian, Dutch
- **Namespaces**: `common` (default) and `navigation`
- **React integration**: Ready-to-use hooks and components from react-i18next

## Installation

```bash
npm install @curveroyaltysystems/i18n
```

## Usage

```tsx
import { i18n, useTranslation, SUPPORTED_LANGUAGES } from '@curveroyaltysystems/i18n';

// Use the translation hook
function MyComponent() {
  const { t } = useTranslation();
  return <div>{t('common:hello')}</div>;
}

// Change language
i18n.changeLanguage('es');

// Access supported languages
console.log(SUPPORTED_LANGUAGES);
```