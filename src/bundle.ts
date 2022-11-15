import { ViteThemeContext } from './types'
import path from 'path';
import fs from 'fs-extra';
import { minifyCSS } from './utils';
import colors from "picocolors";

export async function writeBundle(
  context: ViteThemeContext,
  extCssString: string,
  extCssSet: Set<string>,
  cssOutputName: string
) {
  const {
    root,
    build: { outDir, assetsDir, minify },
  } = context.viteOptions;
  for (const css of extCssSet) {
    extCssString += css;
  }
  if (minify) {
    extCssString = await minifyCSS(extCssString, context.viteOptions);
  }
  const cssOutputPath = path.resolve(root, outDir, assetsDir, cssOutputName);
  fs.writeFileSync(cssOutputPath, extCssString);
}

export function closeBundle(
  context: ViteThemeContext,
  verbose: boolean | undefined,
  cssOutputName: string
) {
  if (verbose && !context.devEnvironment) {
    const {
      build: { outDir, assetsDir },
    } = context.viteOptions;
    console.log(colors.cyan('\n✨ [vite-dynamic-theme] - extract css code file is successfully:'));
    try {
      const { size } = fs.statSync(path.join(outDir, assetsDir, cssOutputName));
      console.log(
        colors.dim(outDir + '/') +
        colors.magenta(`${assetsDir}/${cssOutputName}`) +
        `\t\t${colors.dim((size / 1024).toFixed(2) + 'kb')}` +
        '\n'
      );
    } catch (error) {
      console.log(colors.red('\n ❌ [vite-dynamic-theme] -error:' + error));
    }
  }
}
