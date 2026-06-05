'use strict';

// DialogueData — pure story content. DialogueManager walks these trees.
//
//   line   : { speaker, text, choices? }
//   choice : { text, affinityDelta, tone?, jumpTo?, index? }
//            tone   'pink' (positive) or 'grey' (negative); defaults by the
//                   sign of affinityDelta if omitted.
//            jumpTo  continue the flow at another dialogue id after the choice.
//
// Flow ids used by GameController:
//   intro_girl (+bold/shy)                  — first meeting with Mei (opening)
//   <npc>_pre / _post_win / _post_lose      — before / after each challenge
//   <npc>_done                              — talking again after a win
//   mei_locked / mei_pre (+accept/nervous) / mei_after
//   dog_feed_first / dog_feed_again         — feeding Niu Pai (Phase 3)

module.exports = {
    dialogues: {

        // ── Opening: meeting Mei ──────────────────────────────
        intro_girl: {
            lines: [
                { speaker: '???',      text: '...Hey! Wait up — did you drop this USB drive? It was sitting right by the edge of the lake.' },
                { speaker: 'EECS Boy', text: 'My OS assignment?! The ONLY copy! You just saved my entire semester.' },
                { speaker: '???',      text: 'Haha. You went pale for a second there. Must be life-or-death stuff.' },
                { speaker: 'EECS Boy', text: 'You have no idea. I owe you one. ...Or, realistically, several.' },
                { speaker: 'Mei',      text: "I'm Mei. People around here usually owe ME favors. You're a refreshing change.",
                  choices: [
                    { text: '"Then let me earn one back — can I get your contact?"', affinityDelta: 10, tone: 'pink', jumpTo: 'intro_bold' },
                    { text: '"Uh... thanks. I should probably go."',                 affinityDelta: -5, tone: 'grey', jumpTo: 'intro_shy' },
                  ] },
            ],
        },
        intro_bold: {
            lines: [
                { speaker: 'Mei', text: 'Bold. I like that. But contacts are earned, EECS boy.' },
                { speaker: 'Mei', text: 'Win over the people who matter to me. My dad keeps rhythm down by the lake. Niu Pai rules the food stall up north.' },
                { speaker: 'Mei', text: 'And Professor Hung is east at Delta Building — he tests everyone. Any order you like.' },
                { speaker: 'Mei', text: "Prove yourself to all three... then meet me up at the library. I'll be waiting. 💕" },
            ],
        },
        intro_shy: {
            lines: [
                { speaker: 'Mei',      text: '...Okay then. Bye, I guess.' },
                { speaker: 'EECS Boy', text: '(Smooth. Real smooth. She is walking away.)' },
                { speaker: 'EECS Boy', text: "(...Maybe I can still fix this. Her dad is by the river — I'll start there.)" },
            ],
        },

        // ── Mr. Wang (river) → RHYTHM game (Osu) ──────────────
        father_pre: {
            lines: [
                { speaker: 'Mr. Wang', text: "So. You're the one circling my daughter like a moth around a soldering iron." },
                { speaker: 'EECS Boy', text: "(He's sitting by the river like a final boss with a fishing license. Stay calm. Stay calm.)" },
                { speaker: 'Mr. Wang', text: "I've fished this lake forty years. The water keeps an honest rhythm. People? People fake it." },
                { speaker: 'Mr. Wang', text: "So I'll listen to YOUR rhythm. Tap to the pulse of the water — steady, on the beat. Rush it or drag it, and I'll know exactly what kind of man you are." },
                { speaker: 'EECS Boy', text: "(My pulse is currently running at 9000 BPM. This is fine. Everything is fine.)" },
                { speaker: 'Mr. Wang', text: "Feel the current, EECS boy. Show me your heart keeps time. Begin." },
            ],
        },
        father_post_win: {
            lines: [
                { speaker: 'Mr. Wang', text: "...Steady. Honest. You didn't drop a single beat. The river approves of you." },
                { speaker: 'EECS Boy', text: "(THE RIVER APPROVES. Put that on my resume immediately.)" },
                { speaker: 'Mr. Wang', text: "A man who keeps the beat under pressure keeps his promises too. But there are two others to win over — Niu Pai at the food stall up north, and that dramatic professor at Delta." },
                { speaker: 'Mr. Wang', text: "Earn their nod too. And EECS boy... don't make her cry. I have a very long fishing rod." },
            ],
        },
        father_post_lose: {
            lines: [
                { speaker: 'Mr. Wang', text: "Off-beat. Rushing, then dragging. Your heart was sprinting when it should've been breathing." },
                { speaker: 'EECS Boy', text: "(In my defense, your stare alone added a full second of latency.)" },
                { speaker: 'Mr. Wang', text: "Breathe. Listen to the water before you move. Come back when your heart's steady — the lake's patient. I'm... less so." },
            ],
        },
        father_done: {
            lines: [
                { speaker: 'Mr. Wang', text: "Still in rhythm, I see. Good. ...She's lucky, that girl. Don't let me regret saying so." },
                { speaker: 'EECS Boy', text: "(Father-in-law affinity: trending positive. I'm calling that a deploy.)" },
            ],
        },

        // ── Prof. Hung (Delta) → CATCH / dress-up game ────────
        professor_pre: {
            lines: [
                { speaker: 'Prof. Hung', text: "AH. The suitor arrives at Delta Building! *dramatic cape swirl that is somehow happening indoors*" },
                { speaker: 'EECS Boy',   text: "(He swirled. He doesn't even have a cape. HOW did he swirl.)" },
                { speaker: 'Prof. Hung', text: "Love is chaos raining from the sky — flowers and garbage alike, all at once! You must CATCH what matters and let the rest fall away." },
                { speaker: 'Prof. Hung', text: "Catch the roses, the sharp shirt, the open heart. Dodge the junk — the bad cologne, the ego, the excuses. Dress for the soul you wish to be!" },
                { speaker: 'EECS Boy',   text: "(Catch the good, dodge the bad. Like code review, but the bugs fall on your head.)" },
                { speaker: 'Prof. Hung', text: "Hands ready! Heart open! The sky is falling — BEGIN!" },
            ],
        },
        professor_post_win: {
            lines: [
                { speaker: 'Prof. Hung', text: "MAGNIFICENT! You caught what mattered and let the junk fall like a dropped semester." },
                { speaker: 'EECS Boy',   text: "(I have never been called magnificent. I'd like it on a certificate, please. ...Also, when did I get a bow tie?)" },
                { speaker: 'Prof. Hung', text: "Anyone can grab everything. A wise heart knows what to keep. That, my boy, is character." },
                { speaker: 'Prof. Hung', text: "Now GO. Mei waits up in the library — has been, longer than she'd admit. Do not keep a heart like that refreshing her notifications. CURTAIN!" },
            ],
        },
        professor_post_lose: {
            lines: [
                { speaker: 'Prof. Hung', text: "Tragedy! You caught the garbage and dropped the treasure! A wardrobe malfunction of the SOUL!" },
                { speaker: 'EECS Boy',   text: "(I caught a falling banana peel with great confidence. That was, in hindsight, not the move.)" },
                { speaker: 'Prof. Hung', text: "But every great romance has a second act! Steady your eyes, catch what matters — and return to me, hero. The sky is endlessly generous with chaos." },
            ],
        },
        professor_done: {
            lines: [
                { speaker: 'Prof. Hung', text: "The magnificent one returns! Still impeccably sorted, inside and out. Off with you — your stage is the lakeside now. *approving swirl*" },
                { speaker: 'EECS Boy',   text: "(He swirled again. I'm starting to think the cape is just spiritual.)" },
            ],
        },

        // ── Niu Pai (XCB food stall) → market dash (placeholder) ──
        niupai_pre: {
            lines: [
                { speaker: 'Stall Owner', text: "Kid! KID — over here! That black dog, Niu Pai? She chased off a bag-snatcher behind the XCB stalls, and now his three nasty strays have HER cornered!" },
                { speaker: 'EECS Boy',    text: "(A damsel in distress. Except the damsel is a dog. ...Somehow this is the bravest thing I'll do all semester.)" },
                { speaker: 'Stall Owner', text: "She's the gutsiest mutt on campus, but three-on-one ain't fair. Help her out, and you'll have a friend who'd walk through fire for you." },
                { speaker: 'EECS Boy',    text: "Hang on, Niu Pai — backup's coming! (Mei said win over the ones who matter. Time to be a hero.)" },
            ],
        },
        niupai_post_win: {
            lines: [
                { speaker: 'EECS Boy',    text: "Easy now — I've got you. Those strays won't bother you again." },
                { speaker: 'Niu Pai',     text: "*limps over, headbutts your shin, then plants herself at your side like she's been assigned to you by destiny*" },
                { speaker: 'Stall Owner', text: "Ha! She's chosen you, kid. Niu Pai goes where YOU go now — that kind of loyalty, you can't buy." },
                { speaker: 'EECS Boy',    text: "(Came to campus chasing a girl, leaving with a dog. ...Honestly? Great trade.) Come on, partner — let's keep going." },
            ],
        },
        niupai_post_lose: {
            lines: [
                { speaker: 'Stall Owner', text: "Agh — the strays scattered and Niu Pai bolted before you reached her! She's okay, but she's not sure of you yet. Catch your breath and try again." },
                { speaker: 'EECS Boy',    text: "(Failed a dog rescue. New personal low. Re-running it — nobody leaves Niu Pai behind.)" },
            ],
        },
        niupai_done: {
            lines: [
                { speaker: 'Niu Pai',  text: "*BORK!* *does a triumphant victory lap around your legs* (Translation: 'still got your back, nerd')" },
                { speaker: 'EECS Boy', text: "(My emotional support quadruped, my bravest wingman. Best decision of the whole semester.)" },
            ],
        },

        // ── Mei at the lake (final boss, gated) ───────────────
        mei_locked: {
            lines: [
                { speaker: 'Mei',      text: "Hey — you actually found me, right outside the library. Romantic, in a nerdy way. But you skipped a few side quests, EECS boy. 😏" },
                { speaker: 'EECS Boy', text: "(She called it side quests. She GETS me. Marry her immediately— okay, slow down, brain.)" },
                { speaker: 'Mei',      text: "Three people made me who I am, and they all want a word with you first." },
                { speaker: 'Mei',      text: "My dad's down by the lake — pass his rhythm test. Niu Pai runs the food stall up north — win the dog over. And Prof. Hung at Delta wants to see how you handle... falling objects." },
                { speaker: 'Mei',      text: "Clear all three. THEN come back here. I promise the boss music is worth it. 💕" },
            ],
        },
        mei_pre: {
            lines: [
                { speaker: 'Mei',      text: "You actually did it. My dad nodded — which is basically an earthquake. The professor swirled. Even Niu Pai picked you." },
                { speaker: 'EECS Boy', text: "(All achievements unlocked. One final stage. Don't crash now, heart.exe. Please.)" },
                { speaker: 'Mei',      text: "I had a hundred reasons to keep my guard up. You quietly took them apart, one challenge at a time." },
                { speaker: 'Mei',      text: "So here we are. Right outside the library, golden-hour light, the whole campus winding down around us — dramatic lighting I did NOT arrange but will absolutely take credit for. Last thing — I want to see if we're really in sync, heart to heart. You ready?",
                  choices: [
                    { text: '"Compiled, optimized, zero warnings. Let\'s go."', affinityDelta: 15, tone: 'pink', jumpTo: 'mei_pre_accept' },
                    { text: '"Define \'ready\'... my hands are kind of shaking."', affinityDelta: -5, tone: 'grey', jumpTo: 'mei_pre_nervous' },
                  ] },
            ],
        },
        mei_pre_accept: {
            lines: [
                { speaker: 'Mei',      text: "Zero warnings? Cocky. When did you get smooth? ...I kind of love it." },
                { speaker: 'Mei',      text: "Okay, confident heart. Eyes on me, follow the beat — and don't you dare drop it now. ♥" },
                { speaker: 'EECS Boy', text: "(She respects it. Adrenaline at runtime. Final stage — let's give her a flawless build.)" },
            ],
        },
        mei_pre_nervous: {
            lines: [
                { speaker: 'Mei',      text: "Hey. Look at me. The fact that you're shaking is exactly how I know you mean it." },
                { speaker: 'Mei',      text: "Just breathe. Same as the river, remember? I'll keep time with you. Stay close and follow my heart. ♥" },
                { speaker: 'EECS Boy', text: "(...She said it like it's easy. Okay. Breathe. Sync up. I've got this.)" },
            ],
        },
        mei_after: {
            lines: [
                { speaker: 'Mei',      text: "...There it is. Same beat, same heart. We were in perfect sync, the whole way through." },
                { speaker: 'EECS Boy', text: "(All semester I've been debugging everything but the one thing that mattered. And it just... compiled.)" },
                { speaker: 'Mei',      text: "You crossed a whole campus, charmed my impossible dad, adopted a dog, and survived Hung — all to stand here with me. So we're official now. On the record, before you overthink it into a thesis." },
                { speaker: 'EECS Boy', text: "💗 heart.exe — compiled successfully. 0 errors, 0 warnings, 1 girlfriend. Best run of my life." },
                { speaker: 'Mei',      text: "...Did you just narrate your feelings as a build log? *laughs* Yeah. I'm keeping you. Come here, you nerd. 💕" },
            ],
        },

        // ── Mei roaming chatter (locked, after the first quest reminder) ──
        mei_roam: {
            lines: [
                { speaker: 'Mei',      text: "Caught me mid-lap — I think better when I'm walking. 🚶" },
                { speaker: 'Mei',      text: "You've still got people to win over, you know. My dad at the lake, Niu Pai up at the food stalls, Hung at Delta." },
                { speaker: 'EECS Boy', text: "(She patrols this walkway like she owns it. ...Noted. Get moving, EECS boy.)" },
            ],
        },

        // ── Feeding Niu Pai (Phase 3) ─────────────────────────
        dog_feed_first: {
            lines: [
                { speaker: 'EECS Boy', text: "Here, Niu Pai. One premium sausage, fresh off the XCB grill. A peace offering from a humble engineer." },
                { speaker: 'Niu Pai',  text: "*INHALES it, then spins in a delighted circle, tail at unsafe RPM*" },
                { speaker: 'EECS Boy', text: "(Best decision I've made all semester. And I built a working 4-bit ALU last week.)" },
            ],
        },
        dog_feed_again: {
            lines: [
                { speaker: 'Niu Pai',  text: "*already sitting at attention before you even reach into the bag* (the audacity. the precision.)" },
                { speaker: 'EECS Boy', text: "You're not even hungry, you're just a tiny extortion racket in a fur coat." },
                { speaker: 'Niu Pai',  text: "*BORK.* (Translation: 'pay up, nerd')" },
                { speaker: 'EECS Boy', text: "(I am financially and emotionally owned by this dog. Fine. FINE. Here — don't tell Mr. Wang we ate his inventory.)" },
            ],
        },

        // ── Fallback when a challenge's minigame isn't wired/built ──
        minigame_unavailable: {
            lines: [
                { speaker: 'EECS Boy', text: "(...This challenge isn't quite ready yet. I'll come back to it later.)" },
            ],
        },

        // ── "Ready to play?" confirmation before a minigame (single button) ──
        ready_to_play: {
            lines: [
                { speaker: '', text: "Ready to play?",
                  choices: [
                    { text: "▶  Play", affinityDelta: 0, tone: 'pink' },
                  ] },
            ],
        },

    },

    endings: {
        // Filled in Phase 4.
    },
};
