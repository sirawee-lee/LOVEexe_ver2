// BuildingTrigger.js — วางบน node trigger zone หน้าประตูอาคาร
// ตรวจจับว่า Player เดินเข้ามาแล้ว load scene ของ mini-game
cc.Class({
    extends: cc.Component,

    properties: {
        targetScene: '',          // ชื่อ scene ที่จะโหลด เช่น 'MiniGame_Library'
        interactKey: {
            default: cc.macro.KEY.f,
            type: cc.Integer,
        },
        showPrompt: true,         // แสดง "กด F เพื่อเข้า" หรือเปล่า
        promptLabel: {
            type: cc.Label,
            default: null,
        },
    },

    onLoad() {
        this._playerInside = false;
        this._keys = {};

        // ต้องการ BoxCollider2D (Sensor=true) บน node นี้
        const collider = this.getComponent(cc.BoxCollider2D);
        if (collider) collider.sensor = true;

        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this._onKey, this);

        if (this.promptLabel) this.promptLabel.node.active = false;
    },

    onDestroy() {
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this._onKey, this);
    },

    onBeginContact(contact, selfCollider, otherCollider) {
        if (otherCollider.node.name !== 'Player') return;
        this._playerInside = true;
        if (this.showPrompt && this.promptLabel) {
            this.promptLabel.node.active = true;
        }
    },

    onEndContact(contact, selfCollider, otherCollider) {
        if (otherCollider.node.name !== 'Player') return;
        this._playerInside = false;
        if (this.promptLabel) this.promptLabel.node.active = false;
    },

    _onKey(e) {
        if (!this._playerInside) return;
        if (e.keyCode !== this.interactKey) return;
        if (!this.targetScene) {
            cc.warn('BuildingTrigger: targetScene is empty');
            return;
        }
        this._enterBuilding();
    },

    _enterBuilding() {
        // เก็บ scene ก่อนหน้าไว้ให้ mini-game ใช้ back
        cc.sys.localStorage.setItem('previousScene', cc.director.getScene().name);
        cc.director.loadScene(this.targetScene);
    },
});
