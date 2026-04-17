import ClassDetailClient from './ClassDetailClient';

export function generateStaticParams() {
  return Array.from({ length: 20 }, (_, i) => ({ id: String(i + 1) }));
}

export default async function ClassDetailPage() {
  return <ClassDetailClient />;
}
