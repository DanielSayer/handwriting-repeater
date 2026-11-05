import fs from 'fs';
const names = process.argv.slice(2);
let h = '<html><body style="margin:0;padding:16px;font-family:sans-serif;background:#fff">';
for (const bg of ['#f1f3f4', '#202124']) {
  h += `<div style="display:flex;gap:36px;align-items:end;padding:14px;background:${bg};margin-bottom:10px">`;
  for (const f of names) {
    const s = fs.readFileSync(`fav/${f}.svg`, 'utf8').replace('<svg ', '<svg width="X" height="X" ');
    h += `<div style="display:flex;gap:10px;align-items:end">${[16, 32, 64, 128].map((z) => s.replace(/"X"/g, `"${z}"`)).join('')}</div>`;
  }
  h += '</div>';
}
fs.writeFileSync('fav/_sheet.html', h + '</body></html>');
