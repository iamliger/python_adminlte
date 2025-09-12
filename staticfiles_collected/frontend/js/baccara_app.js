// frontend/static/frontend/js/baccara_app.js

// ====================================
// --- Django Context 변수 로드 ---
// ====================================
const myID = DJANGO_CONTEXT.memberId;
let moneyArrStep = DJANGO_CONTEXT.moneyJson;
const DeviceMode = DJANGO_CONTEXT.deviceMode;
let isShowMoneyInfo = DJANGO_CONTEXT.isShowMoneyInfo;
const G5_BBS_URL = DJANGO_CONTEXT.G5BbsUrl;
const G5_URL = DJANGO_CONTEXT.G5Url;
const HEARTBEAT_API_URL = DJANGO_CONTEXT.heartbeatApiUrl;
const CSRF_TOKEN = DJANGO_CONTEXT.csrfToken;
const BROADCAST_MESSAGE_API_URL = DJANGO_CONTEXT.broadcastMessageApiUrl;
const PROCESS_GAME_RESULT_API_URL = DJANGO_CONTEXT.processGameResultApiUrl;
const LAST_SEEN_BROADCAST_KEY = 'lastSeenBroadcastMessageId';
let heartbeatInterval = null;

// ====================================
// --- 요소 참조 (DOMContentLoaded 이후에 할당) ---
// ====================================
let playerBtn;
let bankerBtn;
let cancelBtn;
let resetBtn;
let playerCountSpan;
let bankerCountSpan;
let totalCountSpan;
let mainRoadmapGrid;

let logicBtnGroup;
let copyBtn;
let logicButtons = [];

const defaultSettings = {
    gameSettingEnabled: false,
    moneyInfoVisible: false,
    soundSettingEnable: false,
    showConsoleEnable: true,
    selectedLogic: 'logic1',
    virtualBettingEnabled: true,
    aiBettingEnabled: false
};

// ====================================
// --- 상태 관리 변수 ---
// ====================================
let playerCount = 0;
let bankerCount = 0;
let mainRoadmapLastType = null;
let mainRoadmapCurrentCol = 1;
let mainRoadmapLastRow = 0;
let mainRoadmapOccupied = {};
let mainRoadmapLastPlacedPos = null;
let historyPlacement = {};
let actionHistory = [];
let jokboHistory = "";
let consoleMessages = [];
let inlineChartInstance = null;
let logicState = {};
let predictionHistory = [];

const STORAGE_KEY = `baccara_state_${myID}`;
const GAMEENV_KEY = `game_env_${myID}`;


// ====================================
// --- 유틸리티 및 UI 함수 ---
// ====================================

function loadSavedSettings() {
    let storedSettings = null;
    const storedSettingsJSON = localStorage.getItem(GAMEENV_KEY);
    if (storedSettingsJSON) {
        try {
            storedSettings = JSON.parse(storedSettingsJSON);
        } catch (e) {
            console.error("LS 파싱 오류:", e);
            localStorage.removeItem(GAMEENV_KEY);
            storedSettings = null;
        }
    }
    return {
        ...defaultSettings,
        ...storedSettings
    };
}

function applySettings(settings) {
    console.log("applySettings 호출됨:", settings);
    applyVisibility('money-step-wrapper', settings.moneyInfoVisible);
    applyVisibility('interactive-area', settings.showConsoleEnable);
    updateLogicButtonsUI(settings.selectedLogic);
}

function updateLogicButtonsUI(selectedValue) {
    console.log('updateLogicButtonsUI called', selectedValue);
    if (logicBtnGroup && logicButtons.length > 0) {
        logicButtons.forEach(button => {
            const isActive = button.dataset.value === selectedValue;
            button.setAttribute('aria-checked', isActive);
            console.log(`button.dataset.value:${button.dataset.value}, selectedValue:${selectedValue}, isActive:${isActive}`);

            const baseClasses = "relative inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium shadow mobile-button-text";
            const darkBorderClass = "dark:border-gray-600";
            const focusClasses = "focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500";
            const roundedLeft = "rounded-l-md";
            const roundedRight = "rounded-r-md";
            const marginLeft = "-ml-px";

            let currentRoundingClass = '';
            if (button.classList.contains(roundedLeft)) currentRoundingClass = roundedLeft;
            else if (button.classList.contains(roundedRight)) currentRoundingClass = roundedRight;

            let currentMarginClass = '';
            if (button.classList.contains(marginLeft)) currentMarginClass = marginLeft;

            if (isActive) {
                button.className = `${baseClasses} ${focusClasses} ${currentRoundingClass} ${currentMarginClass} ${darkBorderClass} bg-indigo-600 text-white hover:bg-indigo-700`;
            } else {
                button.className = `${baseClasses} ${focusClasses} ${currentRoundingClass} ${currentMarginClass} ${darkBorderClass} bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600`;
            }

            if (isActive) {
                button.classList.add('bg-indigo-600', 'text-white', 'hover:bg-indigo-700');
                button.classList.remove('bg-white', 'text-gray-700', 'hover:bg-gray-50', 'dark:bg-gray-700', 'dark:text-gray-200', 'dark:hover:bg-gray-600');
            } else {
                button.classList.remove('bg-indigo-600', 'text-white', 'hover:bg-indigo-700');
                button.classList.add('bg-white', 'text-gray-700', 'hover:bg-gray-50', 'dark:bg-gray-700', 'dark:text-gray-200', 'dark:hover:bg-gray-600');
            }
        });
    }
}


function showSpinner() {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
        spinner.classList.remove('hidden');
        spinner.style.display = 'flex';
    }
}

function hideSpinner() {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
        spinner.classList.add('hidden');
        spinner.style.display = 'none';
    }
}

function scrollToRightEnd(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        setTimeout(() => {
            element.scrollLeft = element.scrollWidth;
        }, 0);
    }
}

function checkCellEmpty(col, row) {
    const MAX_ROW = 6;
    if (col <= 0 || row <= 0 || row > MAX_ROW) return false;
    return !mainRoadmapOccupied[`c${col}-r${row}`];
}

function addComma(num) {
    return Number(num).toLocaleString();
}

function renderBettingPosition(str) {
    if (typeof str !== 'string' || str === '') return '<span class="baccarat-circle system">-</span>';
    const upperStr = str.toUpperCase();
    if (upperStr === 'P') return `<span class="baccarat-circle player">P</span>`;
    if (upperStr === 'B') return `<span class="baccarat-circle banker">B</span>`;
    if (upperStr === 'T') return `<span class="baccarat-circle tie">T</span>`;
    return `<span>${str}</span>`;
}

function saveStateToLocalStorage() {
    const state = {
        playerCount,
        bankerCount,
        mainRoadmapLastType,
        mainRoadmapCurrentCol,
        mainRoadmapLastRow,
        mainRoadmapOccupied,
        mainRoadmapLastPlacedPos,
        historyPlacement,
        actionHistory,
        jokboHistory,
        logicState,
        predictionHistory
    };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.error("LS 저장 실패:", e);
    }
}

function resetStateAndStorage() {
    playerCount = 0;
    bankerCount = 0;
    mainRoadmapLastType = null;
    mainRoadmapCurrentCol = 1;
    mainRoadmapLastRow = 0;
    mainRoadmapOccupied = {};
    mainRoadmapLastPlacedPos = null;
    historyPlacement = {};
    actionHistory = [];
    jokboHistory = "";
    logicState = {};
    predictionHistory = [];
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        console.error("LS 제거 실패:", e);
    }
}

function loadStateFromLocalStorage() {
    try {
        const savedState = localStorage.getItem(STORAGE_KEY);
        if (savedState) {
            const state = JSON.parse(savedState);
            playerCount = state.playerCount || 0;
            bankerCount = state.bankerCount || 0;
            mainRoadmapLastType = state.mainRoadmapLastType || null;
            mainRoadmapCurrentCol = state.mainRoadmapCurrentCol || 1;
            mainRoadmapLastRow = state.mainRoadmapLastRow || 0;
            mainRoadmapOccupied = state.mainRoadmapOccupied || {};
            mainRoadmapLastPlacedPos = state.mainRoadmapLastPlacedPos || null;
            historyPlacement = state.historyPlacement || {};
            actionHistory = state.actionHistory || [];
            jokboHistory = state.jokboHistory || "";
            predictionHistory = state.predictionHistory || [];
            logicState = state.logicState || {};
        }
    } catch (e) {
        resetStateAndStorage();
        showToast('center', '데이터 로딩 오류, 초기화.', {
            type: 'error'
        });
    }
    updateCounts();
}

function addGridItemVisualOnly(gridContainerId, row, col, type, isHistory = false, itemId = null) {
    const grid = document.getElementById(gridContainerId);
    if (!grid) return null;
    const circle = document.createElement('div');
    const circleBaseClass = isHistory ? 'history-circle' : 'baccarat-circle';
    let typeClass, textContent;
    if (type === 'p') {
        typeClass = 'player';
        textContent = 'P';
    } else if (type === 'b') {
        typeClass = 'banker';
        textContent = 'B';
    } else if (type === 't') {
        typeClass = 'tie';
        textContent = 'T';
    } else {
        return null;
    }
    const elementId = itemId || `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    circle.id = elementId;
    circle.className = `${circleBaseClass} ${typeClass} grid-item`;
    circle.textContent = textContent;
    circle.style.gridRow = `${row}`;
    circle.style.gridColumn = `${col}`;
    grid.appendChild(circle);
    return elementId;
}

function redrawAllGrids() {
    if (mainRoadmapGrid) mainRoadmapGrid.innerHTML = '';
    mainRoadmapOccupied = {};
    for (let i = 1; i <= 4; i++) {
        const grid = document.getElementById(`history-grid-${i}`);
        if (grid) grid.innerHTML = '';
    }
    actionHistory.forEach(action => {
        action.forEach(item => {
            addGridItemVisualOnly(item.gridId, item.row, item.col, item.type, item.gridId !==
                'roadmap-grid', item.itemId);
            if (item.gridId === 'roadmap-grid') {
                mainRoadmapOccupied[`c${item.col}-r${item.row}`] = true;
            }
        });
    });
    if (mainRoadmapGrid) scrollToRightEnd('main-roadmap-container');
    for (let i = 1; i <= 4; i++) {
        const box = document.getElementById(`history-box-${i}`);
        if (box) scrollToRightEnd(box.id);
    }
}

function addGridItem(gridContainerId, row, col, type, isHistory = false) {
    const itemId = addGridItemVisualOnly(gridContainerId, row, col, type, isHistory);
    if (itemId) {
        const gridElement = document.getElementById(gridContainerId);
        const scrollContainer = gridElement ? gridElement.parentElement : null;

        if (scrollContainer && scrollContainer.classList.contains('history-scroll-wrapper')) {
            scrollToRightEnd(scrollContainer.id);
        } else if (gridContainerId === 'roadmap-grid') {
            scrollToRightEnd('main-roadmap-container');
        }
    }
    return itemId;
}

function updateCounts() {
    playerCountSpan.textContent = playerCount;
    bankerCountSpan.textContent = bankerCount;
    totalCountSpan.textContent = playerCount + bankerCount;
}

function calculateMainRoadmapPosition(type) {
    const MAX_ROW = 6;
    let targetCol, targetRow;
    if (mainRoadmapLastType === null) {
        targetCol = 1;
        targetRow = 1;
    } else if (type !== mainRoadmapLastType) {
        if (mainRoadmapLastPlacedPos && mainRoadmapLastPlacedPos.row === 1 && mainRoadmapLastPlacedPos.col !==
            mainRoadmapCurrentCol) {
            targetCol = mainRoadmapLastPlacedPos.col + 1;
            targetRow = 1;
        } else {
            targetCol = mainRoadmapCurrentCol + 1;
            targetRow = 1;
        }
    } else {
        targetCol = mainRoadmapCurrentCol;
        targetRow = mainRoadmapLastRow + 1;
        if (targetRow > MAX_ROW || !checkCellEmpty(targetCol, targetRow)) {
            if (!mainRoadmapLastPlacedPos) return null;
            targetRow = mainRoadmapLastPlacedPos.row;
            targetCol = mainRoadmapLastPlacedPos.col + 1;
            while (!checkCellEmpty(targetCol, targetRow)) {
                targetCol++;
                if (targetCol > 1000) return null;
            }
        }
    }
    return {
        col: targetCol,
        row: targetRow
    };
}

function renderMoneySteps(moneyArray) {
    const container = document.getElementById('money-step');
    if (!container || !Array.isArray(moneyArray)) return;
    let total = 0,
        html = '';
    moneyArrStep = [];
    moneyArray.forEach((amount, idx) => {
        total += Number(amount);
        moneyArrStep.push(amount);
        html +=
            `<div class="step-label inactive flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium shadow-md flex items-center space-x-2 bg-slate-700 text-slate-300 border border-slate-500 mobile-button-text"><span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-xs font-semibold">${idx + 1}</span><span class="font-normal opacity-80">${Number(amount).toLocaleString()}</span></div>`;
    });
    html +=
        `<div class="flex-shrink-0 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium shadow-md flex items-center space-x-2 mobile-button-text"><i class="ti ti-calculator"></i><span class="font-normal opacity-90">${total.toLocaleString()}</span></div>`;
    container.innerHTML = html;
    if (moneyArrStep.length > 0) addConsoleMessage(`초기금액을 ${Number(moneyArrStep[0]).toLocaleString()} 셋팅 하였습니다.`,
        'system');
}


function displayPredictions(predictions, selectedLogic, aiPrediction = null) {
    const pageHeader = document.getElementById('page-header');
    if (!pageHeader) {
        console.warn("displayPredictions: page-header element not found.");
        return;
    }
    if (!pageHeader.__alpine_component) {
        setTimeout(() => displayPredictions(predictions, selectedLogic, aiPrediction), 50);
        return;
    }

    let htmlParts = [];

    // 서버로부터 받은 실제 predictions만 사용합니다.
    // 더미 데이터를 생성하는 로직은 제거합니다.
    if (predictions && predictions.length > 0) {
        predictions.forEach(p => {
            const patternKey = p.patternKey;
            const currentStep = (logicState && logicState[patternKey]) ? logicState[patternKey] : 1;
            const amountStr = (moneyArrStep && moneyArrStep.length > 0 && moneyArrStep[currentStep - 1] !== undefined) ? addComma(moneyArrStep[currentStep - 1]) : '...';
            const bettingPosHtml = renderBettingPosition(p.bettingpos);
            const measuDisplay = (p.measu !== undefined && p.measu !== null && p.measu !== '') ? `[${p.measu}매]` : '';
            const displayName = p.display_name || (patternKey ? patternKey.replace(/_/g, ' ').replace('pattern', '').trim() : '로직');

            htmlParts.push(`<div class="flex items-center gap-1 text-sm">
                                <span class="font-semibold text-gray-400">${displayName}:</span>
                                <div class="flex items-center gap-1">${bettingPosHtml} ${amountStr} ${measuDisplay} (${currentStep}단계)</div>
                            </div>`);
        });
    }

    if (aiPrediction && aiPrediction.bettingpos) {
        const aiPosHtml = renderBettingPosition(aiPrediction.bettingpos);
        const aiConfidence = aiPrediction.confidence ? `(${Math.round(aiPrediction.confidence * 100)}%)` : '';
        htmlParts.push(`<div class="flex items-center gap-1 text-sm">
                            <span class="font-semibold text-purple-400">AI 예측:</span>
                            <div class="flex items-center gap-1">${aiPosHtml} ${aiConfidence}</div>
                        </div>`);
    }

    const combinedMessage = `<div class="flex items-center justify-center w-full gap-2">${htmlParts.join('<div class="w-px h-5 bg-white/20 mx-1"></div>')}</div>`;

    // 예측 메시지가 비어 있으면 헤더도 비웁니다.
    if (htmlParts.length === 0) {
        pageHeader.__alpine_component.predictionHtml = '';
    } else {
        pageHeader.__alpine_component.predictionHtml = combinedMessage;
    }
}


function logRecommendation(currentState, selectedLogic, aiPrediction = null) {
    const predictions = currentState.predictions_to_show;

    // predictions가 없으면 AI 예측만 출력 (있다면)
    if (!predictions || predictions.length === 0) {
        if (aiPrediction && aiPrediction.bettingpos) {
            addConsoleMessage(`AI는 ${renderBettingPosition(aiPrediction.bettingpos)}를 제시합니다.`, 'system');
        } else {
            addConsoleMessage(`다음 추천 정보가 없습니다.`, 'system'); // 예측이 없을 때 메시지 추가
        }
        return;
    }

    const messageParts = predictions.map(p => {
        const bettingPosHtml = renderBettingPosition(p.bettingpos);
        const currentStep = (currentState.full_logic_state && currentState.full_logic_state[p.patternKey]) ? currentState.full_logic_state[p.patternKey] : 1;
        const amountStr = moneyArrStep[currentStep - 1] ? addComma(moneyArrStep[currentStep - 1]) : '...';

        return `${bettingPosHtml} ${amountStr}`;
    });

    let combinedPredictions = messageParts.join(' ');

    if (aiPrediction && aiPrediction.bettingpos) {
        const aiPosHtml = renderBettingPosition(aiPrediction.bettingpos);
        combinedPredictions += ` (AI: ${aiPosHtml})`;
    }

    addConsoleMessage(`다음 추천은 ${combinedPredictions} 제시합니다.`, 'system');
}

async function addHistoryItemClientSide(type, button) {
    button.disabled = true;
    showSpinner();

    try {
        const currentSettings = loadSavedSettings();
        const selectedLogic = currentSettings.selectedLogic || 'logic1';
        const aiBettingEnabled = currentSettings.aiBettingEnabled || false;

        let gameChar = '';
        if (type === 'player') gameChar = 'P';
        else if (type === 'banker') gameChar = 'B';
        else if (type === 'tie') gameChar = 'T'; // 타이 버튼이 있다면

        const response = await fetch(PROCESS_GAME_RESULT_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': CSRF_TOKEN
            },
            body: JSON.stringify({
                action: 'addjokbo',
                data: gameChar, // <-- 여기를 수정합니다!
                selectedLogic: selectedLogic,
                aiBettingEnabled: aiBettingEnabled,
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            showAlertModal({
                title: '처리 실패',
                message: errorData.message || '게임 결과 처리 중 오류가 발생했습니다.',
                icon: 'error'
            });
            hideSpinner();
            button.disabled = false;
            return;
        }

        const result = await response.json();
        const currentState = result.currentState;
        const aiPrediction = result.aiPrediction;

        jokboHistory = currentState.full_logic_state.current_bcdata || jokboHistory;
        logicState = currentState.full_logic_state || {};

        redrawAllGridsFromJokbo(jokboHistory);
        updateCounts();

        displayPredictions(currentState.predictions_to_show, selectedLogic, aiPrediction);
        logRecommendation(currentState, selectedLogic, aiPrediction);
        updateActiveStepUI();
        updateAnalyticsChart();

    } catch (error) {
        console.error("게임 결과 전송 중 오류 발생:", error);
        showAlertModal({
            title: '네트워크 오류',
            message: '서버와 통신할 수 없습니다. 네트워크 연결을 확인해주세요.',
            icon: 'error'
        });
    } finally {
        hideSpinner();
        button.disabled = false;
        readjustHistoryScrollPosition();
    }
}

function drawRoadmaps(type, currentActionItems) {
    if (mainRoadmapGrid) {
        const position = calculateMainRoadmapPosition(type);
        if (position) {
            const itemId = addGridItem('roadmap-grid', position.row, position.col, type, false);
            if (itemId) {
                currentActionItems.push({
                    gridId: 'roadmap-grid',
                    row: position.row,
                    col: position.col,
                    type,
                    itemId
                });
                mainRoadmapOccupied[`c${position.col}-r${position.row}`] = true;
                if (mainRoadmapLastType === null || type !== mainRoadmapLastType) {
                    mainRoadmapCurrentCol = position.col;
                }
                mainRoadmapLastRow = position.row;
                mainRoadmapLastType = type;
                mainRoadmapLastPlacedPos = {
                    col: position.col,
                    row: position.row
                };
            }
        }
    }
    for (let i = 1; i <= 4; i++) {
        const gridId = `history-grid-${i}`;
        const gridElement = document.getElementById(gridId);
        if (!gridElement) continue;
        const parentBox = gridElement.parentElement.parentElement;
        const maxRows = parseInt(parentBox.dataset.rows);
        let {
            col,
            row
        } = historyPlacement[gridId] || {
            col: 1,
            row: 1
        };
        const itemId = addGridItem(gridId, row, col, type, true);
        if (itemId) {
            currentActionItems.push({
                gridId,
                row,
                col,
                type,
                itemId
            });
            row++;
            if (row > maxRows) {
                row = 1;
                col++;
            }
            historyPlacement[gridId] = {
                col,
                row
            };
        }
    }

    if (mainRoadmapGrid) scrollToRightEnd('main-roadmap-container');
}

function updateStateAndSave(type, currentActionItems) {
    if (currentActionItems.length > 0) {
        if (type === 'player') playerCount++;
        else if (type === 'banker') bankerCount++;
        actionHistory.push(currentActionItems);
        updateCounts();
        saveStateToLocalStorage();
    } else {
        showToast('center', '아이템 추가 오류', {
            type: 'error'
        });
    }
}

async function undoLastActionClientSide() {
    if (jokboHistory.length === 0) {
        showAlertModal({ title: '취소 오류', message: '취소할 기록이 없습니다.', icon: 'error' });
        return;
    }
    showSpinner();

    try {
        const currentSettings = loadSavedSettings();
        const selectedLogic = currentSettings.selectedLogic || 'logic1';
        const aiBettingEnabled = currentSettings.aiBettingEnabled || false;

        const response = await fetch(PROCESS_GAME_RESULT_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': CSRF_TOKEN
            },
            body: JSON.stringify({
                action: 'undo',
                data: '',
                selectedLogic: selectedLogic,
                aiBettingEnabled: aiBettingEnabled,
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            showAlertModal({
                title: '처리 실패',
                message: errorData.message || '게임 결과 취소 중 오류가 발생했습니다.',
                icon: 'error'
            });
            hideSpinner();
            return;
        }

        const result = await response.json();
        const currentState = result.currentState;
        const aiPrediction = result.aiPrediction;

        jokboHistory = currentState.full_logic_state.current_bcdata || jokboHistory;
        logicState = currentState.full_logic_state || {};

        redrawAllGridsFromJokbo(jokboHistory);
        updateCounts();

        if (jokboHistory.length > 0) {
            displayPredictions(currentState.predictions_to_show, selectedLogic, aiPrediction);
            logRecommendation(currentState, selectedLogic, aiPrediction);
        } else {
            document.getElementById('page-header').__alpine_component.predictionHtml = '';
            addConsoleMessage('모든 기록이 취소되었습니다.', 'system');
        }
        updateActiveStepUI();
        updateAnalyticsChart();

    } catch (error) {
        console.error("게임 결과 취소 전송 중 오류 발생:", error);
        showAlertModal({
            title: '네트워크 오류',
            message: '서버와 통신할 수 없습니다. 네트워크 연결을 확인해주세요.',
            icon: 'error'
        });
    } finally {
        hideSpinner();
        readjustHistoryScrollPosition();
    }
}

async function loadStateFromBackend(serverState = null) {
    console.log("loadStateFromBackend 호출됨.");
    showSpinner();
    try {
        let stateToLoad = serverState;
        if (!stateToLoad) {
            const response = await fetch(PROCESS_GAME_RESULT_API_URL, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': CSRF_TOKEN
                }
            });

            if (response.status === 204) { // No Content
                console.log("초기 상태 로드: 서버에 저장된 족보 없음.");
                stateToLoad = { // 빈 상태로 초기화
                    full_logic_state: { current_bcdata: "", logic_state: {}, pattern_stats: {} },
                    predictions_to_show: [],
                    aiPrediction: null
                };
            } else if (!response.ok) {
                const errorData = await response.json();
                console.error("초기 상태 로드 실패:", errorData.message);
                showAlertModal({ title: '데이터 로드 실패', message: errorData.message, icon: 'error' });
                hideSpinner();
                return;
            } else {
                const result = await response.json();
                stateToLoad = result.currentState;
            }
        }

        if (stateToLoad && stateToLoad.full_logic_state) {
            jokboHistory = stateToLoad.full_logic_state.current_bcdata || "";
            logicState = stateToLoad.full_logic_state;

            redrawAllGridsFromJokbo(jokboHistory);

            const currentSettings = loadSavedSettings();
            displayPredictions(stateToLoad.predictions_to_show, currentSettings.selectedLogic, stateToLoad.aiPrediction);
            updateActiveStepUI();
            updateAnalyticsChart();
            renderMoneySteps(moneyArrStep);
        } else {
            console.warn("서버로부터 로드할 유효한 상태 데이터가 없습니다.");
        }
    } catch (error) {
        console.error("초기 상태 로드 중 네트워크 오류:", error);
        showAlertModal({ title: '데이터 로드 실패', message: '초기 게임 데이터를 불러오지 못했습니다. 네트워크 연결을 확인해주세요.', icon: 'error' });
    } finally {
        hideSpinner();
    }
}

function redrawAllGridsFromJokbo(newBcdata) {
    console.log(`redrawAllGridsFromJokbo 호출됨. newBcdata: ${newBcdata}`); // <-- 여기를 수정합니다!

    playerCount = 0;
    bankerCount = 0;
    mainRoadmapLastType = null;
    mainRoadmapCurrentCol = 1;
    mainRoadmapLastRow = 0;
    mainRoadmapOccupied = {};
    mainRoadmapLastPlacedPos = null;
    historyPlacement = {};
    actionHistory = [];

    if (mainRoadmapGrid) mainRoadmapGrid.innerHTML = '';
    for (let i = 1; i <= 4; i++) {
        const grid = document.getElementById(`history-grid-${i}`);
        if (grid) grid.innerHTML = '';
    }

    for (const char of newBcdata) {
        const type = char.toLowerCase();
        if (type === 'p') playerCount++;
        else if (type === 'b') bankerCount++;
        else if (type === 't') { /* 타이 카운트는 현재 없음 */ }

        const currentActionItems = [];

        const mainPosition = calculateMainRoadmapPosition(type);
        if (mainPosition) {
            const itemId = addGridItemVisualOnly('roadmap-grid', mainPosition.row, mainPosition.col, type, false);
            if (itemId) {
                currentActionItems.push({ gridId: 'roadmap-grid', row: mainPosition.row, col: mainPosition.col, type, itemId });
                mainRoadmapOccupied[`c${mainPosition.col}-r${mainPosition.row}`] = true;
                if (mainRoadmapLastType === null || type !== mainRoadmapLastType) {
                    mainRoadmapCurrentCol = mainPosition.col;
                }
                mainRoadmapLastRow = mainPosition.row;
                mainRoadmapLastType = type;
                mainRoadmapLastPlacedPos = { col: mainPosition.col, row: mainPosition.row };
            }
        }

        for (let i = 1; i <= 4; i++) {
            const gridId = `history-grid-${i}`;
            const gridElement = document.getElementById(gridId);
            if (!gridElement) continue;

            const parentBox = gridElement.parentElement.parentElement;
            const maxRows = parseInt(parentBox.dataset.rows);

            let { col, row } = historyPlacement[gridId] || { col: 1, row: 1 };

            const itemId = addGridItemVisualOnly(gridId, row, col, type, true);
            if (itemId) {
                currentActionItems.push({ gridId, row, col, type, itemId });
                row++;
                if (row > maxRows) {
                    row = 1;
                    col++;
                }
                historyPlacement[gridId] = { col, row };
            }
        }
        actionHistory.push(currentActionItems);

    }
    updateCounts();
    if (mainRoadmapGrid) scrollToRightEnd('main-roadmap-container');
    for (let i = 1; i <= 4; i++) {
        const box = document.getElementById(`history-box-${i}`);
        if (box) scrollToRightEnd(box.id);
    }
    console.log("redrawAllGridsFromJokbo 완료.");
}

function resetMainRoadmapStateOnly() {
    mainRoadmapLastType = null;
    mainRoadmapCurrentCol = 1;
    mainRoadmapLastRow = 0;
    mainRoadmapOccupied = {};
    mainRoadmapLastPlacedPos = null;
}

function clearMoneySteps() {
    const container = document.getElementById('money-step');
    if (container) {
        container.innerHTML = '';
    }
}

async function resetHistoryClientSide() {
    if (confirm("정말로 모든 기록을 초기화하시겠습니까? (서버 데이터도 초기화됩니다)")) {
        showSpinner();
        try {
            const currentSettings = loadSavedSettings();
            const selectedLogic = currentSettings.selectedLogic || 'logic1';
            const aiBettingEnabled = currentSettings.aiBettingEnabled || false;

            const response = await fetch(PROCESS_GAME_RESULT_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': CSRF_TOKEN
                },
                body: JSON.stringify({
                    action: 'reset',
                    data: '',
                    selectedLogic: selectedLogic,
                    aiBettingEnabled: aiBettingEnabled,
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                showAlertModal({
                    title: '초기화 실패',
                    message: errorData.message || '서버 데이터 초기화 중 오류가 발생했습니다.',
                    icon: 'error'
                });
                hideSpinner();
                return;
            }

            resetStateAndStorage();
            if (mainRoadmapGrid) mainRoadmapGrid.innerHTML = '';
            for (let i = 1; i <= 4; i++) {
                const grid = document.getElementById(`history-grid-${i}`);
                if (grid) grid.innerHTML = '';
            }
            updateCounts();
            clearMoneySteps();
            updateActiveStepUI();

            const pageHeader = document.getElementById('page-header');
            if (pageHeader && pageHeader.__alpine_component) {
                pageHeader.__alpine_component.predictionHtml = '';
                pageHeader.__alpine_component.totMoney = '초기금액 0 셋팅 하였습니다.';
            }

            const toggleBtn = document.getElementById('view-toggle-btn');
            const consoleWrapper = document.getElementById('console-wrapper');
            const chartWrapper = document.getElementById('chart-wrapper');
            if (toggleBtn && consoleWrapper && chartWrapper) {
                chartWrapper.classList.add('hidden');
                consoleWrapper.classList.remove('hidden');
                toggleBtn.textContent = '차트 보기';
                toggleBtn.dataset.currentView = 'console';
            }
            clearConsole();
            updateAnalyticsChart();

            showAlertModal({
                title: '초기화 완료',
                message: '모든 기록이 성공적으로 초기화되었습니다.',
                icon: 'success',
                onConfirm: () => {
                    openModal('moneystepinfo-modal');
                }
            });

        } catch (error) {
            console.error("히스토리 초기화 전송 중 오류 발생:", error);
            showAlertModal({
                title: '네트워크 오류',
                message: '서버와 통신할 수 없습니다. 네트워크 연결을 확인해주세요.',
                icon: 'error'
            });
        } finally {
            hideSpinner();
            readjustHistoryScrollPosition();
        }
    }
}

let targetToastTimeouts = {};

function showToast(targetId, message, options = {}) {
    const config = {
        type: 'info',
        duration: 5000,
        position: 'overlay',
        onComplete: null,
        persistent: false,
        ...options
    };
    if (config.persistent && targetId === 'page-header') {
    } else if (targetToastTimeouts[targetId]) {
        clearTimeout(targetToastTimeouts[targetId]);
        const previousToast = document.getElementById(`toast-for-${targetId}`);
        if (previousToast) previousToast.remove();
        delete targetToastTimeouts[targetId];
    }
    let toastElement = document.createElement('div');
    let parentElement = document.body;
    let positionClasses = '';
    const targetElement = document.getElementById(targetId);
    if (config.position === 'center' || !targetElement) {
        positionClasses = 'center-toast';
    } else {
        parentElement = targetElement;
        if (window.getComputedStyle(parentElement).position === 'static') {
            parentElement.style.position = 'relative';
        }
        if (config.position === 'overlay') {
            positionClasses = 'element-toast-overlay';
        }
    }
    toastElement.id = `toast-for-${targetId}`;
    toastElement.innerHTML = message;
    toastElement.className =
        `toast-base ${positionClasses} toast-${config.type} ${config.customClass || ''} toast-hidden`;
    parentElement.appendChild(toastElement);
    requestAnimationFrame(() => {
        setTimeout(() => toastElement.classList.remove('toast-hidden'), 10);
    });
    if (!config.persistent) {
        targetToastTimeouts[targetId] = setTimeout(() => {
            const currentToast = document.getElementById(`toast-for-${targetId}`);
            if (currentToast) {
                currentToast.classList.add('toast-hidden');
                currentToast.addEventListener('transitionend', () => {
                    if (currentToast.parentNode) currentToast.remove();
                    if (typeof config.onComplete === 'function') config.onComplete();
                }, {
                    once: true
                });
            } else {
                if (typeof config.onComplete === 'function') config.onComplete();
            }
            delete targetToastTimeouts[targetId];
        }, config.duration);
    }
}

function setActiveStep(activeIndex) {
    const stepLabels = document.querySelectorAll('.step-label');
    stepLabels.forEach((label, index) => {
        const isActive = (index + 1) === activeIndex;
        label.classList.toggle('bg-cyan-500', isActive);
        label.classList.toggle('text-white', isActive);
        label.classList.toggle('shadow-lg', isActive);
        label.classList.toggle('bg-slate-700', !isActive);
        label.classList.toggle('text-slate-300', !isActive);
    });
}

function updateActiveStepUI() {
    const currentSettings = loadSavedSettings();
    const currentLogic = currentSettings.selectedLogic || 'logic1';
    let representativeStep = 1;
    if (currentLogic === 'logic1') {
        const logic1Steps = ['_pattern', 'tpattern', 'upattern', 'npattern'].map(key => logicState[key] || 1);
        if (logic1Steps.length > 0) representativeStep = Math.max(1, ...logic1Steps);
    } else if (currentLogic === 'logic2') {
        const stepA = logicState['logic2_A'] || 1;
        const stepB = logicState['logic2_B'] || 1;
        representativeStep = Math.max(stepA, stepB);
    } else if (currentLogic === 'logic3') {
        representativeStep = logicState['logic3_final'] || 1;
    } else if (currentLogic === 'logic4') {
        const logic4Steps = ['logic4_3mae', 'logic4_4mae', 'logic4_5mae'].map(key => logicState[key] || 1);
        if (logic4Steps.length > 0) representativeStep = Math.max(1, ...logic4Steps);
    }
    setActiveStep(representativeStep);
}

window.openModal = function (modalId) {
    console.log(`openModal(${modalId}) 호출됨`);
    window.dispatchEvent(new CustomEvent('modal-open', { detail: { modalId: modalId } }));
};

window.closeModal = function (modalId) {
    console.log(`closeModal(${modalId}) 호출됨`);
    window.dispatchEvent(new CustomEvent('modal-close', { detail: { modalId: modalId } }));
};

async function gotomoneyAndCloseModal(modalId) {
    const modalElement = document.getElementById(modalId);
    const moneyInput = modalElement?.querySelector('#money');
    const money = parseFloat(moneyInput.value.replace(/,/g, ''));
    if (isNaN(money) || money <= 0) {
        showAlertModal({ title: '입력 오류', message: '금액을 올바르게 입력하세요.', icon: 'error' });
        return;
    }
    showSpinner();

    const gameCount = 10;
    let tempMoneyRate = [];
    let currentMoney = money;
    for (let i = 0; i < gameCount; i++) {
        tempMoneyRate.push(currentMoney);
        currentMoney *= 2;
    }

    renderMoneySteps(tempMoneyRate);
    const pageHeader = document.getElementById('page-header');
    if (pageHeader && pageHeader.__alpine_component && moneyArrStep.length > 0) {
        pageHeader.__alpine_component.totMoney = '초기금액 ' + Number(moneyArrStep[0]).toLocaleString() + ' 셋팅 하였습니다.';
    }

    if (DeviceMode === 'Mobile') showMoneyInfoPop(tempMoneyRate);
    logicState = {};
    predictionHistory = [];
    displayPredictions([], 'logic1');
    updateActiveStepUI();

    closeModal(modalId);
    hideSpinner();
}


window.saveSetting = function (key, value) {
    let settings = loadSavedSettings();
    settings[key] = value;
    localStorage.setItem(GAMEENV_KEY, JSON.stringify(settings));

    if (key === 'virtualBettingEnabled') {
        if (value) {
            addConsoleMessage('가상 배팅 모드가 활성화되었습니다. (모든 로직 기록)', 'system');
        } else {
            addConsoleMessage('단일 배팅 모드가 활성화되었습니다. (선택 로직만 기록)', 'system');
        }
        const chartWrapper = document.getElementById('chart-wrapper');
        if (chartWrapper && !chartWrapper.classList.contains('hidden')) {
            updateAnalyticsChart();
        }
    }
    applyVisibility('money-step-wrapper', settings.moneyInfoVisible);
    applyVisibility('interactive-area', settings.showConsoleEnable);
};

function applyVisibility(elementId, isVisible) {
    const element = document.getElementById(elementId);
    if (element) element.style.display = isVisible ? 'flex' : 'none';
};


function showMoneyInfoPop(modalElement, moneyArray) {
    if (!moneyArray) return;
    const moneyInfo = modalElement.querySelector('#won-modal-body');
    if (!moneyInfo) {
        console.error("Money info modal body element not found in:", modalElement);
        return;
    }
    moneyInfo.innerHTML = '';
    let total = 0,
        html = '';
    moneyArray.forEach((amount, idx) => {
        total += Number(amount);
        html +=
            `<div class="step-label inactive flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium shadow-md flex items-center space-x-2 bg-slate-700 text-slate-300 border border-slate-500 mobile-button-text"><span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-xs font-semibold">${idx + 1}</span><span class="font-normal opacity-80">${Number(amount).toLocaleString()}</span></div>`;
    });
    html +=
        `<div class="flex-shrink-0 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium shadow-md flex items-center space-x-2 mobile-button-text"><i class="ti ti-calculator"></i><span class="font-normal opacity-90">${total.toLocaleString()}</span></div>`;
    moneyInfo.innerHTML = html;
}

async function loadAndOpenMyPageModal_Alpine(url, modalElement) {
    const modalBody = modalElement.querySelector('#mypage-modal-body-content');
    const loadingIndicator = modalElement.querySelector('#mypage-modal-loading');
    if (!modalBody) {
        console.error("Modal body element not found in:", modalElement);
        return;
    }

    if (loadingIndicator) loadingIndicator.classList.remove('hidden');
    modalBody.innerHTML = '';

    try {
        const djangoMypageUrl = '{% url "frontend:mypage" %}';
        const response = await fetch(`${djangoMypageUrl}?content_only=1`, {
            credentials: 'include'
        });
        if (response.ok) {
            modalBody.innerHTML = await response.text();
        } else {
            throw new Error(`서버 응답 오류: ${response.status}`);
        }
    } catch (error) {
        modalBody.innerHTML = `<div class="p-4 text-red-700">마이페이지 로딩 실패: ${error.message}</div>`;
    } finally {
        if (loadingIndicator) loadingIndicator.classList.add('hidden');
    }
}

function initConsole() {
    const savedMessages = localStorage.getItem('baccaratConsoleMessages');
    if (savedMessages) {
        consoleMessages = JSON.parse(savedMessages);
        const consoleBox = document.getElementById('console');
        consoleBox.innerHTML = '';
        consoleMessages.forEach(msg => {
            const msgEl = document.createElement('div');
            msgEl.className = `console-message ${msg.type} flex flex-row items-center`;
            msgEl.innerHTML = msg.text;
            consoleBox.appendChild(msgEl);
        });
        consoleBox.scrollTop = consoleBox.scrollHeight;
    } else {
        addConsoleMessage('콘솔이 초기화되었습니다.');
    }
}

function addConsoleMessage(message, type = 'system') {
    const consoleBox = document.getElementById('console');
    if (!consoleBox) return;
    const msgObj = {
        text: message,
        type: type,
        timestamp: new Date().getTime()
    };
    consoleMessages.push(msgObj);
    localStorage.setItem('baccaratConsoleMessages', JSON.stringify(consoleMessages));
    const msgEl = document.createElement('div');
    msgEl.className = `console-message ${type} flex flex-row items-center`;
    msgEl.innerHTML = message;
    consoleBox.appendChild(msgEl);
    consoleBox.scrollTop = consoleBox.scrollHeight;
}

function clearConsole() {
    localStorage.removeItem('baccaratConsoleMessages');
    consoleMessages = [];
    const consoleBox = document.getElementById('console');
    consoleBox.innerHTML = '';
    addConsoleMessage('콘솔이 초기화되었습니다.');
}

function copyConsoleToClipboard() {
    if (consoleMessages.length === 0) {
        showToast('center', '복사할 로그가 없습니다.', {
            type: 'info',
            duration: 2000,
            position: 'center'
        });
        return;
    }
    const logText = consoleMessages.map(msg => {
        const timestamp = new Date(msg.timestamp).toLocaleTimeString('ko-KR', {
            hour12: false
        });
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = msg.text;
        const cleanText = tempDiv.textContent || tempDiv.innerText || "";
        return `[${timestamp}] ${cleanText}`;
    }).join('\n');
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(logText).then(() => {
            showToast('center', '모든 로그가 클립보드에 복사되었습니다.', {
                type: 'success',
                duration: 2000,
                position: 'center'
            });
        }).catch(err => {
            console.error('클립보드 복사 실패 (navigator):', err);
            showToast('center', '로그 복사에 실패했습니다.', {
                type: 'error',
                duration: 2000,
                position: 'center'
            });
        });
    } else {
        const textArea = document.createElement("textarea");
        textArea.value = logText;
        textArea.style.position = "fixed";
        textArea.style.top = "-9999px";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                showToast('center', '모든 로그가 클립보드에 복사되었습니다.', {
                    type: 'success',
                    duration: 2000,
                    position: 'center'
                });
            } else {
                showToast('center', '로그 복사에 실패했습니다.', {
                    type: 'error',
                    duration: 2000,
                    position: 'center'
                });
            }
        } catch (err) {
            console.error('클립보드 복사 실패 (execCommand):', err);
            showToast('center', '로그 복사에 실패했습니다.', {
                type: 'error',
                duration: 2000,
                position: 'center'
            });
        }
        document.body.removeChild(textArea);
    }
}

async function updateAnalyticsChart() {
    console.log("updateAnalyticsChart 호출됨.");
    const ctx = document.getElementById('analytics-chart-inline')?.getContext('2d');

    if (!ctx || typeof Chart === 'undefined') {
        console.warn("Chart.js 캔버스 컨텍스트 또는 Chart 라이브러리를 찾을 수 없습니다. 차트를 업데이트할 수 없습니다.");
        return;
    }

    if (inlineChartInstance) {
        console.log("기존 차트 인스턴스 파괴 중...");
        inlineChartInstance.destroy();
        inlineChartInstance = null;
    }

    // 기존 인스턴스가 파괴되었거나 없으면 새로 생성합니다.
    if (!inlineChartInstance) {
        console.log("새로운 차트 인스턴스 생성 중...");
        Chart.register(ChartDataLabels);
        const isDarkMode = document.documentElement.classList.contains('dark');
        const tickColor = isDarkMode ? '#a0aec0' : '#4a5568';
        inlineChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: '승률(%)',
                    data: [],
                    backgroundColor: [
                        'rgba(59, 130, 246, 0.7)',
                        'rgba(239, 68, 68, 0.7)',
                        'rgba(34, 197, 94, 0.7)',
                        'rgba(168, 85, 247, 0.7)'
                    ]
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    datalabels: {
                        anchor: 'end',
                        align: 'end',
                        color: tickColor,
                        font: {
                            weight: 'bold'
                        },
                        formatter: function (value, context) {
                            const counts = context.chart.options.plugins.datalabels.context
                                ?.counts;
                            if (counts && counts[context.dataIndex] !== undefined) {
                                const count = counts[context.dataIndex];
                                return value + '% (' + count + '회)';
                            }
                            return value + '%';
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: tickColor,
                            callback: (v) => v + '%'
                        },
                        beginAtZero: true,
                        max: 100
                    },
                    y: {
                        ticks: {
                            color: tickColor,
                            autoSkip: false
                        }
                    }
                }
            }
        });
        console.log("새로운 차트 인스턴스 생성 완료.");
    }

    try {
        const dummyChartData = {
            'logic1': { win_rate: Math.floor(Math.random() * 30) + 50, count: Math.floor(Math.random() * 50) + 80 },
            'logic2': { win_rate: Math.floor(Math.random() * 30) + 50, count: Math.floor(Math.random() * 50) + 80 },
            'logic3': { win_rate: Math.floor(Math.random() * 30) + 50, count: Math.floor(Math.random() * 50) + 80 },
            'logic4': { win_rate: Math.floor(Math.random() * 30) + 50, count: Math.floor(Math.random() * 50) + 80 },
            'virtual_betting': { win_rate: Math.floor(Math.random() * 30) + 50, count: Math.floor(Math.random() * 50) + 80 }
        };

        const labels = [];
        const winRateData = [];
        const countData = [];

        for (const key in dummyChartData) {
            let logicDisplayName = '';
            if (key === 'logic1') logicDisplayName = '로직1';
            else if (key === 'logic2') logicDisplayName = '로직2';
            else if (key === 'logic3') logicDisplayName = '로직3';
            else if (key === 'logic4') logicDisplayName = '로직4';
            else if (key === 'virtual_betting') logicDisplayName = '가상배팅';

            labels.push(logicDisplayName);
            winRateData.push(dummyChartData[key].win_rate);
            countData.push(dummyChartData[key].count);
        }

        inlineChartInstance.data.labels = labels;
        inlineChartInstance.data.datasets[0].data = winRateData;
        inlineChartInstance.data.datasets[0].backgroundColor = [
            'rgba(59, 130, 246, 0.7)',
            'rgba(239, 68, 68, 0.7)',
            'rgba(34, 197, 94, 0.7)',
            'rgba(168, 85, 247, 0.7)',
            'rgba(245, 158, 11, 0.7)'
        ];


        if (inlineChartInstance.options.plugins.datalabels.context === undefined) {
            inlineChartInstance.options.plugins.datalabels.context = {};
        }
        inlineChartInstance.options.plugins.datalabels.context.counts = countData;

        inlineChartInstance.options.plugins.datalabels.anchor = 'end';
        inlineChartInstance.options.plugins.datalabels.align = 'start';

        inlineChartInstance.update();
        console.log("차트 데이터 업데이트 완료.");

    } catch (error) {
        console.error("차트 데이터 업데이트 중 오류 발생:", error);
    }
}

function showAlertModal(options) {
    console.log("showAlertModal 호출됨 (이벤트 디스패치 방식)");
    window.dispatchEvent(new CustomEvent('show-custom-alert', {
        detail: {
            title: options.title || '알림',
            message: options.message || '',
            icon: options.icon || 'info',
            onConfirm: options.onConfirm || (() => { })
        }
    }));
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function calculateVisibleCols(gridId) {
    const gridElement = document.getElementById(gridId);
    if (!gridElement) return 0;

    const parentScrollWrapper = gridElement.parentElement;
    if (!parentScrollWrapper) return 0;

    const gridComputedStyle = window.getComputedStyle(gridElement);
    const gridAutoColumns = gridComputedStyle.getPropertyValue('grid-auto-columns');
    const historyCheckerSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--history-checker-size'));

    if (isNaN(historyCheckerSize) || historyCheckerSize === 0) {
        console.warn(`--history-checker-size is not a valid number for ${gridId}`);
        return 0;
    }

    const wrapperWidth = parentScrollWrapper.offsetWidth;

    const gridContainer = parentScrollWrapper.parentElement;
    const gridContainerStyle = window.getComputedStyle(gridContainer);
    const columnGap = parseFloat(gridContainerStyle.columnGap) || 0;

    const gridPaddingLeft = parseFloat(gridComputedStyle.paddingLeft) || 0;
    const gridPaddingRight = parseFloat(gridComputedStyle.paddingRight) || 0;

    let maxCols = 0;
    let currentWidth = 0;
    while (true) {
        let tentativeWidth = (maxCols * historyCheckerSize) + (Math.max(0, maxCols - 1) * columnGap);
        if (tentativeWidth <= wrapperWidth) {
            maxCols++;
        } else {
            break;
        }
    }
    return Math.max(1, maxCols - 1);
}

function readjustHistoryScrollPosition() {
    for (let i = 1; i <= 4; i++) {
        const scrollWrapperId = `history-scroll-wrapper-${i}`;
        const gridId = `history-grid-${i}`;
        const scrollWrapper = document.getElementById(scrollWrapperId);
        const gridElement = document.getElementById(gridId);

        if (!scrollWrapper || !gridElement) continue;

        const maxVisibleCols = calculateVisibleCols(gridId);
        if (maxVisibleCols === 0) continue;

        const totalCols = gridElement.children.length > 0
            ? Math.max(...Array.from(gridElement.children).map(item => parseInt(item.style.gridColumn)))
            : 0;

        if (totalCols === 0) {
            scrollWrapper.scrollLeft = 0;
            continue;
        }

        const lastItemCol = totalCols;

        const historyCheckerSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--history-checker-size'));
        const columnGap = parseFloat(getComputedStyle(gridElement.parentElement.parentElement).columnGap) || 0;

        let scrollTargetLeft = (lastItemCol - maxVisibleCols) * (historyCheckerSize + columnGap);
        scrollWrapper.scrollLeft = Math.max(0, scrollTargetLeft);
    }
}

// ====================================
// --- 이벤트 리스너 및 초기화 ---
// ====================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOMContentLoaded 이벤트 발생!');

    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const applyDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    if (applyDark) {
        document.documentElement.classList.add('dark');
        console.log('초기 테마: 다크모드');
    } else {
        document.documentElement.classList.remove('dark');
        console.log('초기 테마: 라이트모드');
    }

    playerBtn = document.getElementById('player-btn');
    bankerBtn = document.getElementById('banker-btn');
    cancelBtn = document.getElementById('cancel-btn');
    resetBtn = document.getElementById('reset-btn');
    playerCountSpan = document.getElementById('player-count');
    bankerCountSpan = document.getElementById('banker-count');
    totalCountSpan = document.getElementById('total-count');
    mainRoadmapGrid = document.getElementById('roadmap-grid');

    logicBtnGroup = document.getElementById('logic-btn-group');
    if (logicBtnGroup) {
        logicButtons = logicBtnGroup.querySelectorAll('.logic-btn');
    }
    copyBtn = document.getElementById('view-copy-btn');

    if (playerBtn) playerBtn.addEventListener('click', (e) => { console.log('Player button clicked', e.target); addHistoryItemClientSide('player', playerBtn); });
    if (bankerBtn) bankerBtn.addEventListener('click', (e) => { console.log('Banker button clicked', e.target); addHistoryItemClientSide('banker', bankerBtn); });
    if (cancelBtn) cancelBtn.addEventListener('click', (e) => { console.log('Cancel button clicked', e.target); undoLastActionClientSide(); });
    if (resetBtn) resetBtn.addEventListener('click', (e) => { console.log('Reset button clicked', e.target); resetHistoryClientSide(); });
    if (copyBtn) copyBtn.addEventListener('click', (e) => { console.log('Copy button clicked', e.target); copyConsoleToClipboard(); });


    if (logicBtnGroup) {
        const currentLogicButtons = logicBtnGroup.querySelectorAll('.logic-btn');
        currentLogicButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                console.log('--- 로직 버튼 개별 클릭 감지 ---');
                console.log('event.target (클릭된 원본 요소):', event.target);
                console.log('클릭된 버튼 (button):', button);

                const newValue = button.dataset.value;
                console.log('선택된 로직 값 (newValue):', newValue);

                updateLogicButtonsUI(newValue);
                console.log('updateLogicButtonsUI 호출됨.');

                let settings = loadSavedSettings();
                settings.selectedLogic = newValue;
                localStorage.setItem(GAMEENV_KEY, JSON.stringify(settings));
                console.log('로컬 스토리지에 로직 저장됨:', settings.selectedLogic);

                showToast('center', `선택된 로직이 '${newValue}'(으)로 변경되어 저장되었습니다.`, {
                    type: 'info',
                    duration: 1000,
                    position: 'center'
                });
                addConsoleMessage(`선택된 로직이 '${newValue}'(으)로 변경되어 저장되었습니다.`, 'system');
                console.log('showToast 및 addConsoleMessage 호출됨.');
            });
        });
    }


    const initialSettings = loadSavedSettings();
    console.log('초기 설정 로드됨:', initialSettings);

    applySettings(initialSettings);
    console.log('설정 적용됨.');

    updateActiveStepUI();
    console.log('액티브 스텝 UI 업데이트됨.');

    // 서버로부터 초기 상태 로드
    if (DJANGO_CONTEXT.memberId !== "guest") {
        await loadStateFromBackend();
    } else {
        loadStateFromLocalStorage();
        redrawAllGrids();
        updateCounts();
        renderMoneySteps(moneyArrStep);
        // updateActiveStepUI();
        // updateAnalyticsChart();
    }

    console.log('금액 스텝 렌더링됨.');

    const pageHeader = document.getElementById('page-header');
    if (pageHeader && pageHeader.__alpine_component) {
        if (moneyArrStep && moneyArrStep.length > 0) {
            pageHeader.__alpine_component.totMoney = '초기금액 ' + Number(moneyArrStep[0]).toLocaleString() + ' 셋팅 하였습니다.';
        } else {
            pageHeader.__alpine_component.totMoney = '초기금액 0 셋팅 하였습니다.';
        }
    }

    for (let i = 1; i <= 4; i++) {
        const wrapper = document.querySelector(`#history-box-${i} .history-scroll-wrapper`);
        if (wrapper) {
            wrapper.id = `history-scroll-wrapper-${i}`;
            console.log(`History scroll wrapper ${i} assigned ID: ${wrapper.id}`);
        }
    }

    hideSpinner();
    console.log('스피너 숨김 요청됨.');

    const toggleBtn = document.getElementById('view-toggle-btn');
    const consoleWrapper = document.getElementById('console-wrapper');
    const chartWrapper = document.getElementById('chart-wrapper');

    if (toggleBtn && consoleWrapper && chartWrapper) {

        toggleBtn.addEventListener('click', () => {
            const currentView = toggleBtn.dataset.currentView;
            if (currentView === 'console') {
                console.log('차트 보기 버튼 클릭됨 -> 차트 표시');
                consoleWrapper.classList.add('hidden');
                chartWrapper.classList.remove('hidden');
                toggleBtn.textContent = '콘솔 보기';
                toggleBtn.dataset.currentView = 'chart';
                updateAnalyticsChart();
            } else {
                console.log('콘솔 보기 버튼 클릭됨 -> 콘솔 표시');
                chartWrapper.classList.add('hidden');
                consoleWrapper.classList.remove('hidden');
                toggleBtn.textContent = '차트 보기';
                toggleBtn.dataset.currentView = 'console';
            }
        });
    }

    initConsole();
    if (predictionHistory.length > 0) {
        const lastHistoryEntry = predictionHistory[predictionHistory.length - 1];
        if (lastHistoryEntry && lastHistoryEntry.currentState) {
            displayPredictions(lastHistoryEntry.currentState.predictions_to_show, lastHistoryEntry
                .selectedLogic);
            addConsoleMessage('이전 세션의 마지막 예측을 복원했습니다.', 'system');
        }
    }
    if (inlineChartInstance) {
        updateAnalyticsChart();
    }

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            console.log("해상도 변경 감지! 히스토리보드 스크롤 재조정.");
            readjustHistoryScrollPosition();
        }, 200);
    });

    readjustHistoryScrollPosition();

    window.addEventListener('beforeunload', function (e) {
        var confirmationMessage = '정말로 새로고침 하시겠습니까? 데이터가 소실될 수 있습니다.';
        if (heartbeatInterval !== null) {
            clearInterval(heartbeatInterval);
            console.log("Heartbeat interval cleared on beforeunload.");
        }
        e.returnValue = confirmationMessage;
        return confirmationMessage;
    });

    heartbeatInterval = setInterval(async () => {
        const isMember = DJANGO_CONTEXT.memberId !== "guest";
        if (!isMember) {
            clearInterval(heartbeatInterval);
            console.log("Heartbeat: 비회원 사용자, 하트비트 및 메시지 확인 중지.");
            return;
        }

        try {
            const heartbeatResponse = await fetch(HEARTBEAT_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': CSRF_TOKEN
                },
                body: JSON.stringify({})
            });

            if (!heartbeatResponse.ok) {
                if (heartbeatResponse.status === 401 || heartbeatResponse.status === 403) {
                    console.warn("Heartbeat: 인증 실패 또는 권한 없음. 자동으로 로그아웃 처리합니다.");
                    clearInterval(heartbeatInterval);
                    showAlertModal({
                        title: '세션 만료',
                        message: '세션이 만료되었거나 로그아웃되었습니다. 다시 로그인해주세요.',
                        icon: 'warning',
                        onConfirm: () => {
                            window.location.href = DJANGO_CONTEXT.G5BbsUrl;
                        }
                    });
                } else {
                    const errorData = await heartbeatResponse.json().catch(() => ({ message: '알 수 없는 서버 오류' }));
                    console.error("Heartbeat API 오류:", heartbeatResponse.status, heartbeatResponse.statusText, errorData.message);
                }
            }
        } catch (error) {
            console.error("Heartbeat API 호출 중 네트워크 오류:", error);
            showAlertModal({
                title: '네트워크 오류',
                message: '서버와 통신할 수 없습니다. 네트워크 연결을 확인해주세요.',
                icon: 'error',
                onConfirm: () => {
                }
            });
        }

        try {
            const broadcastResponse = await fetch(BROADCAST_MESSAGE_API_URL, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': CSRF_TOKEN
                }
            });

            if (broadcastResponse.status === 204) {
                return;
            }

            if (broadcastResponse.ok) {
                const message = await broadcastResponse.json();
                const lastSeenId = localStorage.getItem(LAST_SEEN_BROADCAST_KEY);

                if (message && message.id && String(message.id) !== lastSeenId) {
                    showAlertModal({
                        title: `[${message.category}]`,
                        message: message.message,
                        icon: message.category_raw === 'warning' ? 'warning' : 'info',
                        onConfirm: () => {
                            localStorage.setItem(LAST_SEEN_BROADCAST_KEY, message.id);
                        }
                    });
                }
            } else {
                const errorData = await broadcastResponse.json().catch(() => ({ message: '알 수 없는 서버 오류' }));
                console.error("Broadcast API 오류:", broadcastResponse.status, broadcastResponse.statusText, errorData.message);
            }
        } catch (error) {
            console.error("Broadcast API 호출 중 네트워크 오류:", error);
        }

    }, 30000);

    if (DJANGO_CONTEXT.memberId !== "guest") {
        await loadStateFromBackend();
    } else {
        loadStateFromLocalStorage();
        redrawAllGrids();
        updateCounts();
        renderMoneySteps(moneyArrStep);
        updateAnalyticsChart();
        updateActiveStepUI();
    }

    document.querySelectorAll('.modal-base').forEach(modalElement => {
        if (modalElement.__alpine_component) {
            modalElement.addEventListener('modal-open', () => {
                modalElement.__alpine_component.open = true;
            });
            modalElement.addEventListener('modal-close', () => {
                modalElement.__alpine_component.open = false;
            });
        }
    });

    if (DJANGO_CONTEXT.isShowMoneyInfo) {
        console.log("DJANGO_CONTEXT.isShowMoneyInfo가 true여서 moneystepinfo-modal을 엽니다.");
    }
});