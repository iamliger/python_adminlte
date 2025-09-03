import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import {
  IconHome,
  IconUser,
  IconSettings,
} from '@tabler/icons-react';
import { BoardSection } from './components/BoardSection.jsx';
import { LogArea } from './components/LogArea.jsx';
import { SettingsModal } from './components/SettingsModal.jsx';
import { ChartModal } from './components/ChartModal.jsx';

// 상수 정의
const API_ENDPOINT = 'http://localhost:8199/api/test_data';
const GAMEENV_KEY = 'baccara_game_settings';

// 기본 설정
const defaultSettings = {
  selectedLogic: 4, // 기본 로직4 (6매)
  virtualBettingEnabled: false,
  soundEnabled: true,
  darkMode: true,
  autoScrollEnabled: true
};

// 바둑판 컬럼 수 정의 (이미지 기반)
const MAIN_BOARD_COLS = 12; // 본매는 12열
const HISTORY_BOARD_COLS = 6; // 히스토리 바둑판은 6열

function App() {
  // 상태 관리
  const [results, setResults] = useState([]);
  const [selectedLogic, setSelectedLogic] = useState(defaultSettings.selectedLogic);
  const [logs, setLogs] = useState(['게임 시작... 환영합니다!']);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showChartModal, setShowChartModal] = useState(false);
  const [settings, setSettings] = useState(defaultSettings);

  const logEndRef = useRef(null);

  // 초기화 - 로컬 스토리지에서 설정 불러오기
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(GAMEENV_KEY);
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
        setSelectedLogic(parsedSettings.selectedLogic);
      }
    } catch (err) {
      console.error('설정 로드 오류:', err);
    }
  }, []);

  // 플레이어/뱅커 카운트 계산
  const playerCount = results.filter(r => r === 'player').length;
  const bankerCount = results.filter(r => r === 'banker').length;
  const totalCount = playerCount + bankerCount;

  // 결과 추가
  const addResult = (type) => {
    setResults(prev => [...prev, type]);
    setLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] ${type === 'player' ? '플레이어' : '뱅커'} 승리!`
    ]);

    // 실제 API 호출 (생략 가능)
    fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: type,
        logic: selectedLogic,
        timestamp: new Date().toISOString()
      }),
    }).catch(err => console.error('API 오류:', err));
  };

  // 마지막 결과 취소
  const cancelLast = () => {
    if (results.length === 0) return;

    setResults(prev => prev.slice(0, -1));
    setLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] 마지막 결과 취소됨`
    ]);
  };

  // 모든 결과 초기화
  const resetAll = () => {
    setResults([]);
    setLogs(['게임 시작... 환영합니다!']);
  };

  // 설정 저장
  const saveSettings = (newSettings) => {
    setSettings(newSettings);
    setSelectedLogic(newSettings.selectedLogic);
    localStorage.setItem(GAMEENV_KEY, JSON.stringify(newSettings));
    setShowSettingsModal(false);
  };

  // 로그 자동 스크롤
  useEffect(() => {
    if (logEndRef.current && settings.autoScrollEnabled) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, settings.autoScrollEnabled]);

  // 본매 바둑판의 동적 행 계산
  const mainBoardRows = Math.max(6, Math.ceil(results.length / MAIN_BOARD_COLS));

  return (
    <div className={`min-h-screen flex flex-col ${settings.darkMode ? 'dark bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      {/* 좌측 사이드바 */}
      <div className="flex">
        <aside className="w-14 md:w-64 bg-gray-800 h-screen md:flex flex-col fixed left-0 top-0 bottom-0 pt-5 hidden md:block">
          <div className="px-4 py-2">
            <h1 className="text-xl font-bold text-white hidden md:block">Baccara Analyzer</h1>
          </div>

          {/* 네비게이션 메뉴 */}
          <nav className="flex-1 px-2 py-4 space-y-2">
            <a href="/" className="flex items-center gap-3 px-3 py-2 rounded text-gray-300 hover:bg-gray-700 hover:text-white">
              <IconHome className="text-lg" />
              <span className="inline md:block text-sm whitespace-nowrap">홈</span>
            </a>
            <button
              onClick={() => { /* 마이페이지 관련 액션 */ }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded text-left text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              <IconUser className="text-lg" />
              <span className="inline md:block text-sm whitespace-nowrap">마이페이지</span>
            </button>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded text-left text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              <IconSettings className="text-lg" />
              <span className="inline md:block text-sm whitespace-nowrap">환경설정</span>
            </button>
          </nav>
        </aside>

        {/* 메인 콘텐츠 */}
        <main className="flex-1 ml-0 md:ml-64 p-4">
          {/* 상단 버튼 영역 */}
          <div className="flex flex-wrap md:flex-nowrap items-center gap-2 mb-4">
            <button
              onClick={() => addResult('player')}
              className="bg-blue-600 px-3 py-1 rounded"
            >
              플레이어 {playerCount}
            </button>
            <button
              onClick={() => addResult('banker')}
              className="bg-red-600 px-3 py-1 rounded"
            >
              뱅커 {bankerCount}
            </button>

            {/* 로직 버튼 그룹 */}
            <div className="flex space-x-1 flex-1">
              {[1, 2, 3, 4].map(logic => (
                <button
                  key={`logic-${logic}`}
                  className={`px-3 py-1 rounded ${selectedLogic === logic ? 'bg-purple-700' : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  onClick={() => {
                    setSelectedLogic(logic);
                    const newSettings = { ...settings, selectedLogic: logic };
                    saveSettings(newSettings);
                  }}
                >
                  로직{logic}
                </button>
              ))}
            </div>

            <div className="bg-gray-700 px-3 py-1 rounded font-semibold">합: {totalCount}</div>
            <button
              className="bg-gray-700 px-3 py-1 rounded hover:bg-gray-600"
              onClick={cancelLast}
            >
              취소
            </button>
          </div>

          {/* 바둑판 영역 */}
          <div className="space-y-4">
            {/* 본매 바둑판 */}
            <div className="main-board-wrapper"> {/* 새로운 wrapper 클래스 적용 */}
              <BoardSection rows={mainBoardRows} cols={MAIN_BOARD_COLS} results={results} isMainBoard={true} />
            </div>

            {/* 히스토리 바둑판 (3,4,5,6매) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: '3매' },
                { label: '4매' },
                { label: '5매' },
                { label: '6매' }
              ].map((_, index) => (
                <div key={`history-${index}`} className="history-board-wrapper"> {/* 새로운 wrapper 클래스 적용 */}
                  <BoardSection rows={mainBoardRows} cols={HISTORY_BOARD_COLS} results={results} isMainBoard={false} />
                </div>
              ))}
            </div>
          </div>

          {/* 로그 영역 */}
          <div className="relative border border-gray-700 bg-gray-800 rounded h-28 mt-4">
            <div className="absolute top-0 right-0 flex space-x-2 p-1 z-10 bg-gray-800 rounded-bl">
              <button
                className="bg-blue-700 hover:bg-blue-600 px-2 py-1 rounded text-xs"
                onClick={() => {
                  navigator.clipboard.writeText(logs.join('\n'));
                  alert('로그가 복사되었습니다.');
                }}
              >
                로그 복사
              </button>
              <button
                className="bg-blue-700 hover:bg-blue-600 px-2 py-1 rounded text-xs"
                onClick={() => setShowChartModal(true)}
              >
                차트 보기
              </button>
            </div>

            <LogArea logs={logs} autoScroll={settings.autoScrollEnabled} />
          </div>

          {/* 하단 버튼 영역 */}
          <div className="flex justify-between items-center mt-4">
            <button
              className="bg-green-600 px-3 py-1 rounded hover:bg-green-700"
              onClick={resetAll}
            >
              리셋
            </button>
            <button
              className="bg-blue-700 px-3 py-1 rounded hover:bg-blue-800"
            >
              로그아웃
            </button>
          </div>
        </main>
      </div>

      {/* 모달 */}
      {showSettingsModal && (
        <SettingsModal
          settings={settings}
          onClose={() => setShowSettingsModal(false)}
          onSave={saveSettings}
        />
      )}

      {showChartModal && (
        <ChartModal
          results={results}
          onClose={() => setShowChartModal(false)}
        />
      )}
    </div>
  );
}

export default App;