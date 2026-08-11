import { Common } from '../Commons/Common';

export class LineMatcher {

    public static splitIntoNumberedLines(content: string, startLine = 0): { lineText: string; lineNumber: number }[] {
        const counter = (s: number) => { let i = s; return () => ++i; };
        const lineCounter = counter(startLine);
        return content.split(Common.LINE_BREAK)
                       .slice(startLine)
                       .map(line => ({ lineText: LineMatcher.stripLineEnding(line), lineNumber: lineCounter() }));
    }

    /**
     * Splitting on "\n" alone leaves the "\r" of a CRLF pair attached to the end of every line.
     * That trailing character is part of the file's line ending, not of its text, and carrying it
     * into a match corrupts the output: in json it lands inside the escaped "text" value as a
     * literal \r, so every element of a grep over CRLF sources ends with one.
     */
    protected static stripLineEnding(line: string): string {
        return line.endsWith("\r") ? line.slice(0, -1) : line;
    }

    public static isContainSearchWord(re: RegExp, targetString: string): boolean {
        return re.test(targetString);
    }

}
