import { _decorator, Component, log, Node, Vec3, UITransform, Size, randomRangeInt, Sprite, math, Label } from 'cc';
import { OBBUtils } from './OBBUtils';
const { ccclass, property } = _decorator;

// 生成节点集合需要考虑的几点要求：
// 1. 生成的节点不能相交。
// 2. 生成的节点不能超出屏幕范围。
// 3. 生成的节点集合最终要组成一个矩形区域，靠近边界的节点要对齐边界。
// 4. 生成的节点集合要尽量均匀分布。
// 5. 要随机生成一些跨两列或1列半，和一些跨两行或1行半的节点，但是依然要确保所有节点不相交。
// 6. 每个节点均有一个箭头方向，节点只能朝箭头方向移动，若节点箭头方向前面有其他节点，则不能移动；要确保所有节点最终都能移出屏幕范围。
// 6.1. 在X轴上，要确保向左移动的节点其左边不能有向右移动的节点
// 6.2. 在X轴上，要确保向右移动的节点其右边不能有向左移动的节点
// 6.3. 在Y轴上，要确保向上移动的节点其上边不能有向下移动的节点
// 6.4. 在Y轴上，要确保向下移动的节点其下边不能有向上移动的节点
// 7. 节点移动时，要保持节点的旋转角度不变，即节点的箭头方向不变。

@ccclass('Main')
export class Main extends Component {
    @property(Node)
    public node1: Node | null = null;

    @property(Node)
    public node2: Node | null = null;

    public myOBBV2Nodes: Node[] = [];
    public myOBBV2ArrowDirections: object = {};
    public myOBBV2AllUnobstructedNodes: Node[] = [];

    public myOBBV2NodesWithRotation: Node[] = [];
    public myOBBV2ArrowDirectionsWithRotation: object = {};
    public myOBBV2AllUnobstructedNodesWithRotation: Node[] = [];

    private autoMoveOnUpdate: boolean = false; // 是否在update中自动移动节点
    private currentMovingNode: Node | null = null; // 当前正在移动的节点

    private maxIterationsToFindNodesWithoutObstructedNodes: number = 10;
    private currentIterationToFindNodesWithoutObstructedNodes: number = 0;

    start() {
        // this.testAABB();
        // this.testNodesOBBIntersecting();


        this.currentIterationToFindNodesWithoutObstructedNodes = 0;
        this.generateNodesOBBV2();
        this.myOBBV2Nodes.forEach(node => {
            this.node.addChild(node);
        });


        // this.testOBBV2WithRotation();
    }

    update(deltaTime: number) {
        if (this.autoMoveOnUpdate) {
            // this.onClickMove();
            this.moveOneByOne();
        }
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
                isIntersecting = nodes.some(existingNode => OBBUtils.areNodesIntersecting(node, existingNode));
                if (isIntersecting) {
                    // log(`节点相交，重新生成！：${i + 1}`);
                    this.node.removeChild(node);
                }
            } while (isIntersecting);

            nodes.push(node);
            // log(`节点生成完成！：${i + 1}`);
        }

        // 找出所有的无障碍节点
        const allUnobstructedNodes = OBBUtils.findAllUnobstructedNodes(nodes, arrowDirections, sceneSize);
        const allObscuredNodes = nodes.filter(node => !allUnobstructedNodes.includes(node));
        console.log(`全部死障节点集合 Nodes:`, allObscuredNodes.map(node => node.name));
    }

    // 生成节点集合
    generateNodesOBBV2() {
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

        const nodes: Node[] = [];
        const rows = 7;
        const cols = 7;
        const baseNodeSize = new Size(60, 60);
        const spacing = 10;

        const startX = -((cols - 1) * (baseNodeSize.width + spacing)) / 2;
        const startY = ((rows - 1) * (baseNodeSize.height + spacing)) / 2;

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                let node: Node;
                let uiTransform: UITransform;
                let sprite: Sprite;
                let position: Vec3;
                let isIntersecting: boolean;

                let cnt = 0;
                do {
                    node = new Node(`Rectangle${i * cols + j + 1}`);

                    sprite = node.addComponent(Sprite);
                    sprite.spriteFrame = this.node1.getComponent(Sprite)!.spriteFrame;
                    sprite.color = math.Color.YELLOW;

                    uiTransform = node.getComponent(UITransform);
                    const randomWidth = baseNodeSize.width;// + randomRangeInt(-10, 10);
                    const randomHeight = baseNodeSize.height;// + randomRangeInt(-10, 10);
                    uiTransform.setContentSize(new Size(randomWidth, randomHeight));

                    const labelNode = new Node(`Label${i * cols + j + 1}`);
                    const label = labelNode.addComponent(Label);

                    // 1、当前待生成的节点，若其同一行的前面已经存在任一方向是向右的节点，则当前待生成的节点的方向不能是向左。
                    // 2、当前待生成的节点，若其同一列的上面已经存在任一方向是向下的节点，则当前待生成的节点的方向不能是向上。
                    let arrow: string;
                    let validArrows = arrows.slice();
                    // Check for existing nodes in the same row
                    for (let k = 0; k < j; k++) {
                        const leftNode = nodes[i * cols + k];
                        const leftLabel = leftNode.children[0].getComponent(Label)!;
                        const leftArrow = leftLabel.string.split(' ')[1];
                        if (leftArrow === '→') {
                            validArrows = validArrows.filter(a => a !== '←');
                        }
                    }
                    // Check for existing nodes in the same column
                    for (let l = 0; l < i; l++) {
                        const topNode = nodes[l * cols + j];
                        const topLabel = topNode.children[0].getComponent(Label)!;
                        const topArrow = topLabel.string.split(' ')[1];
                        if (topArrow === '↓') {
                            validArrows = validArrows.filter(a => a !== '↑');
                        }
                    }
                    arrow = validArrows[randomRangeInt(0, validArrows.length)];

                    sprite.color = arrowColors[arrow]; // 颜色根据箭头符号设置
                    label.string = `${i * cols + j + 1} ${arrow}`;
                    label.fontSize = 20;

                    const randomOffsetX = randomRangeInt(-5, 5);
                    const randomOffsetY = randomRangeInt(-5, 5);
                    position = new Vec3(
                        startX + j * (baseNodeSize.width + spacing) + randomOffsetX,
                        startY - i * (baseNodeSize.height + spacing) + randomOffsetY,
                        0
                    );

                    node.setPosition(position);
                    node.addChild(labelNode);
                    isIntersecting = nodes.some(existingNode => OBBUtils.areNodesIntersecting(node, existingNode));
                    cnt++; // 避免死循环
                } while (isIntersecting);

                nodes.push(node);
            }
        }

        // 上边对齐：生成所有节点后，再将首行所有节靠顶边对齐
        const topNodes = nodes.filter((node, index) => index < cols);
        topNodes.forEach((node) => {
            const uiTransform = node.getComponent(UITransform)!;
            const position = node.getPosition();
            const offsetY = startY - (position.y + uiTransform.height / 2);
            node.setPosition(position.add(new Vec3(0, offsetY + 40, 0)));
        });
        // 下边对齐：生成所有节点后，再将末行所有节靠底边对齐
        const bottomNodes = nodes.filter((node, index) => index >= (rows - 1) * cols);
        bottomNodes.forEach((node) => {
            const uiTransform = node.getComponent(UITransform)!;
            const position = node.getPosition();
            const offsetY = startY - (position.y - uiTransform.height / 2) - (rows - 1) * (baseNodeSize.height + spacing);
            node.setPosition(position.add(new Vec3(0, offsetY - 30, 0)));
        });
        // 左边对齐：生成所有节点后，再将最左侧所有节点的左侧边对齐
        const leftNodes = nodes.filter((node, index) => index % cols === 0);
        leftNodes.forEach((node) => {
            const uiTransform = node.getComponent(UITransform)!;
            const position = node.getPosition();
            const offsetX = startX - (position.x - uiTransform.width / 2);
            node.setPosition(position.add(new Vec3(offsetX - 40, 0, 0)));
        });
        // 右边对齐：生成所有节点后，再将最右侧所有节点的右侧边对齐
        const rightNodes = nodes.filter((node, index) => index % cols === cols - 1);
        rightNodes.forEach((node) => {
            const uiTransform = node.getComponent(UITransform)!;
            const position = node.getPosition();
            const offsetX = startX + cols * (baseNodeSize.width + spacing) - (position.x + uiTransform.width / 2);
            node.setPosition(position.add(new Vec3(offsetX - 25, 0, 0)));
        });

        // 更新节点颜色
        nodes.forEach(node => {
            const label = node.children[0].getComponent(Label)!;
            const arrow = label.string.split(' ')[1];
            const sprite = node.getComponent(Sprite)!;
            sprite.color = arrowColors[arrow];
        });

        this.myOBBV2Nodes = nodes;

        // 找出所有的无障碍节点
        const allUnobstructedNodes = OBBUtils.findAllUnobstructedNodes(nodes, arrowDirections, sceneSize);
        this.myOBBV2AllUnobstructedNodes = allUnobstructedNodes;

        // 找出所有的死障节点
        const allObscuredNodes = nodes.filter(node => !allUnobstructedNodes.includes(node));
        console.log(`全部死障节点集合 Nodes:`, allObscuredNodes.map(node => node.name));

        // 若死障节点集合不为空，则递归调用生成节点集合的方法，直到生成的节点集合中没有死障节点（为了避免死循环，设置一个最大迭代次数限制）
        while (
            allObscuredNodes.length > 0 &&
            this.currentIterationToFindNodesWithoutObstructedNodes++ < this.maxIterationsToFindNodesWithoutObstructedNodes
        ) {
            log(`第 ${this.currentIterationToFindNodesWithoutObstructedNodes} 次重新生成节点集合`);
            this.generateNodesOBBV2();
        }
        if (
            allObscuredNodes.length == 0 ||
            this.currentIterationToFindNodesWithoutObstructedNodes >= this.maxIterationsToFindNodesWithoutObstructedNodes
        ) {
            // 将生成的节点渲染到屏幕上
            // this.myOBBV2Nodes.forEach(node => {
            //     this.node.addChild(node);
            // });
        }
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
                isIntersecting = nodes.some(existingNode => OBBUtils.areNodesIntersecting(node, existingNode));
                if (isIntersecting) {
                    this.node.removeChild(node);
                }
            } while (isIntersecting);

            nodes.push(node);
        }

        this.myOBBV2NodesWithRotation = nodes;

        // 找出所有的无障碍节点
        const allUnobstructedNodes = OBBUtils.findAllUnobstructedNodes(nodes, arrowDirections, sceneSize);
        this.myOBBV2AllUnobstructedNodesWithRotation = allUnobstructedNodes;

        // 找出所有的死障节点
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

    switchAutoMoveOnUpdate() {
        this.autoMoveOnUpdate = !this.autoMoveOnUpdate;
        log(`autoMoveOnUpdate: ${this.autoMoveOnUpdate}`);
    }


    moveOneByOne() {
        // 若没有需要移动的剩余节点并且当前没有正在移动的节点，则直接返回，不执行任何移动操作。
        if ((this.myOBBV2AllUnobstructedNodes.length === 0) && this.currentMovingNode === null) {
            return;
        }

        if (this.currentMovingNode === null) {
            if (this.myOBBV2AllUnobstructedNodes.length === 0) {
                return; // 没有需要移动的节点
            }
            const node = this.myOBBV2AllUnobstructedNodes.shift()!;
            this.currentMovingNode = node;
        }

        const label = this.currentMovingNode.children[0].getComponent(Label)!;
        const arrow = label.string.split(' ')[1];
        const direction: Vec3 = this.myOBBV2ArrowDirections[arrow];
        const speed = 100;
        const speedyDirection = direction.clone().multiplyScalar(speed);

        const position = this.currentMovingNode.getPosition();
        this.currentMovingNode.setPosition(position.add(speedyDirection));
        const sceneSize = this.node.getComponent(UITransform)!.contentSize;
        const currentPos = this.currentMovingNode.getPosition();
        if (
            currentPos.x < -sceneSize.width / 2 ||
            currentPos.x > sceneSize.width / 2 ||
            currentPos.y < -sceneSize.height / 2 ||
            currentPos.y > sceneSize.height / 2
        ) {
            // 将移出边界的节点根据其移动方向重新放回到屏幕的侧边，方便调试查看
            if (currentPos.x < -sceneSize.width / 2) {
                this.currentMovingNode.setPosition(new Vec3(-sceneSize.width / 2 + 20, currentPos.y, 0));
            } else if (currentPos.x > sceneSize.width / 2) {
                this.currentMovingNode.setPosition(new Vec3(sceneSize.width / 2 - 20, currentPos.y, 0));
            } else if (currentPos.y < -sceneSize.height / 2) {
                this.currentMovingNode.setPosition(new Vec3(currentPos.x, -sceneSize.height / 2 + 20, 0));
            } else if (currentPos.y > sceneSize.height / 2) {
                this.currentMovingNode.setPosition(new Vec3(currentPos.x, sceneSize.height / 2 - 20, 0));
            }

            this.currentMovingNode = null; // 移出边界后，将当前移动的节点置为null，并继续移动下一个节点
        }
    }
}
