export type Language = 'plain' | 'bash' | 'powershell' | 'json' | 'yaml' | 'sql' | 'javascript' | 'python';
export type AppLanguage = 'ja' | 'en';
export type AccentColor = 'blue' | 'purple' | 'green' | 'amber';

export interface Snippet {
  id: string;
  content: string;
  language: Language;
  pinned: boolean;
  order: number;
}

export interface Section {
  id: string;
  name: string;
  collapsed: boolean;
  order: number;
  snippets: Snippet[];
}

export interface AppSettings {
  hotkey: string;
  closeAfterCopy: boolean;
  autoStart: boolean;
  language: AppLanguage;
  accentColor: AccentColor;
  bgOpacity: number;
  windowWidth: number;
  windowHeight: number;
}

export interface AppData {
  version: number;
  settings: AppSettings;
  sections: Section[];
}

export interface ToastState {
  key: number;
  msg: string;
  undoFn?: () => void;
}
