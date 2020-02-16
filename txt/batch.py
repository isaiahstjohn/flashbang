#!/usr/bin/env python3
file_names = [
'js-arrays.notes__basic.txt',
'js-regex.notes__basic.txt',
'js-regex.notes__cloze.txt',
'js-regex.notes__reversible.txt',
'tmux.notes__basic.txt',
'tmux.notes__reversible.txt',
'vim.notes__basic.txt',
'vim.notes__cloze.txt',
'vim.notes__reversible.txt']

def groupby(str):
    text = []
    for name in file_names:
        if str in name:
            with open(name, 'r') as f:
                text.append(f.read())
    text = '\n'.join(text)
    with open(f'_{str}__batched.txt', 'w') as f:
        f.write(text)

for type in ['basic', 'cloze', 'reversible']:
    groupby(type)

