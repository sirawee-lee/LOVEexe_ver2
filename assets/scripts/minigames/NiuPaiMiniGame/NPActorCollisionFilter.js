'use strict';

var NPActorCollisionFilter = cc.Class({
    extends: cc.Component,

    properties: {
        actorType: { default: '' },
    },

    onBeginContact: function (contact, selfCollider, otherCollider) {
        this._disableActorContact(contact, selfCollider, otherCollider);
    },

    onPreSolve: function (contact, selfCollider, otherCollider) {
        this._disableActorContact(contact, selfCollider, otherCollider);
    },

    _disableActorContact: function (contact, selfCollider, otherCollider) {
        if (!this._isActorTag(selfCollider.tag) || !this._isActorTag(otherCollider.tag)) return;

        if (this._isPlayerNormieContact(selfCollider.tag, otherCollider.tag)) {
            contact.disabled = this.game && this.game._playerMovingCarefully;
            return;
        }

        contact.disabled = true;
    },

    _isActorTag: function (tag) {
        return tag === NPActorCollisionFilter.Tag.Player ||
            tag === NPActorCollisionFilter.Tag.NiuPai ||
            tag === NPActorCollisionFilter.Tag.BlackDog ||
            tag === NPActorCollisionFilter.Tag.Normie;
    },

    _isPlayerNormieContact: function (tagA, tagB) {
        return (tagA === NPActorCollisionFilter.Tag.Player && tagB === NPActorCollisionFilter.Tag.Normie) ||
            (tagA === NPActorCollisionFilter.Tag.Normie && tagB === NPActorCollisionFilter.Tag.Player);
    },
});

NPActorCollisionFilter.Tag = {
    Player: 101,
    NiuPai: 102,
    BlackDog: 103,
    Normie: 104,
};

module.exports = NPActorCollisionFilter;
