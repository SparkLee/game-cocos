import { _decorator, Component, Node, resources, Sprite, SpriteFrame } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('sprite')
export class sprite extends Component {
    start() {
        resources.load("ai/spriteFrame", SpriteFrame, (err, spriteFrame) => {
            this.node.getComponent(Sprite).spriteFrame = spriteFrame;
        });
    }

    update(deltaTime: number) {

    }
}


