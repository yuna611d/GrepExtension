'use strict';
import { GrepService } from '../Services/GrepService';
import { DecorationService} from '../Services/DecorationService';
import * as ib from '../InteractionItems/InputBox';
import { SettingDao } from '../DAO/SettingDao';
import { Common } from '../Commons/Common';
import { FileModelFactory } from '../ModelFactories/FileModelFactory';

export class GrepController {

    constructor() {
        Common.DAO = new SettingDao();
    }

    public doAction(): void {
        const inputBox = new ib.SearchWordInputBox();
        inputBox.showInputBox(this.callback);
    }

    protected callback(v: string | undefined) {
        const searchWord = v;

        // Prepare configuration and utilities
        const resultFile = new FileModelFactory().retrieve();

        // Prepare services to be used
        new GrepService(resultFile, searchWord, new DecorationService()).doService();

        return () => {};
    }
}