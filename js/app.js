// デフォルト値
const DEF_WORK_SEC = 22 * 60;
const DEF_BREAK_SSEC = 5 * 60;
const DEF_BREAK_LSEC = 15 * 60;
const DEF_IS_AUTO_START = false;
const DEF_LOOP_NUM = 4;
const DEF_SOUND_VOL = 0.8;

const SEC_MIN = 1;
const SEC_MAX = 5999;
const LOOP_MIN = 1;
const LOOP_MAX = 100;

const START_SOUND = new Audio("sounds/wakeup.mp3");
const WORK_SSOUND = new Audio("sounds/endtimes.mp3");
const WORK_LSOUND = new Audio("sounds/finalvoyage.mp3");
const BREAK_SSOUND = new Audio("sounds/reverse.mp3");
const BREAK_LSOUND = new Audio("sounds/maintitle.mp3");
const START_SOUND_SEC = 6; //8
const WORK_SSOUND_SEC = 120; //120
const WORK_LSOUND_SEC = 160; //160
const BREAK_SSOUND_SEC = 27; //27
const BREAK_LSOUND_SEC = 75; //75
START_SOUND.volume = DEF_SOUND_VOL;
WORK_SSOUND.volume = DEF_SOUND_VOL;
WORK_LSOUND.volume = DEF_SOUND_VOL;
BREAK_SSOUND.volume = DEF_SOUND_VOL;
BREAK_LSOUND.volume = DEF_SOUND_VOL;

// パラメーター設定(URL優先)
let is_auto_start = DEF_IS_AUTO_START;
let param = getParam('auto');
if (validateBool(param))
    is_auto_start = toBool(param);

let work_sec = DEF_WORK_SEC;
param = getParam('work');
if (validateNum(param, SEC_MIN, SEC_MAX))
    work_sec = param;

let break_ssec = DEF_BREAK_SSEC;
param = getParam('break_s');
if (validateNum(param, SEC_MIN, SEC_MAX))
    break_ssec = param;

let break_lsec = DEF_BREAK_LSEC;
param = getParam('break_l');
if (validateNum(param, SEC_MIN, SEC_MAX))
    break_lsec = param;

let loop_num = DEF_LOOP_NUM;
param = getParam('loop');
if (validateNum(param, LOOP_MIN, LOOP_MAX))
    loop_num = param;

// 初期値設定
let sec = work_sec;
let loop = 0;
let interval_id;
let state = '休憩後'; // ワーク中、ワーク後、休憩中、休憩後

// DOM
let work_btn = document.querySelector('.work_btn');
let pause_btn = document.querySelector('.pause_btn');
let reset_btn = document.querySelector('.reset_btn');
let time_span = document.querySelector('.countdown_time');
let loop_disp = document.querySelector('.num_loops');
let setting_btn = document.querySelector('.settings_btn');
let setting_menu = document.getElementById('setting_menu');
let input_auto = document.getElementById('input_auto');
let input_work = document.getElementById('input_work');
let input_break_s = document.getElementById('input_break_s');
let input_break_l = document.getElementById('input_break_l');
let input_loop = document.getElementById('input_loop');

// 初期画面表示
dispSec(sec);
dispLoop();
dispSettings();

/******************************************************************************/
/* イベント                                                                   */
/******************************************************************************/

// ワークボタンクリックでカウントダウン開始
work_btn.addEventListener('click', function() {
    // ワークボタンをポーズボタンに切り替え
    work_btn.style.display = 'none';
    pause_btn.style.display = 'block';

    // カウントダウン開始
    interval_id = setInterval(countTimer, 1000);

    // 終了音楽の再開
    startSound();

    // 終了後にワークボタンクリックで次に進む
    if (state === 'ワーク後' || state === '休憩後')
        nextStep();
});

// ポーズボタンクリックで一時停止
pause_btn.addEventListener('click', function() {
    stopTimer();
});

// リセットボタンクリックで初期化
reset_btn.addEventListener('click', function() {
    init();
});

// 設定ボタンクリックでメニュー表示
setting_btn.addEventListener('click', function() {
    setting_menu.classList.toggle('hide');
    setting_menu.classList.toggle('show');
});

// 入力オート開始の変更
input_auto.addEventListener('change', function() {
    is_auto_start = input_auto.checked ? true : false;
    changeUrl();
});

// 入力ワーク時間の変更
input_work.addEventListener('input', function() {
    if (validateNum(input_work.value, SEC_MIN, SEC_MAX)) {
        work_sec = input_work.value;
        // ワーク時間表示中は画面を更新する。
        if (state === '休憩後') {
            sec = input_work.value;
            dispSec(sec);
        }
        else if (state === 'ワーク中') {
            // 実行中は一時停止の上で数字を更新する。
            stopTimer();
            stopSound(true);
            sec = input_work.value;
            dispSec(sec);
        }
        changeUrl();
    }
});

// 入力休憩時間（短）の変更
input_break_s.addEventListener('input', function() {
    if (validateNum(input_break_s.value, SEC_MIN, SEC_MAX)) {
        break_ssec = input_break_s.value;
        // 短休憩の場合のみ画面も更新する。
        if (loop % loop_num !== 0) {
            // 短休憩時間表示中は画面を更新する。
            if (state === 'ワーク後') {
                sec = input_break_s.value;
                dispSec(sec);
            }
            else if (state === '休憩中') {
                // 実行中は一時停止の上で数字を更新する。
                stopTimer();
                stopSound(true);
                sec = input_break_s.value;
                dispSec(sec);
            }
        }
        changeUrl();
    }
});

// 入力休憩時間（長）の変更
input_break_l.addEventListener('input', function() {
    if (validateNum(input_break_l.value, SEC_MIN, SEC_MAX)) {
        break_lsec = input_break_l.value;
        // 長休憩の場合のみ画面も更新する。
        if (loop % loop_num === 0) {
            // 長休憩時間表示中は画面を更新する。
            if (state === 'ワーク後') {
                sec = input_break_l.value;
                dispSec(sec);
            }
            else if (state === '休憩中') {
                // 実行中は一時停止の上で数字を更新する。
                stopTimer();
                stopSound(true);
                sec = input_break_l.value;
                dispSec(sec);
            }
        }
        changeUrl();
    }
});

// 1セットのループ数の変更
input_loop.addEventListener('input', function() {
    if (validateNum(input_loop.value, LOOP_MIN, LOOP_MAX)) {
        loop_num = input_loop.value;
        changeUrl();
    }
});

// 開始音楽が終了したら初期値に戻しておく
START_SOUND.addEventListener('ended', function() {
    START_SOUND.currentTime = 0;
});

/******************************************************************************/
/* ディスプレイ                                                               */
/******************************************************************************/

// ループ数表示
function dispLoop() {
    loop_disp.textContent = `${loop} loops`;
}

// タイマー表示
function dispSec(sec) {
    // 分、秒をそれぞれ2桁0パディングして表示
    let m = ('00' + Math.floor(sec / 60)).slice(-2);
    let s = ('00' + (sec % 60)).slice(-2);
    time_span.textContent = m + ":" + s;
}

// セッティング初期表示
function dispSettings() {
    input_auto.checked = is_auto_start;
    input_work.value = work_sec;
    input_break_s.value = break_ssec;
    input_break_l.value = break_lsec;
    input_loop.value = loop_num;
}


/******************************************************************************/
/* 処理メソッド                                                               */
/******************************************************************************/
// 初期化
function init() {
    // 音楽を停止、初期値に戻す
    stopSound(true);

    // タイマー停止後、初期値に戻す
    stopTimer();
    sec = work_sec;
    loop = 0;
    state = '休憩後';

    // 表示を戻す
    dispSec(sec);
    dispLoop();
    time_span.classList.toggle("disp_time", false);
}

// 次へ進む
function nextStep() {
    // ワーク完了なら休憩、休憩完了なら初期化
    if (state === 'ワーク後') {
        state = '休憩中';
        sec = break_ssec;
        if (loop % loop_num === 0)
            sec = break_lsec;

        time_span.classList.toggle("disp_time", true);
        dispSec(sec);
        countTimer();
    }
    else if (state === '休憩後') {
        state = 'ワーク中'
        sec = work_sec;
        loop++;

        dispLoop();
        time_span.classList.toggle("disp_time", false);
        dispSec(sec);
        countTimer();
    }
}

// カウントダウンタイマー
function countTimer() {
    // カウントダウン
    sec--;
    dispSec(sec);

    // 終了前音楽の開始
    startSound();

    // タイマー終了時
    if (sec <= 0) {
        // 終了音楽の停止
        stopSound(true);

        if (state === 'ワーク中')
            state = 'ワーク後'
        else if (state == '休憩中')
            state = '休憩後'

        is_auto_start ? nextStep() : stopTimer();
    }
}

// タイマー一時停止
function stopTimer() {
    clearInterval(interval_id);

    // ポーズボタンからワークボタンへ切り替え 
    work_btn.style.display = 'block'; 
    pause_btn.style.display = 'none';

    // 終了音楽の一時停止
    stopSound(false);
}

// 音楽再生
function startSound() {
    if ((state === '休憩後' || state == 'ワーク中') 
        && START_SOUND_SEC >= (work_sec - sec)) {
            START_SOUND.play();
    }
    if (state === 'ワーク中') {
        // 所定ループ時には長期休憩前用の音楽
        if (loop % loop_num === 0) {
            // 残り秒数に合わせる。曲時間より所定時間が短い場合を想定。
            if (sec < WORK_LSOUND_SEC && WORK_LSOUND.currentTime === 0)
                    WORK_LSOUND.currentTime = WORK_LSOUND_SEC - sec;
            if (sec <= WORK_LSOUND_SEC)
                    WORK_LSOUND.play();
        }
        else {
            // 開始位置を残り秒数に合わせる。曲時間より所定時間が短い場合。
            if (sec < WORK_SSOUND_SEC && WORK_SSOUND.currentTime === 0)
                    WORK_SSOUND.currentTime = WORK_SSOUND_SEC - sec;
            if (sec <= WORK_SSOUND_SEC)
                    WORK_SSOUND.play();
        }
    }
    else if (state === '休憩中') {
        // 所定ループ時には長期休憩用の音楽
        if (loop % loop_num === 0) {
            // 開始位置を残り秒数に合わせる。曲時間より所定時間が短い場合。
            if (sec < BREAK_LSOUND_SEC && BREAK_LSOUND.currentTime === 0)
                    BREAK_LSOUND.currentTime = BREAK_LSOUND_SEC - sec;
            if (sec <= BREAK_LSOUND_SEC)
                    BREAK_LSOUND.play();
        }
        else {
            // 残り秒数に合わせる。曲時間より所定時間が短い場合を想定。
            if (sec < BREAK_SSOUND_SEC && BREAK_SSOUND.currentTime === 0)
                    BREAK_SSOUND.currentTime = BREAK_SSOUND_SEC - sec;
            if (sec <= BREAK_SSOUND_SEC)
                BREAK_SSOUND.play();
        }
    }
}

// 音楽停止
function stopSound(is_stop) {
    START_SOUND.pause();
    WORK_SSOUND.pause();
    WORK_LSOUND.pause();
    BREAK_SSOUND.pause();
    BREAK_LSOUND.pause();
    if (is_stop) {
        START_SOUND.currentTime = 0;
        WORK_SSOUND.currentTime = 0;
        WORK_LSOUND.currentTime = 0;
        BREAK_SSOUND.currentTime = 0;
        BREAK_LSOUND.currentTime = 0;
    }
}

/******************************************************************************/
/* ユーティリティ                                                             */
/******************************************************************************/

// URLパラメーター取得
function getParam(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    let regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

// バリデーションチェック(数字)
function validateNum(val, min, max) {
    try{
        if (!val)
            return false;
        if (val >= min && val <= max)
            return true;
        else
            return false;
    } catch(e) {
        return false;
    }
}

// バリデーションチェック(bool)
function validateBool(val) {
    try{
        if (val === 'true' || val === 'false')
            return true;
        else
            return false;
    } catch(e) {
        return false;
    }
}

// bool変換
function toBool(val) {
    return (val === 'true')
}

// URL書き換え
function changeUrl() {
    let q = '?';
    if (is_auto_start)
        q += 'auto=true';
    if (work_sec != DEF_WORK_SEC)
        q += '&work=' + work_sec;
    if (break_ssec != DEF_BREAK_SSEC)
        q += '&break_s=' + break_ssec;
    if (break_lsec != DEF_BREAK_LSEC)
        q += '&break_l=' + break_lsec;
    if (loop_num != DEF_LOOP_NUM)
        q += '&loop=' + loop_num;
    q = q.replace('?&', '?');
    history.replaceState('', '', q);
}