import { _decorator, Component, sp } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('SpineExample')
export class SpineExample extends Component {

    @property({ type:sp.Skeleton })
    skeleton: sp.Skeleton | null = null;

    private _jitterEffect?:sp.VertexEffectDelegate;

    start () {
        this._jitterEffect = new sp.VertexEffectDelegate();
        // 设置好抖动参数。
        this._jitterEffect.initJitter(20, 20);
        // 调用 Skeleton 组件的 setVertexEffectDelegate 方法设置效果。
        this.skeleton!.setVertexEffectDelegate(this._jitterEffect!);
    }

};