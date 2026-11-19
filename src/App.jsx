import { useState, useEffect } from 'react';
import './App.css'

// Mock data (src/data/ folder se aata hai)
import services from './data/services.json';
import specialists from './data/specialists.json';
import seedBookings from './data/bookings.json';

const specialistFilters = ['All', 'General', 'Dental', 'Dermatology', 'Mental Health', 'Nutrition', 'Cardiology', 'Dietitian'];
const bookingStatuses = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];
const timeSlots = ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'];

/* ---------- helpers ---------- */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const formatDate = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${WEEKDAYS[dt.getDay()]}, ${d} ${MONTHS[m - 1]} ${y}`;
};
const todayISO = () => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};
const statusStyles = {
  Pending: { background: '#fef9c3', color: '#854d0e' },
  Confirmed: { background: '#e0f2fe', color: '#0369a1' },
  Completed: { background: '#dcfce7', color: '#166534' },
  Cancelled: { background: '#fee2e2', color: '#991b1b' },
};
const STORAGE_KEY = 'carenest_bookings_v3';

// kaun sa specialist kis service ke saath chalta hai
const specialistMatchesService = (sp, svc) => {
  if (!sp || !svc) return true;
  return sp.category === svc.category
    || (svc.category === 'Nutrition' && sp.category === 'Dietitian')
    || (svc.category === 'General' && sp.category === 'Cardiology');
};

function App() {
const [showBooking, setShowBooking] = useState(false);
const [selectedService, setSelectedService] = useState('General Consultation');
const [selectedSpecialist, setSelectedSpecialist] = useState('Dr. Ayesha Malik');
const [selectedDate, setSelectedDate] = useState('');
const [selectedTime, setSelectedTime] = useState('');
const [clientName, setClientName] = useState('');
const [clientPhone, setClientPhone] = useState('');
const [clientEmail, setClientEmail] = useState('');
const [clientNotes, setClientNotes] = useState('');
const [bookedSlots] = useState(['10:00 AM', '01:00 PM']);
const [myBookings, setMyBookings] = useState(() => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved)) return saved;
  } catch (e) { /* ignore */ }
  return seedBookings;
});
const [showSlip, setShowSlip] = useState(false);
const [lastBooking, setLastBooking] = useState(null);
const [rescheduleId, setRescheduleId] = useState(null);
const [cancelId, setCancelId] = useState(null);
const [rescheduleDate, setRescheduleDate] = useState('');
const [rescheduleTime, setRescheduleTime] = useState('');
const [activeCategory, setActiveCategory] = useState('All');
const [doctorFilter, setDoctorFilter] = useState('All');
const [specialistSearch, setSpecialistSearch] = useState('');
const [bookingFilter, setBookingFilter] = useState('All');

useEffect(() => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(myBookings)); } catch (e) { /* ignore */ }
}, [myBookings]);

const filteredServices = activeCategory === 'All' ? services : services.filter(s => s.category === activeCategory);

const filteredSpecialists = specialists.filter(s => {
  const matchCategory = doctorFilter === 'All' || s.category === doctorFilter;
  const q = specialistSearch.trim().toLowerCase();
  const matchSearch = !q || s.name.toLowerCase().includes(q) || s.specialty.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
  return matchCategory && matchSearch;
});

const countOf = (status) => myBookings.filter(b => b.status === status).length;
const upcomingCount = countOf('Pending') + countOf('Confirmed');
const filteredBookings = bookingFilter === 'All' ? myBookings : myBookings.filter(b => b.status === bookingFilter);

// us specialist ke us din ke booked slots (cancelled wale free ho jate hain)
const getBookedSlots = (specialistName, date, excludeId) => [
  ...bookedSlots,
  ...myBookings
    .filter(b => b.specialist === specialistName && b.date === date && b.status !== 'Cancelled' && b.id !== excludeId)
    .map(b => b.timeSlot),
];

const resetBookingForm = () => {
  setSelectedDate(''); setSelectedTime('');
  setClientName(''); setClientPhone(''); setClientEmail(''); setClientNotes('');
};

const handleConfirmBooking = () => {
  if (!clientName || !selectedDate || !selectedTime) { alert('Please fill Name, Date and Time Slot'); return; }
  if (clientEmail && !/\S+@\S+\.\S+/.test(clientEmail)) { alert('Please enter a valid email'); return; }
  if (getBookedSlots(selectedSpecialist, selectedDate, null).includes(selectedTime)) { alert('This time slot is already booked'); return; }
  const svc = services.find(s => s.name === selectedService);
  const sp = specialists.find(s => s.name === selectedSpecialist);
  const nextNum = myBookings.reduce((m, b) => Math.max(m, parseInt(String(b.id).replace('BK-', ''), 10) || 0), 1000) + 1;
  const newBooking = {
    id: `BK-${nextNum}`,
    serviceId: svc ? svc.id : null,
    service: selectedService,
    price: svc ? svc.price : '',
    duration: svc ? svc.duration : '',
    specialistId: sp ? sp.id : null,
    specialist: selectedSpecialist,
    specialistRole: sp ? sp.specialty : '',
    date: selectedDate,
    timeSlot: selectedTime,
    name: clientName,
    phone: clientPhone,
    email: clientEmail,
    notes: clientNotes,
    status: 'Pending',
  };
  setMyBookings([newBooking, ...myBookings]);
  setLastBooking(newBooking);
  setShowSlip(true);
  setShowBooking(false);
  resetBookingForm();
};

const openBooking = (serviceName, specialistName) => {
  let svcName = serviceName || selectedService;
  let spName = specialistName || selectedSpecialist;
  const svc = services.find(s => s.name === svcName);
  const sp = specialists.find(s => s.name === spName);
  if (!specialistMatchesService(sp, svc)) {
    if (specialistName) {
      const m = services.find(s => specialistMatchesService(sp, s));
      if (m) svcName = m.name;
    } else {
      const m = specialists.find(s => specialistMatchesService(s, svc));
      if (m) spName = m.name;
    }
  }
  setSelectedService(svcName);
  setSelectedSpecialist(spName);
  setSelectedTime('');
  setShowBooking(true);
};

const cancelBooking = (id) => {
  setMyBookings(myBookings.map(b => b.id === id ? { ...b, status: 'Cancelled' } : b));
  setCancelId(null);
};

const startReschedule = (b) => {
  setRescheduleId(b.id); setRescheduleDate(b.date); setRescheduleTime('');
};

const closeReschedule = () => {
  setRescheduleId(null); setRescheduleDate(''); setRescheduleTime('');
};

const handleReschedule = () => {
  const b = myBookings.find(x => x.id === rescheduleId);
  if (!b) return;
  if (!rescheduleDate || !rescheduleTime) { alert('Please select a new Date and Time Slot'); return; }
  if (getBookedSlots(b.specialist, rescheduleDate, b.id).includes(rescheduleTime)) { alert('This time slot is already booked'); return; }
  setMyBookings(myBookings.map(x => x.id === rescheduleId ? { ...x, date: rescheduleDate, timeSlot: rescheduleTime, status: 'Confirmed' } : x));
  alert('Reschedule Ho Gaya!');
  closeReschedule();
};

const openSlip = (b) => { setLastBooking(b); setShowSlip(true); };

const rescheduleBooking = myBookings.find(b => b.id === rescheduleId);
const cancelTarget = myBookings.find(b => b.id === cancelId);
const slipBooking = lastBooking ? (myBookings.find(b => b.id === lastBooking.id) || lastBooking) : null;

const renderSlots = (booked, selected, onPick) => (
  <div className="cn-slots" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '8px' }}>
    {timeSlots.map(time => {
      const isBooked = booked.includes(time);
      const isSelected = selected === time;
      return (
        <button key={time} type="button" disabled={isBooked} onClick={() => onPick(time)} style={{ padding: '10px 4px', borderRadius: '10px', fontSize: '12px', fontWeight: '700', cursor: isBooked ? 'not-allowed' : 'pointer', border: isSelected ? '1px solid #0d9488' : '1px solid #e2e8f0', background: isBooked ? '#f1f5f9' : isSelected ? '#0d9488' : 'white', color: isBooked ? '#94a3b8' : isSelected ? 'white' : '#334155', lineHeight: '1.2' }}>
          {time}<br/>{isBooked ? <span style={{ fontSize: '10px' }}>Booked</span> : <span style={{ fontSize: '10px', opacity: 0.7 }}>Available</span>}
        </button>
      );
    })}
  </div>
);

const actionBtn = { padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' };
const slipBtn = { ...actionBtn, background: 'white', color: '#148f7d', border: '1px solid #148f7d' };
const rescheduleBtn = { ...actionBtn, background: '#e6f6f3', color: '#0f766e', border: '1px solid #b7e3dc' };
const cancelBtn = { ...actionBtn, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', margin: 0, background: '#fff', textAlign: 'left' }}>

      {/* RESPONSIVE + PRINT STYLES */}
      <style>{`
        html { scroll-behavior: smooth; }
        button { font-family: inherit; }
        .cn-table-wrap { overflow-x: auto !important; }
        .cn-table { min-width: 860px; }
        @media (max-width: 900px) {
          .cn-nav { padding: 12px 20px !important; flex-wrap: wrap; gap: 12px; }
          .cn-nav-links { order: 3; width: 100%; justify-content: center; flex-wrap: wrap; gap: 18px !important; }
          .cn-hero { flex-direction: column !important; padding: 40px 24px 50px !important; gap: 30px; }
          .cn-hero-left, .cn-hero-right { width: 100% !important; box-sizing: border-box; }
          .cn-hero h1 { font-size: 40px !important; }
          .cn-section { padding-left: 24px !important; padding-right: 24px !important; }
          .cn-spec-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 600px) {
          .cn-nav { padding: 12px 16px !important; }
          .cn-hero { padding: 30px 16px 40px !important; }
          .cn-hero h1 { font-size: 28px !important; }
          .cn-hero-btns { flex-wrap: wrap; }
          .cn-hero-right { padding: 22px !important; }
          .cn-section { padding-left: 16px !important; padding-right: 16px !important; }
          .cn-spec-grid { grid-template-columns: 1fr !important; }
          .cn-counts { gap: 10px !important; flex-wrap: wrap; }
          .cn-counts > div { padding: 14px 6px !important; flex: 1 1 40% !important; }
          .cn-form-2 { grid-template-columns: 1fr !important; }
          .cn-slots { grid-template-columns: repeat(2, 1fr) !important; }
          .cn-modal { padding: 20px 18px !important; }
        }
        @media print {
          body * { visibility: hidden !important; }
          #slip-print, #slip-print * { visibility: visible !important; }
          #slip-print { position: absolute !important; left: 0; top: 0; width: 100% !important; max-width: 100% !important; max-height: none !important; overflow: visible !important; box-shadow: none !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* NAVBAR */}
      <div className="cn-nav" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 40px', background: 'white', borderBottom: '1px solid #eef2f7' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <div style={{ width: '34px', height: '34px', background: '#148f7d', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '20px', fontWeight: '900' }}>+</div>
          <span style={{ fontSize: '21px', fontWeight: '800', color: '#0f2a44' }}>Care<span style={{ color: '#148f7d' }}>Nest</span></span>
        </div>
        <div className="cn-nav-links" style={{ display: 'flex', gap: '30px', fontSize: '14px', fontWeight: '700', color: '#475569' }}>
          <a href="#home" style={{ color: '#148f7d', textDecoration:'none'}}>Home</a>
          <a href="#services" style={{ textDecoration: 'none', color: 'inherit' }}>Services</a>
          <a href="#specialists" style={{ textDecoration: 'none', color: 'inherit' }}>Specialists</a>
          <a href="#bookings" style={{ textDecoration: 'none', color: 'inherit' }}>My Bookings <span style={{ background: '#148f7d', color: 'white', fontSize: '11px', padding: '2px 7px', borderRadius: '50%', marginLeft: '2px' }}>{upcomingCount}</span></a>
        </div>
        <button onClick={() => openBooking()} style={{ background: '#148f7d', color: 'white', border: 'none', padding: '11px 20px', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>Book Appointment</button>
      </div>

      {/* HERO - EXACT WALA COLOR */}
      <div id="home" className="cn-hero" style={{ background: '#148f7d', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '55px 50px 70px 50px', textAlign: 'left' }}>

        {/* LEFT */}
        <div className="cn-hero-left" style={{ width: '62%', textAlign: 'left' }}>
          <span style={{ background: 'rgba(255,255,255,0.15)', padding: '7px 13px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', letterSpacing: '0.5px' }}>TRUSTED CARE, ON YOUR SCHEDULE</span>

          <h1 style={{ fontSize: '52px', lineHeight: '1.08', fontWeight: '900', margin: '22px 0 16px 0', color: '#ffffff', textAlign: 'left' }}>
            Book your<br />
            appointment with the<br />
            right specialist in<br />
            minutes.
          </h1>

          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#e0f2fe', maxWidth: '480px', textAlign: 'left' }}>
            Choose a service, pick a specialist, select a time that suits you and get an instant confirmation slip. No calls, no waiting.
          </p>

          <div className="cn-hero-btns" style={{ display: 'flex', gap: '12px', marginTop: '28px', justifyContent: 'flex-start' }}>
            <button onClick={() => openBooking()} style={{ background: 'white', color: '#147a6b', border: 'none', padding: '13px 22px', borderRadius: '10px', fontWeight: '800', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <span style={{ fontSize: '16px' }}>🗓️</span>
              Book Appointment
            </button>
            <button onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })} style={{ background: 'transparent', color: 'white', border: '1.5px solid white', padding: '13px 22px', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>Explore Services</button>
          </div>
        </div>

        {/* RIGHT CARD */}
        <div className="cn-hero-right" style={{ width: '38%', background: '#1da08c', borderRadius: '20px', padding: '30px', textAlign: 'left' }}>
          <p style={{ fontSize: '12px', letterSpacing: '1px', fontWeight: '800', color: '#ffffff', margin: '0 0 22px 0', textAlign: 'left' }}>WHY PATIENTS LOVE US</p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1, background: '#2fb19b', borderRadius: '12px', padding: '18px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: '900' }}>7+</div>
              <div style={{ fontSize: '12px', color: '#e0f2fe', marginTop: '4px' }}>Expert specialists</div>
            </div>
            <div style={{ flex: 1, background: '#2fb19b', borderRadius: '12px', padding: '18px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: '900' }}>8</div>
              <div style={{ fontSize: '12px', color: '#e0f2fe', marginTop: '4px' }}>Services offered</div>
            </div>
            <div style={{ flex: 1, background: '#2fb19b', borderRadius: '12px', padding: '18px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: '900' }}>4.7</div>
              <div style={{ fontSize: '12px', color: '#e0f2fe', marginTop: '4px' }}>Average rating</div>
            </div>
          </div>
          <div style={{ marginTop: '24px', fontSize: '14px', lineHeight: '2.1', fontWeight: '600', color: 'white', textAlign: 'left' }}>
            <div>✓ Real-time slot availability</div>
            <div>✓ Easy reschedule & cancellation</div>
            <div>✓ Printable booking slip</div>
          </div>
        </div>

      </div>

      {/* SERVICES - FIXED */}
      <div className="cn-section" style={{ padding: '50px 40px', background: '#f8fafc', textAlign: 'left' }}>
        <h2 id="services" style={{ fontSize: '32px', fontWeight: '800', color: '#0f2a44', margin: '0' }}>Our Services</h2>
        <p style={{ fontSize: '15px', color: '#64748b', maxWidth: '550px', margin: '10px 0 25px 0' }}>Transparent duration and fees for every service. Pick one and book in a few clicks.</p>

        <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '8px', marginBottom: '30px', flexWrap: 'wrap' }}>
          {['All', 'General', 'Dental', 'Dermatology', 'Mental Health', 'Nutrition'].map((cat) => (
            <button key={cat} onClick={() => setActiveCategory(cat)} style={{ padding: '8px 18px', borderRadius: '20px', cursor: 'pointer', background: activeCategory === cat ? '#148f7d' : 'white', color: activeCategory === cat ? 'white' : '#334155' }}>
              {cat}
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', maxWidth: '1100px', margin: '0 auto' }}>
          {filteredServices.map((s) => (
            <div key={s.id} style={{ background: 'white', padding: '22px', borderRadius: '15px', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: '28px' }}>{s.icon}</span><span style={{ fontSize: '12px', background: '#f0f9f8', padding: '4px 10px', borderRadius: '20px' }}>{s.category}</span></div>
              <h3 style={{ color: '#0f2a44', fontSize: '18px', margin: '15px 0 8px' }}>{s.name}</h3>
              <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.6', minHeight: '60px' }}>{s.desc}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '18px 0' }}><span>⏱ {s.duration}</span><b>{s.price}</b></div>
              <button onClick={() => openBooking(s.name, '')} style={{ width: '100%', background: '#148f7d', color: 'white', border: 'none', padding: '11px', borderRadius: '10px', cursor: 'pointer' }}>Book Now</button>
            </div>
          ))}
        </div>
      </div>

      {/* SPECIALISTS - FINAL FIXED */}
      <div className="cn-section" style={{ padding: '40px 40px 60px 40px', background: '#f0f9f8', textAlign: 'left' }}>
        <h2 id="specialists" style={{ fontSize: '32px', fontWeight: '800', color: '#0f2a44', margin: '0' }}>Meet Our Specialists</h2>
        <p style={{ fontSize: '15px', color: '#64748b', margin: '10px 0 20px 0' }}>Search by name or specialty. Filter by Category.</p>

        <input value={specialistSearch} onChange={e => setSpecialistSearch(e.target.value)} placeholder="Search by name or specialty..." style={{ width: '100%', maxWidth: '600px', padding: '12px 15px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', marginBottom: '15px', background: 'white', boxSizing: 'border-box' }} />

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-start', flexWrap: 'wrap', marginBottom: '25px' }}>
          {specialistFilters.map((cat) => (
            <button key={cat} onClick={() => setDoctorFilter(cat)} style={{ background: doctorFilter === cat ? '#148f7d' : 'white', color: doctorFilter === cat ? 'white' : 'black', padding: '8px 16px', borderRadius: '20px', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}>{cat}</button>
          ))}
        </div>

        <div className="cn-spec-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', textAlign: 'left' }}>
          {filteredSpecialists.map((sp) => (
            <div key={sp.id} style={{ background: 'white', padding: '20px', borderRadius: '15px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ width: '50px', height: '50px', background: '#148f7d', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', flexShrink: 0 }}>{sp.initials}</div>
                <div><h3 style={{ margin: '0', fontSize: '16px', color: '#0f2a44' }}>{sp.name}</h3><p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#148f7d', fontWeight: '600' }}>{sp.specialty}</p></div>
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5', flex: 1 }}>{sp.desc}</p>
              <p style={{ fontSize: '13px', color: '#334155', margin: '0' }}>{sp.exp} yrs experience &nbsp; ⭐ {sp.rating} ({sp.reviews})</p>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '6px 0 12px 0' }}>AVAILABLE DAYS: {sp.days}</p>
              <button onClick={() => openBooking('', sp.name)} style={{ width: '100%', background: '#148f7d', color: 'white', border: 'none', padding: '11px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}>Book with {sp.name.split(' ').slice(0, 2).join(' ')}</button>
            </div>
          ))}
          {filteredSpecialists.length === 0 && (
            <p style={{ gridColumn: '1 / -1', color: '#64748b', fontSize: '14px', margin: 0 }}>No specialists found. Try another name or category.</p>
          )}
        </div>
      </div>

      {/* MY BOOKINGS SECTION */}
      <div id="bookings" className="cn-section" style={{ padding: '40px 30px', background: '#f8fafc' }}>
        <h1 style={{ margin: 0, fontSize: '28px' }}>My Bookings</h1>
        <p style={{ color: '#666', margin: '5px 0 25px' }}>View, reschedule or cancel your appointments.</p>

        {/* TOP COUNTS */}
        <div className="cn-counts" style={{ display: 'flex', gap: '20px', marginBottom: '25px' }}>
          {[
            { label: 'Upcoming', value: upcomingCount, icon: '📅', color: '#0d9488', tint: '#e6f6f3' },
            { label: 'Pending', value: countOf('Pending'), icon: '⏳', color: '#d97706', tint: '#fef3c7' },
            { label: 'Completed', value: countOf('Completed'), icon: '✅', color: '#16a34a', tint: '#dcfce7' },
            { label: 'Cancelled', value: countOf('Cancelled'), icon: '✖️', color: '#dc2626', tint: '#fee2e2' },
          ].map((c) => (
            <div key={c.label} style={{ background: `linear-gradient(180deg, ${c.tint} 0%, white 70%)`, padding: '18px 20px 20px', borderRadius: '14px', flex: 1, textAlign: 'center', borderTop: `4px solid ${c.color}`, boxShadow: '0 4px 14px rgba(15,42,68,0.08)' }}>
              <div style={{ width: '38px', height: '38px', margin: '0 auto 8px', borderRadius: '50%', background: 'white', border: `2px solid ${c.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px' }}>{c.icon}</div>
              <div style={{ fontSize: '32px', fontWeight: '900', lineHeight: '1.1', color: c.color }}>{c.value}</div>
              <div style={{ color: c.color, fontSize: '13px', fontWeight: '700', marginTop: '4px', letterSpacing: '0.3px' }}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* FILTER BUTTONS */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {['All', ...bookingStatuses].map((st) => {
            const count = st === 'All' ? myBookings.length : countOf(st);
            const active = bookingFilter === st;
            return (
              <button key={st} onClick={() => setBookingFilter(st)} style={active ? { background: '#148f7d', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer' } : { background: 'white', border: '1px solid #ddd', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer' }}>{st} {count}</button>
            );
          })}
        </div>

        {/* TABLE */}
        <div className="cn-table-wrap" style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <table className="cn-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ padding: '12px' }}>ID</th>
                <th style={{ padding: '12px' }}>SERVICE</th>
                <th style={{ padding: '12px' }}>SPECIALIST</th>
                <th style={{ padding: '12px' }}>DATE & TIME</th>
                <th style={{ padding: '12px' }}>STATUS</th>
                <th style={{ padding: '12px' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((b) => (
                <tr key={b.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={{ padding: '12px' }}>{b.id}</td>
                  <td style={{ padding: '12px', fontWeight: '600' }}>{b.service}<br /><span style={{ fontWeight: '400', color: '#666' }}>{b.price} • {b.duration}</span></td>
                  <td style={{ padding: '12px' }}>{b.specialist}<br /><span style={{ color: '#666' }}>{b.specialistRole}</span></td>
                  <td style={{ padding: '12px' }}>{formatDate(b.date)}<br />{b.timeSlot}</td>
                  <td style={{ padding: '12px' }}><span style={{ ...statusStyles[b.status], padding: '4px 10px', borderRadius: '20px' }}>{b.status}</span></td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button onClick={() => openSlip(b)} style={slipBtn}>Slip</button>
                      {(b.status === 'Pending' || b.status === 'Confirmed') && (
                        <>
                          <button onClick={() => startReschedule(b)} style={rescheduleBtn}>Reschedule</button>
                          <button onClick={() => setCancelId(b.id)} style={cancelBtn}>Cancel Appointment</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredBookings.length === 0 && (
                <tr style={{ borderTop: '1px solid #eee' }}>
                  <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#666' }}>No {bookingFilter === 'All' ? '' : bookingFilter.toLowerCase() + ' '}bookings found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* {book appointment} */}
      {showBooking && (
        <div onClick={() => setShowBooking(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="cn-modal" onClick={(e) => e.stopPropagation()} style={{ background: 'white', width: '100%', maxWidth: '560px', maxHeight: '88vh', overflowY: 'auto', borderRadius: '20px', padding: '24px 28px', boxShadow: '0 20px 50px rgba(0,0,0,0.25)' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '22px', color: '#0f766e' }}>Book an Appointment</h2>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>Select specialist, date & time slot. No call needed.</p>
              </div>
              <button onClick={() => setShowBooking(false)} style={{ border: 'none', background: '#f1f5f9', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px', flexShrink: 0 }}>✕</button>
            </div>

            <div className="cn-form-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>Service</label>
                <select value={selectedService} onChange={e => {
                  const name = e.target.value;
                  const svc = services.find(x => x.name === name);
                  setSelectedService(name);
                  const cur = specialists.find(x => x.name === selectedSpecialist);
                  if (!specialistMatchesService(cur, svc)) {
                    const m = specialists.find(x => specialistMatchesService(x, svc));
                    if (m) setSelectedSpecialist(m.name);
                  }
                  setSelectedTime('');
                }} style={{ width: '100%', padding: '11px', marginTop: '6px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', outline: 'none' }}>
                  {services.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>Specialist</label>
                <select value={selectedSpecialist} onChange={e => { setSelectedSpecialist(e.target.value); setSelectedTime(''); }} style={{ width: '100%', padding: '11px', marginTop: '6px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', outline: 'none' }}>
                  {specialists.filter(s => s.name === selectedSpecialist || specialistMatchesService(s, services.find(x => x.name === selectedService))).map(s => <option key={s.id} value={s.name}>{s.name} - {s.specialty}</option>)}
                </select>
              </div>
            </div>

            <label style={{ display: 'block', marginTop: '14px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>Date</label>
            <input type="date" min={todayISO()} value={selectedDate} onChange={e => { setSelectedDate(e.target.value); setSelectedTime(''); }} style={{ width: '100%', padding: '11px', marginTop: '6px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', outline: 'none', boxSizing: 'border-box' }} />

            <label style={{ display: 'block', marginTop: '14px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>Available Time Slots</label>
            {renderSlots(getBookedSlots(selectedSpecialist, selectedDate, null), selectedTime, setSelectedTime)}

            <div className="cn-form-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>Your Name</label>
                <input placeholder="Enter your name" value={clientName} onChange={e => setClientName(e.target.value)} style={{ width: '100%', padding: '11px', marginTop: '6px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>Phone</label>
                <input placeholder="03xx-xxxxxxx" value={clientPhone} onChange={e => setClientPhone(e.target.value)} style={{ width: '100%', padding: '11px', marginTop: '6px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>

            <label style={{ display: 'block', marginTop: '12px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>Email</label>
            <input placeholder="you@email.com" value={clientEmail} onChange={e => setClientEmail(e.target.value)} style={{ width: '100%', padding: '11px', marginTop: '6px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', outline: 'none', boxSizing: 'border-box' }} />

            <label style={{ display: 'block', marginTop: '12px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>Notes (Optional)</label>
            <textarea placeholder="Any symptoms or notes..." value={clientNotes} onChange={e => setClientNotes(e.target.value)} rows={2} style={{ width: '100%', padding: '11px', marginTop: '6px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', outline: 'none', boxSizing: 'border-box', resize: 'none' }} />

            <button onClick={handleConfirmBooking} style={{ width: '100%', marginTop: '16px', background: 'linear-gradient(90deg, #0d9488, #14b8a6)', color: 'white', border: 'none', padding: '13px', borderRadius: '12px', fontWeight: '700', fontSize: '15px', cursor: 'pointer', boxShadow: '0 8px 20px rgba(13,148,136,0.3)' }}>
              Confirm Booking →
            </button>
            <p style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8', margin: '10px 0 0' }}>Free cancellation up to 2 hours before appointment</p>

          </div>
        </div>
      )}

      {/* RESCHEDULE MODAL */}
      {rescheduleBooking && (
        <div onClick={closeReschedule} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="cn-modal" onClick={(e) => e.stopPropagation()} style={{ background: 'white', width: '100%', maxWidth: '520px', maxHeight: '88vh', overflowY: 'auto', borderRadius: '20px', padding: '24px 28px', boxShadow: '0 20px 50px rgba(0,0,0,0.25)' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '22px', color: '#0f766e' }}>Reschedule Appointment</h2>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>Choose a new date & time slot for {rescheduleBooking.id}.</p>
              </div>
              <button onClick={closeReschedule} style={{ border: 'none', background: '#f1f5f9', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px', flexShrink: 0 }}>✕</button>
            </div>

            <div style={{ background: '#f0f9f8', borderRadius: '12px', padding: '12px 14px', marginTop: '14px', fontSize: '13px', color: '#334155', lineHeight: '1.7' }}>
              <div><b>{rescheduleBooking.service}</b></div>
              <div>{rescheduleBooking.specialist}{rescheduleBooking.specialistRole ? ` • ${rescheduleBooking.specialistRole}` : ''}</div>
              <div style={{ color: '#64748b' }}>Current: {formatDate(rescheduleBooking.date)}, {rescheduleBooking.timeSlot}</div>
            </div>

            <label style={{ display: 'block', marginTop: '14px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>New Date</label>
            <input type="date" min={todayISO()} value={rescheduleDate} onChange={e => { setRescheduleDate(e.target.value); setRescheduleTime(''); }} style={{ width: '100%', padding: '11px', marginTop: '6px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', outline: 'none', boxSizing: 'border-box' }} />

            <label style={{ display: 'block', marginTop: '14px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>Available Time Slots</label>
            {renderSlots(getBookedSlots(rescheduleBooking.specialist, rescheduleDate, rescheduleBooking.id), rescheduleTime, setRescheduleTime)}

            <button onClick={handleReschedule} style={{ width: '100%', marginTop: '16px', background: 'linear-gradient(90deg, #0d9488, #14b8a6)', color: 'white', border: 'none', padding: '13px', borderRadius: '12px', fontWeight: '700', fontSize: '15px', cursor: 'pointer', boxShadow: '0 8px 20px rgba(13,148,136,0.3)' }}>
              Confirm Reschedule →
            </button>
            <button onClick={closeReschedule} style={{ width: '100%', marginTop: '10px', background: '#f1f5f9', color: '#334155', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
              Keep Current Time
            </button>

          </div>
        </div>
      )}

      {/* CANCEL APPOINTMENT MODAL */}
      {cancelTarget && (
        <div onClick={() => setCancelId(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="cn-modal" onClick={(e) => e.stopPropagation()} style={{ background: 'white', width: '100%', maxWidth: '440px', maxHeight: '88vh', overflowY: 'auto', borderRadius: '20px', padding: '24px 28px', boxShadow: '0 20px 50px rgba(0,0,0,0.25)', textAlign: 'center' }}>

            <div style={{ width: '56px', height: '56px', margin: '0 auto 12px', borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px' }}>⚠️</div>
            <h2 style={{ margin: 0, fontSize: '22px', color: '#991b1b' }}>Cancel Appointment?</h2>
            <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '13px' }}>Are you sure you want to cancel this appointment? This cannot be undone.</p>

            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '12px 14px', marginTop: '16px', fontSize: '13px', color: '#334155', lineHeight: '1.7', textAlign: 'left' }}>
              <div><b>{cancelTarget.id}</b> • {cancelTarget.service}</div>
              <div>{cancelTarget.specialist}{cancelTarget.specialistRole ? ` • ${cancelTarget.specialistRole}` : ''}</div>
              <div style={{ color: '#64748b' }}>{formatDate(cancelTarget.date)}, {cancelTarget.timeSlot}</div>
            </div>

            <button onClick={() => cancelBooking(cancelTarget.id)} style={{ width: '100%', marginTop: '18px', background: '#dc2626', color: 'white', border: 'none', padding: '13px', borderRadius: '12px', fontWeight: '700', fontSize: '15px', cursor: 'pointer', boxShadow: '0 8px 20px rgba(220,38,38,0.25)' }}>
              Yes, Cancel Appointment
            </button>
            <button onClick={() => setCancelId(null)} style={{ width: '100%', marginTop: '10px', background: '#f1f5f9', color: '#334155', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
              No, Keep Appointment
            </button>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: '10px 0 0' }}>Free cancellation up to 2 hours before appointment</p>

          </div>
        </div>
      )}

      {/* BOOKING CONFIRMATION SLIP (PRINTABLE) */}
      {showSlip && slipBooking && (
        <div onClick={() => setShowSlip(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
          <div id="slip-print" className="cn-modal" onClick={(e) => e.stopPropagation()} style={{ background: 'white', width: '100%', maxWidth: '460px', maxHeight: '88vh', overflowY: 'auto', borderRadius: '20px', padding: '24px 28px', boxShadow: '0 20px 50px rgba(0,0,0,0.25)' }}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '2px solid #148f7d' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <div style={{ width: '34px', height: '34px', background: '#148f7d', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '20px', fontWeight: '900' }}>+</div>
                <span style={{ fontSize: '21px', fontWeight: '800', color: '#0f2a44' }}>Care<span style={{ color: '#148f7d' }}>Nest</span></span>
              </div>
              <span style={{ ...statusStyles[slipBooking.status], padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>{slipBooking.status}</span>
            </div>

            <div style={{ textAlign: 'center', margin: '18px 0 14px' }}>
              <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: '#dcfce7', color: '#166534', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '800' }}>✓</div>
              <h2 style={{ margin: '10px 0 4px', fontSize: '22px', color: '#0f766e' }}>Booking Confirmation</h2>
              <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>Please show this slip at the clinic reception.</p>
            </div>

            <div style={{ fontSize: '14px' }}>
              {[
                ['Booking ID', slipBooking.id],
                ['Service', slipBooking.service],
                ['Fee', slipBooking.price],
                ['Duration', slipBooking.duration],
                ['Specialist', slipBooking.specialist + (slipBooking.specialistRole ? ` (${slipBooking.specialistRole})` : '')],
                ['Date', formatDate(slipBooking.date)],
                ['Time', slipBooking.timeSlot],
                ['Patient', slipBooking.name],
                ['Phone', slipBooking.phone],
                ['Email', slipBooking.email],
                ['Notes', slipBooking.notes],
              ].filter(([, value]) => value).map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '9px 0', borderBottom: '1px dashed #e2e8f0' }}>
                  <span style={{ color: '#64748b' }}>{label}</span>
                  <span style={{ color: '#0f2a44', fontWeight: '700', textAlign: 'right' }}>{value}</span>
                </div>
              ))}
            </div>

            <p style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8', margin: '14px 0 0' }}>Free cancellation up to 2 hours before appointment</p>

            <div className="no-print" style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
              <button onClick={() => window.print()} style={{ flex: 1, background: 'linear-gradient(90deg, #0d9488, #14b8a6)', color: 'white', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>🖨️ Print Slip</button>
              <button onClick={() => setShowSlip(false)} style={{ flex: 1, background: '#f1f5f9', color: '#334155', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>Close</button>
            </div>

          </div>
        </div>
      )}

{/* FOOTER - FINAL - PURA CODE */}
<div style={{ background: '#0d9488', color: 'white', overflow: 'hidden' }}>

  {/* UPAR WALI 4 WAVES */}
  <svg viewBox="0 0 1440 90" style={{ display: 'block', width: '100%', marginTop: '-2px' }} preserveAspectRatio="none">
    <path d="M0,60 C180,10 360,95 540,50 C720,5 900,95 1080,50 C1260,5 1350,65 1440,40 L1440,0 L0,0 Z" fill="#f8fafc" />
  </svg>

  <div style={{ display: 'flex', gap: '35px', flexWrap: 'wrap', justifyContent: 'space-between', maxWidth: '1150px', margin: '0 auto', padding: '10px 30px 20px' }}>

    {/* 1 - LOGO */}
    <div style={{ flex: 1, minWidth: '210px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '40px', height: '40px', background: 'white', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0d9488', fontSize: '26px', fontWeight: '800' }}>+</div>
        <div>
          <div style={{ fontSize: '28px', fontWeight: '800', lineHeight: '1', color: 'white' }}>CareNest</div>
          <div style={{ fontSize: '10px', color: '#ccfbf1', marginTop: '2px' }}>Compassionate Care, Trusted Always.</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
        <span style={{ width: '28px', height: '28px', background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', cursor: 'pointer' }}>♡</span>
        <span style={{ width: '28px', height: '28px', background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>IG</span>
        <span style={{ width: '28px', height: '28px', background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>f</span>
        <span style={{ width: '28px', height: '28px', background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>in</span>
        <span style={{ width: '28px', height: '28px', background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>X</span>
      </div>
    </div>

    {/* 2 - SERVICES */}
    <div style={{ flex: 1, minWidth: '140px' }}>
      <h4 style={{ margin: '0 0 12px', fontSize: '17px', fontWeight: '700' }}>Services</h4>
      <p style={{ fontSize: '13px', lineHeight: '1.9', margin: 0, color: '#f0fdfa' }}>Primary Care<br />Pediatrics<br />Mental Wellness<br />Diagnostics</p>
    </div>

    {/* 3 - CONTACT - EXACT LOCATION PIN WALA */}
    <div style={{ flex: 1, minWidth: '210px' }}>
      <h4 style={{ margin: '0 0 12px', fontSize: '17px', fontWeight: '700' }}>Contact</h4>
      <div style={{ fontSize: '12px', lineHeight: '2.2', color: '#f0fdfa' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="white"><path d="M12 0C7.03 0 3 4.03 3 9c0 6.75 9 13 9 13s9-6.25 9-13C21 4.03 16.97 0 12 0zm0 12.5A3.5 3.5 0 1 1 12 5.5a3.5 3.5 0 0 1 0 7z"/></svg>
          <span>123 Health Ave, Wellness City</span>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
          <span>info@carenestclinic.com</span>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
          <span>+1 (555) 123-4567</span>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
          <span>Mon - Sat: 9am - 9pm</span>
        </div>
      </div>
    </div>

    {/* 4 - STAY CONNECTED */}
    <div style={{ flex: 1, minWidth: '230px' }}>
      <h4 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: '700' }}>Stay Connected</h4>
      <p style={{ fontSize: '12px', color: '#ccfbf1', margin: '0 0 10px' }}>Subscribe to our newsletter</p>
      <div style={{ display: 'flex', background: 'white', borderRadius: '20px', overflow: 'hidden', padding: '3px 3px 3px 12px', alignItems: 'center' }}>
        <input placeholder="Your email address" style={{ border: 'none', outline: 'none', flex: 1, fontSize: '12px', padding: '7px 0', background: 'transparent', color: '#333', minWidth: 0 }} />
        <button style={{ background: '#0d9488', color: 'white', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', fontSize: '12px' }}>➤</button>
      </div>
      <p style={{ fontSize: '11px', color: '#ccfbf1', margin: '7px 0 0' }}>We respect your privacy. No spam.</p>
    </div>
  </div>

  {/* BOTTOM BAR + WHATSAPP */}
  <div style={{ borderTop: '1px solid rgba(255,255,255,0.25)', margin: '10px auto 0', padding: '10px 30px', maxWidth: '1150px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', fontSize: '11px', color: '#ccfbf1' }}>
    <span>© 2024 CareNest Clinic. All rights reserved. &nbsp;•&nbsp; Privacy Policy &nbsp;•&nbsp; Terms of Service</span>
    <a href="https://wa.me/923001234567" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'white', color: '#111827', textDecoration: 'none', padding: '4px 4px 4px 12px', borderRadius: '25px', fontWeight: '600', fontSize: '13px' }}>
      Chat with us
      <span style={{ background: '#25D366', width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      </span>
    </a>
  </div>
</div>
    </div>
  )
}

export default App
