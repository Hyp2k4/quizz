"use client";

import React from "react";
import { ShopItem } from "@/services/shopService";
import { Scissors, Lightbulb, Timer, SkipForward, Zap, Shield, Magnet } from "lucide-react";

interface PowerupToolbarProps {
    items: ShopItem[];
    inventory: Record<string, number>;
    onUse: (item: ShopItem) => void;
    language?: 'vi' | 'en';
    silenceActive?: number;
    vertical?: boolean;
}

export const getIcon = (name: string) => {
    switch(name) {
        case 'scissors': return <Scissors className="h-5 w-5 text-purple-500" />;
        case 'lightbulb': return <Lightbulb className="h-5 w-5 text-yellow-500" />;
        case 'timer': return <Timer className="h-5 w-5 text-sky-500" />;
        case 'skip-forward': return <SkipForward className="h-5 w-5 text-indigo-500" />;
        case 'zap': return <Zap className="h-5 w-5 text-orange-500" />;
        case 'shield': return <Shield className="h-5 w-5 text-green-500" />;
        case 'magnet': return <Magnet className="h-5 w-5 text-red-500" />;
        default: return null;
    }
}

export const PowerupToolbar: React.FC<PowerupToolbarProps> = ({
    items,
    inventory,
    onUse,
    language = 'vi',
    silenceActive = 0,
    vertical = false
}) => {
    return (
        <div className="w-full">
            {silenceActive > 0 && (
                <p className="text-xs font-bold text-red-500 text-center mb-2">
                    {language === 'vi' ? `Bị khóa quyền trợ giúp (${silenceActive} câu)! 🔇` : `Silence active (${silenceActive} questions)! 🔇`}
                </p>
            )}
            <div className={`bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl flex transition-all ${vertical ? 'flex-col gap-2' : 'gap-3 justify-center'} ${silenceActive > 0 ? 'opacity-50 pointer-events-none' : ''}`}>
                {items.map(item => {
                    const quantity = inventory[item.id!] || 0;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onUse(item)}
                            disabled={quantity === 0}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${quantity > 0 ? 'bg-white dark:bg-zinc-800 hover:shadow-md border border-zinc-100 dark:border-zinc-700' : 'bg-zinc-50 dark:bg-zinc-800/50 text-zinc-400 cursor-not-allowed border border-transparent'}`}
                            title={language === 'vi' ? item.name : item.nameEn}
                        >
                            <div className={`p-1.5 rounded-lg ${quantity > 0 ? 'bg-zinc-50 dark:bg-zinc-700' : ''}`}>
                                {getIcon(item.icon || '')}
                            </div>
                            <span className="text-xs font-black">{quantity}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
