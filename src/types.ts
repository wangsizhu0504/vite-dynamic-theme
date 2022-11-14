import type {ResolvedConfig} from 'vite'
export type ResolveSelector = (selector: string) => string;

export type InjectTo = 'head' | 'body' | 'body-prepend';

export interface AntdDarkThemeOption {
  /**
   * darkModifyVars
   */
  darkModifyVars?: any;
  /**
   * when extractCss is true, the file name of the extracted css file
   */
  fileName?: string;
  verbose?: boolean;
  selector?: string;
  /**
   * Files that result in true will be processed.
   * @param id (file path)
   */
  filter?: (id: string) => boolean;
  /**
   * when run in dev mode, the plugin will preloadFile
   */
  preloadFiles?: string[];
  /**
   * extractCss to a single file
   * @default true
   */
  extractCss?: boolean;
  /**
   * load darkCss type
   * @default 'link'
   */
  loadMethod?: 'link' | 'ajax';
}
export interface ViteThemeOptions {
  colorVariables: string[];
  wrapperCssSelector?: string;
  resolveSelector?: ResolveSelector;
  customerExtractVariable?: (code: string) => string;
  fileName?: string;
  injectTo?: InjectTo;
  verbose?: boolean;
}

export interface ViteThemeContext {
  colorThemeFileName: string;
  colorThemeOptions: ViteThemeOptions,
  antdThemeFileName: string
  antdThemeOptions: AntdDarkThemeOption,
  viteOptions: ResolvedConfig,
  devEnvironment: boolean,
  needSourceMap: boolean,
  injectClientPath: string,
}


