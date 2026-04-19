import type { Metadata } from 'next';
export const metadata: Metadata = { title: '球場地圖', description: '香港網球場位置一覽，互動地圖搜尋' };
export default function L({ children }: { children: React.ReactNode }) { return children; }
