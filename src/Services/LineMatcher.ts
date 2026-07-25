import { Common } from '../Commons/Common';

export class LineMatcher {

    public static splitIntoNumberedLines(content: string, startLine = 0): { lineText: string; lineNumber: number }[] {
        const counter = (s: number) => { let i = s; return () => ++i; };
        const lineCounter = counter(startLine);
        return content.split(Common.LINE_BREAK)
                       .slice(startLine)
                       .map(line => ({ lineText: line, lineNumber: lineCounter() }));
    }

    public static isContainSearchWord(re: RegExp, targetString: string): boolean {
        return re.test(targetString);
    }

}
