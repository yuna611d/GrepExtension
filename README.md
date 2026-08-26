# README

This extension does grep and output result to a file.

## Features

1. You can search word in current workspace.
    * This extension checks whether there is a word for each line.
1. You'll get a file, which has result of grep.
1. You can use regular expression for grep.

    1. You can use following regular expression flags

        * i: ignore case

## Usage

![Usage](images/demo001.gif)

### Regular Expression

Regular expression format

* re/{pattern}/{flags}

Examples

* re/LO/i

* re/dolor(|e)/

## Configuration

### grep2file.exclude

You can exclude files which have specified extensions. The setting is a list of file extensions,
written with or without a leading dot and matched case-insensitively:

```json
"grep2file.exclude": ["bin", "dll", "sln"]
```

Each entry is a whole extension rather than a pattern, so `"js"` excludes `.js` files and leaves
`.json` files in the search. An empty list excludes nothing.

### grep2file.outputFileName

You can change output file name.

#### Running a search twice

`txt` keeps a running log: a second search is written below the first, each introduced by its own
condition block. `csv`, `tsv` and `json` replace what the previous search left instead, because
each of them has to be one well-formed document - appending would put a second header row in the
middle of a csv, and would leave json as two arrays back to back.

### grep2file.outputContentFormat

You can opt following format.

* txt: default format

* csv: csv format

    Fields are quoted following RFC 4180: a field containing a comma, a double quote or a line
    break is wrapped in double quotes, and a double quote inside it is doubled. Matched lines
    routinely contain commas and quotes, so without this the columns of those rows do not line
    up for a reader such as Excel or pandas.

* tsv: tsv format

    Same quoting rule as csv, with the tab as the separator.

* json: json format

    Results are written as a JSON array. Each element has `filePath`, `lineNumber` and `text`.

    ```json
    [
    {"grepCondition":["Search Dir: /path/to/workspace","Search Word: lo","RegExpMode: OFF"]},
    {"filePath":"/path/to/workspace/fileA.txt","lineNumber":2,"text":"Lorem ipsum dolor sit amet,"}
    ]
    ```

    The leading `grepCondition` element is only present when `grep2file.outputTitle` is enabled.
    Matched words are not highlighted in this format, because escaping shifts the position of a
    match inside the `text` value.

### grep2file.outputTitle

You can opt following options.

* true: output title which is grep configuration

* false: hide title which is grep configuration

### grep2file.ignoreHiddenFile

You can ignore hidden file from search target

* true: ignore hidden file from search

* false: include hidden file in search target

## Encoding

Files are read the way VS Code itself reads them, so a search sees each file exactly as opening
it in the editor would:

* A byte order mark is honoured, and removed from the text rather than left at the start of the
  first line. UTF-16 files are searched normally.
* [`files.encoding`](https://code.visualstudio.com/docs/getstarted/settings) is applied,
  including any per-language override such as `"[plaintext]": { "files.encoding": "shiftjis" }`.
* If you turn on `files.autoGuessEncoding`, VS Code's guessing applies here too.

Nothing in a Shift-JIS or EUC-JP file says which encoding it is in, so without one of those two
settings such a file falls back to UTF-8 and its text becomes mojibake — the same thing you would
see on opening it. Setting `files.encoding` (or turning on `files.autoGuessEncoding`) fixes the
search and the editor together.

The result file is written as UTF-8.
