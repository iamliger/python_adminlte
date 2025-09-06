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
    virtualBettingEnabled: true
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
// --- 유틸리티 및 UI 함수 (모든 호출보다 먼저 정의) ---
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
    console.log("applySettings 호출됨:", settings); // <--- 디버깅 로그 추가
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

            // 모든 버튼의 기본 클래스 (공통된 스타일)
            const baseClasses = "relative inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium shadow mobile-button-text";
            const darkBorderClass = "dark:border-gray-600";
            const focusClasses = "focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500";
            const roundedLeft = "rounded-l-md";
            const roundedRight = "rounded-r-md";
            const marginLeft = "-ml-px"; // 가운데 버튼에만 적용

            // 버튼의 현재 라운딩 및 마진 상태를 유지해야 합니다.
            let currentRoundingClass = '';
            if (button.classList.contains(roundedLeft)) currentRoundingClass = roundedLeft;
            else if (button.classList.contains(roundedRight)) currentRoundingClass = roundedRight;

            let currentMarginClass = '';
            if (button.classList.contains(marginLeft)) currentMarginClass = marginLeft;

            if (isActive) {
                // 활성화된 버튼에 적용할 클래스 조합
                button.className = `${baseClasses} ${focusClasses} ${currentRoundingClass} ${currentMarginClass} ${darkBorderClass} bg-indigo-600 text-white hover:bg-indigo-700`;
            } else {
                // 비활성화된 버튼에 적용할 클래스 조합
                button.className = `${baseClasses} ${focusClasses} ${currentRoundingClass} ${currentMarginClass} ${darkBorderClass} bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600`;
            }
            // `button.className = ...` 방식을 사용하면 기존 클래스가 모두 덮어씌워지므로,
            // `rounded-l-md`, `-ml-px` 등의 클래스도 다시 설정해 주어야 합니다.
            // 또는, `classList.remove` 및 `classList.add`를 사용하여 필요한 클래스만 토글합니다.
            // 이전 방식인 `classList.add`와 `classList.remove`를 사용하되, 모든 관련 클래스를 명시합니다.

            if (isActive) {
                button.classList.add('bg-indigo-600', 'text-white', 'hover:bg-indigo-700');
                button.classList.remove('bg-white', 'text-gray-700', 'hover:bg-gray-50', 'dark:bg-gray-700', 'dark:text-gray-200', 'dark:hover:bg-gray-600');
            } else {
                button.classList.remove('bg-indigo-600', 'text-white', 'hover:bg-indigo-700');
                button.classList.add('bg-white', 'text-gray-700', 'hover:bg-gray-50', 'dark:bg-gray-700', 'dark:text-gray-200', 'dark:hover:bg-gray-600');
            }
            // border 클래스 (`border`, `border-gray-300`, `dark:border-gray-600`) 및 `focus` 클래스는
            // 항상 유지되어야 하는 공통 클래스이므로, 토글 대상에서 제외합니다.
            // `-ml-px`나 `rounded-l-md`, `rounded-r-md` 같은 레이아웃 클래스도 유지되어야 합니다.
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
    if (upperStr === 'B') return `<!-- --> <span class="baccarat-circle banker">B</span>`;
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
    if (type === 'player') {
        typeClass = 'player';
        textContent = 'P';
    } else if (type === 'banker') {
        typeClass = 'banker';
        textContent = 'B';
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

// renderMoneySteps 함수를 유틸리티 함수 그룹 내에 정의
function renderMoneySteps(moneyArray) {
    const container = document.getElementById('money-step');
    if (!container || !Array.isArray(moneyArray)) return;
    let total = 0,
        html = '';
    moneyArrStep = []; // 전역 moneyArrStep 업데이트
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


function displayPredictions(predictions, selectedLogic) {
    const pageHeader = document.getElementById('page-header');
    if (!pageHeader || !pageHeader.__alpine_component) {
        console.warn("Alpine.js header component not found for predictions.");
        // pageHeader.__alpine_component가 없으면 직접 DOM을 조작하여 임시로 표시
        const headerPredToast = document.getElementById('persistent-prediction-toast');
        if (headerPredToast) {
            if (!predictions || !selectedLogic || predictions.length === 0) {
                headerPredToast.innerHTML = '';
                headerPredToast.style.display = 'none';
            } else {
                const htmlParts = predictions.map(p => { /* ... 기존 htmlParts 생성 로직 ... */
                    const patternKey = p.patternKey;
                    const currentStep = logicState[patternKey] || 1;
                    const amountStr = (moneyArrStep && moneyArrStep.length > 0 && moneyArrStep[currentStep - 1] !== undefined) ? addComma(moneyArrStep[currentStep - 1]) : '...';
                    const bettingPosHtml = renderBettingPosition(p.bettingpos);

                    const measuDisplay = (p.measu !== undefined && p.measu !== null && p.measu !== '') ? `[${p.measu}매]` : '';
                    const displayName = p.display_name || (patternKey ? patternKey.replace(/_/g, ' ').replace('pattern', '').trim() : '로직');

                    return `<div class="flex items-center gap-1 text-sm">
                                <span class="font-semibold text-gray-400">${displayName}:</span>
                                <div class="flex items-center gap-1">${bettingPosHtml} ${amountStr} ${measuDisplay} (${currentStep}단계)</div>
                            </div>`;
                }).join('<div class="w-px h-5 bg-white/20 mx-1"></div>');
                headerPredToast.innerHTML = `<div class="flex items-center justify-center w-full gap-2">${htmlParts}</div>`;
                headerPredToast.style.display = 'flex';
            }
        }
        return;
    }

    // ... (Alpine.js 컴포넌트가 있을 때의 기존 로직 유지) ...
    const htmlParts = predictions.map(p => {
        const patternKey = p.patternKey;
        const currentStep = logicState[patternKey] || 1;
        const amountStr = (moneyArrStep && moneyArrStep.length > 0 && moneyArrStep[currentStep - 1] !== undefined) ? addComma(moneyArrStep[currentStep - 1]) : '...';
        const bettingPosHtml = renderBettingPosition(p.bettingpos);

        const measuDisplay = (p.measu !== undefined && p.measu !== null && p.measu !== '') ? `[${p.measu}매]` : '';
        const displayName = p.display_name || (patternKey ? patternKey.replace(/_/g, ' ').replace('pattern', '').trim() : '로직');

        return `<div class="flex items-center gap-1 text-sm">
                    <span class="font-semibold text-gray-400">${displayName}:</span>
                    <div class="flex items-center gap-1">${bettingPosHtml} ${amountStr} ${measuDisplay} (${currentStep}단계)</div>
                </div>`;
    }).join('<div class="w-px h-5 bg-white/20 mx-1"></div>');

    const combinedMessage = `<div class="flex items-center justify-center w-full gap-2">${htmlParts}</div>`;

    pageHeader.__alpine_component.predictionHtml = combinedMessage;
}


function logRecommendation(currentState, selectedLogic) {
    const predictions = currentState.predictions_to_show;

    if (!predictions || predictions.length === 0) {
        return;
    }

    const messageParts = predictions.map(p => {
        const bettingPosHtml = renderBettingPosition(p.bettingpos);
        const currentStep = currentState.full_logic_state[p.patternKey] || 1;
        const amountStr = moneyArrStep[currentStep - 1] ? addComma(moneyArrStep[currentStep - 1]) : '...';

        return `${bettingPosHtml} ${amountStr}`;
    });

    const combinedPredictions = messageParts.join(' ');

    addConsoleMessage(`다음 추천은 ${combinedPredictions} 제시합니다.`, 'system');
}

async function addHistoryItemClientSide(type, button) {
    const currentActionItems = [];
    button.disabled = true;

    let addJokbo = (type === 'player') ? 'P' : 'B';
    jokboHistory += addJokbo;

    const currentSettings = loadSavedSettings();
    const currentLogic = currentSettings.selectedLogic || 'logic1';
    const virtualBettingEnabled = currentSettings.virtualBettingEnabled || false;

    if (!logicState['logic1_pattern']) logicState['logic1_pattern'] = 1;
    if (!logicState['logic2_A']) logicState['logic2_A'] = 1;
    if (!logicState['logic3_final']) logicState['logic3_final'] = 1;
    if (!logicState['logic4_3mae']) logicState['logic4_3mae'] = 1;

    logicState['logic1_pattern']++;
    logicState['logic2_A']++;
    logicState['logic3_final']++;
    logicState['logic4_3mae']++;

    const dummyPredictions = [
        { patternKey: 'logic1_pattern', bettingpos: 'B', measu: 10, display_name: '본매' },
        { patternKey: 'logic2_A', bettingpos: 'P', measu: 5, display_name: '장줄' },
        { patternKey: 'logic3_final', bettingpos: 'B', measu: 7, display_name: '꺾기' },
        { patternKey: 'logic4_3mae', bettingpos: 'P', measu: 3, display_name: '3매' }
    ];

    const dummyCurrentState = {
        full_logic_state: logicState,
        predictions_to_show: dummyPredictions
    };

    const historyEntry = {
        currentState: dummyCurrentState,
        selectedLogic: currentLogic
    };
    predictionHistory.push(historyEntry);
    displayPredictions(dummyCurrentState.predictions_to_show, currentLogic);
    logRecommendation(dummyCurrentState, currentLogic);
    updateActiveStepUI();

    button.disabled = false;
    if (type === 'player') addConsoleMessage(`플레이어를 선택했습니다.`, 'player');
    else if (type === 'banker') addConsoleMessage(`뱅커를 선택했습니다.`, 'banker');
    drawRoadmaps(type, currentActionItems);
    updateStateAndSave(type, currentActionItems);
    updateAnalyticsChart();

    readjustHistoryScrollPosition();
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

function undoLastActionClientSide() {
    if (actionHistory.length === 0) {
        showToast('center', '취소할 기록이 없습니다.', {
            type: 'error'
        });
        return;
    }
    showSpinner();

    if (logicState['logic1_pattern'] > 1) logicState['logic1_pattern']--;
    if (logicState['logic2_A'] > 1) logicState['logic2_A']--;
    if (logicState['logic3_final'] > 1) logicState['logic3_final']--;
    if (logicState['logic4_3mae'] > 1) logicState['logic4_3mae']--;

    predictionHistory.pop();
    const actionToUndo = actionHistory.pop();
    jokboHistory = jokboHistory.slice(0, -1);
    let undoneType = '';
    actionToUndo.forEach(item => {
        const itemToRemove = document.getElementById(item.itemId);
        if (itemToRemove) {
            itemToRemove.remove();
            undoneType = item.type;
            if (item.gridId === 'roadmap-grid') delete mainRoadmapOccupied[
                `c${item.col}-r${item.row}`];
            if (item.gridId.startsWith('history-grid-')) historyPlacement[item.gridId] = {
                col: item.col,
                row: item.row
            };
        }
    });
    if (actionHistory.length > 0) {
        let lastAction = actionHistory[actionHistory.length - 1];
        let lastMainItem = lastAction.find(i => i.gridId === 'roadmap-grid');
        if (lastMainItem) {
            mainRoadmapLastType = lastMainItem.type;
            mainRoadmapLastPlacedPos = {
                col: lastMainItem.col,
                row: lastMainItem.row
            };
            let tempCol = 1;
            let lastDragonStartCol = 1;
            for (let i = 0; i < actionHistory.length; i++) {
                let currentMainItem = actionHistory[i].find(it => it.gridId === 'roadmap-grid');
                if (i > 0) {
                    let prevMainItem = actionHistory[i - 1].find(it => it.gridId === 'roadmap-grid');
                    if (currentMainItem.type !== prevMainItem.type) {
                        tempCol = currentMainItem.col;
                    }
                }
                lastDragonStartCol = tempCol;
            }
            mainRoadmapCurrentCol = lastDragonStartCol;
            mainRoadmapLastRow = lastMainItem.row;
        } else {
            resetMainRoadmapStateOnly();
        }
    } else {
        resetMainRoadmapStateOnly();
    }
    if (undoneType === 'player') playerCount = Math.max(0, playerCount - 1);
    else if (undoneType === 'banker') bankerCount = Math.max(0, bankerCount - 1);
    updateCounts();
    saveStateToLocalStorage();

    if (predictionHistory.length > 0) {
        const lastHistoryEntry = predictionHistory[predictionHistory.length - 1];
        if (lastHistoryEntry && lastHistoryEntry.currentState) {
            displayPredictions(lastHistoryEntry.currentState.predictions_to_show, lastHistoryEntry
                .selectedLogic);
        }
    } else {
        const pageHeader = document.getElementById('page-header');
        if (pageHeader && pageHeader.__alpine_component) {
            pageHeader.__alpine_component.predictionHtml = '';
        }
    }
    updateAnalyticsChart();
    updateActiveStepUI();
    readjustHistoryScrollPosition();

    hideSpinner();
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
    showSpinner();

    if (confirm("정말로 모든 기록을 초기화하시겠습니까?")) {
        console.clear();
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
        showToast('center',
            '<i class="ti ti-info-circle text-xl"></i> 모든 기록이 초기화되었습니다.', {
            type: 'success',
            duration: 1000,
            position: 'center',
            onComplete: () => {
                openModal('moneystepinfo-modal');
                clearConsole();
                updateAnalyticsChart();
            }
        });
    }
    hideSpinner();
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

window.saveSettings = function () {
    console.log("saveSettings() called!");
    const modalElement = document.getElementById('setting-box-modal');
    if (modalElement && modalElement.__alpine_component) {
        const alpineComponent = modalElement.__alpine_component;
        const settings = {
            gameSettingEnabled: alpineComponent.gameSettingEnabled,
            moneyInfoVisible: alpineComponent.moneyInfoVisible,
            soundSettingEnable: alpineComponent.soundSettingEnable,
            showConsoleEnable: alpineComponent.showConsoleEnable,
            virtualBettingEnabled: alpineComponent.virtualBettingEnabled
        };
        localStorage.setItem(GAMEENV_KEY, JSON.stringify(settings));
        console.log("모든 설정이 로컬 스토리지에 저장됨:", settings);

        // 설정 저장 후 UI 업데이트 적용
        applyVisibility('money-step-wrapper', settings.moneyInfoVisible);
        applyVisibility('interactive-area', settings.showConsoleEnable);
        updateLogicButtonsUI(settings.selectedLogic); // 선택 로직도 다시 적용
    } else {
        console.error("saveSettings() - Alpine.js component not found for setting-box-modal.");
    }
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
        // `DJANGO_CONTEXT.G5Url + 'mypage.php'` 대신 Django URL 패턴을 사용합니다.
        const djangoMypageUrl = '{% url "frontend:mypage" %}'; // <--- Django URL 템플릿 태그 사용
        // 이 JS 파일은 Django 템플릿에 의해 직접 렌더링되므로 템플릿 태그 사용 가능
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
    if (!inlineChartInstance) {
        return;
    }
    try {
        const settings = loadSavedSettings();
        const isVirtualEnabled = settings.virtualBettingEnabled;
        const selectedLogic = settings.selectedLogic;
        let fetchUrl = G5_URL + 'ajax_baccara/get_analytics_data.php';

        const dummyChartData = {
            'logic1_pattern': { win_rate: 65, count: 120 },
            'logic2_A': { win_rate: 58, count: 90 },
            'logic3_final': { win_rate: 72, count: 150 },
            'logic4_3mae': { win_rate: 61, count: 80 }
        };

        const labels = [];
        const winRateData = [];
        const countData = [];

        for (const key in dummyChartData) {
            const logicName = 'Logic ' + key.substring(5);
            labels.push(logicName);
            winRateData.push(dummyChartData[key].win_rate);
            countData.push(dummyChartData[key].count);
        }

        inlineChartInstance.data.labels = labels;
        inlineChartInstance.data.datasets[0].data = winRateData;

        if (inlineChartInstance.options.plugins.datalabels.context === undefined) {
            inlineChartInstance.options.plugins.datalabels.context = {};
        }
        inlineChartInstance.options.plugins.datalabels.context.counts = countData;

        inlineChartInstance.update();

    } catch (error) {
        console.error("차트 데이터 업데이트 중 오류 발생:", error);
    }
}

function showAlertModal(options) {
    const modalElement = document.getElementById('alert-modal');
    if (!modalElement || !modalElement.__alpine_component) {
        alert(`${options.title}\n${options.message}`);
        if (typeof options.onConfirm === 'function') {
            options.onConfirm();
        }
        return;
    }

    modalElement.__alpine_component.title = options.title || '알림';
    modalElement.__alpine_component.message = options.message || '';
    modalElement.__alpine_component.icon = options.icon || 'info';
    modalElement.__alpine_component.onConfirm = options.onConfirm || (() => { });
    modalElement.__alpine_component.open = true;
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

    const parentScrollWrapper = gridElement.parentElement; // .history-scroll-wrapper
    if (!parentScrollWrapper) return 0;

    const gridComputedStyle = window.getComputedStyle(gridElement);
    const gridAutoColumns = gridComputedStyle.getPropertyValue('grid-auto-columns');
    // 'var(--history-checker-size)' 형태의 값을 실제 픽셀 값으로 파싱해야 합니다.
    // 이는 복잡하므로, 가장 간단하게 `--history-checker-size` CSS 변수를 직접 가져와 사용합니다.
    const historyCheckerSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--history-checker-size'));

    if (isNaN(historyCheckerSize) || historyCheckerSize === 0) {
        console.warn(`--history-checker-size is not a valid number for ${gridId}`);
        return 0;
    }

    const wrapperWidth = parentScrollWrapper.offsetWidth; // 스크롤 래퍼의 실제 너비 (padding 포함)

    // 가로 간격(column-gap)도 고려해야 합니다.
    const gridContainer = parentScrollWrapper.parentElement; // history-box-X
    const gridContainerStyle = window.getComputedStyle(gridContainer);
    const columnGap = parseFloat(gridContainerStyle.columnGap) || 0; // 부모 그리드의 column-gap

    // `history-grid`의 좌우 padding도 고려 (현재는 0으로 설정되어 있음)
    const gridPaddingLeft = parseFloat(gridComputedStyle.paddingLeft) || 0;
    const gridPaddingRight = parseFloat(gridComputedStyle.paddingRight) || 0;

    // wrapperWidth에서 그리드 자체의 padding과 gap을 제외한 순수 콘텐츠 영역 계산
    // 이 로직은 `[id^="history-grid-"]`에 `width: max-content`와 `min-width: 100%`를
    // 적용했을 때, `wrapperWidth` 안에 몇 개의 셀이 들어갈 수 있는지 계산합니다.

    // 아이템 사이의 gap 개수는 (보이는 열 수 - 1) 입니다.
    // (보이는 열 수 * 셀 크기) + (보이는 열 수 - 1) * 갭 크기 <= wrapperWidth
    // 이 방정식 풀어서 보이는 열 수(maxCols) 찾기
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
    return Math.max(1, maxCols - 1); // 최소 1개 열은 보이도록
}

function readjustHistoryScrollPosition() {
    for (let i = 1; i <= 4; i++) {
        const scrollWrapperId = `history-scroll-wrapper-${i}`;
        const gridId = `history-grid-${i}`;
        const scrollWrapper = document.getElementById(scrollWrapperId);
        const gridElement = document.getElementById(gridId);

        if (!scrollWrapper || !gridElement) continue;

        // 현재 뷰포트에서 최대로 보여줄 수 있는 열의 수를 계산
        const maxVisibleCols = calculateVisibleCols(gridId);
        if (maxVisibleCols === 0) continue;

        // 현재 히스토리 그리드에 있는 총 열의 수
        const totalCols = gridElement.children.length > 0
            ? Math.max(...Array.from(gridElement.children).map(item => parseInt(item.style.gridColumn)))
            : 0;

        if (totalCols === 0) { // 아이템이 없으면 스크롤할 필요 없음
            scrollWrapper.scrollLeft = 0;
            continue;
        }

        // 맨 마지막 아이템이 포함된 열 번호 (1-based)
        const lastItemCol = totalCols;

        // 맨 마지막 아이템이 화면에 보이도록 스크롤 위치를 조정
        // (lastItemCol - maxVisibleCols) * historyCheckerSize
        const historyCheckerSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--history-checker-size'));
        const columnGap = parseFloat(getComputedStyle(gridElement.parentElement.parentElement).columnGap) || 0;

        let scrollTargetLeft = (lastItemCol - maxVisibleCols) * (historyCheckerSize + columnGap);
        scrollWrapper.scrollLeft = Math.max(0, scrollTargetLeft);
    }
}

// ====================================
// --- 이벤트 리스너 및 초기화 ---
// ====================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded 이벤트 발생!');

    // DOMContentLoaded 시점에 요소 참조를 업데이트
    playerBtn = document.getElementById('player-btn');
    bankerBtn = document.getElementById('banker-btn');
    cancelBtn = document.getElementById('cancel-btn');
    resetBtn = document.getElementById('reset-btn');
    playerCountSpan = document.getElementById('player-count');
    bankerCountSpan = document.getElementById('banker-count');
    totalCountSpan = document.getElementById('total-count');
    mainRoadmapGrid = document.getElementById('roadmap-grid');

    logicBtnGroup = document.getElementById('logic-btn-group');
    if (logicBtnGroup) { // logicBtnGroup이 존재할 때만 logicButtons를 할당
        logicButtons = logicBtnGroup.querySelectorAll('.logic-btn');
    }
    copyBtn = document.getElementById('view-copy-btn');

    // 이벤트 리스너 등록 (if 조건문으로 감싸서 요소 존재 여부 확인)
    if (playerBtn) playerBtn.addEventListener('click', (e) => { console.log('Player button clicked', e.target); addHistoryItemClientSide('player', playerBtn); });
    if (bankerBtn) bankerBtn.addEventListener('click', (e) => { console.log('Banker button clicked', e.target); addHistoryItemClientSide('banker', bankerBtn); });
    if (cancelBtn) cancelBtn.addEventListener('click', (e) => { console.log('Cancel button clicked', e.target); undoLastActionClientSide(); });
    if (resetBtn) resetBtn.addEventListener('click', (e) => { console.log('Reset button clicked', e.target); resetHistoryClientSide(); });
    if (copyBtn) copyBtn.addEventListener('click', (e) => { console.log('Copy button clicked', e.target); copyConsoleToClipboard(); });


    // 로직 버튼 그룹 이벤트 리스너 (DOMContentLoaded 내부에 배치)
    if (logicBtnGroup) { // logicBtnGroup이 존재할 때만
        const currentLogicButtons = logicBtnGroup.querySelectorAll('.logic-btn'); // DOMContentLoaded 내에서 다시 찾음
        currentLogicButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                console.log('--- 로직 버튼 개별 클릭 감지 ---');
                console.log('event.target (클릭된 원본 요소):', event.target);
                console.log('클릭된 버튼 (button):', button);

                const newValue = button.dataset.value; // 직접 버튼에서 dataset.value 가져옴
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

    loadStateFromLocalStorage();
    console.log('로컬 스토리지 상태 로드됨. actionHistory:', actionHistory);

    redrawAllGrids();
    console.log('redrawAllGrids() 호출됨.');

    applySettings(initialSettings);
    console.log('설정 적용됨.');

    updateActiveStepUI();
    console.log('액티브 스텝 UI 업데이트됨.');

    renderMoneySteps(moneyArrStep); // 이 함수 호출
    console.log('금액 스텝 렌더링됨.');

    const pageHeader = document.getElementById('page-header');
    if (pageHeader && pageHeader.__alpine_component) {
        if (moneyArrStep && moneyArrStep.length > 0) {
            pageHeader.__alpine_component.totMoney = '초기금액 ' + Number(moneyArrStep[0]).toLocaleString() + ' 셋팅 하였습니다.';
        } else {
            pageHeader.__alpine_component.totMoney = '초기금액 0 셋팅 하였습니다.';
        }
    }

    // 새로 추가된 스크롤 문제 해결을 위한 히스토리 스크롤 래퍼 ID 할당 로직
    for (let i = 1; i <= 4; i++) {
        const wrapper = document.querySelector(`#history-box-${i} .history-scroll-wrapper`);
        if (wrapper) {
            wrapper.id = `history-scroll-wrapper-${i}`; // ID 할당
            console.log(`History scroll wrapper ${i} assigned ID: ${wrapper.id}`);
        }
    }

    hideSpinner();
    console.log('스피너 숨김 요청됨.');

    const toggleBtn = document.getElementById('view-toggle-btn');
    const consoleWrapper = document.getElementById('console-wrapper');
    const chartWrapper = document.getElementById('chart-wrapper');
    // inlineChartInstance는 전역에서 null로 선언된 후, 이곳에서 할당됩니다.
    // let inlineChartInstance = null; // 이 선언은 전역으로 옮겨져야 합니다.

    if (toggleBtn && consoleWrapper && chartWrapper) {
        const ctx = document.getElementById('analytics-chart-inline')?.getContext('2d');

        if (ctx && typeof Chart !== 'undefined') {
            Chart.register(ChartDataLabels);

            const isDarkMode = document.documentElement.classList.contains('dark');
            const tickColor = isDarkMode ? '#9ca3af' : '#6b7280';
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
                            color: isDarkMode ? '#a0aec0' : '#4a5568',
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
        }

        toggleBtn.addEventListener('click', () => {
            const currentView = toggleBtn.dataset.currentView;
            if (currentView === 'console') {
                consoleWrapper.classList.add('hidden');
                chartWrapper.classList.remove('hidden');
                toggleBtn.textContent = '콘솔 보기';
                toggleBtn.dataset.currentView = 'chart';
                updateAnalyticsChart();
            } else {
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
            // 필요하다면, redrawAllGrids()를 호출하여 격자 자체를 다시 그릴 수도 있지만,
            // 현재는 스크롤 위치 조정에 집중합니다.
        }, 200); // 200ms 디바운스
    });

    // 초기 로드 시에도 스크롤 위치 한번 조정
    readjustHistoryScrollPosition();

    window.addEventListener('beforeunload', function (e) {
        var confirmationMessage = '정말로 새로고침 하시겠습니까? 데이터가 소실될 수 있습니다.';
        e.returnValue = confirmationMessage;
        return confirmationMessage;
    });

    const heartbeatInterval = setInterval(() => {
        const isMember = DJANGO_CONTEXT.memberId !== "guest";
        if (isMember) {
            // TODO: 실제 Django API 엔드포인트로 변경
        }
    }, 30000);

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

    // 초기 로딩 시 `is_show_money_info`가 true이면 `moneystepinfo-modal` 열기
    if (DJANGO_CONTEXT.isShowMoneyInfo) {
        console.log("DJANGO_CONTEXT.isShowMoneyInfo가 true여서 moneystepinfo-modal을 엽니다.");
        //openModal('moneystepinfo-modal');
    }


});