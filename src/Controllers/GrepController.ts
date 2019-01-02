'use strict';
import { Configuration } from '../Configurations/Configuration';
import { ContentUtilFactory } from '../Utilities/ContentUtil';
import { FileUtilFactory } from '../Utilities/FileUtil';
import { GrepService } from '../Services/GrepService';
import * as ib from '../InteractionItems/InputBox';


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