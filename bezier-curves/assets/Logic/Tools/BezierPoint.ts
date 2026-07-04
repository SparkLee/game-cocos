import { _decorator, Component, Enum } from 'cc';

const { ccclass, executeInEditMode, menu, property } = _decorator;

export enum BezierTangentMode {
    Free = 0,
    Aligned = 1,
    Mirrored = 2,
}

@ccclass('BezierPoint')
@executeInEditMode
@menu('Curve/Bezier Point')
export class BezierPoint extends Component {
    @property({ type: Enum(BezierTangentMode), tooltip: 'Free: 自由；Aligned: 方向联动；Mirrored: 方向和长度都联动。' })
    tangentMode = BezierTangentMode.Mirrored;
}
