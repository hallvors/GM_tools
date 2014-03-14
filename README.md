GM_tools
========

GreaseMonkey tools and utility scripts for my own debugging purposes

## Copy element with CSS

This script helps isolate problems and minimise test cases. With this script installed, you can *Ctrl+double click* any element on a page to copy that element and all CSS rules that apply to it to the clipboard. If you *Ctrl-Shift+double click* you also get all ancestor elements and the styling applied to them (but no siblings or other parts of the tree)

Tip: if you're clicking content that has onclick handlers or other annoyances, making it hard to double-click, doing a right mouse button double click also works.

## CSS fixer

This script helps debug -webkit- CSS styling issues. When enabled, it will parse all stylesheets ( using the reworkcss parser from https://github.com/reworkcss/css ) and attempt to translate all -webkit- prefixed properties and values to standardised ones. (It should handle most flexbox related styling pretty carefully, other properties are still mostly just handled by removing the string "-webkit-" but I intend to improve it as I find sites that need more sophistication. Pull requests, bug reports and general advice welcome!)
 