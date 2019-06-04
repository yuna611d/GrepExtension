import * as vscode from 'vscode';
import { AbsOptionalService } from '../Interface/IService';

export class DecorationService extends AbsOptionalService {
    private decorationTheme = vscode.window.createTextEditorDecorationType({
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
    });



    doService() {
        const editor = this.editor;
        if (editor !== null) {
            editor.setDecorations(this.decorationTheme, this.ranges);
        }
        return this;
    }

}