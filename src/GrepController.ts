'use strict';
import { Configuration } from './Configuration';
import { ContentUtilFactory } from './Utilities/ContentUtil';
import { FileUtilFactory } from './Utilities/FileUtil';
import { GrepService } from './GrepService';
import * as ib from './InputBox';


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
        
        // Grep word
        const service = new GrepService(searchWord, conf, utility);
        service.serve();

        return () => {};
    }
}