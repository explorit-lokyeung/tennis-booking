'use client';

import { useState } from 'react';

type Court = {
  id: string;
  name: string;
  surface: string;
  type: string;
  hourlyRate: number;
  availability: Record<string, string[]>;
};

type CourtGridProps = {
  courts: Court[];
  selectedDate: string;
  onBooking: (courtName: string, time: string, rate: number) => void;
};

const TIME_SLOTS = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
  '19:00', '20:00', '21:00'
];

export default function CourtGrid({ courts, selectedDate, onBooking }: CourtGridProps) {
  const [selectedSlot, setSelectedSlot] = useState<{ court: string; time: string; rate: number } | null>(null);

  const isAvailable = (court: Court, time: string) => {
    return court.availability[selectedDate]?.includes(time) || false;
  };

  const handleSlotClick = (court: Court, time: string) => {
    if (isAvailable(court, time)) {
      setSelectedSlot({ court: court.name, time, rate: court.hourlyRate });
    }
  };

  const handleConfirmBooking = () => {
    if (selectedSlot) {
      onBooking(selectedSlot.court, selectedSlot.time, selectedSlot.rate);
      setSelectedSlot(null);
    }
  };

  return (
    <>
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header Row */}
          <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: '100px repeat(auto-fit, minmax(80px, 1fr))' }}>
            <div className="font-bold text-sm text-[#1A1A1A] p-2">Time</div>
            {courts.map((court) => (
              <div key={court.id} className="text-center">
                <div className="font-bold text-sm text-[#1A1A1A]">{court.name}</div>
                <div className="text-xs text-[#1A1A1A]/60">{court.surface}</div>
                <div className="text-xs font-semibold text-[#C4A265]">${court.hourlyRate}/hr</div>
              </div>
            ))}
          </div>

          {/* Time Slots Grid */}
          <div className="space-y-2">
            {TIME_SLOTS.map((time) => (
              <div key={time} className="grid gap-2" style={{ gridTemplateColumns: '100px repeat(auto-fit, minmax(80px, 1fr))' }}>
                <div className="flex items-center font-medium text-sm text-[#1A1A1A] p-2">
                  {time}
                </div>
                {courts.map((court) => {
                  const available = isAvailable(court, time);
                  return (
                    <button
                      key={`${court.id}-${time}`}
                      onClick={() => handleSlotClick(court, time)}
                      disabled={!available}
                      className={`p-3 rounded-lg text-xs font-medium transition-all ${
                        available
                          ? 'bg-green-500 hover:bg-green-600 text-white cursor-pointer'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {available ? 'Available' : 'Booked'}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Booking Confirmation Modal */}
      {selectedSlot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold text-[#1A1A1A] mb-4">Confirm Booking</h3>
            <div className="space-y-3 mb-6">
              <p className="text-[#1A1A1A]">
                <span className="font-semibold">Court:</span> {selectedSlot.court}
              </p>
              <p className="text-[#1A1A1A]">
                <span className="font-semibold">Time:</span> {selectedSlot.time}
              </p>
              <p className="text-[#1A1A1A]">
                <span className="font-semibold">Date:</span> {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <p className="text-2xl font-bold text-[#C4A265]">
                ${selectedSlot.rate}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmBooking}
                className="flex-1 bg-[#1A1A1A] text-[#FFF8F0] px-6 py-3 rounded-full font-bold uppercase tracking-wider hover:bg-[#1A1A1A]/90 transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={() => setSelectedSlot(null)}
                className="flex-1 bg-white border-2 border-[#1A1A1A] text-[#1A1A1A] px-6 py-3 rounded-full font-bold uppercase tracking-wider hover:bg-[#1A1A1A]/5 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
