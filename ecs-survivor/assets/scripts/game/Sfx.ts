/**
 * SFX = Sound Effects，音效。
 *
 * 游戏里把「短促的听觉反馈」叫 SFX，用来区别于 BGM（Background Music，背景音乐）：
 * 开火、命中、击杀、拾取、升级、受伤、死亡都属于 SFX；循环播放的配乐才是 BGM。
 *
 * 本文件用 Web Audio 合成这些短音效，不依赖外部音频文件。
 * 浏览器要等一次按键/点击才会真正出声（自动播放策略）。
 */
export type SfxKind = 'shoot' | 'hit' | 'kill' | 'pickup' | 'level' | 'hurt' | 'death';

type OscType = OscillatorType;

interface ToneSpec {
    freq: number;
    freqEnd?: number;
    duration: number;
    type?: OscType;
    gain?: number;
    delay?: number;
}

export class Sfx {
    muted = false;

    private audio: AudioContext | null = null;
    private master: GainNode | null = null;
    private readonly lastAt: Record<string, number> = {};

    unlock(): void {
        const ctx = this.ensure();
        if (ctx && ctx.state === 'suspended') {
            void ctx.resume();
        }
    }

    play(kind: SfxKind): void {
        if (this.muted) {
            return;
        }
        const ctx = this.ensure();
        if (!ctx || !this.master) {
            return;
        }
        if (ctx.state === 'suspended') {
            void ctx.resume();
            return;
        }
        const minGap = GAP[kind];
        const now = ctx.currentTime;
        if (now - (this.lastAt[kind] ?? -10) < minGap) {
            return;
        }
        this.lastAt[kind] = now;
        PLAY[kind](this, now);
    }

    tone(when: number, spec: ToneSpec): void {
        const ctx = this.audio;
        const master = this.master;
        if (!ctx || !master) {
            return;
        }
        const start = when + (spec.delay ?? 0);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = spec.type ?? 'square';
        osc.frequency.setValueAtTime(spec.freq, start);
        if (spec.freqEnd && spec.freqEnd > 0) {
            osc.frequency.exponentialRampToValueAtTime(Math.max(40, spec.freqEnd), start + spec.duration);
        }
        const peak = spec.gain ?? 0.12;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(peak, start + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + spec.duration);
        osc.connect(gain);
        gain.connect(master);
        osc.start(start);
        osc.stop(start + spec.duration + 0.02);
    }

    noise(when: number, duration: number, gainValue: number, highpass = 800): void {
        const ctx = this.audio;
        const master = this.master;
        if (!ctx || !master) {
            return;
        }
        const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
        const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / length);
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = highpass;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(gainValue, when);
        gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
        source.connect(filter);
        filter.connect(gain);
        gain.connect(master);
        source.start(when);
        source.stop(when + duration + 0.02);
    }

    private ensure(): AudioContext | null {
        const Ctor = (globalThis as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
            ?? (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) {
            return null;
        }
        if (!this.audio) {
            this.audio = new Ctor();
            this.master = this.audio.createGain();
            this.master.gain.value = 0.28;
            this.master.connect(this.audio.destination);
        }
        return this.audio;
    }
}

const GAP: Record<SfxKind, number> = {
    shoot: 0.05,
    hit: 0.04,
    kill: 0.06,
    pickup: 0.05,
    level: 0.2,
    hurt: 0.12,
    death: 0.4,
};

const PLAY: Record<SfxKind, (sfx: Sfx, when: number) => void> = {
    shoot(sfx, when) {
        const jitter = 1 + (Math.random() - 0.5) * 0.12;
        sfx.tone(when, { freq: 920 * jitter, freqEnd: 420, duration: 0.055, type: 'square', gain: 0.07 });
        sfx.noise(when, 0.03, 0.04, 1200);
    },
    hit(sfx, when) {
        const jitter = 1 + (Math.random() - 0.5) * 0.2;
        sfx.tone(when, { freq: 640 * jitter, freqEnd: 280, duration: 0.035, type: 'triangle', gain: 0.05 });
        sfx.noise(when, 0.028, 0.035, 900);
    },
    kill(sfx, when) {
        const jitter = 1 + (Math.random() - 0.5) * 0.15;
        sfx.tone(when, { freq: 360 * jitter, freqEnd: 120, duration: 0.09, type: 'square', gain: 0.09 });
        sfx.noise(when, 0.06, 0.05, 400);
    },
    pickup(sfx, when) {
        sfx.tone(when, { freq: 880, duration: 0.05, type: 'triangle', gain: 0.07 });
        sfx.tone(when, { freq: 1320, duration: 0.07, type: 'triangle', gain: 0.06, delay: 0.04 });
    },
    level(sfx, when) {
        sfx.tone(when, { freq: 523, duration: 0.1, type: 'square', gain: 0.08 });
        sfx.tone(when, { freq: 659, duration: 0.1, type: 'square', gain: 0.08, delay: 0.09 });
        sfx.tone(when, { freq: 784, duration: 0.16, type: 'square', gain: 0.09, delay: 0.18 });
        sfx.tone(when, { freq: 1046, duration: 0.18, type: 'triangle', gain: 0.07, delay: 0.28 });
    },
    hurt(sfx, when) {
        sfx.tone(when, { freq: 180, freqEnd: 70, duration: 0.16, type: 'sawtooth', gain: 0.11 });
        sfx.noise(when, 0.12, 0.07, 200);
    },
    death(sfx, when) {
        sfx.tone(when, { freq: 220, freqEnd: 55, duration: 0.55, type: 'sawtooth', gain: 0.12 });
        sfx.tone(when, { freq: 110, freqEnd: 40, duration: 0.7, type: 'square', gain: 0.08, delay: 0.08 });
        sfx.noise(when, 0.35, 0.08, 150);
    },
};
