# Change Log

All notable changes to the "Grep to File" extension will be documented in this file.

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
