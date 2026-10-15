/** Get an element by id, failing loudly if index.html is missing it. */
export function $<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
}

type Child = Node | string | null | undefined | false;

/**
 * Creates an element. Text is always inserted as text (never as HTML),
 * so store product names can't inject anything into the page.
 *   el('button', { class: 'go', onclick: () => ... }, 'Play')
 */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: { class?: string; onclick?: (e: MouseEvent) => void; attrs?: Record<string, string>; disabled?: boolean } = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (props.class) node.className = props.class;
  if (props.onclick) node.onclick = props.onclick;
  for (const [k, v] of Object.entries(props.attrs ?? {})) node.setAttribute(k, v);
  if (props.disabled && node instanceof HTMLButtonElement) node.disabled = true;
  for (const c of children) if (c !== null && c !== undefined && c !== false) node.append(c);
  return node;
}
