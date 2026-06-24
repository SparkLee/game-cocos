import * as fgui from "fairygui-cc";
import FGUIManager from "./FGUIManager";
import Common_Info from "./CommonPack/Common_Info";

export default class FGUIConfig {
    public static Init() {
        fgui.UIConfig.defaultFont = "SimHei";
        FGUIManager.classDirection = {};
        FGUIManager.classDirection["CommonPack/Common_Info"] = Common_Info;
    }
}
