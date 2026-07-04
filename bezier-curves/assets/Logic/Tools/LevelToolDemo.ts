import {
    _decorator,
    Color,
    Component,
    Node,
    UITransform,
} from 'cc';
import { PathPreview } from './PathPreview';
import { BezierSpline } from './BezierSpline';

const { ccclass, executeInEditMode, menu, property } = _decorator;

@ccclass('LevelToolDemo')
@executeInEditMode(true)
@menu('Curve/Level Tool Demo')
export class LevelToolDemo extends Component {
    @property({ tooltip: '进入场景后自动创建左右两条演示路径节点。' })
    autoSetupPaths = true;

    @property({ tooltip: '左路径节点名，对应 assets/PathRes 下同名 json。' })
    leftPathName = 'path_left';

    @property({ tooltip: '右路径节点名，对应 assets/PathRes 下同名 json。' })
    rightPathName = 'path_right';

    @property({ tooltip: '左路径颜色。' })
    leftCurveColor = new Color(255, 197, 61, 255);

    @property({ tooltip: '右路径颜色。' })
    rightCurveColor = new Color(73, 189, 255, 255);

    private readonly _initializedPaths = new Set<string>();

    onLoad () {
        this.setupPaths();
    }

    onValidate () {
        this.setupPaths();
    }

    private setupPaths () {
        if (!this.autoSetupPaths) {
            return;
        }

        const paths = this.ensureChild('paths', 2);
        this.ensurePathNode(paths, this.leftPathName, this.leftCurveColor);
        this.ensurePathNode(paths, this.rightPathName, this.rightCurveColor);
    }

    private ensureChild (name: string, siblingIndex: number) {
        let child = this.node.getChildByName(name);
        if (!child) {
            child = new Node(name);
            child.setParent(this.node);
        }

        child.setSiblingIndex(siblingIndex);
        child.getComponent(UITransform) ?? child.addComponent(UITransform);
        return child;
    }

    private ensurePathNode (parent: Node, name: string, curveColor: Readonly<Color>) {
        const isNew = !parent.getChildByName(name);
        let pathNode = parent.getChildByName(name);
        if (!pathNode) {
            pathNode = new Node(name);
            pathNode.setParent(parent);
        }

        pathNode.getComponent(UITransform) ?? pathNode.addComponent(UITransform);

        const spline = pathNode.getComponent(BezierSpline) ?? pathNode.addComponent(BezierSpline);
        spline.defaultSpacing = 220;
        spline.evenlySpacedStep = 20;
        spline.curveColor = new Color(curveColor);
        spline.selectedCurveColor = new Color(
            Math.min(curveColor.r + 30, 255),
            Math.min(curveColor.g + 30, 255),
            Math.min(curveColor.b + 30, 255),
            curveColor.a,
        );

        pathNode.getComponent(PathPreview) ?? pathNode.addComponent(PathPreview);

        if (isNew && !this._initializedPaths.has(name)) {
            this._initializedPaths.add(name);
            spline.importPointsFromJson();
        }
    }
}
