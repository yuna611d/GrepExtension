'use strict';
import { Configuration } from '../Configurations/Configuration';
import { ContentUtilFactory } from '../Utilities/ContentUtil';
import { FileUtilFactory } from '../Utilities/FileUtil';
import { GrepService } from '../Services/GrepService';
import { DecorationService} from '../Services/DecorationService'
import * as ib from '../InteractionItems/InputBox';
import * as vscode from 'vscode';


export class GrepController {

    public doAction(): void {
        let inputBox = new ib.SearchWordInputBox();
        inputBox.showInputBox(this.callback);
    }

    protected callback(v: string | undefined) {
        const searchWord = v;

        // Prepare configuration and utilitites
        const conf = new Configuration();
        const utility = { ContentUtil: new ContentUtilFactory(conf).retrieve(),
                          FileUtil: new FileUtilFactory(conf).retrieve()
        };
        
        // Prepare services to be used
        const grepService = new GrepService(searchWord, conf, utility);
        const decorationService = new DecorationService();

        // Create and Get file path where result is outputted.
        const filePath = utility.FileUtil.addNewFile();
        if (grepService.prepareGrep()) {
            vscode.workspace.openTextDocument(filePath).then(doc => {
                vscode.window.showTextDocument(doc).then(async editor => {
                    // Grep word
                    const ranges = await grepService.grep(editor, filePath);
                    // Decorate found word
                    await decorationService.decorate(editor, filePath, ranges);
                });
            });    
        }
        return () => {};
    }
}