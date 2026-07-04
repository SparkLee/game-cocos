import {
    _decorator,
    Color,
    Component,
    EventMouse,
    EventTouch,
    Graphics,
    Node,
    UITransform,
    Vec2,
    Vec3,
} from 'cc';
import { BezierHandle, BezierHandleRole } from './BezierHandle';
import { BezierPoint, BezierTangentMode } from './BezierPoint';

const { ccclass, disallowMultiple, executeInEditMode, menu, playOnFocus, property, requireComponent } = _decorator;

const TMP_VEC3_A = new Vec3();
const TMP_VEC3_B = new Vec3();
const TMP_VEC3_C = new Vec3();
const TMP_VEC3_D = new Vec3();
const TMP_VEC3_E = new Vec3();
const TMP_VEC3_F = new Vec3();
const TMP_VEC3_G = new Vec3();
const TMP_VEC3_H = new Vec3();

type SegmentHit = {
    distanceSq: number;
    point: Vec3;
    segmentIndex: number;
    t: number;
};

@ccclass('BezierSpline')
@executeInEditMode
@playOnFocus
@disallowMultiple
@requireComponent(Graphics)
@menu('Curve/Bezier Spline')
export class BezierSpline extends Component {
    @property
    closed = false;

    @property
    stepsPerSegment = 32;

    @property
    lineWidth = 4;

    @property
    defaultSpacing = 240;

    @property
    showGuides = true;

    @property({ type: Color })
    curveColor = new Color(255, 197, 61, 255);

    @property({ type: Color })
    selectedCurveColor = new Color(255, 245, 130, 255);

    @property({ type: Color })
    guideColor = new Color(110, 170, 255, 180);

    @property({ type: Color })
    anchorColor = new Color(255, 255, 255, 255);

    @property({ type: Color })
    selectedAnchorColor = new Color(255, 230, 90, 255);

    @property({ type: Color })
    tangentColor = new Color(73, 189, 255, 255);

    @property({ type: Color })
    selectedTangentColor = new Color(255, 153, 79, 255);

    @property
    handleRadius = 9;

    @property({ tooltip: '保留给后续更深的编辑器交互扩展；当前稳定工作流请使用 Inspector 按钮插点。' })
    clickToAdd = false;

    @property({ readonly: true, displayName: 'Selected Point' })
    selectedPointIndex = -1;

    @property({ tooltip: '勾一下后会在末尾追加一个锚点，执行后自动复位。', displayName: '[工具] 追加尾点' })
    appendAnchorAction = false;

    @property({ tooltip: '勾一下后会在当前选中点后的曲线段中点插入新点，执行后自动复位。', displayName: '[工具] 当前段插点' })
    insertSelectedSegmentAction = false;

    @property({ tooltip: '勾一下后会以当前曲线节点中心为参考，插入到最近曲线段，执行后自动复位。', displayName: '[工具] 中心最近段插点' })
    insertNearestFromCenterAction = false;

    @property({ tooltip: '勾一下后删除当前选中点，执行后自动复位。', displayName: '[工具] 删除选中点' })
    deleteSelectedPointAction = false;

    @property({ tooltip: '勾一下后选中上一个点，执行后自动复位。', displayName: '[工具] 选中上一个点' })
    selectPreviousPointAction = false;

    @property({ tooltip: '勾一下后选中下一个点，执行后自动复位。', displayName: '[工具] 选中下一个点' })
    selectNextPointAction = false;

    @property({ tooltip: '勾一下后重建成默认两点曲线，执行后自动复位。', displayName: '[工具] 重建默认曲线' })
    resetCurveAction = false;

    @property({ tooltip: '勾一下后按固定像素间距沿整条曲线均匀重建锚点，执行后自动复位。', displayName: '[工具] 按固定间距重建点位' })
    rebuildEvenlySpacedPointsAction = false;

    @property({ tooltip: '勾一下后将当前曲线点位导出为 JSON 文本，执行后自动复位。', displayName: '[工具] 导出点位 JSON' })
    exportPointsJsonAction = false;

    @property({ tooltip: '勾一下后按当前节点名，从默认导出目录读取同名 json 并重建曲线，执行后自动复位。', displayName: '[工具] 导入点位 JSON' })
    importPointsJsonAction = false;

    @property({ tooltip: '均匀重建时的目标点间距（像素）。' })
    evenlySpacedStep = 20;

    @property({ multiline: true, readonly: true, displayName: 'Exported Points JSON' })
    exportedPointsJson = '';

    @property({ readonly: true, displayName: 'Exported File Path' })
    exportedFilePath = '';

    @property({ multiline: true, readonly: true, displayName: 'Import / Export Status' })
    ioStatus = '';

    private readonly _lastLocalPositions = new Map<string, Vec3>();
    private _selectedHandleRole = BezierHandleRole.Anchor;
    private _isListeningForClicks = false;

    onEnable () {
        this.ensureEditableCurve();
        this.bindInteractionEvents();
        this.redraw();
        this.cacheHandlePositions();
    }

    onDisable () {
        this.unbindInteractionEvents();
    }

    onValidate () {
        this.ensureEditableCurve();
        this.bindInteractionEvents();
        this.redraw();
        this.cacheHandlePositions();
    }

    update () {
        this.consumeInspectorActions();
        this.ensureEditableCurve();
        this.syncTangentModes();
        this.redraw();
        this.cacheHandlePositions();
    }

    private consumeInspectorActions () {
        if (this.appendAnchorAction) {
            this.appendAnchorAction = false;
            this.appendAnchor();
        }

        if (this.insertSelectedSegmentAction) {
            this.insertSelectedSegmentAction = false;
            this.insertPointAtSelectedSegment();
        }

        if (this.insertNearestFromCenterAction) {
            this.insertNearestFromCenterAction = false;
            this.insertPointAtNearestSegmentFromCenter();
        }

        if (this.deleteSelectedPointAction) {
            this.deleteSelectedPointAction = false;
            this.deleteSelectedPoint();
        }

        if (this.selectPreviousPointAction) {
            this.selectPreviousPointAction = false;
            this.selectPreviousPoint();
        }

        if (this.selectNextPointAction) {
            this.selectNextPointAction = false;
            this.selectNextPoint();
        }

        if (this.resetCurveAction) {
            this.resetCurveAction = false;
            this.rebuildDefaultCurve();
        }

        if (this.rebuildEvenlySpacedPointsAction) {
            this.rebuildEvenlySpacedPointsAction = false;
            this.rebuildEvenlySpacedPoints();
        }

        if (this.exportPointsJsonAction) {
            this.exportPointsJsonAction = false;
            this.exportPointsAsJson();
        }

        if (this.importPointsJsonAction) {
            this.importPointsJsonAction = false;
            this.importPointsFromJson();
        }
    }

    public rebuildDefaultCurve () {
        const anchors = this.getAnchorNodes();
        for (const anchor of anchors) {
            anchor.destroy();
        }

        const half = this.defaultSpacing * 0.5;
        this.createAnchor(new Vec3(-half, 0, 0), new Vec3(-70, 0, 0), new Vec3(70, 0, 0), 0);
        this.createAnchor(new Vec3(half, 0, 0), new Vec3(-70, 0, 0), new Vec3(70, 0, 0), 1);
        this.syncHandleMetadata();
        this.selectPoint(0, BezierHandleRole.Anchor);
    }

    public appendAnchor () {
        const anchors = this.getAnchorNodes();
        if (anchors.length === 0) {
            this.rebuildDefaultCurve();
            return;
        }

        const lastAnchor = anchors[anchors.length - 1];
        const prevAnchor = anchors[Math.max(anchors.length - 2, 0)];
        const direction = this.getForwardDirection(prevAnchor, lastAnchor);
        const anchorPosition = lastAnchor.position.clone().add(direction.clone().multiplyScalar(this.defaultSpacing));
        const tangentLength = Math.max(50, this.defaultSpacing * 0.32);

        const lastOut = this.getTangentNode(lastAnchor, BezierHandleRole.Out);
        if (lastOut) {
            lastOut.setPosition(direction.clone().multiplyScalar(tangentLength));
        }

        this.createAnchor(
            anchorPosition,
            direction.clone().multiplyScalar(-tangentLength),
            direction.clone().multiplyScalar(tangentLength),
            anchors.length,
        );

        this.syncHandleMetadata();
        this.selectPoint(anchors.length, BezierHandleRole.Anchor);
    }

    public insertPointAtNearestSegmentFromCenter () {
        this.insertPointAt(new Vec3(0, 0, 0));
    }

    public insertPointAtSelectedSegment () {
        const anchors = this.getAnchorNodes();
        if (anchors.length < 2) {
            return;
        }

        let segmentIndex = this.selectedPointIndex;
        if (segmentIndex < 0) {
            segmentIndex = 0;
        }

        if (!this.closed) {
            segmentIndex = Math.min(segmentIndex, anchors.length - 2);
        } else {
            segmentIndex = ((segmentIndex % anchors.length) + anchors.length) % anchors.length;
        }

        this.insertPointOnSegment(segmentIndex, 0.5);
    }

    public rebuildEvenlySpacedPoints () {
        const anchors = this.getAnchorNodes();
        if (anchors.length < 2) {
            return;
        }

        const step = Math.max(2, this.evenlySpacedStep);
        const segmentCount = this.closed ? anchors.length : anchors.length - 1;
        const sampled: Vec3[] = [];
        let previousPoint: Vec3 | null = null;
        let accumulatedDistance = 0;

        for (let i = 0; i < segmentCount; i++) {
            const current = anchors[i];
            const next = anchors[(i + 1) % anchors.length];
            const p0 = this.getAnchorPosition(current, TMP_VEC3_A);
            const c0 = this.getOutgoingControlPosition(current, TMP_VEC3_B);
            const c1 = this.getIncomingControlPosition(next, TMP_VEC3_C);
            const p1 = this.getAnchorPosition(next, TMP_VEC3_D);

            const segmentSteps = Math.max(24, this.stepsPerSegment * 3);
            for (let sampleIndex = 0; sampleIndex <= segmentSteps; sampleIndex++) {
                if (i > 0 && sampleIndex === 0) {
                    continue;
                }

                const t = sampleIndex / segmentSteps;
                const point2 = this.sampleBezier(p0, c0, c1, p1, t);
                const point = new Vec3(point2.x, point2.y, 0);

                if (!previousPoint) {
                    sampled.push(point.clone());
                    previousPoint = point;
                    accumulatedDistance = 0;
                    continue;
                }

                const segmentDistance = Vec3.distance(previousPoint, point);
                if (segmentDistance < 1e-4) {
                    continue;
                }

                let remainingDistance = segmentDistance;
                let start = previousPoint.clone();
                while (accumulatedDistance + remainingDistance >= step) {
                    const needed = step - accumulatedDistance;
                    const ratio = needed / remainingDistance;
                    const newPoint = start.clone().lerp(point, ratio);
                    sampled.push(newPoint.clone());
                    start = newPoint;
                    remainingDistance = Vec3.distance(start, point);
                    accumulatedDistance = 0;
                }

                accumulatedDistance += remainingDistance;
                previousPoint = point;
            }
        }

        const endAnchor = anchors[anchors.length - 1].position.clone();
        if (!this.closed) {
            const lastSample = sampled[sampled.length - 1];
            if (!lastSample || Vec3.distance(lastSample, endAnchor) > 1) {
                sampled.push(endAnchor);
            }
        }

        if (sampled.length < 2) {
            return;
        }

        for (const anchor of anchors) {
            anchor.destroy();
        }

        for (let i = 0; i < sampled.length; i++) {
            const current = sampled[i];
            const prev = sampled[Math.max(i - 1, 0)];
            const next = sampled[Math.min(i + 1, sampled.length - 1)];
            const direction = next.clone().subtract(prev);
            if (direction.lengthSqr() < 1e-4) {
                direction.set(1, 0, 0);
            } else {
                direction.normalize();
            }

            const tangentLength = Math.min(step * 0.35, 30);
            const inOffset = i === 0 && !this.closed ? new Vec3() : direction.clone().multiplyScalar(-tangentLength);
            const outOffset = i === sampled.length - 1 && !this.closed ? new Vec3() : direction.clone().multiplyScalar(tangentLength);
            this.createAnchor(current.clone(), inOffset, outOffset, i);
        }

        this.syncHandleMetadata();
        this.selectPoint(0, BezierHandleRole.Anchor);
    }

    public exportPointsAsJson () {
        const anchors = this.getAnchorNodes();
        const points = anchors.map((anchor, index) => {
            const inNode = this.getTangentNode(anchor, BezierHandleRole.In);
            const outNode = this.getTangentNode(anchor, BezierHandleRole.Out);
            const point = anchor.getComponent(BezierPoint);

            return {
                index,
                position: {
                    x: this.roundValue(anchor.position.x),
                    y: this.roundValue(anchor.position.y),
                },
                inTangent: {
                    x: this.roundValue(inNode?.position.x ?? 0),
                    y: this.roundValue(inNode?.position.y ?? 0),
                },
                outTangent: {
                    x: this.roundValue(outNode?.position.x ?? 0),
                    y: this.roundValue(outNode?.position.y ?? 0),
                },
                tangentMode: point?.tangentMode ?? BezierTangentMode.Mirrored,
            };
        });

        const payload = {
            closed: this.closed,
            evenlySpacedStep: this.evenlySpacedStep,
            selectedPointIndex: this.selectedPointIndex,
            nodeName: this.node.name,
            points,
        };

        const json = JSON.stringify(payload, null, 2);
        this.exportedPointsJson = json;

        const editorGlobal = (globalThis as any).Editor;
        const fs = (globalThis as any).require?.('fs');
        const path = (globalThis as any).require?.('path');
        const projectPath = editorGlobal?.Project?.path;
        if (!fs || !path || !projectPath) {
            this.exportedFilePath = '';
            this.ioStatus = 'Export failed: Editor file system API is unavailable in the current environment.';
            return;
        }

        const exportDir = path.join(projectPath, 'assets', 'PathRes');
        const fileName = `${this.sanitizeFileName(this.node.name)}.json`;
        const filePath = path.join(exportDir, fileName);

        fs.mkdirSync(exportDir, { recursive: true });
        fs.writeFileSync(filePath, json, 'utf8');
        this.exportedFilePath = filePath;
        this.ioStatus = `Export succeeded: ${filePath}`;
    }

    public importPointsFromJson () {
        const editorGlobal = (globalThis as any).Editor;
        const fs = (globalThis as any).require?.('fs');
        const path = (globalThis as any).require?.('path');
        const projectPath = editorGlobal?.Project?.path;
        if (!fs || !path || !projectPath) {
            this.ioStatus = 'Import failed: Editor file system API is unavailable in the current environment.';
            return;
        }

        const fileName = `${this.sanitizeFileName(this.node.name)}.json`;
        const filePath = path.join(projectPath, 'assets', 'PathRes', fileName);
        if (!fs.existsSync(filePath)) {
            this.exportedFilePath = filePath;
            this.exportedPointsJson = '';
            this.ioStatus = `Import failed: file not found at ${filePath}`;
            return;
        }

        let raw = '';
        let data: any = null;
        try {
            raw = fs.readFileSync(filePath, 'utf8');
        } catch (error: any) {
            this.exportedFilePath = filePath;
            this.ioStatus = `Import failed: unable to read file. ${error?.message ?? error}`;
            return;
        }

        try {
            data = JSON.parse(raw);
        } catch (error: any) {
            this.exportedFilePath = filePath;
            this.exportedPointsJson = raw;
            this.ioStatus = `Import failed: invalid JSON. ${error?.message ?? error}`;
            return;
        }

        if (!data || !Array.isArray(data.points) || data.points.length < 2) {
            this.exportedFilePath = filePath;
            this.exportedPointsJson = raw;
            this.ioStatus = 'Import failed: JSON does not contain at least 2 valid points.';
            return;
        }

        const anchors = this.getAnchorNodes();
        for (const anchor of anchors) {
            anchor.destroy();
        }

        this.closed = !!data.closed;
        if (typeof data.evenlySpacedStep === 'number') {
            this.evenlySpacedStep = data.evenlySpacedStep;
        }

        data.points.forEach((pointData: any, index: number) => {
            const position = new Vec3(
                Number(pointData?.position?.x ?? 0),
                Number(pointData?.position?.y ?? 0),
                0,
            );
            const inOffset = new Vec3(
                Number(pointData?.inTangent?.x ?? 0),
                Number(pointData?.inTangent?.y ?? 0),
                0,
            );
            const outOffset = new Vec3(
                Number(pointData?.outTangent?.x ?? 0),
                Number(pointData?.outTangent?.y ?? 0),
                0,
            );

            const anchor = this.createAnchor(position, inOffset, outOffset, index);
            const bezierPoint = anchor.getComponent(BezierPoint);
            if (bezierPoint && typeof pointData?.tangentMode === 'number') {
                bezierPoint.tangentMode = pointData.tangentMode;
            }
        });

        this.syncHandleMetadata();
        this.selectPoint(
            typeof data.selectedPointIndex === 'number'
                ? Math.max(0, Math.min(data.selectedPointIndex, data.points.length - 1))
                : 0,
            BezierHandleRole.Anchor,
        );

        this.exportedFilePath = filePath;
        this.exportedPointsJson = raw;
        this.ioStatus = `Import succeeded: ${filePath}`;
    }

    public insertPointAt (localPosition: Readonly<Vec3>) {
        const hit = this.findNearestSegment(localPosition);
        if (!hit) {
            this.appendAnchor();
            return;
        }

        this.insertPointOnSegment(hit.segmentIndex, hit.t);
    }

    public deleteSelectedPoint () {
        if (this.selectedPointIndex < 0) {
            return;
        }

        this.deletePoint(this.selectedPointIndex);
    }

    public deletePoint (index: number) {
        const anchors = this.getAnchorNodes();
        if (anchors.length <= 2 || index < 0 || index >= anchors.length) {
            return;
        }

        const anchor = anchors[index];
        anchor.destroy();

        const nextIndex = Math.min(index, anchors.length - 2);
        this.syncHandleMetadata();
        this.selectPoint(nextIndex, BezierHandleRole.Anchor);
    }

    public selectPreviousPoint () {
        const anchors = this.getAnchorNodes();
        if (anchors.length === 0) {
            return;
        }

        const next = this.selectedPointIndex < 0 ? 0 : (this.selectedPointIndex - 1 + anchors.length) % anchors.length;
        this.selectPoint(next, BezierHandleRole.Anchor);
    }

    public selectNextPoint () {
        const anchors = this.getAnchorNodes();
        if (anchors.length === 0) {
            return;
        }

        const next = this.selectedPointIndex < 0 ? 0 : (this.selectedPointIndex + 1) % anchors.length;
        this.selectPoint(next, BezierHandleRole.Anchor);
    }

    public clearSelection () {
        this.selectedPointIndex = -1;
        this._selectedHandleRole = BezierHandleRole.Anchor;
        this.redraw();
    }

    private ensureEditableCurve () {
        const transform = this.getComponent(UITransform) ?? this.addComponent(UITransform);
        transform.setContentSize(4096, 4096);

        if (this.getAnchorNodes().length === 0) {
            this.rebuildDefaultCurve();
        } else {
            this.syncHandleMetadata();
        }
    }

    private bindInteractionEvents () {
        if (this._isListeningForClicks) {
            return;
        }

        this.node.on(Node.EventType.MOUSE_DOWN, this.onPointerDown, this);
        this.node.on(Node.EventType.TOUCH_END, this.onPointerDown, this);
        this._isListeningForClicks = true;
    }

    private unbindInteractionEvents () {
        if (!this._isListeningForClicks) {
            return;
        }

        this.node.off(Node.EventType.MOUSE_DOWN, this.onPointerDown, this);
        this.node.off(Node.EventType.TOUCH_END, this.onPointerDown, this);
        this._isListeningForClicks = false;
    }

    private onPointerDown (event: EventMouse | EventTouch) {
        const targetNode = event.target as Node | null;
        if (targetNode && targetNode !== this.node) {
            this.selectFromNode(targetNode);
            return;
        }

        if (!this.clickToAdd) {
            this.clearSelection();
            return;
        }

        const uiTransform = this.getComponent(UITransform);
        if (!uiTransform) {
            return;
        }

        const uiLocation = 'getUILocation' in event ? event.getUILocation() : event.getLocation();
        const worldPosition = new Vec3(uiLocation.x, uiLocation.y, 0);
        const localPosition = uiTransform.convertToNodeSpaceAR(worldPosition);

        this.insertPointAt(new Vec3(localPosition.x, localPosition.y, 0));
        event.stopPropagation();
    }

    private selectFromNode (node: Node) {
        const handleNode = node.getComponent(BezierHandle) ? node : node.parent;
        if (!handleNode) {
            return;
        }

        const handle = handleNode.getComponent(BezierHandle);
        if (handle?.role === BezierHandleRole.Anchor) {
            this.selectPoint(handle.pointIndex, BezierHandleRole.Anchor);
            return;
        }

        const anchorNode = handleNode.parent;
        const anchorHandle = anchorNode?.getComponent(BezierHandle);
        if (!anchorHandle) {
            return;
        }

        this.selectPoint(anchorHandle.pointIndex, handle!.role);
    }

    private selectPoint (index: number, role: BezierHandleRole) {
        this.selectedPointIndex = index;
        this._selectedHandleRole = role;
        this.redraw();
    }

    private syncTangentModes () {
        const anchors = this.getAnchorNodes();
        for (const anchor of anchors) {
            const point = anchor.getComponent(BezierPoint);
            if (!point || point.tangentMode === BezierTangentMode.Free) {
                continue;
            }

            const inNode = this.getTangentNode(anchor, BezierHandleRole.In);
            const outNode = this.getTangentNode(anchor, BezierHandleRole.Out);
            if (!inNode || !outNode) {
                continue;
            }

            const inMoved = this.hasLocalPositionChanged(inNode);
            const outMoved = this.hasLocalPositionChanged(outNode);

            if (inMoved && outMoved) {
                continue;
            }

            if (inMoved) {
                this.applyLinkedTangent(point.tangentMode, inNode.position, outNode);
            } else if (outMoved) {
                this.applyLinkedTangent(point.tangentMode, outNode.position, inNode);
            }
        }
    }

    private applyLinkedTangent (mode: BezierTangentMode, moved: Readonly<Vec3>, sibling: Node) {
        const movedLength = moved.length();
        if (movedLength < 1e-4) {
            return;
        }

        const direction = TMP_VEC3_E.set(moved).normalize().multiplyScalar(-1);
        let targetLength = sibling.position.length();

        if (mode === BezierTangentMode.Mirrored || targetLength < 1e-4) {
            targetLength = movedLength;
        }

        sibling.setPosition(direction.multiplyScalar(targetLength));
    }

    private hasLocalPositionChanged (node: Node) {
        const key = node.uuid;
        const last = this._lastLocalPositions.get(key);
        if (!last) {
            return false;
        }

        return Vec3.squaredDistance(last, node.position) > 0.01;
    }

    private cacheHandlePositions () {
        const anchors = this.getAnchorNodes();
        for (const anchor of anchors) {
            this._lastLocalPositions.set(anchor.uuid, anchor.position.clone());

            const inNode = this.getTangentNode(anchor, BezierHandleRole.In);
            const outNode = this.getTangentNode(anchor, BezierHandleRole.Out);

            if (inNode) {
                this._lastLocalPositions.set(inNode.uuid, inNode.position.clone());
            }

            if (outNode) {
                this._lastLocalPositions.set(outNode.uuid, outNode.position.clone());
            }
        }
    }

    private redraw () {
        const graphics = this.getComponent(Graphics)!;
        const anchors = this.getAnchorNodes();

        graphics.clear();
        this.syncHandleStyles(anchors);

        if (anchors.length < 2) {
            return;
        }

        if (this.showGuides) {
            graphics.lineWidth = 2;

            for (let i = 0; i < anchors.length; i++) {
                const anchor = anchors[i];
                const isSelected = i === this.selectedPointIndex;
                const anchorPos = this.getAnchorPosition(anchor, TMP_VEC3_A);
                const inNode = this.getTangentNode(anchor, BezierHandleRole.In);
                const outNode = this.getTangentNode(anchor, BezierHandleRole.Out);

                graphics.strokeColor = isSelected ? this.selectedTangentColor : this.guideColor;

                if (inNode) {
                    const inPos = this.getTangentPosition(anchor, inNode, TMP_VEC3_B);
                    graphics.moveTo(anchorPos.x, anchorPos.y);
                    graphics.lineTo(inPos.x, inPos.y);
                    graphics.stroke();
                }

                if (outNode) {
                    const outPos = this.getTangentPosition(anchor, outNode, TMP_VEC3_C);
                    graphics.moveTo(anchorPos.x, anchorPos.y);
                    graphics.lineTo(outPos.x, outPos.y);
                    graphics.stroke();
                }
            }
        }

        const segmentCount = this.closed ? anchors.length : anchors.length - 1;
        for (let i = 0; i < segmentCount; i++) {
            const current = anchors[i];
            const next = anchors[(i + 1) % anchors.length];
            const highlightSegment = i === this.selectedPointIndex || (i + 1) % anchors.length === this.selectedPointIndex;

            const p0 = this.getAnchorPosition(current, TMP_VEC3_A);
            const c0 = this.getOutgoingControlPosition(current, TMP_VEC3_B);
            const c1 = this.getIncomingControlPosition(next, TMP_VEC3_C);
            const p1 = this.getAnchorPosition(next, TMP_VEC3_D);

            graphics.lineWidth = highlightSegment ? this.lineWidth + 1.5 : this.lineWidth;
            graphics.strokeColor = highlightSegment ? this.selectedCurveColor : this.curveColor;
            graphics.moveTo(p0.x, p0.y);
            for (let step = 1; step <= this.stepsPerSegment; step++) {
                const t = step / this.stepsPerSegment;
                const point = this.sampleBezier(p0, c0, c1, p1, t);
                graphics.lineTo(point.x, point.y);
            }
            graphics.stroke();
        }
    }

    private syncHandleStyles (anchors: Node[]) {
        for (let i = 0; i < anchors.length; i++) {
            const anchor = anchors[i];
            const anchorHandle = anchor.getComponent(BezierHandle);
            const isSelected = i === this.selectedPointIndex;
            if (anchorHandle) {
                anchorHandle.pointIndex = i;
                anchorHandle.role = BezierHandleRole.Anchor;
                anchorHandle.applyStyle(
                    isSelected ? this.handleRadius + 3 : this.handleRadius + 1,
                    isSelected ? this.selectedAnchorColor : this.anchorColor,
                    isSelected ? new Color(94, 68, 0, 255) : new Color(35, 35, 35, 255),
                );
            }

            const inNode = this.ensureTangentNode(anchor, 'In', BezierHandleRole.In, new Vec3(-70, 0, 0));
            const outNode = this.ensureTangentNode(anchor, 'Out', BezierHandleRole.Out, new Vec3(70, 0, 0));

            const inHandle = inNode.getComponent(BezierHandle)!;
            inHandle.pointIndex = i;
            inHandle.applyStyle(
                this.handleRadius - 1,
                isSelected && this._selectedHandleRole === BezierHandleRole.In ? this.selectedTangentColor : this.tangentColor,
                isSelected && this._selectedHandleRole === BezierHandleRole.In ? new Color(122, 54, 22, 255) : new Color(22, 80, 122, 255),
            );

            const outHandle = outNode.getComponent(BezierHandle)!;
            outHandle.pointIndex = i;
            outHandle.applyStyle(
                this.handleRadius - 1,
                isSelected && this._selectedHandleRole === BezierHandleRole.Out ? this.selectedTangentColor : this.tangentColor,
                isSelected && this._selectedHandleRole === BezierHandleRole.Out ? new Color(122, 54, 22, 255) : new Color(22, 80, 122, 255),
            );
        }
    }

    private syncHandleMetadata () {
        const anchors = this.getAnchorNodes();
        for (let i = 0; i < anchors.length; i++) {
            const anchor = anchors[i];
            anchor.name = `Point_${i}`;

            const anchorHandle = anchor.getComponent(BezierHandle) ?? anchor.addComponent(BezierHandle);
            anchorHandle.role = BezierHandleRole.Anchor;
            anchorHandle.pointIndex = i;

            anchor.getComponent(BezierPoint) ?? anchor.addComponent(BezierPoint);

            this.ensureTangentNode(anchor, 'In', BezierHandleRole.In, new Vec3(-70, 0, 0));
            this.ensureTangentNode(anchor, 'Out', BezierHandleRole.Out, new Vec3(70, 0, 0));
        }

        if (anchors.length === 0) {
            this.selectedPointIndex = -1;
            return;
        }

        if (this.selectedPointIndex >= anchors.length) {
            this.selectedPointIndex = anchors.length - 1;
            this._selectedHandleRole = BezierHandleRole.Anchor;
        }
    }

    private createAnchor (position: Vec3, inOffset: Vec3, outOffset: Vec3, siblingIndex?: number) {
        const anchor = new Node('Point');
        anchor.setParent(this.node);
        if (siblingIndex !== undefined) {
            anchor.setSiblingIndex(siblingIndex);
        }
        anchor.setPosition(position);
        const anchorTransform = anchor.addComponent(UITransform);
        anchorTransform.setContentSize(36, 36);
        anchor.addComponent(BezierHandle).role = BezierHandleRole.Anchor;
        anchor.addComponent(BezierPoint);

        this.ensureTangentNode(anchor, 'In', BezierHandleRole.In, inOffset);
        this.ensureTangentNode(anchor, 'Out', BezierHandleRole.Out, outOffset);
        return anchor;
    }

    private ensureTangentNode (anchor: Node, nodeName: string, role: BezierHandleRole, defaultPosition: Vec3) {
        let tangent = anchor.children.find((child) => child.name === nodeName) ?? null;
        if (!tangent) {
            tangent = new Node(nodeName);
            tangent.setParent(anchor);
            tangent.setPosition(defaultPosition);
            const tangentTransform = tangent.addComponent(UITransform);
            tangentTransform.setContentSize(28, 28);
            tangent.addComponent(BezierHandle).role = role;
        }

        const handle = tangent.getComponent(BezierHandle) ?? tangent.addComponent(BezierHandle);
        handle.role = role;

        return tangent;
    }

    private getAnchorNodes () {
        return this.node.children
            .filter((child) => child.getComponent(BezierHandle)?.role === BezierHandleRole.Anchor)
            .sort((a, b) => a.getSiblingIndex() - b.getSiblingIndex());
    }

    private getTangentNode (anchor: Node, role: BezierHandleRole) {
        return anchor.children.find((child) => child.getComponent(BezierHandle)?.role === role) ?? null;
    }

    private getAnchorPosition (anchor: Node, out: Vec3) {
        return out.set(anchor.position);
    }

    private getTangentPosition (anchor: Node, tangent: Node, out: Vec3) {
        return out.set(anchor.position).add(tangent.position);
    }

    private getOutgoingControlPosition (anchor: Node, out: Vec3) {
        const tangent = this.getTangentNode(anchor, BezierHandleRole.Out);
        if (!tangent) {
            return out.set(anchor.position);
        }

        return this.getTangentPosition(anchor, tangent, out);
    }

    private getIncomingControlPosition (anchor: Node, out: Vec3) {
        const tangent = this.getTangentNode(anchor, BezierHandleRole.In);
        if (!tangent) {
            return out.set(anchor.position);
        }

        return this.getTangentPosition(anchor, tangent, out);
    }

    private getForwardDirection (from: Node, to: Node) {
        const direction = to.position.clone().subtract(from.position);
        if (direction.lengthSqr() < 1e-4) {
            return new Vec3(1, 0, 0);
        }

        return direction.normalize();
    }

    private findNearestSegment (localPosition: Readonly<Vec3>): SegmentHit | null {
        const anchors = this.getAnchorNodes();
        if (anchors.length < 2) {
            return null;
        }

        const segmentCount = this.closed ? anchors.length : anchors.length - 1;
        let best: SegmentHit | null = null;

        for (let i = 0; i < segmentCount; i++) {
            const current = anchors[i];
            const next = anchors[(i + 1) % anchors.length];

            const p0 = this.getAnchorPosition(current, TMP_VEC3_A);
            const c0 = this.getOutgoingControlPosition(current, TMP_VEC3_B);
            const c1 = this.getIncomingControlPosition(next, TMP_VEC3_C);
            const p1 = this.getAnchorPosition(next, TMP_VEC3_D);

            for (let step = 0; step <= this.stepsPerSegment * 2; step++) {
                const t = step / (this.stepsPerSegment * 2);
                const point = this.sampleBezier(p0, c0, c1, p1, t);
                const dx = point.x - localPosition.x;
                const dy = point.y - localPosition.y;
                const distanceSq = dx * dx + dy * dy;

                if (!best || distanceSq < best.distanceSq) {
                    best = {
                        distanceSq,
                        point: new Vec3(point.x, point.y, 0),
                        segmentIndex: i,
                        t,
                    };
                }
            }
        }

        return best;
    }

    private insertPointOnSegment (segmentIndex: number, t: number) {
        const anchors = this.getAnchorNodes();
        if (anchors.length < 2) {
            return;
        }

        const current = anchors[segmentIndex];
        const next = anchors[(segmentIndex + 1) % anchors.length];

        const p0 = this.getAnchorPosition(current, TMP_VEC3_A);
        const c0 = this.getOutgoingControlPosition(current, TMP_VEC3_B);
        const c1 = this.getIncomingControlPosition(next, TMP_VEC3_C);
        const p1 = this.getAnchorPosition(next, TMP_VEC3_D);

        const q0 = this.lerpVec3(p0, c0, t, TMP_VEC3_E);
        const q1 = this.lerpVec3(c0, c1, t, TMP_VEC3_F);
        const q2 = this.lerpVec3(c1, p1, t, TMP_VEC3_G);
        const r0 = this.lerpVec3(q0, q1, t, TMP_VEC3_H);
        const r1 = this.lerpVec3(q1, q2, t, new Vec3());
        const s = this.lerpVec3(r0, r1, t, new Vec3());

        const currentOut = this.getTangentNode(current, BezierHandleRole.Out);
        if (currentOut) {
            currentOut.setPosition(q0.clone().subtract(p0));
        }

        const nextIn = this.getTangentNode(next, BezierHandleRole.In);
        if (nextIn) {
            nextIn.setPosition(q2.clone().subtract(p1));
        }

        const insertIndex = segmentIndex + 1;
        const anchor = this.createAnchor(
            s,
            r0.clone().subtract(s),
            r1.clone().subtract(s),
            insertIndex,
        );
        anchor.setSiblingIndex(insertIndex);

        this.syncHandleMetadata();
        this.selectPoint(insertIndex, BezierHandleRole.Anchor);
    }

    private lerpVec3 (a: Readonly<Vec3>, b: Readonly<Vec3>, t: number, out: Vec3) {
        out.x = a.x + (b.x - a.x) * t;
        out.y = a.y + (b.y - a.y) * t;
        out.z = a.z + (b.z - a.z) * t;
        return out;
    }

    private sampleBezier (p0: Vec3, c0: Vec3, c1: Vec3, p1: Vec3, t: number) {
        const u = 1 - t;
        const tt = t * t;
        const uu = u * u;
        const uuu = uu * u;
        const ttt = tt * t;

        return new Vec2(
            uuu * p0.x + 3 * uu * t * c0.x + 3 * u * tt * c1.x + ttt * p1.x,
            uuu * p0.y + 3 * uu * t * c0.y + 3 * u * tt * c1.y + ttt * p1.y,
        );
    }

    private roundValue (value: number) {
        return Math.round(value * 1000) / 1000;
    }

    private sanitizeFileName (value: string) {
        const sanitized = value.trim().replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
        return sanitized.length > 0 ? sanitized : 'curve';
    }
}
