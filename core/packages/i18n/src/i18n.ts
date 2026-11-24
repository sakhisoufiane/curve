import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import es from './locales/es';
import ja from './locales/ja';
import fr from './locales/fr';
import de from './locales/de';
import it from './locales/it';
import nl from './locales/nl';

const resources = { en, es, ja, fr, de, it, nl };

i18n.use(initReactI18next).init({
  resources,
  lng: 'en', // language to use, more information here: https://www.i18next.com/overview/configuration-options#languages-namespaces-resources
  // you can use the i18n.changeLanguage function to change the language manually: https://www.i18next.com/overview/api#changelanguage
  // if you're using a language detector, do not define the lng option
  ns: [
    'navigation',
    'common',
    'dashboards',
    'authentication',
    'works',
    'territoryGroups',
    'companies',
    'clients',
    'parents',
  ],
  defaultNS: 'common',

  interpolation: {
    escapeValue: false, // react already safes from xss
  },
  react: {
    useSuspense: false,
  },
});

export default i18n;
