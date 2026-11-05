// Renders shared board content into every .board element (960x560 coordinate space).
// Letters are single-stroke paths (foundation print), so ink looks drawn rather than typeset.
// data-state="empty" renders lines only + a quiet hint.
(function () {
  const rows = [158, 318, 478];
  // baseline 0, x-height -46, ascender -80, descender +36
  const bowl = 'M34 -37C28 -48 6 -48 4 -24C2 -3 26 2 34 -15';
  const L = {
    a: [bowl, 'M34 -46V0'],
    b: ['M5 -80V0', 'M5 -25C8 -48 37 -50 37 -24C37 2 9 2 5 -13'],
    c: ['M34 -38C26 -50 4 -46 4 -23C4 0 26 2 35 -9'],
    d: [bowl, 'M34 -80V0'],
    e: ['M6 -24H35C34 -46 8 -50 5 -26C2 -2 26 2 34 -8'],
    f: ['M31 -75C25 -82 14 -80 14 -66V0', 'M2 -45H28'],
    g: [bowl, 'M34 -46V20C34 37 12 40 3 29']
  };
  const ADV = 68, X0 = 78;
  const letter = (ch, i, y, j) => {
    const [dx, dy, rot] = j ? j[i % j.length] : [0, 0, 0];
    const x = X0 + i * ADV;
    return `<g transform="translate(${x + dx} ${y + dy}) rotate(${rot})">${L[ch].map((d) => `<path d="${d}"/>`).join('')}</g>`;
  };
  const word = (t, y, j) => [...t].map((ch, i) => letter(ch, i, y, j)).join('');
  const lineSet = (y) => `
    <line x1="0" x2="960" y1="${y - 80}" y2="${y - 80}" stroke="#a9c0de" stroke-width="1.6"/>
    <line x1="0" x2="960" y1="${y - 46}" y2="${y - 46}" stroke="#b8cbe3" stroke-width="1.6" stroke-dasharray="8 8"/>
    <line x1="0" x2="960" y1="${y}" y2="${y}" stroke="#d9837b" stroke-width="1.8"/>`;
  const guideG = (inner) => `<g fill="none" stroke="#c4cad2" stroke-width="11" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`;
  const inkG = (c, inner) => `<g fill="none" stroke="${c}" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`;
  const j1 = [[1, 1, -2], [-1, 0, 2], [2, -1, -1], [0, 2, 3], [-2, 0, -2], [1, -1, 2], [0, 1, -1]];
  const j2 = [[-2, 1, 3], [2, -1, -2], [0, 2, 2], [1, 0, -3]];
  const lined = rows.map(lineSet).join('');
  const full = `
    ${lined}
    ${guideG(rows.map((y) => word('abcdefg', y)).join(''))}
    ${inkG('#1f5fd1', word('abcdefg', rows[0], j1))}
    ${inkG('#d8392f', word('abcd', rows[1], j2))}
    <circle cx="${X0 + 4 * ADV + 6}" cy="${rows[1] - 24}" r="6" fill="#d8392f"/>`;
  document.querySelectorAll('.board').forEach((b) => {
    const empty = b.dataset.state === 'empty';
    b.insertAdjacentHTML('afterbegin', `<svg class="board-svg" viewBox="0 0 960 560" preserveAspectRatio="xMidYMid meet" aria-label="Drawing board">${empty ? lined : full}</svg>`);
    if (empty) b.insertAdjacentHTML('beforeend', '<p class="empty-hint"><span>Start writing anywhere</span></p>');
  });
})();
