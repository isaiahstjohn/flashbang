import markup from './markup.js';

let markupTests = [
  "`some code 123` some regular text",
"\nSome text\n\n```js\n12 + 3 === 15\n```\nhttp://mdn.io/array\n" + 
"\n`1+1`"

];
markupTests.forEach(test => {
  console.log(`IN
${test}

OUT
${markup.markupText(test, 'js')}

`);
});
