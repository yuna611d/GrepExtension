'use strict';
import {
    isNullOrUndefined
} from 'util';

export class SearchWordConfiguration {

    public get SearchWord() {return this.searchWord;}
    public get IsRegExpMode() {return this.isRegExpMode;}
    public get RegExpOptions() {return this.regExpOptions;}

    private searchWord = '';
    private isRegExpMode = false;
    private regExpOptions =  '';

    resetConfiguration() {
        this.searchWord = '';
        this.isRegExpMode = false;
        this.regExpOptions =  '';    
    }

    setInitialConfiguration(searchWord: string) {
        this.resetConfiguration();
        this.searchWord = searchWord;
    }

    setRegExpMode(pattern: string, options: string) {
        this.searchWord = pattern;
        this.isRegExpMode = true;
        this.regExpOptions = options;
    }

    addIgnoreCaseOption() {
        this.regExpOptions += (this.regExpOptions.indexOf('i') === -1) ? 'i': '';
    }

    hasValidSearchWord(): boolean {
        if (isNullOrUndefined(this.SearchWord) || this.SearchWord.length === 0) {
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
        if (isNullOrUndefined(searchWord)) {
            return;
        }

        // Set Initial  Configuration
        this.setInitialConfiguration(this._escapeRegExpWord(searchWord));

        // re/<pattern>/<flags> -> [<pattern>, <flagCandidates>]
        const splittedWords = this._getPatternAndFlagCandidates(searchWord);        
        // Get Pattern, which may be option of regexp
        const pattern = splittedWords[0];
        if (!pattern) {
            return;
        }
        // Get Flags from input word
        const options = this._getFlags(splittedWords[1]);

        // Configure for regexp
        this.setRegExpMode(pattern, options);
    }

    private _getPatternAndFlagCandidates(searchWord: string): Array<string | null>{    

        // StartPos
        const startPos = this._getPatternStartPos(searchWord);
        if (!startPos) {
            return [null, null];
        }
        // EndPos
        const endPos = this._getPatternEndPos(searchWord, startPos);
        if (!endPos){
            return [null, null];
        }

        // Return pattern and flagCandidates
        const pattern = this._getPattern(searchWord, startPos, endPos);
        const flags = this._getFlagCandidates(searchWord, endPos);
        return [pattern, flags];
    }

    private _getFlags(flagCandidates: string | null): string {
        const ALLOWED_OPTIONS = ["i"];

        return (flagCandidates || "").split("")
            .filter(c => { return ALLOWED_OPTIONS.indexOf(c) > -1; })
            .reduce((option, candidate) => {return option += candidate;}, "");
    }

    private _getPatternStartPos(searchWord: string): number | null {
        const REGEXP_FORMAT_PREFIX = "re/"; 
        const startPos = searchWord.indexOf(REGEXP_FORMAT_PREFIX);
        if (startPos === -1) {
            return null;
        }
        return startPos + REGEXP_FORMAT_PREFIX.length;
    }
    private _getPatternEndPos(searchWord: string, startPos: number): number | null{
        const REGEXP_FORMAT_POSTFIX = "/";
        const endPos = searchWord.lastIndexOf(REGEXP_FORMAT_POSTFIX);
        if (endPos === -1 || startPos >= endPos) {
            return null;
        }
        return endPos;
    }

    private _getPattern(searchWord: string, startPos: number, endPos: number): string | null{    
        const pattern = searchWord.substring(startPos, endPos);
        if (pattern.length === 0) {
            return null;
        }
        return pattern;
    }

    private _getFlagCandidates(searchWord: string, startPos: number): string | null{    
        const flags = searchWord.substring(startPos+ 1);
        if (flags.length === 0) {
            return null;
        }
        return flags;
    }

    private _escapeRegExpWord(word: string): string {
        return word.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
    }

}