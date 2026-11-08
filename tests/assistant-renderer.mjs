import { createRenderer, nextTick } from 'vue'
import { setImmediate } from 'node:timers'

export function createAssistantRenderer() {
  const renderer = createRenderer({
    createElement: (tag) => ({ tag, children: [], props: {} }),
    createText: (text) => ({ text }),
    createComment: () => ({ text: '' }),
    insert(node, parent, anchor) {
      if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1)
      const index = anchor ? parent.children.indexOf(anchor) : -1
      parent.children.splice(index < 0 ? parent.children.length : index, 0, node)
      node.parent = parent
    },
    remove(node) {
      if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1)
    },
    setText: (node, text) => {
      node.text = text
    },
    setElementText: (node, text) => {
      node.text = text
      node.children = []
    },
    parentNode: (node) => node.parent,
    nextSibling: (node) => node.parent?.children[node.parent.children.indexOf(node) + 1] ?? null,
    patchProp: (node, key, _old, value) => {
      node.props[key] = value
    },
  })
  const root = { children: [] }
  const text = (node = root) => (node.text ?? '') + (node.children ?? []).map(text).join(' ')
  const find = (predicate, node = root) =>
    predicate(node)
      ? node
      : (node.children ?? []).map((child) => find(predicate, child)).find(Boolean)
  const button = (label) => find((node) => node.tag === 'button' && text(node).trim() === label)
  return { renderer, root, text, button, find }
}

export async function flushAssistant() {
  await nextTick()
  await new Promise((resolve) => setImmediate(resolve))
  await nextTick()
}
