/** This is an automatically generated class by FairyGUI. Please do not modify it. **/

import * as fgui from "fairygui-cc";

export default class UI_btn_close extends fgui.GButton {

	public m_button:fgui.Controller;
	public m_n0:fgui.GImage;
	public m_n1:fgui.GImage;
	public m_n2:fgui.GImage;
	public m_n3:fgui.GImage;
	public static URL:string = "ui://e8nqiqqmrmk0mj";

	public static createInstance():UI_btn_close {
		return <UI_btn_close>(fgui.UIPackage.createObject("CommonPack", "btn_close"));
	}

	protected onConstruct():void {
		this.m_button = this.getControllerAt(0);
		this.m_n0 = <fgui.GImage>(this.getChildAt(0));
		this.m_n1 = <fgui.GImage>(this.getChildAt(1));
		this.m_n2 = <fgui.GImage>(this.getChildAt(2));
		this.m_n3 = <fgui.GImage>(this.getChildAt(3));
	}
}