import * as vscode from 'vscode';

export class DecorationService {

    constructor (editor: vscode.TextEditor, searchWord: string, isRegExpMode: boolean) {
        this._editor = editor;
        this._searchWord = searchWord;
        this._isRegExpMode = isRegExpMode;
    }
    private _editor: vscode.TextEditor;
    private _searchWord: string;
    private _isRegExpMode: boolean;

    private decorationTheme = vscode.window.createTextEditorDecorationType({
        'borderWidth': '1px',
        'borderStyle': 'solid',
        'light': {
            'backgroundColor': 'rgba(204, 255, 255, 0.3)',
            'borderColor': 'rgba(204, 255, 255, 0.4)',
            'color': 'rgba(255, 0, 0, 1.0)'
        },
        'dark': {
            'backgroundColor': 'rgba(255, 255, 204, 0.3)',
            'borderColor': 'rgba(255, 255, 204, 0.4)',
            'color': 'rgba(255, 255, 0, 1.0)'
        }
    });

    public setDecorations() {

        // let startPos = editor.document.positionAt(0);
        // let endPos = editor.document.positionAt(editor.document.getText().length - 1);
        // let range = new vscode.Range(startPos, endPos);


        // this._editor.setDecorations(this.decorationTheme, [ranges]);
    }
}