import { PluginOption } from 'vite';
import { createFileHash, extractVariable, formatCss, getClientStyleString } from './utils';
import { cssLangRE } from './constants';
import { injectClientPlugin } from './injectClientPlugin';
import { createContext } from "./context";
import { ViteThemeOptions } from './types';
import { writeBundle, closeBundle } from './bundle'
export * from '../client/colorUtils';

export { antdDarkThemePlugin } from './antdDarkThemePlugin';


const name = 'vite:dynamic-theme';

export function viteThemePlugin(options: ViteThemeOptions = {
  colorVariables: [],
  wrapperCssSelector: '',
  fileName: 'app-theme-style',
  injectTo: 'body',
  verbose: true,
}): PluginOption {
  const styleMap = new Map<string, string>();
  const extCssSet = new Set<string>();


  const {
    colorVariables,
    wrapperCssSelector,
    resolveSelector,
    customerExtractVariable,
    fileName,
    verbose,
  } = options;

  if (!colorVariables || colorVariables.length === 0) {
    console.error('colorVariables is not empty!');
    return [{ name }];
  }

  const resolveSelectorFn = resolveSelector || ((s: string) => `${wrapperCssSelector} ${s}`);

  const cssOutputName = `${fileName}.${createFileHash()}.css`;

  const context = createContext({ colorThemeOptions: options, colorThemeFileName: cssOutputName });

  return [
    injectClientPlugin(),
    {
      apply: "serve",
      name,
      enforce: "post",
      configResolved(resolvedConfig) {
        createContext({
          viteOptions: resolvedConfig,
          devEnvironment: resolvedConfig.command === 'serve',
          needSourceMap: !!resolvedConfig.build.sourcemap
        });
      },

      async transform(code, id) {
        if (!cssLangRE.test(id)) {
          return null;
        }
        const getResult = (content: string) => {
          return {
            map: context.needSourceMap ? this.getCombinedSourcemap() : null,
            code: content,
          };
        };

        const clientCode = await getClientStyleString(code)

        const extractCssCodeTemplate =
          typeof customerExtractVariable === 'function'
            ? customerExtractVariable(clientCode)
            : extractVariable(clientCode, colorVariables, resolveSelectorFn);


        if (!extractCssCodeTemplate) {
          return null;
        }

        // dev-server
        const retCode = [
          `import { addCssToQueue } from ${context.injectClientPath}`,
          `const themeCssId = ${JSON.stringify(id)}`,
          `const themeCssStr = ${JSON.stringify(formatCss(extractCssCodeTemplate))}`,
          `addCssToQueue(themeCssId, themeCssStr)`,
          code,
        ];

        return getResult(retCode.join('\n'));
      },
    },
    {
      apply: "build",
      name,
      configResolved(resolvedConfig) {
        createContext({
          viteOptions: resolvedConfig,
          devEnvironment: resolvedConfig.command === 'serve',
          needSourceMap: !!resolvedConfig.build.sourcemap
        });
      },

      async transform(code, id) {
        if (!cssLangRE.test(id)) {
          return null;
        }

        const clientCode = code.replace('export default', '').replace('"', '');

        const extractCssCodeTemplate =
          typeof customerExtractVariable === 'function'
            ? customerExtractVariable(clientCode)
            : extractVariable(clientCode, colorVariables, resolveSelectorFn);


        if (!extractCssCodeTemplate) {
          return null;
        }

        if (!styleMap.has(id)) {
          extCssSet.add(extractCssCodeTemplate);
        }
        styleMap.set(id, extractCssCodeTemplate);

        return null;
      },

      async writeBundle() {
        await writeBundle(context, '', extCssSet, cssOutputName);
      },

      closeBundle() {
        closeBundle(context, verbose, cssOutputName);
      },
    },
  ];
}
