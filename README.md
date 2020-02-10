# Flashbang
This project creates Anki notes to be imported into the Anki spaced
repetition flashcard application. Notes are specified in text files
using a custom format. These files are then parsed to generate .TSV 
files for import into Anki. 

## .notes file format
Note files are broken up into sections by lines beginning with `%%%`.
The first section of each file is the header. The header contains any 
labels specifying file configurations. Currently, the only file 
configuration label is the optional `:Lang` directive to specify the 
default programming language for code snippets. File comments may be 
placed in the first section, as well. All subsequent sections in the 
file represent notes.

Lines consisting of a label that begins with a colon are used to mark
the beginning of each field in a note.

Begin a line with a colon and a space to mark the line as a comment
that will be ignored when generating notes.

Inline code can be marked with backticks. If a `:Lang` directive is
present in the file's header, the code will be assumed to be in that
language. Multi-line code blocks can be marked with triple backticks as in
GitHub Flavored Markdown.

### Labels
#### :Lang
Used in the header to specify a default programming language for code
snippets within the file.

#### :Front
The front field of a *Basic* note.

#### :Back
The back field of a *Basic* note.

#### :Side
Either the front or back of a *Basic (and reversed card)* note. Use
this label for both Front and Back fields for these notes. Anki will
then create two cards from the note, one the reverse of the other.

#### :Cloze
The primary field of a *Cloze* note.

#### :Extra
This optional field can be used in any note type to provide additional
information on the note's card(s) after the flip.
