'use strict';

export class SearchWordConfiguration {

    public get SearchWord() {return this.searchWord;}
    public get IsRegExpMode() {return this.isRegExpMode;}
    public get RegExpOptions() {return this.regExpOptions;}

    private searchWord = '';
    private isRegExpMode = false;
    private regExpOptions =  '';

    private resetConfiguration() {
        this.searchWord = '';
        this.isRegExpMode = false;
        this.regExpOptions =  '';    
    }

    private setInitialConfiguration(searchWord: string) {
        this.resetConfiguration();
        this.searchWord = searchWord;
    }

    private setRegExpMode(pattern: string, options: string) {
        this.searchWord = pattern;
        this.isRegExpMode = true;
        this.regExpOptions = options;
    }

    /**
     * A word that is not a pattern is matched whatever its case: somebody typing "needle" means
     * the word, not that spelling of it.
     *
     * Decided here, while the word is being configured, rather than the first time a RegExp is
     * asked for. It used to be a side effect of the non-global getRegExp(), so which flags a
     * search ran with depended on the order the two callers happened to ask in - ask for the
     * global one first and it came back without the i, leaving the regexp that finds matches and
     * the one that highlights them disagreeing about case. The order happens to be right today,
     * which is exactly what makes it worth not depending on.
     */
    private addIgnoreCaseOption() {
        this.regExpOptions += (this.regExpOptions.indexOf('i') === -1) ? 'i': '';
    }

    public hasValidSearchWord(): boolean {
        if (this.SearchWord === null || this.SearchWord === undefined || this.SearchWord.length === 0) {
            return false;
        }
        return true;
    }

    /**
     * Set parameters for regular expression.
     * @param searchWord: searchWord
     */
    public configure(searchWord: string | null | undefined) {
        // Guard
        if (searchWord === null || searchWord === undefined) {
            return;
        }

        // Set Initial  Configuration
        this.setInitialConfiguration(this.escapeRegExpWord(searchWord));

        // re/<pattern>/<flags> -> [<pattern>, <flagCandidates>]
        const splittedWords = this.getPatternAndFlagCandidates(searchWord);        
        // Get Pattern, which may be option of regexp
        const pattern = splittedWords[0];
        if (!pattern) {
            // A plain word, so it is matched whatever its case.
            this.addIgnoreCaseOption();
            return;
        }
        // Get Flags from input word
        const options = this.getFlags(splittedWords[1]);

        // Configure for regexp
        this.setRegExpMode(pattern, options);
    }


    public getRegExp(isGlobal?: boolean): RegExp {

        if (isGlobal) {
            // Intentionally not cached into this._regExp: that field backs the non-global
            // getRegExp() calls below, and a global-flagged RegExp is stateful (its lastIndex
            // advances on every exec/test). Caching it there would let a later non-global call
            // silently receive a stateful regex and start missing matches depending on call order.
            return new RegExp(this.SearchWord, this.RegExpOptions + 'g');
        }

        if (this._regExp === null) {
            return this._regExp = new RegExp(this.SearchWord, this.RegExpOptions);
        }

        return this._regExp;
    }
    private _regExp: RegExp | null = null;


    private getPatternAndFlagCandidates(searchWord: string): Array<string | null>{    

        // StartPos
        const startPos = this.getPatternStartPos(searchWord);
        if (!startPos) {
            return [null, null];
        }
        // EndPos
        const endPos = this.getPatternEndPos(searchWord, startPos);
        if (!endPos){
            return [null, null];
        }

        // Return pattern and flagCandidates
        const pattern = this.getPattern(searchWord, startPos, endPos);
        const flags = this.getFlagCandidates(searchWord, endPos);
        return [pattern, flags];
    }

    private getFlags(flagCandidates: string | null): string {
        const ALLOWED_OPTIONS = ["i"];

        return (flagCandidates || "").split("")
            .filter(c => { return ALLOWED_OPTIONS.indexOf(c) > -1; })
            .reduce((option, candidate) => {return option += candidate;}, "");
    }

    /**
     * Where the pattern starts, for a word written in the documented re/{pattern}/{flags} form.
     *
     * The prefix has to open the word. It used to be looked for anywhere inside it, so any text
     * that happened to contain "re/" and a later "/" was taken for a regular expression and
     * silently searched for something else: "feature/login/" searched for `login`, "core/lib/"
     * for `lib`, "a re/b/ c" for `b`. Those are ordinary things to search a codebase for, and
     * nothing in the result said the word had been reinterpreted.
     */
    private getPatternStartPos(searchWord: string): number | null {
        const REGEXP_FORMAT_PREFIX = "re/";
        if (!searchWord.startsWith(REGEXP_FORMAT_PREFIX)) {
            return null;
        }
        return REGEXP_FORMAT_PREFIX.length;
    }

    /**
     * Where the pattern ends: the last "/" in the word, so that a pattern may contain one. The
     * flags follow it, which is why it is the last rather than the next.
     */
    private getPatternEndPos(searchWord: string, startPos: number): number | null{
        const REGEXP_FORMAT_POSTFIX = "/";
        const endPos = searchWord.lastIndexOf(REGEXP_FORMAT_POSTFIX);
        if (endPos === -1 || startPos >= endPos) {
            return null;
        }
        return endPos;
    }

    private getPattern(searchWord: string, startPos: number, endPos: number): string | null{    
        const pattern = searchWord.substring(startPos, endPos);
        if (pattern.length === 0) {
            return null;
        }
        return pattern;
    }

    private getFlagCandidates(searchWord: string, startPos: number): string | null{    
        const flags = searchWord.substring(startPos+ 1);
        if (flags.length === 0) {
            return null;
        }
        return flags;
    }

    private escapeRegExpWord(word: string): string {
        return word.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
    }

}