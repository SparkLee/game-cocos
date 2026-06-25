import { _decorator, Component, log, game, Game, assetManager } from 'cc';
import CommonPackBinder from '../FGUIScript/CommonPack/CommonPackBinder';
import FGUIConfig from '../UILogic/FGUIConfig';
import FGUIManager from '../UILogic/FGUIManager';

const { ccclass } = _decorator;

@ccclass('Main')
export class Main extends Component {
    static timeScale = 1;

    start() {
        FGUIConfig.Init();
        assetManager.loadBundle('FGUIRes', (err, bundle) => {
            if (err) {
                log('FGUIRes bundle 加载失败：' + err);
                return;
            }
            FGUIManager.loadFguiPackageFromBundle('CommonPack', bundle)
                .then(() => {
                    CommonPackBinder.bindAll();
                    FGUIManager.Instance.Init();
                    FGUIManager.Instance.ShowPage('CommonPack/Common_Info');
                })
                .catch((e) => log('CommonPack 加载失败：' + e));
        });

        //@ts-ignore
        game._calculateDT = function (useFixedDeltaTime: boolean) {
            this._useFixedDeltaTime = useFixedDeltaTime;

            if (useFixedDeltaTime) {
                this._startTime = performance.now();
                return this.frameTime / 1000;
            }

            const now = performance.now();
            this._deltaTime = now > this._startTime ? (now - this._startTime) / 1000 : 0;
            if (this._deltaTime > Game.DEBUG_DT_THRESHOLD) {
                this._deltaTime = this.frameTime / 1000;
            }
            this._deltaTime *= Main.timeScale;
            this._startTime = now;
            return this._deltaTime;
        };
    }
}
