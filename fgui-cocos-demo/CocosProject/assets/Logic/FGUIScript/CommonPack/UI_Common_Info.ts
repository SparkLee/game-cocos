/** This is an automatically generated class by FairyGUI. Please do not modify it. **/

import UI_btn_close from "./UI_btn_close";

import * as fgui from "fairygui-cc";
export default class UI_Common_Info extends fgui.GComponent {

	public m_n1:fgui.GImage;
	public m_n0:fgui.GImage;
	public m_n2:fgui.GTextField;
	public m_n4:fgui.GList;
	public m_n5:UI_btn_close;
	public static URL:string = "ui://e8nqiqqmrmk0mg";

	public static createInstance():UI_Common_Info {
		return <UI_Common_Info>(fgui.UIPackage.createObject("CommonPack", "Common_Info"));
	}

	protected onConstruct():void {
		this.m_n1 = <fgui.GImage>(this.getChildAt(0));
		this.m_n0 = <fgui.GImage>(this.getChildAt(1));
		this.m_n2 = <fgui.GTextField>(this.getChildAt(2));
		this.m_n4 = <fgui.GList>(this.getChildAt(3));
		this.m_n5 = <UI_btn_close>(this.getChildAt(4));
	}
}