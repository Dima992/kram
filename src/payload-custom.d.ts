import { SettingsGlobal } from './globals/Settings';

declare module './payload-types' {
  export interface Globals {
    settings: SettingsGlobal;
  }

  export type GlobalSlug = 'header' | 'footer' | 'site-settings' | 'settings';
}