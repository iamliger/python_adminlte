import React, { useState } from 'react';

export function SettingsModal({ settings, onClose, onSave }) {
    const [formData, setFormData] = useState({ ...settings });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full">
                <h2 className="text-xl font-semibold mb-4">환경설정</h2>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block mb-2">
                            기본 로직 선택
                            <select
                                name="selectedLogic"
                                value={formData.selectedLogic}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded bg-gray-700 border-gray-600 text-white"
                            >
                                <option value={1}>로직1 (3매)</option>
                                <option value={2}>로직2 (4매)</option>
                                <option value={3}>로직3 (5매)</option>
                                <option value={4}>로직4 (6매)</option>
                            </select>
                        </label>
                    </div>

                    <div className="mb-4">
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                name="virtualBettingEnabled"
                                checked={formData.virtualBettingEnabled}
                                onChange={handleChange}
                                className="mr-2 rounded bg-gray-700 border-gray-600"
                            />
                            가상 베팅 활성화
                        </label>
                    </div>

                    <div className="mb-4">
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                name="soundEnabled"
                                checked={formData.soundEnabled}
                                onChange={handleChange}
                                className="mr-2 rounded bg-gray-700 border-gray-600"
                            />
                            소리 활성화
                        </label>
                    </div>

                    <div className="mb-4">
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                name="darkMode"
                                checked={formData.darkMode}
                                onChange={handleChange}
                                className="mr-2 rounded bg-gray-700 border-gray-600"
                            />
                            다크 모드
                        </label>
                    </div>

                    <div className="mb-4">
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                name="autoScrollEnabled"
                                checked={formData.autoScrollEnabled}
                                onChange={handleChange}
                                className="mr-2 rounded bg-gray-700 border-gray-600"
                            />
                            자동 스크롤
                        </label>
                    </div>

                    <div className="flex justify-end space-x-2 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500"
                        >
                            저장
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}