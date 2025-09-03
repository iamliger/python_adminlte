import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

export function ChartModal({ results, onClose }) {
    const [chartData, setChartData] = useState({
        labels: ['플레이어', '뱅커'],
        datasets: [
            {
                data: [0, 0],
                backgroundColor: ['#3b82f6', '#dc2626'],
                borderColor: ['#2563eb', '#b91c1c'],
                borderWidth: 1,
            },
        ],
    });

    useEffect(() => {
        const playerCount = results.filter(r => r === 'player').length;
        const bankerCount = results.filter(r => r === 'banker').length;

        setChartData({
            labels: ['플레이어', '뱅커'],
            datasets: [
                {
                    data: [playerCount, bankerCount],
                    backgroundColor: ['#3b82f6', '#dc2626'],
                    borderColor: ['#2563eb', '#b91c1c'],
                    borderWidth: 1,
                },
            ],
        });
    }, [results]);

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    color: '#fff'
                }
            },
            datalabels: {
                color: '#fff',
                formatter: (value, ctx) => {
                    const total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                    if (total === 0) return '0%';
                    const percentage = Math.round((value / total) * 100);
                    return percentage + '%';
                }
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full">
                <h2 className="text-xl font-semibold mb-4">결과 분석 차트</h2>

                <div className="h-64">
                    <Pie data={chartData} options={options} />
                </div>

                <div className="mt-4">
                    <p className="mb-2">총 게임 수: {results.length}</p>
                    <p className="mb-2">플레이어 승리: {results.filter(r => r === 'player').length}</p>
                    <p className="mb-2">뱅커 승리: {results.filter(r => r === 'banker').length}</p>
                </div>

                <div className="flex justify-end mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
}