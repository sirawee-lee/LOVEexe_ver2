cc.Class({
    extends: cc.Component,
    start: function () {
        var game = this.node.getComponent('FatherMinigame');
        game.startGame(function (win, score) {
            cc.log(win ? 'WIN! Coins: ' + score : 'LOSE. Coins: ' + score);
        });
    },
});
