# Change Log

All notable changes to the "Grep to File" extension will be documented in this file.

## Unreleased

- Fixed following bugs

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
