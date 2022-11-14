import { normalizePath, Plugin } from 'vite';
import { CLIENT_PUBLIC_ABSOLUTE_PATH } from './constants';
import { createContext } from "./context";

export function injectClientPlugin(): Plugin {
  const context = createContext();

  return {
    name: 'vite:inject-vite-dynamic-theme-client',
    enforce: 'pre',
    async transform(code, id) {
      const nid = normalizePath(id);
      const path = normalizePath('vite-dynamic-theme/es/client.js');
      const getMap = () => (context.needSourceMap ? this.getCombinedSourcemap() : null);

      if (
        nid === CLIENT_PUBLIC_ABSOLUTE_PATH ||
        nid.endsWith(path) ||
        nid.includes('vite-dynamic-theme/es') ||
        nid.includes('vite-dynamic-theme_es') ||
        // support .vite cache
        nid.includes(path.replace(/\//gi, '_'))
      ) {
        const {
          base,
          build: { assetsDir },
        } = context.viteOptions;

        const getOutputFile = (name?: string) => {
          return JSON.stringify(`${base}${assetsDir}/${name}`);
        };

        code = code
          .replace('__COLOR_PLUGIN_OUTPUT_FILE_NAME__', getOutputFile(context.colorThemeFileName))
          .replace('__COLOR_PLUGIN_OPTIONS__', JSON.stringify(context.colorThemeOptions));

        code = code.replace(
          '__ANTD_DARK_PLUGIN_OUTPUT_FILE_NAME__',
          getOutputFile(context.antdThemeFileName)
        ).replace('__ANTD_DARK_PLUGIN_EXTRACT_CSS__',
          JSON.stringify(context.antdThemeOptions.extractCss)
        ).replace(
          '__ANTD_DARK_PLUGIN_LOAD_LINK__',
          JSON.stringify(context.antdThemeOptions?.loadMethod === 'link')
        );

        return {
          code: code.replace('__PROD__', JSON.stringify(!context.devEnvironment)),
          map: getMap(),
        };
      }
    },
  };
}
