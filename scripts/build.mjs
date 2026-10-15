import {readFile, writeFile} from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const [html, css, i18n, appearance, js] = await Promise.all(
  ['source/startpage.html', 'source/style.css', 'source/i18n.js', 'source/appearance.js', 'source/app.js']
    .map(path => readFile(new URL(path, root), 'utf8'))
);
const assets = [
  ['<link rel="stylesheet" href="style.css">', '<style id="appStyle">', css, '</style>'],
  ['<script src="i18n.js"></script>', '<script id="i18nCode">', i18n, '</script>'],
  ['<script src="appearance.js"></script>', '<script id="appearanceCode">', appearance, '</script>'],
  ['<script src="app.js"></script>', '<script id="appCode">', js, '</script>']
];
if (/<\/script/i.test(js + i18n + appearance) || /<\/style/i.test(css)) {
  throw new Error('Source contains a closing HTML tag that cannot be embedded safely.');
}
let output = html;
for (const [reference, opening, content, closing] of assets) {
  if (!output.includes(reference)) throw new Error('Missing source asset reference: ' + reference);
  output = output.replace(reference, () => opening + content + closing);
}
await writeFile(new URL('startpage.html', root), output);
console.log('Created startpage.html with embedded offline translations');
