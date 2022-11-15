import type { PluginOption } from 'vite';
import path from 'path';
import fs from 'fs-extra';
import less from 'less';
import { createFileHash, extractVariable } from './utils';
import { colorRE, linkID } from './constants';
import { injectClientPlugin } from './injectClientPlugin';
import { lessPlugin } from './preprocessor/less';
import { createContext } from "./context";
import { AntdDarkThemeOption } from './types';
import { closeBundle, writeBundle } from './bundle';

export function antdDarkThemePlugin(opt: AntdDarkThemeOption): PluginOption {
  const options = Object.assign({
    verbose: true,
    fileName: 'app-antd-dark-theme-style',
    preloadFiles: [],
    loadMethod: 'link',
    extractCss: true,
  }, opt);

  const {
    darkModifyVars,
    verbose,
    fileName,
    selector,
    filter,
    preloadFiles,
    loadMethod,
    extractCss
  } = options;

  let extCssString = '';

  const styleMap = new Map<string, string>();
  const codeCache = new Map<string, { code: string; css: string }>();

  const cssOutputName = `${fileName}.${createFileHash()}.css`;

  const context = createContext({ antdThemeOptions: options, antdThemeFileName: cssOutputName });

  const getCss = (css: string) => {
    return `[${selector || 'data-theme="dark"'}] {${css}}`;
  };

  async function preloadLess() {
    if (!preloadFiles || !preloadFiles.length) {
      return;
    }
    for (const id of preloadFiles) {
      const code = fs.readFileSync(id, 'utf-8');
      less
        .render(code, {
          javascriptEnabled: true,
          modifyVars: darkModifyVars,
          filename: path.resolve(id),
          plugins: [lessPlugin(id, context.viteOptions)],
        })
        .then(({ css }) => {
          const colors = css.match(colorRE);
          if (colors) {
            css = extractVariable(css, colors.concat(['transparent']));
            codeCache.set(id, { code, css });
          }
        });
    }
  }

  return [
    injectClientPlugin(),
    {
      name: 'vite:antd-dark-theme',
      enforce: 'pre',
      configResolved(resolvedConfig) {
        createContext({
          viteOptions: resolvedConfig,
          devEnvironment: resolvedConfig.command === 'serve',
          needSourceMap: !!resolvedConfig.build.sourcemap
        });

        (resolvedConfig.command === 'serve') && preloadLess();
      },
      transformIndexHtml(html) {
        if (context.devEnvironment || loadMethod !== 'link' || !extractCss) {
          return html;
        }

        const config = context.viteOptions;
        return {
          html,
          tags: [
            {
              tag: 'link',
              attrs: {
                disabled: true,
                id: linkID,
                rel: 'alternate stylesheet',
                href: path.posix.join(config.base, config.build.assetsDir, cssOutputName),
              },
              injectTo: 'head',
            },
          ],
        };
      },

      async transform(code, id) {
        if (!id.endsWith('.less') || !code.includes('@')) {
          return null;
        }

        if (typeof filter === 'function' && !filter(id)) {
          return null;
        }

        const getResult = (content: string) => {
          return {
            map: context.needSourceMap ? this.getCombinedSourcemap() : null,
            code: content,
          };
        };

        let processCss = '';
        const cache = codeCache.get(id);
        const isUpdate = !cache || cache.code !== code;

        if (isUpdate) {
          const { css } = await less.render(code, {
            javascriptEnabled: true,
            modifyVars: darkModifyVars,
            filename: path.resolve(id),
            plugins: [lessPlugin(id, context.viteOptions)],
          });

          const colors = css.match(colorRE);
          if (colors) {
            // The theme only extracts css related to color
            // Can effectively reduce the size
            processCss = extractVariable(css, colors.concat(['transparent']));
          }
        } else {
          processCss = cache!.css;
        }

        if (context.devEnvironment) {
          isUpdate && codeCache.set(id, { code, css: processCss });
          return getResult(`${getCss(processCss)}\n` + code);
        } else {
          if (!styleMap.has(id)) {
            const { css } = await less.render(getCss(processCss), {
              filename: path.resolve(id),
              plugins: [lessPlugin(id, context.viteOptions)],
            });

            extCssString += `${css}\n`;
          }
          styleMap.set(id, processCss);
        }

        return null;
      },

      async writeBundle() {
        await writeBundle(context, extCssString, new Set<string>, cssOutputName);
      },

      closeBundle() {
        closeBundle(context, verbose, cssOutputName);
      },
    },
  ];
}
