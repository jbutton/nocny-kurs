import type { Lang, Msg } from '../game/types';
import { en } from './en';
import { pl, type Dict } from './pl';

export const DICTS: Record<Lang, Dict> = { pl, en };
export type TextKey = keyof Dict['text'];

export const fmt = (lang: Lang, n: number) => Math.round(n).toLocaleString(lang === 'pl' ? 'pl-PL' : 'en-US');

/**
 * Tłumaczy klucz z podstawieniem zmiennych.
 * `{good}` i `{city}` to identyfikatory zamieniane na nazwy, liczby są formatowane według języka.
 * Teksty mogą zawierać proste HTML (<b>, <br>) — pochodzą wyłącznie z naszych słowników.
 */
export function t(lang: Lang, key: string, vars: Msg['vars'] = {}): string {
  const d = DICTS[lang];
  const raw = (d.text as Record<string, string>)[key] ?? key;
  return raw.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = vars?.[k];
    if (v === undefined) return '';
    if (k === 'good') return (d.goods as Record<string, string>)[v] ?? String(v);
    if (k === 'city') return (d.cities as Record<string, string>)[v] ?? String(v);
    if (k === 'item' || k === 'w') return (d.gear as Record<string, string>)[v] ?? String(v);
    return typeof v === 'number' ? fmt(lang, v) : String(v);
  });
}
export const tm = (lang: Lang, msg: Msg) => t(lang, msg.key, msg.vars);
