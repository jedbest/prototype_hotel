const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyKhtuAEEaenMjyAgTrm-JRLW73sTgT0bOE1qU21UTPVuX-E-B13HVzsijR8-LYAVzVUA/exec";
const cleanPhone = (p)=> String(p).replace(/[^0-9]/g,'').slice(-10);

// DEMO ROOMS - replace with Sheet later
const roomsData = [
 {id:1,name:"The Grand Opera Suite",price:420,bed:"King",amen:["WiFi","Breakfast","Pool"],img:"https://images.unsplash.com/photo-1631049307264-da0ec9d70304",about:"600 sqft luxury suite with Eiffel view"},
 {id:2,name:"Eiffel River View Room",price:350,bed:"King",amen:["WiFi","Spa Access"],img:"https://images.unsplash.com/photo-1560448204-e02f11c3d0e2",about:"7th Arr, 0.8km from Eiffel"},
 {id:3,name:"Montmartre Boutique Room",price:220,bed:"Double",amen:["WiFi","Breakfast"],img:"https://images.unsplash.com/photo-1618773928121-c32242e63f39",about:"Cozy boutique in Montmartre"},
];

let selectedRoom = roomsData[0];

function showPage(id,el){
 document.querySelectorAll('.page').forEach(p=>p.style.display='none');
 document.getElementById(id).style.display='block';
 if(el){document.querySelectorAll('.topnav.nav-links button,.bottom-nav button').forEach(b=>b.classList.remove('active')); el.classList.add('active');}
 window.scrollTo(0,0);
 if(id==='rooms') renderRooms(roomsData);
 if(id==='home') renderFeatured();
}

function renderFeatured(){ document.getElementById('featuredGrid').innerHTML = roomsData.map(r=>cardHTML(r)).join(''); }
function renderRooms(list){
 document.getElementById('roomsGrid').innerHTML = list.map(r=>cardHTML(r)).join('');
 document.getElementById('resultsCount').innerText = `${list.length} luxury rooms found`;
}
function cardHTML(r){
 return `<div class="room-card" onclick="openRoom(${r.id})"><img src="${r.img}"><div class="info"><h3>${r.name}</h3><p>€${r.price} /night - ${r.bed}</p><button>View Details</button></div></div>`;
}
function openRoom(id){
 selectedRoom = roomsData.find(r=>r.id===id);
 document.getElementById('dMainImg').src = selectedRoom.img;
 document.getElementById('dPrice').innerText = `$${selectedRoom.price} / night`;
 document.getElementById('dAbout').innerText = selectedRoom.about;
 document.getElementById('dAmenities').innerHTML = selectedRoom.amen.map(a=>`• ${a}`).join(' ');
 const nights = calcNights();
 document.getElementById('priceBreakdown').innerHTML = `$${selectedRoom.price} x ${nights} nights = $${selectedRoom.price*nights}`;
 showPage('roomDetail');
}
function calcNights(){
 const ci = new Date(document.getElementById('dCheckin')?.value || document.getElementById('checkin')?.value || new Date());
 const co = new Date(document.getElementById('dCheckout')?.value || document.getElementById('checkout')?.value || new Date(Date.now()+86400000*2));
 const diff = Math.max(1, Math.ceil((co-ci)/86400000)); return diff;
}
function searchRooms(){ showPage('rooms'); filterRooms(); }
function filterRooms(){
 const max = parseInt(document.getElementById('priceRange').value);
 document.getElementById('priceVal').innerText = max;
 const amens = [...document.querySelectorAll('.amen:checked')].map(c=>c.value);
 let filtered = roomsData.filter(r=> r.price<=max && amens.every(a=> r.amen.includes(a) || a==="Pool" || true));
 renderRooms(filtered);
}
function resetFilters(){ document.querySelectorAll('input[type=checkbox]').forEach(c=>c.checked=false); renderRooms(roomsData); }

function goCheckout(){
 const nights = calcNights();
 document.getElementById('checkoutSummary').innerHTML = `<h3>${selectedRoom.name}</h3><p>${nights} nights x $${selectedRoom.price} = $${nights*selectedRoom.price}</p>`;
 showPage('checkout');
}
function filePicked(i){ document.getElementById('fileName').innerText = i.files[0]?.name || ""; }

async function validateBooking(e){
 e.preventDefault();
 const name=document.getElementById('fullName').value.trim();
 const phone=document.getElementById('phone').value.trim();
 const email=document.getElementById('email').value.trim();
 const pay=document.getElementById('payMethod').value;
 const err=document.getElementById('errorMsg');
 if(!name||!phone){err.style.display='block';err.textContent='Fill name & phone';return;}

 err.style.display='block';err.style.color='#a6ff00';err.textContent='Checking availability...';

 // FAST CHECK - same as gym
 try{
  const checkRes = await fetch(`${SCRIPT_URL}?phone=${cleanPhone(phone)}&t=${Date.now()}`,{cache:"no-store"});
  const bookings = await checkRes.json();
  // check if same dates overlapping (simple demo)
  if(bookings.length>0 && bookings.some(b=>b.status==='Active')){
    err.style.color='red';err.textContent='You already have active booking';
    return;
  }

  const data = {
    action:"book",
    name,phone,email: email || `${cleanPhone(phone)}@lumina.com`,
    room: selectedRoom.name, price: selectedRoom.price,
    checkin: document.getElementById('dCheckin')?.value || document.getElementById('checkin').value,
    checkout: document.getElementById('dCheckout')?.value || document.getElementById('checkout').value,
    guests: document.getElementById('guests').value,
    payMethod: pay, status: pay.includes('Pay at')?'Unpaid':'Paid',
    nights: calcNights(), amount: calcNights()*selectedRoom.price
  };

  err.textContent='Processing booking...';
  await fetch(SCRIPT_URL,{method:"POST",mode:"no-cors",body:JSON.stringify(data)});
  document.getElementById('confCode').innerText = 'LMN-'+cleanPhone(phone).slice(-5)+'-'+Date.now().toString().slice(-4);
  document.getElementById('confDetails').innerText = `${selectedRoom.name} - ${data.nights} nights - ${data.checkin} to ${data.checkout}`;
  showPage('confirmation');

 }catch(ex){ err.style.color='red';err.textContent='Network error '+ex.message; }
}

async function loadMyBookings(){
 const phone=cleanPhone(document.getElementById('myPhone').value);
 const res=await fetch(`${SCRIPT_URL}?phone=${phone}&t=${Date.now()}`,{cache:"no-store"});
 const list=await res.json();
 document.getElementById('myList').innerHTML = list.map(b=>`<div class="room-card"><div class="info"><h3>${b.room}</h3><p>${b.checkin} -> ${b.checkout} - ${b.status}</p></div></div>`).join('') || 'No bookings';
}

// init dates
document.addEventListener('DOMContentLoaded',()=>{
 const today=new Date().toISOString().split('T')[0];
 const tom=new Date(Date.now()+86400000*2).toISOString().split('T')[0];
 document.querySelectorAll('input[type=date]').forEach(i=>{ if(!i.value) i.value=today; });
 if(document.getElementById('dCheckout')) document.getElementById('dCheckout').value=tom;
 renderFeatured();
});