/* Pasting from Word into the Journal editor.
   Word's copied HTML wraps long lines with line breaks where the spaces should be, and the editor drops them,
   gluing words together ("theunderlying"). For pastes that come from Word only, turn those line breaks back into
   spaces and hand the cleaned text to the editor's own paste handling. Every other paste is left alone. */
(function () {
  function fromWord(html) { return /urn:schemas-microsoft-com|class="?Mso|mso-/i.test(html); }
  function slateEditor(el) {
    var key = Object.keys(el).find(function (k) { return k.indexOf('__reactFiber') === 0; });
    var f = key && el[key], n = 0;
    while (f && n < 60) { var p = f.memoizedProps; if (p && p.editor && typeof p.editor.insertData === 'function') return p.editor; f = f.return; n++; }
    return null;
  }
  document.addEventListener('paste', function (e) {
    var cd = e.clipboardData; if (!cd) return;
    var html = cd.getData('text/html');
    if (!html || !fromWord(html)) return;
    var box = e.target && e.target.closest && e.target.closest('[data-slate-editor]');
    var editor = box && slateEditor(box);
    if (!editor) return; // can't help: let the editor paste as usual
    try {
      var dt = new DataTransfer();
      dt.setData('text/html', html.replace(/<!--[\s\S]*?-->/g, '').replace(/\r?\n/g, ' '));
      dt.setData('text/plain', (cd.getData('text/plain') || '').replace(/\r\n/g, '\n'));
      e.preventDefault(); e.stopImmediatePropagation();
      editor.insertData(dt);
    } catch (err) { /* fall back to the editor's normal paste */ }
  }, true);
})();
