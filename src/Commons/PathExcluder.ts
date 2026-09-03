/**
 * Decides whether a path is one the editor has been told to leave out.
 *
 * VS Code keeps that answer in `files.exclude` and `search.exclude`, as globs matched against a
 * path relative to the workspace folder. Those settings are how a user says "node_modules is not
 * my code" - the built-in search obeys them, and a grep that does not ends up reading tens of
 * thousands of files nobody asked about and reporting matches from its own build output.
 *
 * The globs are turned into regular expressions once, at construction, because every entry of
 * every directory is tested against all of them.
 */
export class PathExcluder {

    /** Excludes nothing, for when the settings are off or empty. */
    public static readonly NOTHING = new PathExcluder([]);

    private readonly matchers: RegExp[];

    constructor(globs: readonly string[]) {
        this.matchers = globs.map(glob => PathExcluder.toRegExp(glob))
                             .filter((re): re is RegExp => re !== null);
    }

    /**
     * Whether this path is excluded. The path is relative to the workspace folder it was found
     * under, with either separator - a Windows path is compared the same way as a POSIX one,
     * since the globs are always written with forward slashes.
     */
    public excludes(relativePath: string): boolean {
        if (this.matchers.length === 0) {
            return false;
        }
        const path = relativePath.split("\\").join("/");
        return this.matchers.some(matcher => matcher.test(path));
    }

    /**
     * The subset of glob syntax these settings are written in: `**` for any run of directories,
     * `*` and `?` within one path segment, `{a,b}` for alternatives, and `[...]` for a character
     * class. Anything else is matched literally.
     *
     * A pattern this cannot express is dropped rather than guessed at, so an exotic glob leaves
     * its files searched. Searching a file that could have been skipped costs time; skipping one
     * that should have been searched loses a match, and only one of those is recoverable by the
     * person reading the result.
     */
    private static toRegExp(glob: string): RegExp | null {
        const trimmed = glob.trim();
        if (trimmed.length === 0) {
            return null;
        }

        try {
            return new RegExp("^" + PathExcluder.toPattern(trimmed) + "$");
        } catch {
            return null;
        }
    }

    private static toPattern(glob: string): string {
        let pattern = "";
        let position = 0;

        while (position < glob.length) {
            const rest = glob.slice(position);

            // A leading "**/" is what makes a pattern match at any depth, and it has to be able
            // to match no directories at all: "**/node_modules" excludes the one in the root too.
            if (rest.startsWith("**/")) {
                pattern += "(?:[^/]*/)*";
                position += 3;
                continue;
            }
            // A trailing "/**" names everything under an entry. The entry itself is what the walk
            // is looking at when it decides not to descend, so it has to match as well.
            if (rest === "/**") {
                pattern += "(?:/.*)?";
                break;
            }
            if (rest.startsWith("**")) {
                pattern += ".*";
                position += 2;
                continue;
            }

            const character = glob.charAt(position);
            if (character === "*") {
                pattern += "[^/]*";
                position++;
            } else if (character === "?") {
                pattern += "[^/]";
                position++;
            } else if (character === "{") {
                const end = glob.indexOf("}", position);
                if (end === -1) {
                    pattern += "\\{";
                    position++;
                    continue;
                }
                const alternatives = glob.slice(position + 1, end).split(",");
                pattern += "(?:" + alternatives.map(a => PathExcluder.toPattern(a)).join("|") + ")";
                position = end + 1;
            } else if (character === "[") {
                const end = glob.indexOf("]", position + 1);
                if (end === -1) {
                    pattern += "\\[";
                    position++;
                    continue;
                }
                // "!" is how a glob negates a class; a regular expression spells it "^".
                const body = glob.slice(position + 1, end);
                pattern += "[" + (body.startsWith("!") ? "^" + body.slice(1) : body) + "]";
                position = end + 1;
            } else {
                pattern += PathExcluder.escape(character);
                position++;
            }
        }

        return pattern;
    }

    private static escape(character: string): string {
        return /[\\^$.*+?()[\]{}|]/.test(character) ? "\\" + character : character;
    }

}
