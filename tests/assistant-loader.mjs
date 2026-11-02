import { registerHooks } from 'node:module'
import { readFileSync, existsSync } from 'node:fs'
import { URL, fileURLToPath, pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import ts from 'typescript'
import { parse, compileScript, registerTS } from '@vue/compiler-sfc'

registerTS(() => ts)

const root = fileURLToPath(new URL('../', import.meta.url))
const apiMockUrl = 'assistant-test:api'

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@/composables/useAxiosService') {
      return { url: apiMockUrl, shortCircuit: true }
    }
    if (specifier.startsWith('@/') || specifier.startsWith('.')) {
      const path = specifier.startsWith('@/')
        ? resolve(root, 'src', specifier.slice(2))
        : fileURLToPath(new URL(specifier, context.parentURL))
      for (const candidate of [path, `${path}.ts`, `${path}/index.ts`]) {
        if (existsSync(candidate) && /\.(ts|vue)$/.test(candidate)) {
          return { url: pathToFileURL(candidate).href, shortCircuit: true }
        }
      }
    }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url === apiMockUrl) {
      return {
        format: 'module',
        source: `export const useApi = () => globalThis.assistantTestApi;
          export const getApiErrorMessage = (error, fallback) => error.response?.data?.message || fallback;`,
        shortCircuit: true,
      }
    }
    if (/\.(ts|vue)$/.test(url)) {
      let source = readFileSync(new URL(url), 'utf8')
      if (url.endsWith('.vue')) {
        const { descriptor } = parse(source, { filename: fileURLToPath(url) })
        source = compileScript(descriptor, {
          id: 'assistant-test',
          inlineTemplate: true,
          fs: { fileExists: existsSync, readFile: (path) => readFileSync(path, 'utf8') },
        }).content
      }
      return {
        format: 'module',
        source: ts.transpileModule(source, {
          compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
        }).outputText,
        shortCircuit: true,
      }
    }
    return nextLoad(url, context)
  },
})
