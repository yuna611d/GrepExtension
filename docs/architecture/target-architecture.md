# 目標アーキテクチャと段階的移行計画

前提: [current-architecture.md](current-architecture.md) の問題点 P1〜P15 を読んでいること。

---

## 1. 設計原則

この規模（本番 1,100 行・ランタイム依存ゼロ）に**見合った量**の抽象化に留める。

1. **依存は内向き** — 純粋なコア（grep ロジック・整形・設定解決）は `vscode` も `fs` も import しない。
2. **合成ルートは 1 箇所** — `composition.ts` が `ExtensionContext` を受け取り、全依存を組み立てる。グローバル可変状態は持たない。
3. **ポートは 4 つだけ** — Config / FileSystem / ResultWriter / Ui（+ MatchHighlighter）。これ以上は過剰なので作らない。
4. **多態は継承ではなく合成** — フォーマットは純粋な interface 実装。`TSV extends CSV` のような実装継承はしない。

### やらないこと（過剰設計として明示的に却下）

| 却下するもの | 理由 |
|---|---|
| DI コンテナの導入 | `createDependencies()` は 12 行で足りる |
| `IModel` / `IService` / `IModelFactory` / `BaseModel` / `FileModel` の維持 | 5 つの抽象、それぞれ実装 2 個以下、第二の呼び出し元なし。全て削除 |
| バンドラ（webpack / esbuild） | 1,100 行・依存ゼロ・`.vscodeignore` で `src/` 除外済み。起動コストは誤差。ビルド手順とソースマップの面倒だけが増える |
| CQRS / イベントバス / 汎用リポジトリ抽象 | 該当する複雑さが存在しない |
| コマンド ID `extension.grepResult2File` の改名 | 公開契約。改名するとユーザーのキーバインドと `tasks.json` を無言で壊す。名前は不格好だが受け入れる |
| マルチルートワークスペース対応 | `Common.BASE_DIR` の TODO。リファクタではなく機能追加。別件 |
| `vscode.workspace.findFiles` への移行 | 大幅に高速で `files.exclude` / `.gitignore` も尊重するが、**検索対象が変わり `grep2file.exclude` の意味が再定義される**。機能判断であってリファクタではない |
| 非同期 / ストリーミング I/O | 走査順序とエラー semantics のリスクに対し、この規模では計測可能な見返りがない（支配的コストは `editor.edit()` のラウンドトリップで、バッチ化で対処済み） |

---

## 2. 目標ディレクトリ構成

現行の `Commons` / `Interface` / `InteractionItems` / `ModelFactories` / `DAO` / `Models` / `Controllers` という分類は**丸ごと廃止する**。これらは *OO 上の役割*（`ModelFactories`）を表しており、ここで実際に強制したい唯一のもの＝*依存の向き*を表していない。

```
src/
  extension.ts                 activate / deactivate のみ
  composition.ts               合成ルート。ExtensionContext から Dependencies を組み立てる

  commands/
    grepToFile.ts              ← Controllers/GrepController.ts

  core/                        純粋。'vscode' を import してはならない
    ports.ts                   ConfigReader, FileSystem, ResultWriter, Ui, MatchHighlighter
    types.ts                   GrepCondition, MatchRecord, MatchRange, NumberedFileLine
    searchWord.ts              ← Models/SearchWordConfiguration.ts
    lineMatcher.ts             ← Services/LineMatcher.ts
    fileEntry.ts               ← Models/File/SeekedFileModel.ts（ポリシー部分のみ）
    directoryScanner.ts        ← Services/DirectoryWalker.ts + Models/File/FileRepository.ts
    cancellation.ts            ← Models/TimeKeeper.ts（時間ポリシー + CancellationError）
    grepEngine.ts              ← Services/GrepService.ts（オーケストレーションのみ）

  formatters/                  純粋。'vscode' を import してはならない
    resultFormatter.ts         ResultFormatter インターフェース
    textFormatter.ts           ← ResultContentModel.ts
    delimitedFormatter.ts      ← ResultContentCSVModel.ts + ResultContentTSVModel.ts（統合）
    jsonFormatter.ts           ← ResultContentJSONModel.ts
    index.ts                   ← ResultContentModelFactory.ts の登録テーブル（良い部分を継承）

  config/                      純粋（ConfigReader ポートにのみ依存）
    settings.ts                GrepSettings 型 + readSettings()
    outputFile.ts              ← ResultFileModel.ts のファイル名／拡張子／パス解決部分

  adapters/                    'vscode' を import してよい唯一の場所
    workspaceConfigReader.ts   ← DAO/SettingDao.ts
    nodeFileSystem.ts          ← FileRepository + SeekedFileModel の fs 呼び出し
    editorResultWriter.ts      ← ResultFileModel の insertText / insertTextBlock / initialize
    vscodeUi.ts                ← InteractionItems/InputBox.ts + Message 表示 + TimeKeeper の QuickPick
    matchDecorator.ts          ← Services/DecorationService.ts（Disposable 化）
    workspace.ts               ← Common.BASE_DIR / Common.DIR_SEPARATOR

  util/
    lazy.ts                    ← Commons/Lazy.ts
    text.ts                    LINE_BREAK, countLineBreaks, escapeRegExp
    messages.ts                ← Commons/Message.ts

  test/
    unit/                      ヘッドレス。素の Mocha。'vscode' を解決できない
    integration/               VS Code ホスト。ゴールデンファイル
    fakes/                     ← test/testUtils/（FakeConfigReader, FakeFileSystem, RecordingWriter）
    test-resources/            変更なし
```

### 削除するファイル

`Interface/IModel.ts` / `Interface/IModelFactory.ts` / `Interface/IService.ts` / `Models/File/FileModel.ts` / `ModelFactories/FileModelFactory.ts` / `ModelFactories/ContentInformationFactory.ts` / `Models/Content/ContentInformation.ts` / `Commons/Common.ts` / `DAO/BaseDao.ts`（`core/ports.ts` の interface になる）

### 命名についての判断

- **`adapters/` であって `vscode/` ではない。** `import * as vscode from 'vscode'` の隣に `vscode` という名前のディレクトリがあるのは可読性の罠であり、`baseUrl` / パスマッピングを使うツールと衝突しうる。`adapters/` は `core/ports.ts` と自然に対応する。
- ディレクトリ・ファイルとも **lowerCamelCase**。VS Code 拡張／TypeScript の一般的な慣行に合わせる。

---

## 3. 主要インターフェース

### 3.1 ポート — `src/core/ports.ts`

```ts
/** 拡張設定の読み取り。アダプタ: adapters/workspaceConfigReader.ts */
export interface ConfigReader {
    get(key: string, fallback: string): string;
    get(key: string, fallback: string[]): string[];
    get(key: string, fallback: boolean): boolean;
}

/** ファイルシステムアクセス。アダプタ: adapters/nodeFileSystem.ts
 *  同期のままにするのは意図的。現状の走査は同期であり、非同期化は
 *  走査順序という挙動リスクを伴う一方、この規模では見返りが計測できない。 */
export interface FileSystem {
    readDirectory(dir: string): string[];
    /** stat できない場合（競合・権限）は null */
    entryKind(fullPath: string): 'file' | 'directory' | 'other' | null;
    readFileBuffer(fullPath: string): Buffer;
    createIfMissing(fullPath: string): void;
}

/** 結果ドキュメントへの追記専用ライタ。アダプタ: adapters/editorResultWriter.ts */
export interface ResultWriter {
    /** text をドキュメント末尾に追記し、その text が開始する 0 始まりの行番号を返す。
     *  '' の追記は no-op だが、現在の開始行は返す。 */
    append(text: string): Promise<number>;
}

/** ユーザーとのやり取り全般。アダプタ: adapters/vscodeUi.ts */
export interface Ui {
    promptForSearchWord(): Promise<string | undefined>;
    showInfo(message: string): void;
    showError(message: string): void;
    /** fire-and-forget。false を返すと grep をキャンセルする。 */
    confirmContinue(message: string): Promise<boolean>;
}

/** 結果ドキュメント内のマッチ強調。アダプタ: adapters/matchDecorator.ts */
export interface MatchHighlighter {
    highlight(ranges: readonly MatchRange[]): void;
}
```

```ts
// src/core/types.ts
export interface MatchRange { line: number; startColumn: number; endColumn: number; }
export interface MatchRecord { filePath: string; lineNumber: number; text: string; }
export interface GrepCondition { baseDir: string; searchWord: string; isRegExpMode: boolean; }
export interface NumberedFileLine { filePath: string; lineText: string; lineNumber: number; }
```

`MatchRange` が `vscode.Range` / `vscode.Position` を置き換える。**この 1 つの置換だけで `core/grepEngine.ts` がヘッドレスになる。** `vscode.Range` への変換は `adapters/matchDecorator.ts` の責務。

### 3.2 フォーマッタ — `src/formatters/resultFormatter.ts`

```ts
/** そのまま追記できる、レンダリング済みの 1 チャンク。 */
export interface RenderedChunk {
    /** 書き込む文字列。フォーマットが要求する末尾改行を含む。 */
    readonly text: string;
    /** このチャンクがカーソルを進める行数（= text 中の改行数）。 */
    readonly lineSpan: number;
    /** 強調対象テキストと、チャンク先頭行内での桁位置。
     *  1:1 のオフセットを表現できないフォーマット（json）では null。 */
    readonly highlight: { readonly searchableText: string; readonly column: number } | null;
}

export interface ResultFormatter {
    /** 最初のマッチより前に書かれる全て（grep 条件 + カラムヘッダ行）。'' でもよい。1 回だけ呼ばれる。 */
    header(condition: GrepCondition): string;

    /** マッチのバッチをレンダリングする。I/O について純粋。
     *  実行単位の状態（json の要素区切り）は持ってよい。同じ入力列 ⇒ 同じ出力列。 */
    render(matches: readonly MatchRecord[]): RenderedChunk[];

    /** 最後のマッチより後に書かれる全て（json の閉じ ']'）。'' でもよい。
     *  キャンセルやエラー時も含めて必ず 1 回呼ばれる。 */
    footer(): string;
}
```

これで解消されること:

- **整形と書き込みの分離** — `render()` が文字列と強調桁位置を同時に返すので、現行の「末尾に改行を付ける → 剥がす → セパレータで分割してオフセットを再計算」という往復が消える。P3 と現状文書 §2.1 の言い訳コメント群が不要になる。
- **`Title` + `ColumnTitle` の統合** — 現状文書 §2.2 の通りバイト単位で同一。`header()` 1 つにまとめる。
- **継承の廃止** — CSV / TSV は `new DelimitedFormatter(separator, options)` の引数違い。JSON は独立実装で、`highlight: null` が型上の正当な選択肢になる（P13 の Liskov 違反が構造的に消える）。

登録テーブルは現行の良い部分（現状文書 §4.1）をそのまま引き継ぐ:

```ts
// src/formatters/index.ts
const FORMATTERS: Record<OutputFormat, (s: GrepSettings) => ResultFormatter> = {
    txt:  s => new TextFormatter(s.outputTitle),
    csv:  s => new DelimitedFormatter(',',  { outputTitle: s.outputTitle, quoting: Quoting.none }),
    tsv:  s => new DelimitedFormatter('\t', { outputTitle: s.outputTitle, quoting: Quoting.none }),
    json: s => new JsonFormatter(s.outputTitle),
};
export function createFormatter(settings: GrepSettings): ResultFormatter { ... }
```

`Quoting.none` はフェーズ 4 時点でバイト単位の出力互換を保つための指定。フェーズ 8 でこれを切り替える。

### 3.3 位置計算 — `src/adapters/editorResultWriter.ts`

現状文書 §2.1 の「末尾改行が位置計算に必須」という暗黙結合を断つ核心部分。

```ts
export class EditorResultWriter implements ResultWriter {
    /** 次の追記が開始する 0 始まり行番号。
     *  開いた時点のドキュメントから初期化し（この拡張は結果ファイルを truncate せず追記する）、
     *  以降は自分が書いた改行を数えて維持する。
     *  「全チャンクがたまたま改行で終わる」ことに依存した document.lineCount からの推測をやめる。 */
    private nextStartLine: number;

    private constructor(private readonly editor: vscode.TextEditor) {
        this.nextStartLine = Math.max(editor.document.lineCount - 1, 0);
    }

    public static async open(fullPath: string)
        : Promise<{ writer: EditorResultWriter; editor: vscode.TextEditor }> {
        const doc = await vscode.workspace.openTextDocument(fullPath);
        const editor = await vscode.window.showTextDocument(doc);
        return { writer: new EditorResultWriter(editor), editor };
    }

    public async append(text: string): Promise<number> {
        const startLine = this.nextStartLine;
        if (text === '') { return startLine; }
        await editor.edit(b => b.insert(
            new vscode.Position(this.editor.document.lineCount, 0), text));
        this.nextStartLine = startLine + countLineBreaks(text);
        return startLine;
    }
}
```

現行の `insertTextBlock` の戻り値と一致することを、全フォーマットについて検証済み:

| format | header | 改行数 | 新 `nextStartLine` | 現行 `lineCount - 1` |
|---|---|---|---|---|
| txt | `Search Dir…\nSearch Word…\nRegExpMode: OFF\tFilePath\tlineNumber\tTextLine\n` | 3 | 3 | 4−1 = 3 ✓ |
| csv/tsv | `GrepConf,FilePath,lineNumber,TextLine\n` | 1 | 1 | 2−1 = 1 ✓ |
| json | `[\n{"grepCondition":…}` | 1 | 1 | 2−1 = 1 ✓（未使用） |

### 3.4 合成ルート — `src/composition.ts` と `src/extension.ts`

```ts
// src/composition.ts
export interface ExtensionDependencies {
    readonly config: ConfigReader;
    readonly fileSystem: FileSystem;
    readonly ui: Ui;
    readonly decorator: MatchDecorator;
    readonly workspaceRoot: () => string;
    readonly separator: string;
    readonly openWriter: (fullPath: string) =>
        Promise<{ writer: ResultWriter; editor: vscode.TextEditor }>;
}

/** どのポートをどの具象アダプタが担うかを知っている唯一の場所。
 *  寿命の長いリソースは context.subscriptions に登録する。 */
export function createDependencies(context: vscode.ExtensionContext): ExtensionDependencies {
    const decorator = new MatchDecorator();
    context.subscriptions.push(decorator);   // P9: 呼び出しごとに漏れていた装飾型をここで回収

    return {
        config: new WorkspaceConfigReader(),
        fileSystem: new NodeFileSystem(),
        ui: new VsCodeUi(),
        decorator,
        workspaceRoot: () => currentWorkspaceRoot(),
        separator: pathSeparator(),
        openWriter: EditorResultWriter.open,
    };
}
```

```ts
// src/extension.ts — 全文
import * as vscode from 'vscode';
import { createDependencies } from './composition';
import { executeGrepToFile } from './commands/grepToFile';

export function activate(context: vscode.ExtensionContext): void {
    const deps = createDependencies(context);
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.grepResult2File',
            () => executeGrepToFile(deps)),
    );
}

export function deactivate(): void { /* subscriptions が破棄を担う */ }
```

`Common.DAO` への代入という副作用が消え、`GrepController` は依存を引数で受け取る関数 2 つに縮む:

```ts
// src/commands/grepToFile.ts
/** 検索語を尋ねてから grep を実行する。 */
export async function executeGrepToFile(deps: ExtensionDependencies): Promise<void> {
    const searchWord = await deps.ui.promptForSearchWord();
    await executeGrepToFileWith(deps, searchWord);
}

/** 検索語を与えて実行する版。テストから実際の入力ボックスを操作できないため、
 *  統合テストはこちらを叩く（現行の doActionWithParam に相当するシーム）。 */
export async function executeGrepToFileWith(
    deps: ExtensionDependencies, searchWord: string | undefined): Promise<void> { ... }
```

---

## 4. テスト戦略

現状は `.vscode-test.mjs` が `out/test/**/*.test.js` を一括で拾い、純粋ロジックのテストまで Electron を起動している（P2、現状文書 §1.4）。

### 二系統に分ける

| | ユニット | 統合 |
|---|---|---|
| 対象 | `out/test/unit/**` | `out/test/integration/**` |
| ランナー | 素の Mocha（`.mocharc.json`） | `vscode-test`（`.vscode-test.mjs`） |
| `vscode` モジュール | **解決できない**（それ自体が境界の番人） | 利用可能 |
| タイムアウト | 5s | 60s |
| 所要時間 | 約 1 秒 | 数十秒 |

```json
// .mocharc.json  — 既存の suite/test（TDD）記法を維持するのでテスト本体は書き換え不要
{ "ui": "tdd", "spec": "out/test/unit/**/*.test.js", "timeout": 5000 }
```

```json
// package.json scripts
"test:unit": "mocha",
"test:integration": "vscode-test",
"test": "npm run test:unit && npm run test:integration"
```

`mocha` を devDependencies に明示追加する（現在は `@vscode/test-cli` 経由で推移的に入っているだけで、依存しきってはいけない）。

### 境界の二重防御

lint 時（`eslint.config.mjs`）と、ユニットテスト実行時（`Cannot find module 'vscode'`）の 2 系統で守る。

```js
{
    files: ['src/core/**', 'src/formatters/**', 'src/config/**', 'src/util/**',
            'src/test/unit/**', 'src/test/fakes/**'],
    rules: {
        'no-restricted-imports': ['error', {
            paths: [{
                name: 'vscode',
                message: "Only src/adapters/** and src/extension.ts may import vscode. Add a port in src/core/ports.ts instead."
            }]
        }]
    }
}
```

### 安全網

既存の 8 本のゴールデンファイルテスト（`extension.test.ts` の txt/csv/tsv/json × リテラル/正規表現）が**全フェーズの合否判定**。**フェーズ 8 以外では出力がバイト単位で一致すること**を各フェーズの完了条件とする。

加えてフェーズ 4 で「header + render + footer を連結してゴールデンファイル本体と比較する」ヘッドレステストをフォーマットごとに追加する。これがフェーズ 8 の作業で最速のフィードバックループになる。

---

## 5. 移行フェーズ

各フェーズは独立してコンパイル・lint・テストが通り、単独でコミットできる粒度。

| # | フェーズ | 解決する問題 | 挙動変更 | 必須度 |
|---|---|---|---|---|
| 0 | デッドコードと設定の整理 | P14, P15, P10 | なし | **必須** |
| 1 | `exclude` 設定の正しさ修正 | P4, P5 | **あり** | **必須**（単独リリース可） |
| 2 | グローバルサービスロケータの排除 | P1, P7（`this` バインド） | なし | **必須** |
| 3a | Ui・キャンセル・装飾のポート化 | P2 の一部 | なし | **必須** |
| 3b | FileSystem ポート化とファイルモデル層の統合 | P2, P3, P11、層の逆流 | なし | **必須** |
| 3c | ResultWriter ポート化と `ResultFileModel` の分割 | P2, P3、位置計算の暗黙結合 | なし | **必須** |
| 4 | フォーマッタの Strategy 化 | P3, P13、末尾改行の結合 | なし | **必須** |
| 5 | テストの二系統化 | P2 の帰結 | なし | **必須** |
| 6 | 合成ルートとリソース破棄 | P1 の完了, P9, P7 | **あり** | **必須** |
| 7 | 性能改善 | P8 | なし | 推奨 |
| 8 | CSV/TSV エスケープ | P6 | **あり・出力が変わる** | 推奨（独立リリース） |

### 推奨コミット順

```
0 → 1 → (0.5.6 リリース) → 2 → 3a → 3b → 3c → 4 → 5 → 6 → 7 → 8 → (0.6.0 リリース)
```

全ての矢印の時点で `npm run compile && npm run lint && npm test` が green かつ 8 本のゴールデンファイルがバイト単位で同一。**例外はフェーズ 8 のみ**で、ここだけがゴールデンファイルの変更を許される。

---

### フェーズ 0 — デッドコードと設定の整理

**目的**: 後続フェーズで動かす対象を先に減らす。所要 1 時間程度、挙動変更ゼロ。

- `ResultContentModel` — `addLine()`, `lineNumberOfCursor`, `lineNumberOfContentStart`, `contentInformations`, `_contentFactory` を削除。`insertAndStackContent` → `insertContent`、`insertAndStackContentBlock` → `insertBlock` に改名（もう stack していない）。
- `ResultContentJSONModel` — `addFooter` 内の呼び出しを追随。
- `TimeKeeper` — `isConfirmationTime()` 削除。
- `ResultFileModel` — `initialLastLine`, `_initialLastLine`, `initialize()` の恒真式を削除。`initialize` → `attachEditor` に改名。
- `Interface/IModel.ts` — `type IModel = object` を削除。
- `'use strict';`（5 ファイル）を削除。
- `tsconfig.json` — `jsx` 系 3 項目を削除、`"include": ["src"]` と `"noUnusedLocals": true` を追加。
- `.vscodeignore` — `tslint.json` を削除、`.github/**` / `eslint.config.mjs` / `.vscode-test.mjs` / `.gitattributes` / `package-lock.json` を追加。
- `.vscode/extensions.json` — `eg2.tslint` → `dbaeumer.vscode-eslint`。
- **削除**: `ModelFactories/ContentInformationFactory.ts`, `Models/Content/ContentInformation.ts`。

**テスト**: 13 テストファイルのいずれもこれらを参照していない（確認済み）。全テストが無変更で通る。
**リスク: 極小。** `noUnusedLocals` が数個の残骸を暴くかもしれないが、それが狙い。

---

### フェーズ 1 — `exclude` 設定の正しさ修正 ⚠️ 挙動変更あり

**目的**: P4（`exclude: []` が全除外）と P5（未エスケープ・未アンカー）を潰す。構造変更から独立しているので、`0.5.6` として単独リリースしてよい。

`package.json`:
```jsonc
"grep2file.exclude": {
    "type": "array",
    "items": { "type": "string" },
    "default": ["bin", "dll", "sln"],
    "description": "Files with these extensions are ignored. Matched against the whole extension, case-insensitively."
}
```

`SettingDao.getSettingValue` — 空配列を「未設定」扱いしない:
```ts
if (value === null || value === undefined) { return defaultValue; }
// 「未設定」を意味するのは空*文字列*のみ。空配列は「何も除外しない」という意思表示。
if (typeof value === 'string' && value.length === 0) { return defaultValue; }
return value;
```

`SeekedFileModel` — 既定を `['']` から `[]` に、パターンをアンカー + エスケープ:
```ts
protected _excludedFileExtensions = new Lazy(() => this._dao.getSettingValue('exclude', [] as string[]));
protected _excludedFileExtensionPatterns = new Lazy(() =>
    this.ExcludedFileExtensions
        .filter(e => e.length > 0)
        .map(e => new RegExp('^' + escapeRegExp(e) + '$', 'i')));
```
`escapeRegExp` は `SearchWordConfiguration.escapeRegExpWord` の中に既に存在するので、ここで `util/text.ts` に引き上げる。

**挙動変更**:
- `exclude: []` が全ファイルを除外しなくなる
- `exclude: ["c"]` が `.csv` / `.cs` / `.cpp` を除外しなくなる
- `exclude: ["c++"]` が動くようになる（従来は正規表現構文エラー）

**ゴールデンファイル**: テスト用ワークスペースは `exclude` を設定しないので既定値 `["bin","dll","sln"]` が適用される。フィクスチャの拡張子は `txt/csv/tsv/json/g2f/png/md` と空文字のみで、アンカーの有無で結果は変わらない。**出力は不変**（`test-resources/input` を確認済み）。

**ユニットテスト**: `SeekedFileModel.test.ts` の `daoWithNoExclusions()` ヘルパとその説明コメントが不要になり `new FakeDao()` に簡約できる。既存の `exclude: ['bin','dll']` / `['DLL']` の assertion はそのまま通る。追加で 2 本 —「`exclude: []` は何も除外しない」「`exclude: ['c']` は `.csv` を除外しない」。

⚠️ **`FakeDao` の意味論も合わせること。** 現状 `FakeDao` は `[]` をそのまま返すが本番の `SettingDao` は defaultValue に差し替える（現状文書 P4）。この食い違いがバグを隠していたので、**修正後の `SettingDao` の挙動をフェイク側にも反映する**か、フェイクを `ConfigReader` ポートの素直な実装に置き換えること（フェーズ 5 で `fakes/fakeConfigReader.ts` になる）。フェイクと本番の意味論がずれたままでは、同じ穴をもう一度掘ることになる。

**バージョン**: `0.5.6`（patch）。CHANGELOG 必須。
**リスク: 低。** フェーズ 2 以降と完全に独立。

---

### フェーズ 2 — グローバルサービスロケータの排除

**目的**: 全ての利用者が `BaseDao` を明示的に受け取る。`Common.DAO` を削除する。

- `Commons/Common.ts` — `DAO` の getter/setter と `_dao` を削除。残るのは `LINE_BREAK` / `BASE_DIR` / `DIR_SEPARATOR`（フェーズ 3b で消える）。
- `Interface/IModelFactory.ts` — `protected _dao: BaseDao = Common.DAO` をコンストラクタ引数へ:
  ```ts
  export abstract class BaseModelFactory {
      constructor(protected readonly _dao: BaseDao) {}
  }
  ```
- `ResultContentModelFactory` — `constructor(dao: BaseDao, resultFile: ResultFileModel)`。**これが P1 の「偶然通っていたテスト」の修正**。ファクトリがグローバルではなく呼び出し元の dao を受け取るようになる。
- `FileModelFactory` / `FileRepository` / `DirectoryWalker` / `GrepService` — dao ないし依存をコンストラクタで受け取る。`DirectoryWalker` の `= new FileRepository()` という既定引数も外す。
- `GrepController` — `Common.DAO = new SettingDao()` の副作用を削除し、**`this.callback` の未バインド渡しを `v => this.callback(v)` に修正**（P7）:
  ```ts
  export class GrepController {
      // 既定引数はこのフェーズ限定の意図的なシーム。extension.test.ts を無変更に保つため。
      // フェーズ 6 で合成ルートが入ったら削除する。
      constructor(private readonly dao: BaseDao = new SettingDao()) {}
      ...
  }
  ```

**テスト**: `ResultContentModelFactory.test.ts`（6 本）、`GrepService.test.ts`、`DirectoryWalker.test.ts` がコンストラクタ引数の追加に追随。`extension.test.ts` は既定引数のおかげで**無変更**。
**リスク: 低〜中。** 呼び出し箇所はコンパイラが全て検出する。`this` バインド修正だけが唯一の意味論的変更で、これは純粋な修正。

---

### フェーズ 3a — Ui・キャンセル・装飾のポート化

**新規**: `core/ports.ts`, `core/types.ts`, `core/cancellation.ts`, `adapters/vscodeUi.ts`, `adapters/matchDecorator.ts`
**削除**: `Interface/IService.ts`, `InteractionItems/InputBox.ts`, `Services/DecorationService.ts`, `Models/TimeKeeper.ts`

`core/cancellation.ts` — 時間ポリシーだけを残し、`performance.now` を注入可能に:
```ts
export class TimeKeeper {
    constructor(
        private readonly ui: Ui,
        private readonly limitMs = 3000,
        private readonly now: () => number = () => performance.now(),
    ) { this.reset(); }
    public throwIfCancelled(): void { ... }
}
```
`perf_hooks` は Node であって vscode ではないので core に残ってよい。`now` を注入可能にすることがテスト容易性の要点。`showQuickPick` は `Ui.confirmContinue()` に移る。

⚠️ **fire-and-forget の維持**: 現行の `checkConsumedTime` は QuickPick を await しない（現状文書 §5）。await すると確認ダイアログ表示中に grep が停止し、挙動が変わる。**この非同期性はそのまま維持する。**

`adapters/matchDecorator.ts` — Disposable 化:
```ts
export class MatchDecorator implements MatchHighlighter, vscode.Disposable {
    private readonly theme = vscode.window.createTextEditorDecorationType({ /* 現行のまま */ });
    private editor: vscode.TextEditor | undefined;

    public attach(editor: vscode.TextEditor): void { this.editor = editor; }
    public highlight(ranges: readonly MatchRange[]): void {
        this.editor?.setDecorations(this.theme, ranges.map(toVsRange));
    }
    public dispose(): void { this.theme.dispose(); }
}
```
`AbsOptionalService` の `setRanges()/setEditor()/doService()` という fluent チェーンは削除する。実装 1 つのためのインターフェースだった。

**リスク: 低。** ゴールデン出力への影響なし。

---

### フェーズ 3b — FileSystem ポート化とファイルモデル層の統合

**新規**: `core/fileEntry.ts`, `core/directoryScanner.ts`, `adapters/nodeFileSystem.ts`, `adapters/workspace.ts`
**削除**: `Models/File/SeekedFileModel.ts`, `Models/File/FileRepository.ts`, `Models/File/FileModel.ts`, `ModelFactories/FileModelFactory.ts`, `Services/DirectoryWalker.ts`

```ts
// core/fileEntry.ts — 1 関数 1 関心、fs はポートの向こう、stat はキャッシュ
export class FileEntry {
    private readonly kind = new Lazy(() => this.fs.entryKind(this.fullPath));  // statSync 1 回（P11）
    private readonly buffer = new Lazy(() => this.fs.readFileBuffer(this.fullPath));
    ...
}

/** 純粋。FileSystem 無しでテストできる。 */
export function isIgnored(nameWithExtension: string, fullPath: string,
                          extension: string, policy: ExclusionPolicy): boolean;
export function looksBinary(buffer: Buffer): boolean;
export function splitNameAndExtension(name: string, separator: string): [string, string];
```

```ts
// core/directoryScanner.ts — dao もファクトリも介さない
export class DirectoryScanner {
    constructor(private readonly fs: FileSystem, private readonly separator: string) {}
    public async walk(targetDir: string, policy: ExclusionPolicy,
                      onFile: (lines: NumberedFileLine[]) => Promise<void>): Promise<void>;
}
```

**層の逆流（現状文書 §1.3 の #1）が構造的に解消される**: `core/directoryScanner` → `core/fileEntry` → `core/ports`。ファクトリへの逆流エッジが無くなる。

`Common.DIR_SEPARATOR`（`os.type()` による自前判定）は Node 標準の `path.sep` / `path.join` に置き換える。手書きの区切り文字結合が CI のパス正規化を面倒にしていた経緯（`extension.test.ts` の `normalizePaths`）も踏まえた判断。

**テスト**: `SeekedFileModel.test.ts` → `unit/fileEntry.test.ts`。インメモリの `FakeFileSystem`（`Record<string, string | 'DIR'>`）に対して書き直し、`Common.BASE_DIR` も実フィクスチャも不要になる。**テストスイート全体で最大の改善点**。`DirectoryWalker.test.ts` → `unit/directoryScanner.test.ts`。具象クラスを継承して別アリティの `retrieve` で上書きしていた `FakeFileRepository` の小細工も `FakeFileSystem` に置き換わる。どちらも完全にヘッドレス。

**リスク: 中。** 走査順序を厳密に保つこと。`readDirectory` は `fs.readdirSync` の生の順序を返すこと。

⚠️ **ここで `readdirSync(dir, { withFileTypes: true })` にはしない。** `statSync` を完全に排除できるが、`Dirent.isDirectory()` は `lstat` ベースなので**シンボリックリンク先のディレクトリが再帰されなくなる**。実挙動の変更なので、やるなら別途判断。

---

### フェーズ 3c — ResultWriter ポート化と `ResultFileModel` の分割

**新規**: `config/settings.ts`, `config/outputFile.ts`, `adapters/editorResultWriter.ts`（§3.3）
**削除**: `Models/File/ResultFileModel.ts`

```ts
// config/settings.ts — 全設定をコマンド開始時に 1 度だけ読んで平のオブジェクトにする
export interface GrepSettings {
    readonly outputFileName: string;
    readonly outputFormat: 'txt' | 'csv' | 'tsv' | 'json';
    readonly outputTitle: boolean;
    readonly ignoreHiddenFiles: boolean;
    readonly excludedExtensions: readonly string[];
}
export function readSettings(config: ConfigReader): GrepSettings;
```

各所に散らばった `new Lazy(() => dao.getSettingValue(...))` が消え、「設定はコマンド開始時にスナップショットされる」という semantics が偶然ではなく明示になる。`ResultFileModel.test.ts` の「後から dao を変えても効かない」テストは構造上自明になる。

```ts
// config/outputFile.ts — 純粋
export function resolveOutputFile(settings: GrepSettings, baseDir: string, separator: string)
    : { nameWithExtension: string; fullPath: string; format: GrepSettings['outputFormat'] };
```

⚠️ `addNewFile()` の `appendFileSync(path, '')` は **truncate しない**（現状文書 §5）。`FileSystem.createIfMissing` もこの挙動を再現すること。

**テスト**: `ResultFileModel.test.ts` を分割 — 名前／拡張子／パスのテストはヘッドレスな `unit/outputFile.test.ts` へ、`addNewFile` のテストは実ファイルシステムに触るので統合側へ。

**リスク: 中。** 位置計算はこのコードベースで最も影響の大きい箇所。ゴールデンファイルは*テキスト*を守るが*装飾範囲*は守らないので、**F5 で拡張を起動し、csv フォーマットで grep して強調がマッチ語に正しく載ることを一度目視確認する**こと。

---

### フェーズ 4 — フォーマッタの Strategy 化

**新規**: `formatters/*`（§3.2）, `core/grepEngine.ts`
**削除**: `Models/Content/` 全体, `ModelFactories/ResultContentModelFactory.ts`, `Services/GrepService.ts`, `Interface/IModel.ts`, `Interface/IModelFactory.ts`

```ts
// core/grepEngine.ts — オーケストレーションのみ。ヘッドレス。
export interface GrepDependencies {
    settings: GrepSettings; fileSystem: FileSystem; writer: ResultWriter;
    ui: Ui; highlighter: MatchHighlighter; workspaceRoot: string; separator: string;
}
export async function runGrep(deps: GrepDependencies, searchWord: string | undefined): Promise<void>;
```

処理: 検索語検証 → `writer.append(formatter.header(condition))` → 走査 → 40 件バッチ → `formatter.render(batch)` → `writer.append(chunks.map(c => c.text).join(''))` → `startLine` + 累積 `lineSpan` + `highlight.column` から `MatchRange[]` を導出 → `highlighter.highlight(all)` → `timeKeeper.throwIfCancelled()` → `finally { writer.append(formatter.footer()) }`。

`ui.showInfo/showError` が 4 箇所のインライン `vscode.window.show*Message` を置き換える。エラーの*分類*（`instanceof CancellationError`）はエンジンに残し、*提示*を Ui ポートへ移す。これで P3 の「オーケストレーション + 通知」の混在が分離される。

**末尾改行の結合が解消される**: `getFormattedContent` が改行を付ける理由は「`insertTextBlock` がドキュメント末尾行を空にしておく必要があるから」ではなく、単に「txt/csv/tsv の行は改行で終わるから」になる。ライタは自分で改行を数える。`addLines` の `content.endsWith(LINE_BREAK) ? slice(0,-1) : content` という剥がし直しは、強調桁位置がフォーマッタから来るようになるため丸ごと消える。

**テスト**: `ResultContent*.test.ts` 4 本 + `ResultContentModelFactory.test.ts` → `unit/formatters/*.test.ts`。`header()`/`render()`/`footer()` に対して書き直し、**全てヘッドレス化**。`getContentInOneLine` はこれらのテストと運命を共にする（現状文書 P14 — 本番では未使用だが、この 4 ファイルの唯一の検証対象なので、ここまで削除できない）。`GrepService.test.ts` → `unit/grepEngine.test.ts`。`TestableGrepService` サブクラスで protected メソッドを突く手法をやめ、`computeMatchRange` を公開された純粋関数にする。

**`extension.test.ts` は無変更、出力はバイト単位で同一。** ゴールデンテストの存在意義が最も発揮されるフェーズ。

**リスク: 中。** ただし完全にゴールデンテストで守られている。

---

### フェーズ 5 — テストの二系統化

§4 の内容。`.mocharc.json` 新規、`.vscode-test.mjs` を `out/test/integration/**` に限定、`package.json` に `test:unit` / `test:integration`、`eslint.config.mjs` に `no-restricted-imports` の境界ルール、`mocha` を devDependencies に明示。

`extension.test.ts` → `test/integration/grepToFile.test.ts`、`test/testUtils/FakeDao.ts` → `test/fakes/fakeConfigReader.ts` に移動。

CI（`.github/workflows/ci.yml`）はユニットを先に走らせて早期失敗させる。`xvfb-run` は統合側にのみ必要。

**リスク: 低。** 純粋にツーリング。

---

### フェーズ 6 — 合成ルートとリソース破棄 ⚠️ 挙動変更あり

§3.4 の内容。フェーズ 2 で入れた暫定の既定引数もここで外す。

**統合テストの変更**: 8 本のゴールデンテストが
```ts
const controller = new GrepController();
await controller.doActionWithParam('lo');
```
から
```ts
await executeGrepToFileWith(testDependencies(), 'lo');
```
に変わる。`testDependencies()` は統合テストファイル内の小さなヘルパで、使い捨ての `{ subscriptions: [] }` を渡して `createDependencies` を模す。**8 箇所の機械的な 2 行変更。assertion もフィクスチャも無変更。**

⚠️ **挙動変更**: 従来はコマンド実行のたびに新しい `TextEditorDecorationType` を作っていたため、N 回目の実行の強調が N+1 回目の実行中も画面に残っていた（かつウィンドウを閉じるまで全て漏れていた）。拡張が単一の decorator を保持するようになると、**コマンドの再実行時に前回の強調がクリアされてから新しい強調が描かれる**。これは修正だがユーザーから見える変化なので CHANGELOG に記載する。

**リスク: 低〜中。** エントリポイントの改名は機械的。破棄の変更だけが意味論的。

---

### フェーズ 7 — 性能改善（推奨）

1. **装飾の再描画スロットリング（P8）** — `setDecorations` は集合を*置換*するので全 Range を渡す必要があり、配列は縮められない。しかし 40 件ごとに渡す必要はない:
   ```ts
   // 走査中は最大 250ms に 1 回。加えて finally で無条件に 1 回。
   if (now() - lastDecorationAt > 250) { highlighter.highlight(allRanges); lastDecorationAt = now(); }
   ```
   O(matches² / 40) のマーシャリングが O(matches × 経過秒 × 4) になる。
2. **Range の上限** — 約 2 万件を超えたら蓄積と強調をやめて `ui.showInfo('Too many matches to highlight')`。任意。巨大ワークスペースでのみ意味がある。
3. `stat` のキャッシュ（P11）— フェーズ 3b で無料で達成済み。
4. `contentInformations`（P10）— フェーズ 0 で削除済み。

**やらないこと**: 非同期／ストリーミング I/O、ワーカースレッド、`withFileTypes`（シンボリックリンクの semantics 変更）、バイナリ判定のためのインクリメンタル読み込み。支配的コストは `editor.edit()` のラウンドトリップで、バッチ化が既に対処している。

---

### フェーズ 8 — CSV/TSV エスケープ ⚠️ 出力が変わる

**このフェーズは拡張が書き出す内容を変える。フィクスチャ再生成とマイナーバージョン更新を伴う、独立レビュー対象のコミットにすること。**

フェーズ 4 のフォーマッタ再設計が前提。強調桁位置がレンダリング中に算出されるようになっているため、クォートを入れても桁位置が自動的に正しくずれる。

**推奨する非対称な扱い**（影響範囲を最小化するため）:

- **CSV: RFC 4180 準拠。** フィールドが `,` `"` `\r` `\n` のいずれかを含むならクォートし、埋め込まれた `"` は二重化する。
- **TSV: クォートせずエスケープ。** フィールド値の `\t` → `\\t`、`\r` → `\\r`。RFC 4180 は TSV を規定しておらず、TSV をクォートするのは驚きが大きい。

**フィクスチャへの影響**（実際のフィクスチャ本文を確認済み）:

| ファイル | 変化 |
|---|---|
| `expected/grep2File.g2f.csv` | **変わる** |
| `expected/regexp_grep2File.g2f.csv` | **変わる** |
| `expected/*.tsv` | 不変（マッチ行にタブを含むものがない） |
| `expected/*.txt` / `*.json` | 不変 |

マッチ行に `"Lorem ipsum dolor sit amet, ` が含まれ（`"` と `,` の両方を持つ）、各行に grep 条件カラムも埋め込まれているため。**8 本中ちょうど 2 本のフィクスチャが再生成対象。**

再生成は `UPDATE_FIXTURES=1` のような脱出ハッチで 1 度走らせ、**必ず差分を目視確認する**こと。無条件に受け入れないこと。

**バージョン**: `0.6.0`（minor）。CHANGELOG: "CSV output now quotes fields per RFC 4180; TSV escapes embedded tabs. Previously a matched line containing a comma or quote produced a malformed CSV row."

---

## 6. 挙動変更とリリース管理のまとめ

| フェーズ | 変更 | バージョン |
|---|---|---|
| 1 | `exclude: []` が全除外しなくなる / パターンのアンカー・エスケープ / スキーマを `array` に修正 | `0.5.6`（patch・単独リリース） |
| 6 | 装飾型を再利用・破棄 → 再実行時に前回の強調がクリアされる | `0.6.0` に含める |
| 8 | CSV の RFC 4180 クォート / TSV のタブエスケープ | `0.6.0`（minor） |

フェーズ 0, 2, 3a–3c, 4, 5, 7 は内部のみでバージョン更新不要。ただしフェーズ 6 完了時点で `0.6.0` を切り、"Internal: restructured into core/adapters layers; unit tests now run headless." と記載するのが妥当。

---

## 7. 問題点とフェーズの対応表（自己検証用）

[current-architecture.md](current-architecture.md) §3 の全項目が、いずれかのフェーズで解決されるか「やらない判断」として明示されていることの確認。

| 問題 | 解決フェーズ |
|---|---|
| P1 グローバルサービスロケータ | 2（排除）+ 6（合成ルート完成） |
| P2 `vscode` のモデル層侵入 | 3a + 3b + 3c + 5（lint とランタイムの二重防御） |
| P3 責務の混在 | 3b（`SeekedFileModel`）+ 3c（`ResultFileModel`）+ 4（`ResultContentModel`, `GrepService`） |
| P4 `exclude: []` が全除外 | 1 |
| P5 未エスケープ・未アンカー正規表現 | 1 |
| P6 CSV/TSV エスケープなし | 8 |
| P7 エラー握り潰し・`this` バインド | 2（バインド）+ 6（エントリポイントの try/catch） |
| P8 装飾の O(n²) 再適用 | 7 |
| P9 `TextEditorDecorationType` の未破棄 | 6 |
| P10 `contentInformations` の未使用蓄積 | 0 |
| P11 `stat` の重複呼び出し | 3b |
| P12 同期 I/O | **やらない判断**（§1「やらないこと」） |
| P13 継承による多態の歪み | 4 |
| P14 デッドコード | 0（ただし `getContentInOneLine` は 4 まで残る） |
| P15 設定の残骸 | 0 |
| 層の逆流（現状文書 §1.3 #1） | 3b |
| `Interface` → `Common` → `vscode`（同 #2） | 4（`Interface/` 全削除） |
| 末尾改行と位置計算の暗黙結合（同 §2.1） | 3c + 4 |
| `Title` / `ColumnTitle` の分割（同 §2.2） | 4（`header()` に統合。バイト単位で同一） |
