// #region constants
const numRounds = 5;
const minWinsForGood = 4;
// #endregion

// #region game state
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
let rng;
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
// #endregion

// #region init

function onYouTubeIframeAPIReady() {
    initPlayers();
    initWebElements();
    loadDailyStats();
}

function initPlayers() {
    const width = 960;
    const height = 540;
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
    if (event.data !== YT.PlayerState.PLAYING && event.data !== YT.PlayerState.ENDED) {
        show(loader);
    }
    else {
        hide(loader);
    }

    if (event.data === YT.PlayerState.PLAYING || event.data === YT.PlayerState.BUFFERING) {
        toggleChoiceButtons(false);
    }
    if (event.data === YT.PlayerState.ENDED) {
        toggleChoiceButtons(true);
    }
}

function onAssPlayerStateChange(event) {
    if (event.data !== YT.PlayerState.PLAYING && event.data !== YT.PlayerState.ENDED) {
        show(loader);
    }
    else {
        hide(loader);
    }

    if (event.data === YT.PlayerState.ENDED) {
        showChoiceResult();
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
}

// #endregion

// #region main game logic
function startDaily() {
    playingDaily = true;
    seedInput = today + '7';
    const seed = cyrb128(seedInput);
    rng = sfc32(seed[0], seed[1], seed[2], seed[3]);
    startGame();
}

function startRegular() {
    playingDaily = false;
    rng = null;
    startGame();
}

function startGame() {
    hide(introSection);
    show(gameSection);
    rounds = generateRounds(numRounds)
    roundIndex = 0
    wins = 0

    const resultContainer = document.getElementById('result-container');
    resultContainer.replaceChildren();
    for (let i = 0; i < numRounds; i++) {
        const res = document.createElement("div")
        res.classList.add('result-box');
        res.id = 'result' + i;
        resultContainer.appendChild(res);
    }

    startRound(rounds[0])
}

function generateRounds(numRounds) {
    const generateRounds = [];
    const usedClips = [];
    for (let i = 0; i < numRounds; i++) {
        const clips = [
            {
                ...pickRandomClip(usedClips/*, i == 0 ? 7669  : 0 */),
                isMain: true,
            },
            pickRandomClip(usedClips),
            pickRandomClip(usedClips),
        ]
        generateRounds.push({
            mainClip: clips[0],
            clips: shuffle(clips),
            result: 'NOT_PLAYED',
        });
    }
    return generateRounds
}

function pickRandomClip(usedClips, overrideClipNumber = 0) {
    let chosenIndex;
    let chosenClip;
    do {
        chosenIndex = overrideClipNumber > 0 ? overrideClipNumber - 1 : getRandomInt(clips.length);
        chosenClip = clips[chosenIndex];
    }
    while (usedClips.some(c => c.vid === chosenClip.vid))

    usedClips.push(chosenClip)
    return {
        ...chosenClip,
        index: chosenIndex
    }
}

function startRound(round) {
    choicePicked = -1;
    currentRound = round;

    hide(assPlayerContainer);
    show(previewPlayerContainer);

    previewPlayer.loadVideoById({
        videoId: round.mainClip.vid,
        startSeconds: round.mainClip.time - 12,
        endSeconds: round.mainClip.time - 5,
    });
    assPlayer.cueVideoById({
        videoId: round.mainClip.vid,
        startSeconds: round.mainClip.time - 5,
        endSeconds: round.mainClip.time + 7,
    });

    Array.from(document.getElementsByClassName('choice-btn')).forEach(e => {
        e.classList.remove('correct', 'wrong', 'picked');
    });
    hide(next);
    show(skip);
    toggleChoiceButtons(false);

    document.getElementById('result' + roundIndex).classList.add('picked')

    choice1.value = '...' + round.clips[0].text + '...';
    choice2.value = '...' + round.clips[1].text + '...';
    choice3.value = '...' + round.clips[2].text + '...';
    num.textContent = `Clip #${round.mainClip.index + 1} / ${clips.length}`;
    hide(link);
}

function nextRound() {
    roundIndex++;
    if (roundIndex < numRounds) {
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
    ele.classList.add('picked');
    choicePicked = index;
    hide(skip);
    hide(previewPlayerContainer);
    show(assPlayerContainer);
    toggleChoiceButtons(false);
    assPlayer.playVideo();
}

function showChoiceResult() {
    if (choicePicked < 0) return;

    const buttons = Array.from(document.getElementsByClassName('choice-btn'));
    buttons.forEach((e, i) => {
        e.classList.add(currentRound.clips[i].isMain ? 'correct' : 'wrong');
    })

    trackRoundResult(currentRound.clips[choicePicked].isMain);

    show(next);
    link.href = `https://youtu.be/${currentRound.mainClip.vid}?t=${currentRound.mainClip.time - 10}`;
    show(link);
}

function trackRoundResult(win) {
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
    Array.from(document.getElementsByClassName('choice-btn')).forEach(e => {
        e.disabled = !enabled;
    });
}

function endGame() {
    hide(gameSection)
    show(introSection);
    endResults.textContent = `You got ${wins} / ${numRounds} asses right.`;
    endResults.classList.remove('good', 'bad');
    if (wins >= minWinsForGood) {
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
}

// #endregion

// #region daily

function loadDailyStats() {
    today = new Date().toISOString().slice(0, 10);
    tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    lastDaily = localStorage.getItem("lastDaily");
    dailyWins = localStorage.getItem("dailyWins");
    dailyRoundRes = localStorage.getItem("dailyRoundRes").split(",").map(r => r === 'true');

    if (lastDaily === today) {
        startDailyBtn.disabled = true;
        dailyResult.textContent = `You got ${dailyWins}/${numRounds} daily asses.`;
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
    const shareText = `assdle 🍑 ${today}
${roundColors}
I got ${dailyWins}/${numRounds} daily asses`;
    navigator.clipboard.writeText(shareText);

    const shareBtn = document.getElementById("share-btn");
    shareBtn.textContent = 'Copied';
    setTimeout(() => {
        shareBtn.textContent = 'Share';
    }, 1000);
}

// #endregion

// #region helpers
function getRandomInt(max) {
    const r = rng ? rng() : Math.random();
    return Math.floor(r * max);
}

// credit: https://stackoverflow.com/a/2450976/32727753
function shuffle(array) {
    const result = array.slice();
    let currentIndex = result.length;

    // While there remain elements to shuffle...
    while (currentIndex != 0) {

        // Pick a remaining element...
        let randomIndex = getRandomInt(currentIndex);
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

// #endregion
