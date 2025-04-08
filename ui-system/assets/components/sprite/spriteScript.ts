import { _decorator, Component, ImageAsset, log, Node, resources, Sprite, SpriteFrame, Texture2D } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('sprite')
export class sprite extends Component {
    start() {
        // resources.load("ai/spriteFrame", SpriteFrame, (err, spriteFrame) => {
        //     this.node.getComponent(Sprite).spriteFrame = spriteFrame;
        // });

        resources.load("ai", ImageAsset, (err, imageAsset) => {
            const tex = new Texture2D();
            tex.image = imageAsset;

            const sf = new SpriteFrame();
            sf.texture = tex;

            const sprite = this.node.getComponent(Sprite);
            sprite.spriteFrame = sf;

            // log(imageAsset);
            // log(imageAsset.nativeUrl)
        });
    }

    update(deltaTime: number) {

    }
}


