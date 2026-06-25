/** This is an automatically generated class by FairyGUI. Please do not modify it. **/

import * as fgui from "fairygui-cc";

export default class UI_box_info extends fgui.GComponent {

	public m_n0:fgui.GImage;
	public m_n1:fgui.GTextField;
	public static URL:string = "ui://e8nqiqqmrmk0mh";

	public static createInstance():UI_box_info {
		return <UI_box_info>(fgui.UIPackage.createObject("CommonPack", "box_info"));
	}

	protected onConstruct():void {
		this.m_n0 = <fgui.GImage>(this.getChildAt(0));
		this.m_n1 = <fgui.GTextField>(this.getChildAt(1));
	}
}