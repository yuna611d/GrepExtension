import * as vscode from 'vscode';
import {
    isNullOrUndefined
} from 'util';
import * as os from 'os';

export class Configuration {

    public LINE_BREAK = "\n";

    //TODO create stock variable if called multi times
    public getExcludedFileExtension(): [string] {
        let excludeFileExtensions: [string] | undefined = vscode.workspace.getConfiguration('grep2file').get('exclude');
        if (isNullOrUndefined(excludeFileExtensions)) {
            excludeFileExtensions = [""];
        }
        return excludeFileExtensions;
    }

    public getDirSeparator(): string {
        let osType = os.type();
        if (osType === 'Windows_NT') {
            return "\\";
        } else {
            return "/";
        }
    }

    public getOuputFileName():string {
        // configuration for output file name
        let outputFileName: string | undefined = vscode.workspace.getConfiguration('grep2file').get('outputFileName');
        if (isNullOrUndefined(outputFileName)) {
            outputFileName = "grep2File.g2f";
        }
        return outputFileName;
    }

    public getBaseDir(): string {
        // TOOD in the futre, multi work space should be apply
        let baseDir = "";
        let workspaceForlders = vscode.workspace.workspaceFolders;
        if (!isNullOrUndefined(workspaceForlders) && workspaceForlders.length !== 0) {
            baseDir = workspaceForlders[0].uri.fsPath;
        }
        return baseDir;
    }

    public getOutputContentFormat(): string {
        let defaultFormat = "txt";
        // TOOD json format will be impelemented in the future
        let allowedContentFormats = ["txt", "tsv", "csv", "json"]
        let outputContentFormat: string | undefined = vscode.workspace.getConfiguration('grep2file').get('outputContentFormat');
        if (isNullOrUndefined(outputContentFormat)) {
            return defaultFormat;
        } else {
            if(allowedContentFormats.indexOf(outputContentFormat) === -1) {
                return defaultFormat;
            } else {
                return outputContentFormat;
            }
        }
    }

    public isOutputTitle(): boolean {
        let isOutputTitle: boolean | undefined = vscode.workspace.getConfiguration('grep2file').get('outputTitle');
        if (isNullOrUndefined(isOutputTitle)) {
            isOutputTitle = true;
        }
        return isOutputTitle;
    }


}