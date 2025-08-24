import 'server-only';
import type { Locale } from './i18n-config';

const dictionaries = {
  en: () => import('../dictionaries/en.json').then((module) => module.default),
  zh: () => import('../dictionaries/zh.json').then((module) => module.default),
};

export type DictionaryType = Awaited<ReturnType<typeof dictionaries[Locale]>>;
export const getDictionary = async (locale: Locale) => dictionaries[locale]();