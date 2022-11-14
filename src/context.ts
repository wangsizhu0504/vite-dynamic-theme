
import { CLIENT_PUBLIC_ABSOLUTE_PATH } from "./constants";

import { ViteThemeContext } from './types'

const context: ViteThemeContext = {
  colorThemeFileName: '',
  antdThemeFileName: '',
  viteOptions: undefined!,
  colorThemeOptions: undefined!,
  antdThemeOptions: undefined!,
  devEnvironment: false,
  needSourceMap: false,
  injectClientPath: JSON.stringify(CLIENT_PUBLIC_ABSOLUTE_PATH),
}

export function createContext(options?: Partial<ViteThemeContext>): ViteThemeContext {
  if (options) Object.assign(context, options)
  return context
}
