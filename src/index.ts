import { PluginOption } from 'vite';
import path from 'path';
import fs from 'fs-extra';
import { createFileHash, extractVariable, formatCss, getClientStyleString, minifyCSS } from './utils';
import chalk from "chalk";
import { cssLangRE } from './constants';
import { injectClientPlugin } from './injectClientPlugin';
import { createContext } from "./context";
import { ViteThemeOptions } from './types';

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

        // Used to extract the relevant color configuration in css, you can pass in the function to override
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
        const {
          root,
          build: { outDir, assetsDir, minify },
        } = context.viteOptions;
        let extCssString = '';
        for (const css of extCssSet) {
          extCssString += css;
        }
        if (minify) {
          extCssString = await minifyCSS(extCssString, context.viteOptions);
        }
        const cssOutputPath = path.resolve(root, outDir, assetsDir, cssOutputName);
        fs.writeFileSync(cssOutputPath, extCssString);
      },

      closeBundle() {
        if (verbose && !context.devEnvironment) {
          const {
            build: { outDir, assetsDir },
          } = context.viteOptions;
          console.log(
            chalk.cyan('\n✨ [vite-dynamic-theme]') + ` - extract css code file is successfully:`
          );
          try {
            const { size } = fs.statSync(path.join(outDir, assetsDir, cssOutputName));
            console.log(
              chalk.dim(outDir + '/') +
              chalk.magenta(`${assetsDir}/${cssOutputName}`) +
              `\t\t${chalk.dim((size / 1024).toFixed(2) + 'kb')}` +
              '\n'
            );
          } catch (error) {
            console.log(error)
          }
        }
      },
    },
  ];
}
