/** This is an automatically generated class by FairyGUI. Please do not modify it. **/

import UI_Common_Info from "./UI_Common_Info";
import UI_box_info from "./UI_box_info";
import UI_btn_close from "./UI_btn_close";
import * as fgui from "fairygui-cc";


export default class CommonPackBinder {
	public static bindAll():void {
		fgui.UIObjectFactory.setExtension(UI_Common_Info.URL, UI_Common_Info);
		fgui.UIObjectFactory.setExtension(UI_box_info.URL, UI_box_info);
		fgui.UIObjectFactory.setExtension(UI_btn_close.URL, UI_btn_close);
	}
}