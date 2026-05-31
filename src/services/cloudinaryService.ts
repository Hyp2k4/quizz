/**
 * Cloudinary client‑side upload helper using an unsigned preset.
 * Add the following variables to `.env.local` (they will be exposed to the client):
 * NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
 * NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
 */
export async function uploadImageToCloudinary(file: File): Promise<string> {
  // 1. Lấy biến môi trường từ .env.local
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  // 2. Kiểm tra nếu thiếu cấu hình thì chặn lại ngay ở client để dễ debug
  if (!cloudName || !uploadPreset) {
    throw new Error(
      'Cloudinary configuration missing. Please check NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET in your .env.local file.'
    );
  }

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  
  const form = new FormData();
  form.append('file', file);
  // Đã sửa: Phải dùng chính xác key 'upload_preset'
  form.append('upload_preset', uploadPreset); 

  const response = await fetch(url, {
    method: 'POST',
    body: form,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cloudinary upload failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.secure_url as string;
}