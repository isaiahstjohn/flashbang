"use strict"

/*
 * USAGE
 *
 *  node parse.js myinput.notes [-mark]
 *
 *  Use the `-mark` flag to mark the notes in the .notes file with
 *  ID's. They will not be exported to the TSV file in the future.
 *
 */

import _fs from 'fs';
const fs = _fs.promises;

import markup from './markup.js';

(function(){
"use strict";

  const DEBUG = true;
  let NOTES_FILE;

  function htmlEscape(txt){
    return txt;
    //return txt.replace(/[&<>]/g, c => "&#" + c.charCodeAt(0) + ";");
  }

  function newId(){
    let timestamp = Date.now().toString(36);
    let rand = Math.floor(Math.random() * Math.pow(10, 17))
      .toString(36);
    return `${timestamp}-${rand}`;
  }
  
  let lineChanges = [];
  function queueLineChange(lineNumber, newLineText){
    // TODO: queue up line replacements to be executed after done generating
    // card file
    lineChanges.push([lineNumber - 1, newLineText]);
  }
  function changeLines(txt){
    let lines = txt.split('\n');
    lineChanges.forEach(change => {
      let [lineNumber, newLineText] = change;
      lines[lineNumber] = newLineText;
    });
    return lines.join('\n');
  }

class Field {
  static FRONT = Symbol("Front Field");
  static BACK = Symbol("Back Field");
  static SIDE = Symbol("Side Field");
  static CLOZE = Symbol("Cloze Field");
  static types = new Set([Field.FRONT, Field.BACK, Field.SIDE,
    Field.CLOZE]);

  constructor(_type, _defaultLang) {
    const type = _type;
    const defaultLang = _defaultLang;
    let lines = [];

    // (content: string)
    this.push = function(line){
      lines.push(line);
    }

    this.toString = function(){
      return markup.markupText(lines.join('\n'), defaultLang);
    }
  } // constructor(type)
} // class Field

/*
 * @class Note
 * @instancemethod: newField(fileName: string, lineNum: number, fieldType: Symbol)
 * @instancemethod: pushContent(fileName: string, lineNum: number, content: string)
 * @instancemethod: endNote(fileName: string, lineNum: number)
 */
class Note {
  // We use the patterns from crockford.com/javascript/private.html
  // in this class.
  static BASIC = Symbol("Basic Note");
  static REVERSIBLE = Symbol("Reversible Note");
  static CLOZE = Symbol("Cloze Note");

  // (initialFileName: string, initialLineNum: string, defaultLang: string)
  constructor(initialFileName, initialLineNum, _defaultLang, _id){
    let that = this;
    let fields = [];                // private
    let type = undefined;           // private
    let counts = new Map([          // private
      [Field.FRONT, 0],
      [Field.BACK, 0],
      [Field.SIDE, 0],
      [Field.CLOZE, 0]
    ]);
    const defaultLang = _defaultLang;
    const id = _id;
    let END_NOTE = false;           // private
    /*
     * Note types and field count rules:
     *   Note.BASIC:
     *     Field.FRONT = 1
     *     Field.BACK = 1
     *     Field.SIDE = 0
     *     Field.CLOZE = 0
     *   Note.REVERSIBLE:
     *     Field.FRONT = 0
     *     Field.BACK = 0
     *     Field.SIDE = 2
     *     Field.CLOZE = 0
     *   Note.CLOZE:
     *     Field.FRONT = 0
     *     Field.BACK = 0
     *     Field.SIDE = 0
     *     Field.CLOZE = 1
     */
    // (): string || undefined
    function invariantsViolation(){          // private    
      const fronts = counts.get(Field.FRONT);
      const backs = counts.get(Field.BACK);
      const sides = counts.get(Field.SIDE);
      const clozes = counts.get(Field.CLOZE);
      assert(fronts + backs + sides + clozes === fields.length);
      if(fronts > 1) return `No note may have more than one ":Front" field`;
      if(backs > 1) return `No note may have more than one ":Back" field`;
      if(sides > 2) return `No note may have more than two ":Side" fields`;
      if(clozes > 1) return `No note may have more than one ":Cloze" field`;
      if((fronts || backs) && (sides || clozes)){
        return `":Front" and ":Back" fields may not used in the same note as":Side" or ":Cloze" fields`;
      }
      if(sides && clozes) return `":Side" and ":Cloze" fields may not be used together in the same note`;
      if(fronts || backs) assert(type === Note.BASIC);
      if(sides)          assert(type === Note.REVERSIBLE);
      if(clozes)         assert(type === Note.CLOZE);
      if(END_NOTE){
        switch(type){
          case Note.BASIC:
            if(fronts === 0){
              return `A note that has a ":Back" field must have a ":Front" field, as well.`;
            }else if(backs === 0){
              return `A note that has a ":Front" field must have a ":Back" field, as well.`;
            }
            assert(fronts === 1 && backs === 1);
            break;
          case Note.REVERSIBLE:
            if(sides === 1){
              return `A note may not have only one ":Side" field. Reversible notes must have two ":Side" fields, and other note types may not have any ":Side" fields.`;
            }
            assert(sides === 2);
            break;
          case Note.CLOZE:
            assert(clozes === 1)
            break;
          case undefined:
            assert(fronts === 0 &&
              backs === 0 &&
              sides === 0 &&
              clozes === 0);
            return `All notes must contain one or more fields`;
          default:
            assert(false);
        } // switch(type)
      } // if(END_NOTE)
    } // invariantsViolation()  

    // (fileName: string, lineNum: number)
    function checkInvariants(fileName, lineNum){
      const violation = invariantsViolation();
      if(violation){
        userError(`(${fileName}:${lineNum}) Input Error: ${violation}`);
      }
    }

    // (fileName: string, lineNum: number, fieldType: Symbol)
    this.newField = function(fileName, lineNum, fieldType){    // privileged
      assert(Field.types.has(fieldType));
      fields.push(new Field(fieldType, defaultLang));
      counts.set(fieldType, counts.get(fieldType) + 1);
      if(!type){
        switch(fieldType){
          case Field.SIDE:
            type = Note.REVERSIBLE;
            break;
          case Field.CLOZE:
            type = Note.CLOZE;
            break;
          case Field.FRONT:
          case Field.BACK:
            type = Note.BASIC;
            break;
          default:
            assert(false);
        }
      }
      checkInvariants(fileName, lineNum);
    } // this.newField()

    // (fileName: string, lineNum: number)
    this.endNote = function(fileName, lineNum){
      END_NOTE = true;
      checkInvariants(fileName, lineNum);
    }

    this.pushContent = function(content){
      let tail = fields.slice(-1)[0];
      assert(tail);
      tail.push(content);
    }

    checkInvariants(initialFileName, initialLineNum);

    this.getType = function(){
      return type;
    }

    this.toString = function(){
      if(id) return '';
      let _id = newId();
      let content = fields.map(field => field.toString()).join('\t');
      content += `<span id="noteId" style="display:none;">%%%${_id}%%%</span>`;
      queueLineChange(initialLineNum, `%%% ${_id}`);
      return content;
    }
  } // constructor()

} // class Note

// (fileName: string)
async function parseFile(){
  let fileName = process.argv[2];
  NOTES_FILE = fileName;
  const originalText = await fs.readFile(fileName, 'utf8');
  let lines = originalText.replace(/\t/g, '  ');
  lines = lines.split('\n');
  let fileLang;
  let notes = [];
  for(const [index, line] of lines.entries()){
    const lineNum = index + 1;
    let tail = notes.slice(-1)[0];
    function illegalHeadError(){
      userError(`(${fileName}:${lineNum}) Input Error: Only ":Lang" labels and comments are permitted in the head of a file`);
    }
    // ignore comments
    if(line.match(/^:[\s]/)) continue; 
    //ignore blank lines in head of file
    if(!tail && line.match(/^\s*$/)) continue;
    if(!line.match(/^:|^%%%/)){
      // not a label
      if(!tail) illegalHeadError();
      tail.pushContent(line);
      continue;
    }
    let label = /^:[^\s]+|^%%%/.exec(line);
    assert(label);
    label = label[0];
    let type;
    switch(label){
      case ":Lang":
        if(tail){
          userError(`($(fileName}:${lineNum}) Input Error: A ":Lang" directive can only appear in the head of a file.`);
        }
        let match = /^:Lang\s+(\w+)/.exec(line);
        if(match){
          fileLang = match[1];
          continue;
        }else{
          userError(`(${fileName}:${lineNum}) Input Error: No language is specified in the :Lang label`);
        }
      case "%%%":
        type = Field.NOTE;
        if(tail){
          tail.endNote(fileName, lineNum);
        }
        let noteId = /%%%\s+(\w+)/.exec(line)
        noteId = noteId ? noteId[1] : '';
        notes.push(new Note(fileName, lineNum, fileLang, noteId));
        continue;
      case ":Front":
        type = Field.FRONT;
        break;
      case ":Back":
        type = Field.BACK;
        break;
      case ":Side":
        type = Field.SIDE;
        break;
      case ":Cloze":
        type = Field.CLOZE;
        break;
      default:
        userError(`(${fileName}:${lineNum}) Input Error: "${label[0]}" is an undefined label.`);
    } // switch(label)
    if(!tail) illegalHeadError();
    tail.newField(fileName, lineNum, type);
  } // for(const [index, line] of lines.entries())
  
  let cardCollections = { "basic": [], "reversible": [], "cloze": [] };
  let cardTypes = {
    [Note.BASIC]: "basic",
    [Note.REVERSIBLE]: "reversible",
    [Note.CLOZE]: "cloze"
  };
  notes.forEach( note => {
    let typeName = cardTypes[note.getType()];
    cardCollections[typeName].push(note.toString());
  });
  for(let typeName of Object.keys(cardCollections)){
    let collection = cardCollections[typeName];
    let output = collection.join('\n');
    if(/\S/.test(output)){
      fs.writeFile(fileName + "__" + typeName + ".txt", output);
    }
  }
  let updatedText = changeLines(originalText);
  if(process.argv[3] === "-mark") fs.writeFile(fileName, updatedText);
} // parseFile(fileName)

function assert(predicate){
  if(!predicate){
    console.trace();
    throw `Assertion error`;
  }
}

function userError(msg){
  if(DEBUG){
    console.trace();
  }
  console.error(msg);
  process.exit(1)
}

(async function(){
  try{
    await parseFile(NOTES_FILE);
  } catch (e){
    console.error(e);
  }
})();
})();
