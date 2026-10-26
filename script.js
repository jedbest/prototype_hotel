const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwOpjUjfg0j0cO1mYlMNs2lU89gSl2kAfl4_Ujry9rqmxcdcydQLF_mqyKa0_hnSZ1xtQ/exec";
const ROOMS_URL = "https://script.google.com/macros/s/AKfycbwOpjUjfg0j0cO1mYlMNs2lU89gSl2kAfl4_Ujry9rqmxcdcydQLF_mqyKa0_hnSZ1xtQ/exec";
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

function getAvailabilityBadge(roomName, availableForDates){
    const key = roomName.toLowerCase().trim();
let realAvailable = availableForDates;

// 1. Try to find live data from sheet if you already fetched it
if(window.liveRoomsDataFromSheet){
  const found = window.liveRoomsDataFromSheet.find(r => {
    const t = (r.roomType || r.name || "").toLowerCase();
    return key.includes(t) || t.includes(key);
  });
  if(found && found.available !== undefined) realAvailable = found.available;
}
  if(realAvailable === -1){
    return `<div style="font-size:11px;font-weight:800;margin-bottom:5px;color:#888;">Checking availability...</div>`;
  }
  if(realAvailable!== undefined){
    if(realAvailable <= 0){
      return `<div style="font-size:11px;font-weight:800;margin-bottom:5px;padding:4px 8px;border-radius:20px;display:inline-block;background:#fee2e2;color:#991b1b;">⛔ Fully booked - 0 left</div>`;
    } else if(realAvailable <= 2){
      return `<div style="font-size:11px;font-weight:800;margin-bottom:5px;padding:4px 8px;border-radius:20px;display:inline-block;background:#fef3c7;color:#92400e;">⚠️ Only ${realAvailable} left!</div>`;
    } else {
      return `<div style="font-size:11px;font-weight:800;margin-bottom:5px;padding:4px 8px;border-radius:20px;display:inline-block;background:#dcfce7;color:#166534;">✅ ${realAvailable} available</div>`;
    }
  }
  return `<div style="font-size:11px;font-weight:800;margin-bottom:5px;color:#888;">Checking...</div>`;
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
  let cIn = localStorage.getItem('lumina_checkin');
  let cOut = localStorage.getItem('lumina_checkout');
  if(!cIn) cIn = document.getElementById('dCheckin')?.value;
  if(!cOut) cOut = document.getElementById('dCheckout')?.value;
  if(!cIn ||!cOut) return 1;
  const d1 = new Date(cIn);
  const d2 = new Date(cOut);
  const diff = Math.round((d2 - d1) / (1000*60*60*24));
  return diff > 0? diff : 1;
}

function cardHTML_Home(r){
 return `<div class="room-card" onclick="openRoom('${r.id}')" style="cursor:default;"><img src="${r.img}" alt="${r.name}"><div class="info"><h3>${r.name}</h3><p style="color:#9C6B2E;font-weight:800;">$${r.price} / night - ${r.bed}</p><p style="color:#888;font-size:12px;margin-top:4px;">${r.about}</p> <p> Click to see Rooms details and Availability </p></div></div>`;
}

function cardHTML(r){
 let badge = "";
 if(r.availableForSearch === -1){
   badge = `<div style="font-size:11px;font-weight:800;margin-bottom:5px;color:#888;">Checking availability...</div>`;
 } else if(r.availableForSearch!== undefined){
   badge = getAvailabilityBadge(r.name, r.availableForSearch);
 }
 return `<div class="room-card" onclick="openRoom('${r.id}')"><img src="${r.img}"><div class="info"><h3>${r.name}</h3>${badge}<p>$${r.price} /night - ${r.bed}</p><button type="button" onclick="event.stopPropagation(); openRoom('${r.id}')">View Details</button></div></div>`;
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

    const badge = getAvailabilityBadge(room.name, available);

    return `
    <div class="room-card" onclick="openRoom('${room.id}')" data-id="${room.id}" style="cursor:pointer;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.07);margin-bottom:20px;">
      <div style="position:relative;">
        <img src="${room.img}" style="width:100%;height:220px;object-fit:cover;">
      </div>
      <div style="padding:18px;">
        <h3 style="font-family:'Playfair Display',serif;font-size:20px;color:#0a192f;margin:0;">${room.name}</h3>
        ${badge}
        <p style="color:#666;margin:6px 0;font-size:13px;">${room.bed} • ${room.about||''}</p>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;">
          <p style="font-weight:600;color:#0a192f;">$${room.price} <span style="font-weight:400;color:#888;">/ night</span></p>
          <button onclick="openRoom('${room.id}')"
                  style="border:1px solid #c5a880;color:#0a192f;padding:8px 16px;border-radius:8px;background:transparent;cursor:pointer;">
            View Details
          </button>
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
  const homeDiv = document.getElementById('roomsDetails');
  let homeIn = "";
  let homeOut = "";
  if(homeDiv){
    const homeDates = homeDiv.querySelectorAll('input[type="date"]');
    if(homeDates.length >= 1) homeIn = homeDates[0].value;
    if(homeDates.length >= 2) homeOut = homeDates[1].value;
  }
  if(!homeIn) homeIn = document.getElementById('dCheckin')?.value ||  "";
  if(!homeOut) homeOut = document.getElementById('dCheckout')?.value || "";
  if(homeIn) localStorage.setItem('lumina_checkin', homeIn);
  if(homeOut) localStorage.setItem('lumina_checkout', homeOut);
  document.querySelectorAll('.page').forEach(p=> p.style.display='none');
  const check = document.querySelector('div#checkout.page') || document.getElementById('checkout');
  if(check) check.style.display='block';
  setTimeout(()=>{
    const dCi = document.getElementById('dCheckin');
    const dCo = document.getElementById('dCheckout');
    const savedIn = localStorage.getItem('lumina_checkin');
    const savedOut = localStorage.getItem('lumina_checkout');
    if(dCi && savedIn) dCi.value = savedIn;
    if(dCo && savedOut) dCo.value = savedOut;
    const txt = getGuestsText();
    document.querySelectorAll('#guestRoomDisplay, #dGuestRoomDisplay').forEach(el=> el.innerText = txt);
    const a = document.getElementById('adultsCount');
    const c = document.getElementById('childrenCount');
    const r = document.getElementById('roomsCount');
    if(a) a.innerText = guestsData.adults;
    if(c) c.innerText = guestsData.children;
    if(r) r.innerText = guestsData.rooms;
    updatePriceDisplay();
    handlePayChange();
    const err = document.getElementById('errorMsg');
    if(err){ err.style.display='none'; err.innerText=''; }
  }, 100);
  window.scrollTo(0,0);
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
  const checkin = document.getElementById('dCheckin').value;
  const checkout = document.getElementById('dCheckout').value;
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
    guests: document.getElementById('dGuestRoomDisplay')?.innerText || document.getElementById('guestRoomDisplay')?.innerText || "1 guest",
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
async function loadMyBookings(){
  const phone = cleanPhone(document.getElementById('myPhone').value);
  if(phone.length<10) return alert("Enter full phone");
  const res = await fetch(`${SCRIPT_URL}?phone=${phone}&t=${Date.now()}`);
  const list = await res.json();
  document.getElementById('myList').innerHTML = list.length? list.map(b=>`
    <div style="background:white; padding:12px; border-radius:10px; margin-bottom:10px; border:1px solid #D4AF37;">
      <b>${b.code} - ${b.status}</b><br>${b.room}<br>${b.checkin} → ${b.checkout}<br>$${b.amount} - ${b.payMethod}
    </div>
  `).join('') : 'No bookings found';
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
  document.querySelectorAll('#guestRoomDisplay, #dGuestRoomDisplay').forEach(el=> el.innerText = txt);
  localStorage.setItem('lumina_guests', JSON.stringify(guestsData));
}
function closeGuestModal(){ const modal = document.getElementById('guestModal'); if(modal) modal.classList.remove('open'); }
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


// === MY BOOKINGS WITH CLEAR HISTORY ===
let myCache = [];
let myTarget = "";

function cleanPhone2(p){ return String(p||'').replace(/[^0-9]/g,'').slice(-10); }

async function loadMyBookings(){
  const phone = document.getElementById('myPhone').value.trim();
  const list = document.getElementById('myList');
  const clearBtn = document.getElementById('myClearBtn');
  if(!phone){ alert("Enter phone"); return; }
  
  myTarget = cleanPhone2(phone);
  list.innerHTML = '<div style="text-align:center;padding:20px;background:white;border-radius:12px;color:#888;">Searching...</div>';
  if(clearBtn) clearBtn.style.display = 'none';

  try{
    const res = await fetch(`${SCRIPT_URL}?t=${Date.now()}`, {cache:"no-store"});
    const all = await res.json();
    const hidden = JSON.parse(localStorage.getItem('lumina_hidden_'+myTarget) || '[]');
    
    myCache = all.filter(b => cleanPhone2(b.phone) === myTarget && !hidden.includes(b.code));
    
    if(myCache.length === 0){
      list.innerHTML = '<div style="text-align:center;padding:30px;background:white;border-radius:12px;color:#999;">No booking history for this user</div>';
      return;
    }
    
    list.innerHTML = myCache.slice().reverse().map(b=>{
      const st = String(b.status||'Unpaid');
      return `<div style="background:white;border-radius:14px;padding:14px;border:1px solid #eee;">
        <div style="display:flex;justify-content:space-between;"><b style="background:#111;color:#D4AF37;padding:4px 8px;border-radius:6px;font-size:11px;">${b.code}</b><span style="font-size:10px;font-weight:800;">${st}</span></div>
        <div style="margin-top:6px;font-size:13px;">${b.name} • ${b.room}<br>${b.checkin} → ${b.checkout} • $${b.amount}</div>
      </div>`;
    }).join('');
    
    if(clearBtn) clearBtn.style.display = 'block';
    
  }catch(e){
    list.innerHTML = '<div style="text-align:center;padding:20px;background:white;border-radius:12px;">Network error</div>';
  }
}

function clearMyBookings(){
  if(myCache.length===0) return;
  if(!confirm("Clear all history for this number? Searching again will show 'No booking history for this user' until new booking.")) return;
  
  const hiddenKey = 'lumina_hidden_' + myTarget;
  const old = JSON.parse(localStorage.getItem(hiddenKey) || '[]');
  const newCodes = myCache.map(b=>b.code);
  localStorage.setItem(hiddenKey, JSON.stringify([...new Set([...old, ...newCodes])]));
  
  document.getElementById('myList').innerHTML = '<div style="text-align:center;padding:30px;background:white;border-radius:12px;color:#999;">No booking history for this user</div>';
  document.getElementById('myClearBtn').style.display = 'none';
  myCache = [];
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