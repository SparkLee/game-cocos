import { _decorator, Component, log, Node, Vec3, UITransform, Size, randomRangeInt, Sprite, math, Label } from 'cc';
import { AABBUtils } from './AABBUtils';
import { OBBUtils } from './OBBUtils';
import { OBBUtilsV2 } from './OBBUtilsV2';
const { ccclass, property } = _decorator;

@ccclass('Main')
export class Main extends Component {
    @property(Node)
    public node1: Node | null = null;

    @property(Node)
    public node2: Node | null = null;

    public myOBBV2Nodes: Node[] = [];
    public myOBBV2ArrowDirections: object = {};

    public myOBBV2NodesWithRotation: Node[] = [];
    public myOBBV2ArrowDirectionsWithRotation: object = {};

    start() {
        // this.testAABB();
        // this.testNodesOBBIntersecting();
        this.testOBBV2();
        // this.testOBBV2WithRotation();
    }

    update(deltaTime: number) {
        // this.testNodesAABBIntersecting();
        // this.testNodesOBBIntersecting();
        // this.testNodesOBBV2Intersecting();
    }

    testNodesAABBIntersecting() {
        const areNodesIntersecting = AABBUtils.areNodesIntersecting(this.node1!, this.node2!)
        log(`Are nodes aabb intersecting? ${areNodesIntersecting}`);
    }

    testNodesOBBIntersecting() {
        const areNodesIntersecting = OBBUtils.areNodesIntersecting(this.node1!, this.node2!)
        log(`Are nodes obb intersecting? ${areNodesIntersecting}`);
    }

    testNodesOBBV2Intersecting() {
        const areNodesIntersecting = OBBUtilsV2.areNodesIntersecting(this.node1!, this.node2!)
        log(`Are nodes obb.v2 intersecting? ${areNodesIntersecting}`);
    }

    testAABB() {
        const sceneSize = this.node.getComponent(UITransform)!.contentSize;

        // 用箭头符号表示出上下左右
        const arrowDirections = {
            '↑': new Vec3(0, 1, 0),  // 上
            '↓': new Vec3(0, -1, 0), // 下
            '→': new Vec3(1, 0, 0),  // 右
            '←': new Vec3(-1, 0, 0)  // 左
        };
        const arrowColors = {
            '↑': math.Color.RED,
            '↓': math.Color.YELLOW,
            '→': math.Color.GREEN,
            '←': math.Color.BLUE,
        };
        const arrows = Object.keys(arrowDirections);
        const directions = Object.values(arrowDirections);

        const nodeSize = new Size(60, 60);

        const nodes: Node[] = [];

        // 随机生成n个不相交的矩形节点
        for (let i = 0; i < 10; i++) {
            // log(`开始生成节点：${i + 1}`);
            let node: Node;
            let uiTransform: UITransform;
            let sprite: Sprite
            let position: Vec3;
            let isIntersecting: boolean;

            do {
                node = new Node(`Rectangle${i + 1}`);

                sprite = node.addComponent(Sprite);
                sprite.spriteFrame = this.node1.getComponent(Sprite)!.spriteFrame;
                sprite.color = math.Color.YELLOW;

                uiTransform = node.getComponent(UITransform);
                uiTransform.setContentSize(nodeSize);

                const labelNode = new Node(`Label${i + 1}`);
                const label = labelNode.addComponent(Label);
                const arrow = arrows[randomRangeInt(0, arrows.length)];
                sprite.color = arrowColors[arrow]; // 颜色根据箭头符号设置
                label.string = `${i + 1} ${arrow}`;
                label.fontSize = 20;

                position = new Vec3(
                    randomRangeInt(-sceneSize.width / 2 + nodeSize.x, sceneSize.width / 2 - nodeSize.x),
                    randomRangeInt(-sceneSize.height / 2 + nodeSize.y, sceneSize.height / 2 - nodeSize.y),
                    0
                );
                node.setPosition(position);

                node.addChild(labelNode);

                this.node.addChild(node);
                isIntersecting = nodes.some(existingNode => AABBUtils.areNodesIntersecting(node, existingNode));
                if (isIntersecting) {
                    // log(`节点相交，重新生成！：${i + 1}`);
                    this.node.removeChild(node);
                }
            } while (isIntersecting);

            nodes.push(node);
            // log(`节点生成完成！：${i + 1}`);
        }

        // 找出所有的无障碍节点
        const allUnobstructedNodes = AABBUtils.findAllUnobstructedNodes(nodes, arrowDirections, sceneSize);
        const allObscuredNodes = nodes.filter(node => !allUnobstructedNodes.includes(node));
        console.log(`全部死障节点集合 Nodes:`, allObscuredNodes.map(node => node.name));
    }

    testOBBV2() {
        const sceneSize = this.node.getComponent(UITransform)!.contentSize;

        // 用箭头符号表示出上下左右
        const arrowDirections = {
            '↑': new Vec3(0, 1, 0),  // 上
            '↓': new Vec3(0, -1, 0), // 下
            '→': new Vec3(1, 0, 0),  // 右
            '←': new Vec3(-1, 0, 0)  // 左
        };
        this.myOBBV2ArrowDirections = arrowDirections;
        const arrowColors = {
            '↑': math.Color.RED,
            '↓': math.Color.YELLOW,
            '→': math.Color.GREEN,
            '←': math.Color.BLUE,
        };
        const arrows = Object.keys(arrowDirections);
        const directions = Object.values(arrowDirections);

        const nodeSize = new Size(60, 60);

        const nodes: Node[] = [];

        // 随机生成n个不相交的矩形节点
        for (let i = 0; i < 20; i++) {
            // log(`开始生成节点：${i + 1}`);
            let node: Node;
            let uiTransform: UITransform;
            let sprite: Sprite
            let position: Vec3;
            let isIntersecting: boolean;

            do {
                node = new Node(`Rectangle${i + 1}`);

                sprite = node.addComponent(Sprite);
                sprite.spriteFrame = this.node1.getComponent(Sprite)!.spriteFrame;
                sprite.color = math.Color.YELLOW;

                uiTransform = node.getComponent(UITransform);
                uiTransform.setContentSize(nodeSize);

                const labelNode = new Node(`Label${i + 1}`);
                const label = labelNode.addComponent(Label);
                const arrow = arrows[randomRangeInt(0, arrows.length)];
                sprite.color = arrowColors[arrow]; // 颜色根据箭头符号设置
                label.string = `${i + 1} ${arrow}`;
                label.fontSize = 20;

                position = new Vec3(
                    randomRangeInt(-sceneSize.width / 2 + nodeSize.x, sceneSize.width / 2 - nodeSize.x),
                    randomRangeInt(-sceneSize.height / 2 + nodeSize.y, sceneSize.height / 2 - nodeSize.y),
                    0
                );
                node.setPosition(position);

                node.addChild(labelNode);

                this.node.addChild(node);
                isIntersecting = nodes.some(existingNode => OBBUtilsV2.areNodesIntersecting(node, existingNode));
                if (isIntersecting) {
                    // log(`节点相交，重新生成！：${i + 1}`);
                    this.node.removeChild(node);
                }
            } while (isIntersecting);

            nodes.push(node);
            // log(`节点生成完成！：${i + 1}`);
        }

        this.myOBBV2Nodes = nodes;

        // 找出所有的无障碍节点
        const allUnobstructedNodes = AABBUtils.findAllUnobstructedNodes(nodes, arrowDirections, sceneSize);
        const allObscuredNodes = nodes.filter(node => !allUnobstructedNodes.includes(node));
        console.log(`全部死障节点集合 Nodes:`, allObscuredNodes.map(node => node.name));
    }

    testOBBV2WithRotation() {
        const sceneSize = this.node.getComponent(UITransform)!.contentSize;

        // 用箭头符号表示出左上、左下、右上、右下
        const arrowDirections = {
            '↖': new Vec3(-1, 1, 0),  // 左上
            '↙': new Vec3(-1, -1, 0), // 左下
            '↗': new Vec3(1, 1, 0),   // 右上
            '↘': new Vec3(1, -1, 0)   // 右下
        };
        this.myOBBV2ArrowDirectionsWithRotation = arrowDirections;
        const arrowColors = {
            '↖': math.Color.RED,
            '↙': math.Color.YELLOW,
            '↗': math.Color.GREEN,
            '↘': math.Color.BLUE,
        };
        const arrowTitles = {
            '↖': '左上',
            '↙': '左下',
            '↗': '右上',
            '↘': '右下',
        };
        const arrows = Object.keys(arrowDirections);

        const nodeSize = new Size(80, 80);

        const nodes: Node[] = [];

        // 随机生成n个不相交的矩形节点
        for (let i = 0; i < 10; i++) {
            let node: Node;
            let uiTransform: UITransform;
            let sprite: Sprite;
            let position: Vec3;
            let isIntersecting: boolean;

            do {
                node = new Node(`Rectangle${i + 1}`);

                sprite = node.addComponent(Sprite);
                sprite.spriteFrame = this.node1.getComponent(Sprite)!.spriteFrame;
                sprite.color = math.Color.YELLOW;

                uiTransform = node.getComponent(UITransform);
                uiTransform.setContentSize(nodeSize);

                const labelNode = new Node(`Label${i + 1}`);
                const label = labelNode.addComponent(Label);
                const arrow = arrows[randomRangeInt(0, arrows.length)];
                sprite.color = arrowColors[arrow]; // 颜色根据箭头符号设置
                label.string = `${i + 1} ${arrow} ${arrowTitles[arrow]}`;
                label.fontSize = 20;

                position = new Vec3(
                    randomRangeInt(-sceneSize.width / 2 + nodeSize.x, sceneSize.width / 2 - nodeSize.x),
                    randomRangeInt(-sceneSize.height / 2 + nodeSize.y, sceneSize.height / 2 - nodeSize.y),
                    0
                );
                node.setPosition(position);

                // 根据箭头方向旋转节点
                const direction = arrowDirections[arrow];
                const angle = Math.atan2(direction.y, direction.x) * math.toDegree(1);
                node.setRotationFromEuler(0, 0, angle);
                labelNode.setRotationFromEuler(0, 0, -angle); // label展示文字要保持箭头方向不变，所以要逆向旋转

                node.addChild(labelNode);

                this.node.addChild(node);
                isIntersecting = nodes.some(existingNode => OBBUtilsV2.areNodesIntersecting(node, existingNode));
                if (isIntersecting) {
                    this.node.removeChild(node);
                }
            } while (isIntersecting);

            nodes.push(node);
        }

        this.myOBBV2NodesWithRotation = nodes;

        // 找出所有的无障碍节点
        const allUnobstructedNodes = AABBUtils.findAllUnobstructedNodes(nodes, arrowDirections, sceneSize);
        const allObscuredNodes = nodes.filter(node => !allUnobstructedNodes.includes(node));
        console.log(`全部死障节点集合 Nodes:`, allObscuredNodes.map(node => node.name));
    }

    /**
     * 点击一下，所有节点都向前移动一步（不倾斜）
     */
    onClickMove() {
        this.myOBBV2Nodes.forEach(node => {
            const label = node.children[0].getComponent(Label)!;
            const arrow = label.string.split(' ')[1];
            const direction = this.myOBBV2ArrowDirections[arrow];

            const position = node.getPosition();
            node.setPosition(position.add(direction));
        });
    }

    /**
     * 点击一下，所有节点都向前移动一步(倾斜)
     */
    onClickMoveWithRotation() {
        this.myOBBV2NodesWithRotation.forEach(node => {
            const label = node.children[0].getComponent(Label)!;
            const arrow = label.string.split(' ')[1];
            const direction = this.myOBBV2ArrowDirectionsWithRotation[arrow];

            const position = node.getPosition();
            node.setPosition(position.add(direction));
        });
    }
}
