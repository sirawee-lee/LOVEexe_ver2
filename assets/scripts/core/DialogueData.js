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
                { speaker: 'Prof. Hung', text: "AH — the suitor reaches Delta! *dramatic cape swirl that is, again, indoors and entirely capeless*" },
                { speaker: 'EECS Boy',   text: "(He swirled. There is no cape. I have so many questions and exactly zero answers.)" },
                { speaker: 'Prof. Hung', text: "Here we do not CATCH love — we TYPE it into being! Words rain from the sky: html, css, js, the sacred syntax." },
                { speaker: 'Prof. Hung', text: "Blast each word by typing it before it lands. Miss three, and your courtship compiles with ERRORS!" },
                { speaker: 'EECS Boy',   text: "(Falling code words. Type fast or fail. ...Four years of 3 a.m. labs — this is my moment.)" },
                { speaker: 'Prof. Hung', text: "Clear all five waves; prove your fingers — and your heart — never falter. Hands ready... BEGIN!" },
            ],
        },
        professor_post_win: {
            lines: [
                { speaker: 'Prof. Hung', text: "MAGNIFICENT! Five waves, not one dropped word. Your WPM rivals your devotion!" },
                { speaker: 'EECS Boy',   text: "(Called magnificent for typing fast. Putting this on my résumé. ...Also, when did I get a bow tie?)" },
                { speaker: 'Prof. Hung', text: "Speed without panic. Precision under pressure. THAT, my boy, is character." },
                { speaker: 'Prof. Hung', text: "Now GO. Mei waits at the library — has been, longer than she'd admit. Type your way to her, hero. CURTAIN!" },
            ],
        },
        professor_post_lose: {
            lines: [
                { speaker: 'Prof. Hung', text: "TRAGEDY! The words buried you — a syntax error of the SOUL!" },
                { speaker: 'EECS Boy',   text: "(Lost a typing game. As an EECS student. The shame is... remarkably thorough.)" },
                { speaker: 'Prof. Hung', text: "But every great romance has a second draft! Steady those fingers and return — the keyboard forgives, unlike deadlines." },
            ],
        },
        professor_done: {
            lines: [
                { speaker: 'Prof. Hung', text: "The fast-fingered one returns! Syntax flawless, heart steady. Off to the library — your stage awaits. *approving swirl*" },
                { speaker: 'EECS Boy',   text: "(Still swirling. I've made peace with the cape being purely spiritual.)" },
            ],
        },

        // ── Niu Pai (XCB food stall) → market dash (placeholder) ──
        niupai_pre_mei: {
            lines: [
                { speaker: 'Narrator',     text: 'The algorithm exam at noon was the hardest one anyone had ever seen. It even ran almost an hour late before it finally ended.' },
                { speaker: 'Narrator',     text: 'Everyone left the classroom with heavy hearts.' },
                { speaker: 'EECS Boy',     text: '...' },
                { speaker: 'Narrator',     text: 'EECS Boy notices Mei lying face-down on her desk, completely drained.' },
                { speaker: 'EECS Boy',     text: 'She probably messed up the exam...' },
                { speaker: "Mei's Friend", text: "She doesn't want to leave... Lunch break ended a long time ago, too. This really isn't good." },
                { speaker: 'Narrator',     text: 'EECS Boy remembers how Mei once helped him find his missing OS assignment.' },
                { speaker: 'Narrator',     text: 'He decides that now, it is his turn to cheer her up.' },
                { speaker: 'EECS Boy',     text: 'I can go buy her something to eat...' },
                { speaker: "Mei's Friend", text: 'Who are you?' },
                { speaker: 'EECS Boy',     text: "I'm her friend. (BS) Do you know what Mei likes?" },
                { speaker: "Mei's Friend", text: "Hmm... She likes things that are sweet and smell nice... Food that makes you feel warm when you eat it." },
                { speaker: 'EECS Boy',     text: 'Got it!' },
            ],
        },
        niupai_pre_game: {
            lines: [
                {
                    speaker: 'Narrator',
                    text: "With Mei's friend's clue in mind, EECS Boy heads to the food court, searching for something sweet, warm, and comforting."
                },
                {
                    speaker: 'EECS Boy',
                    text: "(Sweet, smells nice, and makes you feel warm... Okay. That sounds simple enough.)"
                },
                {
                    speaker: 'Narrator',
                    text: "But the food court feels strangely tense. Students are guarding their trays, and a group of black dogs prowls near the XCB McDonald's."
                },
                {
                    speaker: 'Stall Owner',
                    text: "Ay, kid! If you're heading for McDonald's, watch yourself. The Black Dogs have been causing trouble all afternoon."
                },
                {
                    speaker: 'EECS Boy',
                    text: "Black Dogs...?"
                },
                {
                    speaker: 'Stall Owner',
                    text: "A nasty pack of strays. They bark, shove, steal food... pretty much anything to scare people off."
                },
                {
                    speaker: 'Narrator',
                    text: "Near the entrance, EECS Boy spots a small dog standing her ground, glaring at the Black Dogs."
                },
                {
                    speaker: 'Stall Owner',
                    text: "That's Niu Pai. She's been trying to get through, but those Black Dogs keep blocking the way."
                },
                {
                    speaker: 'EECS Boy',
                    text: "(A food court. A brave dog. A gang of Black Dogs. My EECS degree prepared me for precisely none of this.)"
                },
                {
                    speaker: 'Stall Owner',
                    text: "Help Niu Pai get the right order through that crowd, and she'll stick with you. That dog never forgets a friend."
                },
                {
                    speaker: 'EECS Boy',
                    text: "Alright, Niu Pai. Operation Happy Meal. We get the food, dodge the Black Dogs, and bring something warm back to Mei."
                },
                {
                    speaker: 'Niu Pai',
                    text: "Woof!"
                },
            ]

        },
        niupai_post_game: {
            // will triggered if player / niupai not defeated bring the food to Mei first.
            lines: [
                { speaker: 'EECS Boy', text: " (Panting) Oh my god... Hope this food is correct..." },
                { speaker: 'Narrator', text: "EECS boy and Niu Pai headed to the EECS building" },
            ],
        },
        niupai_post_mei_correct: {
            // correct food, Mei accepts and Niu Pai joins you.
            lines: [
                { 
                    speaker: 'Narator', 
                    text: "EECS peeked through the window, Mei was still there but her friend was gone."
                },
                { 
                    speaker: 'EECS boy', 
                    text: "(Opened the door, went to her seat)"
                },
                { 
                    speaker: 'EECS boy', 
                    text: "Hello... I brought you something to eat. I hope it's what you like."
                },
                { 
                    speaker: 'Mei', 
                    text: "Ok... But why?" 
                },
                {
                    speaker: 'EECS Boy',
                    text: "I know you had a tough exam today... I just wanted to cheer you up. I hope this helps."
                },
                {
                    speaker: 'Mei',
                    text: "(Checks the bag, inside of it is an Apple Pie)"
                },
                {
                    speaker: 'Mei',
                    text: "This is... actually my favorite. How did you know?"
                },
                {
                    speaker: 'EECS boy',
                    text: "Magic. Just a wild guess. I'm glad you like it. (Smiles)"
                },
                {
                    speaker: 'Narrator',
                    text: "Mei takes a bite, and her eyes widen. A small smile creeps onto her face."
                },
                {
                    speaker: 'Mei',
                    text: "Thank you... This is really sweet of you. I don't know what to say."
                },
                {
                    speaker: 'EECS Boy',
                    text: "You're welcome. I'm just happy to see you smile. Have a nice day!"
                },
                {
                    speaker: 'Narrator',
                    text: "(EECS boy and Niu Pai headed out the EECS building)"
                },
                {
                    speaker: 'EECS Boy',
                    text: "(Headpat the dog) Good Boy!"
                },
                {
                    speaker: 'Niu Pai',
                    text: "*WOOF!* (Translation: 'We did it, partner!')"
                },
                {
                    speaker: 'Narrator',
                    text: "Niu Pai follows you loyally from now on, you really did a good job. You are forever friends!"
                }
            ],
        },
        niupai_post_mei_wrong: {
            // incorrect food, niupai go back XCB to wait for you.
            lines: [
                { speaker: 'Narrator', text: "EECS peeked through the window, Mei was still there but her friend was gone." },
                { speaker: 'EECS Boy', text: "(Opened the door, went to her seat)" },
                { speaker: 'EECS Boy', text: "Hello... I brought you something to eat. I hope it's what you like." },
                { speaker: 'Mei',      text: "Ok... But why?" },
                { speaker: 'EECS Boy', text: "I know you had a tough exam today... I just wanted to cheer you up. I hope this helps." },
                { speaker: 'Mei',      text: "(Checks the bag, not what she wants)" },
                { speaker: 'Mei',      text: "Thanks... I don't have much of an appetite right now, but I appreciate the thought." },
                { speaker: 'Mei',      text: "I think I just want to be alone for a bit. Maybe I'll eat later." },
                { speaker: 'EECS Boy', text: "Sorry to bother you. I'll try again!" },
                { speaker: 'Niu Pai',  text: "*WOOF.* (Translation: 'Back to the food court, let's try again!')" },
                { 
                    speaker: 'Narrator', text: "You didn't win the game, but you didn't lose heart either. Try again!" ,
                    choices: [
                        {text: 'Never Give Up!', affinityDelta: 0, tone: "pink"}
                    ]
                },
            ],
        },
        niupai_post_win: {
            lines: [
                { speaker: 'EECS Boy',    text: "Order secured, dignity mostly intact. All yours, girl — fresh off the XCB grill." },
                { speaker: 'Niu Pai',     text: "*demolishes it in four seconds flat, then plants herself at your side like she's been assigned to you by destiny*" },
                { speaker: 'Stall Owner', text: "Ha! She's chosen you, kid. Niu Pai goes where YOU go now — loyalty like that, you can't buy." },
                { speaker: 'EECS Boy',    text: "(Came to campus chasing a girl, leaving with a dog. Honestly? Great trade.) Two of Mei's favorites won over — let's move, partner." },
            ],
        },
        niupai_post_lose: {
            // player / niupai defeated.
            lines: [
                { speaker: 'sutheman86', text: "Oh no that's really tough..." },
                { speaker: 'Niu Pai', text: "*WHINES*)"},
                { speaker: 'Narrator', text: "Niu Pai wasn't happy... and he walked away."}
            ],
        },
        niupai_done: {
            lines: [
                { speaker: 'Niu Pai', text: "*BORK!* *trots a happy circle around your legs, then glances pointedly at the golden arches* (Translation: 'again?')" },
                { speaker: 'EECS Boy', text: "(My emotional support quadruped. My wallet fears her. My heart adores her.)" },
            ],
        },

        // ── Mei at the lake (final boss, gated) ───────────────
        mei_locked: {
            lines: [
                { speaker: 'Mei', text: "Hey — you actually found me, right outside the library. Romantic, in a nerdy way. But you skipped a few side quests, EECS boy. 😏" },
                { speaker: 'EECS Boy', text: "(She called it side quests. She GETS me. Marry her immediately— okay, slow down, brain.)" },
                { speaker: 'Mei', text: "Three people made me who I am, and they all want a word with you first." },
                { speaker: 'Mei', text: "My dad's down by the lake — pass his rhythm test. Niu Pai's at the food stalls up north — win the dog over. And Prof. Hung at Delta wants to see how fast your fingers really are." },
                { speaker: 'Mei', text: "Clear all three. THEN come back here. I promise the boss music is worth it. 💕" },
            ],
        },
        mei_pre: {
            lines: [
                { speaker: 'Mei', text: "You actually did it. My dad nodded — which is basically an earthquake. The professor swirled. Even Niu Pai picked you." },
                { speaker: 'EECS Boy', text: "(All achievements unlocked. One final stage. Don't crash now, heart.exe. Please.)" },
                { speaker: 'Mei', text: "I had a hundred reasons to keep my guard up. You quietly took them apart, one challenge at a time." },
                {
                    speaker: 'Mei', text: "So here we are. Right outside the library, golden-hour light, the whole campus winding down around us — dramatic lighting I did NOT arrange but will absolutely take credit for. Last thing — I want to see if we're really in sync, heart to heart. You ready?",
                    choices: [
                        { text: '"Compiled, optimized, zero warnings. Let\'s go."', affinityDelta: 15, tone: 'pink', jumpTo: 'mei_pre_accept' },
                        { text: '"Define \'ready\'... my hands are kind of shaking."', affinityDelta: -5, tone: 'grey', jumpTo: 'mei_pre_nervous' },
                    ]
                },
            ],
        },
        mei_pre_accept: {
            lines: [
                { speaker: 'Mei', text: "Zero warnings? Cocky. When did you get smooth? ...I kind of love it." },
                { speaker: 'Mei', text: "Okay, confident heart. Eyes on me, follow the beat — and don't you dare drop it now. ♥" },
                { speaker: 'EECS Boy', text: "(She respects it. Adrenaline at runtime. Final stage — let's give her a flawless build.)" },
            ],
        },
        mei_pre_nervous: {
            lines: [
                { speaker: 'Mei', text: "Hey. Look at me. The fact that you're shaking is exactly how I know you mean it." },
                { speaker: 'Mei', text: "Just breathe. Same as the river, remember? I'll keep time with you. Stay close and follow my heart. ♥" },
                { speaker: 'EECS Boy', text: "(...She said it like it's easy. Okay. Breathe. Sync up. I've got this.)" },
            ],
        },
        mei_after: {
            lines: [
                { speaker: 'Mei', text: "...There it is. Same beat, same heart. We were in perfect sync, the whole way through." },
                { speaker: 'EECS Boy', text: "(All semester I've been debugging everything but the one thing that mattered. And it just... compiled.)" },
                { speaker: 'Mei', text: "You crossed a whole campus, charmed my impossible dad, adopted a dog, and survived Hung — all to stand here with me. So we're official now. On the record, before you overthink it into a thesis." },
                { speaker: 'EECS Boy', text: "💗 heart.exe — compiled successfully. 0 errors, 0 warnings, 1 girlfriend. Best run of my life." },
                { speaker: 'Mei', text: "...Did you just narrate your feelings as a build log? *laughs* Yeah. I'm keeping you. Come here, you nerd. 💕" },
            ],
        },

        // ── Mei roaming chatter (locked, after the first quest reminder) ──
        mei_roam: {
            lines: [
                { speaker: 'Mei', text: "Caught me mid-lap — I think better when I'm walking. 🚶" },
                { speaker: 'Mei', text: "You've still got people to win over, you know. My dad at the lake, Niu Pai up at the food stalls, Hung at Delta." },
                { speaker: 'EECS Boy', text: "(She patrols this walkway like she owns it. ...Noted. Get moving, EECS boy.)" },
            ],
        },

        // ── Feeding Niu Pai (Phase 3) ─────────────────────────
        dog_feed_first: {
            lines: [
                { speaker: 'EECS Boy', text: "Here, Niu Pai. One premium sausage, fresh off the XCB grill. A peace offering from a humble engineer." },
                { speaker: 'Niu Pai', text: "*INHALES it, then spins in a delighted circle, tail at unsafe RPM*" },
                { speaker: 'EECS Boy', text: "(Best decision I've made all semester. And I built a working 4-bit ALU last week.)" },
            ],
        },
        dog_feed_again: {
            lines: [
                { speaker: 'Niu Pai', text: "*already sitting at attention before you even reach into the bag* (the audacity. the precision.)" },
                { speaker: 'EECS Boy', text: "You're not even hungry, you're just a tiny extortion racket in a fur coat." },
                { speaker: 'Niu Pai', text: "*BORK.* (Translation: 'pay up, nerd')" },
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
                {
                    speaker: '', text: "Ready to play?",
                    choices: [
                        { text: "▶  Play", affinityDelta: 0, tone: 'pink' },
                    ]
                },
            ],
        },

    },

    endings: {
        // Filled in Phase 4.
    },
};
