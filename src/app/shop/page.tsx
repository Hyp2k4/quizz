"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Character, Gender } from "@/components/character/Character";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { ShoppingBag, Coins, Loader2, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { getShopItems, ShopItem } from "@/services/shopService";
import { getIcon } from "@/components/quiz/PowerupToolbar";

export default function ShopPage() {
    const { user, userData, refreshUserData, login } = useAuth();
    const { language } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<ShopItem[]>([]);
    const [activeTab, setActiveTab] = useState<'shop' | 'inventory'>('shop');

    useEffect(() => {
        async function fetchItems() {
            setLoading(true);
            const fetchedItems = await getShopItems();
            setItems(fetchedItems);
            setLoading(false);
        }
        fetchItems();
    }, []);

    if (!user || !userData) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
                <Navbar />
                <main className="flex-1 flex items-center justify-center p-6">
                    <Card className="max-w-md w-full p-10 text-center space-y-8 rounded-[3rem] shadow-2xl border-none">
                        <h2 className="text-3xl font-black">Cửa hàng hỗ trợ</h2>
                        <p className="text-zinc-500">Đăng nhập để mua các chức năng hỗ trợ làm bài.</p>
                        <Button onClick={() => login()} className="w-full h-14 rounded-2xl bg-indigo-600 text-lg font-bold">Đăng nhập</Button>
                    </Card>
                </main>
            </div>
        );
    }

    const inventory = userData.inventory || {};
    const coins = userData.snowyCoins || 0;

    const handleBuy = async (item: ShopItem) => {
        if (coins < item.price) {
            toast.error(language === 'vi' ? 'Không đủ Snowy Coins!' : 'Not enough Snowy Coins!');
            return;
        }

        setLoading(true);
        try {
            const userRef = doc(db, "users", user.uid);
            const currentQuantity = inventory[item.id!] || 0;
            await updateDoc(userRef, {
                snowyCoins: coins - item.price,
                [`inventory.${item.id}`]: currentQuantity + 1
            });
            await refreshUserData();
            toast.success(language === 'vi' ? 'Mua thành công!' : 'Purchased successfully!');
        } catch (error) {
            console.error(error);
            toast.error(language === 'vi' ? 'Có lỗi xảy ra.' : 'An error occurred.');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-sky-50/50 dark:bg-sky-950/20">
            <Navbar />
            <main className="pt-32 px-6 max-w-5xl mx-auto pb-20">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                    <div>
                        <h1 className="text-4xl font-black tracking-tight">{language === 'vi' ? 'Cửa hàng Snowy' : 'Snowy Shop'}</h1>
                        <p className="text-zinc-500 mt-2">
                            {language === 'vi' ? 'Dùng Snowy Coins để mua các chức năng hỗ trợ làm bài.' : 'Use Snowy Coins to buy support features.'}
                        </p>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/30 px-6 py-4 rounded-3xl border border-yellow-200 dark:border-yellow-700/50 flex items-center gap-4 shadow-sm">
                        <div className="h-12 w-12 bg-yellow-400 rounded-full flex items-center justify-center text-white shadow-lg shadow-yellow-400/30">
                            <Coins className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="text-xs font-bold uppercase text-yellow-700 dark:text-yellow-500">Snowy Coins</div>
                            <div className="text-2xl font-black text-yellow-600 dark:text-yellow-400">{coins}</div>
                        </div>
                    </div>
                </div>

                <div className="flex bg-white dark:bg-zinc-900 p-1 rounded-2xl w-fit mb-8 shadow-sm border border-zinc-200 dark:border-zinc-800">
                    <button 
                        onClick={() => setActiveTab('shop')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'shop' ? 'bg-sky-500 text-white shadow-md' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                    >
                        {language === 'vi' ? 'Cửa hàng' : 'Shop'}
                    </button>
                    <button 
                        onClick={() => setActiveTab('inventory')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'inventory' ? 'bg-sky-500 text-white shadow-md' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                    >
                        {language === 'vi' ? 'Túi đồ của tôi' : 'My Inventory'}
                    </button>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {/* Shop Items */}
                    {items.length === 0 && !loading && (
                        <div className="col-span-full text-center p-10 text-zinc-400">
                            {language === 'vi' ? 'Cửa hàng hiện tại chưa có món đồ nào.' : 'The shop is currently empty.'}
                        </div>
                    )}
                    {loading && items.length === 0 && (
                        <div className="col-span-full flex justify-center p-10 text-indigo-500">
                            <Loader2 className="animate-spin h-8 w-8" />
                        </div>
                    )}
                    {(activeTab === 'inventory' ? items.filter(i => (inventory[i.id!] || 0) > 0) : items).map((item) => {
                        const quantity = inventory[item.id!] || 0;

                        return (
                            <Card 
                                key={item.id} 
                                className="p-6 border-2 rounded-[2rem] transition-all hover:shadow-xl border-transparent bg-white dark:bg-zinc-900 flex flex-col"
                            >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="text-4xl bg-sky-50 dark:bg-sky-900/30 rounded-2xl w-16 h-16 flex items-center justify-center">
                                            {item.imageUrl ? (
                                                <img src={item.imageUrl} alt={item.name} className="max-w-[70%] max-h-[70%] object-contain" />
                                            ) : (
                                                getIcon(item.icon || '') || <span className="text-2xl">📦</span>
                                            )}
                                        </div>
                                        {quantity > 0 && (
                                            <div className="bg-sky-100 text-sky-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                                <Sparkles className="h-3 w-3" />
                                                Đang có: {quantity}
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1 font-black text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full">
                                            <Coins className="h-4 w-4" />
                                            {item.price}
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-lg mb-1">{language === 'vi' ? item.name : item.nameEn}</h3>
                                    <p className="text-sm text-zinc-500 mb-6 flex-1">{language === 'vi' ? item.description : item.descriptionEn}</p>
                                    
                                    <Button 
                                        onClick={(e) => { e.stopPropagation(); handleBuy(item); }}
                                        disabled={coins < item.price || loading}
                                        className={`w-full rounded-xl font-bold mt-auto ${coins >= item.price ? 'bg-sky-500 hover:bg-sky-600' : 'opacity-50'}`}
                                    >
                                        {language === 'vi' ? 'Mua thêm' : 'Buy'}
                                    </Button>
                                </Card>
                            );
                        })}
                    </div>

            </main>
        </div>
    );
}
