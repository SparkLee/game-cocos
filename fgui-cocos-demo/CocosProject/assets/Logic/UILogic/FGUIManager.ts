import { FGUIBase } from "./FGUIBase";
import * as fgui from "fairygui-cc";
import { AssetManager, Layers, Tween, tween } from "cc";
import { GComponent } from "fairygui-cc/GComponent";

export default class FGUIManager {
    private UIRoot: fgui.GRoot;
    private UIDictionary: { [name: string]: FGUIBase<fgui.GComponent> };
    private compontPool: { [name: string]: Array<fgui.GObject> } = {};
    private preloadPromiseMap: { [name: string]: Promise<void> } = {};
    private nowOrder = 0;

    public static classDirection: { [name: string]: new () => FGUIBase<fgui.GComponent> };

    public static Instance = new FGUIManager;

    Init() {
        fgui.UIConfig.defaultUILayer = Layers.Enum.UI_2D;
        this.UIRoot = fgui.GRoot.create();
        this.UIRoot.makeFullScreen();
        this.UIDictionary = {};
    }

    PreloadPage(pageUrl: string) {
        if (!this.UIDictionary[pageUrl]) {
            let com = this.GetUIFromPool(pageUrl.split("/")[0], pageUrl.split("/")[1]);
            fgui.GRoot.inst.addChild(com);
            this.RecoveryToPool(com);
        }
    }

    PreloadPageAsync(pageUrl: string) {
        if (this.preloadPromiseMap[pageUrl]) {
            return this.preloadPromiseMap[pageUrl];
        }

        const preloadPromise = new Promise<void>((resolve) => {
            const [packName, comName] = pageUrl.split("/");
            const poolName = `${packName}/${comName}`;
            if (this.UIDictionary[pageUrl] || this.compontPool[poolName]?.length > 0) {
                resolve();
                return;
            }

            const asyncOperation = new fgui.AsyncOperation();
            asyncOperation.callback = (obj: fgui.GObject) => {
                if (obj) {
                    fgui.GRoot.inst.addChild(obj);
                    this.RecoveryToPool(obj);
                }
                delete this.preloadPromiseMap[pageUrl];
                resolve();
            };
            asyncOperation.createObject(packName, comName);
        });
        this.preloadPromiseMap[pageUrl] = preloadPromise;
        return preloadPromise;
    }

    ShowPage(pageUrl: string, isCloseOther?: boolean, param?: any, useAni?: string): FGUIBase<fgui.GComponent> {
        if (!this.UIRoot) {
            this.Init();
        }
        if (isCloseOther) {
            this.CloseAllPage();
        }
        if (this.UIDictionary[pageUrl]) {
            let ui = this.UIDictionary[pageUrl];
            ui.m_uiComponent.sortingOrder = this.nowOrder++;
            ui.Open(param);
            if (useAni) {
                FGUIManager.playAni(ui.m_uiComponent);
            }
            return ui;
        }

        let pageClass = FGUIManager.classDirection[pageUrl] as new () => FGUIBase<fgui.GComponent>;
        let newPageClass = new pageClass();
        let com = this.GetUIFromPool(pageUrl.split("/")[0], pageUrl.split("/")[1]) as GComponent;
        fgui.GRoot.inst.addChild(com);
        if (fgui.GRoot.inst.height > 1920) {
            com.y += (fgui.GRoot.inst.height - 1920) / 2;
        } else {
            com.x += (fgui.GRoot.inst.width - 1080) / 2;
        }
        com.sortingOrder = this.nowOrder++;
        newPageClass.m_uiComponent = com;
        this.UIDictionary[pageUrl] = newPageClass;
        newPageClass.onAwake();
        newPageClass.Open(param);
        if (useAni) {
            FGUIManager.playAni(com);
        }
        return newPageClass;
    }

    static playAni(ui: fgui.GComponent) {
        const aniStateKey = "__fguiPlayAniState";
        const oldState = (ui as any)[aniStateKey] || {};
        const token = (oldState.token || 0) + 1;
        const targetScaleX = oldState.playing ? oldState.targetScaleX : (ui.scaleX || 1);
        const targetScaleY = oldState.playing ? oldState.targetScaleY : (ui.scaleY || 1);
        const targetAlpha = oldState.playing ? oldState.targetAlpha : (ui.alpha == null ? 1 : ui.alpha);
        const startScale = 0.72;

        (ui as any)[aniStateKey] = {
            playing: true,
            token,
            targetScaleX,
            targetScaleY,
            targetAlpha,
        };

        ui.setPivot(0.5, 0.5);
        Tween.stopAllByTarget(ui);
        ui.alpha = 0;
        ui.scaleX = targetScaleX * startScale;
        ui.scaleY = targetScaleY * startScale;
        tween(ui)
            .to(0.2, {
                alpha: targetAlpha,
                scaleX: targetScaleX,
                scaleY: targetScaleY,
            }, { easing: "backOut" })
            .call(() => {
                const currentState = (ui as any)[aniStateKey];
                if (!currentState || currentState.token !== token) {
                    return;
                }

                ui.alpha = targetAlpha;
                ui.scaleX = targetScaleX;
                ui.scaleY = targetScaleY;
                currentState.playing = false;
            })
            .start();
    }

    GetPage(pageUrl: string): FGUIBase<fgui.GComponent> {
        return this.UIDictionary[pageUrl] ?? null;
    }

    ClosePage(pageUrl: string): void {
        this.UIDictionary[pageUrl]?.Close();
    }

    CloseAllPage(): void {
        for (const key in this.UIDictionary) {
            this.UIDictionary[key]?.Close();
        }
    }

    ClearPack(packName: string) {
        fgui.UIPackage.removePackage(packName);
        for (let key in this.UIDictionary) {
            if (key.indexOf(packName + "/") == 0) {
                if (this.UIDictionary[key] != null && !this.UIDictionary[key].m_uiComponent.isDisposed) {
                    this.UIDictionary[key].m_uiComponent.dispose();
                }
                this.UIDictionary[key] = null;
            }
        }
        for (let key in this.compontPool) {
            if (key.indexOf(packName + "/") == 0) {
                while (this.compontPool[key].length > 0) {
                    this.compontPool[key].pop().dispose();
                }
            }
        }
    }

    public GetUIFromPool(packName: string, comName: string): fgui.GObject {
        let poolName = packName + "/" + comName;
        let targetPool = this.compontPool[poolName];
        if (this.compontPool[poolName] == null) {
            targetPool = new Array<fgui.GObject>();
            this.compontPool[poolName] = targetPool;
        }
        if (targetPool.length == 0) {
            return fgui.UIPackage.createObject(packName, comName).asCom;
        }

        let result = targetPool.shift();
        result.visible = true;
        return result;
    }

    public RecoveryToPool(gComponent: fgui.GObject) {
        let packName = gComponent.packageItem.owner.name;
        let comName = gComponent.packageItem.name;
        let poolName = packName + "/" + comName;
        let targetPool = this.compontPool[poolName];
        if (targetPool == null) {
            targetPool = new Array<fgui.GObject>();
            this.compontPool[poolName] = targetPool;
        }
        if (targetPool.indexOf(gComponent) < 0) {
            targetPool.push(gComponent);
        }
        gComponent.visible = false;
        gComponent.removeFromParent();
    }

    public static loadFguiPackageFromBundle(path: string, bundle: AssetManager.Bundle) {
        return new Promise<any>((resolve, reject) => {
            fgui.UIPackage.loadPackage(bundle, path, (err, pkg) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(pkg);
                }
            });
        });
    }
}
