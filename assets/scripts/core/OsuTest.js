cc.Class({
    extends: cc.Component,
    start: function () {
        var osu = this.node.getComponent('OsuMinigame');
        osu.startGame(function (win, score) {
            cc.log(win ? 'WIN! Score: ' + score : 'LOSE. Score: ' + score);
        });
    },
});
