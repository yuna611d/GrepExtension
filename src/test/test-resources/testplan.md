# Test Plan

## Auto Test

* TXT
  * content compare
    * default mode
    * regexp mode
* CSV
  * content compare
    * default mode
    * regexp mode
  * a matched line containing the separator or a double quote is quoted, so every row keeps
    the same column count
* TSV
  * content compare
    * default mode
    * regexp mode
  * same quoting rule as CSV, with the tab as the separator
* JSON
  * content compare
    * default mode
    * regexp mode
  * output parses as valid JSON

## Manual Test

* decoration
  * highlighted in txt / csv / tsv
  * intentionally not applied in json
