import hljs from 'highlight.js'

function highlightInlineCode(text, defaultLang){
  // re captures text between single backticks and double backticks
  // can be included within a pair of single backticks
  //let re = /(?:[^`]|^)`((?:[^`]|``)+?)`(?:[^`]|$)/g;
  let re = /`([^]*?)`/g;
  text = text.replace(re, (_, match) => {
    match = hljs.highlight(defaultLang, match, true).value;
    match = `<span class="inline-code">${match}</span>`;
    return match;
  });
  return text;
}

function highlightCode(text, defaultLang){
  text = text.replace(/```(\w*)\s*\n([^]*?)```/g, (_, lang, code) => {
    code = hljs.highlight(lang, code, true).value;
    code = `<div class="code"><pre><code>${code}</code></pre></div>`;
    // escape backticks by doubling them: ``
    //code = code.replace(/`/g, "``");
    return code;
  });
  text = highlightInlineCode(text, defaultLang);
  // unescape backticks
  //text.replace(/``/g, "`");
  return text;
}

function linkify(text){
  return text.replace(/https?:\/\/[^\s<]+/g, "<a href='$&'>$&</a>");
}

function markupText(text, defaultLang){
  text = highlightCode(text, defaultLang);
  text = text.replace(/\n/g, "<br>");
  text = linkify(text);
  return text;
}

export default {
  highlightInlineCode: highlightInlineCode,
  highlightCode: highlightCode,
  linkify: linkify,
  markupText: markupText
}
