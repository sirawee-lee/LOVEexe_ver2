// ThreadNeedleGame.js
// เกม "สอดด้ายเข้าเข็ม" สำหรับ Cocos Creator 2.x
// มือเลื่อนขึ้น-ลงเอง ผู้เล่นกด spacebar ตอนด้ายตรงตาเข็ม
// สำเร็จ -> มือเลื่อนซ้ายสอดด้ายเข้าตาเข็มจริง + มือ/เข็มเลื่อนซ้ายดึงด้ายผ่าน + ป้าย "Got it!" สีเขียว
// พลาด   -> ป้าย "Missed :(" สีแดง
// มี 3 เวล ยิ่งเวลสูง ยิ่งเร็ว + ช่องที่ยอมรับแคบลง

const GameFlow = require('GameFlow');

cc.Class({
    extends: cc.Component,

    properties: {
        // ===== ลากโหนดมาใส่ใน Inspector =====
        hand: {
            default: null,
            type: cc.Node,
            tooltip: 'มือ/ปลายด้ายที่เลื่อนขึ้นลง (วางที่ตำแหน่งพักด้านขวา)',
        },
        needle: {
            default: null,
            type: cc.Node,
            tooltip: 'เข็ม (จะถูกดึงเลื่อนซ้ายตอนสำเร็จ)',
        },
        resultLabel: {
            default: null,
            type: cc.Label,
            tooltip: 'ป้ายแสดงผล Got it! / Missed :(',
        },
        levelLabel: {
            default: null,
            type: cc.Label,
            tooltip: 'ป้ายแสดงเวลปัจจุบัน',
        },

        // ===== ค่าที่วัดมาจากฉาก (ปรับได้) =====
        eyeTopY: {
            default: -8.067,
            tooltip: 'ค่า Y ของมือ ขอบบนสุดที่ด้ายยังลอดตาเข็มได้',
        },
        eyeBottomY: {
            default: -34.958,
            tooltip: 'ค่า Y ของมือ ขอบล่างสุดที่ด้ายยังลอดตาเข็มได้',
        },
        threadedX: {
            default: -18.824,
            tooltip: 'ค่า X ของมือ ตอนสอดด้ายเข้าตาเข็มพอดี (จากรูปสอง)',
        },

        // ===== ปรับสมดุลเกมได้ =====
        moveRange: {
            default: 180,
            tooltip: 'ระยะขึ้น-ลงจากจุดกึ่งกลาง (px)',
        },
        eyeTopExpand: {
            default: 0.10,
            tooltip: 'ขยายขอบ "บน" ของรูตาเข็มให้ผ่านง่ายขึ้น (0.10 = +10% ของช่องเดิม)',
        },
        timeLimit: {
            default: 10,
            tooltip: 'เวลารวมทั้ง 3 เลเวล (วินาที) นับเฉพาะตอนมือกำลังขยับ — หมดเวลา = แพ้ (พลาดกี่ครั้งก็ได้)',
        },

        // ===== เพลงประจำเกม (ลากไฟล์เสียงมาวางใน Inspector) =====
        bgm: {
            default: null,
            type: cc.AudioClip,
            tooltip: 'เพลงพื้นหลังของเกมนี้ (เล่นวนลูป)',
        },
        bgmVolume: {
            default: 0.6,
            tooltip: 'ความดังเพลง 0..1',
        },

        // ===== Sound effects (ลากไฟล์เสียงมาวาง) =====
        successSfx: { default: null, type: cc.AudioClip, tooltip: 'เสียงตอนสอดด้ายเข้าสำเร็จ (Got it!)' },
        failSfx:    { default: null, type: cc.AudioClip, tooltip: 'เสียงตอนพลาด (Missed)' },
        winSfx:     { default: null, type: cc.AudioClip, tooltip: 'เสียงตอนชนะครบทุกเลเวล' },
    },

    onLoad() {
        this.maxLevel = 3;
        this.level = 1;
        this.direction = 1;            // 1 = ขึ้น, -1 = ลง
        this.isPlaying = true;

        this.finished = false;         // จบเกมแล้ว (ชนะ/แพ้) -> หยุดทุกอย่าง
        this.timeLeft = this.timeLimit;

        // กึ่งกลางของช่องตาเข็ม (จากค่าที่วัดมา)
        this.eyeCenter = (this.eyeTopY + this.eyeBottomY) / 2;   // ~ -21.5
        this.eyeHalf = Math.abs(this.eyeTopY - this.eyeBottomY) / 2; // ~ 13.45

        // จำตำแหน่งเริ่มต้น ไว้รีเซ็ตทุกเวล
        this.centerY = this.hand.y;
        this.handStartX = this.hand.x;
        this.needleStartX = this.needle ? this.needle.x : 0;

        this.applyLevel(this.level);

        GameFlow.onEnterGame('needle', this.node);
        this._playBgm();

        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
    },

    // เล่นเพลงประจำเกม (ถ้าลากไฟล์มาใส่ช่อง bgm แล้ว)
    _playBgm() {
        if (!this.bgm) return;
        cc.audioEngine.stopMusic();
        cc.audioEngine.playMusic(this.bgm, true);
        cc.audioEngine.setMusicVolume(this.bgmVolume);
    },

    // เล่น sound effect ครั้งเดียว (ถ้ามีไฟล์ในช่องนั้น)
    _sfx(clip) {
        if (clip) cc.audioEngine.playEffect(clip, false);
    },

    onDestroy() {
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
    },

    // ตั้งค่าความยากตามเวล
    applyLevel(level) {
        this.moveSpeed = 220 + (level - 1) * 150;   // 220 / 370 / 520

        // ช่องตาเข็มเท่าเลเวล 1 เสมอ (= รูตาเข็มจริงที่วัดมา) ทุกเลเวล
        // ความยากมาจากความเร็วมืออย่างเดียว
        this.tolerance = this.eyeHalf;

        this.updateHud();
    },

    updateHud() {
        if (!this.levelLabel) return;
        const t = Math.max(0, Math.ceil(this.timeLeft));
        this.levelLabel.string = 'Level ' + this.level + ' / ' + this.maxLevel + '   ⏱ ' + t + 's';
    },

    update(dt) {
        if (this.finished) return;
        if (!this.isPlaying) return;   // ระหว่างอนิเมชันสำเร็จ/พลาด นาฬิกาพัก

        // นับเวลาถอยหลัง (รวมทั้ง 3 เลเวล)
        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            this.updateHud();
            this.failGame('Time up! 💔');
            return;
        }
        this.updateHud();

        this.hand.y += this.moveSpeed * this.direction * dt;

        const top = this.centerY + this.moveRange;
        const bottom = this.centerY - this.moveRange;
        if (this.hand.y >= top) {
            this.hand.y = top;
            this.direction = -1;
        } else if (this.hand.y <= bottom) {
            this.hand.y = bottom;
            this.direction = 1;
        }
    },

    onKeyDown(event) {
        if (!this.isPlaying) return;
        if (event.keyCode === cc.macro.KEY.space) {
            this.checkThread();
        }
    },

    checkThread() {
        // เทียบ Y ปัจจุบันของมือ กับกลางช่องตาเข็ม (asymmetric: ขอบบนกว้างกว่า)
        const d = this.hand.y - this.eyeCenter;        // + = ไปทางขอบบน
        const upper = this.tolerance * (1 + this.eyeTopExpand);  // ขอบบน +10%
        const lower = this.tolerance;                  // ขอบล่างเท่าเดิม
        const pass = (d >= 0) ? (d <= upper) : (-d <= lower);
        if (pass) {
            this.onSuccess();
        } else {
            this.onFail();
        }
    },

    onSuccess() {
        this.isPlaying = false;     // หยุดเลื่อนขึ้นลง + กันกดซ้ำระหว่างอนิเมชัน
        this._sfx(this.successSfx);

        if (this.resultLabel) {
            this.resultLabel.string = 'Got it!';
            this.resultLabel.node.color = cc.Color.GREEN;
        }

        // อนิเมชัน: มือเลื่อนซ้ายจนด้ายลอดตาเข็มพอดี (Y คงที่ = ด้ายยังตรงตาเข็ม)
        // *** เข็มอยู่เฉยๆ ไม่ขยับ ***
        cc.tween(this.hand)
            .to(0.4, { x: this.threadedX }, { easing: 'cubicOut' })
            .delay(0.5)            // ค้างไว้ให้เห็นว่าสอดเข้าแล้ว
            .call(() => this.afterSuccess())
            .start();
    },

    afterSuccess() {
        if (this.level >= this.maxLevel) {
            this.finished = true;       // หยุดนาฬิกา
            if (this.resultLabel) this.resultLabel.string = 'You win! 🏆';
            this._sfx(this.winSfx);
            this.scheduleOnce(() => GameFlow.win(), 1.0);   // -> next game
            return; // จบเกม
        }

        // รีเซ็ตตำแหน่งกลับ แล้วไปเวลถัดไป
        this.hand.x = this.handStartX;
        this.hand.y = this.centerY;
        if (this.needle) this.needle.x = this.needleStartX;

        this.level++;
        this.applyLevel(this.level);

        if (this.resultLabel) {
            this.resultLabel.string = '';
            this.resultLabel.node.color = cc.Color.WHITE;
        }
        this.direction = 1;
        this.isPlaying = true;
    },

    onFail() {
        this.isPlaying = false;     // หยุดเลื่อนขึ้นลง + กันกดซ้ำระหว่างอนิเมชัน
        this._sfx(this.failSfx);

        // ป้าย "Missed :(" สีแดง (พลาดกี่ครั้งก็ได้ ไม่หักใจ ตราบใดที่ยังไม่หมดเวลา)
        if (this.resultLabel) {
            this.resultLabel.string = 'Missed :(';
            this.resultLabel.node.color = cc.Color.RED;
        }

        // มือเลื่อนเข้าหาเข็มเหมือนตอนสำเร็จ แต่ Y ผิด -> ด้ายจะเฉียดตาเข็มไป (เห็นชัดว่าพลาด)
        // แล้วกลับมาเล่นเลเวลเดิมต่อทันที (นาฬิกายังเดินรวม 10 วิ)
        cc.tween(this.hand)
            .to(0.4, { x: this.threadedX }, { easing: 'cubicOut' })
            .delay(0.5)            // ค้างให้เห็นว่าด้ายไม่เข้ารู
            .call(() => this.retryLevel())
            .start();
    },

    // เล่นเกมเข็มไม่สำเร็จ (หมดเวลา 10 วิ) -> หัก 1 หัวใจ
    failGame(reason) {
        if (this.finished) return;
        this.finished = true;
        this.isPlaying = false;
        cc.Tween.stopAllByTarget(this.hand);
        this._sfx(this.failSfx);
        if (this.resultLabel) {
            this.resultLabel.string = reason || 'Failed! 💔';
            this.resultLabel.node.color = cc.Color.RED;
        }
        this.scheduleOnce(() => GameFlow.lose(), 1.0);  // -> Try Again (หัก 😍)
    },

    // รีเซ็ตตำแหน่งกลับ เล่นเลเวลเดิมต่อ (ใช้ตอนพลาด)
    retryLevel() {
        this.hand.x = this.handStartX;
        this.hand.y = this.centerY;
        if (this.resultLabel) {
            this.resultLabel.string = '';
            this.resultLabel.node.color = cc.Color.WHITE;
        }
        this.direction = 1;
        this.isPlaying = true;
    },
});
