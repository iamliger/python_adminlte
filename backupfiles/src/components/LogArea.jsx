import React, { useRef, useEffect } from 'react';

export function LogArea({ logs, autoScroll }) {
    const logEndRef = useRef(null);

    useEffect(() => {
        if (logEndRef.current && autoScroll) {
            logEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, autoScroll]);

    return (
        <div className="log-area overflow-y-auto h-full font-mono text-sm">
            {logs.map((log, idx) => (
                <div
                    key={idx}
                    className={idx === 0 ? 'text-yellow-300' : ''}
                >
                    {log}
                </div>
            ))}
            <div ref={logEndRef} />
        </div>
    );
}