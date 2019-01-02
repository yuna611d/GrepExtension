import { Configuration } from '../../Configurations/Configuration';

export class ConfigurationStub extends Configuration {   
    public _excludedFileExtensions: string[] | null = null;
    public _outputFileName: string | null = null;
    public _outputContentFormat: string | null = null;
    public _isOutputTitle: boolean | null = null;
    public _ignoreHiddenFile: boolean | null = null;
}