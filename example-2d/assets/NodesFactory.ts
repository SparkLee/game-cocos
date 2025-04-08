import { Label, log, Size, UITransform, Vec3, Node, instantiate, Sprite, math, randomRangeInt } from "cc";
import { NodesManager } from "./NodesManager";
import { NodeDirection, NodeScript } from "./NodeScript";
import { OBBUtils } from "./OBBUtils";
import { Entity, generateCompactArrangedGridEntities, GRID_HEIGHT, GRID_WIDTH } from "./Grid/Grid";

/**
 * 生成节点集合的工厂类
 */
export class NodesFactory {
    /**
     * 生成节点集合
     */
    generate(templateNode: Node, movementAreaSize: Size, rows: number, cols: number): NodesManager {
        const nodes: Node[] = [];

        // 节点间距（1、旋转角度时一定要增加此值，2、若出现死障节点，可尝试增大此值），经测试：
        // 1、不旋转时，spacing最小可以为0，节点大小可以任意，长宽比任意。
        // 2、旋转45度，节点大小33*33时，spacing最小要为14，否则就会出现死障节点。
        // 3、旋转45度，节点大小60*60时，spacing最小要为25，否则就会出现死障节点。
        const spacing = 10;
        const baseNodeSize = new Size(60, 60);    // 节点大小尺寸
        const counterClockwiseRotationDegree = 0; // 节点逆时针旋转角度

        const startX = -((cols - 1) * (baseNodeSize.width + spacing)) / 2;
        const startY = ((rows - 1) * (baseNodeSize.height + spacing)) / 2;

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                let isIntersecting: boolean;
                let node: Node = instantiate(templateNode);
                node.active = true;

                const no = i * cols + j + 1;
                node.name = `Node${no}`;

                let cnt = 0;
                do {
                    cnt++;
                    if (cnt > 1000) { // 避免死循环
                        log(`generate [${cnt}] 中断死循环`);
                        break;
                    }

                    // 随机生成节点方向
                    const randomDirection = NodeScript.randomDirection;

                    // 设置节点方向
                    this.setNodeDirection(node, randomDirection, counterClockwiseRotationDegree);

                    // 设置节点尺寸
                    // 1.
                    // const nodeSize = new Size( // 可任意缩小节点尺寸，但不可放大，否则会出现死障节点
                    //     (baseNodeSize.width + randomRangeInt(-baseNodeSize.width / 2, 0)),
                    //     (baseNodeSize.height + randomRangeInt(-baseNodeSize.height / 2, 0))
                    // );
                    // 2.
                    // const nodeSize = new Size(
                    //     [baseNodeSize.width, baseNodeSize.width / 2][randomRangeInt(0, 2)], 
                    //     [baseNodeSize.height, baseNodeSize.height / 2][randomRangeInt(0, 2)]
                    // );
                    // 3.
                    // const nodeSize = new Size(
                    //     (baseNodeSize.width + randomRangeInt(-baseNodeSize.width / 2, baseNodeSize.width)),
                    //     (baseNodeSize.height + randomRangeInt(-baseNodeSize.height / 2, baseNodeSize.height))
                    // );
                    // 4.
                    // const nodeSize = new Size(
                    //     [baseNodeSize.width, baseNodeSize.width / 2, baseNodeSize.width * 1.5, baseNodeSize.width * 2][randomRangeInt(0, 3)],
                    //     [baseNodeSize.height, baseNodeSize.height / 2, baseNodeSize.height * 1.5, baseNodeSize.height * 2][randomRangeInt(0, 3)]
                    // );
                    // 5.
                    const nodeSize = [new Size(30, 30), new Size(30, 60), new Size(60, 60), new Size(60, 20)][randomRangeInt(0, 4)];
                    //
                    this.setNodeSize(node, nodeSize);

                    // 设置节点位置
                    this.setNodePosition(node, baseNodeSize, counterClockwiseRotationDegree, spacing, startX, startY, i, j);

                    isIntersecting = nodes.some(existingNode => OBBUtils.areNodesIntersecting(node, existingNode));
                } while (isIntersecting);

                nodes.push(node);
            }
        }

        // 边缘节点对齐摆放
        // this.alignEdgeNodes(nodes, baseNodeSize, cols, rows, spacing, startX, startY);

        const nodesManager = new NodesManager(nodes, movementAreaSize);

        const allUnobstructedNodes = nodesManager.fixObstructedNodesDirection();
        log(`nodes Nodes:`, nodes.map(node => node.name));
        log(`全部无障碍节点集合 Nodes:`, allUnobstructedNodes.map(node => node.name));

        const allObscuredNodes = nodes.filter(node => !allUnobstructedNodes.includes(node));
        log(`全部死障节点集合 Nodes:`, allObscuredNodes.map(node => node.name));

        return nodesManager;
    }

    private setNodeDirection(node: Node, nodeDirection: number, counterClockwiseRotationDegree: number) {
        // 设置节点方向
        const nodeScript = node.addComponent(NodeScript);
        nodeScript.direction = nodeDirection;

        // 设置节点逆时针旋转角度
        nodeScript.counterClockwiseRotationDegree = counterClockwiseRotationDegree;

        // 设置节点方向颜色
        const nodeSprite = node.getComponent(Sprite);
        math.Color.fromHEX(nodeSprite.color, nodeScript.directionColor);
    }

    private setNodeSize(node: Node, nodeSize: Size) {
        // 设置节点尺寸
        (node.getComponent(UITransform)).setContentSize(nodeSize);

        // 设置节点文本尺寸
        const label = node.children[0].getComponent(Label);
        label.fontSize = 20;
        label.getComponent(UITransform).setContentSize(nodeSize);
    }

    private setNodePosition(node: Node, baseNodeSize: Size, counterClockwiseRotationDegree: number, spacing: number, startX: number, startY: number, i: number, j: number) {
        const randomOffsetX = 0; //randomRangeInt(-5, 5);
        const randomOffsetY = 0; //randomRangeInt(-5, 5);

        const position = new Vec3(
            startX + j * (baseNodeSize.width + spacing) + randomOffsetX,
            startY - i * (baseNodeSize.height + spacing) + randomOffsetY,
            0
        );
        node.setPosition(position);
    }

    generateV2(templateNode: Node, movementAreaSize: Size, rows: number, cols: number): NodesManager {
        const nodes: Node[] = [];

        // 节点间距（1、旋转角度时一定要增加此值，2、若出现死障节点，可尝试增大此值），经测试：
        // 1、不旋转时，spacing最小可以为0，节点大小可以任意，长宽比任意。
        // 2、旋转45度，节点大小33*33时，spacing最小要为14，否则就会出现死障节点。
        // 3、旋转45度，节点大小60*60时，spacing最小要为25，否则就会出现死障节点。
        const spacing = 0;
        const baseNodeSize = new Size(145, 145);     // 节点大小尺寸
        const counterClockwiseRotationDegree = 45; // 节点逆时针旋转角度

        const startX = -((cols - 1) * (baseNodeSize.width + spacing)) / 2;
        const startY = ((rows - 1) * (baseNodeSize.height + spacing)) / 2;

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                let isIntersecting: boolean;
                let node: Node = instantiate(templateNode);
                node.active = true;

                const no = i * cols + j + 1;
                node.name = `Node${no}`;

                let cnt = 0;
                do {
                    cnt++;
                    if (cnt > 1000) { // 避免死循环
                        log(`generateV2 [${cnt}] 中断死循环`);
                        break;
                    }

                    // 随机生成节点尺寸和方向
                    const nodeSizeDirectionMap = new Map<Size, () => NodeDirection>([
                        [new Size(60, 75), () => NodeScript.randomDirectionUpDown],    // 小船上下方向
                        [new Size(70, 65), () => NodeScript.randomDirectionLeftRight], // 小船左右方向
                        [new Size(75, 130), () => NodeScript.randomDirectionUpDown],   // 中船上下方向
                        [new Size(95, 75), () => NodeScript.randomDirectionLeftRight], // 中船左右方向
                        [new Size(75, 145), () => NodeScript.randomDirectionUpDown],   // 大船上下方向
                        [new Size(120, 75), () => NodeScript.randomDirectionLeftRight],// 大船左右方向
                    ]);
                    const randomSize = Array.from(nodeSizeDirectionMap.keys())[randomRangeInt(0, nodeSizeDirectionMap.size)];
                    const randomDirection = nodeSizeDirectionMap.get(randomSize)!();

                    // 设置节点方向
                    this.setNodeDirection(node, randomDirection, counterClockwiseRotationDegree);

                    // 设置节点尺寸
                    this.setNodeSize(node, randomSize);

                    // 设置节点位置
                    this.setNodePosition(node, baseNodeSize, counterClockwiseRotationDegree, spacing, startX, startY, i, j);

                    isIntersecting = nodes.some(existingNode => OBBUtils.areNodesIntersecting(node, existingNode));
                } while (isIntersecting);

                nodes.push(node);
            }
        }

        // 边缘节点对齐摆放
        // this.alignEdgeNodes(nodes, baseNodeSize, cols, rows, spacing, startX, startY);

        const nodesManager = new NodesManager(nodes, movementAreaSize);

        const allUnobstructedNodes = nodesManager.fixObstructedNodesDirection();
        log(`nodes Nodes:`, nodes.map(node => node.name));
        log(`全部无障碍节点集合 Nodes:`, allUnobstructedNodes.map(node => node.name));

        const allObscuredNodes = nodes.filter(node => !allUnobstructedNodes.includes(node));
        log(`全部死障节点集合 Nodes:`, allObscuredNodes.map(node => node.name));

        return nodesManager;
    }

    generateV3(templateNode: Node, movementAreaSize: Size, rows: number, cols: number): NodesManager {
        const nodes: Node[] = [];
        const counterClockwiseRotationDegree = 0; // 节点逆时针旋转角度
        const cellSize = 40; // 每个格子的像素大小
        const entityGap = 5; // 实体之间的间距像素

        const entities = generateCompactArrangedGridEntities();
        for (let i = 0; i < entities.length; i++) {
            let node: Node = instantiate(templateNode);
            node.active = true;

            let isIntersecting: boolean;
            let cnt = 0;
            do {
                cnt++;
                if (cnt > 5000) { // 避免死循环
                    log(`generateV3 [${cnt}] 中断死循环`);
                    break;
                }
                const entity = entities[i];


                // 随机生成节点尺寸和方向
                const axisDirectionMap = new Map<string, () => NodeDirection>([
                    ['x', () => NodeScript.randomDirectionLeftRight], // 左右方向
                    ['y', () => NodeScript.randomDirectionUpDown],    // 上下方向
                    ['xy', () => NodeScript.randomDirection],         // 上下左右方向
                ]);
                const randomDirection = axisDirectionMap.get(entity.axisDirection)!();

                // 设置节点方向
                this.setNodeDirection(node, randomDirection, counterClockwiseRotationDegree);

                // 设置节点尺寸
                this.setNodeSize(node, new Size(entity.width * cellSize - entityGap, entity.height * cellSize - entityGap));

                // 设置节点位置
                this.setNodePositionByEntity(node, entity, cellSize, GRID_WIDTH, GRID_HEIGHT);

                isIntersecting = nodes.some(existingNode => OBBUtils.areNodesIntersecting(node, existingNode));
            } while (isIntersecting);

            nodes.push(node);
        }

        const nodesManager = new NodesManager(nodes, movementAreaSize);

        const allUnobstructedNodes = nodesManager.fixObstructedNodesDirection();
        log(`nodes Nodes:`, nodes.map(node => node.name));
        log(`全部无障碍节点集合 Nodes:`, allUnobstructedNodes.map(node => node.name));

        const allObscuredNodes = nodes.filter(node => !allUnobstructedNodes.includes(node));
        log(`全部死障节点集合 Nodes:`, allObscuredNodes.map(node => node.name));

        return nodesManager;
    }

    /**
     * 综合考虑entity的x,y,width,height属性，设置每个entity的座标，最终使得所有entity组成的矩形显示在屏幕中间。
     */
    private setNodePositionByEntity(node: Node, entity: Entity, cellSize: number, gridWidth: number, gridHeight: number) {
        const x = (entity.x * cellSize)     // entity的x属性是相对于Grid的，所以要乘以GRID_SIZE
            + (entity.width * cellSize / 2) // 节点宽度的一半
            - gridWidth * cellSize / 2;     // 节点集合矩形宽度的一半（矩形显示在屏幕中间，不用管屏幕尺寸，我只管节点集合矩形在屏幕中间即可，此处不管它是否溢出屏幕）

        const y = (entity.y * cellSize)
            + (entity.height * cellSize / 2)
            - gridHeight * cellSize / 2;

        node.setPosition(x, y, 0);
    }

    private alignEdgeNodes(nodes: Node[], baseNodeSize: Size, cols: number, rows: number, spacing: number, startX: number, startY: number) {
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
    }
}