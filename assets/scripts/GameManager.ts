// GameManager.ts
// Type Blast: Fast Typing Game (Cocos Creator 2.4.8)
// ธีม: พิมพ์คำ syntax ของ python / html / css / js เพื่อยิงทำลายศัตรูที่ลอยเข้ามา
//
// ทุกอย่าง (พื้นหลัง, ผู้เล่น, ศัตรู, HUD) ถูกสร้างด้วยโค้ดทั้งหมด
// จึงแค่แปะ component นี้ไว้ที่ Node Canvas ก็เล่นได้เลย

import { WORD_BANK, LANG_COLOR, LANGS } from "./WordBank";

const { ccclass, property } = cc._decorator;

interface Enemy {
    root: cc.Node;       // container
    plate: cc.Node;      // ป้ายพื้นหลังข้อความ (graphics)
    text: cc.RichText;   // ข้อความคำ
    word: string;
    lang: string;
    color: cc.Color;
    speed: number;       // px/sec ตกลงล่าง
    typed: number;       // จำนวนตัวอักษรที่พิมพ์ถูกแล้ว
    alive: boolean;
    width: number;       // ความกว้างป้าย (ไว้คำนวณ)
}

@ccclass
export default class GameManager extends cc.Component {

    // ---- พารามิเตอร์เกม ----
    private DESIGN_W = 720;
    private DESIGN_H = 1280;
    private get HALF_W() { return this.DESIGN_W / 2; }
    private get HALF_H() { return this.DESIGN_H / 2; }

    private playerY = -480;        // ตำแหน่ง y ของยานผู้เล่น
    private dangerY = -440;        // เส้นที่ศัตรูถือว่าชนผู้เล่น

    // ---- node หลัก ----
    private bgNode: cc.Node = null;
    private dangerNode: cc.Node = null;
    private playerNode: cc.Node = null;
    private enemyLayer: cc.Node = null;
    private fxLayer: cc.Node = null;
    private uiLayer: cc.Node = null;

    // ====== ช่องสำหรับลาก Node มาผูกใน Inspector ======
    // เว้นว่างไว้ได้ทั้งหมด -> เกมจะ "สร้างเอง" ด้วยโค้ดเหมือนเดิม
    // ถ้าลาก Node จาก editor มาวาง -> เกมจะใช้ Node นั้นแทน (ดูเป็น Cocos จริง ๆ)

    // ---- HUD (ลาก Label จาก scene มาวาง) ----
    @property({ type: cc.Label, tooltip: "Label แสดงคะแนน (เว้นว่าง = สร้างด้วยโค้ด)" })
    scoreLabel: cc.Label = null;

    @property({ type: cc.Label, tooltip: "Label แสดงหัวใจ/ชีวิต" })
    livesLabel: cc.Label = null;

    @property({ type: cc.RichText, tooltip: "RichText แสดงคำที่กำลังพิมพ์ (ล่างจอ)" })
    inputLabel: cc.RichText = null;

    @property({ type: cc.Label, tooltip: "Label แสดงคอมโบ" })
    comboLabel: cc.Label = null;

    @property({ type: cc.Label, tooltip: "Label แสดง WPM" })
    wpmLabel: cc.Label = null;

    @property({ type: cc.Label, tooltip: "Label แสดงด่านปัจจุบัน" })
    levelLabel: cc.Label = null;

    @property({ type: cc.Label, tooltip: "Label แสดงความคืบหน้าด่าน เช่น 3 / 8" })
    progressInfo: cc.Label = null;

    // ---- รูปภาพ (ลาก Sprite จาก scene มาวาง) ----
    @property({ type: cc.Sprite, tooltip: "รูปพื้นหลัง (เว้นว่าง = วาดกริดด้วยโค้ด)" })
    bgSprite: cc.Sprite = null;

    @property({ type: cc.Sprite, tooltip: "รูปยานผู้เล่น (เว้นว่าง = วาดสามเหลี่ยมด้วยโค้ด)" })
    playerSprite: cc.Sprite = null;

    // ---- ปุ่ม (ลาก Node ของปุ่ม Start/Restart มาวาง) ----
    @property({ type: cc.Node, tooltip: "ปุ่ม Start/Restart (จะโชว์เฉพาะหน้าเริ่ม/เกมจบ)" })
    startButton: cc.Node = null;

    private progressBar: cc.Node = null;      // แถบความคืบหน้าด่าน (graphics)
    private centerLabel: cc.Label = null;     // ข้อความกลางจอ (เริ่ม / game over / level clear)

    // ---- ค่าคงที่ ----
    private readonly LIVES_MAX = 3;           // แพ้เมื่อพลาด 3 ครั้ง
    // ระยะจากจุดอ้างอิงศัตรู (root) ถึงขอบล่างของกล่องคำ
    // ต้องตรงกับเรขาคณิตของ plate ใน spawnEnemy (plate อยู่ y=-10, สูง 48 → ขอบล่าง = -34)
    private readonly WORD_BOX_BOTTOM = 34;
    // ตารางด่าน: goal=จำนวนคำที่ต้องเก็บให้ผ่าน, spawn=ระยะห่างการเกิด(วินาที),
    // speed=ความเร็วตก(px/s), maxLen=ความยาวคำสูงสุด, symbols=มีคำสัญลักษณ์ไหม
    // จูนให้เริ่มช้าสบาย ๆ เหมาะคนพิมพ์ ~35-40 WPM แล้วค่อย ๆ ยากขึ้น
    // จูนให้ "ยากขึ้น ~10%" จากเดิม (เร็วขึ้น + ถี่ขึ้น) แล้วไต่ขึ้นเรื่อย ๆ
    private readonly LEVELS = [
        { goal: 8,  spawn: 2.0,  speed: 50, maxLen: 6,  symbols: false },
        { goal: 10, spawn: 1.8,  speed: 55, maxLen: 7,  symbols: false },
        { goal: 12, spawn: 1.62, speed: 62, maxLen: 8,  symbols: false },
        { goal: 14, spawn: 1.48, speed: 70, maxLen: 9,  symbols: false },
        { goal: 16, spawn: 1.35, speed: 79, maxLen: 99, symbols: false },
    ];

    // ---- สถานะ ----
    private phase: string = "ready";          // ready | playing | transition | over
    private enemies: Enemy[] = [];
    private target: Enemy = null;
    private allWords: { word: string, lang: string }[] = [];
    private score = 0;
    private lives = 3;
    private combo = 0;
    private bestCombo = 0;
    private spawnTimer = 0;

    // ระดับความยากปัจจุบัน (กำหนดจากด่าน หรือไต่ขึ้นในโหมดโบนัส)
    private level = 0;          // index ของ LEVELS
    private isBonus = false;
    private curSpawn = 2.2;
    private curSpeed = 45;
    private curMaxLen = 5;
    private curSymbols = false;
    private goal = 8;
    private cleared = 0;        // เก็บคำได้กี่คำในด่านนี้

    // สถิติ WPM (1 word = 5 ตัวอักษร)
    private correctChars = 0;
    private playTime = 0;

    // ---- เสียง ----
    private bgmClip: cc.AudioClip = null;
    private bonusBgmClip: cc.AudioClip = null;
    private shootClip: cc.AudioClip = null;
    private errorClip: cc.AudioClip = null;
    private keyClip: cc.AudioClip = null;
    private levelupClip: cc.AudioClip = null;
    private bgmId = -1;

    // ---- ฟอนต์ 8-bit (VT323) ใช้กับทุกข้อความในเกม ----
    private gameFont: cc.TTFFont = null;

    // ==========================================================
    onLoad() {
        // ใช้ "ขนาดที่มองเห็นจริง" เพื่อให้เต็มจอทุกอัตราส่วน (ไม่ใช่แค่ design resolution)
        const vs = cc.view.getVisibleSize();
        this.DESIGN_W = (vs && vs.width) ? vs.width : (this.node.width || 1280);
        this.DESIGN_H = (vs && vs.height) ? vs.height : (this.node.height || 720);
        this.playerY = -this.HALF_H + 50;    // ยานชิดล่างขึ้น
        this.dangerY = this.playerY + 60;    // เส้นแดงต่ำลง อยู่เหนือยานเล็กน้อย

        // สร้างคลังคำแบบ flat (เก็บภาษาไว้ใช้เลือกสี/กรองความยาก)
        for (const lang of LANGS) {
            for (const w of WORD_BANK[lang]) this.allWords.push({ word: w, lang });
        }

        this.loadAudio();
        this.loadFont();

        this.buildLayers();
        this.buildBackground();
        this.buildDangerLine();
        this.buildPlayer();
        this.buildHUD();
        this.setHudVisible(false);   // ซ่อน HUD จนกว่าจะเริ่มเล่น
        this.showCenter("TYPE  BLAST\n\nBlast the falling words — common terms\nfrom  html / css / js / react\n(border, await, props, hook ...)\n\nClear each level's quota to advance.\nMiss 3 words and it's over!\n\npress  ENTER  to start");

        // ใช้ DOM keydown เพื่ออ่านอักขระจริง (รองรับสัญลักษณ์ () => {} ฯลฯ)
        // ถ้าไม่มี document (เช่นรันบน native) ค่อยใช้ cc.systemEvent แทน
        // รับอินพุต 2 ช่องทาง: DOM keydown (เว็บ — อ่านอักขระจริง/สัญลักษณ์)
        // และ cc.systemEvent (editor preview / native) — กันคีย์ซ้ำด้วย dispatchKey()
        if (typeof document !== "undefined" && document.addEventListener) {
            this._domKey = (e: any) => this.onDomKey(e);
            document.addEventListener("keydown", this._domKey);
        }
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);

        // แตะ/คลิกที่จอ = โฟกัสหน้าต่าง + เริ่มเกม (กัน preview ไม่รับคีย์บอร์ดก่อนคลิก)
        this.node.on(cc.Node.EventType.TOUCH_START, () => {
            if (this.phase === "ready" || this.phase === "over") this.startGame();
        }, this);
    }

    onDestroy() {
        if (this._domKey && typeof document !== "undefined") {
            document.removeEventListener("keydown", this._domKey);
        }
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        if (this.bgmId >= 0) cc.audioEngine.stop(this.bgmId);
    }

    private _domKey: any = null;
    private _keyFrame: { [token: string]: number } = {};

    // เว็บ: อ่านอักขระจริง (รองรับสัญลักษณ์ () => {} ฯลฯ)
    private onDomKey(e: any) {
        let key: string = e.key;
        if (typeof key !== "string") return;
        if (key === "Backspace") e.preventDefault();
        if (key.length === 1 && key >= "A" && key <= "Z") key = key.toLowerCase();
        // ส่งเฉพาะ: ตัวอักษรเดี่ยว / Enter / Backspace (ข้าม Shift, Arrow ฯลฯ)
        if (key.length === 1 || key === "Enter" || key === "Backspace") {
            this.dispatchKey(key);
        }
    }

    // editor preview / native: ผ่าน cc.systemEvent (ได้เฉพาะ a-z, Enter, Backspace)
    private onKeyDown(event: any) {
        const code = event.keyCode;
        let token: string = null;
        if (code === 13) token = "Enter";
        else if (code === 8) token = "Backspace";
        else if (code >= 65 && code <= 90) token = String.fromCharCode(code).toLowerCase();
        if (token) this.dispatchKey(token);
    }

    // รวมศูนย์การจัดการคีย์ + กันคีย์ซ้ำในเฟรมเดียวกัน
    // (เผื่อทั้ง DOM และ cc.systemEvent ยิงคีย์เดียวกันมาพร้อมกัน)
    private dispatchKey(token: string) {
        const frame = cc.director.getTotalFrames();
        if (this._keyFrame[token] === frame) return;
        this._keyFrame[token] = frame;

        if (token === "Enter") {
            if (this.phase === "ready" || this.phase === "over") this.startGame();
            return;
        }
        if (this.phase !== "playing") return;
        if (token === "Backspace") { this.doBackspace(); return; }
        if (token.length === 1) this.typeChar(token);
    }

    private doBackspace() {
        if (this.phase !== "playing") return;
        if (this.target) {
            this.target.typed = Math.max(0, this.target.typed - 1);
            this.renderWord(this.target);
            if (this.target.typed === 0) {
                this.setTargetHighlight(this.target, false);
                this.target = null;
            }
            this.updateInputLabel();
        }
    }

    // ---------- สร้างเลเยอร์ ----------
    private buildLayers() {
        this.bgNode = this.newNode("bg", this.node);
        this.dangerNode = this.newNode("dangerline", this.node);   // ใต้ศัตรู
        this.enemyLayer = this.newNode("enemies", this.node);
        this.playerNode = this.newNode("player", this.node);
        this.fxLayer = this.newNode("fx", this.node);
        this.uiLayer = this.newNode("ui", this.node);
    }

    // ---------- เส้นแดงเตือนอันตราย (คำแตะเส้นนี้ = หัวใจหาย 1) ----------
    private buildDangerLine() {
        const g = this.dangerNode.addComponent(cc.Graphics);
        const y = this.dangerY;
        const w = this.HALF_W + 80;
        // แถบเรืองแสงจาง ๆ
        g.fillColor = cc.color(255, 60, 60, 45);
        g.rect(-w, y - 7, w * 2, 14);
        g.fill();
        // เส้นประสีแดง
        g.lineWidth = 3;
        g.strokeColor = cc.color(255, 75, 75, 235);
        const dash = 28, gap = 16;
        for (let x = -w; x < w; x += dash + gap) {
            g.moveTo(x, y);
            g.lineTo(Math.min(x + dash, w), y);
        }
        g.stroke();
    }

    // ---------- พื้นหลังกริด ----------
    private buildBackground() {
        // ถ้าลากรูปพื้นหลังมาผูกใน editor แล้ว -> ใช้รูปนั้น ไม่ต้องวาดกริด
        if (this.bgSprite) return;
        const g = this.bgNode.addComponent(cc.Graphics);
        // เผื่อขอบกันดำ (เลยขอบจอออกไปอีกหน่อย)
        const M = 80;
        const w = this.HALF_W + M;
        const h = this.HALF_H + M;
        // เติมพื้นน้ำเงินเข้ม
        g.fillColor = cc.color(22, 38, 52);
        g.rect(-w, -h, w * 2, h * 2);
        g.fill();
        // เส้นกริด
        g.lineWidth = 2;
        g.strokeColor = cc.color(60, 90, 110, 120);
        const step = 80;
        for (let x = -w; x <= w; x += step) {
            g.moveTo(x, -h);
            g.lineTo(x, h);
        }
        for (let y = -h; y <= h; y += step) {
            g.moveTo(-w, y);
            g.lineTo(w, y);
        }
        g.stroke();
    }

    // ---------- ยานผู้เล่น ----------
    private buildPlayer() {
        // ถ้าลากรูปยานมาผูกใน editor แล้ว -> ใช้รูปนั้น ไม่ต้องวาดสามเหลี่ยม
        if (this.playerSprite) return;
        this.playerNode.setPosition(0, this.playerY);
        const g = this.playerNode.addComponent(cc.Graphics);
        // ลำตัวยาน (สามเหลี่ยมชี้ขึ้น)
        g.fillColor = cc.color(180, 230, 255);
        g.moveTo(0, 46);
        g.lineTo(-30, -26);
        g.lineTo(0, -10);
        g.lineTo(30, -26);
        g.close();
        g.fill();
        // แกนกลาง
        g.fillColor = cc.color(90, 170, 230);
        g.circle(0, 6, 12);
        g.fill();
        // ไฟเครื่องยนต์
        g.fillColor = cc.color(120, 220, 255, 160);
        g.circle(0, -22, 8);
        g.fill();
    }

    // ---------- HUD ----------
    private buildHUD() {
        // หมายเหตุ: ถ้า Label ถูกลากผูกมาจาก editor แล้ว (this.xxx ไม่ null)
        // จะข้ามการสร้างด้วยโค้ด แล้วใช้ Node จาก editor แทน
        if (!this.scoreLabel) {
            this.scoreLabel = this.makeLabel(this.uiLayer, "SCORE 0", 34,
                -this.HALF_W + 24, this.HALF_H - 36, cc.Label.HorizontalAlign.LEFT);
            this.scoreLabel.node.color = cc.color(230, 240, 255);
        }

        if (!this.livesLabel) {
            this.livesLabel = this.makeLabel(this.uiLayer, "", 34,
                this.HALF_W - 24, this.HALF_H - 36, cc.Label.HorizontalAlign.RIGHT);
            this.livesLabel.node.color = cc.color(255, 120, 120);
        }

        if (!this.comboLabel) {
            this.comboLabel = this.makeLabel(this.uiLayer, "", 28,
                -this.HALF_W + 24, this.HALF_H - 78, cc.Label.HorizontalAlign.LEFT);
            this.comboLabel.node.color = cc.color(255, 220, 120);
        }

        if (!this.wpmLabel) {
            this.wpmLabel = this.makeLabel(this.uiLayer, "WPM 0", 26,
                -this.HALF_W + 24, this.HALF_H - 116, cc.Label.HorizontalAlign.LEFT);
            this.wpmLabel.node.color = cc.color(150, 210, 255);
        }

        // ด่าน + แถบความคืบหน้า (กลางบน)
        if (!this.levelLabel) {
            this.levelLabel = this.makeLabel(this.uiLayer, "LEVEL 1", 32,
                0, this.HALF_H - 34, cc.Label.HorizontalAlign.CENTER);
            this.levelLabel.node.color = cc.color(235, 245, 255);
        }

        if (!this.progressInfo) {
            this.progressInfo = this.makeLabel(this.uiLayer, "0 / 8", 22,
                0, this.HALF_H - 70, cc.Label.HorizontalAlign.CENTER);
            this.progressInfo.node.color = cc.color(180, 200, 220);
        }

        this.progressBar = this.newNode("progress", this.uiLayer);
        this.progressBar.setPosition(0, this.HALF_H - 96);
        this.progressBar.addComponent(cc.Graphics);
        this.drawProgress(0);

        // ช่องแสดงคำที่กำลังพิมพ์ (ล่างจอ)
        if (!this.inputLabel) {
            const inNode = this.newNode("input", this.uiLayer);
            inNode.setPosition(0, this.playerY + 96);
            const rt = inNode.addComponent(cc.RichText);
            rt.fontSize = 40;
            rt.horizontalAlign = cc.macro.TextAlignment.CENTER;
            rt.string = "";
            this.applyFont(rt);
            this.inputLabel = rt;
        }

        this.updateScore();
        this.updateLives();
    }

    // วาดแถบความคืบหน้าด่าน (ratio 0..1)
    private drawProgress(ratio: number) {
        if (!this.progressBar) return;
        const g = this.progressBar.getComponent(cc.Graphics);
        g.clear();
        const W = 360, H = 14, r = 7;
        // กรอบพื้น
        g.fillColor = cc.color(20, 32, 44, 220);
        g.roundRect(-W / 2, -H / 2, W, H, r);
        g.fill();
        // ส่วนที่เติม
        const fillW = Math.max(0, Math.min(1, ratio)) * W;
        if (fillW > 2) {
            g.fillColor = this.isBonus ? cc.color(255, 120, 90) : cc.color(90, 220, 140);
            g.roundRect(-W / 2, -H / 2, fillW, H, r);
            g.fill();
        }
        // ขอบ
        g.lineWidth = 2;
        g.strokeColor = cc.color(90, 130, 160, 200);
        g.roundRect(-W / 2, -H / 2, W, H, r);
        g.stroke();
    }

    // ==========================================================
    // วนลูปเกม
    update(dt: number) {
        if (this.phase !== "playing") return;

        // จับเวลาเล่นเพื่อคำนวณ WPM
        this.playTime += dt;
        this.updateWPM();

        // เกิดศัตรูตามจังหวะของด่านปัจจุบัน
        this.spawnTimer += dt;
        if (this.spawnTimer >= this.curSpawn) {
            this.spawnTimer = 0;
            this.spawnEnemy();
        }

        // เลื่อนศัตรูลง + ตรวจชน
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            if (!e.alive) continue;
            e.root.y -= e.speed * dt;
            // ตัดทันทีที่ขอบล่างของกล่องคำแตะเส้นแดง
            if (e.root.y - this.WORD_BOX_BOTTOM <= this.dangerY) {
                this.enemyBreached(e);
            }
        }
    }

    // ---------- เกิดศัตรู ----------
    private spawnEnemy() {
        // กรองคำตามความยากของด่าน (ความยาว + มีสัญลักษณ์ไหม)
        const pool = this.allWords.filter(it =>
            it.word.length <= this.curMaxLen &&
            (this.curSymbols || /^[a-z]+$/.test(it.word))
        );
        if (pool.length === 0) return;

        let pick = pool[Math.floor(Math.random() * pool.length)];
        // เลี่ยงคำซ้ำ และตัวขึ้นต้นชนกัน (กันสับสนตอนพิมพ์)
        const usedFirst = this.enemies.filter(e => e.alive).map(e => e.word[0]);
        for (let tryN = 0; tryN < 8; tryN++) {
            const conflict = this.enemies.some(e => e.alive && e.word === pick.word)
                || usedFirst.indexOf(pick.word[0]) >= 0;
            if (!conflict) break;
            pick = pool[Math.floor(Math.random() * pool.length)];
        }
        const word = pick.word;
        const lang = pick.lang;

        const color = LANG_COLOR[lang];
        const root = this.newNode("enemy_" + word, this.enemyLayer);
        const margin = 90;
        const x = (Math.random() * (this.DESIGN_W - margin * 2)) - (this.DESIGN_W / 2 - margin);
        root.setPosition(x, this.HALF_H + 40);

        // ไอคอนศัตรู
        const icon = this.newNode("icon", root);
        icon.setPosition(0, 36);
        this.drawEnemyIcon(icon.addComponent(cc.Graphics), color);

        // ป้ายข้อความ
        const fontSize = 32;
        const width = word.length * fontSize * 0.6 + 36;
        const plate = this.newNode("plate", root);
        plate.setPosition(0, -10);
        const pg = plate.addComponent(cc.Graphics);
        pg.fillColor = cc.color(10, 18, 26, 220);
        pg.roundRect(-width / 2, -24, width, 48, 10);
        pg.fill();
        pg.lineWidth = 3;
        pg.strokeColor = color;
        pg.roundRect(-width / 2, -24, width, 48, 10);
        pg.stroke();

        const txt = this.newNode("txt", root);
        txt.setPosition(0, -10);
        const rt = txt.addComponent(cc.RichText);
        rt.fontSize = fontSize;
        rt.horizontalAlign = cc.macro.TextAlignment.CENTER;
        this.applyFont(rt);

        // ความเร็วตกตามด่านปัจจุบัน (สุ่มเล็กน้อยให้มีจังหวะ)
        const speed = this.curSpeed + (Math.random() * 10 - 5);

        const enemy: Enemy = {
            root, plate, text: rt, word, lang, color,
            speed, typed: 0, alive: true, width,
        };
        this.renderWord(enemy);
        this.enemies.push(enemy);
    }

    private drawEnemyIcon(g: cc.Graphics, color: cc.Color) {
        // ตัวเหลี่ยมเรืองแสง
        g.fillColor = color;
        g.moveTo(0, 26);
        g.lineTo(22, 6);
        g.lineTo(14, -22);
        g.lineTo(-14, -22);
        g.lineTo(-22, 6);
        g.close();
        g.fill();
        // ตา
        g.fillColor = cc.color(20, 20, 30);
        g.circle(-8, 2, 5);
        g.circle(8, 2, 5);
        g.fill();
    }

    // ---------- วาดคำพร้อมไฮไลต์ส่วนที่พิมพ์แล้ว ----------
    private renderWord(e: Enemy) {
        const done = e.word.substring(0, e.typed);
        const rest = e.word.substring(e.typed);
        const restColor = this.colorHex(e.color);
        let s = "";
        if (done.length > 0) s += `<color=#39ff88>${done}</color>`;
        if (rest.length > 0) s += `<color=#${restColor}>${rest}</color>`;
        e.text.string = s;
    }

    // ==========================================================
    private typeChar(ch: string) {
        if (this.target) {
            // กำลังพิมพ์คำเป้าหมายอยู่
            const expected = this.target.word[this.target.typed];
            if (expected === ch) {
                this.target.typed++;
                this.correctChars++;
                this.renderWord(this.target);
                if (this.target.typed >= this.target.word.length) {
                    this.completeWord(this.target);
                } else {
                    this.playKey();
                }
            } else {
                this.flashMiss();
            }
            this.updateInputLabel();
            return;
        }

        // ยังไม่ได้ล็อกเป้า -> หาคำที่ขึ้นต้นด้วย ch แล้วเลือกตัวที่ใกล้ผู้เล่นที่สุด
        let pick: Enemy = null;
        for (const e of this.enemies) {
            if (!e.alive || e.word[0] !== ch) continue;
            if (!pick || e.root.y < pick.root.y) pick = e;
        }
        if (!pick) {
            this.flashMiss();
            return;
        }
        this.target = pick;
        pick.typed = 1;
        this.correctChars++;
        this.setTargetHighlight(pick, true);
        this.renderWord(pick);
        if (pick.typed >= pick.word.length) {
            this.completeWord(pick);
        } else {
            this.playKey();
        }
        this.updateInputLabel();
    }

    // ---------- ยิงสำเร็จ ----------
    private completeWord(e: Enemy) {
        e.alive = false;
        this.playSfx(this.shootClip, 0.5);   // เสียงปิ้ว
        this.fireBullet(e.root.getPosition());
        this.spawnExplosion(e.root.getPosition(), e.color);
        e.root.destroy();
        this.removeEnemy(e);
        if (this.target === e) this.target = null;

        this.combo++;
        this.bestCombo = Math.max(this.bestCombo, this.combo);
        const mult = this.isBonus ? 2 : 1;   // โหมดโบนัสคะแนน x2
        this.score += (e.word.length * 10 + this.combo * 5) * mult;
        this.updateScore();
        this.updateCombo();
        this.updateInputLabel();

        // นับความคืบหน้าด่าน
        this.cleared++;
        this.updateProgress();

        if (this.isBonus) {
            // โหมดโบนัส: ไต่ความยากต่อเนื่องทุกคำที่เก็บได้
            this.curSpeed = Math.min(150, this.curSpeed + 1.6);
            this.curSpawn = Math.max(0.8, this.curSpawn - 0.02);
        } else if (this.cleared >= this.goal) {
            // เก็บครบเป้า = ผ่านด่าน
            this.levelCleared();
        }
    }

    // ---------- ศัตรูทะลุถึงผู้เล่น ----------
    private enemyBreached(e: Enemy) {
        e.alive = false;
        this.spawnExplosion(e.root.getPosition(), cc.color(255, 80, 80));
        e.root.destroy();
        this.removeEnemy(e);
        if (this.target === e) this.target = null;

        this.combo = 0;
        this.updateCombo();
        this.lives--;
        this.updateLives();
        this.flashMiss();
        this.updateInputLabel();
        if (this.lives <= 0) this.endGame();
    }

    private removeEnemy(e: Enemy) {
        const i = this.enemies.indexOf(e);
        if (i >= 0) this.enemies.splice(i, 1);
    }

    // ---------- กระสุน ----------
    private fireBullet(targetPos: cc.Vec2) {
        const b = this.newNode("bullet", this.fxLayer);
        b.setPosition(0, this.playerY + 30);
        const g = b.addComponent(cc.Graphics);
        g.fillColor = cc.color(180, 240, 255);
        g.circle(0, 0, 7);
        g.fill();
        g.lineWidth = 4;
        g.strokeColor = cc.color(120, 220, 255, 180);
        g.moveTo(0, 0);
        g.lineTo(0, -26);
        g.stroke();

        cc.tween(b)
            .to(0.12, { position: cc.v3(targetPos.x, targetPos.y, 0) }, { easing: "quadIn" })
            .call(() => b.destroy())
            .start();
    }

    // ---------- ระเบิด ----------
    private spawnExplosion(pos: cc.Vec2, color: cc.Color) {
        const n = this.newNode("boom", this.fxLayer);
        n.setPosition(pos.x, pos.y);
        const g = n.addComponent(cc.Graphics);
        g.fillColor = cc.color(color.r, color.g, color.b, 255);
        g.circle(0, 0, 26);
        g.fill();
        g.lineWidth = 5;
        g.strokeColor = cc.color(255, 255, 255, 220);
        g.circle(0, 0, 26);
        g.stroke();
        n.scale = 0.4;
        cc.tween(n)
            .to(0.28, { scale: 1.8, opacity: 0 }, { easing: "quadOut" })
            .call(() => n.destroy())
            .start();
    }

    // ==========================================================
    // เริ่ม / จบเกม

    // เรียกจากปุ่ม Start / Restart ใน editor
    // (ที่ Button -> Click Events ให้เลือกฟังก์ชันชื่อ "onPlayButton")
    onPlayButton() {
        if (this.phase === "ready" || this.phase === "over") this.startGame();
    }

    private startGame() {
        this.clearEnemies();
        this.target = null;
        this.score = 0;
        this.lives = this.LIVES_MAX;
        this.combo = 0;
        this.bestCombo = 0;
        this.spawnTimer = 0;
        this.correctChars = 0;
        this.playTime = 0;
        this.isBonus = false;
        this.level = 0;
        this.applyLevel(0);
        this.phase = "playing";
        this.hideCenter();
        this.setHudVisible(true);
        this.playBgm(this.bgmClip);     // เพลงปกติ (เริ่มใหม่)
        this.updateScore();
        this.updateLives();
        this.updateCombo();
        this.updateWPM();
        this.updateInputLabel();
    }

    // ตั้งค่าความยากของด่านตาม index
    private applyLevel(idx: number) {
        const L = this.LEVELS[idx];
        this.curSpawn = L.spawn;
        this.curSpeed = L.speed;
        this.curMaxLen = L.maxLen;
        this.curSymbols = L.symbols;
        this.goal = L.goal;
        this.cleared = 0;
        this.spawnTimer = this.curSpawn * 0.5; // ให้ตัวแรกโผล่ไม่ช้าเกิน
        this.updateLevel();
        this.updateProgress();
    }

    // ผ่านด่าน -> โชว์ป้าย แล้วไปด่านถัดไป (เติมหัวใจเต็ม)
    private levelCleared() {
        this.phase = "transition";
        this.target = null;
        this.clearEnemies();
        this.playSfx(this.levelupClip, 0.6);   // เสียงผ่านด่าน
        this.setHudVisible(false);
        this.lives = this.LIVES_MAX;       // ผ่านด่านแล้วเติมหัวใจเต็ม
        this.combo = 0;
        this.updateLives();
        this.updateCombo();
        this.updateInputLabel();

        const isLast = this.level >= this.LEVELS.length - 1;
        const wpm = this.currentWPM();
        if (isLast) {
            this.showCenter(`LEVEL ${this.level + 1} CLEAR!\n\nWPM  ${wpm}     SCORE  ${this.score}\n\nNext up:  BONUS  CHALLENGE`);
        } else {
            this.showCenter(`LEVEL ${this.level + 1} CLEAR!\n\nWPM  ${wpm}     SCORE  ${this.score}\n\nGet ready for LEVEL ${this.level + 2}...`);
        }

        this.scheduleOnce(() => this.advanceStage(), 2.2);
    }

    private advanceStage() {
        this.hideCenter();
        this.setHudVisible(true);
        if (this.level < this.LEVELS.length - 1) {
            this.level++;
            this.applyLevel(this.level);
            this.phase = "playing";
        } else {
            this.enterBonus();
        }
    }

    // โหมดโบนัส: ไม่มีที่สิ้นสุด ไต่ความยากเรื่อย ๆ คะแนน x2
    private enterBonus() {
        this.isBonus = true;
        this.curSpawn = 1.25;
        this.curSpeed = 88;
        this.curMaxLen = 99;
        this.curSymbols = false;
        this.cleared = 0;
        this.spawnTimer = 0;
        this.phase = "playing";
        this.playBgm(this.bonusBgmClip);   // เปลี่ยนเป็นเพลงโบนัสที่เร่งเร้าขึ้น
        this.updateLevel();
        this.updateProgress();
    }

    private endGame() {
        this.phase = "over";
        this.target = null;
        this.setHudVisible(false);
        const reached = this.isBonus ? "BONUS CHALLENGE" : ("LEVEL " + (this.level + 1));
        this.showCenter(
            `GAME OVER\n\nReached:  ${reached}\nSCORE  ${this.score}     WPM  ${this.currentWPM()}\nBEST COMBO  ${this.bestCombo}\n\npress  ENTER  to retry`
        );
    }

    private clearEnemies() {
        for (const e of this.enemies) if (e.root && e.root.isValid) e.root.destroy();
        this.enemies = [];
    }

    // ==========================================================
    // HUD helpers
    private updateScore() {
        if (this.scoreLabel) this.scoreLabel.string = "SCORE " + this.score;
    }
    private updateLives() {
        if (this.livesLabel) {
            let s = "";
            for (let i = 0; i < this.lives; i++) s += "♥ ";
            this.livesLabel.string = s.trim() || "x";
        }
    }
    private updateCombo() {
        if (this.comboLabel) this.comboLabel.string = this.combo > 1 ? "COMBO x" + this.combo : "";
    }
    private updateLevel() {
        if (!this.levelLabel) return;
        if (this.isBonus) {
            this.levelLabel.string = "BONUS  CHALLENGE  x2";
            this.levelLabel.node.color = cc.color(255, 150, 110);
        } else {
            this.levelLabel.string = "LEVEL " + (this.level + 1);
            this.levelLabel.node.color = cc.color(235, 245, 255);
        }
    }
    private updateProgress() {
        if (this.isBonus) {
            if (this.progressInfo) this.progressInfo.string = "cleared  " + this.cleared;
            this.drawProgress(((this.cleared % 10) + 1) / 10);
        } else {
            if (this.progressInfo) this.progressInfo.string = this.cleared + " / " + this.goal;
            this.drawProgress(this.cleared / this.goal);
        }
    }
    // ---------- เสียง ----------
    private loadAudio() {
        const res: any = cc.resources;
        if (!res) return;
        res.load("audio/shoot", cc.AudioClip, (e: any, c: cc.AudioClip) => { if (!e) this.shootClip = c; });
        res.load("audio/error", cc.AudioClip, (e: any, c: cc.AudioClip) => { if (!e) this.errorClip = c; });
        res.load("audio/key", cc.AudioClip, (e: any, c: cc.AudioClip) => { if (!e) this.keyClip = c; });
        res.load("audio/levelup", cc.AudioClip, (e: any, c: cc.AudioClip) => { if (!e) this.levelupClip = c; });
        res.load("audio/bgm", cc.AudioClip, (e: any, c: cc.AudioClip) => {
            if (!e) { this.bgmClip = c; this.startBgm(); }
        });
        res.load("audio/bgm_bonus", cc.AudioClip, (e: any, c: cc.AudioClip) => {
            if (!e) { this.bonusBgmClip = c; this.startBgm(); }
        });
    }

    // ---------- ฟอนต์ 8-bit (VT323) ----------
    // โหลดฟอนต์จาก resources/fonts แล้วเอาไปใช้กับทุกข้อความที่มีอยู่
    private loadFont() {
        const res: any = cc.resources;
        if (!res) return;
        res.load("fonts/VT323-Regular", cc.TTFFont, (e: any, font: cc.TTFFont) => {
            if (e || !font) return;
            this.gameFont = font;
            this.applyFontEverywhere();
        });
    }

    // ใส่ฟอนต์ให้ Label หรือ RichText หนึ่งตัว (ถ้าฟอนต์โหลดเสร็จแล้ว)
    private applyFont(comp: cc.Label | cc.RichText) {
        if (this.gameFont && comp) (comp as any).font = this.gameFont;
    }

    // ใส่ฟอนต์ให้ "ทุก" ข้อความที่มีอยู่ตอนนี้ (HUD + ช่องพิมพ์ + ข้อความกลาง + คำศัตรูที่ยังลอยอยู่)
    private applyFontEverywhere() {
        const labels: (cc.Label | cc.RichText)[] = [
            this.scoreLabel, this.livesLabel, this.comboLabel, this.wpmLabel,
            this.levelLabel, this.progressInfo, this.centerLabel, this.inputLabel,
        ];
        for (const l of labels) this.applyFont(l);
        for (const e of this.enemies) if (e.text) this.applyFont(e.text);
    }
    // เล่นเพลงพื้นหลัง (หยุดเพลงเดิมก่อน) — clip null = เงียบ
    private playBgm(clip: cc.AudioClip) {
        if (this.bgmId >= 0) { cc.audioEngine.stop(this.bgmId); this.bgmId = -1; }
        if (clip) this.bgmId = cc.audioEngine.play(clip, true, 0.3);
    }
    // ใช้ตอนเพลงโหลดเสร็จช้ากว่าตอนเริ่มเล่น
    private startBgm() {
        if (this.phase !== "playing" || this.bgmId >= 0) return;
        const want = this.isBonus ? this.bonusBgmClip : this.bgmClip;
        if (want) this.playBgm(want);
    }
    private playSfx(clip: cc.AudioClip, vol: number) {
        if (clip) cc.audioEngine.play(clip, false, vol);
    }
    private playKey() {
        if (this.keyClip) cc.audioEngine.play(this.keyClip, false, 0.25);
    }

    // ซ่อน/แสดง HUD ทั้งหมด (ใช้ตอนหน้าเริ่ม/Game Over/พักด่าน จะได้ไม่ทับ panel)
    private setHudVisible(v: boolean) {
        const labels = [this.scoreLabel, this.livesLabel, this.comboLabel,
            this.wpmLabel, this.levelLabel, this.progressInfo, this.inputLabel];
        for (const l of labels) if (l && l.node) l.node.active = v;
        if (this.progressBar) this.progressBar.active = v;
    }
    private currentWPM(): number {
        if (this.playTime < 1) return 0;
        return Math.round(this.correctChars * 12 / this.playTime);
    }
    private updateWPM() {
        if (!this.wpmLabel) return;
        const w = this.currentWPM();
        this.wpmLabel.string = "WPM " + w;
        // เขียว = อยู่ในโซนกำลังสนุก (~30-50), เหลือง = ช้ากว่านั้น, ส้ม = เร็วมาก
        this.wpmLabel.node.color = (w >= 30 && w <= 50) ? cc.color(120, 230, 150)
            : (w > 50) ? cc.color(255, 180, 110) : cc.color(150, 210, 255);
    }
    private updateInputLabel() {
        if (!this.inputLabel) return;
        if (this.target) {
            const done = this.target.word.substring(0, this.target.typed);
            const rest = this.target.word.substring(this.target.typed);
            this.inputLabel.string = `<color=#39ff88>${done}</color><color=#88a0b0>${rest}</color>`;
        } else {
            this.inputLabel.string = `<color=#557080>type the first letter...</color>`;
        }
    }

    private flashMiss() {
        this.playSfx(this.errorClip, 0.5);   // เสียงอื๊ด (พิมพ์ผิด)
        // กระพริบยานผู้เล่นเป็นสีแดงสั้น ๆ (ใช้รูปจาก editor ถ้ามี)
        const pNode = (this.playerSprite && this.playerSprite.node) ? this.playerSprite.node : this.playerNode;
        if (!pNode) return;
        pNode.stopAllActions();
        pNode.color = cc.color(255, 90, 90);
        cc.tween(pNode)
            .to(0.18, { color: cc.color(255, 255, 255) })
            .start();
    }

    private setTargetHighlight(e: Enemy, on: boolean) {
        if (!e.plate || !e.plate.isValid) return;
        e.plate.scale = on ? 1.12 : 1.0;
    }

    // ---------- ข้อความกลางจอ ----------
    private showCenter(msg: string) {
        if (!this.centerLabel) {
            // กล่องพื้นหลัง (จัดกึ่งกลางจอ) สร้างก่อนเพื่อให้อยู่ใต้ข้อความ
            const bgN = this.newNode("centerbg", this.uiLayer);
            bgN.setPosition(0, 0);
            bgN.zIndex = 10;
            const g = bgN.addComponent(cc.Graphics);
            const BW = 900, BH = 560;
            g.fillColor = cc.color(8, 16, 24, 228);
            g.roundRect(-BW / 2, -BH / 2, BW, BH, 24);
            g.fill();
            g.lineWidth = 3;
            g.strokeColor = cc.color(80, 160, 220, 200);
            g.roundRect(-BW / 2, -BH / 2, BW, BH, 24);
            g.stroke();
            this._centerBg = bgN;

            const n = this.newNode("center", this.uiLayer);
            n.setPosition(0, 0);
            n.zIndex = 11;
            const lb = n.addComponent(cc.Label);
            lb.fontSize = 34;
            lb.lineHeight = 50;
            lb.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
            lb.verticalAlign = cc.Label.VerticalAlign.CENTER;
            n.color = cc.color(235, 245, 255);
            this.applyFont(lb);
            this.centerLabel = lb;
        }
        this.centerLabel.node.active = true;
        if (this._centerBg) this._centerBg.active = true;
        this.centerLabel.string = msg;
        // ปุ่ม Start โชว์เฉพาะหน้าเริ่ม/เกมจบ (ไม่โชว์ตอนพักด่าน)
        if (this.startButton) this.startButton.active = (this.phase === "ready" || this.phase === "over");
    }
    private _centerBg: cc.Node = null;
    private hideCenter() {
        if (this.centerLabel) this.centerLabel.node.active = false;
        if (this._centerBg) this._centerBg.active = false;
        if (this.startButton) this.startButton.active = false;
    }

    // ==========================================================
    // utils
    private newNode(name: string, parent: cc.Node): cc.Node {
        const n = new cc.Node(name);
        parent.addChild(n);
        n.setPosition(0, 0);
        return n;
    }

    private makeLabel(parent: cc.Node, str: string, size: number,
        x: number, y: number, align: cc.Label.HorizontalAlign): cc.Label {
        const n = this.newNode("label", parent);
        n.setPosition(x, y);
        n.anchorX = align === cc.Label.HorizontalAlign.LEFT ? 0
            : align === cc.Label.HorizontalAlign.RIGHT ? 1 : 0.5;
        n.anchorY = 0.5;
        const lb = n.addComponent(cc.Label);
        lb.fontSize = size;
        lb.lineHeight = size + 6;
        lb.horizontalAlign = align;
        lb.string = str;
        this.applyFont(lb);
        return lb;
    }

    private colorHex(c: cc.Color): string {
        const h = (v: number) => ("0" + v.toString(16)).slice(-2);
        return h(c.r) + h(c.g) + h(c.b);
    }
}
