// ThreadNeedleGame.js
// เกม "สอดด้ายเข้าเข็ม" สำหรับ Cocos Creator 2.x
// มือเลื่อนขึ้น-ลงเอง ผู้เล่นกด spacebar ตอนด้ายตรงตาเข็ม
// สำเร็จ -> มือเลื่อนซ้ายสอดด้ายเข้าตาเข็มจริง + มือ/เข็มเลื่อนซ้ายดึงด้ายผ่าน + ป้าย "Got it!" สีเขียว
// พลาด   -> ป้าย "Missed :(" สีแดง
// มี 3 เวล ยิ่งเวลสูง ยิ่งเร็ว + ช่องที่ยอมรับแคบลง

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
    },

    onLoad() {
        this.maxLevel = 3;
        this.level = 1;
        this.direction = 1;            // 1 = ขึ้น, -1 = ลง
        this.isPlaying = true;

        // กึ่งกลางของช่องตาเข็ม (จากค่าที่วัดมา)
        this.eyeCenter = (this.eyeTopY + this.eyeBottomY) / 2;   // ~ -21.5
        this.eyeHalf = Math.abs(this.eyeTopY - this.eyeBottomY) / 2; // ~ 13.45

        // จำตำแหน่งเริ่มต้น ไว้รีเซ็ตทุกเวล
        this.centerY = this.hand.y;
        this.handStartX = this.hand.x;
        this.needleStartX = this.needle ? this.needle.x : 0;

        this.applyLevel(this.level);

        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
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

        if (this.levelLabel) this.levelLabel.string = 'Level ' + level + ' / ' + this.maxLevel;
    },

    update(dt) {
        if (!this.isPlaying) return;

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
        // เทียบ Y ปัจจุบันของมือ กับกลางช่องตาเข็ม
        const diff = Math.abs(this.hand.y - this.eyeCenter);
        if (diff <= this.tolerance) {
            this.onSuccess();
        } else {
            this.onFail();
        }
    },

    onSuccess() {
        this.isPlaying = false;     // หยุดเลื่อนขึ้นลง + กันกดซ้ำระหว่างอนิเมชัน

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
            if (this.resultLabel) this.resultLabel.string = 'You win! 🏆';
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

        // ป้าย "Missed :(" สีแดง
        if (this.resultLabel) {
            this.resultLabel.string = 'Missed :(';
            this.resultLabel.node.color = cc.Color.RED;
        }

        // มือเลื่อนเข้าหาเข็มเหมือนตอนสำเร็จ แต่ Y ผิด -> ด้ายจะเฉียดตาเข็มไป (เห็นชัดว่าพลาด)
        cc.tween(this.hand)
            .to(0.4, { x: this.threadedX }, { easing: 'cubicOut' })
            .delay(0.5)            // ค้างให้เห็นว่าด้ายไม่เข้ารู
            .call(() => this.retryLevel())
            .start();
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
