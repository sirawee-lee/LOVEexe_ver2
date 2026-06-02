cc.Class({
    extends: cc.Component,
    onLoad: function () {
        var bg   = new cc.Node('bg');
        var gfx  = bg.addComponent(cc.Graphics);
        gfx.fillColor = cc.color(10, 10, 30, 230);
        gfx.rect(-350, -200, 700, 400);
        gfx.fill();
        this.node.addChild(bg, 0);

        var lbl  = new cc.Node('label');
        var l    = lbl.addComponent(cc.Label);
        l.string          = 'Coming Soon!';
        l.fontSize        = 22;
        l.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        lbl.color = cc.color(255, 220, 80);
        lbl.setPosition(0, 20);
        this.node.addChild(lbl, 1);

        var sub  = new cc.Node('sub');
        var sl   = sub.addComponent(cc.Label);
        sl.string         = 'Press [E] or [SPACE] to return';
        sl.fontSize       = 12;
        sl.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        sub.color = cc.color(180, 180, 180);
        sub.setPosition(0, -20);
        this.node.addChild(sub, 1);
    },
});
