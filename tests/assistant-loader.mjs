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
    if (specifier === '@/components/ui/checkbox')
      return { url: 'assistant-test:checkbox', shortCircuit: true }
    if (specifier === '@/components/ui/sheet')
      return { url: 'assistant-test:sheet', shortCircuit: true }
    if (specifier === '@/components/ui/textarea')
      return { url: 'assistant-test:textarea', shortCircuit: true }
    if (specifier === 'vue-sonner') return { url: 'assistant-test:toast', shortCircuit: true }
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
    return nextResolve(
      specifier,
      context.parentURL?.startsWith('assistant-test:')
        ? { ...context, parentURL: import.meta.url }
        : context
    )
  },
  load(url, context, nextLoad) {
    if (url === 'assistant-test:checkbox')
      return {
        format: 'module',
        shortCircuit: true,
        source: `
      import { defineComponent, h } from 'vue';
      export const Checkbox = defineComponent({ props: ['modelValue','disabled'], emits: ['update:modelValue'], setup: (props, { emit }) => () => h('button', { role: 'checkbox', disabled: props.disabled, 'aria-checked': props.modelValue, onClick: () => { if (!props.disabled) emit('update:modelValue', !props.modelValue) } }) });`,
      }
    if (url === 'assistant-test:sheet')
      return {
        format: 'module',
        shortCircuit: true,
        source: `
      import { defineComponent, h } from 'vue';
      const part = defineComponent({ setup: (_, { slots }) => () => h('div', slots.default?.()) });
      export const Sheet = defineComponent({ props: ['open'], setup: (props, { slots }) => () => props.open ? h('div', slots.default?.()) : null });
      export const SheetContent=part, SheetDescription=part, SheetHeader=part, SheetTitle=part;`,
      }
    if (url === 'assistant-test:textarea')
      return {
        format: 'module',
        shortCircuit: true,
        source: `
      import { defineComponent, h } from 'vue';
      export const Textarea = defineComponent({ props: ['modelValue'], setup: (props) => () => h('textarea', { value: props.modelValue }) });`,
      }
    if (url === 'assistant-test:toast')
      return {
        format: 'module',
        shortCircuit: true,
        source: `
      export const toast = { error: (message) => globalThis.assistantTestToasts.push(message) };`,
      }
    if (url === apiMockUrl) {
      return {
        format: 'module',
        source: ts.transpileModule(
          ts
            .createSourceFile(
              'useAxiosService.ts',
              readFileSync(resolve(root, 'src/composables/useAxiosService.ts'), 'utf8'),
              ts.ScriptTarget.Latest,
              true
            )
            .statements.filter(
              (node) =>
                ts.isFunctionDeclaration(node) &&
                ['extractErrorMessage', 'getApiErrorMessage'].includes(node.name?.text)
            )
            .map((node) => node.getText())
            .join('\n') + '\nexport const useApi = () => globalThis.assistantTestApi;',
          { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }
        ).outputText,
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
