import { readFileSync } from 'fs';
import { join } from 'path';
import ClassDetail from './ClassDetail';

type TennisClass = {
  id: string;
  name: string;
  coach: string;
  initials: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  day: string;
  time: string;
  location: string;
  spotsAvailable: number;
  spotsTotal: number;
  price: number;
  description: string;
};

export async function generateStaticParams() {
  const filePath = join(process.cwd(), 'public', 'data', 'classes.json');
  const fileContents = readFileSync(filePath, 'utf8');
  const classes: TennisClass[] = JSON.parse(fileContents);

  return classes.map((classItem) => ({
    id: classItem.id,
  }));
}

export default async function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const filePath = join(process.cwd(), 'public', 'data', 'classes.json');
  const fileContents = readFileSync(filePath, 'utf8');
  const classes: TennisClass[] = JSON.parse(fileContents);

  const classData = classes.find(c => c.id === id);

  if (!classData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[#1A1A1A] mb-4">Class Not Found</h1>
          <p className="text-[#1A1A1A]/60">The class you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return <ClassDetail classData={classData} />;
}
