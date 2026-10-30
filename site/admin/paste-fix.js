/* Pasting from Word into the Journal editor.
   Word puts line breaks inside each paragraph of the text it copies, and the editor drops them, gluing words together
   ("theunderlying"). Only for pastes that come from Word: read the paragraphs, tidy the spacing, and type them in
   paragraph by paragraph. Every other paste is left alone. */
(function () {
  function fromWord(html) { return /urn:schemas-microsoft-com|class="?Mso|mso-/i.test(html); }
  document.addEventListener('paste', function (e) {
    var cd = e.clipboardData; if (!cd) return;
    var html = cd.getData('text/html');
    if (!html || !fromWord(html)) return;
    var box = e.target && e.target.closest && e.target.closest('[data-slate-editor]');
    if (!box || !document.queryCommandSupported || !document.queryCommandSupported('insertText')) return;
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var paras = [].slice.call(doc.body.querySelectorAll('p, h1, h2, h3, h4, li'))
      .map(function (el) { return (el.textContent || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim(); })
      .filter(function (t) { return t; });
    if (!paras.length) return;
    e.preventDefault(); e.stopImmediatePropagation();
    paras.forEach(function (t, i) {
      if (i) document.execCommand('insertParagraph');
      document.execCommand('insertText', false, t);
    });
  }, true);
})();
