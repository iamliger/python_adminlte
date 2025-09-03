import React from 'react';

export function BoardSection({ rows, cols, results, isMainBoard = false }) {
    const renderBoard = () => {
        const cells = [];
        // 전달받은 rows와 cols를 기반으로 셀을 생성합니다.
        const totalCells = rows * cols;

        for (let i = 0; i < totalCells; i++) {
            const val = results[i];
            const isEmpty = i >= results.length;
            
            cells.push(
                <div
                    key={i}
                    className="board-cell"
                >
                    {!isEmpty ? (
                        <div className={`icon ${val === 'player' ? 'player-icon' : val === 'banker' ? 'banker-icon' : ''}`}>
                            {val === 'player' ? 'P' : val === 'banker' ? 'B' : ''}
                        </div>
                    ) : ''}
                </div>
            );
        }

        return cells;
    };

    return (
        <div
            className={`board-container ${isMainBoard ? 'main-board' : 'history-board'}`}
            style={{
                // App.css에서 grid-template-columns를 auto-fill로 설정했으므로,
                // 여기서는 grid-template-rows만 동적으로 설정합니다.
                gridTemplateRows: `repeat(${rows}, 1fr)`
            }}
        >
            {renderBoard()}
        </div>
    );
}