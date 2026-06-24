import { Component, director, game, Game, log, _decorator } from "cc";
const { ccclass, property } = _decorator;

export class Timer {
    public callArea: any;
    //总时间和当前持续时间
    private curtime = 0;
    private totalTime = 0;
    public isLoop = false;
    //激活
    public isActive;
    //是否暂停
    public isPause;

    public onEnd: Function;

    constructor(totalTime: number, callArea: any, onEnd: Function, isLoop = false) {
        this.curtime = 0;
        this.totalTime = totalTime;
        this.isLoop = isLoop;
        this.onEnd = onEnd;
        this.callArea = callArea;
        this.isActive = true;
        this.isPause = false;
        TimerManager.instance.AddTimer(this);
    }

    public Run() {
        if (this.isPause || !this.isActive) {
            return;
        }
        this.curtime += game.deltaTime;

        if (this.curtime > this.totalTime) {
            this.curtime -= this.totalTime;
            if (this.onEnd != null) {
                this.onEnd.apply(this.callArea);
            }
            if (!this.isLoop) {
                this.isActive = false;
            }
        }
    }

    public GetRemainTime() {
        return this.totalTime - this.curtime;
    }
}


@ccclass('TimerManager')
export default class TimerManager extends Component {
    public static instance = new TimerManager();
    private timerList: Array<Timer>;

    public start() {
        TimerManager.instance = this;
        this.timerList = new Array<Timer>;
    }

    public AddTimer(t: Timer) {
        this.timerList.push(t);
    }

    public Clear(callArea: any,func:Function) {
        for (let i = 0; i < this.timerList.length; i++) {
            var timer = this.timerList[i];
            if (timer.callArea == callArea && timer.onEnd == func) {
                timer.isActive = false;
            }
        }
    }

    public ClearAll(callArea: any) {
        for (let i = 0; i < this.timerList.length; i++) {
            var timer = this.timerList[i];
            if (timer.callArea == callArea) {
                timer.isActive = false;
            }
        }
    }

    public update(deltaTime: number) {
        for (let i = 0; i < this.timerList.length;i++) {
            let timer = this.timerList[i];
            try{
                timer.Run();
            }catch(e){
                log(e);
            }finally{
                //计时结束
                if (!timer.isActive) {
                    if(this.timerList.indexOf(timer) >= 0){
                        this.timerList.splice(this.timerList.indexOf(timer), 1);
                        i--;
                    }
                }
            }
        }
    }
}