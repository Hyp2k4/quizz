"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getShopItems, addShopItem, updateShopItem, deleteShopItem, ShopItem } from "@/services/shopService";
import { toast } from "sonner";
import { Store, Plus, Edit, Trash2, Image as ImageIcon, Sparkles, Loader2 } from "lucide-react";

export default function AdminShopPage() {
    const { user, isAdmin } = useAuth();
    const [items, setItems] = useState<ShopItem[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Form state
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [nameEn, setNameEn] = useState("");
    const [description, setDescription] = useState("");
    const [descriptionEn, setDescriptionEn] = useState("");
    const [price, setPrice] = useState("");
    const [powerupType, setPowerupType] = useState<'50_50' | 'skip' | 'time' | 'hint' | 'none' | 'double_points' | 'shield' | 'point_magnet'>('none');
    const [icon, setIcon] = useState(""); // For SVG/emoji
    const [file, setFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!isAdmin) return;
        fetchItems();
    }, [isAdmin]);

    const fetchItems = async () => {
        setLoading(true);
        const data = await getShopItems();
        setItems(data);
        setLoading(false);
    };

    if (!isAdmin) {
        return <div className="min-h-screen pt-32 text-center text-red-500 font-bold">Quyền truy cập bị từ chối</div>;
    }

    const resetForm = () => {
        setIsEditing(false);
        setEditId(null);
        setName("");
        setNameEn("");
        setDescription("");
        setDescriptionEn("");
        setPrice("");
        setPowerupType('none');
        setIcon("");
        setFile(null);
    };

    const handleEdit = (item: ShopItem) => {
        setIsEditing(true);
        setEditId(item.id!);
        setName(item.name);
        setNameEn(item.nameEn);
        setDescription(item.description || "");
        setDescriptionEn(item.descriptionEn || "");
        setPrice(item.price.toString());
        setPowerupType(item.powerupType || 'none');
        setIcon(item.icon || "");
        setFile(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (item: ShopItem) => {
        if (!confirm(`Xóa vật phẩm ${item.name}?`)) return;
        try {
            await deleteShopItem(item.id!, item.imageUrl);
            toast.success("Đã xóa vật phẩm");
            fetchItems();
        } catch (error) {
            toast.error("Lỗi khi xóa");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !nameEn || !price) {
            toast.error("Vui lòng điền đủ thông tin");
            return;
        }

        setSubmitting(true);
        try {
            if (isEditing && editId) {
                await updateShopItem(editId, {
                    name,
                    nameEn,
                    description,
                    descriptionEn,
                    price: parseInt(price, 10),
                    powerupType,
                    icon
                }, file);
                toast.success("Cập nhật thành công");
            } else {
                await addShopItem({
                    name,
                    nameEn,
                    description,
                    descriptionEn,
                    price: parseInt(price, 10),
                    powerupType,
                    icon: icon || '📦'
                }, file);
                toast.success("Thêm thành công");
            }
            resetForm();
            fetchItems();
        } catch (error) {
            toast.error("Có lỗi xảy ra");
        }
        setSubmitting(false);
    };

    const handleSeed = async () => {
        if (!confirm("Tạo các vật phẩm hỗ trợ cơ bản?")) return;
        setLoading(true);
        try {
            const powerups: Omit<ShopItem, "id" | "createdAt">[] = [
                { name: 'Loại trừ 50/50', nameEn: '50/50 Elim', description: 'Loại bỏ một nửa phương án sai', descriptionEn: 'Removes half of incorrect options', price: 100, powerupType: '50_50', icon: '✂️' },
                { name: 'Gợi ý đáp án', nameEn: 'Hint', description: 'Gợi ý giúp bạn tìm ra câu trả lời', descriptionEn: 'Provides a hint for the answer', price: 50, powerupType: 'hint', icon: '💡' },
                { name: 'Thêm thời gian', nameEn: 'Time Boost', description: 'Cộng thêm 5 phút (cho thi thử)', descriptionEn: 'Adds 5 minutes (mock exam only)', price: 200, powerupType: 'time', icon: '⏳' },
                { name: 'Bỏ qua câu hỏi', nameEn: 'Skip Question', description: 'Tự động được tính điểm tối đa', descriptionEn: 'Automatically gives full points', price: 500, powerupType: 'skip', icon: '⏭️' },
                { name: 'Nhân đôi điểm', nameEn: 'Double Points', description: 'Nhân đôi điểm cho 2 câu tiếp theo', descriptionEn: 'Double points for next 2 questions', price: 300, powerupType: 'double_points', icon: '💥' },
                { name: 'Khiên bảo vệ', nameEn: 'Shield', description: 'Bảo vệ chuỗi khi trả lời sai', descriptionEn: 'Protects streak on wrong answer', price: 150, powerupType: 'shield', icon: '🛡️' },
                { name: 'Nam châm hút điểm', nameEn: 'Point Magnet', description: 'Nhận ngay 300 Coins', descriptionEn: 'Get 300 Coins instantly', price: 50, powerupType: 'point_magnet', icon: '🧲' },
            ];
            
            for (const p of powerups) {
                await addShopItem(p);
            }
            toast.success("Đã tạo thành công");
            fetchItems();
        } catch (error) {
            toast.error("Lỗi khi tạo");
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            <Navbar />
            <main className="pt-32 px-6 max-w-6xl mx-auto pb-20">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-black flex items-center gap-3">
                            <Store className="h-8 w-8 text-sky-500" /> Quản lý Shop
                        </h1>
                        <p className="text-zinc-500">Thêm, sửa, xóa các trang phục và vật phẩm</p>
                    </div>
                    <Button onClick={handleSeed} variant="outline" className="gap-2 border-dashed">
                        <Sparkles className="h-4 w-4 text-yellow-500" /> Tạo 50 Items Mẫu
                    </Button>
                </div>

                <div className="grid md:grid-cols-[350px_1fr] gap-8">
                    {/* Form */}
                    <Card className="h-fit shadow-xl rounded-3xl border-none">
                        <CardContent className="p-6">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                {isEditing ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                                {isEditing ? "Sửa vật phẩm" : "Thêm vật phẩm mới"}
                            </h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase">Tên (Tiếng Việt)</label>
                                    <Input value={name} onChange={e => setName(e.target.value)} placeholder="VD: Gợi ý" required />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase">Tên (Tiếng Anh)</label>
                                    <Input value={nameEn} onChange={e => setNameEn(e.target.value)} placeholder="VD: Hint" required />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase">Mô tả (Tiếng Việt)</label>
                                    <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="VD: Hiện gợi ý câu hỏi" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase">Mô tả (Tiếng Anh)</label>
                                    <Input value={descriptionEn} onChange={e => setDescriptionEn(e.target.value)} placeholder="VD: Show a hint" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase">Giá (Snowy Coins)</label>
                                    <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="VD: 50" required min="0" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase">Loại chức năng</label>
                                    <select 
                                        value={powerupType} 
                                        onChange={e => setPowerupType(e.target.value as any)}
                                        className="w-full mt-1 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 outline-none"
                                    >
                                        <option value="none">Không có tác dụng (Trang trí)</option>
                                        <option value="50_50">50/50 (Loại nửa đáp án sai)</option>
                                        <option value="hint">Gợi ý</option>
                                        <option value="time">Thêm thời gian</option>
                                        <option value="skip">Bỏ qua câu hỏi</option>
                                        <option value="double_points">Nhân đôi điểm</option>
                                        <option value="shield">Khiên bảo vệ</option>
                                        <option value="point_magnet">Nam châm hút điểm</option>
                                        <option value="silence">Khóa quyền trợ giúp (Debuff)</option>
                                        <option value="score_freeze">Đóng băng điểm (Debuff)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase">Icon (Emoji / URL)</label>
                                    <Input value={icon} onChange={e => setIcon(e.target.value)} placeholder="VD: 💡" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase">Hình ảnh (Tuỳ chọn)</label>
                                    <div className="mt-1 flex items-center gap-3">
                                        <label className="flex-1 cursor-pointer border-2 border-dashed border-zinc-200 dark:border-zinc-700 hover:border-sky-500 rounded-xl p-4 text-center transition-colors">
                                            <input type="file" accept="image/*" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
                                            <div className="flex flex-col items-center gap-1 text-zinc-500">
                                                <ImageIcon className="h-6 w-6" />
                                                <span className="text-sm font-medium">{file ? file.name : 'Chọn ảnh tải lên'}</span>
                                            </div>
                                        </label>
                                    </div>
                                    <p className="text-xs text-zinc-400 mt-2">Nếu tải ảnh, vật phẩm sẽ dùng ảnh này làm đồ mặc lên nhân vật.</p>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <Button type="submit" disabled={submitting} className="flex-1 bg-sky-600 hover:bg-sky-700">
                                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lưu lại'}
                                    </Button>
                                    {isEditing && (
                                        <Button type="button" variant="outline" onClick={resetForm}>Hủy</Button>
                                    )}
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {/* List */}
                    <div className="space-y-4">
                        {loading && items.length === 0 ? (
                            <div className="text-center p-10"><Loader2 className="h-8 w-8 animate-spin text-sky-500 mx-auto" /></div>
                        ) : (
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {items.map(item => (
                                    <Card key={item.id} className="rounded-2xl border-none shadow-sm hover:shadow-md transition-shadow">
                                        <CardContent className="p-4 flex flex-col items-center text-center relative group">
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                <button onClick={() => handleEdit(item)} className="p-2 bg-zinc-100 hover:bg-sky-100 text-sky-600 rounded-lg"><Edit className="h-4 w-4" /></button>
                                                <button onClick={() => handleDelete(item)} className="p-2 bg-zinc-100 hover:bg-red-100 text-red-600 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                                            </div>
                                            <div className="h-16 w-16 bg-sky-50 rounded-2xl flex items-center justify-center text-3xl mb-3">
                                                {item.imageUrl ? (
                                                    <img src={item.imageUrl} alt="" className="max-w-[80%] max-h-[80%] object-contain" />
                                                ) : item.icon}
                                            </div>
                                            <h3 className="font-bold text-sm line-clamp-1">{item.name}</h3>
                                            <p className="font-bold text-yellow-600 text-sm mt-1">{item.price} Coins</p>
                                        </CardContent>
                                    </Card>
                                ))}
                                {items.length === 0 && !loading && (
                                    <div className="col-span-full text-center p-10 text-zinc-500">Chưa có vật phẩm nào</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
