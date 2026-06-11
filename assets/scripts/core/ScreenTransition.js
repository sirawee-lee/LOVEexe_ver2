'use strict';

var ScreenTransition = {
    defaultDuration: 0.22,
    fadeNodeName: '__ScreenTransitionFade',
    zIndex: 99999,

    getCanvas: function () {
        var scene = cc.director.getScene();
        if (!scene) return null;
        var canvas = scene.getChildByName('Canvas');
        if (!canvas) {
            var ccCanvas = cc.Canvas.instance;
            canvas = ccCanvas ? ccCanvas.node : null;
        }
        return canvas;
    },

    makeCover: function (opacityFrom) {
        var canvas = this.getCanvas();
        if (!canvas) return null;

        var old = canvas.getChildByName(this.fadeNodeName);
        if (old && cc.isValid(old)) old.destroy();

        var node = new cc.Node(this.fadeNodeName);
        node.parent = canvas;
        node.zIndex = this.zIndex;
        node.setContentSize(canvas.width, canvas.height);

        var g = node.addComponent(cc.Graphics);
        g.fillColor = cc.color(0, 0, 0);
        g.rect(-canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
        g.fill();

        node.opacity = opacityFrom;
        node.on(cc.Node.EventType.TOUCH_START, function () {}, this);
        return node;
    },

    fadeOut: function (cb, duration) {
        var node = this.makeCover(0);
        if (!node) {
            if (cb) cb();
            return;
        }

        cc.tween(node)
            .to(this._duration(duration), { opacity: 255 })
            .call(function () {
                if (cb) cb();
            })
            .start();
    },

    fadeIn: function (cb, duration) {
        var node = this.makeCover(255);
        if (!node) {
            if (cb) cb();
            return;
        }

        cc.tween(node)
            .to(this._duration(duration), { opacity: 0 })
            .call(function () {
                if (cc.isValid(node)) node.destroy();
                if (cb) cb();
            })
            .start();
    },

    fadeOutIn: function (middle, done, duration) {
        var self = this;
        self.fadeOut(function () {
            if (middle) middle();
            self.fadeIn(done, duration);
        }, duration);
    },

    _duration: function (duration) {
        return typeof duration === 'number' && duration >= 0 ? duration : this.defaultDuration;
    },
};

module.exports = ScreenTransition;
