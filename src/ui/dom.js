export function element(tag, { className, text, ...attributes } = {}, children = []) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  node.append(...children);
  return node;
}

export const assetUrl = path => `${import.meta.env.BASE_URL}assets/${path}`;
export const logo = () => element('img', { className: 'logo', src: assetUrl('branding/nawras-name.png'), alt: 'NawrasEdu', width: '300', height: '100' });
