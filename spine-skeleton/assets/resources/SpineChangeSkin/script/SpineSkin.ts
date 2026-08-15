import { _decorator, Component, sp } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('SpineSkin')
export class SpineSkin extends Component {

    @property({ type:sp.Skeleton })
    spine: sp.Skeleton | null = null;

    skinId: number = 0;
    animationId: number = 0;

    start () {
        // Your initialization goes here.
    }

    changeSkin() {
        const skins =['girl', 'boy', 'girl-blue-cape', 'girl-spring-dress'].map(x=> `full-skins/${x}`);
        this.skinId = (this.skinId + 1) % skins.length;
        this.spine!.setSkin(skins[this.skinId]);
    }

    changeAnimation() {
        const animations = ['aware', 'blink', 'dance', 'dress-up', 'idle', 'walk'];
        this.animationId = (this.animationId + 1) % animations.length;
        this.spine!.setAnimation(0, animations[this.animationId], true);
    }

    // update (deltaTime: number) {
    //     // Your update function goes here.
    // }
}
