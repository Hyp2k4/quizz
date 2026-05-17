import { db, storage } from "@/lib/firebase";
import { 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    updateDoc, 
    deleteDoc, 
    query, 
    orderBy 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

export interface ShopItem {
    id?: string;
    name: string;
    nameEn: string;
    description?: string;
    descriptionEn?: string;
    price: number;
    powerupType?: '50_50' | 'skip' | 'time' | 'hint' | 'none' | 'double_points' | 'shield' | 'point_magnet'; 
    imageUrl?: string;
    icon?: string; 
    createdAt?: any;
}

export const HARDCODED_POWERUPS: ShopItem[] = [
    { id: '50_50', name: 'Loại trừ 50/50', nameEn: '50/50 Elim', description: 'Loại bỏ một nửa phương án sai', descriptionEn: 'Removes half of incorrect options', price: 100, powerupType: '50_50', icon: 'scissors' },
    { id: 'hint', name: 'Gợi ý đáp án', nameEn: 'Hint', description: 'Gợi ý giúp bạn tìm ra câu trả lời', descriptionEn: 'Provides a hint for the answer', price: 50, powerupType: 'hint', icon: 'lightbulb' },
    { id: 'time', name: 'Thêm thời gian', nameEn: 'Time Boost', description: 'Cộng thêm 5 phút (cho thi thử)', descriptionEn: 'Adds 5 minutes (mock exam only)', price: 200, powerupType: 'time', icon: 'timer' },
    { id: 'skip', name: 'Bỏ qua câu hỏi', nameEn: 'Skip Question', description: 'Tự động được tính điểm tối đa', descriptionEn: 'Automatically gives full points', price: 500, powerupType: 'skip', icon: 'skip-forward' },
    { id: 'double_points', name: 'Nhân đôi điểm', nameEn: 'Double Points', description: 'Nhân đôi điểm cho 2 câu tiếp theo', descriptionEn: 'Double points for next 2 questions', price: 300, powerupType: 'double_points', icon: 'zap' },
    { id: 'shield', name: 'Khiên bảo vệ', nameEn: 'Shield', description: 'Bảo vệ chuỗi khi trả lời sai', descriptionEn: 'Protects streak on wrong answer', price: 150, powerupType: 'shield', icon: 'shield' },
    { id: 'point_magnet', name: 'Nam châm hút điểm', nameEn: 'Point Magnet', description: 'Nhận ngay 300 Coins', descriptionEn: 'Get 300 Coins instantly', price: 50, powerupType: 'point_magnet', icon: 'magnet' },
];

export const getShopItems = async (): Promise<ShopItem[]> => {
    return HARDCODED_POWERUPS;
};

export const addShopItem = async (item: Omit<ShopItem, "id" | "createdAt">, file?: File | null): Promise<string> => {
    try {
        let imageUrl = item.imageUrl;

        if (file) {
            const storageRef = ref(storage, `shop_items/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            imageUrl = await getDownloadURL(storageRef);
        }

        const docRef = await addDoc(collection(db, "shop_items"), {
            ...item,
            imageUrl: imageUrl || null,
            createdAt: new Date()
        });
        return docRef.id;
    } catch (error) {
        console.error("Error adding shop item:", error);
        throw error;
    }
};

export const updateShopItem = async (id: string, updates: Partial<ShopItem>, file?: File | null) => {
    try {
        const itemRef = doc(db, "shop_items", id);
        let updatedData = { ...updates };

        if (file) {
            const storageRef = ref(storage, `shop_items/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const imageUrl = await getDownloadURL(storageRef);
            updatedData.imageUrl = imageUrl;
        }

        await updateDoc(itemRef, updatedData);
    } catch (error) {
        console.error("Error updating shop item:", error);
        throw error;
    }
};

export const deleteShopItem = async (id: string, imageUrl?: string) => {
    try {
        await deleteDoc(doc(db, "shop_items", id));
        if (imageUrl && imageUrl.includes("firebase")) {
            const imageRef = ref(storage, imageUrl);
            await deleteObject(imageRef).catch(e => console.log("Image not found to delete or error", e));
        }
    } catch (error) {
        console.error("Error deleting shop item:", error);
        throw error;
    }
};
