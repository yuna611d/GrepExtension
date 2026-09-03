# Change Log

All notable changes to the "Grep to File" extension will be documented in this file.

## Unreleased

- Added following feature

  - `grep2file.useEditorExcludes` (on by default) leaves out the files and folders the editor is
    already told to leave out, by honouring `files.exclude` and `search.exclude`. Searching this
    project used to read 5,098 files in 1.9s, 4,864 of them dependencies that matched nothing,
    and half its results came from its own build output; it now reads 130 files in 0.1s. Uncheck
    it to go back to searching everything under the workspace folders.

  - `grep2file.searchAllEncodings` (off by default) searches every file as UTF-8, UTF-16,
    Shift-JIS and EUC-JP, and reports a line that matches under any of them. Use it when a
    workspace mixes encodings and you would rather not configure `files.encoding`;
    `files.autoGuessEncoding` is ignored while it is on. Unmarked UTF-16 files are searched
    in this mode too. Searches are slower, since each non-ASCII file is decoded several times.

  - Files are now read the way VS Code itself reads them, instead of always as UTF-8. A byte
    order mark is honoured and removed, `files.encoding` is applied - including per-language
    overrides - and `files.autoGuessEncoding` is used when it is turned on. A search therefore
    sees each file exactly as opening it in the editor would.

- Fixed following bugs

  - A matched line containing a tab was not highlighted in the default `txt` format. The line is
    written to the result in full, but the text the highlight is measured against was read only
    as far as the next column separator - a tab, which is what txt writes its own columns with.
    A tab-indented line therefore yielded nothing to search, so every file indented that way
    (Go, Makefiles, anything else) lost all of its highlights, as did any line with a tab past
    the match. `csv` and `tsv` were never affected: they quote such a field and parse it back.

  - A search word containing `re/` was silently treated as a regular expression. The
    `re/{pattern}/{flags}` form is documented as the whole word, but the prefix was honoured
    anywhere inside it, so `feature/login/` searched for the pattern `login`, `core/lib/` for
    `lib`, and `a re/b/ c` for `b`. Path fragments are an ordinary thing to search for, and
    nothing in the result said the word had been reinterpreted. The prefix must now open the
    word; a pattern may still contain a slash.

  - A file ending in a line break reported one line more than it has. Nothing usually matches an
    empty line, so this only showed up in a search that does: looking for blank lines found a
    phantom in every file in the workspace, at a line number one past the end. A blank last line
    the file really has is still reported.

  - The regular expression that finds matches and the one that positions the highlights could
    disagree about case, depending on which was asked for first. Not reachable through the
    current code path, but the ignore-case flag is now settled when the search word is read
    rather than as a side effect of the first use.

  - Only the first folder of a multi-root workspace was searched. VS Code lets several folders
    be opened together - an app beside the library it uses, beside its docs - but the search
    walked the first of them and passed over the rest without a word, so a word sitting in plain
    sight in the second folder was reported as not being in the workspace. Every folder is now
    walked, in the order VS Code lists them, and all of them are named in the result's
    `Search Dir` line. A folder nested inside another one is still reported once. The result
    file continues to be written to the first folder.

  - A search held every file it had already read. The walk reads a few files ahead of the one
    it is reporting, which was meant to bound how much of the workspace is in memory at once -
    but nothing let go of a file afterwards, and the walk keeps a model for every entry in the
    directory it is walking. What was held therefore grew with the directory's total size
    instead: 128 MB of text in one directory peaked at 132 MB held, where reading eight files
    at a time should cost a fraction of that. Each file now lets go of its bytes and text once
    it has been reported, which holds the peak at about 20 MB however large the directory is.

  - Backing out of the search prompt left a file behind and apologised for it. Pressing Escape
    resolves the prompt with no word at all, which is not the same as asking to search for
    nothing - but the search ran anyway, created an empty `grep2File.g2f.txt` in the workspace,
    and then reported "Sorry, I can't grep this word...". Dismissing the prompt now does
    nothing at all. A word that was actually submitted but is empty is still reported, since
    that is a search this extension cannot run - but it no longer leaves a result file behind
    either: the search word is checked before anything is created.

  - A search with many matches slowed down as it went. Highlighting replaces every highlight it
    has already applied, so each update had to hand the editor the whole set of matches found so
    far - and that was done once per batch of 40. The work grew with the square of the matches:
    100,000 of them meant 2,500 updates carrying 125,050,000 ranges between them, 1,251 for every
    match found. Updates now become less frequent as the set grows, which brings that down to
    20 updates and 387,200 ranges - about three per match, whatever the total. Short searches
    still update on every batch, and the complete set is always shown once the search ends.

  - Highlights from earlier searches stayed in the result file. Each search applied its
    highlights with a decoration type of its own and never released it, so nothing could take
    the previous ones away - and once csv, tsv and json began replacing the previous result,
    those older highlights pointed at whatever text had since taken their place. A search that
    found nothing left the previous highlights untouched as well. All searches now share one
    highlight type, and each takes back what the last one left before it starts.

  - A search reported its own earlier results as matches. Only the result file for the format
    in use was skipped, so the file a previously configured format had left in the workspace
    was searched like any other. It went unnoticed while those files were never written.

  - The result file was never actually written. Every match was inserted into the editor, which
    left the document unsaved and the file itself empty - closing the editor without saving lost
    the results, and anything else reading the file found nothing in it. The file is now saved
    once the search finishes, including when it is cancelled or fails, so whatever was found is
    kept. A save that cannot be done is reported rather than passed over.

  - With `grep2file.outputTitle` off, txt output highlighted nothing. The matched word was
    looked for in the line-number column instead of the matched text, so it was never found -
    and searching for a number highlighted the line number rather than the text containing it.
    csv and tsv were unaffected.

  - UTF-16 files were never searched. Half the bytes of UTF-16 text are zero, which the check
    for binary files read as "not text", so they were skipped without being read at all.

  - A byte order mark was left at the start of the first line, where it sits invisibly before
    the first character - so a search anchored there missed, and the mark was copied into the
    result file.

  - Running a search twice corrupted the result file for every structured format. json ended up
    as two arrays back to back and no longer parsed at all, and csv and tsv gained a second
    column-title row in the middle of the file, which readers take for a data row. Those three
    formats now replace the previous result. txt still appends, as it has since 0.1.7.

  - A symlink whose target no longer exists failed the whole grep. Deciding whether the link
    was a file or a directory threw, and the error stopped the search before any file had been
    read, leaving an error message and an empty result file. An entry the filesystem will not
    describe is now skipped and the search carries on.

  - A directory symlink pointing back at one of its own parents failed the whole grep. The
    walk descended through the link over and over until the operating system refused, and the
    resulting error stopped the search before any file had been read, leaving an error message
    and an empty result file. Each directory is now visited once. Two links to the same
    directory no longer report its matches twice either.

  - Matched lines from files with CRLF line endings carried a trailing carriage return into
    the result. In json output this ended up inside every element's `text` value.

  - `grep2file.exclude` was declared as a string but read as an array of extensions.
    Setting it to a string failed the grep outright, and clearing it excluded every file in
    the workspace instead of none. The setting is now declared as an array, an old string
    value is still accepted, and an empty value excludes nothing.

  - `grep2file.exclude` entries were matched as regular expressions against the file
    extension, so excluding `js` also excluded `.json` files, and an entry containing regexp
    syntax (`c++`) failed the grep. Entries are now compared as whole extensions.

  - csv and tsv output did not quote its fields. A matched line containing the separator
    pushed every following column one to the right, and a matched line containing a double
    quote made readers swallow the rows after it. Fields are now quoted following RFC 4180.

  - A grep that found no matches could not be cancelled. The "this may take a long time"
    prompt is now shown, and cancellation honoured, regardless of how many matches were found.
    A cancelled grep also keeps the matches it had already found instead of dropping the
    last partial batch.

- Performance improvement

  - Skipping a binary file no longer reads it. The check looks at the first 512 bytes, but it
    used to load the whole file to get at them, so a large binary in the workspace was read
    into memory in full and then thrown away unsearched.

  - Every entry in the workspace was inspected twice to decide whether it was a file or a
    directory, once for each question. The answer is now looked up once per entry, halving
    the number of blocking filesystem calls a search makes.

  - A search no longer freezes the editor while it runs. Every file was read with a blocking
    call, so VS Code could not respond to typing, clicking or redrawing until the whole search
    had finished. Files are now read without blocking, and several questions about the
    workspace are asked at once rather than one after another.

  - A file small enough to hold is now read once for both the binary check and the search
    itself, instead of being opened for each. Larger files still have only their first bytes
    read to decide whether they are binary.

## 0.6.0

- Added following feature

  - JSON output format

- Fixed following bugs

  - Extension failed to build/run on newer Node/VS Code versions due to a file casing mismatch and use of removed Node APIs
  - csv/tsv output could lose the separator between matched lines
  - Match counts could differ between output formats for the same search

- Performance improvement

  - Results are now written in batches instead of one edit per matched line

## 0.5.5

- Update dependency modules

## 0.5.4

- Update dependency modules

## 0.5.3

- Comments of configuration are updated.

## 0.5.1 and 0.5.2

- Fixed following bug

  - Decorate after cancellation

## 0.5.0

- Added following feature

  - Functionality to cancel grep

## 0.4.1

- Fixed following bug

  - Binary files are searched

## 0.4.0

- Added following feature

  - Hilight found word

- Fixed following bugs

  - Ignore case when normal grep

## 0.3.0

- Added following configurations

  - Ignore hidden file by default

## 0.2.0

- Behavior is changed

  - Insert text when search word is found

## 0.1.7

- Added following functionality

  - Insert text after last line

## 0.1.4

- Added following configurations

  - Output file name

  - Output file format (txt, csv, tsv)

  - Option not to output title

## 0.1.3

- Added configuration to exclude some files which have specific extension.

## 0.1.2

- Bug fix for windows.

## 0.0.1

- Initial release
