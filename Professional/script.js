const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwR1T2dlroFlXNZq20is5C1hc2xrHY2jRTKtAUhUKSBgDxmXdmN28oz0tAL9clv2TteSQ/exec";
const ROOMS_URL = "https://script.google.com/macros/s/AKfycbwR1T2dlroFlXNZq20is5C1hc2xrHY2jRTKtAUhUKSBgDxmXdmN28oz0tAL9clv2TteSQ/exec";
const cleanPhone = (p)=> String(p).replace(/[^0-9]/g,'').slice(-10);

const roomsData = [
 {id:1,name:"The Grand Opera Suite",price:420,bed:"King",amen:["WiFi","Breakfast","Pool"],img:"https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=800",about:"600 sqft luxury suite with Eiffel view."},
 {id:2,name:"Eiffel River View Room",price:350,bed:"King",amen:["WiFi","Breakfast","Pool"],img:"https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=800",about:"River view, balcony, luxury bathroom."},
 {id:3,name:"Montmartre Boutique Room",price:220,bed:"Double",amen:["WiFi","Breakfast"],img:"https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=800",about:"Cozy boutique in Montmartre."},
 {id:4,name:"Penthouse Loft",price:450,bed:"King",amen:["WiFi","Pool","Spa"],img:"https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=800",about:"Luxury penthouse with panoramic city view."},
 {id:5,name:"Royal Garden Room",price:280,bed:"Double",amen:["WiFi","Breakfast","Garden"],img:"https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=800",about:"Garden view room with private balcony."},
 {id:6,name:"Oceanfront Villa",price:500,bed:"King",amen:["WiFi","Breakfast","Pool","Beach"],img:"https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=800",about:"Oceanfront villa with private pool."},
];

let selectedRoom = roomsData[0];
let guestsData = (()=>{
  try{
    const saved = localStorage.getItem('lumina_guests');
    return saved? JSON.parse(saved) : { adults:1, children:0, rooms:1 };
  }catch(e){
    return { adults:1, children:0, rooms:1 };
  }
})();

let availabilityCache = {};
let lastSearchAvailMap = null;
let lastSearchCheckin = "";
let lastSearchCheckout = "";
let lastRoomsList = [];


let calDataCache = {}; // { "2026-11-17": 5, ... }
let calCurrentMonth = new Date(); calCurrentMonth.setDate(1);
let calSelectedDate = "";

async function renderAvailabilityCalendar(roomName){
  const calEl = document.getElementById('availabilityCalendar');
  if(!calEl) return;
  calEl.innerHTML = '<p style="text-align:center;color:#888;font-size:13px;padding:20px;">Loading availability...</p>';

  try{
    const res = await fetch(`${ROOMS_URL}?calendar=true&roomType=${encodeURIComponent(roomName)}&t=${Date.now()}`);
    calDataCache = await res.json();
  }catch(e){ calDataCache = {}; }

  calCurrentMonth = new Date(); calCurrentMonth.setDate(1);
  calSelectedDate = "";
  drawCalendarMonth();
}

function changeCalMonth(delta){
  calCurrentMonth.setMonth(calCurrentMonth.getMonth() + delta);
  drawCalendarMonth();
}

function drawCalendarMonth(){
  const calEl = document.getElementById('availabilityCalendar');
  const labelEl = document.getElementById('calMonthLabel');
  if(!calEl) return;

  const year = calCurrentMonth.getFullYear();
  const month = calCurrentMonth.getMonth();
  const monthName = calCurrentMonth.toLocaleString('en', {month:'long', year:'numeric'});
  if(labelEl) labelEl.innerText = monthName;

  const today = new Date(); today.setHours(0,0,0,0);
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month+1, 0);
  const startWeekDay = firstDay.getDay(); // 0 = Sun

  let html = `<div style="display:grid; grid-template-columns:repeat(7,1fr); gap:4px; text-align:center; font-size:11px; font-weight:800; color:#888; margin-bottom:6px;">
    <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
  </div>`;
  html += `<div style="display:grid; grid-template-columns:repeat(7,1fr); gap:4px;">`;

  // Empty cells before 1st
  for(let i=0;i<startWeekDay;i++) html += `<div></div>`;

  for(let d=1; d<=lastDay.getDate(); d++){
    const dateObj = new Date(year, month, d);
    const key = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const left = calDataCache[key];
    const isPast = dateObj < today;
    const isSelected = key === calSelectedDate;

    let bg = '#fff', color = '#111', dot = '#22c55e', opacity = '1', border = '1px solid #eee', cursor = 'pointer';
    if(isPast){ bg = '#f9f9f9'; color = '#bbb'; dot = '#ddd'; cursor = 'not-allowed'; opacity = '0.6'; }
    else if(left === undefined){ dot = '#22c55e'; }
    else if(left <= 0){ bg = '#fef2f2'; color = '#991b1b'; dot = '#ef4444'; cursor = 'not-allowed'; opacity = '0.6'; }
    else if(left <= 2){ dot = '#eab308'; }

    if(isSelected){ bg = '#111'; color = '#D4AF37'; border = '1px solid #111'; dot = '#D4AF37'; }

    const click = (isPast || left === 0) ? '' : `onclick="selectCalDate('${key}', ${left ?? 99}, '${dateObj.toDateString()}')"`;

    html += `<div ${click} style="background:${bg}; color:${color}; border:${border}; border-radius:10px; padding:8px 2px 6px 2px; cursor:${cursor}; opacity:${opacity}; position:relative;">
      <div style="font-size:14px; font-weight:800; line-height:1;">${d}</div>
      <div style="width:6px; height:6px; border-radius:50%; background:${dot}; margin:5px auto 0 auto;"></div>
    </div>`;
  }
  html += `</div>`;
  calEl.innerHTML = html;
}

function selectCalDate(key, left, dateString){
  calSelectedDate = key;
  drawCalendarMonth();
  const label = document.getElementById('calSelectedLabel');
  if(label){
    if(left <= 0) label.innerHTML = `<b style="color:#991b1b;">${dateString} — Fully booked</b>`;
    else if(left <= 2) label.innerHTML = `<b style="color:#92400e;">${dateString} — Only ${left} left! Book fast</b>`;
    else label.innerHTML = `<b style="color:#166534;">${dateString} — ${left} rooms available</b>`;
  }
  // Auto-fill check-in if empty, else check-out
  const ci = document.getElementById('dCheckin');
  const co = document.getElementById('dCheckout');
  if(ci && !ci.value){ ci.value = key; localStorage.setItem('lumina_checkin', key); }
  else if(co){ co.value = key; localStorage.setItem('lumina_checkout', key); }
  updatePriceDisplay();
}

function pickDateFromCalendar(dateStr){
  // When guest click a green date for calendar, auto-fill check-in
  const ci = document.getElementById('dCheckin');
  if(ci && !ci.value){
    ci.value = dateStr;
    localStorage.setItem('lumina_checkin', dateStr);
  } else {
    const co = document.getElementById('dCheckout');
    if(co){ co.value = dateStr; localStorage.setItem('lumina_checkout', dateStr); }
  }
  updatePriceDisplay();
}

async function searchRooms(){
  let checkin =  document.getElementById('dCheckin')?.value || "";
  let checkout = document.getElementById('dCheckout')?.value || "";

  if(!checkin){
    const all = [...document.querySelectorAll('input')];
    const t = all.find(i=> i.value && i.value.includes('/'));
    if(t){
      const p = t.value.split('/');
      checkin = `${p[2]}-${p[0].padStart(2,'0')}-${p[1].padStart(2,'0')}`;
    }
  }

  if(!checkin ||!checkout){
    alert("Please pick Check-in and Check-out first");
    return;
  }

  localStorage.setItem('lumina_checkin', checkin);
  localStorage.setItem('lumina_checkout', checkout);
  lastSearchCheckin = checkin;
  lastSearchCheckout = checkout;

  showPage('rooms');

  // SHOW IMMEDIATELY
  lastRoomsList = roomsData.map(r=> ({...r, availableForSearch: 1}));
  renderRooms(lastRoomsList);

  const rc = document.getElementById('resultsCount');
  if(rc) rc.innerText = `Checking availability for ${checkin} → ${checkout}...`;

  try{
    const res = await fetch(`${ROOMS_URL}?rooms=true&checkin=${encodeURIComponent(checkin)}&checkout=${encodeURIComponent(checkout)}&t=${Date.now()}`, {redirect:"follow", cache:"no-store"});
    if(!res.ok) throw new Error(res.status);
    const roomsAvail = await res.json();
    const availMap = {};
    roomsAvail.forEach(r=> availMap[r.roomType.toLowerCase().trim()] = r.available);
    lastSearchAvailMap = availMap;

    let filtered = roomsData.map(r=> {
      const key = r.name.toLowerCase().trim();
      const avail = availMap[key]?? 0;
      return {...r, availableForSearch: avail};
    }).filter(r=> r.availableForSearch > 0); // hide FULL rooms like Grand Opera when 0

    lastRoomsList = filtered;
    renderRooms(filtered);
    if(rc) rc.innerText = `${filtered.length} rooms available for ${checkin} → ${checkout}`;
  }catch(e){
    console.log("Fetch failed", e);
    if(rc) rc.innerText = `Showing rooms for ${checkin} → ${checkout}`;
  }
}

// === ONLY ONE filterRooms - FIXED ===
function filterRooms(){
  if(!lastRoomsList.length) lastRoomsList = roomsData.map(r=> ({...r, availableForSearch: 1}));

  const maxPrice = Number(document.getElementById('priceRange')?.value || 1000);
  if(document.getElementById('priceVal')) document.getElementById('priceVal').innerText = maxPrice;

  const amens = [...document.querySelectorAll('.amen:checked')].map(c=>c.value.toLowerCase());
  const beds = [...document.querySelectorAll('.bed:checked')].map(c=>c.value.toLowerCase());

  let filtered = [...lastRoomsList];

  filtered = filtered.filter(r=>{
    if(r.price > maxPrice) return false;
    if(r.availableForSearch!== undefined && r.availableForSearch <=0) return false;
    if(amens.length){
      const tags = (r.amen||[]).join(' ').toLowerCase();
      for(let a of amens){ if(!tags.includes(a)) return false; }
    }
    if(beds.length){
      const b = (r.bed||'').toLowerCase();
      if(!beds.some(x=> b.includes(x))) return false;
    }
    return true;
  });

  renderRooms(filtered);

  const resultsCountEl = document.getElementById('resultsCount');
  if(resultsCountEl && lastSearchCheckin){
    if(filtered.length===0) resultsCountEl.innerText = `No rooms available for ${lastSearchCheckin} → ${lastSearchCheckout}`;
    else resultsCountEl.innerText = `${filtered.length} rooms available for ${lastSearchCheckin} → ${lastSearchCheckout}`;
  }
}

function clearFilters(){
  document.querySelectorAll('.amen,.bed').forEach(c=> c.checked=false);
  const pr = document.getElementById('priceRange');
  if(pr){ pr.value=1000; const pv=document.getElementById('priceVal'); if(pv) pv.innerText=1000; }
  filterRooms();
}

async function loadAvailabilityCache(){
  try{
    const res = await fetch(`${ROOMS_URL}?rooms=true&t=${Date.now()}`);
    const rooms = await res.json();
    rooms.forEach(r=>{
      availabilityCache[r.roomType.toLowerCase()] = r.available;
    });
  }catch(e){}
}

function getGuestsText(){
  const total = guestsData.adults + guestsData.children;
  return `${total} guest${total>1?'s':''} · ${guestsData.rooms} room${guestsData.rooms>1?'s':''}`;
}
function getSelectedGuests(){ return getGuestsText(); }

function showPage(id){
  document.querySelectorAll('.page').forEach(p=> p.style.display='none');
  const target = document.getElementById(id);
  if(target) target.style.display='block';
  document.querySelectorAll('.bottom-nav button,.bottom-nav div, nav button').forEach(btn=>{
    btn.classList.remove('active');
    btn.style.background = '';
    btn.style.color = '';
    btn.style.fontWeight = '';
    const onclick = btn.getAttribute('onclick') || '';
    if(onclick.includes(`'${id}'`) || onclick.includes(`"${id}"`)){
      btn.classList.add('active');
      btn.style.background = '#111';
      btn.style.color = '#D4AF37';
      btn.style.fontWeight = '900';
    }
  });
  document.querySelectorAll('.nav-item').forEach(item=>{
    item.classList.remove('active');
    if(item.dataset.page === id) item.classList.add('active');
  });
  window.scrollTo(0,0);
}

function goBackToRooms(){
  showPage('rooms');
  if(lastRoomsList.length>0){
    renderRooms(lastRoomsList);
  }
  const resultsCountEl = document.getElementById('resultsCount');
  if(resultsCountEl && lastSearchCheckin){
    resultsCountEl.innerText = `${lastRoomsList.length} rooms available for ${lastSearchCheckin} → ${lastSearchCheckout}`;
  }
}

function goBookings(){
  showPage('bookings');
  loadMyBookings();
}
function calcNights(){
  let cIn = localStorage.getItem('lumina_checkin') || document.getElementById('coCheckin')?.value || document.getElementById('dCheckin')?.value;
  let cOut = localStorage.getItem('lumina_checkout') || document.getElementById('coCheckout')?.value || document.getElementById('dCheckout')?.value;
  if(!cIn || !cOut) return 1;
  const d1 = new Date(cIn);
  const d2 = new Date(cOut);
  const diff = Math.round((d2 - d1) / (1000*60*60*24));
  return diff > 0? diff : 1;
}

function cardHTML_Home(r){
  const badge = r.id === 1 ? 'MOST BOOKED' : r.id === 4 ? 'LUXURY PICK' : 'POPULAR';
  const rating = (4.7 + (r.id % 3) * 0.1).toFixed(1);
  return `<div class="room-card-new" onclick="openRoom('${r.id}')">
    <div style="position:relative;"><img src="${r.img}" alt="${r.name}"><span style="position:absolute;top:12px;left:12px;background:#111;color:#D4AF37;font-size:10px;font-weight:900;padding:6px 10px;border-radius:20px;">${badge}</span></div>
    <div class="rc-body">
      <div class="rc-top"><span class="rc-badge">★ ${rating} • Verified</span><span style="font-size:11px;color:#888;">${r.bed} Bed</span></div>
      <h3>${r.name}</h3>
      <p class="rc-meta">${r.about}</p>
      <div class="rc-price"><div><b>$${r.price}</b> <small>/ night</small><div style="font-size:11px;color:#16a34a;font-weight:800;">✓ Free cancellation</div></div><button type="button" onclick="event.stopPropagation(); openRoom('${r.id}')" class="rc-btn">View →</button></div>
    </div>
  </div>`;
}
function cardHTML(r){
  const avail = r.availableForSearch ?? r.available ?? 10;
  const isLow = avail <= 2;
  const rating = (4.7 + (r.id % 3) * 0.1).toFixed(1);
  const badge = r.id == 1 ? 'MOST BOOKED' : r.id == 4 ? 'LUXURY PICK' : r.id == 6 ? 'BEST FOR FAMILIES' : 'POPULAR';
  const nights = (typeof calcNights === 'function') ? calcNights() : 1;

  return `<div class="room-lux-card" onclick="openRoom('${r.id}')">
    <div style="position:relative;overflow:hidden;">
      <img src="${r.img}" alt="${r.name}" loading="lazy">
      <div style="position:absolute;bottom:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#D4AF37, #FFF3CD, #D4AF37);"></div>
      <span style="position:absolute;top:14px;left:14px;background:#111;color:#D4AF37;font-size:10px;font-weight:900;letter-spacing:1px;padding:7px 11px;border-radius:20px;">${badge}</span>
      <span style="position:absolute;top:14px;right:14px;background:rgba(255,255,255,.96);font-size:11px;font-weight:900;padding:7px 10px;border-radius:20px;box-shadow:0 2px 10px rgba(0,0,0,.15);">★ ${rating} • Verified</span>
      ${isLow ? `<span style="position:absolute;bottom:14px;left:14px;background:#dc2626;color:#fff;font-size:11px;font-weight:900;padding:7px 11px;border-radius:20px;">🔥 Only ${avail} left</span>` : `<span style="position:absolute;bottom:14px;left:14px;background:rgba(255,255,255,.96);color:#166534;font-size:11px;font-weight:900;padding:7px 11px;border-radius:20px;">✓ ${avail} available</span>`}
    </div>

    <div style="padding:18px 18px 16px 18px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
        <div>
          <p style="margin:0;font-size:10px;letter-spacing:1.5px;font-weight:900;color:#B9975B;">LUMINA • NSUKKA</p>
          <h3 style="font-family:'Playfair Display',serif;font-size:22px;line-height:1.15;margin:4px 0 6px 0;font-weight:600;">${r.name}</h3>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div style="font-size:10px;color:#888;letter-spacing:1px;">FROM</div>
          <b style="font-family:'Playfair Display',serif;font-size:22px;">$${r.price}</b>
          <div style="font-size:11px;color:#888;">/ night</div>
        </div>
      </div>

      <p style="color:#666;font-size:13px;line-height:1.6;margin:0;">${r.bed} Bed • ${r.about || 'Luxury room with premium amenities'}</p>

      <div style="display:flex;gap:6px;flex-wrap:wrap;margin:12px 0;">
        <span style="background:#FFFEFB;border:1px solid #E8DCC0;padding:5px 10px;border-radius:20px;font-size:11px;font-weight:700;color:#6b5a2e;">📶 Free Wi-Fi</span>
        <span style="background:#FFFEFB;border:1px solid #E8DCC0;padding:5px 10px;border-radius:20px;font-size:11px;font-weight:700;color:#6b5a2e;">🍳 Breakfast</span>
        <span style="background:#FFFEFB;border:1px solid #E8DCC0;padding:5px 10px;border-radius:20px;font-size:11px;font-weight:700;color:#6b5a2e;">🏊 Pool Access</span>
      </div>

      <div style="border-top:1px solid #f0e8d5;padding-top:12px;display:flex;justify-content:space-between;align-items:center;gap:10px;">
        <div style="font-size:12px;color:#666;line-height:1.4;">
          ${nights} night${nights>1?'s':''} total • <b style="color:#111;font-size:15px;">$${r.price * nights}</b>
          <div style="color:#16a34a;font-weight:800;">✓ Free cancellation</div>
        </div>
        <button type="button" onclick="event.stopPropagation(); openRoom('${r.id}')" style="background:#111;color:#D4AF37;border:none;padding:12px 18px;border-radius:12px;font-weight:900;font-size:13px;cursor:pointer;white-space:nowrap;">View Details →</button>
      </div>
    </div>
  </div>`;
}

function renderFeatured(){
  const g = document.getElementById('featuredGrid');
  if(g) g.innerHTML = roomsData.map(r=>cardHTML_Home(r)).join('');
  
}

function renderRooms(list){
    const roomsGrid = document.getElementById('roomsGrid');
    const featuredGrid = document.getElementById('featuredGrid');
  if(!roomsGrid && !featuredGrid) return;
  const rc = document.getElementById('resultsCount');

  if(!list || list.length===0){
    roomsGrid.innerHTML = `<div style="padding:40px;text-align:center;">No rooms match. <button onclick="clearFilters()" style="color:#c5a880;background:none;border:1px solid #c5a880;padding:6px 12px;border-radius:8px;">Clear filters</button></div>`;
    if(rc && lastSearchCheckin) rc.innerText = `0 rooms available for ${lastSearchCheckin} → ${lastSearchCheckout}`;
    return;
  }

  roomsGrid.innerHTML = list.map(room => {
    const key = room.name.toLowerCase().trim();
    let available = room.availableForSearch;
    if(available===undefined && lastSearchAvailMap && lastSearchAvailMap[key]!==undefined){
      available = lastSearchAvailMap[key];
    }
    if(available===undefined) available = 1;
    if(available < 0) available = 0;

    // --- LUXURY + DYNAMIC AMENITIES - Uses YOUR room.amen array ---
    const rating = (4.7 + (room.id % 3) * 0.1).toFixed(1);
    const badge = room.id == 1 ? 'MOST BOOKED' : room.id == 4 ? 'LUXURY PICK' : room.id == 6 ? 'BEST FOR FAMILIES' : 'POPULAR';
    const nights = (typeof calcNights === 'function') ? calcNights() : 1;
    const isLow = available > 0 && available <= 2;
    const isSoldOut = available === 0;

    // Map your amen values to pretty chips - ONLY show what this room actually has
    const amenMap = {
      'wifi': '📶 Free Wi-Fi',
      'breakfast': '🍳 Breakfast',
      'pool': '🏊 Pool Access',
      'spa': '💆 Spa Access',
      'garden': '🌿 Garden View',
      'beach': '🏖️ Beach Access'
    };
    const chips = (room.amen || []).map(a => {
      const label = amenMap[a.toLowerCase()] || a;
      return `<span style="background:#FFFEFB;border:1px solid #E8DCC0;padding:5px 10px;border-radius:20px;font-size:11px;font-weight:700;color:#6b5a2e;">${label}</span>`;
    }).join('');

    return `
    <div class="room-lux-card" onclick="openRoom('${room.id}')" data-id="${room.id}" style="cursor:pointer;background:#fff;border:1px solid #EDE8DC;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.06);margin-bottom:20px;">
      <div style="position:relative;overflow:hidden;">
        <img src="${room.img}" style="width:100%;height:230px;object-fit:cover;display:block;">
        <div style="position:absolute;bottom:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#D4AF37, #FFF3CD, #D4AF37);"></div>
        <span style="position:absolute;top:14px;left:14px;background:#111;color:#D4AF37;font-size:10px;font-weight:900;letter-spacing:1px;padding:7px 11px;border-radius:20px;">${badge}</span>
        <span style="position:absolute;top:14px;right:14px;background:rgba(255,255,255,.96);font-size:11px;font-weight:900;padding:7px 10px;border-radius:20px;box-shadow:0 2px 10px rgba(0,0,0,.15);">★ ${rating} • Verified</span>
      
      </div>
      <div style="padding:18px 18px 16px 18px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
          <div>
            <p style="margin:0;font-size:10px;letter-spacing:1.5px;font-weight:900;color:#B9975B;">LUMINA • NSUKKA</p>
            <h3 style="font-family:'Playfair Display',serif;font-size:22px;line-height:1.15;margin:4px 0 6px 0;font-weight:600;color:#0a192f;">${room.name}</h3>
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <div style="font-size:10px;color:#888;letter-spacing:1px;">FROM</div>
            <b style="font-family:'Playfair Display',serif;font-size:22px;color:#0a192f;">$${room.price}</b>
            <div style="font-size:11px;color:#888;">/ night</div>
          </div>
        </div>

        <p style="color:#666;margin:0;font-size:13px;line-height:1.6;">${room.bed} • ${room.about||''}</p>

        <div style="display:flex;gap:6px;flex-wrap:wrap;margin:12px 0;">${chips}</div>

        <div style="border-top:1px solid #f0e8d5;padding-top:12px;display:flex;justify-content:space-between;align-items:center;gap:10px;">
          <div style="font-size:12px;color:#666;line-height:1.4;">
            ${nights} night${nights>1?'s':''} total • <b style="color:#111;font-size:15px;">$${room.price * nights}</b>
            <div style="color:#16a34a;font-weight:800;">✓ Free cancellation</div>
          </div>
          <button type="button" onclick="event.stopPropagation(); openRoom('${room.id}')" style="background:#111;color:#D4AF37;border:none;padding:12px 18px;border-radius:12px;font-weight:900;font-size:13px;cursor:pointer;white-space:nowrap;">View Details →</button>
        </div>
      </div>
    </div>
    `;
  }).join('');
}


function openRoom(id){
  selectedRoom = roomsData.find(r=>r.id==id) || roomsData[0];
  window.currentRoom = selectedRoom;
  document.getElementById('dName').innerText = selectedRoom.name;
document.getElementById('dSub').innerText = `${selectedRoom.bed} Bed • ${selectedRoom.about.substring(0,60)}`;
document.getElementById('dImg2').src = selectedRoom.img;
document.getElementById('dImg3').src = selectedRoom.img;
// For now using same image, later you can add more per room:
document.getElementById('dBathImg').src = "https://images.unsplash.com/photo-1620626011761-996317b8d101?w=600";
document.getElementById('dBedImg').src = selectedRoom.img;
  const imgEl = document.getElementById('dMainImg');
  if(imgEl) imgEl.src = selectedRoom.img;
  const aboutEl = document.getElementById('dAbout');
  if(aboutEl) aboutEl.innerText = selectedRoom.about;
  const amenEl = document.getElementById('dAmenities');
  if(amenEl) amenEl.innerHTML = selectedRoom.amen.map(a=>`<span style="background:#FFF3CD;color:#111;padding:7px 14px;border-radius:20px;font-size:13px;font-weight:800;border:1px solid #C8B896;display:inline-block;margin:3px">✓ ${a}</span>`).join('') + `<div style="margin-top:10px;font-size:13px;color:#555;font-weight:700;">Bed: ${selectedRoom.bed} | Size: Luxury</div>`;
  const dCi = document.getElementById('dCheckin');
  const dCo = document.getElementById('dCheckout');
  if(dCi) dCi.value = localStorage.getItem('lumina_checkin') || dCi.value;
  if(dCo) dCo.value = localStorage.getItem('lumina_checkout') || dCo.value;
  document.querySelectorAll('#guestRoomDisplay, #dGuestRoomDisplay').forEach(el=> el.innerText = getGuestsText());
  updatePriceDisplay();
  showPage('roomDetail');
  checkAvailabilityForRoom(selectedRoom.name);
  renderAvailabilityCalendar(selectedRoom.name);
}
function showRoomDetail(id){ openRoom(id); }
function updatePriceDisplay(){
  if(!selectedRoom) return;
  const nights = calcNights();
  const rooms = guestsData.rooms || 1;
  const total = nights * selectedRoom.price * rooms;
  const dPrice = document.getElementById('dPrice');
  const breakdown = document.getElementById('priceBreakdown');
  if(dPrice) dPrice.innerHTML = `$${selectedRoom.price} / night <br><small style="font-size:13px;color:#555">${nights} night${nights>1?'s':''} × ${rooms} room${rooms>1?'s':''} = </small><span style="color:#9C6B2E">$${total}</span>`;
  if(breakdown) breakdown.innerHTML = `<div style="margin-top:12px;padding:12px;background:#FFF8E6;border-radius:10px;font-size:13px;border:1px dashed #C8B896"><div style="display:flex;justify-content:space-between"><span>$${selectedRoom.price} × ${nights} nights × ${rooms} rooms</span><b>$${total}</b></div><div style="display:flex;justify-content:space-between;margin-top:8px;font-weight:900;border-top:1px solid #C8B896;padding-top:8px"><span>Total</span><span>$${total}</span></div></div>`;
  const opayAmt = document.getElementById('opayAmount');
  const paystackAmt = document.getElementById('paystackAmount');
  const checkoutRoomName = document.getElementById('checkoutRoomName');
  if(opayAmt) opayAmt.innerText = `$${total}`;
  if(paystackAmt) paystackAmt.innerText = `$${total}`;
  if(checkoutRoomName) checkoutRoomName.innerText = selectedRoom.name;
}
function goCheckout(){
  // 1. Get dates from Room Details inputs OR from localStorage (from Check Availability)
  let homeIn = document.getElementById('dCheckin')?.value || localStorage.getItem('lumina_checkin') || "";
  let homeOut = document.getElementById('dCheckout')?.value || localStorage.getItem('lumina_checkout') || "";

  if(!homeIn || !homeOut){
    alert("Please pick Check-in and Check-out first");
    return;
  }

  // 2. Save am so Checkout fit read am
  localStorage.setItem('lumina_checkin', homeIn);
  localStorage.setItem('lumina_checkout', homeOut);
  localStorage.setItem('lumina_guests', JSON.stringify(guestsData));

  // 3. Show Checkout page
  document.querySelectorAll('.page').forEach(p=> p.style.display='none');
  const check = document.getElementById('checkout');
  if(check) check.style.display='block';

  // 4. Fill Checkout page with NEW unique IDs
  setTimeout(()=>{
    const coCi = document.getElementById('coCheckin');
    const coCo = document.getElementById('coCheckout');
    if(coCi) coCi.value = homeIn;
    if(coCo) coCo.value = homeOut;

    const txt = getGuestsText();
    const coGuest = document.getElementById('checkoutGuestRoomDisplay');
    if(coGuest) coGuest.innerText = txt;
    document.querySelectorAll('#guestRoomDisplay, #dGuestRoomDisplay').forEach(el=> el.innerText = txt);

    // Sync counts for modal
    const a = document.getElementById('adultsCount');
    const c = document.getElementById('childrenCount');
    const r = document.getElementById('roomsCount');
    if(a) a.innerText = guestsData.adults;
    if(c) c.innerText = guestsData.children;
    if(r) r.innerText = guestsData.rooms;

    updateCheckoutPriceDisplay();
    handlePayChange();

    const err = document.getElementById('errorMsg');
    if(err){ err.style.display='none'; err.innerText=''; }
  }, 100);

  window.scrollTo(0,0);
}

function updateCheckoutPriceDisplay(){
  if(!selectedRoom) return;
  const nights = calcNights();
  const rooms = guestsData.rooms || 1;
  const total = nights * selectedRoom.price * rooms;

  const coPrice = document.getElementById('coPrice');
  const coBreak = document.getElementById('coPriceBreakdown');
  if(coPrice) coPrice.innerHTML = `$${selectedRoom.price} / night × ${nights} night${nights>1?'s':''} × ${rooms} room${rooms>1?'s':''} = <span style="color:#9C6B2E">$${total}</span>`;

  // Also update OPay / Paystack amounts
  const opayAmt = document.getElementById('opayAmount');
  const paystackAmt = document.getElementById('paystackAmount');
  if(opayAmt) opayAmt.innerText = `$${total}`;
  if(paystackAmt) paystackAmt.innerText = `$${total}`;
  const checkoutRoomName = document.getElementById('checkoutRoomName');
  if(checkoutRoomName) checkoutRoomName.innerText = selectedRoom.name;
}
function handlePayChange(){
  const payEl = document.getElementById('payMethod');
  if(!payEl) return;
  const pay = payEl.value;
  const opayBox = document.getElementById('opayBox');
  const paystackBox = document.getElementById('paystackBox');
  const confirmBtn = document.getElementById('confirmBtn');
  const paystackBtn = document.getElementById('paystackBtn');
  if(opayBox) opayBox.style.display = pay.includes('OPay')? 'block' : 'none';
  if(paystackBox) paystackBox.style.display = pay.includes('Paystack')? 'block' : 'none';
  if(pay.includes('Hotel')){
    receiptData = { base64: "", name: "", mime: "" };
    const fileInput = document.getElementById('receipt');
    const fileNameEl = document.getElementById('fileName');
    if(fileInput) fileInput.value = "";
    if(fileNameEl) { fileNameEl.innerText = ""; fileNameEl.style.color = "#666"; }
    if(opayBox) opayBox.style.display = 'none';
  }
  if(pay.includes('Paystack')){
    if(confirmBtn) confirmBtn.style.display='none';
    if(paystackBtn) paystackBtn.style.display='block';
  } else {
    if(paystackBtn) paystackBtn.style.display='none';
    if(confirmBtn){
      confirmBtn.style.display='block';
      confirmBtn.innerText = pay.includes('OPay')? 'I Have Transferred - Confirm' : 'Confirm Booking - Pay at Hotel';
    }
  }
}
function payWithPaystack(){
  const email = document.getElementById('email')?.value || document.getElementById('phone')?.value+'@lumina.com';
  const amount = calculateAmount();
  if(typeof PaystackPop==='undefined'){ alert("Add Paystack script: https://js.paystack.co/v1/inline.js"); return; }
  PaystackPop.setup({
    key: 'pk_test_YOUR_PUBLIC_KEY_HERE',
    email: email, amount: amount, currency: 'NGN', ref: 'LMN-'+Date.now(),
    callback: (res)=>{ validateBooking(new Event('submit'), true, res.reference); }
  }).openIframe();
}
let receiptData = { base64: "", name: "", mime: "" };
function setupReceiptListener(){
  const receiptEl = document.getElementById('receipt');
  if(!receiptEl) return;
  receiptEl.addEventListener('change', function(e){
    const file = e.target.files[0];
    if(!file) return;
    if(file.size > 2*1024*1024){
      alert("File too big! Max 2MB. Your file: "+(file.size/1024/1024).toFixed(2)+"MB");
      e.target.value="";
      document.getElementById('fileName').innerText = "❌ Too big - pick smaller file (<2MB)";
      document.getElementById('fileName').style.color = "red";
      receiptData = { base64: "", name: "", mime: "" };
      return;
    }
    document.getElementById('fileName').innerText = "Loading " + file.name + "...";
    document.getElementById('fileName').style.color = "#666";
    const reader = new FileReader();
    reader.onload = function(ev){
      const base64 = ev.target.result.split(',')[1];
      receiptData = { base64: base64, name: file.name, mime: file.type };
      document.getElementById('fileName').innerText = "✅ " + file.name + " ready";
      document.getElementById('fileName').style.color = "green";
    };
    reader.readAsDataURL(file);
  });
}
async function validateBooking(e, isPaid=false, payRef=''){
  if(e) e.preventDefault();
  const name = document.getElementById('fullName').value.trim();
  const phone = cleanPhone(document.getElementById('phone').value);
    const checkin = document.getElementById('coCheckin')?.value || document.getElementById('dCheckin')?.value || localStorage.getItem('lumina_checkin') || "";
  const checkout = document.getElementById('coCheckout')?.value || document.getElementById('dCheckout')?.value || localStorage.getItem('lumina_checkout') || "";
  const payMethodVal = document.getElementById('payMethod').value;
  if(!name) return alert("Enter name");
  if(!phone) return alert("Enter phone");
  if(!checkin ||!checkout) return alert("Pick dates");
  if(payMethodVal === 'OPay Transfer' &&!isPaid &&!receiptData.base64){
    return alert("Please upload OPay receipt. Or select 'Pay at Hotel'");
  }
  const code = 'LMN-'+phone.slice(-5)+'-'+Date.now().toString().slice(-4);
  const isPayAtHotel = payMethodVal === 'Pay at Hotel';
  const payload = {
    action:"book", name, phone,
    email: document.getElementById('email').value,
    room: selectedRoom.name, price: selectedRoom.price,
    checkin, checkout,
rooms: guestsData.rooms || 1,
guests: document.getElementById('checkoutGuestRoomDisplay')?.innerText || getGuestsText(),
    payMethod: payMethodVal,
    status: isPaid?'Paid': isPayAtHotel?'Unpaid':'Awaiting Verification',
    nights: calcNights(), amount: calcNights()*selectedRoom.price*(guestsData.rooms||1),
    receipt: "",
    receiptBase64: isPayAtHotel? "" : receiptData.base64,
    receiptName: isPayAtHotel? "" : receiptData.name,
    receiptMime: isPayAtHotel? "" : receiptData.mime,
    paystackRef: payRef, bookingCode: code
  };
  const msgEl = document.getElementById('errorMsg');
  const confirmBtn = document.getElementById('confirmBtn');
  if(msgEl){
    msgEl.style.display='block';
    msgEl.style.background='#FFF3CD';
    msgEl.innerText = isPayAtHotel? 'Saving booking... please wait' : 'Saving & uploading receipt to Drive... please wait (max 8s)';
  }
  if(confirmBtn){ confirmBtn.disabled = true; confirmBtn.innerText = "Processing..."; }
  try{
    const fetchPromise = fetch(SCRIPT_URL,{method:"POST", mode:"no-cors", body:JSON.stringify(payload)});
    const timeoutPromise = new Promise(resolve => setTimeout(()=> resolve('timeout'), 8000));
    await Promise.race([fetchPromise, timeoutPromise]);
    document.getElementById('confCode').innerText = code;
    showPage('confirmation');
    setTimeout(()=>{
      receiptData = { base64: "", name: "", mime: "" };
      const form = document.getElementById('bookingForm');
      if(form) form.reset();
      ['fullName','phone','email'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=""; });
      const fileInput = document.getElementById('receipt');
      const fileNameEl = document.getElementById('fileName');
      if(fileInput) fileInput.value = "";
      if(fileNameEl){ fileNameEl.innerText = ""; fileNameEl.style.color = "#666"; }
      if(msgEl){ msgEl.style.display='none'; msgEl.innerText=''; }
    }, 500);
  }catch(err){
    document.getElementById('confCode').innerText = code;
    showPage('confirmation');
  } finally {
    if(confirmBtn) { confirmBtn.disabled = false; handlePayChange(); }
  }
}
// === MY BOOKINGS - MANAGE (Connected to Google Sheets) ===
let myBookingsCache = [];
let myBookingsFilter = 'all';
let myCurrentPhone = '';

function fmtDateShort(d){
  try{ return new Date(d).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'}); }catch(e){ return d; }
}
function nightsBetween(a,b){
  const ms = new Date(b) - new Date(a);
  return Math.max(1, Math.round(ms / 86400000));
}
function getBookingRefundInfo(b){
  const now = new Date();
  const checkin = new Date(b.checkin);
  const diffHours = (checkin - now) / 3600000;
  const amount = Number(b.amount || 0);
  if(diffHours >= 24) return { pct: 100, refund: amount, label: '100% refund — more than 24hrs before check-in' };
  if(diffHours > 0) return { pct: 50, refund: Math.round(amount * 0.5), label: '50% refund — less than 24hrs to check-in' };
  return { pct: 0, refund: 0, label: 'No refund — check-in don pass' };
}
function getBookingCountdown(b){
  const now = new Date(); const ci = new Date(b.checkin);
  const days = Math.ceil((ci - now) / 86400000);
  if(b.status === 'Cancelled') return '❌ Cancelled';
  if(b.status === 'Paused') return '⏸️ Paused — tap Resume to reactivate';
  if(days < 0) return '✅ Stay completed — Thank you!';
  if(days === 0) return '🔥 Check-in today!';
  if(days === 1) return '⏰ Check-in tomorrow';
  return `📅 Check-in in ${days} days`;
}
function filterMyBookings(type, btn){
  myBookingsFilter = type;
  document.querySelectorAll('.my-tab').forEach(b=>{ b.style.background='#fff'; b.style.color='#111'; });
  if(btn){ btn.style.background='#111'; btn.style.color='#D4AF37'; }
  renderMyBookings();
}
function findBooking(code){ return myBookingsCache.find(b => b.code === code); }

async function loadMyBookings(){
  const phone = cleanPhone(document.getElementById('myPhone').value);
  if(phone.length < 10) return alert("Enter full phone");
  myCurrentPhone = phone;
  document.getElementById('myList').innerHTML = `<div style="text-align:center;padding:20px;color:#888;">Loading your bookings...</div>`;
  
  // Fetch ALL, then filter here - your Apps Script no dey filter by ?phone=
  const res = await fetch(`${SCRIPT_URL}?t=${Date.now()}`, {cache:"no-store"});
  const all = await res.json();
  const hidden = JSON.parse(localStorage.getItem('lumina_hidden_'+phone) || '[]');
  
  myBookingsCache = (all || []).filter(b => cleanPhone(b.phone) === phone && !hidden.includes(b.code));
  
  const clearBtn = document.getElementById('myClearBtn');
  if(clearBtn) clearBtn.style.display = myBookingsCache.length ? 'block' : 'none';
  renderMyBookings();
}

function toISODate(d){
  if(!d) return '';
  const dt = new Date(d);
  if(isNaN(dt)) return '';
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
}

function clearMyBookings(){
  if(!myBookingsCache.length) return;
  if(!confirm("Clear all history for this number?")) return;
  const hiddenKey = 'lumina_hidden_' + myCurrentPhone;
  const old = JSON.parse(localStorage.getItem(hiddenKey) || '[]');
  const newCodes = myBookingsCache.map(b=>b.code);
  localStorage.setItem(hiddenKey, JSON.stringify([...new Set([...old, ...newCodes])]));
  myBookingsCache = [];
  renderMyBookings();
  document.getElementById('myClearBtn').style.display = 'none';
}

function renderMyBookings(){
  const el = document.getElementById('myList');
  if(!el) return;
  let list = [...myBookingsCache];
  if(myBookingsFilter === 'upcoming') list = list.filter(b => b.status !== 'Cancelled' && b.status !== 'Paused');
  if(myBookingsFilter === 'paused') list = list.filter(b => b.status === 'Paused');
  if(myBookingsFilter === 'cancelled') list = list.filter(b => b.status === 'Cancelled');

  if(!list.length){
    el.innerHTML = `<div style="text-align:center;padding:30px;color:#888;">No bookings found for this filter.<br><button onclick="showPage('rooms')" style="margin-top:10px;background:#111;color:#D4AF37;border:none;padding:10px 16px;border-radius:10px;font-weight:800;">Book a Room →</button></div>`;
    return;
  }

  el.innerHTML = list.map(b => {
    const code = b.code;
    const status = b.status || 'Unpaid';
    const refund = getBookingRefundInfo(b);
    const nights = nightsBetween(b.checkin, b.checkout);
    const statusColor = status === 'Paid' || status === 'Confirmed' ? '#166534' : status === 'Cancelled' ? '#991b1b' : status === 'Paused' ? '#92400e' : status === 'Awaiting Verification' ? '#92400e' : '#666';
    const statusBg = status === 'Paid' || status === 'Confirmed' ? '#dcfce7' : status === 'Cancelled' ? '#fee2e2' : status === 'Paused' ? '#fef3c7' : '#f3f3f3';
    const isActive = status !== 'Cancelled';

    return `<div style="background:#fff;border:1px solid #eee;border-radius:18px;padding:16px;box-shadow:0 4px 20px rgba(0,0,0,.05);">
      <div style="display:flex;justify-content:space-between;align-items:start;gap:10px;">
        <div><b style="background:#111;color:#D4AF37;padding:5px 10px;border-radius:8px;font-size:12px;">${code}</b><div style="font-size:12px;color:#666;margin-top:8px;">${getBookingCountdown(b)}</div></div>
        <span style="background:${statusBg};color:${statusColor};padding:6px 10px;border-radius:20px;font-size:11px;font-weight:900;">${status}</span>
      </div>
      <h3 style="font-family:'Playfair Display',serif;font-size:19px;margin:12px 0 4px 0;">${b.room}</h3>
<p style="margin:0;color:#666;font-size:13px;">${b.payMethod || ''} • ${b.name || ''}</p>
<p style="margin:4px 0 0 0;color:#666;font-size:12px;">👥 ${b.guests || (b.rooms ? b.rooms + ' room' + (b.rooms>1?'s':'') : '1 room')} • ${b.rooms || ''}</p>
      <p style="margin:6px 0;color:#333;font-size:13px;font-weight:700;">${fmtDateShort(b.checkin)} → ${fmtDateShort(b.checkout)} • ${nights} night${nights>1?'s':''} • $${b.amount}</p>
      ${b.status === 'Paused' ? `<p style="background:#fef3c7;padding:8px;border-radius:8px;font-size:12px;">⏸️ This booking is paused. Your room is free for others. Resume anytime if still available.</p>` : ''}
      ${b.status === 'Cancelled' ? `<p style="background:#fee2e2;padding:8px;border-radius:8px;font-size:12px;">Refund: <b>$${refund.refund}</b> (${refund.pct}%) — ${refund.label}. We go contact you on WhatsApp for refund.</p>` : ''}

      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">
        ${isActive && (status === 'Unpaid' || status === 'Awaiting Verification') ? `<button onclick="payForBooking('${code}')" style="flex:1;background:#111;color:#D4AF37;border:none;padding:11px;border-radius:10px;font-weight:900;cursor:pointer;">💳 Pay Now</button>` : ''}
        ${isActive ? `<button onclick="openReschedule('${code}')" style="flex:1;background:#FFFEFB;border:1px solid #C8B896;padding:11px;border-radius:10px;font-weight:800;cursor:pointer;">📅 Change Dates</button>` : ''}
        ${isActive && status !== 'Paused' ? `<button onclick="orderFoodForBooking('${code}')" style="flex:1;background:#f8f5ef;border:1px solid #eee;padding:10px;border-radius:10px;font-weight:700;font-size:12px;">🍽️ Order Food</button>` : ''}
${isActive && status !== 'Paused' ? `<button onclick="bookPoolPass()" style="flex:1;background:#f8f5ef;border:1px solid #eee;padding:10px;border-radius:10px;font-weight:700;font-size:12px;">🏊 Pool Pass</button>` : ''}
        ${isActive && status !== 'Paused' ? `<button onclick="openPauseBooking('${code}')" style="flex:1;background:#fff;border:1px solid #ddd;padding:11px;border-radius:10px;font-weight:800;cursor:pointer;">⏸️ Pause</button>` : ''}
        ${status === 'Paused' ? `<button onclick="updateBookingStatus('${code}','Unpaid')" style="flex:1;background:#16a34a;color:#fff;border:none;padding:11px;border-radius:10px;font-weight:900;cursor:pointer;">▶ Resume</button>` : ''}
        ${isActive ? `<button onclick="openCancelBooking('${code}')" style="flex:1;background:#fff;border:1px solid #fca5a5;color:#991b1b;padding:11px;border-radius:10px;font-weight:800;cursor:pointer;">Cancel</button>` : ''}
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
        <button onclick="openExtendBooking('${code}')" style="flex:1;background:#f8f5ef;border:1px solid #eee;padding:10px;border-radius:10px;font-weight:700;font-size:12px;cursor:pointer;">➕ Extend 1 Night</button>
        <button onclick="specialRequest('${code}')" style="flex:1;background:#f8f5ef;border:1px solid #eee;padding:10px;border-radius:10px;font-weight:700;font-size:12px;cursor:pointer;">✨ Special Request</button>
        <button onclick="shareBooking('${code}')" style="flex:1;background:#f8f5ef;border:1px solid #eee;padding:10px;border-radius:10px;font-weight:700;font-size:12px;cursor:pointer;">📤 Share / Receipt</button>
      </div>
    </div>`;
  }).join('');
}

// === ACTIONS - All go to Google Sheets via SCRIPT_URL ===
async function callBookingAction(action, code, extra={}){
  try{
    const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({ action, code, phone: myCurrentPhone, ...extra })
    });
    const data = await res.json().catch(()=>({}));
    return data;
  }catch(e){
    console.log('Action failed, using local update', e);
    return { ok: false };
  }
}
function refreshAfterAction(code, patch){
  const b = findBooking(code);
  if(b) Object.assign(b, patch);
  renderMyBookings();
  // NO auto reload here - if your Apps Script never save am, reload go bring back old date
  // Only reload if your Apps Script don handle reschedule/cancel/pause/pay
}

function openManageModal(title, html){
  document.getElementById('manageTitle').innerText = title;
  document.getElementById('manageBody').innerHTML = html;
  document.getElementById('manageModal').style.display='flex';
}
function closeManageModal(){ document.getElementById('manageModal').style.display='none'; }

function openCancelBooking(code){
  const b = findBooking(code); if(!b) return;
  const refund = getBookingRefundInfo(b);
  openManageModal('Cancel Booking', `
    <p style="font-size:13px;color:#666;">Cancel <b>${b.room}</b> for ${fmtDateShort(b.checkin)}?</p>
    <div style="background:#FFF8E6;border:1px solid #E8DCC0;padding:12px;border-radius:10px;font-size:13px;"><b>Refund: $${refund.refund} (${refund.pct}%)</b><br>${refund.label}<br>Total: $${b.amount}</div>
    <label style="display:block;margin-top:12px;font-size:12px;font-weight:800;">Why are you cancelling?</label>
    <select id="cancelReason" style="width:100%;padding:10px;border-radius:10px;border:1px solid #ddd;margin-top:6px;"><option>Change of plans</option><option>Date no longer works</option><option>Emergency</option><option>Other</option></select>
    <button onclick="confirmCancelBooking('${code}')" style="width:100%;background:#dc2626;color:#fff;border:none;padding:13px;border-radius:10px;font-weight:900;margin-top:14px;cursor:pointer;">Yes, Cancel & Refund $${refund.refund}</button>
    <button onclick="closeManageModal()" style="width:100%;background:#f3f3f3;border:none;padding:11px;border-radius:10px;font-weight:800;margin-top:8px;cursor:pointer;">Keep My Booking</button>
  `);
}
async function confirmCancelBooking(code){
  const b = findBooking(code); if(!b) return;
  const reason = document.getElementById('cancelReason')?.value || '';
  const refund = getBookingRefundInfo(b);
  closeManageModal();
  await callBookingAction('cancel', code, { reason, refundAmount: refund.refund, refundPct: refund.pct });
  refreshAfterAction(code, { status: 'Cancelled', cancelReason: reason });
  alert('Booking cancelled. Refund of $' + refund.refund + ' will be processed. We go WhatsApp you.');
}
function openReschedule(code){
  const b = findBooking(code); if(!b) return;
  openManageModal('Change Dates', `
    <p style="font-size:13px;color:#666;">${b.room} • Current: ${fmtDateShort(b.checkin)} → ${fmtDateShort(b.checkout)}</p>
    <label style="font-weight:800;font-size:12px;">NEW CHECK-IN</label><input type="date" id="newCheckin" value="${toISODate(b.checkin)}" style="width:100%;padding:12px;border-radius:10px;border:1px solid #ddd;margin:6px 0 10px 0;">
    <label style="font-weight:800;font-size:12px;">NEW CHECK-OUT</label><input type="date" id="newCheckout" value="${toISODate(b.checkout)}" style="width:100%;padding:12px;border-radius:10px;border:1px solid #ddd;margin:6px 0 10px 0;">
    <div id="reschedulePreview" style="font-size:12px;color:#666;background:#f8f5ef;padding:10px;border-radius:10px;">Pick new dates to see price difference.</div>
    <button onclick="confirmReschedule('${code}')" style="width:100%;background:#111;color:#D4AF37;border:none;padding:13px;border-radius:10px;font-weight:900;margin-top:12px;cursor:pointer;">Confirm New Dates</button>
  `);
  const upd = ()=>{
    const ni = document.getElementById('newCheckin').value; const no = document.getElementById('newCheckout').value;
    if(ni && no){
      const n = nightsBetween(ni,no); const oldN = nightsBetween(b.checkin, b.checkout);
      const perNight = Math.round((b.amount||0)/Math.max(1,oldN));
      const newTotal = perNight * n; const diff = newTotal - (b.amount||0);
      document.getElementById('reschedulePreview').innerHTML = `${n} nights • New total $${newTotal} • ${diff>0 ? `You go pay extra $${diff}` : diff<0 ? `You go get refund $${Math.abs(diff)}` : 'No price change'}`;
    }
  };
  document.getElementById('newCheckin').onchange = upd; document.getElementById('newCheckout').onchange = upd; upd();
}
async function confirmReschedule(code){
  const b = findBooking(code); if(!b) return;
  const ni = document.getElementById('newCheckin').value; const no = document.getElementById('newCheckout').value;
  if(!ni || !no || new Date(no) <= new Date(ni)){ alert('Pick valid dates — check-out must be after check-in'); return; }
  const oldN = nightsBetween(b.checkin, b.checkout);
  const perNight = Math.round((b.amount||0)/Math.max(1,oldN));
  const n = nightsBetween(ni,no); const newTotal = perNight * n;
  closeManageModal();
  await callBookingAction('reschedule', code, { newCheckin: ni, newCheckout: no, newAmount: newTotal });
  refreshAfterAction(code, { checkin: ni, checkout: no, amount: newTotal });
  alert('Dates changed! New total $' + newTotal);
}
function openPauseBooking(code){
  const b = findBooking(code); if(!b) return;
  openManageModal('Pause Booking', `
    <p style="font-size:13px;color:#666;">Pause go free your room for another guest. You fit resume anytime if room still free.</p>
    <p style="font-size:13px;"><b>${b.room}</b> • ${fmtDateShort(b.checkin)} → ${fmtDateShort(b.checkout)}</p>
    <button onclick="confirmPauseBooking('${code}')" style="width:100%;background:#92400e;color:#fff;border:none;padding:13px;border-radius:10px;font-weight:900;cursor:pointer;">Yes, Pause Booking</button>
    <button onclick="closeManageModal()" style="width:100%;background:#f3f3f3;border:none;padding:11px;border-radius:10px;font-weight:800;margin-top:8px;">Keep Active</button>
  `);
}
async function confirmPauseBooking(code){
  closeManageModal();
  await callBookingAction('pause', code, {});
  refreshAfterAction(code, { status: 'Paused' });
}
async function updateBookingStatus(code, newStatus){
  await callBookingAction('updateStatus', code, { status: newStatus });
  refreshAfterAction(code, { status: newStatus });
}
function openExtendBooking(code){
  const b = findBooking(code); if(!b) return;
  openManageModal('Extend Stay — Pay for Extra Nights', `
    <p style="font-size:13px;color:#666;">${b.room} • Now: ${fmtDateShort(b.checkin)} → ${fmtDateShort(b.checkout)} • Total $${b.amount}</p>
    <label style="font-weight:800;font-size:12px;">HOW MANY MORE NIGHTS?</label>
    <input type="number" id="extendNights" value="1" min="1" max="30" style="width:100%;padding:12px;border-radius:10px;border:1px solid #ddd;margin:6px 0;">
    <div id="extendPreview" style="font-size:12px;color:#666;background:#f8f5ef;padding:10px;border-radius:10px;"></div>
    <label style="font-weight:800;font-size:12px;display:block;margin-top:12px;">HOW YOU GO PAY FOR EXTENSION?</label>
    <select id="extendPayMethod" style="width:100%;padding:12px;border-radius:10px;border:1px solid #ddd;margin-top:6px;">
      <option value="Paystack">Paystack — Auto Verified</option>
      <option value="OPay Transfer">OPay Transfer — Upload Receipt</option>
      <option value="Pay at Reception">Pay at Reception / Cashier</option>
    </select>
    <div id="extendReceiptBox" style="display:none;margin-top:10px;">
      <label style="font-size:12px;font-weight:800;">Upload OPay Receipt for Extension</label>
      <input type="file" id="extendReceiptInput" accept="image/*,.pdf" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:10px;margin-top:6px;">
      <div id="extendReceiptName" style="font-size:12px;color:#666;margin-top:6px;"></div>
    </div>
    <button onclick="confirmExtendBooking('${code}')" style="width:100%;background:#111;color:#D4AF37;border:none;padding:13px;border-radius:10px;font-weight:900;margin-top:12px;cursor:pointer;">Pay for Extension →</button>
  `);
  const upd = () => {
    const n = Number(document.getElementById('extendNights').value || 1);
    const oldN = nightsBetween(b.checkin, b.checkout);
    const perNight = Math.round((b.amount||0) / Math.max(1, oldN));
    const newCheckout = new Date(b.checkout);
    newCheckout.setDate(newCheckout.getDate() + n);
    const newTotal = (b.amount||0) + (perNight * n);
    document.getElementById('extendPreview').innerHTML = `New check-out: <b>${fmtDateShort(newCheckout)}</b> • +${n} night${n>1?'s':''} • Extra $${perNight*n} • New total $${newTotal}`;
  };
  document.getElementById('extendNights').oninput = upd; upd();
  document.getElementById('extendPayMethod').onchange = (e)=>{
    document.getElementById('extendReceiptBox').style.display = e.target.value === 'OPay Transfer' ? 'block' : 'none';
  };
  document.getElementById('extendReceiptInput').onchange = (e)=>{
    const f = e.target.files[0];
    if(f) document.getElementById('extendReceiptName').innerText = '✅ ' + f.name;
  };
}

async function confirmExtendBooking(code){
  const b = findBooking(code); if(!b) return;
  const extra = Number(document.getElementById('extendNights')?.value || 1);
  if(extra < 1) return alert('Enter at least 1 night');
  const payMethod = document.getElementById('extendPayMethod')?.value || 'Paystack';

  const oldN = nightsBetween(b.checkin, b.checkout);
  const perNight = Math.round((b.amount||0) / Math.max(1, oldN));
  const extraAmount = perNight * extra;
  const newCheckoutDate = new Date(b.checkout);
  newCheckoutDate.setDate(newCheckoutDate.getDate() + extra);
  const iso = toISODate(newCheckoutDate);
  const newTotal = (b.amount||0) + extraAmount;

  // === 1. PAYSTACK — Pay now, extend NOW ===
  if(payMethod === 'Paystack'){
    closeManageModal();
    PaystackPop.setup({
      key: 'pk_test_YOUR_PUBLIC_KEY_HERE',
      email: (b.email || b.phone + '@lumina.com'),
      amount: extraAmount * 100,
      currency: 'NGN',
      ref: code + '-EXT-' + Date.now(),
      callback: async (res) => {
        await callBookingAction('extend_paystack', code, { newCheckout: iso, newAmount: newTotal, extraNights: extra, extraAmount, paystackRef: res.reference });
        refreshAfterAction(code, { checkout: iso, amount: newTotal, status: 'Paid' });
        alert(`Extension paid! ✅ New check-out ${fmtDateShort(iso)} • New total $${newTotal}`);
      }
    }).openIframe();
    return;
  }

  // === 2. OPAY — Upload receipt, DON'T extend yet, wait for Admin ===
  if(payMethod === 'OPay Transfer'){
    const file = document.getElementById('extendReceiptInput')?.files[0];
    if(!file) return alert('Upload OPay receipt for extension first');
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result.split(',')[1];
      closeManageModal();
      await callBookingAction('extend_opay', code, { newCheckout: iso, newAmount: newTotal, extraNights: extra, extraAmount, receiptBase64: base64, receiptName: file.name, receiptMime: file.type });
      refreshAfterAction(code, { status: 'Awaiting Verification', payMethod: 'OPay Transfer' });
      alert(`Receipt submitted! ⏳\nExtension of +${extra} night(s) — $${extraAmount} dey wait for verification.\nYour checkout go change to ${fmtDateShort(iso)} once cashier confirm am.`);
    };
    reader.readAsDataURL(file);
    return;
  }

  // === 3. PAY AT RECEPTION — Don't extend yet, wait for Cashier ===
  if(payMethod === 'Pay at Reception'){
    closeManageModal();
    await callBookingAction('extend_cash', code, { newCheckout: iso, newAmount: newTotal, extraNights: extra, extraAmount });
    refreshAfterAction(code, { status: 'Awaiting Verification', payMethod: 'Pay at Reception' });
    alert(`Extension requested! ⏳\nGo pay $${extraAmount} for +${extra} night(s) for reception.\nCashier go confirm am, then your checkout go change to ${fmtDateShort(iso)}.`);
    return;
  }
}
function payForBooking(code){
  const b = findBooking(code); if(!b) return;
  const alreadyPaid = 0; // For now, we use status: if Paid, no show. If Unpaid, full amount.
  openManageModal('Pay for Booking — Partial Allowed', `
    <p style="font-size:13px;">${b.room} • ${fmtDateShort(b.checkin)} → ${fmtDateShort(b.checkout)}</p>
    <div style="background:#FFF8E6;padding:12px;border-radius:10px;font-weight:900;">Total to Pay: $${b.amount}<br><span style="font-size:12px;font-weight:400;">You fit pay part now (e.g. deposit) and pay balance for Check-In. Code: ${code}</span></div>
    <label style="font-size:12px;font-weight:800;display:block;margin-top:12px;">How much you wan pay now?</label>
    <input id="partialPayAmt" type="number" value="${b.amount}" style="width:100%;padding:12px;border-radius:10px;border:1px solid #ddd;margin:6px 0;">
    <button onclick="document.getElementById('partialPayAmt').value='${Math.round(b.amount/2)}'" style="background:#f3f3f3;border:none;padding:8px 12px;border-radius:8px;font-size:12px;font-weight:800;">Pay 50% Deposit ($${Math.round(b.amount/2)})</button>
    <button onclick="openPaystackForExisting('${code}', Number(document.getElementById('partialPayAmt').value||${b.amount}))" style="width:100%;background:#111;color:#D4AF37;border:none;padding:13px;border-radius:10px;font-weight:900;margin-top:12px;">Pay with Paystack — Auto Verified</button>
    <button onclick="openOPayForExisting('${code}', Number(document.getElementById('partialPayAmt').value||${b.amount}))" style="width:100%;background:#16a34a;color:#fff;border:none;padding:13px;border-radius:10px;font-weight:900;margin-top:8px;">OPay — Upload Receipt for This Amount</button>
    <button onclick="closeManageModal()" style="width:100%;background:#f3f3f3;border:none;padding:11px;border-radius:10px;font-weight:800;margin-top:8px;">Cancel</button>
  `);
}

// PAYSTACK - auto Paid, because Paystack don verify
function openPaystackForExisting(code){
  const b = findBooking(code); if(!b) return;
  // Use your normal PaystackPop here
  PaystackPop.setup({
    key: 'pk_test_YOUR_PUBLIC_KEY_HERE',
    email: (b.email || b.phone + '@lumina.com'),
    amount: Number(b.amount) * 100, // Paystack uses kobo if NGN, adjust if you use USD
    currency: 'NGN',
    ref: code + '-' + Date.now(),
    callback: async (res) => {
      closeManageModal();
      await callBookingAction('pay_paystack', code, { paystackRef: res.reference });
      refreshAfterAction(code, { status: 'Paid', payMethod: 'Paystack' });
      alert('Payment verified by Paystack! Status: Paid ✅');
    }
  }).openIframe();
}

// OPAY - NEVER Paid straight, go to Awaiting Verification + receipt
function openOPayForExisting(code){
  const b = findBooking(code); if(!b) return;
  openManageModal('OPay Payment — Upload Receipt', `
    <p style="font-size:13px;color:#666;">Transfer <b>$${b.amount}</b> to our OPay account, then upload receipt here.</p>
    <div style="background:#f8f5ef;padding:10px;border-radius:10px;font-size:12px;">OPay Account: <b>Your OPay Number / Name here</b><br>Use code <b>${code}</b> as narration</div>
    <label style="display:block;margin-top:12px;font-size:12px;font-weight:800;">Upload OPay Receipt</label>
    <input type="file" id="opayReceiptInput" accept="image/*,.pdf" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:10px;margin-top:6px;">
    <div id="opayReceiptName" style="font-size:12px;color:#666;margin-top:6px;"></div>
    <button onclick="confirmOPayExisting('${code}')" style="width:100%;background:#16a34a;color:#fff;border:none;padding:13px;border-radius:10px;font-weight:900;margin-top:12px;cursor:pointer;">Submit Receipt for Verification</button>
  `);
  document.getElementById('opayReceiptInput').onchange = (e) => {
    const f = e.target.files[0];
    if(f) document.getElementById('opayReceiptName').innerText = '✅ ' + f.name + ' ready';
  };
}

async function confirmOPayExisting(code){
  const b = findBooking(code); if(!b) return;
  const fileInput = document.getElementById('opayReceiptInput');
  const file = fileInput?.files[0];
  if(!file) return alert('Please upload your OPay receipt first');
  if(file.size > 2*1024*1024) return alert('File too big, max 2MB');

  const reader = new FileReader();
  reader.onload = async (ev) => {
    const base64 = ev.target.result.split(',')[1];
    closeManageModal();
    // Send to Sheets: status = Awaiting Verification, NOT Paid
    await callBookingAction('pay_opay', code, {
      receiptBase64: base64,
      receiptName: file.name,
      receiptMime: file.type,
      status: 'Awaiting Verification'
    });
    refreshAfterAction(code, { status: 'Awaiting Verification', payMethod: 'OPay Transfer' });
    alert('Receipt submitted! Status: Awaiting Verification ⏳\nWe go verify your payment and mark am Paid once money enter. No need to call us.');
  };
  reader.readAsDataURL(file);
}
function specialRequest(code){
  const b = findBooking(code); if(!b) return;
  const msg = encodeURIComponent(`Hello Lumina! Special request for booking ${code} (${b.room}, ${fmtDateShort(b.checkin)}): `);
  window.open('https://wa.me/2349134435650?text=' + msg, '_blank');
}
function shareBooking(code){
  const b = findBooking(code); if(!b) return;
  const text = `Lumina Booking ${code}\n${b.room}\n${fmtDateShort(b.checkin)} → ${fmtDateShort(b.checkout)}\nTotal: $${b.amount}\nStatus: ${b.status}`;
  if(navigator.share){ navigator.share({title:'My Lumina Booking', text}); } else { navigator.clipboard.writeText(text); alert('Booking details copied!'); }
}
function updateCount(type, change){
  if(type==='adults'){ guestsData.adults = Math.max(1, guestsData.adults + change); }
  if(type==='children'){ guestsData.children = Math.max(0, guestsData.children + change); }
  if(type==='rooms'){ guestsData.rooms = Math.max(1, Math.min(8, guestsData.rooms + change)); }

  const elA = document.getElementById('adultsCount');
  const elC = document.getElementById('childrenCount');
  const elR = document.getElementById('roomsCount');
  if(elA) elA.innerText = guestsData.adults;
  if(elC) elC.innerText = guestsData.children;
  if(elR) elR.innerText = guestsData.rooms;

  const txt = getGuestsText();
  // Update EVERY display - Room Details, Checkout, Check Availability
  document.querySelectorAll('#guestRoomDisplay, #dGuestRoomDisplay, #caGuestRoomDisplay, #checkoutGuestRoomDisplay').forEach(el=> el.innerText = txt);

  // SAVE - so if you go to Checkout, e go remember
  localStorage.setItem('lumina_guests', JSON.stringify(guestsData));

  // THIS NA THE FIX - Recalculate price immediately
  updatePriceDisplay();
  updateCheckoutPriceDisplay(); // for checkout page too
}

function closeGuestModal(){
  const modal = document.getElementById('guestModal');
  if(modal) modal.classList.remove('open');
  // When you press Done, recalculate again to be safe
  updatePriceDisplay();
  updateCheckoutPriceDisplay();
}
function openGuestModal(){
  const modal = document.getElementById('guestModal');
  if(modal) modal.classList.add('open');
  document.getElementById('adultsCount').innerText = guestsData.adults;
  document.getElementById('childrenCount').innerText = guestsData.children;
  document.getElementById('roomsCount').innerText = guestsData.rooms;
  const txt = getGuestsText();
  document.querySelectorAll('#guestRoomDisplay, #dGuestRoomDisplay').forEach(el=> el.innerText = txt);
}
document.addEventListener('DOMContentLoaded',()=>{
  setupReceiptListener();
  document.addEventListener('change', (e)=>{
    if(e.target.type === 'date'){
      const homeDiv = document.getElementById('roomsDetails');
      if(homeDiv && homeDiv.contains(e.target)){
        const all = [...homeDiv.querySelectorAll('input[type="date"]')];
        if(all[0] && all[0].value) localStorage.setItem('lumina_checkin', all[0].value);
        if(all[1] && all[1].value) localStorage.setItem('lumina_checkout', all[1].value);
      }
    }
  });
  localStorage.removeItem('lumina_checkin');
  localStorage.removeItem('lumina_checkout');
  const homeDivMain = document.getElementById('roomsDetails');
  if(homeDivMain){
    const homeDates = homeDivMain.querySelectorAll('input[type="date"]');
    homeDates.forEach(inp=> inp.value = "");
  }
  const dCiMain = document.getElementById('dCheckin');
  const dCoMain = document.getElementById('dCheckout');
  if(dCiMain) dCiMain.value = "";
  if(dCoMain) dCoMain.value = "";
  document.querySelectorAll('.amen,.bed').forEach(ch=> ch.addEventListener('change', filterRooms));
  const pr = document.getElementById('priceRange');
  if(pr) pr.addEventListener('input', (e)=>{ const pv=document.getElementById('priceVal'); if(pv) pv.innerText=e.target.value; filterRooms(); });
  const payMethod = document.getElementById('payMethod');
  if(payMethod) payMethod.addEventListener('change', handlePayChange);
  const dCiEl = document.getElementById('dCheckin');
  const dCoEl = document.getElementById('dCheckout');
  dCiEl?.addEventListener('change', ()=>{
    if(dCiEl.value) localStorage.setItem('lumina_checkin', dCiEl.value);
    updatePriceDisplay();
  });
  dCoEl?.addEventListener('change', ()=>{
    if(dCoEl.value) localStorage.setItem('lumina_checkout', dCoEl.value);
    updatePriceDisplay();
  });
  document.querySelectorAll('#guestRoomDisplay, #dGuestRoomDisplay').forEach(el=>{
    el.addEventListener('click', openGuestModal);
    el.style.cursor='pointer';
  });
  renderFeatured();
  handlePayChange();
  showPage('home');
  loadAvailabilityCache();
});

window.addEventListener('click', (e)=>{
  const modal = document.getElementById('guestModal');
  if(e.target === modal) closeGuestModal();
});

async function checkAvailabilityForRoom(roomName){
  try{
    const checkin = localStorage.getItem('lumina_checkin') || "";
    const checkout = localStorage.getItem('lumina_checkout') || "";
    let url = `${ROOMS_URL}?rooms=true&t=${Date.now()}`;
    if(checkin && checkout) url += `&checkin=${encodeURIComponent(checkin)}&checkout=${encodeURIComponent(checkout)}`;
    const res = await fetch(url);
    const rooms = await res.json();
    const found = rooms.find(r => r.roomType.toLowerCase() === roomName.toLowerCase());
    const el = document.getElementById('dAvailability');
    if(!el) return {available: 99};
    if(!found){ el.innerText = "✅ Available"; el.style.background="#dcfce7"; el.style.color="#166534"; return {available:99}; }
    if(found.available <= 0){
      el.innerText = "⛔ 0 rooms available - Fully booked";
      el.style.background="#fee2e2"; el.style.color="#991b1b";
      const btn = document.querySelector('.reserve');
      if(btn){ btn.disabled=true; btn.innerText="Fully Booked"; btn.style.opacity="0.4"; }
      return {available:0};
    }else if(found.available <=2){
      el.innerText = `⚠️ Only ${found.available} rooms left!`;
      el.style.background="#fef3c7"; el.style.color="#92400e";
      return {available:found.available};
    }else{
      el.innerText = `✅ ${found.available} rooms available`;
      el.style.background="#dcfce7"; el.style.color="#166534";
      return {available:found.available};
    }
  }catch(e){ return {available:99}; }
}




document.addEventListener('DOMContentLoaded', ()=>{ renderRooms(roomsData); })


async function loadLiveAvailability(){
  try{
    const res = await fetch(`${ROOMS_URL}?rooms=true&t=${Date.now()}`);
    const txt = await res.text();
    window.liveRoomsDataFromSheet = JSON.parse(txt);
    console.log("Live rooms:", window.liveRoomsDataFromSheet);
    renderRooms(roomsData); // re-render with real numbers
  }catch(e){ console.log(e); }
}
loadLiveAvailability();


function sendWhatsAppMsg(){
  const name = document.getElementById('cName').value || 'Guest';
  const phone = document.getElementById('cPhone').value || '';
  const msg = document.getElementById('cMsg').value || 'Hello, I want to make enquiry';
  const text = `Hello Lumina Hotel, I am ${name}. Phone: ${phone}. Message: ${msg}`;
  window.open(`https://wa.me/2349134435650?text=${encodeURIComponent(text)}`, '_blank');
}


// ===== CHECK AVAILABILITY FLOW =====
function openCheckAvailabilityPage(){
  // If person don already pick dates before, show am again
  const savedIn = localStorage.getItem('lumina_checkin');
  const savedOut = localStorage.getItem('lumina_checkout');
  const caIn = document.getElementById('caCheckin');
  const caOut = document.getElementById('caCheckout');
  if(caIn && savedIn) caIn.value = savedIn;
  if(caOut && savedOut) caOut.value = savedOut;
  // Show guests text
  const caDisp = document.getElementById('caGuestRoomDisplay');
  if(caDisp) caDisp.innerText = getGuestsText();
  showPage('checkAvailability');
}

// Override showPage to auto-fill this page when you open am
// If you already have showPage, add this inside it - we do it via listener instead:
// We hook into showPage by wrapping it
const _origShowPage = showPage;
showPage = function(id){
  _origShowPage(id);
  if(id === 'checkAvailability'){
    openCheckAvailabilityPage();
  }
};

function doCheckAvailability(){
  const checkin = document.getElementById('caCheckin')?.value || "";
  const checkout = document.getElementById('caCheckout')?.value || "";

  if(!checkin || !checkout){
    alert("Please pick Check-in and Check-out first");
    return;
  }
  if(new Date(checkout) <= new Date(checkin)){
    alert("Check-out must be after Check-in");
    return;
  }

  // 1. Save everywhere - so Room Details go see am later
  localStorage.setItem('lumina_checkin', checkin);
  localStorage.setItem('lumina_checkout', checkout);
  localStorage.setItem('lumina_guests', JSON.stringify(guestsData));
  lastSearchCheckin = checkin;
  lastSearchCheckout = checkout;

  // 2. Also copy to the hidden room-detail inputs (so if person jumps straight to details, e don fill)
  const dCi = document.getElementById('dCheckin');
  const dCo = document.getElementById('dCheckout');
  if(dCi) dCi.value = checkin;
  if(dCo) dCo.value = checkout;

  // 3. Go to Rooms page and run search - this go filter to only available rooms
  searchRooms();
}

function searchRooms(){
  // Use Check Availability inputs first, if they exist, else use room-detail inputs
  let checkin = document.getElementById('caCheckin')?.value || document.getElementById('dCheckin')?.value || localStorage.getItem('lumina_checkin') || "";
  let checkout = document.getElementById('caCheckout')?.value || document.getElementById('dCheckout')?.value || localStorage.getItem('lumina_checkout') || "";

  if(!checkin || !checkout){
    alert("Please pick Check-in and Check-out first");
    return;
  }

  localStorage.setItem('lumina_checkin', checkin);
  localStorage.setItem('lumina_checkout', checkout);
  lastSearchCheckin = checkin;
  lastSearchCheckout = checkout;

  showPage('rooms');

  // SHOW IMMEDIATELY - then update with real availability
  lastRoomsList = roomsData.map(r=> ({...r, availableForSearch: 1}));
  renderRooms(lastRoomsList);

  const rc = document.getElementById('resultsCount');
  if(rc) rc.innerText = `Checking availability for ${checkin} → ${checkout}...`;

  // Fetch real availability from backend (date-aware logic we fixed)
  fetch(`${ROOMS_URL}?rooms=true&checkin=${encodeURIComponent(checkin)}&checkout=${encodeURIComponent(checkout)}&t=${Date.now()}`, {redirect:"follow", cache:"no-store"})
    .then(res => res.json())
    .then(roomsAvail => {
      const availMap = {};
      roomsAvail.forEach(r=> availMap[r.roomType.toLowerCase().trim()] = r.available);
      lastSearchAvailMap = availMap;

      let filtered = roomsData.map(r=> {
        const key = r.name.toLowerCase().trim();
        const avail = availMap[key] ?? 0;
        return {...r, availableForSearch: avail};
      }).filter(r=> r.availableForSearch > 0); // Hide FULL rooms

      lastRoomsList = filtered;
      renderRooms(filtered);
      if(rc) rc.innerText = `${filtered.length} rooms available for ${checkin} → ${checkout}`;
    })
    .catch(e=>{
      console.log("Fetch failed", e);
      if(rc) rc.innerText = `Showing rooms for ${checkin} → ${checkout}`;
    });
}

function updateHomeSearchBar(){
  const inL = document.getElementById('homeCheckinLabel');
  const outL = document.getElementById('homeCheckoutLabel');
  const gL = document.getElementById('homeGuestsLabel');
  const ci = localStorage.getItem('lumina_checkin');
  const co = localStorage.getItem('lumina_checkout');
  if(inL) inL.innerText = ci ? new Date(ci).toLocaleDateString('en-GB',{day:'numeric',month:'short'}) : 'Add date';
  if(outL) outL.innerText = co ? new Date(co).toLocaleDateString('en-GB',{day:'numeric',month:'short'}) : 'Add date';
  if(gL) gL.innerText = getGuestsText();
}
// Call it after renderFeatured + after updateCount
// Add this line inside your DOMContentLoaded after renderFeatured():
// updateHomeSearchBar();


function orderFoodForBooking(code){
  const b = findBooking(code); if(!b) return;
  const msg = encodeURIComponent(`Hello Lumina! I want to order food to my room — Booking ${code} (${b.room}): `);
  window.open('https://wa.me/2349134435650?text=' + msg, '_blank');
  // For Phase 3 v2, we go replace this WhatsApp with real menu + add to bill — for now, waiter go add am for Admin POS when guest order via WhatsApp.
}
function bookPoolPass(){
  const msg = encodeURIComponent(`Hello Lumina! I want to book a Pool Day Pass. What is price for today?`);
  window.open('https://wa.me/2349134435650?text=' + msg, '_blank');
}
