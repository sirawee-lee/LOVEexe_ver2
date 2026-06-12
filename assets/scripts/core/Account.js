'use strict';

// Account.js — username/password accounts, cloud saves and the GLOBAL
// leaderboard, backed by Cloud Firestore over plain REST (no Firebase SDK —
// just XMLHttpRequest, so it works in the web build and in editor preview).
//
// This is a PLAIN module (like StoryState/GameFlow): require('Account') from
// anywhere and the same instance is shared across scene loads.
//
//   Account.init();                          // restore last session (auto-login)
//   Account.login(name, pw, cb);             // login OR first-time sign-up
//   Account.saveProgress();                  // snapshot StoryState (cloud + local)
//   Account.loadProgress(cb);                // hydrate StoryState from the save
//   Account.submitScore(route);              // best combined total -> leaderboard
//   Account.fetchLeaderboard(cb);            // top 10 [{name,total,route}]
//
// SECURITY NOTE (class project): there is no Firebase Auth — the client keeps a
// SHA-256 hash of "username:password" and sends it with every write; Firestore
// rules compare it against the account doc, so players can't overwrite each
// other's saves/scores. The hash is NOT real security (no salt/server secret),
// it just keeps the leaderboard honest between classmates.

var StoryState = require('StoryState');

// ── Firebase project wiring (public web config — safe to ship) ──
var PROJECT = 'loveexe-254bf6';
var API_KEY = 'AIzaSyAQRtZU09Yoq1f1XG35Cd3oZc7HqDsi2HA';
var BASE    = 'https://firestore.googleapis.com/v1/projects/' + PROJECT +
              '/databases/(default)/documents';

var LS_ACCOUNT = 'loveexe_account';       // {u,n,p} persisted session
var LS_SAVE    = 'loveexe_save_';         // + username (or 'guest') -> state json

// ── tiny SHA-256 (geraintluff's public-domain implementation, ES5) ──
function sha256(input) {
    // UTF-8 encode first so non-ASCII passwords still hash
    var ascii;
    try { ascii = unescape(encodeURIComponent(String(input))); }
    catch (e) { ascii = String(input); }

    function rightRotate(value, amount) {
        return (value >>> amount) | (value << (32 - amount));
    }
    var mathPow = Math.pow, maxWord = mathPow(2, 32);
    var i, j, result = '';
    var words = [];
    var asciiBitLength = ascii.length * 8;
    var hash = sha256.h = sha256.h || [];
    var k = sha256.k = sha256.k || [];
    var primeCounter = k.length;
    var isComposite = {};
    for (var candidate = 2; primeCounter < 64; candidate++) {
        if (!isComposite[candidate]) {
            for (i = 0; i < 313; i += candidate) isComposite[i] = candidate;
            hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
            k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
        }
    }
    ascii += '\x80';
    while (ascii.length % 64 - 56) ascii += '\x00';
    for (i = 0; i < ascii.length; i++) {
        j = ascii.charCodeAt(i);
        if (j >> 8) return '';
        words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words.length] = (asciiBitLength / maxWord) | 0;
    words[words.length] = asciiBitLength;
    for (j = 0; j < words.length;) {
        var w = words.slice(j, j += 16);
        var oldHash = hash;
        hash = hash.slice(0, 8);
        for (i = 0; i < 64; i++) {
            var w15 = w[i - 15], w2 = w[i - 2];
            var a = hash[0], e = hash[4];
            var temp1 = hash[7]
                + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
                + ((e & hash[5]) ^ ((~e) & hash[6]))
                + k[i]
                + (w[i] = (i < 16) ? w[i] : (
                    w[i - 16]
                    + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
                    + w[i - 7]
                    + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
                ) | 0);
            var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
                + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
            hash = [(temp1 + temp2) | 0].concat(hash);
            hash[4] = (hash[4] + temp1) | 0;
        }
        for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
    }
    for (i = 0; i < 8; i++) {
        for (j = 3; j + 1; j--) {
            var b = (hash[i] >> (j * 8)) & 255;
            result += ((b < 16) ? 0 : '') + b.toString(16);
        }
    }
    return result;
}

// ── bare-bones JSON request helper ──
function req(method, url, body, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, url + (url.indexOf('?') < 0 ? '?' : '&') + 'key=' + API_KEY, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.timeout = 8000;
    xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) return;
        var data = null;
        try { data = JSON.parse(xhr.responseText); } catch (e) {}
        cb(xhr.status, data);
    };
    try { xhr.send(body ? JSON.stringify(body) : null); }
    catch (e) { cb(0, null); }
}

// ── Firestore field encoding helpers (flat docs only) ──
function fsFields(obj) {
    var f = {};
    for (var k in obj) {
        if (!obj.hasOwnProperty(k)) continue;
        var v = obj[k];
        if (typeof v === 'number')       f[k] = { integerValue: String(Math.round(v)) };
        else if (typeof v === 'boolean') f[k] = { booleanValue: v };
        else                             f[k] = { stringValue: String(v == null ? '' : v) };
    }
    return f;
}
function fsRead(doc) {
    var out = {};
    var f = (doc && doc.fields) || {};
    for (var k in f) {
        if (!f.hasOwnProperty(k)) continue;
        var v = f[k];
        if (v.integerValue !== undefined)      out[k] = parseInt(v.integerValue, 10) || 0;
        else if (v.doubleValue !== undefined)  out[k] = v.doubleValue;
        else if (v.booleanValue !== undefined) out[k] = !!v.booleanValue;
        else                                   out[k] = v.stringValue || '';
    }
    return out;
}

var Account = {
    user: null,        // lowercase account id ('' when logged out)
    name: null,        // display capitalisation as typed at sign-up
    pass: null,        // sha256("user:password") — proves writes to the rules
    _cloudSave: null,  // last fetched cloud save state (json string) or null

    // Restore the previous session from localStorage (no network).
    init: function () {
        if (this.user !== null) return;   // already initialised
        this.user = '';
        try {
            var raw = cc.sys.localStorage.getItem(LS_ACCOUNT);
            if (raw) {
                var a = JSON.parse(raw);
                if (a && a.u && a.p) { this.user = a.u; this.name = a.n || a.u; this.pass = a.p; }
            }
        } catch (e) {}
    },

    isLoggedIn: function () { this.init(); return !!this.user; },

    // Login, or sign up automatically if the username is unused.
    // cb(errMessage|null, {isNew:bool})
    login: function (username, password, cb) {
        var self = this;
        var u = String(username || '').trim().toLowerCase();
        var pw = String(password || '');
        if (!/^[a-z0-9_]{2,16}$/.test(u)) { cb('Username: 2-16 letters / numbers / _'); return; }
        if (pw.length < 3) { cb('Password: at least 3 characters'); return; }
        var hash = sha256(u + ':' + pw);
        if (!hash) { cb('Password contains unsupported characters.'); return; }

        var finish = function (isNew, displayName) {
            self.user = u; self.name = displayName || username; self.pass = hash;
            try {
                cc.sys.localStorage.setItem(LS_ACCOUNT,
                    JSON.stringify({ u: u, n: self.name, p: hash }));
            } catch (e) {}
            // pull the cloud save so the menu knows whether to offer CONTINUE
            self.refreshSave(function () { cb(null, { isNew: isNew }); });
        };

        req('GET', BASE + '/users/' + u, null, function (status, data) {
            if (status === 200) {
                var rec = fsRead(data);
                if (rec.pass === hash) finish(false, rec.name);
                else cb('Wrong password for "' + u + '".');
            } else if (status === 404) {
                // new player → create the account doc
                req('POST', BASE + '/users?documentId=' + u,
                    { fields: fsFields({ name: String(username).trim(), pass: hash, created: Date.now() }) },
                    function (st2) {
                        if (st2 === 200) finish(true, String(username).trim());
                        else cb(st2 === 409 ? 'Name was just taken — try logging in.' :
                                              'Could not create the account (offline?).');
                    });
            } else {
                cb('Could not reach the server (offline?).');
            }
        });
    },

    logout: function () {
        this.user = ''; this.name = null; this.pass = null; this._cloudSave = null;
        try { cc.sys.localStorage.removeItem(LS_ACCOUNT); } catch (e) {}
    },

    // ── cloud / local save ────────────────────────────────────
    _localKey: function () { return LS_SAVE + (this.user || 'guest'); },

    // Re-fetch the cloud save into the cache. cb always called.
    refreshSave: function (cb) {
        var self = this;
        if (!this.user) { this._cloudSave = null; if (cb) cb(); return; }
        req('GET', BASE + '/saves/' + this.user, null, function (status, data) {
            if (status === 200 || status === 404) {
                // authoritative cloud answer — it overrides any stale local mirror
                self._cloudSave = (status === 200) ? (fsRead(data).state || null) : null;
                if (self._cloudSave === '') self._cloudSave = null;
                if (!self._cloudSave) {
                    try { cc.sys.localStorage.removeItem(self._localKey()); } catch (e) {}
                }
            } else {
                self._cloudSave = null;   // offline — keep the local mirror as fallback
            }
            if (cb) cb();
        });
    },

    // Is there a resumable run for the current identity?
    hasSave: function () {
        this.init();
        var raw = this._cloudSave;
        if (!raw) { try { raw = cc.sys.localStorage.getItem(this._localKey()); } catch (e) {} }
        if (!raw) return false;
        try {
            var s = JSON.parse(raw);
            if (!s || s.gameOver || s.finalCleared) return false;   // dead/finished runs don't resume
            // only offer CONTINUE when there's actual progress to resume
            return !!(s.completed && (s.completed.father || s.completed.professor || s.completed.niupai)) ||
                   (s.lives < 3) || !!(s.seen && s.seen.intro_girl);
        } catch (e) { return false; }
    },

    // Snapshot StoryState — local mirror always, cloud when logged in.
    saveProgress: function () {
        this.init();
        var json = JSON.stringify(StoryState.serialize());
        try { cc.sys.localStorage.setItem(this._localKey(), json); } catch (e) {}
        if (!this.user) return;
        this._cloudSave = json;
        req('PATCH', BASE + '/saves/' + this.user,
            { fields: fsFields({ state: json, pass: this.pass, updated: Date.now() }) },
            function () {});   // fire-and-forget; local mirror is the fallback
    },

    // Hydrate StoryState from the best available save. cb(ok)
    loadProgress: function (cb) {
        this.init();
        var self = this;
        var applyRaw = function (raw) {
            if (!raw) { cb(false); return; }
            var s = null;
            try { s = JSON.parse(raw); } catch (e) {}
            cb(StoryState.hydrate(s));
        };
        if (this.user) {
            this.refreshSave(function () {
                if (self._cloudSave) { applyRaw(self._cloudSave); return; }
                var raw = null;
                try { raw = cc.sys.localStorage.getItem(self._localKey()); } catch (e) {}
                applyRaw(raw);
            });
        } else {
            var raw = null;
            try { raw = cc.sys.localStorage.getItem(this._localKey()); } catch (e) {}
            applyRaw(raw);
        }
    },

    // The run ended (game over or finale) — drop the resume point.
    clearSave: function () {
        this.init();
        try { cc.sys.localStorage.removeItem(this._localKey()); } catch (e) {}
        if (!this.user) return;
        this._cloudSave = null;
        req('PATCH', BASE + '/saves/' + this.user,
            { fields: fsFields({ state: '', pass: this.pass, updated: Date.now() }) },
            function () {});
    },

    // ── global leaderboard (combined total across every game) ──
    // Upload the finished run's combined total if it beats the stored best.
    submitScore: function (route) {
        this.init();
        var self = this;
        // guests aren't ranked; neither is any run that EVER used Hero Mode
        // (usedHero is stamped into the save, so flipping the toggle off later doesn't help)
        if (!this.user || StoryState.heroMode || StoryState.usedHero) return;
        var total = StoryState.totalScore();
        req('GET', BASE + '/leaderboard/' + this.user, null, function (status, data) {
            var best = (status === 200) ? (fsRead(data).total || 0) : 0;
            if (status === 200 && total <= best) return;   // keep the better run
            req('PATCH', BASE + '/leaderboard/' + self.user,
                { fields: fsFields({
                    name:    self.name || self.user,
                    total:   total,
                    scores:  JSON.stringify(StoryState.scores || {}),
                    route:   route || '',
                    updated: Date.now(),
                    pass:    self.pass,
                }) },
                function () {});
        });
    },

    // Top-10 combined totals. cb(errMessage|null, rows [{name,total,route}])
    fetchLeaderboard: function (cb) {
        req('POST', BASE.replace('/documents', '/documents:runQuery'), {
            structuredQuery: {
                from:    [{ collectionId: 'leaderboard' }],
                orderBy: [{ field: { fieldPath: 'total' }, direction: 'DESCENDING' }],
                limit:   10,
            },
        }, function (status, data) {
            if (status !== 200 || !data || !data.length) {
                cb(status === 200 ? null : 'offline', []);
                return;
            }
            var rows = [];
            for (var i = 0; i < data.length; i++) {
                if (!data[i].document) continue;   // runQuery may return a bare readTime entry
                var rec = fsRead(data[i].document);
                rows.push({ name: rec.name || '???', total: rec.total || 0, route: rec.route || '' });
            }
            cb(null, rows);
        });
    },
};

module.exports = Account;
