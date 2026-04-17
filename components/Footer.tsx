export default function Footer() {
  return (
    <footer className="bg-[#1A1A1A] text-[#FFF8F0] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm">
            <p className="font-bold tracking-wider">網球俱樂部</p>
            <p className="text-[#FFF8F0]/70 mt-1">提升球技</p>
          </div>
          <div className="text-sm text-[#FFF8F0]/70">
            &copy; {new Date().getFullYear()} 網球俱樂部。版權所有。
          </div>
        </div>
      </div>
    </footer>
  );
}
