// #region constants
const NUM_ROUNDS = 5;
const MIN_WINS_FOR_GOOD = 4;
const TIMEOUT_CHOICE = 99;
const CHOOSE_TIME_MILLIS = 7000;
const STATE_SHOWING_PREVIEW = 'SHOWING_PREVIEW';
const STATE_CHOOSING = 'CHOOSING';
const STATE_SHOWING_ASS = 'SHOWING_ASS';
const STATE_ROUND_RESULT = 'ROUND_RESULT';
const TITLE_REACTIONS = [
    ["garfield", 'media/garflex.webp'],
    ["permadeath", 'media/pepew.webp'],
    ["randomizer", 'media/pepew.webp'],
    ["reforged", 'media/pepew.webp'],
    ["the last of us", 'media/chatting.webp'],
    ["stellar blade", 'media/lookege.webp'],
    ["clair obscur", 'media/esquie.webp'],
    ["incomplete playthrough", 'media/flushed.webp'],
    ["first impressions", 'media/flushed.webp'],
    ["sharks and minnows", 'media/soyhowl.webp'],
    ["sea of thieves", 'media/soyhowl.webp'],
    ["still wakes the deep", 'media/soyhowl.webp'],
    ["rv there yet", 'media/rvhumping.webp'],
    ["gollum", 'media/pogollum.webp'],
    ["kingdom come", 'media/henrysmash.webp'],
    ["lucky tower", 'media/princess.webp'],
    ["harry potter", 'media/ps1ron.png'],
    ["resident evil 4", 'media/leondance.webp'],
]
// #endregion

// #region game state
let gameState;
let debugAllowed;
let queryParams;
let activeClipList;
let rounds;
let roundIndex;
let currentRound;
let choicePicked;
let wins;
let dailyWins;
let dailyRoundRes;
let lastDaily;
let playingDaily;
let today;
let tomorrow;
let previewPlayerPrevState;
let assPlayerPrevState;
let votingActive;
let chatClient;
let roundVotes;
// #endregion

// #region web elements
let introSection;
let gameSection;
let previewPlayer;
let assPlayer;
let previewPlayerContainer;
let assPlayerContainer;
let choice1;
let choice2;
let choice3;
let num;
let next;
let skip;
let loader;
let link;
let dailyResultContainer;
let startDailyBtn;
let dailyResult;
let dailyCountdown;
let reportBtn;
let choiceBtns;
let choiceVotes;
let countdownBar;
let titleReaction;
// #endregion

// #region init

function onYouTubeIframeAPIReady() {
    queryParams = new URLSearchParams(window.location.search);
    debugAllowed = window.location.hostname === 'localhost';
    initPlayers();
    initWebElements();
    initChatClient();
    loadDailyStats();
    document.getElementById('intro-clip-count').textContent = clips.length;
}

function initPlayers() {
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0)
    const width = Math.min(960, vw);
    const height = width * 0.5625;
    previewPlayer = new YT.Player('preview-player', {
        width,
        height,
        playerVars: {
            playsinline: 1,
            controls: 0,
        },
        events: {
            onStateChange: onPreviewPlayerStateChange
        }
    });

    assPlayer = new YT.Player('ass-player', {
        width,
        height,
        playerVars: {
            playsinline: 1,
            controls: 0,
        },
        events: {
            onStateChange: onAssPlayerStateChange
        }
    });
}

function onPreviewPlayerStateChange(event) {
    showLoaderIfNotReady(event);
    if (event.data === YT.PlayerState.PLAYING || event.data === YT.PlayerState.BUFFERING) {
        toggleChoiceButtons(false);
    }
    if (event.data === YT.PlayerState.ENDED && previewPlayerPrevState !== -1) {
        startChoosing();
    }
    if (event.data === YT.PlayerState.PLAYING) {
        showTitleReaction(event.target.getVideoData().title)
    }

    previewPlayerPrevState = event.data;
}

function onAssPlayerStateChange(event) {
    showLoaderIfNotReady(event);
    if (event.data === YT.PlayerState.ENDED && assPlayerPrevState !== -1) {
        endRound();
    }

    assPlayerPrevState = event.data;
}

function showLoaderIfNotReady(event) {
    if (event.data !== YT.PlayerState.PLAYING && event.data !== YT.PlayerState.ENDED) {
        show(loader);
    }
    else {
        hide(loader);
    }
}

function initWebElements() {
    introSection = document.getElementById('intro');
    gameSection = document.getElementById('game');
    previewPlayerContainer = document.getElementById('preview-player');
    assPlayerContainer = document.getElementById('ass-player');
    choice1 = document.getElementById("choice1");
    choice2 = document.getElementById("choice2");
    choice3 = document.getElementById("choice3");
    num = document.getElementById("num");
    next = document.getElementById("next");
    skip = document.getElementById("skip");
    endResults = document.getElementById('end-results');
    loader = document.getElementById("loader");
    link = document.getElementById("link");
    dailyResultContainer = document.getElementById("daily-result-container");
    dailyResult = document.getElementById("daily-result");
    dailyCountdown = document.getElementById("daily-countdown");
    startDailyBtn = document.getElementById("start-daily-btn");
    reportBtn = document.getElementById("report-btn");
    choiceBtns = Array.from(document.getElementsByClassName('choice-btn'));
    choiceVotes = Array.from(document.getElementsByClassName('choice-vote'));
    countdownBar = document.getElementById("countdown-bar");
    countdownBar.addEventListener("transitionend", () => {
        if (gameState === STATE_CHOOSING) {
            choose(null, TIMEOUT_CHOICE);
        }
    });
    titleReaction = document.getElementById("title-reaction");
}

// #endregion init

// #region main game logic
function changeState(newState) {
    console.log(`State: ${gameState} -> ${newState}`);
    gameState = newState;
}

function startDaily() {
    playingDaily = true;
    // Use today's clip snapshot, in case the clip list was changed during the day.
    const dailyClipList = dailyClipDate === today ? dailyClips : clips;
    const _rounds = generateDailyRounds(dailyClipList);
    startGame(_rounds, dailyClipList);
}

function startRegular() {
    playingDaily = false;
    const _rounds = generateRounds(NUM_ROUNDS, clips);
    startGame(_rounds, clips);
}

function startGame(_rounds, clipList) {
    hide(introSection);
    show(gameSection);
    votingActive = document.getElementById('activate-voting').checked;
    rounds = _rounds
    activeClipList = clipList
    console.log('starting game', rounds)
    roundIndex = 0
    wins = 0
    resetResultBoxes();

    connectChat();

    if (debugAllowed && queryParams.get("vid") && queryParams.get("time")) {
        startRound(makeDebugRound(queryParams.get("vid"), parseInt(queryParams.get("time"))))
    }
    else {
        startRound(rounds[0])
    }
}

function makeDebugRound(vid, time) {
    const clip = clips.find(c => c.vid === vid && c.time === time);
    return {
        "mainClip": {
            ...clip,
            "index": 1234,
            "isMain": true
        },
        "clips": [
            {
                "vid": "BaLSG_mAH6E",
                "time": 767,
                "duration": 4,
                "text": "old ass games all right we're ",
                "index": 8284
            },
            {
                ...clip,
                "index": 1234,
                "isMain": true
            },
            {
                "vid": "MZrUDCX7mEY",
                "time": 8314,
                "duration": 2,
                "text": "Move it, fat ass.",
                "index": 4064
            }
        ],
        "result": "NOT_PLAYED"
    }
}

function resetResultBoxes() {
    const resultContainer = document.getElementById('result-box-container');
    resultContainer.replaceChildren();
    for (let i = 0; i < NUM_ROUNDS; i++) {
        const res = document.createElement("div")
        res.classList.add('result-box');
        res.id = 'result' + i;
        resultContainer.appendChild(res);
    }
}

function generateRounds(numRounds, clipList, rng = null) {
    const generatedRounds = [];
    const usedClips = [];
    for (let i = 0; i < numRounds; i++) {
        const roundClips = [
            {
                ...pickRandomClip(usedClips, clipList, rng),
                isMain: true,
            },
            pickRandomClip(usedClips, clipList, rng),
            pickRandomClip(usedClips, clipList, rng),
        ]
        generatedRounds.push({
            mainClip: roundClips[0],
            clips: shuffle(roundClips, rng),
            result: 'NOT_PLAYED',
        });
    }
    return generatedRounds
}

function pickRandomClip(usedClips, clipList, rng) {
    let chosenIndex;
    let chosenClip;
    do {
        chosenIndex = getRandomInt(clipList.length, rng);
        chosenClip = clipList[chosenIndex];
    }
    while (usedClips.includes(chosenClip))

    usedClips.push(chosenClip)
    return {
        ...chosenClip,
        index: chosenIndex
    }
}

function startRound(round) {
    console.log('starting round', round);
    changeState(STATE_SHOWING_PREVIEW);
    currentRound = round;
    choicePicked = -1;

    startVoting();

    hide(assPlayerContainer);
    show(previewPlayerContainer);
    hide(titleReaction);
    stopCountdownBar();

    previewPlayer.loadVideoById({
        videoId: round.mainClip.vid,
        startSeconds: round.mainClip.time - 12,
        endSeconds: round.mainClip.time - 5,
    });
    assPlayer.cueVideoById({
        videoId: round.mainClip.vid,
        startSeconds: round.mainClip.time - 5,
        // usually show 7s past clip time, but some take a longer time to get to 'ass'. Max is 10s.
        endSeconds: round.mainClip.time + bounded(round.mainClip.duration || 0, 7, 10),
    });

    choiceBtns.forEach(e => e.classList.remove('correct', 'wrong', 'picked'));
    hide(next);
    hide(reportBtn);
    show(skip);
    toggleChoiceButtons(false);

    document.getElementById('result' + roundIndex).classList.add('picked')

    choice1.firstElementChild.textContent = '...' + round.clips[0].text + '...';
    choice2.firstElementChild.textContent = '...' + round.clips[1].text + '...';
    choice3.firstElementChild.textContent = '...' + round.clips[2].text + '...';
    num.textContent = `Clip #${round.mainClip.index + 1} / ${activeClipList.length}`;
    hide(link);
}

function showTitleReaction(title) {
    if (!title) return;
    const titleLower = title.toLowerCase();
    const reaction = TITLE_REACTIONS.find(r => titleLower.includes(r[0]));
    if (reaction) {
        const newSrc = reaction[1];
        if (titleReaction.src !== newSrc) {
            titleReaction.src = '';
            titleReaction.src = newSrc;
        }
        show(titleReaction);
    }
}

function startChoosing() {
    changeState(STATE_CHOOSING);
    toggleChoiceButtons(true);
    startCountdownBar();
}

function nextRound() {
    roundIndex++;
    if (roundIndex < NUM_ROUNDS) {
        startRound(rounds[roundIndex])
    }
    else {
        endGame();
    }
}

function skipRound() {
    previewPlayer.stopVideo();
    assPlayer.stopVideo();
    trackRoundResult(false);
    nextRound();
}

function choose(ele, index) {
    changeState(STATE_SHOWING_ASS);
    stopCountdownBar();
    if (ele) {
        ele.classList.add('picked');
    }
    choicePicked = index;
    hide(skip);
    hide(previewPlayerContainer);
    show(assPlayerContainer);
    toggleChoiceButtons(false);
    assPlayer.playVideo();
}

function startCountdownBar() {
    countdownBar.style.transition = "none";
    countdownBar.style.width = "100%";
    countdownBar.offsetWidth; // force layout/reflow
    countdownBar.style.transition = `width ${CHOOSE_TIME_MILLIS}ms linear`;
    countdownBar.style.width = "0%";
}

function stopCountdownBar() {
    countdownBar.style.transition = "none";
    countdownBar.style.width = "0%";
    countdownBar.offsetWidth;
}

function endRound() {
    if (gameState !== STATE_SHOWING_ASS) return;
    stopVoting();
    changeState(STATE_ROUND_RESULT);
    trackRoundResult(choicePicked !== TIMEOUT_CHOICE && currentRound.clips[choicePicked].isMain);

    hide(titleReaction);
    show(next);

    link.href = `https://youtu.be/${currentRound.mainClip.vid}?t=${currentRound.mainClip.time - 10}`;
    show(link);

    reportBtn.value = 'Report clip';
    reportBtn.disabled = false;
    show(reportBtn);
}

function trackRoundResult(win) {
    choiceBtns.forEach((e, i) => {
        e.classList.add(currentRound.clips[i].isMain ? 'correct' : 'wrong');
    });

    if (win) {
        currentRound.result = 'CORRECT';
        wins++;
    }
    else {
        currentRound.result = 'WRONG';
    }
    document.getElementById('result' + roundIndex).classList.add(
        win ? 'correct' : 'wrong'
    )
    document.getElementById('result' + roundIndex).classList.remove('picked');
}

function toggleChoiceButtons(enabled) {
    choiceBtns.forEach(e => e.disabled = !enabled);
}

function endGame() {
    hide(gameSection)
    show(introSection);
    endResults.textContent = `You got ${wins} / ${NUM_ROUNDS} asses right.`;
    endResults.classList.remove('good', 'bad');
    if (wins >= MIN_WINS_FOR_GOOD) {
        endResults.classList.add('good');
        playSound('media/assrehab.mp3');
    }
    else {
        endResults.classList.add('bad');
        playSound('media/megaassofhell.mp3');
    }
    show(endResults);

    if (playingDaily) {
        saveDailyStats();
        loadDailyStats();
        playingDaily = false;
    }

    disconnectChat();
}

function reportClip() {
    fetch(`https://assdle.com/api/report?vid=${currentRound.mainClip.vid}&time=${currentRound.mainClip.time}`, { method: 'POST' });
    reportBtn.value = 'Thanks!';
    reportBtn.disabled = true;
}

// #endregion main game logic

// #region daily

function loadDailyStats() {
    today = (debugAllowed && queryParams.get("today")) || new Date().toISOString().slice(0, 10);
    tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    lastDaily = localStorage.getItem("lastDaily");
    dailyWins = localStorage.getItem("dailyWins");
    const res = localStorage.getItem("dailyRoundRes");
    dailyRoundRes = res ? res.split(",").map(r => r === 'true') : null;

    if (lastDaily === today) {
        startDailyBtn.disabled = true;
        dailyResult.textContent = `You got ${dailyWins}/${NUM_ROUNDS} daily asses.`;
        updateDailyCountdown();
        setInterval(updateDailyCountdown, 200);
        show(dailyResultContainer);
    }
    else {
        hide(dailyResultContainer);
        startDailyBtn.disabled = false;
    }
}

function updateDailyCountdown() {
    const remainingMs = tomorrow - new Date();

    if (remainingMs <= 0) {
        dailyCountdown.textContent = 'NOW. Refresh.';
    }
    else {
        const totalSeconds = Math.floor(remainingMs / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        dailyCountdown.textContent = `${hours}h ${minutes}m ${seconds}s`
    }
}

function saveDailyStats() {
    localStorage.setItem("lastDaily", today);
    localStorage.setItem("dailyWins", wins);
    localStorage.setItem("dailyRoundRes", rounds.map(r => r.result === 'CORRECT'));
}

function shareDaily() {
    const roundColors = dailyRoundRes.map(r => r ? '🟩' : '🟥').join(' ')
    const shareText = `\
assdle 🍑 ${today}
${roundColors}
I got ${dailyWins}/${NUM_ROUNDS} daily asses`;
    navigator.clipboard.writeText(shareText);

    const shareBtn = document.getElementById("share-btn");
    shareBtn.textContent = 'Copied';
    setTimeout(() => {
        shareBtn.textContent = 'Share';
    }, 1000);
}

function generateDailyRounds(clipList) {
    let _rounds = fixedDailies[today];
    if (!_rounds) {
        // If no fixed daily rounds, use a fixed seed so everyone gets the same
        seedInput = today + '7';
        const seed = cyrb128(seedInput);
        const rng = sfc32(seed[0], seed[1], seed[2], seed[3]);
        _rounds = generateRounds(NUM_ROUNDS, clipList, rng);
    }
    return _rounds;
}

// #endregion daily

// #region chat integration
function initChatClient() {
    chatClient = new tmi.Client({
        channels: ['elajjaz']
    });

    chatClient.on('message', (channel, tags, message, self) => handleChatMessage(tags['display-name'], message));
}

function handleChatMessage(user, message) {
    if (gameState !== STATE_SHOWING_PREVIEW && gameState !== STATE_CHOOSING) return;
    if (message !== '1' && message !== '2' && message !== '3') return;

    const voteIndex = parseInt(message);
    currentRound.clips[voteIndex].votes++;
    roundVotes++;
    choiceVotes.forEach((e, i) => {
        const percentage = Math.round(100 * currentRound.clips[i].votes / roundVotes);
        e.textContent = `${percentage}%`;
        choiceBtns[i].style.setProperty("--vote-percent", `${percentage}%`);
    });
}

function connectChat() {
    if (!votingActive) return;
    chatClient.connect();
}

function disconnectChat() {
    if (!votingActive) return;
    chatClient.disconnect();
}

function startVoting() {
    choiceVotes.forEach(e => e.textContent = '');
    choiceBtns.forEach(e => {
        e.style.setProperty("--vote-percent", '0%');
        e.classList.add('voting')
    });
    roundVotes = 0;
    currentRound.clips.forEach(c => c.votes = 0);
}

function stopVoting() {
    choiceBtns.forEach(e => e.classList.remove('voting'));
    choiceVotes.forEach(e => e.textContent = '');
}

// #endregion chat integration

// #region helpers
function getRandomInt(max, rng) {
    const r = rng ? rng() : Math.random();
    return Math.floor(r * max);
}

function bounded(val, min, max) {
    return Math.min(max, Math.max(min, val))
}

// credit: https://stackoverflow.com/a/2450976/32727753
function shuffle(array, rng) {
    const result = array.slice();
    let currentIndex = result.length;

    // While there remain elements to shuffle...
    while (currentIndex != 0) {

        // Pick a remaining element...
        let randomIndex = getRandomInt(currentIndex, rng);
        currentIndex--;

        // And swap it with the current element.
        [result[currentIndex], result[randomIndex]] = [
            result[randomIndex], result[currentIndex]];
    }

    return result
}

function hide(ele) {
    ele.classList.add('hidden');
}

function show(ele) {
    ele.classList.remove('hidden');
}

function playSound(file) {
    var audio = new Audio(file);
    audio.volume = 0.6;
    audio.play();
}

// Credit: https://stackoverflow.com/a/47593316
function cyrb128(str) {
    let h1 = 1779033703, h2 = 3144134277,
        h3 = 1013904242, h4 = 2773480762;
    for (let i = 0, k; i < str.length; i++) {
        k = str.charCodeAt(i);
        h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
        h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
        h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
        h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    h1 ^= (h2 ^ h3 ^ h4), h2 ^= h1, h3 ^= h1, h4 ^= h1;
    return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

function sfc32(a, b, c, d) {
    return function () {
        a |= 0; b |= 0; c |= 0; d |= 0;
        let t = (a + b | 0) + d | 0;
        d = d + 1 | 0;
        a = b ^ b >>> 9;
        b = c + (c << 3) | 0;
        c = (c << 21 | c >>> 11);
        c = c + t | 0;
        return (t >>> 0) / 4294967296;
    }
}

// #endregion helpers
