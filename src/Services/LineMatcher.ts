import { Common } from '../Commons/Common';

export class LineMatcher {

    public static splitIntoNumberedLines(content: string, startLine = 0): { lineText: string; lineNumber: number }[] {
        const counter = (s: number) => { let i = s; return () => ++i; };
        const lineCounter = counter(startLine);
        return LineMatcher.splitLines(content)
                       .slice(startLine)
                       .map(line => ({ lineText: LineMatcher.stripLineEnding(line), lineNumber: lineCounter() }));
    }

    /**
     * The lines of a file, as a person counting them in the editor would.
     *
     * A file that ends with a line break has nothing after that break, but splitting on it
     * produces one more empty piece regardless - so every such file, which is most of them,
     * reported a line one past its end. Nothing usually matches an empty line, which is why it
     * went unnoticed; a search that does match one - looking for blank lines with re/^\s*$/ -
     * found a phantom in every file in the workspace, at a line number the editor cannot go to.
     */
    protected static splitLines(content: string): string[] {
        const lines = content.split(Common.LINE_BREAK);
        // Only the one the final break produces. A file ending in two breaks really does have a
        // blank last line, and that one is the file's, not the split's.
        if (lines.length > 1 && lines[lines.length - 1] === "") {
            lines.pop();
        }
        return lines;
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
