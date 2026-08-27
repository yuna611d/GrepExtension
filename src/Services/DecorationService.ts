import * as vscode from 'vscode';
import { Lazy } from '../Commons/Lazy';
import { AbsOptionalService } from '../Interface/IService';

export class DecorationService extends AbsOptionalService {

    /**
     * One decoration type for the whole extension, rather than one per search.
     *
     * A decoration belongs to the type it was applied with, and setDecorations replaces every
     * decoration of that type in that editor. A new type per search therefore left the previous
     * search's highlights exactly where they were, with nothing able to remove them: after three
     * searches the result file carried three sets of highlights at once, and once csv, tsv and
     * json began replacing the previous result the older ones pointed at whatever text had since
     * taken those positions. Nothing disposed them either, so each search leaked a type.
     *
     * Sharing one type makes each search's highlights replace the last, which is what a reader
     * of the result file expects to see.
     */
    private static readonly theme = new Lazy(() => vscode.window.createTextEditorDecorationType({
        'borderWidth': '1px',
        'borderStyle': 'solid',
        'light': {
            'backgroundColor': 'rgba(124,77, 255, 0.3)',
            'borderColor': 'rgba(124,77, 255, 0.4)',
            'color': 'rgba(255, 0, 0, 1.0)'
        },
        'dark': {
            'backgroundColor': 'rgba(255, 255, 204, 0.3)',
            'borderColor': 'rgba(255, 255, 204, 0.4)',
            'color': 'rgba(255, 255, 0, 1.0)'
        }
    }));

    /**
     * The type every instance decorates with. Protected so a test can see that instances share it.
     */
    protected static decorationTheme(): vscode.TextEditorDecorationType {
        return DecorationService.theme.get();
    }

    doService(): AbsOptionalService {
        const editor = this.editor;
        if (editor !== null) {
            editor.setDecorations(DecorationService.decorationTheme(), this.ranges);
        }
        return this;
    }

    /**
     * Release the decoration type. Registered by the extension so the highlights go with it when
     * it is unloaded, rather than being left behind for VS Code to clean up.
     */
    public static dispose(): void {
        DecorationService.theme.get().dispose();
    }

}
