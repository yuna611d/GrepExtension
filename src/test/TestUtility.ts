import { SettingDAO } from "../DAO/SettingDAO";
import { Common } from "../Commons/Common";

export class TestUtility {
    public static setupDao() {
        Object.assign(TestUtility.Settings, TestUtility.originalSetting);
        const stub = new SettingDAOStub();
        Common.DAO = stub;
    }

    public static Settings: ISettingStub = {
        "exclude":             ["bin", "dll", "sln"],
        "ignoreHiddenFile":    true,
        "outputFileName":      "grep2File.g2f",
        "outputContentFormat": "txt",
        "outputTitle":         true
    };

    private static originalSetting = Object.assign({}, TestUtility.Settings);
}

interface ISettingStub {
    [key: string]: string | boolean | string[];
}

class SettingDAOStub extends SettingDAO {
    protected getValue(key: string) {
        return TestUtility.Settings[key];
    }
}

