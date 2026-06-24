import { director, EventHandler } from "cc";
import * as fgui from "fairygui-cc";
import TimerManager from "../Core/TimerManager";

export abstract  class FGUIBase<T extends fgui.GComponent> {
    public m_uiComponent: T;
    public closeHandler:Array<Function> = [];

    public Open(param?:any) {
        this.closeHandler = [];
        this.m_uiComponent.visible = true;
        this.onOpened(param);
    }

    public Close() {
        if(!this.m_uiComponent.visible){
            return;
        }
        while(this.closeHandler.length > 0){
            this.closeHandler.pop()();
        }
        this.m_uiComponent.visible = false;
        this.onDisable();
    }

    public abstract onAwake();

    public abstract onOpened(param:any);
    
    public onDisable(){
        TimerManager.instance.ClearAll(this);
        director.targetOff(this);
    }
}