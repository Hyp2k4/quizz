"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Zap, Shield, VolumeX, Snowflake, Clock, BookOpen, Trophy } from "lucide-react";

interface PlayerStatusProps {
    score: number;
    streak?: number;
    doublePoints?: number;
    shieldActive?: boolean;
    silenceActive?: number;
    scoreFreezeActive?: boolean;
    currentQuestion: number;
    totalQuestions: number;
    language?: 'vi' | 'en';
    onOpenInventory?: () => void;
}


export const PlayerStatus: React.FC<PlayerStatusProps> = ({
    score,
    streak = 0,
    doublePoints = 0,
    shieldActive = false,
    silenceActive = 0,
    scoreFreezeActive = false,
    currentQuestion,
    totalQuestions,
    language = 'vi',
    onOpenInventory
}) => {
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setSeconds(prev => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const formatTime = (secs: number) => {
        const mins = Math.floor(secs / 60);
        const s = secs % 60;
        return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const hasActiveEffects = doublePoints > 0 || shieldActive || silenceActive > 0 || scoreFreezeActive;

    return (
        <Card className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl space-y-4 w-full max-w-[250px]">
            {/* Player Info */}
            <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                    P
                </div>
                <div>
                    <p className="font-bold text-zinc-900 dark:text-zinc-50">Người chơi</p>
                    {streak > 0 && (
                        <p className="text-xs text-zinc-500 flex items-center gap-1">
                            <Trophy className="h-3 w-3 text-yellow-500" /> Chuỗi: {streak}
                        </p>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                    <span className="text-zinc-500 flex items-center gap-1">
                        <Clock className="h-4 w-4" /> {language === 'vi' ? 'Thời gian' : 'Time'}
                    </span>
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">{formatTime(seconds)}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-zinc-500 flex items-center gap-1">
                        <BookOpen className="h-4 w-4" /> {language === 'vi' ? 'Tiến độ' : 'Progress'}
                    </span>
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">{currentQuestion}/{totalQuestions}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-zinc-500 flex items-center gap-1">
                        <Trophy className="h-4 w-4" /> {language === 'vi' ? 'Điểm' : 'Score'}
                    </span>
                    <span className="font-bold text-indigo-600">{score}</span>
                </div>
            </div>

            {/* Active Effects */}
            {hasActiveEffects && (
                <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3">
                    <p className="text-xs font-bold text-zinc-400 uppercase mb-2">{language === 'vi' ? 'Hiệu ứng' : 'Effects'}</p>
                    <div className="grid grid-cols-2 gap-2">
                        {doublePoints > 0 && (
                            <div className="flex items-center gap-1 text-xs bg-orange-50 dark:bg-orange-900/20 text-orange-600 p-1.5 rounded-lg font-medium" title="Double Points">
                                <Zap className="h-3.5 w-3.5" /> x2 ({doublePoints})
                            </div>
                        )}
                        {shieldActive && (
                            <div className="flex items-center gap-1 text-xs bg-green-50 dark:bg-green-900/20 text-green-600 p-1.5 rounded-lg font-medium" title="Shield">
                                <Shield className="h-3.5 w-3.5" /> Khiên
                            </div>
                        )}
                        {silenceActive > 0 && (
                            <div className="flex items-center gap-1 text-xs bg-red-50 dark:bg-red-900/20 text-red-600 p-1.5 rounded-lg font-medium" title="Silence">
                                <VolumeX className="h-3.5 w-3.5" /> Khóa ({silenceActive})
                            </div>
                        )}
                        {scoreFreezeActive && (
                            <div className="flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 p-1.5 rounded-lg font-medium" title="Score Freeze">
                                <Snowflake className="h-3.5 w-3.5" /> Đóng băng
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Action Button */}
            {onOpenInventory && (
                <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3">
                    <button
                        onClick={onOpenInventory}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                    >
                        <span className="text-base">🎒</span>
                        {language === 'vi' ? 'Sử dụng vật phẩm' : 'Use Power-up'}
                    </button>
                </div>
            )}
        </Card>
    );
};
