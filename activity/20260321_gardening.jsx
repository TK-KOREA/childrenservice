import React from 'react';
import { Sprout, Sun, Droplets, Leaf, Scissors, Wind, CalendarDays, CheckCircle2 } from 'lucide-react';

const MonthCalendar = ({ year, month, highlights }) => {
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);
  const weekDays = ['주일', '월', '화', '수', '목', '금', '토'];

  const activeColorMap = {
    amber: 'bg-amber-500 text-white font-bold scale-110 shadow-sm z-10',
    lime: 'bg-lime-500 text-white font-bold scale-110 shadow-sm z-10',
    teal: 'bg-teal-500 text-white font-bold scale-110 shadow-sm z-10',
    yellow: 'bg-yellow-400 text-yellow-900 font-extrabold scale-110 shadow-md ring-2 ring-yellow-200 z-10',
  };

  return (
    <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200/60 text-sm w-full">
       <div className="text-center font-bold mb-3 text-gray-800 text-base">{year}년 {month}월</div>
       <div className="grid grid-cols-7 gap-y-2 gap-x-1 text-center mb-1 text-xs">
         {weekDays.map((d, i) => (
           <div key={d} className={`font-bold ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}>{d}</div>
         ))}
       </div>
       <div className="grid grid-cols-7 gap-y-2 gap-x-1 text-center text-xs">
         {blanks.map(b => <div key={`blank-${b}`}></div>)}
         {days.map(d => {
            const colorKey = highlights[d];
            const dayOfWeek = (firstDay + d - 1) % 7;
            let defaultColor = 'text-gray-600 font-medium';
            if (dayOfWeek === 0) defaultColor = 'text-red-400/80 font-medium';
            if (dayOfWeek === 6) defaultColor = 'text-blue-400/80 font-medium';

            return (
              <div key={d} className="flex justify-center items-center h-6">
                <div className={`w-6 h-6 flex items-center justify-center rounded-full transition-all ${colorKey ? activeColorMap[colorKey] : defaultColor}`}>
                  {d}
                </div>
              </div>
            )
         })}
       </div>
    </div>
  );
};

const HarvestCalendar = () => {
  const start = new Date(2026, 3, 19); // 4월 19일
  const end = new Date(2026, 4, 4);   // 5월 4일

  const calendarStart = new Date(start);
  calendarStart.setDate(start.getDate() - start.getDay()); // 시작 주의 일요일

  const calendarEnd = new Date(end);
  calendarEnd.setDate(end.getDate() + (6 - end.getDay())); // 끝나는 주의 토요일

  const days = [];
  let current = new Date(calendarStart);
  while (current <= calendarEnd) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  const weekDays = ['주일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200/60 text-sm w-full text-gray-800">
       <div className="text-center font-bold mb-3 text-gray-800 text-base">
         4월 19일 ~ 5월 4일
       </div>
       <div className="grid grid-cols-7 gap-y-3 gap-x-1 text-center mb-1 text-xs">
         {weekDays.map((d, i) => (
           <div key={d} className={`font-bold ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}>{d}</div>
         ))}
       </div>
       <div className="grid grid-cols-7 gap-y-3 gap-x-1 text-center text-xs">
         {days.map((d, idx) => {
            const isHigh = d >= start && d <= end;
            const dayOfWeek = d.getDay();
            let defaultColor = 'text-gray-600 font-medium';
            if (dayOfWeek === 0) defaultColor = 'text-red-400/80 font-medium';
            if (dayOfWeek === 6) defaultColor = 'text-blue-400/80 font-medium';

            const isFirstDayOfMonth = d.getDate() === 1;

            return (
              <div key={idx} className="flex flex-col justify-center items-center h-7 relative">
                {isFirstDayOfMonth && (
                  <span className={`absolute -top-3.5 text-[9px] font-black ${isHigh ? 'text-yellow-600' : 'text-emerald-600'}`}>
                    {d.getMonth() + 1}월
                  </span>
                )}
                <div className={`w-6 h-6 flex items-center justify-center rounded-full transition-all ${isHigh ? 'bg-yellow-400 text-yellow-900 font-extrabold scale-110 shadow-md ring-2 ring-yellow-200 z-10' : defaultColor}`}>
                  {d.getDate()}
                </div>
              </div>
            )
         })}
       </div>
    </div>
  );
};

export default function App() {
  const step1Highlights = { 21: 'amber' };
  const step2Highlights = { 23: 'lime', 24: 'lime', 25: 'lime', 26: 'lime', 27: 'lime' };
  const step3Highlights = { 4: 'teal', 5: 'teal', 6: 'teal', 7: 'teal', 8: 'teal', 9: 'teal', 10: 'teal', 11: 'teal' };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
      {/* Mobile Device Container */}
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden relative border-4 border-gray-800">
        
        {/* Header Section */}
        <div className="bg-gradient-to-b from-green-500 to-green-600 text-white p-8 rounded-b-3xl relative">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <Leaf size={100} />
          </div>
          <h1 className="text-3xl font-extrabold mb-2 relative z-10">
            방구석 텃밭<br/>상추 키우기 🌿
          </h1>
          <p className="text-green-50 font-medium relative z-10">
            씨앗부터 수확까지 한눈에 보기
          </p>
        </div>

        {/* Content Section */}
        <div className="p-6 bg-emerald-50/30">
          
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-800">
              <Sprout size={20} className="text-green-600" />
              <h2 className="text-xl font-bold">성장 타임라인</h2>
            </div>
            <div className="flex flex-col items-end gap-1 text-[9px] font-bold text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span>심기</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400"></span>수확</span>
            </div>
          </div>

          {/* Timeline */}
          <div className="relative border-l-2 border-green-200 ml-4 mb-12 space-y-8">
            
            {/* Step 1 */}
            <div className="relative pl-6">
              <div className="absolute -left-[17px] top-4 bg-white border-2 border-amber-400 rounded-full p-1 shadow-sm z-10">
                <div className="w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center">
                  <span className="text-amber-700 text-xs font-bold">1</span>
                </div>
              </div>
              <div className="bg-white border-l-4 border-amber-400 p-4 rounded-xl shadow-sm hover:shadow-md transition-all">
                <h3 className="font-bold text-gray-800 text-lg">씨앗 심기</h3>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <p className="text-sm text-amber-600 font-bold">1일 차</p>
                  <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md text-xs font-semibold border border-amber-100">
                    <CalendarDays size={12} />
                    <span>3.21(토)</span>
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-3">
                  흙을 살짝 파고 씨앗을 겹치지 않게 뿌린 후 흙을 얇게 덮어줍니다. 물을 흠뻑 주세요.
                </p>
                <div className="overflow-hidden rounded-xl border border-gray-100">
                  <MonthCalendar year={2026} month={3} highlights={step1Highlights} />
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative pl-6">
              <div className="absolute -left-[17px] top-4 bg-white border-2 border-lime-400 rounded-full p-1 shadow-sm z-10">
                <Sprout size={20} className="text-lime-500" />
              </div>
              <div className="bg-white border-l-4 border-lime-400 p-4 rounded-xl shadow-sm hover:shadow-md transition-all">
                <h3 className="font-bold text-gray-800 text-lg">새싹 발아</h3>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <p className="text-sm text-lime-600 font-bold">3~7일 차</p>
                  <div className="flex items-center gap-1 bg-lime-50 text-lime-700 px-2 py-0.5 rounded-md text-xs font-semibold border border-lime-100">
                    <CalendarDays size={12} />
                    <span>3.23(월) ~ 3.27(금)</span>
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-3">
                  귀여운 떡잎이 고개를 내밉니다. 흙이 마르지 않게 분무기로 촉촉하게 관리해주세요.
                </p>
                <div className="overflow-hidden rounded-xl border border-gray-100">
                  <MonthCalendar year={2026} month={3} highlights={step2Highlights} />
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative pl-6">
              <div className="absolute -left-[17px] top-4 bg-white border-2 border-teal-400 rounded-full p-1 shadow-sm z-10">
                <Scissors size={20} className="text-teal-500" />
              </div>
              <div className="bg-white border-l-4 border-teal-400 p-4 rounded-xl shadow-sm hover:shadow-md transition-all">
                <h3 className="font-bold text-gray-800 text-lg">솎아내기</h3>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <p className="text-sm text-teal-600 font-bold">2~3주 차</p>
                  <div className="flex items-center gap-1 bg-teal-50 text-teal-700 px-2 py-0.5 rounded-md text-xs font-semibold border border-teal-100">
                    <CalendarDays size={12} />
                    <span>4.4(토) ~ 4.11(토)</span>
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-3">
                  너무 빽빽한 곳은 간격을 넓혀줍니다. 솎아낸 연한 어린잎은 샐러드나 비빔밥으로 즐겨보세요!
                </p>
                <div className="overflow-hidden rounded-xl border border-gray-100">
                  <MonthCalendar year={2026} month={4} highlights={step3Highlights} />
                </div>
              </div>
            </div>

            {/* Step 4 (Emphasized) */}
            <div className="relative pl-6 mt-10">
              {/* Glowing effect behind icon */}
              <div className="absolute -left-[17px] top-4 bg-green-400 rounded-full w-[30px] h-[30px] animate-ping z-0 opacity-75"></div>
              <div className="absolute -left-[17px] top-4 bg-green-500 border-2 border-white rounded-full p-1 shadow-md z-10">
                <Leaf size={20} className="text-white" />
              </div>
              
              <div className="bg-gradient-to-br from-green-500 to-emerald-700 p-5 rounded-2xl shadow-xl shadow-green-200/50 text-white relative overflow-hidden transform hover:-translate-y-1 transition-transform border border-green-400">
                {/* Decorative background leaf */}
                <Leaf size={80} className="absolute -right-6 -bottom-6 text-green-800 opacity-20 transform -rotate-12" />
                
                <div className="flex justify-between items-start mb-1 relative z-10">
                  <h3 className="font-extrabold text-xl flex items-center gap-2">
                    🎉 첫 수확 시작!
                  </h3>
                  <span className="bg-yellow-300 text-yellow-900 text-[10px] font-black px-2.5 py-1 rounded-full animate-bounce shadow-sm">
                    GOAL
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 mb-3 relative z-10">
                  <p className="text-sm text-green-200 font-bold">30~45일 차</p>
                  <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm text-white px-2.5 py-1 rounded-md text-xs font-bold border border-white/30 shadow-sm">
                    <CalendarDays size={12} />
                    <span>4.19(주일) ~ 5.4(월)</span>
                  </div>
                </div>

                <div className="bg-black/10 backdrop-blur-sm text-white text-sm p-3.5 rounded-xl font-medium relative z-10 border border-white/20 leading-relaxed mb-4">
                  잎이 손바닥만 해지면 <span className="text-yellow-300 font-extrabold underline decoration-yellow-400 decoration-2 underline-offset-4">바깥쪽 큰 잎부터 한 장씩</span> 톡톡 떼어서 수확하세요. 안쪽에서 계속 새 잎이 자라납니다.
                </div>

                {/* Continuous Calendar for Step 4 */}
                <div className="relative z-10">
                  <HarvestCalendar />
                </div>
              </div>
            </div>
            
          </div>

          {/* Tips Section */}
          <div className="mt-8">
            <div className="mb-4 flex items-center gap-2 text-green-800">
              <CheckCircle2 size={20} className="text-green-600" />
              <h2 className="text-xl font-bold">성공을 위한 3대 원칙</h2>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 text-center flex flex-col items-center">
                <div className="bg-blue-100 p-2 rounded-full mb-2">
                  <Droplets size={20} className="text-blue-500" />
                </div>
                <h4 className="font-bold text-gray-800 text-sm mb-1">물 주기</h4>
                <p className="text-[10px] text-gray-500">겉흙이 마르면<br/>흠뻑 주기</p>
              </div>
              
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 text-center flex flex-col items-center">
                <div className="bg-orange-100 p-2 rounded-full mb-2">
                  <Sun size={20} className="text-orange-500" />
                </div>
                <h4 className="font-bold text-gray-800 text-sm mb-1">햇빛</h4>
                <p className="text-[10px] text-gray-500">하루 4~5시간<br/>이상 듬뿍</p>
              </div>

              <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 text-center flex flex-col items-center">
                <div className="bg-teal-100 p-2 rounded-full mb-2">
                  <Wind size={20} className="text-teal-500" />
                </div>
                <h4 className="font-bold text-gray-800 text-sm mb-1">통풍</h4>
                <p className="text-[10px] text-gray-500">창문을 열어<br/>신선한 바람을</p>
              </div>
            </div>
          </div>
          
        </div>
        
        {/* Footer */}
        <div className="bg-gray-50 p-4 text-center text-xs text-gray-400 border-t border-gray-100">
          Happy Gardening! 🌱
        </div>
      </div>
    </div>
  );
}
