// v1.0.53 V54 - VPS deploy pack for ride.nexoofficial.in
const API='/api';
const VERSION='2.0-SPRINT6D_RESTORE_PROFILE_LOGOUT_RAZORPAY';
const IS_ADMIN_WEB=location.pathname.startsWith('/admin');
const TOKEN_KEY=IS_ADMIN_WEB?'nexoRideAdminToken':'nexoRideToken';
if(IS_ADMIN_WEB && !localStorage.getItem('nexoRideLang')) localStorage.setItem('nexoRideLang','bn');
let token=localStorage.getItem(TOKEN_KEY)||'';
let me=null, driverProfile=null, config=null;
let driverLocationTimer=null;
let deferredInstallPrompt=null;
let roleMode=localStorage.getItem('nexoRideRole')||'PASSENGER';
let lang=localStorage.getItem('nexoRideLang')||'';
let easyMode=localStorage.getItem('nexoRideEasyMode')!=='0';
let activeRideType='FULL', activeSeats=1, currentTab='home';
let booking={pickup:'',drop:'',step:1};
let rideTimerInterval=null;
const $=id=>document.getElementById(id); const app=$('app');

function captureGoogleLoginReturn(){
  try{
    const u=new URL(location.href);
    const gt=u.searchParams.get('google_token');
    const ok=u.searchParams.get('google_login');
    const ge=u.searchParams.get('google_error');
    if(gt){ token=gt; localStorage.setItem(TOKEN_KEY,gt); localStorage.setItem('nexoRideRole','PASSENGER'); roleMode='PASSENGER'; window.__googleLoginNotice='Google Login successful. Profile খুলে mobile number verify/update করুন।'; }
    if(ge){ window.__googleLoginNotice='Google Login failed: '+ge; }
    if(gt||ok||ge){ u.searchParams.delete('google_token'); u.searchParams.delete('google_login'); u.searchParams.delete('google_error'); history.replaceState({},'',u.pathname+(u.search?u.search:'')); }
  }catch(e){}
}
captureGoogleLoginReturn();

// standalone cache reset available even if later app code fails
window.clearAppCache = window.clearAppCache || async function(){
  try{
    if('serviceWorker' in navigator){
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r=>r.unregister()));
    }
    if(window.caches){
      const keys = await caches.keys();
      await Promise.all(keys.map(k=>caches.delete(k)));
    }
  }catch(e){}
  location.href='/app/?v=prod-cache-reset-final&t='+Date.now();
};

function showAppError(e){
  try{
    const msg=(e&&e.message)||String(e||'Unknown app error');
    console.error('NEXO_APP_ERROR', e);
    const box=document.getElementById('app');
    if(box){
      box.innerHTML=`<section class="auth-page"><div class="auth-card"><div class="logo-block"><h1>NEXO Ride</h1></div><h2>App loading issue fixed mode</h2><p class="subtitle">Server update বা cache-এর জন্য app আটকে গেছে। নিচের Update/Reload চাপুন।</p><div class="alert">${esc(msg)}</div><button class="primary" onclick="clearAppCache()">Update / Clear Cache</button><button class="ghost" onclick="location.reload()">Reload</button></div></section>`;
    }
  }catch(_){}
}
window.addEventListener('error', ev=>showAppError(ev.error||ev.message));
window.addEventListener('unhandledrejection', ev=>showAppError(ev.reason||'Unhandled promise rejection'));

const D={
bn:{choose:'ভাষা নির্বাচন করুন',chooseSub:'আপনার সুবিধামতো ভাষা বেছে নিন। Toto চালকদের জন্য বাংলা রাখা হয়েছে।',cont:'চালিয়ে যান',welcome:'স্বাগতম!',create:'অ্যাকাউন্ট তৈরি করুন',sub:'কালনা মহকুমার লোকাল টোটো বুকিং। সহজ, নিরাপদ ও দ্রুত।',pass:'যাত্রী',drv:'টোটো চালক',name:'পুরো নাম',mob:'মোবাইল নম্বর',loginPh:'মোবাইল / ইমেল / NEXO ID',email:'ইমেল থাকলে দিন',passw:'পাসওয়ার্ড',veh:'টোটো গাড়ির নম্বর',lic:'লাইসেন্স / আইডি নম্বর',cons:'আমি NEXO Ride-এর নিয়ম, প্রাইভেসি ও সার্ভিস কনসেন্ট মানছি।',login:'লগইন',reg:'অ্যাকাউন্ট তৈরি',mk:'যাত্রী / চালক অ্যাকাউন্ট তৈরি',back:'লগইনে ফিরুন',demo:'ডেমো চালু করুন',note:'এই মোবাইলে ৩০ দিন লগইন থাকবে।',need:'মোবাইল ও পাসওয়ার্ড দিন',home:'হোম',rides:'রাইড',fare:'ভাড়া',profile:'প্রোফাইল',pdash:'যাত্রী ড্যাশবোর্ড',ddash:'চালক ড্যাশবোর্ড',myrides:'আমার রাইড',req:'রাইড রিকোয়েস্ট',farepay:'ভাড়া ও পেমেন্ট',quick:'দ্রুত বুকিং',booknow:'এখন বুক করুন',book:'টোটো বুক করুন',pickupdrop:'পিকআপ থেকে ড্রপ',sharingRide:'শেয়ারিং রাইড',lowfare:'কম ভাড়ার অপশন',history:'স্ট্যাটাস ও হিস্ট্রি',support:'সাহায্য',popular:'জনপ্রিয় জায়গা',tap:'পিকআপ হিসেবে নিন',pickup:'পিকআপ',drop:'ড্রপ',selPick:'কোথা থেকে উঠবেন',selDrop:'কোথায় যাবেন',full:'ফুল বুকিং',sharing:'শেয়ারিং',est:'ভাড়া দেখুন',findDriver:'চালক খুঁজুন',close:'বন্ধ',estimated:'সম্ভাব্য ভাড়া',requested:'রাইড রিকোয়েস্ট হয়েছে',near:'কাছাকাছি চালক',dstatus:'চালকের স্ট্যাটাস',online:'আপনি অনলাইনে আছেন। নতুন রাইড রিকোয়েস্ট আসবে।',offline:'আপনি অফলাইনে আছেন। রাইড পেতে অনলাইন করুন।',goOn:'অনলাইন করুন',goOff:'অফলাইন করুন',total:'মোট রাইড',rating:'রেটিং',status:'স্ট্যাটাস',dmenu:'চালক মেনু',acceptReq:'রিকোয়েস্ট নিন',docs:'ডকুমেন্ট',vehProf:'গাড়ির প্রোফাইল',fareRules:'ভাড়ার নিয়ম',localFare:'লোকাল ভাড়া চার্ট',norides:'এখনো কোনো রাইড নেই।',accept:'নিন',start:'শুরু',complete:'শেষ',base:'বেস ভাড়া',night:'রাতের অতিরিক্ত',myprof:'আমার প্রোফাইল',noemail:'ইমেল নেই',switch:'যাত্রী / চালক বদলান',oneapk:'এক app-এ দুই role',changeLang:'ভাষা বদলান',logout:'লগআউট',required:'দরকারি তথ্য দিন',easy:'সহজ মোড',voice:'শুনুন',next:'পরের ধাপ',prev:'আগের ধাপ',step1:'ধাপ ১: কোথা থেকে উঠবেন?',step2:'ধাপ ২: কোথায় যাবেন?',step3:'ধাপ ৩: রাইড টাইপ ও ভাড়া',confirm:'রিকোয়েস্ট পাঠান',driverHelp:'অনলাইন করলে যাত্রীর রিকোয়েস্ট পাবেন। রিকোয়েস্ট এলে “নিন” চাপুন।',driverRegHelp:'চালক হলে গাড়ির নম্বর অবশ্যই দিন।',payQr:'পেমেন্ট QR পরে যোগ হবে',cashUpi:'ক্যাশ / UPI',saved:'সেভ হয়েছে',selectFirst:'প্রথমে পিকআপ ও ড্রপ নির্বাচন করুন'},
en:{choose:'Select Language',chooseSub:'Choose your language. Bengali is kept for Toto drivers.',cont:'Continue',welcome:'Welcome Back!',create:'Create Account',sub:'Local Toto booking for Kalna Sub-Division. Simple, secure and fast.',pass:'Passenger',drv:'Toto Driver',name:'Full name',mob:'Mobile number',loginPh:'Mobile / Email / NEXO ID',email:'Email optional',passw:'Password',veh:'Toto vehicle number',lic:'License / ID number',cons:'I agree to NEXO Ride Terms, Privacy Policy and service consent.',login:'Login',reg:'Create Account',mk:'Create Passenger / Driver Account',back:'Back to Login',demo:'Quick Demo Login',note:'Session stays active for 30 days on this device.',need:'Enter login and password',home:'Home',rides:'Rides',fare:'Fare',profile:'Profile',pdash:'Passenger Dashboard',ddash:'Driver Dashboard',myrides:'My Rides',req:'Ride Requests',farepay:'Fare & Payments',quick:'Quick Booking',booknow:'Book Now',book:'Book Toto',pickupdrop:'Pickup to drop',sharingRide:'Sharing Ride',lowfare:'Low fare option',history:'Status & history',support:'Support',popular:'Popular Points',tap:'Tap to set pickup',pickup:'Pickup',drop:'Drop',selPick:'Where from?',selDrop:'Where to?',full:'Full Booking',sharing:'Sharing',est:'Estimate Fare',findDriver:'Request Driver',close:'Close',estimated:'Estimated fare',requested:'Ride requested',near:'Nearby drivers',dstatus:'Driver Status',online:'You are online. New ride requests will appear.',offline:'You are offline. Go online to receive ride requests.',goOn:'Go Online',goOff:'Go Offline',total:'Total Rides',rating:'Rating',status:'Status',dmenu:'Driver Menu',acceptReq:'Ride Requests',docs:'Documents',vehProf:'Vehicle profile',fareRules:'Fare Rules',localFare:'Local fare chart',norides:'No rides yet.',accept:'Accept',start:'Start',complete:'Complete',base:'Base Fare',night:'Night Extra',myprof:'My Profile',noemail:'No email',switch:'Switch Passenger / Driver',oneapk:'Use one APK for both roles',changeLang:'Change Language',logout:'Logout',required:'Required fields missing',easy:'Easy Mode',voice:'Listen',next:'Next',prev:'Back',step1:'Step 1: Pickup',step2:'Step 2: Drop',step3:'Step 3: Ride type and fare',confirm:'Send request',driverHelp:'Go online to receive passenger requests. Tap Accept when a request comes.',driverRegHelp:'Vehicle number is required for drivers.',payQr:'Payment QR will be added later',cashUpi:'Cash / UPI',saved:'Saved',selectFirst:'Select pickup and drop first'},
hi:{choose:'भाषा चुनें',chooseSub:'अपनी सुविधा की भाषा चुनें। टोटो चालकों के लिए বাংলা भी है।',cont:'आगे बढ़ें',welcome:'स्वागत है!',create:'अकाउंट बनाएं',sub:'कालना सब-डिवीजन के लिए लोकल टोटो बुकिंग। आसान, सुरक्षित और तेज।',pass:'यात्री',drv:'टोटो चालक',name:'पूरा नाम',mob:'मोबाइल नंबर',loginPh:'मोबाइल / ईमेल / NEXO ID',email:'ईमेल वैकल्पिक',passw:'पासवर्ड',veh:'टोटो वाहन नंबर',lic:'लाइसेंस / आईडी नंबर',cons:'मैं NEXO Ride नियम, प्राइवेसी और service consent मानता/मानती हूं।',login:'लॉगिन',reg:'अकाउंट बनाएं',mk:'यात्री / चालक अकाउंट बनाएं',back:'लॉगिन पर वापस',demo:'डेमो लॉगिन',note:'इस डिवाइस में 30 दिन लॉगिन रहेगा।',need:'लॉगिन और पासवर्ड डालें',home:'होम',rides:'राइड',fare:'किराया',profile:'प्रोफाइल',pdash:'यात्री डैशबोर्ड',ddash:'चालक डैशबोर्ड',myrides:'मेरी राइड',req:'राइड रिक्वेस्ट',farepay:'किराया और पेमेंट',quick:'जल्दी बुकिंग',booknow:'अभी बुक करें',book:'टोटो बुक करें',pickupdrop:'पिकअप से ड्रॉप',sharingRide:'शेयरिंग राइड',lowfare:'कम किराया विकल्प',history:'स्टेटस और हिस्ट्री',support:'सहायता',popular:'लोकप्रिय जगह',tap:'पिकअप चुनें',pickup:'पिकअप',drop:'ड्रॉप',selPick:'कहाँ से?',selDrop:'कहाँ जाना है?',full:'फुल बुकिंग',sharing:'शेयरिंग',est:'किराया देखें',findDriver:'चालक खोजें',close:'बंद',estimated:'अनुमानित किराया',requested:'राइड रिक्वेस्ट हो गया',near:'नजदीकी चालक',dstatus:'चालक स्टेटस',online:'आप ऑनलाइन हैं। नई राइड रिक्वेस्ट आएगी।',offline:'आप ऑफलाइन हैं। राइड पाने के लिए ऑनलाइन करें।',goOn:'ऑनलाइन करें',goOff:'ऑफलाइन करें',total:'कुल राइड',rating:'रेटिंग',status:'स्टेटस',dmenu:'चालक मेनू',acceptReq:'रिक्वेस्ट लें',docs:'डॉक्यूमेंट',vehProf:'वाहन प्रोफाइल',fareRules:'किराया नियम',localFare:'लोकल किराया चार्ट',norides:'अभी कोई राइड नहीं।',accept:'लें',start:'शुरू',complete:'पूरा',base:'बेस किराया',night:'रात का अतिरिक्त',myprof:'मेरी प्रोफाइल',noemail:'ईमेल नहीं',switch:'यात्री / चालक बदलें',oneapk:'एक APK में दोनों role',changeLang:'भाषा बदलें',logout:'लॉगआउट',required:'जरूरी जानकारी दें',easy:'आसान मोड',voice:'सुनें',next:'अगला',prev:'पीछे',step1:'स्टेप 1: पिकअप',step2:'स्टेप 2: ड्रॉप',step3:'स्टेप 3: राइड और किराया',confirm:'रिक्वेस्ट भेजें',driverHelp:'ऑनलाइन करें, फिर यात्री की रिक्वेस्ट मिलेगी।',driverRegHelp:'चालक के लिए वाहन नंबर जरूरी है।',payQr:'पेमेंट QR बाद में जोड़ा जाएगा',cashUpi:'कैश / UPI',saved:'सेव हो गया',selectFirst:'पहले पिकअप और ड्रॉप चुनें'}
};
function L(k){return (D[lang]&&D[lang][k])||D.en[k]||k}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(window.__t);window.__t=setTimeout(()=>t.classList.remove('show'),3200)}
function nexoLogo(cls='brand-logo'){return `<img class="${cls}" src="assets/nexo-logo.svg?v=149v50" alt="NEXO Ride by Astra Technologies">`}
function nexoIcon(cls='nexo-icon'){return `<img class="${cls}" src="assets/nexo-icon.svg?v=149v50" alt="NEXO Ride">`}

function getDemoCoords(label='Kalna'){const map={'Kalna Station':[23.2196,88.3622],'Kalna Hospital':[23.2247,88.3600],'Kalna College':[23.2142,88.3592],'Kalna Bus Stand':[23.2215,88.3615],'Dhatrigram':[23.1902,88.4029],'Baidyapur':[23.1587,88.3472],'Muktarpur':[23.2262,88.3500],'Ganga Ghat':[23.2233,88.3728]};const a=map[label]||[23.2199+(String(label).length%9-4)*0.003,88.3625+(String(label).charCodeAt(0)%9-4)*0.003];return {lat:a[0],lng:a[1],accuracy:25,source:'DEMO_PLACE'}}
function getDeviceLocation(label='Kalna'){return new Promise(resolve=>{if(!navigator.geolocation)return resolve(getDemoCoords(label));navigator.geolocation.getCurrentPosition(p=>resolve({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:Math.round(p.coords.accuracy||0),source:'GPS'}),()=>resolve(getDemoCoords(label)),{enableHighAccuracy:true,timeout:3500,maximumAge:120000})})}
async function updateMyLocation(label='Kalna'){try{const g=await getDeviceLocation(label);lastGeo=g;const r=await api('/location/update',{method:'POST',body:{...g,location:label}});toast(`Geo-tag updated: ${Number(r.location.lat).toFixed(4)}, ${Number(r.location.lng).toFixed(4)}`);return r.location}catch(e){toast(e.message);return null}}
function miniMapHtml(live){const drivers=(live?.drivers||[]).filter(d=>d.online).slice(0,6);const rides=(live?.rides||[]).slice(0,4);return `<div class="mini-map"><div class="map-ring"></div>${drivers.map((d,i)=>`<span class="map-dot driver-dot" style="left:${18+(i*13)%70}%;top:${24+(i*17)%55}%" title="${esc(d.name)}">🛺</span>`).join('')}${rides.map((r,i)=>`<span class="map-dot ride-dot" style="left:${28+(i*19)%55}%;top:${35+(i*11)%45}%">📍</span>`).join('')}<b>LIVE GEO</b><small>${drivers.length} online · ${rides.length} active</small></div>`}

function splashView(){
  app.innerHTML=`<section class="splash-page kx-splash" aria-label="NEXO Ride loading animation">
    <div class="kx-bg-grid"></div>
    <div class="kx-wordmark" aria-label="NEXO Ride">
      <span class="kx-n">N</span><span class="kx-l l2">E</span><span class="kx-l l3">X</span><span class="kx-l l4">O</span><b>Ride</b>
    </div>
    <div class="kx-tagline">Smart Local Toto Booking</div>
    <div class="kx-loader-line"><span></span></div>
    <div class="kx-wipe">
      <div class="kx-preview-phone">
        <div class="kx-preview-top"><i></i><b>NEXO Ride</b><em></em></div>
        <div class="kx-preview-card big"></div>
        <div class="kx-preview-row"><span></span><span></span></div>
        <div class="kx-preview-card small"></div>
        <div class="kx-preview-nav"><i></i><i></i><i></i><i></i></div>
      </div>
    </div>
    <div class="kx-loading-text">Loading secure ride app...</div>
  </section>`;
}

function speak(text){try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=lang==='bn'?'bn-IN':lang==='hi'?'hi-IN':'en-IN';u.rate=.9;speechSynthesis.speak(u)}catch(e){toast(text)}}
async function api(path,opts={}){const res=await fetch(API+path,{method:opts.method||'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...(opts.headers||{})},body:opts.body?JSON.stringify(opts.body):undefined});const data=await res.json().catch(()=>({detail:'Invalid response'}));if(!res.ok)throw new Error(data.detail||'Request failed');return data}
function languageView(){app.innerHTML=`<section class="auth-page lang-page"><div class="auth-card lang-card"><div class="logo-block logo-block-img">${nexoLogo()}</div><h1>${lang?L('choose'):'ভাষা নির্বাচন করুন'} 🌐</h1><p class="subtitle">${lang?L('chooseSub'):'আপনার সুবিধামতো ভাষা বেছে নিন। Toto চালকদের জন্য বাংলা রাখা হয়েছে।'}</p><div class="language-grid"><button class="${lang==='bn'?'selected':''}" onclick="pickLang('bn')"><i>অ</i><b>বাংলা</b><span>চালক / যাত্রীর জন্য সহজ বাংলা</span></button><button class="${lang==='en'?'selected':''}" onclick="pickLang('en')"><i>A</i><b>English</b><span>Use app in English</span></button><button class="${lang==='hi'?'selected':''}" onclick="pickLang('hi')"><i>हि</i><b>हिन्दी</b><span>Hindi language</span></button></div><button class="primary" onclick="confirmLang()">${lang?L('cont'):'চালিয়ে যান'}</button></div></section>`}
function pickLang(l){lang=l;localStorage.setItem('nexoRideLang',l);languageView()} 
function confirmLang(){if(!lang){lang='bn';localStorage.setItem('nexoRideLang','bn')}render()}
async function loadConfig(){try{config=await api('/config')}catch(e){config={service_area:{points:['Kalna Station','Kalna Hospital','Kalna Court','Kalna Bus Stand','Baidyapur','Dhatrigram']}}}}
async function fetchNotifications(){try{return await api('/notifications')}catch(e){return {unread:0,notifications:[]}}}
function notificationIcon(type){type=String(type||'').toUpperCase();if(type.includes('SOS'))return '🆘';if(type.includes('PAYMENT')||type.includes('PAYOUT'))return '💳';if(type.includes('OTP'))return '🔐';if(type.includes('DRIVER'))return '🛺';if(type.includes('RIDE'))return '📍';return '🔔'}
async function notificationsView(){try{const d=await fetchNotifications();const rows=(d.notifications||[]).map(n=>`<div class="row notification-row ${n.read?'read':'unread'}"><i>${notificationIcon(n.event_type)}</i><div><b>${esc(n.title)}</b><span>${esc(n.message)} · ${(n.created_at||'').slice(0,16).replace('T',' ')}</span></div><em>${n.read?'✓':'NEW'}</em></div>`).join('')||`<div class="alert">Notification এখনো নেই। Ride request/payment/SOS হলে এখানে দেখাবে।</div>`;shell(`<section class="hero-card"><div><span class="glow-chip">Notification Center</span><h2>${d.unread||0} unread</h2><p>Ride request, payment, OTP, SOS, payout — সব alert এখানে থাকবে।</p></div><button class="primary" onclick="markNotificationsRead()">Mark Read</button></section><section class="card"><div class="section-title"><h2>Recent Notifications</h2><button>${(d.notifications||[]).length}</button></div><div class="list">${rows}</div></section>`)}catch(e){shell(`<section class="card"><div class="alert">${esc(e.message)}</div></section>`)}}
async function markNotificationsRead(){try{await api('/notifications/read-all',{method:'POST',body:{}});toast('Notifications marked read');notificationsView()}catch(e){toast(e.message)}}
async function registerDemoPushToken(forceAsk=false){try{let deviceId=localStorage.getItem('nexoRideDeviceId');if(!deviceId){deviceId='dev_'+Date.now()+'_'+Math.random().toString(16).slice(2);localStorage.setItem('nexoRideDeviceId',deviceId)}let permission='unsupported';if('Notification' in window){permission=Notification.permission;if(forceAsk&&permission==='default')permission=await Notification.requestPermission()}const tokenValue='WEB-DEMO-'+deviceId;await api('/notifications/register-token',{method:'POST',body:{token:tokenValue,platform:'WEB_PWA',device_id:deviceId,device_name:navigator.userAgent.slice(0,80),permission_status:permission,app_version:'1.0.47-V48'}});if(forceAsk&&permission==='granted'){try{new Notification('NEXO Ride',{body:'Notification permission enabled for this device.'})}catch(e){}}return permission}catch(e){return 'error'}}
async function enableBrowserNotifications(){const p=await registerDemoPushToken(true);toast(p==='granted'?'Notification enabled':'Device registered: '+p);currentTab='notifications';render()}

let driverGpsHealth=null;
async function loadMe(){if(!token)return null;try{const r=await api('/me');me=r.user;driverProfile=r.driver_profile;driverGpsHealth=r.gps_health||driverGpsHealth||null;if(me&&me.role)roleMode=me.role;localStorage.setItem('nexoRideRole',roleMode);return me}catch(e){token='';localStorage.removeItem(TOKEN_KEY);return null}}
function startGoogleLogin(){
  try{
    localStorage.setItem('nexoRideRole','PASSENGER');
    roleMode='PASSENGER';
    {const nativeApp=(/NEXO-Ride-Android/i.test(navigator.userAgent||'') || !!window.NexoRideNative); location.href='/api/auth/google/start?role=PASSENGER'+(nativeApp?'&app=1':'');}
  }catch(e){toast(e.message||'Google Login failed')}
}
function googleLoginBlock(isRegister){
  if(isRegister) return '';
  return `<button class="google-login-btn" onclick="startGoogleLogin()"><span class="google-g">G</span><b>${lang==='bn'?'Google দিয়ে যাত্রী লগইন':lang==='hi'?'Google से Passenger Login':'Continue with Google'}</b></button><div class="auth-divider"><span>${lang==='bn'?'অথবা মোবাইল/পাসওয়ার্ড':lang==='hi'?'या मोबाइल/पासवर्ड':'or mobile/password'}</span></div>`;
}
function setRole(role){roleMode=role;localStorage.setItem('nexoRideRole',role);document.querySelectorAll('.role-tabs button').forEach(b=>b.classList.remove('active'));$('role'+role)?.classList.add('active');$('vehicleFields')?.classList.toggle('hidden',role!=='DRIVER');$('driverHint')?.classList.toggle('hidden',role!=='DRIVER')}
function authView(mode='login'){const isRegister=mode==='register';app.innerHTML=`<section class="auth-page"><div class="auth-card"><div class="logo-block logo-block-img">${nexoLogo()}</div><button class="lang-mini" onclick="languageView()">🌐 ${lang==='bn'?'বাংলা':lang==='hi'?'हिन्दी':'English'}</button><h1>${isRegister?L('create'):L('welcome')} 👋</h1><p class="subtitle">${L('sub')}</p>${googleLoginBlock(isRegister)}${isRegister?`<div class="role-tabs"><button id="rolePASSENGER" class="active" onclick="setRole('PASSENGER')">👤 ${L('pass')}</button><button id="roleDRIVER" onclick="setRole('DRIVER')">🛺 ${L('drv')}</button></div><div id="driverHint" class="voice-help hidden"><button onclick="speak(L('driverRegHelp'))">🔊 ${L('voice')}</button><span>${L('driverRegHelp')}</span></div>`:''}<label class="input-wrap ${isRegister?'':'hidden'}"><i>👤</i><input id="name" placeholder="${L('name')}"></label><label class="input-wrap"><i>📱</i><input id="login" placeholder="${isRegister?L('mob'):L('loginPh')}" inputmode="tel"></label><label class="input-wrap ${isRegister?'':'hidden'}"><i>✉️</i><input id="email" placeholder="${L('email')}"></label><label class="input-wrap"><i>🔒</i><input id="password" type="password" placeholder="${L('passw')}"></label><div id="vehicleFields" class="hidden form-grid"><label class="input-wrap"><i>🛺</i><input id="vehicleNo" placeholder="${L('veh')}"></label><label class="input-wrap"><i>🪪</i><input id="licenseNo" placeholder="${L('lic')}"></label><label class="input-wrap"><i>🔢</i><input id="aadhaarNo" placeholder="Aadhaar number mandatory" inputmode="numeric"></label><label class="input-wrap"><i>📷</i><input id="driverPhoto" placeholder="Driver photo placeholder"></label><label class="input-wrap"><i>🖼️</i><input id="vehiclePhoto" placeholder="Vehicle photo placeholder"></label></div><label class="consent"><input id="consent" type="checkbox"><span>${L('cons')}</span></label><button class="primary" onclick="${isRegister?'register()':'login()'}">${isRegister?L('reg'):L('login')}</button>${!isRegister?`<button class="switch-link" onclick="forgotPasswordView()">🔑 ${lang==='bn'?'পাসওয়ার্ড ভুলে গেছেন?':lang==='hi'?'पासवर्ड भूल गए?':'Forgot password?'}</button>`:''}<button class="ghost" onclick="authView('${isRegister?'login':'register'}')">${isRegister?L('back'):L('mk')}</button><button class="switch-link" onclick="demoLogin()">${L('demo')}</button><p class="more-note">${L('note')}</p></div></section>`;if(isRegister)setRole(roleMode)}

function forgotPasswordView(){const title=lang==='bn'?'পাসওয়ার্ড রিসেট':lang==='hi'?'पासवर्ड रीसेट':'Reset Password';const sub=lang==='bn'?'মোবাইল / ইমেল / NEXO ID দিন, OTP যাচাই করে নতুন পাসওয়ার্ড সেট করুন।':lang==='hi'?'मोबाइल / ईमेल / NEXO ID दें, OTP से नया पासवर्ड सेट करें।':'Enter mobile / email / NEXO ID, verify OTP and set a new password.';app.innerHTML=`<section class="auth-page"><div class="auth-card"><div class="logo-block logo-block-img">${nexoLogo()}</div><button class="lang-mini" onclick="languageView()">🌐 ${lang==='bn'?'বাংলা':lang==='hi'?'हिन्दी':'English'}</button><h1>${title} 🔑</h1><p class="subtitle">${sub}</p><label class="input-wrap"><i>📱</i><input id="resetLogin" placeholder="${L('loginPh')}"></label><button class="primary" onclick="requestResetOtp()">${lang==='bn'?'OTP পাঠান':lang==='hi'?'OTP भेजें':'Send OTP'}</button><div id="resetOtpBox" class="hidden"><label class="input-wrap"><i>🔢</i><input id="resetOtp" placeholder="OTP" inputmode="numeric"></label><label class="input-wrap"><i>🔒</i><input id="newPassword" type="password" placeholder="${lang==='bn'?'নতুন পাসওয়ার্ড':lang==='hi'?'नया पासवर्ड':'New password'}"></label><button class="primary" onclick="resetPassword()">${lang==='bn'?'পাসওয়ার্ড বদলান':lang==='hi'?'पासवर्ड बदलें':'Reset Password'}</button></div><button class="ghost" onclick="authView('login')">${L('back')}</button><p id="resetNote" class="more-note">${lang==='bn'?'Testing mode হলে OTP 123456 হতে পারে।':lang==='hi'?'Testing mode में OTP 123456 हो सकता है।':'In testing mode OTP may be 123456.'}</p></div></section>`}
async function requestResetOtp(){try{const login=$('resetLogin').value.trim();if(!login)return toast(L('loginPh'));const r=await api('/auth/forgot-password',{method:'POST',body:{login}});$('resetOtpBox')?.classList.remove('hidden');$('resetNote').innerText=(r.demo_code?('Testing OTP: '+r.demo_code+' · '):'')+'OTP sent to '+(r.mobile_mask||'registered mobile');toast('OTP sent')}catch(e){toast(e.message)}}
async function resetPassword(){try{const login=$('resetLogin').value.trim(),otp=$('resetOtp').value.trim(),new_password=$('newPassword').value;if(!login||!otp||!new_password)return toast('Login, OTP and new password required');const r=await api('/auth/reset-password',{method:'POST',body:{login,otp,new_password}});toast(r.message||'Password reset successful');setTimeout(()=>authView('login'),900)}catch(e){toast(e.message)}}

function adminLoginView(){app.innerHTML=`<section class="auth-page admin-auth-page"><div class="auth-card admin-login-card"><div class="logo-block logo-block-img">${nexoLogo()}</div><span class="glow-chip">NEXO Admin Web</span><h1>Admin Login 🔐</h1><p class="subtitle">Browser থেকে Driver Approval, Live Booking Monitor, Safety এবং Payout control করুন।</p><label class="input-wrap"><i>📱</i><input id="adminLogin" placeholder="Admin mobile / email" value="bappa.roysm@gmail.com"></label><label class="input-wrap"><i>🔒</i><input id="adminPassword" type="password" placeholder="Password"></label><label class="consent"><input id="adminConsent" type="checkbox"><span>আমি NEXO Ride Admin Privacy, Terms ও data access responsibility মানছি।</span></label><button class="primary" onclick="adminLogin()">Admin Login</button><p class="more-note">Admin URL: /admin · APK user app থেকে আলাদা।</p></div></section>`}
async function adminLogin(){try{const login=$('adminLogin').value.trim(),password=$('adminPassword').value;if(!$('adminConsent')?.checked)return toast('Admin consent tick করুন');if(!login||!password)return toast('Admin login/password দিন');const r=await api('/auth/login',{method:'POST',body:{login,password}});token=r.token;localStorage.setItem(TOKEN_KEY,token);await loadMe();if(!me||me.role!=='ADMIN'){localStorage.removeItem(TOKEN_KEY);token='';me=null;return toast('Only admin account can open Admin Web App');}roleMode='ADMIN';localStorage.setItem('nexoRideRole','ADMIN');currentTab='home';render()}catch(e){toast(e.message)}}
function adminAccessDenied(){app.innerHTML=`<section class="auth-page admin-auth-page"><div class="auth-card admin-login-card"><div class="logo-block logo-block-img">${nexoLogo()}</div><h1>Access Denied</h1><p class="subtitle">এই Web App শুধু Admin-এর জন্য। Passenger/Driver app খুলতে /app ব্যবহার করুন।</p><button class="primary" onclick="logout()">Logout</button></div></section>`}

async function login(){try{const login=$('login').value.trim(),password=$('password').value;if(!$('consent')?.checked)return toast('Privacy Policy / Terms consent tick করুন');if(!login||!password)return toast(L('need'));const r=await api('/auth/login',{method:'POST',body:{login,password}});token=r.token;localStorage.setItem(TOKEN_KEY,token);await loadMe();render()}catch(e){toast(e.message)}}
async function register(){try{const body={role:roleMode,name:$('name').value.trim(),mobile:$('login').value.trim(),email:$('email').value.trim(),password:$('password').value,consent:$('consent').checked,vehicle_no:$('vehicleNo')?.value||'',license_no:$('licenseNo')?.value||'',aadhaar_no:$('aadhaarNo')?.value||'',driver_photo:$('driverPhoto')?.value||'',vehicle_photo:$('vehiclePhoto')?.value||''};if(!body.name||!body.mobile||!body.password)return toast(L('required'));if(roleMode==='DRIVER'&&(!body.vehicle_no||!body.license_no||!body.aadhaar_no||!body.driver_photo||!body.vehicle_photo))return toast('Driver name, mobile, photo, Aadhaar, licence, toto number, vehicle photo mandatory');const r=await api('/auth/register',{method:'POST',body});token=r.token;localStorage.setItem(TOKEN_KEY,token);await loadMe();render()}catch(e){toast(e.message)}}
async function demoLogin(){try{const mobile=roleMode==='DRIVER'?'9000000002':'9000000001';try{const r=await api('/auth/register',{method:'POST',body:{role:roleMode,name:roleMode==='DRIVER'?'Demo Toto Driver':'Demo Passenger',mobile,email:roleMode==='DRIVER'?'driver@nexo.local':'passenger@nexo.local',password:'123456',consent:true,vehicle_no:'WB-TOTO-001',license_no:'DEMO',aadhaar_no:'000000000000',driver_photo:'demo-driver',vehicle_photo:'demo-toto'}});token=r.token}catch(_){const r=await api('/auth/login',{method:'POST',body:{login:mobile,password:'123456'}});token=r.token}localStorage.setItem(TOKEN_KEY,token);await loadMe();render()}catch(e){toast(e.message)}}
function logout(){localStorage.removeItem(TOKEN_KEY);token='';me=null;authView('login')}
function shell(content){const name=me?.name||'NEXO Rider';const navHome=roleMode==='ADMIN'?'Dashboard':L('home'),navRides=roleMode==='ADMIN'?'Drivers':L('rides'),navWallet=roleMode==='ADMIN'?'Payout':L('fare'),navProfile=roleMode==='ADMIN'?'Admin':L('profile');app.innerHTML=`<div class="page ${IS_ADMIN_WEB?'admin-web-page':''}"><header class="topbar astra-head"><div class="toprow"><button class="icon-btn" onclick="currentTab='home';render()">⌂</button><button class="lang-chip" onclick="languageView()">🌐 ${lang==='bn'?'বাংলা':lang==='hi'?'हिन्दी':'English'}</button><button class="install-mini" onclick="installNexoApp()">⬇ App</button><button class="icon-btn notify-top-btn" onclick="currentTab='notifications';render()">🔔</button><span class="status-pill">${roleMode==='ADMIN'?'ADMIN WEB':roleMode==='DRIVER'?L('drv'):L('pass')}</span></div><div class="nexo-head-brand">${nexoIcon('header-icon')}<div><h1>${esc(currentTabTitle())}</h1><p>${esc(name)} · ${config?.service_area?.name||'Kalna Sub-Division'}</p></div></div></header>${content}<nav class="bottom-nav"><button class="${currentTab==='home'?'active':''}" onclick="currentTab='home';render()"><i>🏠</i>${navHome}</button><button class="${currentTab==='rides'?'active':''}" onclick="currentTab='rides';render()"><i>🛺</i>${navRides}</button><button class="${currentTab==='wallet'?'active':''}" onclick="currentTab='wallet';render()"><i>₹</i>${navWallet}</button><button class="${currentTab==='profile'?'active':''}" onclick="currentTab='profile';render()"><i>👤</i>${navProfile}</button></nav></div>`}
function currentTabTitle(){if(currentTab==='notifications')return 'Notifications';if(roleMode==='ADMIN'){if(currentTab==='rides')return 'Driver Approval';if(currentTab==='wallet')return 'Fare & Support';if(currentTab==='profile')return 'Admin Profile';return 'Admin Dashboard'}if(currentTab==='rides')return roleMode==='DRIVER'?L('req'):L('myrides');if(currentTab==='wallet')return L('farepay');if(currentTab==='profile')return L('profile');return roleMode==='DRIVER'?L('ddash'):L('pdash')}
function tile(icon,title,sub,click){return `<button class="tile" onclick="${click}"><i>${icon}</i><b>${title}</b><span>${sub}</span></button>`}
async function render(){if(window.__googleLoginNotice){const m=window.__googleLoginNotice; window.__googleLoginNotice=''; setTimeout(()=>toast(m),500)}if(IS_ADMIN_WEB&&!lang){lang='bn';localStorage.setItem('nexoRideLang','bn')}if(!IS_ADMIN_WEB&&!lang)return languageView();await loadConfig();if(IS_ADMIN_WEB){const user=await loadMe();if(!user)return adminLoginView();if(user.role!=='ADMIN')return adminAccessDenied();roleMode='ADMIN';localStorage.setItem('nexoRideRole','ADMIN')}else{if(!await loadMe())return authView('login')}registerDemoPushToken();if(currentTab==='notifications')return notificationsView();if(currentTab==='kyc')return driverKycView();if(currentTab==='mobile')return mobileHelpView();if(currentTab==='support')return supportView();if(currentTab==='home')return roleMode==='ADMIN'?adminHome():roleMode==='DRIVER'?driverHome():passengerHome();if(currentTab==='rides')return roleMode==='ADMIN'?adminDriversView():ridesView();if(currentTab==='wallet')return roleMode==='DRIVER'?driverEarningsView():roleMode==='ADMIN'?adminPaymentsView():fareView();if(currentTab==='profile')return profileView()}
function points(){return (config?.service_area?.points||['Kalna Station','Kalna Hospital','Kalna Court','Kalna Bus Stand','Baidyapur','Dhatrigram']).slice(0,12)}
function pointChips(target){return points().map(p=>`<button class="place-chip" onclick="setPoint('${target}','${esc(p)}')">📍 ${esc(p)}</button>`).join('')}
async function adminHome(){try{const r=await api('/admin/summary');let rr={rides:[]}, ss={events:[]}, live={drivers:[],rides:[]};try{rr=await api('/rides?role=ADMIN')}catch(e){}try{ss=await api('/admin/safety-events')}catch(e){}try{live=await api('/live/locations')}catch(e){}const st=config?.app_settings||{};const recent=(rr.rides||[]).slice(0,5).map(x=>`<div class="row"><i>🛺</i><div><b>${esc(x.pickup)} → ${esc(x.drop)}</b><span>${rideStatusText(x.status)} · ₹${x.estimated_fare} · ${esc(x.passenger_name||'Passenger')}</span></div><em>›</em></div>`).join('')||`<div class="alert">এখনো booking নেই। Passenger side থেকে test booking করলে এখানে দেখাবে।</div>`;const safetyRows=(ss.events||[]).slice(0,4).map(x=>`<div class="row safety-event-row"><i>🆘</i><div><b>${esc(x.pickup||'Ride')} → ${esc(x.drop||'')}</b><span>${esc(x.user_name||'User')} · ${esc(x.user_mobile||'')} · ${esc(x.reason||'SOS')}</span></div><em>!</em></div>`).join('')||`<div class="ok">No SOS alert now.</div>`;shell(`<section class="hero-card"><div><span class="glow-chip">NEXO Control</span><h2>Admin Dashboard</h2><p>Driver approval, booking monitor, fare rule এবং support control।</p></div><button class="primary" onclick="currentTab='rides';render()">Driver Approval</button></section><section class="summary"><div><b>${r.summary.users}</b><span>Users</span></div><div><b>${r.summary.drivers}</b><span>Drivers</span></div><div><b>${r.summary.rides||0}</b><span>Bookings</span></div></section><section class="summary"><div><b>${r.summary.requested||0}</b><span>Requested</span></div><div><b>${r.summary.online_drivers}</b><span>Online Driver</span></div><div><b>${r.summary.completed||0}</b><span>Completed</span></div></section><section class="summary"><div><b>${r.summary.accepted||0}</b><span>Accepted</span></div><div><b>${r.summary.arrived||0}</b><span>Arrived</span></div><div><b>${r.summary.safety_open||0}</b><span>SOS Open</span></div></section><section class="summary earnings-summary"><div><b>₹${r.summary.total_fare||0}</b><span>Total Fare</span></div><div><b>₹${r.summary.platform_commission||0}</b><span>Commission</span></div><div><b>₹${r.summary.driver_payout_pending||0}</b><span>Driver Due</span></div></section><section class="card live-location-card"><div class="section-title"><h2>Live Geo Monitor</h2><button>${(live.drivers||[]).filter(d=>d.online).length} Online</button></div>${miniMapHtml(live)}<div class="list">${(live.drivers||[]).slice(0,4).map(d=>`<div class="row"><i>📡</i><div><b>${esc(d.name)} · ${esc(d.vehicle_no||'Toto')}</b><span>${d.online?'Online':'Offline'} · ${Number(d.lat||0).toFixed(4)}, ${Number(d.lng||0).toFixed(4)}</span></div><em>${esc(d.location||'Kalna')}</em></div>`).join('')||`<div class="alert">Driver online করলে live geo এখানে দেখাবে।</div>`}</div></section><section class="card"><div class="section-title"><h2>Live Booking Monitor</h2><button>${(rr.rides||[]).length}</button></div><div class="list">${recent}</div></section><section class="card safety-monitor"><div class="section-title"><h2>Safety Monitor</h2><button>${r.summary.safety_open||0} Open</button></div><div class="list">${safetyRows}</div></section><section class="card"><div class="section-title"><h2>Admin Login</h2><button>Secure</button></div><div class="list"><div class="row"><i>📱</i><div><b>Admin Mobile</b><span>${esc(st.admin_mobile||'6295192839')}</span></div><em>›</em></div><div class="row"><i>✉️</i><div><b>Admin Email</b><span>${esc(st.admin_email||'bappa.roysm@gmail.com')}</span></div><em>›</em></div><div class="row" onclick="currentTab='notifications';render()"><i>🔔</i><div><b>Notification Center</b><span>Ride request, payment, SOS alert</span></div><em>›</em></div><div class="row" onclick="enableBrowserNotifications()"><i>📲</i><div><b>Enable Push / Register Device</b><span>এই mobile device notification token admin panel-এ দেখাবে</span></div><em>›</em></div><div class="row" onclick="currentTab='support';render()"><i>🆘</i><div><b>Support / Complaint / Refund</b><span>${esc(st.support_mobile||'9749983737')} · ${esc(st.support_email||'babairoykalma@gmail.com')}</span></div><em>›</em></div></div></section><section class="card"><div class="section-title"><h2>Build Info</h2><button>APK Ready</button></div><div class="list"><div class="row"><i>📦</i><div><b>Package</b><span>${esc(st.package_name||'com.astratechnologies.nexoride')}</span></div><em>›</em></div><div class="row"><i>🛡️</i><div><b>Driver Approval</b><span>Pending → Admin Approve → Active</span></div><em>›</em></div></div></section>`)}catch(e){shell(`<section class="card"><div class="alert">${esc(e.message)}</div></section>`)}}
async function adminDriversView(){try{const r=await api('/admin/drivers');const rows=r.drivers.map(d=>`<div class="row"><i>🛺</i><div><b>${esc(d.name||'Driver')} · ${esc(d.vehicle_no||'No Vehicle')}</b><span>${esc(d.mobile||'')} · ${d.status} · ${d.online?'Online':'Offline'}</span></div>${d.status==='APPROVED'?`<button class="ghost" onclick="adminDriverAction('${d.id}','offline')">Offline</button>`:`<button class="primary mini-pay" onclick="adminDriverAction('${d.id}','approve')">Approve</button>`}</div>`).join('')||`<div class="alert">No driver registration yet.</div>`;shell(`<section class="card"><div class="section-title"><h2>Driver Approval</h2><button>${r.drivers.length}</button></div><div class="list">${rows}</div></section>`)}catch(e){shell(`<section class="card"><div class="alert">${esc(e.message)}</div></section>`)}}
async function adminDriverAction(id,action){try{await api(`/admin/drivers/${id}/${action}`,{method:'POST',body:{}});toast('Driver updated');adminDriversView()}catch(e){toast(e.message)}}
function passengerHome(){shell(`<section class="hero-card hero-logo-card"><div class="hero-mini-brand">${nexoIcon('hero-icon')}<span class="glow-chip">NEXO Smart Toto</span></div><div><h2>৩ ধাপে বুকিং</h2><p>Pickup → Driver Accept → Pay & Confirm. সহজ, দ্রুত, আলাদা।</p></div><button class="primary" onclick="openBookingSheet()">${L('booknow')}</button></section><section class="card"><div class="section-title"><h2>${L('quick')}</h2><button onclick="openBookingSheet()">${L('booknow')}</button></div><div class="grid">${tile('📍',L('book'),L('pickupdrop'),'openBookingSheet()')}${tile('🔁',L('sharingRide'),L('lowfare'),"activeRideType='SHARING';openBookingSheet()")} ${tile('🛡️','Safety Center','SOS + Share Trip',"currentTab='rides';render()")} ${tile('🔔','Alerts','Notification Center',"currentTab='notifications';render()")} ${tile('📡','Live Ready','Geo-tag tracking ready',"updateMyLocation('Kalna Station')")}</div></section><section class="summary"><div><b>₹40</b><span>${L('full')}</span></div><div><b>₹10</b><span>${L('sharing')}</span></div><div><b>30d</b><span>${L('login')}</span></div></section><section class="card"><div class="section-title"><h2>Booking Status Flow</h2><button>v1.0.28</button></div><div class="status-flow"><span>Request</span><span>Accept</span><span>Pay</span><span>OTP</span><span>Pickup</span></div></section><section class="card"><div class="section-title"><h2>${L('popular')}</h2><button>Kalna</button></div><div class="list">${points().slice(0,6).map(p=>`<div class="row" onclick="openBookingSheet('${esc(p)}')"><i>📍</i><div><b>${esc(p)}</b><span>${L('tap')}</span></div><em>›</em></div>`).join('')}</div></section>${bookingSheetHtml()}`)}
function isDriverApprovedForOnline(p){
  const status=String(p?.status||'PENDING').toUpperCase();
  const kyc=String(p?.kyc_status||'INCOMPLETE').toUpperCase();
  return status==='APPROVED' && kyc!=='REJECTED';
}
function driverOnlineLockMessage(p){
  const status=String(p?.status||'PENDING').toUpperCase();
  const kyc=String(p?.kyc_status||'INCOMPLETE').toUpperCase();
  if(status==='SUSPENDED') return 'আপনার Driver profile suspend আছে। Admin/support-এর সাথে যোগাযোগ করুন।';
  if(status==='REJECTED'||kyc==='REJECTED') return 'আপনার KYC/Admin approval rejected হয়েছে। Document re-upload করুন।';
  if(status!=='APPROVED') return 'Admin approval pending আছে। Approval হলে Go Online চালু হবে।';
  return '';
}
function driverGpsText(){
  const g=driverGpsHealth||{};
  const lat=driverProfile?.lat||g.lat, lng=driverProfile?.lng||g.lng;
  if(lat&&lng){return `${driverProfile?.online?'GPS ON':'Last GPS'} · ${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}${g.inside_service_area===false?' · outside area':''}`}
  return 'GPS status unknown — Check GPS চাপুন';
}
async function checkDriverGps(){try{const g=await getDeviceLocation(driverProfile?.location||'Kalna');driverProfile={...(driverProfile||{}),lat:g.lat,lng:g.lng,last_location_at:new Date().toISOString()};driverGpsHealth={available:true,gps_on:true,lat:g.lat,lng:g.lng,last_location_at:driverProfile.last_location_at,message:'GPS OK'};toast(`GPS OK: ${Number(g.lat).toFixed(5)}, ${Number(g.lng).toFixed(5)}`);render()}catch(e){toast(e.message||'GPS পাওয়া যায়নি')}}
function stopDriverLocationTracking(){
  if(driverLocationTimer){ clearInterval(driverLocationTimer); driverLocationTimer=null; }
}
async function sendDriverLocation(source='DRIVER_LOCATION_HEARTBEAT'){
  const g=await getDeviceLocation(driverProfile?.location||'Kalna');
  const r=await api('/driver/location-update',{method:'POST',body:{location:driverProfile?.location||'Kalna',...g,source}});
  if(r.driver_profile) driverProfile={...(driverProfile||{}),...r.driver_profile};
  return r;
}
function startDriverLocationTracking(){
  stopDriverLocationTracking();
  if(!driverProfile?.online || !isDriverApprovedForOnline(driverProfile)) return;
  sendDriverLocation('DRIVER_LOCATION_START').catch(()=>{});
  driverLocationTimer=setInterval(()=>sendDriverLocation('DRIVER_LOCATION_HEARTBEAT').catch(()=>{}),15000);
}
async function goDriverOnline(){
  try{
    if(!isDriverApprovedForOnline(driverProfile)){
      toast(driverOnlineLockMessage(driverProfile));
      currentTab='kyc';
      return render();
    }
    const g=await getDeviceLocation(driverProfile?.location||'Kalna');
    const r=await api('/driver/go-online',{method:'POST',body:{location:driverProfile?.location||'Kalna',...g,source:'DRIVER_GO_ONLINE'}});
    if(r.driver_profile) driverProfile={...(driverProfile||{}),...r.driver_profile}; if(r.gps_health) driverGpsHealth=r.gps_health;
    await loadMe();
    startDriverLocationTracking();
    toast('আপনি Online হয়েছেন। Passenger booking এলে request পাবেন।');
    driverHome();
  }catch(e){toast(e.message)}
}
async function goDriverOffline(){
  try{
    await api('/driver/go-offline',{method:'POST',body:{location:driverProfile?.location||'Kalna',source:'DRIVER_GO_OFFLINE'}});
    stopDriverLocationTracking();
    await loadMe();
    toast('আপনি Offline হয়েছেন।');
    driverHome();
  }catch(e){toast(e.message)}
}
function driverHome(){
  const online=!!driverProfile?.online;
  const eligible=isDriverApprovedForOnline(driverProfile);
  const lockMsg=driverOnlineLockMessage(driverProfile);
  if(online && eligible) startDriverLocationTracking(); else stopDriverLocationTracking();
  const locText=driverGpsText();
  const actionBtn=eligible
    ? `<button class="primary driver-main-btn" onclick="toggleOnline(${online?'false':'true'})">${online?'🔴 '+L('goOff'):'🟢 '+L('goOn')}</button>`
    : `<button class="primary driver-main-btn" onclick="currentTab='kyc';render()">🔒 Go Online Locked</button><button class="ghost" style="margin-top:10px" onclick="currentTab='kyc';render()">KYC / Admin Approval খুলুন</button>`;
  const statusBox=eligible?`<div class="${online?'ok':'alert'}">${online?L('online'):L('offline')}</div>`:`<div class="alert">${esc(lockMsg)}</div>`;
  shell(`<section class="card easy-card"><div class="section-title"><h2>${L('easy')}</h2><button onclick="toggleEasy()">${easyMode?'ON':'OFF'}</button></div><div class="voice-help"><button onclick="speak(L('driverHelp'))">🔊 ${L('voice')}</button><span>${L('driverHelp')}</span></div></section><section class="card"><div class="section-title"><h2>${L('dstatus')}</h2><button>${driverProfile?.status||'PENDING'} · ${driverProfile?.kyc_status||'KYC_PENDING'}</button></div>${statusBox}<div class="voice-help" style="margin-top:10px"><button onclick="checkDriverGps()">📍 Check GPS</button><span>${esc(locText)}</span></div><br>${actionBtn}</section><section class="summary"><div><b>${driverProfile?.total_rides||0}</b><span>${L('total')}</span></div><div><b>₹${driverProfile?.total_earnings||0}</b><span>Earnings</span></div><div><b>${driverProfile?.rating||5}⭐</b><span>${L('rating')}</span></div></section><section class="card"><div class="section-title"><h2>${L('dmenu')}</h2><button>Toto</button></div><div class="grid ${easyMode?'easy-grid':''}">${tile('📥',L('acceptReq'),L('req'),"currentTab='rides';render()")} ${tile('🔔','Alerts','Ride/payment alert',"currentTab='notifications';render()")} ${tile('🧾',L('history'),L('myrides'),"currentTab='rides';render()")} ${tile('🪪',L('docs'),'KYC / Vehicle profile',"currentTab='kyc';render()")} ${tile('₹',L('fareRules'),L('localFare'),"currentTab='wallet';render()")}</div></section>`)
}
function toggleEasy(){easyMode=!easyMode;localStorage.setItem('nexoRideEasyMode',easyMode?'1':'0');render()}
async function toggleOnline(online){return online?goDriverOnline():goDriverOffline()}
function bookingSheetHtml(){return `<div id="overlay" class="overlay" onclick="closeSheet()"></div><section id="bookSheet" class="sheet step-sheet"><div class="handle"></div><div class="section-title"><h2>${L('book')}</h2><button onclick="closeSheet()">${L('close')}</button></div><div class="step-dots"><span class="${booking.step===1?'on':''}">1</span><span class="${booking.step===2?'on':''}">2</span><span class="${booking.step===3?'on':''}">3</span></div><div id="stepContent">${bookingStepHtml()}</div></section>`}
function bookingStepHtml(){if(booking.step===1)return `<h3>${L('step1')}</h3><input class="big-input" id="pickup" list="points" value="${esc(booking.pickup)}" placeholder="${L('selPick')}"><datalist id="points">${points().map(p=>`<option value="${esc(p)}"></option>`).join('')}</datalist><div class="place-grid">${pointChips('pickup')}</div><button class="primary" onclick="saveStep1()">${L('next')}</button>`;if(booking.step===2)return `<h3>${L('step2')}</h3><input class="big-input" id="drop" list="points2" value="${esc(booking.drop)}" placeholder="${L('selDrop')}"><datalist id="points2">${points().map(p=>`<option value="${esc(p)}"></option>`).join('')}</datalist><div class="place-grid">${pointChips('drop')}</div><div class="two-btn"><button class="ghost" onclick="booking.step=1;refreshBookingStep()">${L('prev')}</button><button class="primary" onclick="saveStep2()">${L('next')}</button></div>`;return `<h3>${L('step3')}</h3><div class="summary route-summary"><div><b>${esc(booking.pickup||'-')}</b><span>${L('pickup')}</span></div><div><b>→</b><span></span></div><div><b>${esc(booking.drop||'-')}</b><span>${L('drop')}</span></div></div><div class="segment"><button id="fullBtn" class="${activeRideType==='FULL'?'active':''}" onclick="setRideType('FULL')">${L('full')}</button><button id="sharingBtn" class="${activeRideType==='SHARING'?'active':''}" onclick="setRideType('SHARING')">${L('sharing')}</button></div><div id="seatBox" class="seat-box ${activeRideType==='SHARING'?'':'hidden'}"><b>সিট</b>${[1,2,3,4].map(n=>`<button class="${activeSeats===n?'active':''}" onclick="setSeats(${n})">${n}</button>`).join('')}</div><div class="fare-formula">First 4 km base · প্রতি 2 km ₹5 extra · Sharing capacity 4</div><div id="fareBox" class="ok hidden"></div><button class="ghost" onclick="estimateFare()">₹ ${L('est')}</button><div class="two-btn"><button class="ghost" onclick="booking.step=2;refreshBookingStep()">${L('prev')}</button><button class="primary" onclick="requestRide()">🛺 ${L('confirm')}</button></div>`}
function refreshBookingStep(){const c=$('stepContent');if(c)c.innerHTML=bookingStepHtml();document.querySelectorAll('.step-dots span').forEach((s,i)=>s.classList.toggle('on',i+1===booking.step))}
function setPoint(target,val){booking[target]=val;if($(target))$(target).value=val}
function saveStep1(){booking.pickup=$('pickup')?.value.trim()||booking.pickup;if(!booking.pickup)return toast(L('selPick'));booking.step=2;refreshBookingStep()}
function saveStep2(){booking.drop=$('drop')?.value.trim()||booking.drop;if(!booking.drop)return toast(L('selDrop'));booking.step=3;refreshBookingStep()}
function openBookingSheet(pick=''){if(pick)booking.pickup=pick;booking.step=booking.pickup?2:1;$('overlay')?.classList.add('show');$('bookSheet')?.classList.add('show');refreshBookingStep()}
function closeSheet(){$('overlay')?.classList.remove('show');$('bookSheet')?.classList.remove('show')}
function setRideType(t){activeRideType=t;$('fullBtn')?.classList.toggle('active',t==='FULL');$('sharingBtn')?.classList.toggle('active',t==='SHARING');$('seatBox')?.classList.toggle('hidden',t!=='SHARING')}
function setSeats(n){activeSeats=n;refreshBookingStep()}
async function estimateFare(){try{if(!booking.pickup||!booking.drop)return toast(L('selectFirst'));const r=await api('/fare/estimate',{method:'POST',body:{pickup:booking.pickup,drop:booking.drop,ride_type:activeRideType,seats:activeSeats}});const box=$('fareBox');box.classList.remove('hidden');const fb=r.fare_breakup||{};const geo=r.geofence||{};const geoClass=geo.inside?'route-ok':'route-warn';box.innerHTML=`<div class="fare-total-line"><span>${L('estimated')}:</span><b>₹${r.estimated_fare}</b></div><div class="route-preview-card"><div class="route-map-mini"><span class="pin start">●</span><i></i><span class="pin end">●</span></div><div class="route-grid"><div><b>${r.distance_km} km</b><small>Route distance</small></div><div><b>${r.straight_distance_km||'-'} km</b><small>Straight</small></div><div><b>${r.ride_type==='SHARING'?r.seats+' seat':'Full'}</b><small>Ride type</small></div></div><div class="fare-breakup"><span>Base: ₹${fb.base_fare||r.base_fare||0}</span><span>Extra: ${fb.extra_steps||0} step = ₹${fb.extra_fare||0}</span>${r.ride_type==='SHARING'?`<span>Per seat: ₹${r.fare_per_seat}</span>`:''}</div><div class="geo-chip ${geoClass}">📍 ${esc(geo.message||'Kalna Sub-Division')}</div></div>`}catch(e){toast(e.message)}}
async function requestRide(){try{if(!booking.pickup||!booking.drop)return toast(L('selectFirst'));const g=await getDeviceLocation(booking.pickup);const r=await api('/rides',{method:'POST',body:{pickup:booking.pickup,drop:booking.drop,ride_type:activeRideType,seats:activeSeats,...g}});closeSheet();toast(`${L('requested')}. ${L('near')}: ${r.ride.nearby_driver_count}`);currentTab='rides';render()}catch(e){toast(e.message)}}
async function ridesView(){try{const r=await api('/rides?role='+roleMode);const rows=r.rides.map(rideRow).join('')||`<div class="alert">${L('norides')}</div>`;const flow=`<div class="status-flow ride-flow"><span>Request</span><span>Accept</span><span>Pay</span><span>OTP</span><span>Start</span><span>Complete</span></div>`;shell(`<section class="card"><div class="section-title"><h2>${roleMode==='DRIVER'?L('req'):L('myrides')}</h2><button>${r.rides.length}</button></div>${flow}<div class="list">${rows}</div></section>`);startRideTimer()}catch(e){shell(`<section class="card"><div class="alert">${esc(e.message)}</div></section>`)} }
function rideStatusText(s){return {REQUESTED:'Driver খোঁজা হচ্ছে',DRIVER_ACCEPTED:'Driver accept করেছে - ৩ মিনিটের মধ্যে Pay করুন',PAYMENT_TIMEOUT:'Payment time শেষ - নতুন booking করুন',CONFIRMED:'Payment done - Driver pickup আসছে। OTP প্রস্তুত',ARRIVED:'Driver pickup-এ পৌঁছেছে - OTP বলুন',STARTED:'OTP verified - Ride চলছে',COMPLETED:'Ride complete',CANCELLED:'Cancelled'}[s]||s}
function rideProgressPct(s){return {REQUESTED:16,DRIVER_ACCEPTED:34,PAYMENT_TIMEOUT:100,CONFIRMED:56,ARRIVED:72,STARTED:88,COMPLETED:100,CANCELLED:100}[s]||10}
function secondsLeft(iso){if(!iso)return 0;return Math.max(0,Math.floor((new Date(iso).getTime()-Date.now())/1000))}
function fmtLeft(sec){const m=Math.floor(sec/60),s=sec%60;return `${m}:${String(s).padStart(2,'0')}`}
function timerHtml(r){
  if(r.status==='DRIVER_ACCEPTED'&&r.payment_due_at){const left=secondsLeft(r.payment_due_at);return `<div class="pay-countdown" data-due="${esc(r.payment_due_at)}">Payment time left: <b>${fmtLeft(left)}</b></div>`}
  if(r.status==='PAYMENT_TIMEOUT')return `<div class="pay-countdown timeout">Payment time expired. Please book again.</div>`;
  if(roleMode==='PASSENGER' && (r.status==='CONFIRMED'||r.status==='ARRIVED') && r.ride_otp)return `<div class="ride-otp-card"><small>Driver-কে এই OTP বলুন</small><b>${esc(r.ride_otp)}</b></div>`;
  if(r.status==='ARRIVED')return `<div class="pay-countdown ok-note">Driver pickup point-এ পৌঁছে গেছে। Passenger OTP নিয়ে Start করুন।</div>`;
  return ''
}
function startRideTimer(){clearInterval(rideTimerInterval);updateRideTimers();rideTimerInterval=setInterval(updateRideTimers,1000)}
function updateRideTimers(){document.querySelectorAll('.pay-countdown[data-due]').forEach(el=>{const left=secondsLeft(el.dataset.due);el.querySelector('b').textContent=fmtLeft(left);if(left<=0){el.classList.add('timeout');el.innerHTML='Payment time expired. Refresh rides.'}})}

function activeRideSafety(r){return ['DRIVER_ACCEPTED','CONFIRMED','ARRIVED','STARTED'].includes(r.status)}
function safetyActions(r){
  if(!activeRideSafety(r)) return '';
  const st=config?.app_settings||{};
  const support=esc(st.support_mobile||'9749983737');
  const callOther=roleMode==='PASSENGER'&&r.driver_mobile?`<a class="safe-call" href="tel:${esc(r.driver_mobile)}">📞 Driver</a>`:roleMode==='DRIVER'&&r.passenger_mobile?`<a class="safe-call" href="tel:${esc(r.passenger_mobile)}">📞 Passenger</a>`:'';
  return `<div class="safety-actions">${callOther}<button onclick="openRideNav('${r.id}')">🗺️ Route</button><button onclick="shareTrip('${r.id}')">🔗 Share Trip</button><button class="sos-btn" onclick="sosRide('${r.id}')">🆘 SOS</button><a class="safe-call" href="tel:${support}">☎ Support</a></div>`;
}
async function shareTrip(id){
  try{
    const r=await api(`/rides/${id}/share`,{method:'POST',body:{}});
    const text=r.share_text||'NEXO Ride trip';
    if(navigator.share){ await navigator.share({title:'NEXO Ride Trip',text}); }
    else if(navigator.clipboard){ await navigator.clipboard.writeText(text); toast('Trip details copied'); }
    else { prompt('Copy trip details',text); }
  }catch(e){toast(e.message)}
}
async function sosRide(id){
  try{
    const reason=prompt('SOS reason লিখুন (optional)','Emergency / Need help')||'SOS pressed from app';
    const r=await api(`/rides/${id}/sos`,{method:'POST',body:{reason,location:'Kalna Sub-Division'}});
    toast(`SOS sent to NEXO Support: ${r.support_mobile}`);
    if(navigator.vibrate) navigator.vibrate([120,80,120]);
  }catch(e){toast(e.message)}
}


async function openRideNav(id){
  try{
    const r = await api(`/rides/${id}/navigation`);
    const links = r.links || {};
    const url = links.google_web || links.mappls_web || links.google_search;
    if(url) window.open(url,'_blank');
    else toast('Navigation link not ready');
  }catch(e){ toast(e.message); }
}

function rideRow(r){const actions=roleMode==='DRIVER'&&r.status==='REQUESTED'?`<button class="ghost big-action" onclick="rideAction('${r.id}','accept')">✅ ${L('accept')}</button>`:roleMode==='PASSENGER'&&r.status==='DRIVER_ACCEPTED'?`<button class="primary mini-pay" onclick="rideAction('${r.id}','pay')">💳 Pay Now</button>`:roleMode==='DRIVER'&&r.status==='CONFIRMED'?`<button class="ghost big-action" onclick="rideAction('${r.id}','arrive')">📍 Reached Pickup</button>`:roleMode==='DRIVER'&&r.status==='ARRIVED'?`<div class="otp-start-box"><input id="otp-${r.id}" inputmode="numeric" maxlength="4" placeholder="Passenger OTP"><button class="ghost big-action" onclick="rideAction('${r.id}','start')">▶️ ${L('start')}</button></div>`:roleMode==='DRIVER'&&r.status==='STARTED'?`<button class="ghost big-action" onclick="rideAction('${r.id}','complete')">🏁 ${L('complete')}</button>`:roleMode==='PASSENGER'&&r.status==='COMPLETED'&&!r.rating_by_passenger?`<button class="primary mini-pay" onclick="rateRide('${r.id}')">⭐ Rate</button>`:`<em>›</em>`;const seatTxt=r.ride_type==='SHARING'?` · ${r.seats||1} seat`:'';const driverTxt=r.driver_name?` · Driver: ${esc(r.driver_name)} ${r.driver_vehicle_no?`(${esc(r.driver_vehicle_no)})`:''}`:'';return `<div class="row ride-row ride-row-${r.status}"><i>🛺</i><div><b>${esc(r.pickup)} → ${esc(r.drop)}</b><span><b class="status-pill">${rideStatusText(r.status)}</b> · ${r.ride_type}${seatTxt} · ₹${r.estimated_fare}${r.driver_earning?` · Driver ₹${r.driver_earning}`:''}${r.rating_by_passenger?` · ${r.rating_by_passenger}⭐`:''}${driverTxt}</span>${timerHtml(r)}${safetyActions(r)}<div class="ride-progress"><b style="width:${rideProgressPct(r.status)}%"></b></div></div>${actions}</div>`}
async function rideAction(id,action){try{const body={};if(action==='start'){const otp=$(`otp-${id}`)?.value.trim();if(!otp)return toast('Passenger OTP দিন');body.otp=otp;}if(action==='pay'){const p=await api('/payments/create-order',{method:'POST',body:{ride_id:id}});let ref='DEMO-'+Date.now();if(p.payment?.provider==='MANUAL_QR'){ref=prompt(`UPI payment reference দিন\nUPI: ${p.payment.manual_upi_id||'not set'}`,ref)||ref;}else if(p.payment?.provider==='RAZORPAY'){ref=prompt('Razorpay payment id / UPI reference দিন',ref)||ref;}const v=await api(`/payments/${p.order.id}/verify`,{method:'POST',body:{transaction_id:ref,payment_method:p.payment?.methods?.[0]||'DEMO_PAYMENT'}});toast('Payment verified - Booking confirmed. OTP generated');return ridesView();}await api(`/rides/${id}/${action}`,{method:'POST',body});toast(action==='arrive'?'Passenger notified: Driver reached pickup':action==='start'?'OTP verified - Ride started':'Ride updated');ridesView()}catch(e){toast(e.message);ridesView()}}
async function rateRide(id){try{let rating=prompt('Driver rating দিন (1-5)','5');if(rating===null)return;rating=Math.max(1,Math.min(5,Number(rating||5)));const comment=prompt('Comment optional','')||'';await api(`/rides/${id}/rate`,{method:'POST',body:{rating,comment}});toast('Rating saved');ridesView()}catch(e){toast(e.message);ridesView()}}
async function driverEarningsView(){try{const r=await api('/driver/earnings');const rows=(r.rides||[]).slice(0,20).map(x=>`<div class="row"><i>₹</i><div><b>${esc(x.pickup)} → ${esc(x.drop)}</b><span>Fare ₹${x.estimated_fare} · Your earning ₹${x.driver_earning||0} · Commission ₹${x.platform_commission||0}</span></div><em>${x.settlement_status||'PENDING'}</em></div>`).join('')||`<div class="alert">Complete ride হলে earning এখানে দেখাবে।</div>`;const paidRows=(r.settlements||[]).slice(0,10).map(x=>`<div class="row"><i>✅</i><div><b>Payout Paid ₹${x.amount||0}</b><span>${(x.paid_at||'').slice(0,10)} · ${x.ride_count||0} rides · Ref: ${esc(x.payment_ref||'Manual')}</span></div><em>PAID</em></div>`).join('')||`<div class="ok">Admin payout mark paid করলে এখানে settlement history দেখাবে।</div>`;shell(`<section class="hero-card"><div><span class="glow-chip">Driver Wallet</span><h2>Today ₹${r.summary.today_earnings||0}</h2><p>Total earning ₹${r.summary.total_earnings||0} · Pending payout ₹${r.summary.pending_payout||0}</p></div><button class="primary" onclick="currentTab='rides';render()">Ride Requests</button></section><section class="summary earnings-summary"><div><b>₹${r.summary.total_earnings||0}</b><span>Total</span></div><div><b>₹${r.summary.pending_payout||0}</b><span>Pending</span></div><div><b>₹${r.summary.paid_payout||0}</b><span>Paid</span></div></section><section class="summary earnings-summary"><div><b>${r.summary.total_rides||0}</b><span>Rides</span></div><div><b>${r.summary.rating||5}⭐</b><span>Rating</span></div><div><b>₹${r.summary.platform_commission||0}</b><span>Commission</span></div></section><section class="card"><div class="section-title"><h2>Earning History</h2><button>${r.summary.total_rides||0}</button></div><div class="list">${rows}</div></section><section class="card settlement-card"><div class="section-title"><h2>Payout Settlement</h2><button>${(r.settlements||[]).length}</button></div><div class="list">${paidRows}</div></section>`)}catch(e){shell(`<section class="card"><div class="alert">${esc(e.message)}</div></section>`)}}
async function adminPaymentsView(){try{const r=await api('/admin/payments');let set={summary:{},drivers:[],settlements:[]};try{set=await api('/admin/settlements')}catch(e){}const pendingRows=(set.drivers||[]).map(x=>`<div class="row settlement-driver-row"><i>💸</i><div><b>${esc(x.driver_name||'Driver')} · ${esc(x.vehicle_no||'Toto')}</b><span>${esc(x.driver_mobile||'')} · ${x.rides||0} rides · Pending ₹${x.amount||0}</span></div><button class="primary mini-pay" onclick="adminMarkPayout('${x.driver_id}')">Mark Paid</button></div>`).join('')||`<div class="ok">No pending driver payout.</div>`;const rows=(r.rides||[]).slice(0,25).map(x=>`<div class="row"><i>🧾</i><div><b>${esc(x.driver_name||'Driver')} · ${esc(x.driver_vehicle_no||'Toto')}</b><span>${esc(x.pickup)} → ${esc(x.drop)} · Fare ₹${x.estimated_fare} · Driver ₹${x.driver_earning||0} · Commission ₹${x.platform_commission||0}</span></div><em>${x.settlement_status||'PENDING'}</em></div>`).join('')||`<div class="alert">Completed ride হলে payment report এখানে দেখাবে।</div>`;const paidRows=(set.settlements||[]).slice(0,10).map(x=>`<div class="row"><i>✅</i><div><b>Paid ₹${x.amount||0}</b><span>${(x.paid_at||'').slice(0,10)} · ${x.ride_count||0} rides · Ref: ${esc(x.payment_ref||'Manual')}</span></div><em>PAID</em></div>`).join('')||`<div class="alert">Settlement history empty.</div>`;shell(`<section class="hero-card"><div><span class="glow-chip">Payment Monitor</span><h2>₹${r.summary.total_fare||0}</h2><p>Driver payout ₹${r.summary.driver_payout||0} · Commission ₹${r.summary.platform_commission||0}</p></div><button class="primary" onclick="currentTab='home';render()">Dashboard</button></section><section class="summary earnings-summary"><div><b>${r.summary.completed||0}</b><span>Completed</span></div><div><b>₹${set.summary.pending_amount||r.summary.pending_payout||0}</b><span>Driver Due</span></div><div><b>₹${set.summary.paid_amount||0}</b><span>Paid</span></div></section><section class="card settlement-card"><div class="section-title"><h2>Driver Payout Settlement</h2><button>${set.summary.pending_drivers||0}</button></div><div class="list">${pendingRows}</div></section><section class="card"><div class="section-title"><h2>Completed Ride Payments</h2><button>${r.rides.length}</button></div><div class="list">${rows}</div></section><section class="card"><div class="section-title"><h2>Paid Settlement History</h2><button>${(set.settlements||[]).length}</button></div><div class="list">${paidRows}</div></section>`)}catch(e){shell(`<section class="card"><div class="alert">${esc(e.message)}</div></section>`)}}
async function adminMarkPayout(driverId){try{const ref=prompt('Payment reference / UPI txn ID লিখুন','Manual payout')||'Manual payout';await api(`/admin/settlements/${driverId}/pay`,{method:'POST',body:{payment_ref:ref,note:'Payout paid by admin'}});toast('Payout marked as PAID');adminPaymentsView()}catch(e){toast(e.message);adminPaymentsView()}}
function fareView(){const f=config?.fare_rules||{};shell(`<section class="card"><div class="section-title"><h2>${L('fareRules')}</h2><button>Kalna Sub-Division</button></div><div class="list"><div class="row"><i>🛺</i><div><b>${L('full')}</b><span>Minimum ₹${f.minimum_full||40} · first ${f.base_km||4} km base</span></div><em>›</em></div><div class="row"><i>🔁</i><div><b>${L('sharing')}</b><span>₹${f.sharing_base_per_seat||10} per seat · capacity ${f.sharing_capacity||4}</span></div><em>›</em></div><div class="row"><i>➕</i><div><b>Extra Fare</b><span>After ${f.base_km||4} km, every ${f.extra_step_km||2} km = ₹${f.extra_step_fare||5}</span></div><em>›</em></div><div class="row"><i>🔐</i><div><b>Payment Lock</b><span>Driver accept করলে passenger pay করবে, তারপর confirm</span></div><em>›</em></div></div></section><section class="card"><div class="section-title"><h2>${L('cashUpi')}</h2><button>QR</button></div><div class="qr-placeholder">PAY<br><small>Demo/Razorpay/Manual UPI ready</small></div></section><section class="card"><div class="section-title"><h2>Safety & Support</h2><button>24x7</button></div><div class="list"><a class="row link-row" href="tel:${config?.app_settings?.support_mobile||'9749983737'}"><i>☎</i><div><b>Call Support</b><span>${config?.app_settings?.support_mobile||'9749983737'}</span></div><em>›</em></a><div class="row"><i>🔗</i><div><b>Share Trip</b><span>Ride screen থেকে active trip share করা যাবে।</span></div><em>›</em></div></div></section>`)}

function fileToDataUrl(inputId){return new Promise(resolve=>{const el=$(inputId);const f=el&&el.files&&el.files[0];if(!f)return resolve('');const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>resolve('');reader.readAsDataURL(f);})}
function docThumb(data,label){if(!data)return `<div class="doc-thumb empty">${label}<br><small>Not uploaded</small></div>`;if(String(data).startsWith('data:image'))return `<img class="doc-thumb" src="${data}" alt="${label}">`;return `<div class="doc-thumb">${label}<br><small>${esc(String(data).slice(0,40))}</small></div>`}
async function driverKycView(){try{const r=await api('/driver/kyc');const k=r.kyc||{};const docs=(k.docs||[]).map(d=>`<div class="row"><i>${d.present?'✅':'⚠️'}</i><div><b>${esc(d.label)}</b><span>${d.present?'Uploaded/Entered':'Required'}</span></div><em>${d.present?'OK':'NEED'}</em></div>`).join('');shell(`<section class="hero-card"><div><span class="glow-chip">Driver KYC</span><h2>${esc(k.kyc_status||'INCOMPLETE')}</h2><p>${k.docs_present||0}/${k.docs_required||7} requirements complete · KYC complete + service area GPS হলে auto approve হবে।</p></div><button class="primary" onclick="currentTab='profile';render()">Profile</button></section><section class="summary earnings-summary"><div><b>${k.docs_present||0}</b><span>Present</span></div><div><b>${k.docs_required||7}</b><span>Required</span></div><div><b>${esc(k.profile_status||'PENDING')}</b><span>Status</span></div></section><section class="card"><div class="section-title"><h2>KYC Checklist</h2><button>${k.complete?'Complete':'Pending'}</button></div><div class="list">${docs}</div></section><section class="card"><div class="section-title"><h2>Submit Documents</h2><button>Demo Upload</button></div><p class="subtitle">Prototype-এ file data local DB-তে থাকে। Production-এ secure storage লাগবে।</p><label class="input-wrap"><i>🛺</i><input id="kycVehicleNo" placeholder="Toto Number" value="${esc(k.vehicle_no||driverProfile?.vehicle_no||'')}"></label><label class="input-wrap"><i>🔢</i><input id="kycAadhaarNo" placeholder="Aadhaar Number" value="${esc(k.aadhaar_no||driverProfile?.aadhaar_no||'')}"></label><label class="input-wrap"><i>🪪</i><input id="kycLicenseNo" placeholder="Driving Licence Number" value="${esc(k.license_no||driverProfile?.license_no||'')}"></label><div class="doc-grid"><label>Driver Photo<input id="kycDriverPhoto" type="file" accept="image/*"></label><label>Vehicle Photo<input id="kycVehiclePhoto" type="file" accept="image/*"></label><label>Aadhaar Photo<input id="kycAadhaarDoc" type="file" accept="image/*"></label><label>Licence Photo<input id="kycLicenseDoc" type="file" accept="image/*"></label></div><button class="primary" onclick="submitDriverKyc()">Submit KYC for Verification</button></section><section class="card"><div class="section-title"><h2>Current Documents</h2><button>Preview</button></div><div class="doc-preview-grid">${docThumb(k.driver_photo,'Driver Photo')}${docThumb(k.vehicle_photo,'Vehicle Photo')}${docThumb(k.aadhaar_doc,'Aadhaar')}${docThumb(k.license_doc,'Licence')}</div>${k.kyc_rejection_reason?`<div class="alert">Reject reason: ${esc(k.kyc_rejection_reason)}</div>`:''}</section>`)}catch(e){shell(`<section class="card"><div class="alert">${esc(e.message)}</div></section>`)}}
async function submitDriverKyc(){try{const body={vehicle_no:$('kycVehicleNo').value,aadhaar_no:$('kycAadhaarNo').value,license_no:$('kycLicenseNo').value,driver_photo:await fileToDataUrl('kycDriverPhoto'),vehicle_photo:await fileToDataUrl('kycVehiclePhoto'),aadhaar_doc:await fileToDataUrl('kycAadhaarDoc'),license_doc:await fileToDataUrl('kycLicenseDoc')};Object.keys(body).forEach(k=>{if(!body[k])delete body[k]});const r=await api('/driver/kyc',{method:'POST',body});driverProfile={...(driverProfile||{}), kyc_status:r.kyc?.kyc_status, status:r.kyc?.profile_status};toast('KYC submitted. GPS service area-এর ভিতরে থাকলে auto approve হবে।');driverKycView()}catch(e){toast(e.message)}}


async function supportView(){try{const d=await api('/support/tickets');const rides=await api('/rides');const rideOptions=(rides.rides||[]).map(r=>`<option value="${esc(r.id)}">${esc(r.pickup)} → ${esc(r.drop)} · ${esc(r.status)} · ₹${r.estimated_fare||0}</option>`).join('');const tickets=(d.tickets||[]).map(t=>`<div class="row"><i>🎫</i><div><b>${esc(t.subject)}</b><span>${esc(t.category)} · ${esc(t.status)} · ${(t.created_at||'').slice(0,16)}</span>${t.admin_response?`<small>Admin: ${esc(t.admin_response)}</small>`:''}</div><em>›</em></div>`).join('')||'<div class="alert">No support ticket yet.</div>';const refunds=(d.refunds||[]).map(r=>`<div class="row"><i>↩️</i><div><b>Refund ₹${r.amount||0}</b><span>${esc(r.status)} · ${esc(r.pickup)} → ${esc(r.drop)}</span>${r.admin_note?`<small>${esc(r.admin_note)}</small>`:''}</div><em>${esc(r.refund_ref||'')}</em></div>`).join('')||'<div class="alert">No refund request yet.</div>';shell(`<section class="hero-card"><div><span class="glow-chip">Support Center</span><h2>Complaint · Help · Refund</h2><p>রাইড সমস্যা, পেমেন্ট সমস্যা, driver/passenger complaint এখানে raise করুন।</p></div><button class="primary" onclick="currentTab='profile';render()">Profile</button></section><section class="summary"><div><b>${d.summary?.open_tickets||0}</b><span>Open Tickets</span></div><div><b>${d.summary?.open_refunds||0}</b><span>Open Refunds</span></div><div><b>24x7</b><span>Support</span></div></section><section class="card"><div class="section-title"><h2>Create Support Ticket</h2><button>Help</button></div><select id="supportRide" class="select"><option value="">General / No Ride</option>${rideOptions}</select><label class="input-wrap"><i>🏷️</i><input id="supportSubject" placeholder="Subject / সমস্যার বিষয়"></label><label class="input-wrap"><i>✍️</i><input id="supportMsg" placeholder="সমস্যার details লিখুন"></label><button class="primary" onclick="createSupportTicket()">Submit Ticket</button></section><section class="card"><div class="section-title"><h2>Request Refund</h2><button>Paid Ride</button></div><select id="refundRide" class="select"><option value="">Select paid ride</option>${rideOptions}</select><label class="input-wrap"><i>↩️</i><input id="refundReason" placeholder="Refund reason"></label><button class="primary" onclick="requestRefund()">Request Refund</button></section><section class="card"><div class="section-title"><h2>My Tickets</h2><button>${(d.tickets||[]).length}</button></div><div class="list">${tickets}</div></section><section class="card"><div class="section-title"><h2>Refund Requests</h2><button>${(d.refunds||[]).length}</button></div><div class="list">${refunds}</div></section>`)}catch(e){shell(`<section class="card"><div class="alert">${esc(e.message)}</div></section>`)}}
async function createSupportTicket(){try{await api('/support/tickets',{method:'POST',body:{ride_id:$('supportRide').value,subject:$('supportSubject').value,message:$('supportMsg').value,category:'GENERAL'}});toast('Support ticket submitted');supportView()}catch(e){toast(e.message)}}
async function requestRefund(){try{const id=$('refundRide').value;if(!id)return toast('Paid ride select করুন');await api(`/rides/${id}/refund-request`,{method:'POST',body:{reason:$('refundReason').value||'Refund requested'}});toast('Refund request submitted');supportView()}catch(e){toast(e.message)}}


async function installNexoApp(){
  try{
    if(deferredInstallPrompt){
      deferredInstallPrompt.prompt();
      const choice=await deferredInstallPrompt.userChoice.catch(()=>({outcome:'dismissed'}));
      deferredInstallPrompt=null;
      toast(choice.outcome==='accepted'?'App install শুরু হয়েছে':'Install পরে করতে পারবেন');
      return;
    }
    const isiOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
    toast(isiOS?'Safari Share → Add to Home Screen চাপুন':'Chrome menu ⋮ → Add to Home screen / Install app চাপুন');
  }catch(e){toast('Install menu থেকে Add to Home Screen করুন')}
}
async function clearAppCache(){
  try{
    if('serviceWorker' in navigator){const regs=await navigator.serviceWorker.getRegistrations();await Promise.all(regs.map(r=>r.update().catch(()=>{})));}
    if(window.caches){const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('nexo-ride-')).map(k=>caches.delete(k)));}
    toast('App cache clear হয়েছে. Refresh হচ্ছে...');
    setTimeout(()=>location.reload(),900);
  }catch(e){toast('Browser refresh করুন')}
}
function mobileHelpView(){
  shell(`<section class="hero-card"><div><span class="glow-chip">Mobile App Helper</span><h2>PWA Install · Cache Update</h2><p>Chrome থেকে Home Screen-এ add করলে app-এর মতো খুলবে। Layout ছোট screen অনুযায়ী auto-fit হবে।</p></div><button class="primary" onclick="installNexoApp()">Install App</button></section><section class="card"><div class="section-title"><h2>Mobile Quick Fix</h2><button>v1.0.46</button></div><div class="list"><div class="row" onclick="installNexoApp()"><i>⬇️</i><div><b>Install / Add to Home Screen</b><span>Android Chrome menu থেকেও install করা যাবে।</span></div><em>›</em></div><div class="row" onclick="clearAppCache()"><i>♻️</i><div><b>Clear App Cache</b><span>পুরনো design দেখালে এখানে চাপুন।</span></div><em>›</em></div><div class="row"><i>📱</i><div><b>Responsive Mode</b><span>Bottom menu swipe, safe bottom padding, compact cards enabled.</span></div><em>OK</em></div></div></section>`)
}

function profileView(){const st=config?.app_settings||{};shell(`<section class="card"><div class="section-title"><h2>${L('myprof')}</h2><button>${roleMode==='ADMIN'?'ADMIN':roleMode==='DRIVER'?L('drv'):L('pass')}</button></div><div class="list"><div class="row"><i>👤</i><div><b>${esc(me.name)}</b><span>${esc(me.mobile)} · ${esc(me.email||L('noemail'))}</span></div><em>›</em></div>${driverProfile?`<div class="row"><i>🛺</i><div><b>${esc(driverProfile.vehicle_no||L('veh'))}</b><span>${driverProfile.status} · KYC ${driverProfile.kyc_status||'INCOMPLETE'} · ${driverProfile.online?'Online':'Offline'}</span></div><em>›</em></div><div class="row" onclick="currentTab='kyc';render()"><i>🪪</i><div><b>Driver KYC / Documents</b><span>Aadhaar, licence, photo, vehicle photo upload/submit</span></div><em>›</em></div>`:''}<div class="row" onclick="currentTab='notifications';render()"><i>🔔</i><div><b>Notification Center</b><span>Ride request, payment, SOS alert</span></div><em>›</em></div><div class="row" onclick="enableBrowserNotifications()"><i>📲</i><div><b>Enable Push / Register Device</b><span>এই mobile device notification token admin panel-এ দেখাবে</span></div><em>›</em></div><div class="row" onclick="currentTab='support';render()"><i>🆘</i><div><b>Support / Complaint / Refund</b><span>${esc(st.support_mobile||'9749983737')} · ${esc(st.support_email||'babairoykalma@gmail.com')}</span></div><em>›</em></div>${roleMode!=='ADMIN'?`<div class="row" onclick="switchRole()"><i>🔄</i><div><b>${L('switch')}</b><span>${L('oneapk')}</span></div><em>›</em></div>`:''}<div class="row" onclick="installNexoApp()"><i>⬇️</i><div><b>Install App / Home Screen</b><span>Chrome থেকে app-এর মতো চালু করুন</span></div><em>›</em></div><div class="row" onclick="clearAppCache()"><i>♻️</i><div><b>Clear Cache / Update App</b><span>পুরনো UI দেখালে এখানে চাপুন</span></div><em>›</em></div><div class="row" onclick="languageView()"><i>🌐</i><div><b>${L('changeLang')}</b><span>${L('choose')}</span></div><em>›</em></div><div class="row" onclick="toggleEasy()"><i>🧩</i><div><b>${L('easy')}</b><span>${easyMode?'ON':'OFF'}</span></div><em>›</em></div></div><br><button class="primary" onclick="logout()">${L('logout')}</button></section>`)}
async function switchRole(){try{const next=roleMode==='DRIVER'?'PASSENGER':'DRIVER';await api('/me/role',{method:'POST',body:{role:next}});roleMode=next;localStorage.setItem('nexoRideRole',next);await loadMe();currentTab='home';render()}catch(e){toast(e.message)}}
function boot(){try{if(IS_ADMIN_WEB)return render().catch(showAppError);const q=new URLSearchParams(location.search);const sc=q.get('shortcut');if(sc==='rides')currentTab='rides';if(sc==='support')currentTab='support';if(sc==='book')currentTab='home';splashView();setTimeout(()=>{render().then(()=>{if(sc==='book')setTimeout(()=>openBookingSheet(),350)}).catch(showAppError)},2350);setTimeout(()=>{try{if(!app.innerHTML.trim()) languageView();}catch(e){}},4800)}catch(e){showAppError(e)}}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e});window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;toast('NEXO Ride installed')});window.addEventListener('load',boot);if('serviceWorker'in navigator){navigator.serviceWorker.getRegistrations?.().then(rs=>rs.forEach(r=>r.update()));!IS_ADMIN_WEB&&navigator.serviceWorker.register('/app/sw.js?v=sprint5b-modern-ui-20260707').catch(()=>{})}

// v1.0.50 V51 - Driver KYC submit visibility + review fix overrides
function kycFileLabel(inputId){const el=$(inputId);const f=el&&el.files&&el.files[0];return f?`${f.name} · ${Math.round(f.size/1024)} KB`:'No file selected'}
function showKycFileNames(){['kycDriverPhoto','kycVehiclePhoto','kycAadhaarDoc','kycLicenseDoc'].forEach(id=>{const out=$(id+'Name'); if(out) out.textContent=kycFileLabel(id);});}
function compressImageFile(file, maxSide=1400, quality=.78){return new Promise(resolve=>{try{if(!file || !String(file.type||'').startsWith('image/')) return resolve(null);const img=new Image();const reader=new FileReader();reader.onload=()=>{img.onload=()=>{let w=img.width,h=img.height;const scale=Math.min(1,maxSide/Math.max(w,h));w=Math.round(w*scale);h=Math.round(h*scale);const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,w,h);resolve(canvas.toDataURL('image/jpeg',quality));};img.onerror=()=>resolve(null);img.src=String(reader.result||'');};reader.onerror=()=>resolve(null);reader.readAsDataURL(file);}catch(e){resolve(null)}})}
function fileToDataUrl(inputId){return new Promise(resolve=>{const el=$(inputId);const f=el&&el.files&&el.files[0];if(!f)return resolve('');if(f.size>10*1024*1024){toast('File too large. 10 MB এর কম ছবি দিন');return resolve('')}if(String(f.type||'').startsWith('image/')){compressImageFile(f).then(v=>{if(v)return resolve(v);const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>resolve('');reader.readAsDataURL(f);});return;}const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>resolve('');reader.readAsDataURL(f);})}
function docThumb(data,label){if(!data)return `<div class="doc-thumb empty">${label}<br><small>Not uploaded</small></div>`;const s=String(data);if(s.startsWith('data:image')||s.startsWith('/api/files/'))return `<a href="${esc(s)}" target="_blank"><img class="doc-thumb" src="${esc(s)}" alt="${label}"></a>`;return `<div class="doc-thumb">${label}<br><small>${esc(s.slice(0,40))}</small></div>`}
async function driverKycView(){try{const r=await api('/driver/kyc');const k=r.kyc||{};const docs=(k.docs||[]).map(d=>`<div class="row"><i>${d.present?'✅':'⚠️'}</i><div><b>${esc(d.label)}</b><span>${d.present?'Submitted/Entered':'Required'}${d.size_bytes?` · ${Math.round(d.size_bytes/1024)} KB`:''}</span></div><em>${d.present?'OK':'NEED'}</em></div>`).join('');const statusColor=k.review_status==='UNDER_ADMIN_REVIEW'||k.kyc_status==='SUBMITTED'?'ok':k.kyc_status==='REJECTED'?'alert':'voice-help';shell(`<section class="hero-card"><div><span class="glow-chip">Driver KYC</span><h2>${esc(k.kyc_status||'INCOMPLETE')}</h2><p>${k.docs_present||0}/${k.docs_required||7} requirements complete · ${esc(k.review_label||'KYC complete + service area GPS হলে auto approve হবে।')}</p></div><button class="primary" onclick="currentTab='profile';render()">Profile</button></section><section class="${statusColor}"><b>Review Status:</b> ${esc(k.review_label||'Not submitted yet')}<br><small>Last submit: ${k.kyc_submitted_at?esc(String(k.kyc_submitted_at).slice(0,19)):'Not submitted'} ${k.last_submission_message?' · '+esc(k.last_submission_message):''}</small></section><section class="summary earnings-summary"><div><b>${k.docs_present||0}</b><span>Present</span></div><div><b>${k.docs_required||7}</b><span>Required</span></div><div><b>${esc(k.profile_status||'PENDING')}</b><span>Status</span></div></section><section class="card"><div class="section-title"><h2>KYC Checklist</h2><button>${k.complete?'Ready':'Pending'}</button></div><div class="list">${docs}</div></section><section class="card"><div class="section-title"><h2>Submit / Update Documents</h2><button onclick="showKycFileNames()">Check Files</button></div><p class="subtitle">ছবি select করার পর নিচে file name দেখাবে। Submit চাপার পর সবুজ confirmation দেখাবে এবং GPS service area-এর ভিতরে থাকলে auto approve হবে।</p><label class="input-wrap"><i>🛺</i><input id="kycVehicleNo" placeholder="Toto Number" value="${esc(k.vehicle_no||driverProfile?.vehicle_no||'')}"></label><label class="input-wrap"><i>🔢</i><input id="kycAadhaarNo" placeholder="Aadhaar Number" value="${esc(k.aadhaar_no||driverProfile?.aadhaar_no||'')}"></label><label class="input-wrap"><i>🪪</i><input id="kycLicenseNo" placeholder="Driving Licence Number" value="${esc(k.license_no||driverProfile?.license_no||'')}"></label><div class="doc-grid kyc-upload-grid"><label>Driver Photo<input id="kycDriverPhoto" onchange="showKycFileNames()" type="file" accept="image/*"><small id="kycDriverPhotoName">${k.driver_photo?'Already submitted':'No file selected'}</small></label><label>Vehicle/Toto Photo<input id="kycVehiclePhoto" onchange="showKycFileNames()" type="file" accept="image/*"><small id="kycVehiclePhotoName">${k.vehicle_photo?'Already submitted':'No file selected'}</small></label><label>Aadhaar Photo<input id="kycAadhaarDoc" onchange="showKycFileNames()" type="file" accept="image/*"><small id="kycAadhaarDocName">${k.aadhaar_doc?'Already submitted':'No file selected'}</small></label><label>Licence Photo<input id="kycLicenseDoc" onchange="showKycFileNames()" type="file" accept="image/*"><small id="kycLicenseDocName">${k.license_doc?'Already submitted':'No file selected'}</small></label></div><button id="kycSubmitBtn" class="primary" onclick="submitDriverKyc()">Submit KYC & Auto Approve</button><div id="kycSubmitResult"></div></section><section class="card"><div class="section-title"><h2>Current Documents / Preview</h2><button onclick="driverKycView()">Refresh</button></div><div class="doc-preview-grid">${docThumb(k.driver_photo,'Driver Photo')}${docThumb(k.vehicle_photo,'Vehicle Photo')}${docThumb(k.aadhaar_doc,'Aadhaar')}${docThumb(k.license_doc,'Licence')}</div>${k.kyc_rejection_reason?`<div class="alert">Reject reason: ${esc(k.kyc_rejection_reason)}</div>`:''}</section>`)}catch(e){shell(`<section class="card"><div class="alert">${esc(e.message)}</div></section>`)}}
async function submitDriverKyc(){try{const btn=$('kycSubmitBtn');if(btn){btn.disabled=true;btn.textContent='Uploading / Submitting...';}const body={vehicle_no:$('kycVehicleNo').value.trim(),aadhaar_no:$('kycAadhaarNo').value.trim(),license_no:$('kycLicenseNo').value.trim(),driver_photo:await fileToDataUrl('kycDriverPhoto'),vehicle_photo:await fileToDataUrl('kycVehiclePhoto'),aadhaar_doc:await fileToDataUrl('kycAadhaarDoc'),license_doc:await fileToDataUrl('kycLicenseDoc')};Object.keys(body).forEach(k=>{if(!body[k])delete body[k]});if(!body.vehicle_no||!body.aadhaar_no||!body.license_no){throw new Error('Toto number, Aadhaar number এবং Licence number দিতে হবে')}const r=await api('/driver/kyc',{method:'POST',body});driverProfile={...(driverProfile||{}), kyc_status:r.kyc?.kyc_status, status:r.kyc?.profile_status, vehicle_no:r.kyc?.vehicle_no};const msg=r.message||'KYC submitted. GPS service area-এর ভিতরে থাকলে auto approve হবে।';const result=$('kycSubmitResult');if(result)result.innerHTML=`<div class="ok" style="margin-top:10px"><b>Submitted Successfully</b><br>${esc(msg)}<br><small>${r.kyc?.docs_present||0}/${r.kyc?.docs_required||7} documents present</small></div>`;toast('KYC Submitted');setTimeout(driverKycView,900)}catch(e){const result=$('kycSubmitResult');if(result)result.innerHTML=`<div class="alert" style="margin-top:10px">${esc(e.message)}</div>`;toast(e.message)}finally{const btn=$('kycSubmitBtn');if(btn){btn.disabled=false;btn.textContent='Submit KYC & Auto Approve';}}}


// v2.0 Sprint-1 - KYC Camera + Gallery/File Upload Permission Ready
const KYC_DOCS_V2 = [
  {key:'driver_photo', title:'Driver Photo / চালকের ছবি', base:'kycDriverPhoto', existing:'driver_photo', accept:'image/*', required:true},
  {key:'vehicle_photo', title:'Toto / Vehicle Photo', base:'kycVehiclePhoto', existing:'vehicle_photo', accept:'image/*', required:true},
  {key:'aadhaar_doc', title:'Aadhaar Photo / PDF', base:'kycAadhaarDoc', existing:'aadhaar_doc', accept:'image/*,application/pdf,.pdf', required:true},
  {key:'license_doc', title:'Driving Licence Photo / PDF', base:'kycLicenseDoc', existing:'license_doc', accept:'image/*,application/pdf,.pdf', required:true}
];
function kycSelectedFile(base){
  const cam=$(base+'Camera'), file=$(base+'File'), legacy=$(base);
  return (cam&&cam.files&&cam.files[0]) || (file&&file.files&&file.files[0]) || (legacy&&legacy.files&&legacy.files[0]) || null;
}
function kycFileLabel(base){const f=kycSelectedFile(base);return f?`${f.name} · ${Math.round(f.size/1024)} KB`:'No file selected'}
function showKycFileNames(){KYC_DOCS_V2.forEach(d=>{const out=$(d.base+'Name'); if(out) out.textContent=kycFileLabel(d.base);});}
function kycUploadControl(doc, already){
  const base=doc.base;
  const title=esc(doc.title);
  return `<div class="kyc-upload-card">
    <b>${title}</b>
    <small id="${base}Name">${already?'Already submitted · নতুন ছবি দিলে replace হবে':'No file selected'}</small>
    <div class="kyc-upload-actions">
      <label class="kyc-upload-btn camera">📷 Camera<input id="${base}Camera" type="file" accept="image/*" capture="environment" onchange="showKycFileNames()"></label>
      <label class="kyc-upload-btn file">🖼️ Gallery / File<input id="${base}File" type="file" accept="${esc(doc.accept)}" onchange="showKycFileNames()"></label>
    </div>
  </div>`;
}
function fileObjToDataUrl(file){return new Promise(resolve=>{try{if(!file)return resolve('');if(file.size>10*1024*1024){toast('File too large. 10 MB এর কম file দিন');return resolve('')}if(String(file.type||'').startsWith('image/')){compressImageFile(file).then(v=>{if(v)return resolve(v);const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>resolve('');reader.readAsDataURL(file);});return;}const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>resolve('');reader.readAsDataURL(file);}catch(e){resolve('')}})}
function fileToDataUrl(inputId){return fileObjToDataUrl(kycSelectedFile(inputId) || ($(inputId)?.files?.[0]));}
function docThumb(data,label){if(!data)return `<div class="doc-thumb empty">${esc(label)}<br><small>Not uploaded</small></div>`;const s=String(data);if(s.startsWith('data:image')||s.startsWith('/api/files/'))return `<a href="${esc(s)}" target="_blank"><img class="doc-thumb" src="${esc(s)}" alt="${esc(label)}"></a>`;if(s.toLowerCase().includes('.pdf')||s.startsWith('data:application/pdf'))return `<a class="doc-thumb doc-pdf" href="${esc(s)}" target="_blank">📄<br><small>${esc(label)}</small></a>`;return `<div class="doc-thumb">${esc(label)}<br><small>${esc(s.slice(0,40))}</small></div>`}
async function requestKycPermissions(){
  try{
    if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia){
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
      stream.getTracks().forEach(t=>t.stop());
      toast('Camera permission ready');
    }else{
      toast('Camera/file chooser খুলে permission দিন');
    }
  }catch(e){toast('Camera permission না দিলে Gallery/File option ব্যবহার করুন')}
}
async function driverKycView(){try{const r=await api('/driver/kyc');const k=r.kyc||{};const docs=(k.docs||[]).map(d=>`<div class="row"><i>${d.present?'✅':'⚠️'}</i><div><b>${esc(d.label)}</b><span>${d.present?'Submitted/Entered':'Required'}${d.size_bytes?` · ${Math.round(d.size_bytes/1024)} KB`:''}</span></div><em>${d.present?'OK':'NEED'}</em></div>`).join('');const statusColor=k.review_status==='UNDER_ADMIN_REVIEW'||k.kyc_status==='SUBMITTED'?'ok':k.kyc_status==='REJECTED'?'alert':'voice-help';const uploadCards=KYC_DOCS_V2.map(d=>kycUploadControl(d,!!k[d.existing])).join('');shell(`<section class="hero-card"><div><span class="glow-chip">Driver KYC</span><h2>${esc(k.kyc_status||'INCOMPLETE')}</h2><p>${k.docs_present||0}/${k.docs_required||7} requirements complete · ${esc(k.review_label||'KYC complete + service area GPS হলে auto approve হবে।')}</p></div><button class="primary" onclick="currentTab='profile';render()">Profile</button></section><section class="${statusColor}"><b>Review Status:</b> ${esc(k.review_label||'Not submitted yet')}<br><small>Last submit: ${k.kyc_submitted_at?esc(String(k.kyc_submitted_at).slice(0,19)):'Not submitted'} ${k.last_submission_message?' · '+esc(k.last_submission_message):''}</small></section><section class="summary earnings-summary"><div><b>${k.docs_present||0}</b><span>Present</span></div><div><b>${k.docs_required||7}</b><span>Required</span></div><div><b>${esc(k.profile_status||'PENDING')}</b><span>Status</span></div></section><section class="card"><div class="section-title"><h2>KYC Checklist</h2><button>${k.complete?'Ready':'Pending'}</button></div><div class="list">${docs}</div></section><section class="card"><div class="section-title"><h2>Camera / File Upload</h2><button onclick="requestKycPermissions()">Allow Camera</button></div><p class="subtitle">প্রতিটি document-এর জন্য Camera দিয়ে ছবি তুলতে পারবেন অথবা Gallery/File থেকে upload করতে পারবেন। APK প্রথমবার Camera/Photos permission চাইলে Allow দিন।</p><label class="input-wrap"><i>🛺</i><input id="kycVehicleNo" placeholder="Toto Number" value="${esc(k.vehicle_no||driverProfile?.vehicle_no||'')}"></label><label class="input-wrap"><i>🔢</i><input id="kycAadhaarNo" placeholder="Aadhaar Number" value="${esc(k.aadhaar_no||driverProfile?.aadhaar_no||'')}"></label><label class="input-wrap"><i>🪪</i><input id="kycLicenseNo" placeholder="Driving Licence Number" value="${esc(k.license_no||driverProfile?.license_no||'')}"></label><div class="doc-grid kyc-upload-grid">${uploadCards}</div><button id="kycSubmitBtn" class="primary" onclick="submitDriverKyc()">Submit KYC & Auto Approve</button><div id="kycSubmitResult"></div></section><section class="card"><div class="section-title"><h2>Current Documents / Preview</h2><button onclick="driverKycView()">Refresh</button></div><div class="doc-preview-grid">${docThumb(k.driver_photo,'Driver Photo')}${docThumb(k.vehicle_photo,'Vehicle Photo')}${docThumb(k.aadhaar_doc,'Aadhaar')}${docThumb(k.license_doc,'Licence')}</div>${k.kyc_rejection_reason?`<div class="alert">Reject reason: ${esc(k.kyc_rejection_reason)}</div>`:''}</section>`)}catch(e){shell(`<section class="card"><div class="alert">${esc(e.message)}</div></section>`)}}
async function submitDriverKyc(){try{const btn=$('kycSubmitBtn');if(btn){btn.disabled=true;btn.textContent='Uploading / Submitting...';}const body={vehicle_no:$('kycVehicleNo').value.trim(),aadhaar_no:$('kycAadhaarNo').value.trim(),license_no:$('kycLicenseNo').value.trim(),driver_photo:await fileToDataUrl('kycDriverPhoto'),vehicle_photo:await fileToDataUrl('kycVehiclePhoto'),aadhaar_doc:await fileToDataUrl('kycAadhaarDoc'),license_doc:await fileToDataUrl('kycLicenseDoc')};Object.keys(body).forEach(k=>{if(!body[k])delete body[k]});if(!body.vehicle_no||!body.aadhaar_no||!body.license_no){throw new Error('Toto number, Aadhaar number এবং Licence number দিতে হবে')}const r=await api('/driver/kyc',{method:'POST',body});driverProfile={...(driverProfile||{}), kyc_status:r.kyc?.kyc_status, status:r.kyc?.profile_status, vehicle_no:r.kyc?.vehicle_no};const msg=r.message||'KYC submitted. GPS service area-এর ভিতরে থাকলে auto approve হবে।';const result=$('kycSubmitResult');if(result)result.innerHTML=`<div class="ok" style="margin-top:10px"><b>Submitted Successfully</b><br>${esc(msg)}<br><small>${r.kyc?.docs_present||0}/${r.kyc?.docs_required||7} documents present</small></div>`;toast('KYC Submitted');setTimeout(driverKycView,900)}catch(e){const result=$('kycSubmitResult');if(result)result.innerHTML=`<div class="alert" style="margin-top:10px">${esc(e.message)}</div>`;toast(e.message)}finally{const btn=$('kycSubmitBtn');if(btn){btn.disabled=false;btn.textContent='Submit KYC & Auto Approve';}}}


// v2.0 Sprint-1E - KYC Auto Approval by Service Area GPS
function getCurrentGpsForKyc(){
  return new Promise(resolve=>{
    try{
      if(!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(pos=>{
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy||0),
          source: 'KYC_AUTO_APPROVAL_GPS'
        });
      }, err=>{
        toast('GPS permission না দিলে auto approve হবে না');
        resolve(null);
      }, {enableHighAccuracy:true, timeout:12000, maximumAge:30000});
    }catch(e){resolve(null)}
  });
}
async function requestKycPermissions(){
  try{
    if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia){
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
      stream.getTracks().forEach(t=>t.stop());
    }
    const gps=await getCurrentGpsForKyc();
    toast(gps?'Camera + GPS permission ready':'Camera ready. GPS allow করলে auto approve হবে');
  }catch(e){toast('Permission না দিলে Camera/File বা Auto approval সমস্যা হতে পারে')}
}
async function submitDriverKyc(){
  try{
    const btn=$('kycSubmitBtn');
    if(btn){btn.disabled=true;btn.textContent='Uploading + GPS checking...';}
    const gps=await getCurrentGpsForKyc();
    const body={
      vehicle_no:$('kycVehicleNo').value.trim(),
      aadhaar_no:$('kycAadhaarNo').value.trim(),
      license_no:$('kycLicenseNo').value.trim(),
      driver_photo:await fileToDataUrl('kycDriverPhoto'),
      vehicle_photo:await fileToDataUrl('kycVehiclePhoto'),
      aadhaar_doc:await fileToDataUrl('kycAadhaarDoc'),
      license_doc:await fileToDataUrl('kycLicenseDoc')
    };
    if(gps){body.lat=gps.lat; body.lng=gps.lng; body.accuracy=gps.accuracy; body.location_source=gps.source;}
    Object.keys(body).forEach(k=>{if(body[k]===undefined||body[k]===null||body[k]==='')delete body[k]});
    if(!body.vehicle_no||!body.aadhaar_no||!body.license_no){throw new Error('Toto number, Aadhaar number এবং Licence number দিতে হবে')}
    const r=await api('/driver/kyc',{method:'POST',body});
    driverProfile={...(driverProfile||{}), kyc_status:r.kyc?.kyc_status, status:r.kyc?.profile_status, vehicle_no:r.kyc?.vehicle_no};
    const auto=r.auto_approval||{};
    const msg=r.message|| (auto.auto_approved?'KYC auto approved. এখন Go Online করতে পারবেন।':'KYC submitted. GPS service area-এর ভিতরে থাকলে auto approve হবে।');
    const result=$('kycSubmitResult');
    if(result)result.innerHTML=`<div class="${auto.auto_approved?'ok':'voice-help'}" style="margin-top:10px"><b>${auto.auto_approved?'Auto Approved ✅':'Submitted ✅'}</b><br>${esc(msg)}<br><small>${r.kyc?.docs_present||0}/${r.kyc?.docs_required||7} requirements present${gps?' · GPS checked':' · GPS not available'}</small></div>`;
    toast(auto.auto_approved?'KYC Auto Approved':'KYC Submitted');
    setTimeout(driverKycView,900);
  }catch(e){
    const result=$('kycSubmitResult');
    if(result)result.innerHTML=`<div class="alert" style="margin-top:10px">${esc(e.message)}</div>`;
    toast(e.message)
  }finally{
    const btn=$('kycSubmitBtn');
    if(btn){btn.disabled=false;btn.textContent='Submit KYC & Auto Approve';}
  }
}

// v2.0 Sprint-2 - Passenger Booking + Nearby Driver Matching Server Update overrides
try { window.NEXO_RIDE_SPRINT2 = true; } catch(e) {}
let rideListPollTimerV2=null;
function stopRideListPollV2(){ if(rideListPollTimerV2){ clearInterval(rideListPollTimerV2); rideListPollTimerV2=null; } }
function rideStatusText(s){return {REQUESTED:'চালক খোঁজা হচ্ছে',DRIVER_ACCEPTED:'চালক গ্রহণ করেছে - ৩ মিনিটের মধ্যে Pay করুন',PAYMENT_TIMEOUT:'Payment time শেষ - নতুন booking করুন',CONFIRMED:'Payment done - Driver pickup আসছে। OTP প্রস্তুত',ARRIVED:'Driver pickup-এ পৌঁছেছে - OTP বলুন',STARTED:'OTP verified - Ride চলছে',COMPLETED:'Ride complete',CANCELLED:'Cancelled',WAITING_FOR_DRIVER:'চালক অপেক্ষমান',NO_DRIVER_ACCEPTED:'চালক পাওয়া যায়নি'}[s]||s}
function rideProgressPct(s){return {REQUESTED:18,DRIVER_ACCEPTED:36,PAYMENT_TIMEOUT:100,CONFIRMED:58,ARRIVED:74,STARTED:90,COMPLETED:100,CANCELLED:100,WAITING_FOR_DRIVER:22,NO_DRIVER_ACCEPTED:100}[s]||12}
function candidateText(r){
  if(r.status!=='REQUESTED') return '';
  const n=Number(r.nearby_driver_count||r.driver_candidate_count||0);
  if(n>0) return `<div class="matching-chip">📡 ${n} জন nearby online driver-কে request পাঠানো হয়েছে${r.match_radius_km?` · ${r.match_radius_km} km`:''}</div>`;
  return `<div class="matching-chip warn">⚠️ এখন nearby online driver নেই। Driver online হলে request দেখাবে।</div>`;
}
async function requestRide(){
  try{
    if(!booking.pickup||!booking.drop)return toast(L('selectFirst'));
    const g=await getDeviceLocation(booking.pickup);
    const r=await api('/rides',{method:'POST',body:{pickup:booking.pickup,drop:booking.drop,ride_type:activeRideType,seats:activeSeats,...g}});
    closeSheet();
    const n=r.matching?.candidate_count ?? r.ride?.nearby_driver_count ?? 0;
    toast(n>0?`Request sent to ${n} nearby driver`:'Booking saved, but nearby online driver নেই');
    currentTab='rides';
    render();
  }catch(e){toast(e.message)}
}
async function ridesView(){
  try{
    stopRideListPollV2();
    const r=await api('/rides?role='+roleMode+'&t='+Date.now());
    const rows=r.rides.map(rideRow).join('')||`<div class="alert">${roleMode==='DRIVER'?'নতুন ride request নেই। Online থাকুন।':L('norides')}</div>`;
    const flow=`<div class="status-flow ride-flow"><span>Request</span><span>Match</span><span>Accept</span><span>Pay</span><span>OTP</span><span>Complete</span></div>`;
    const topNote=roleMode==='DRIVER'?`<section class="voice-help"><button>📡 Live</button><span>আপনি Online থাকলে শুধু আপনার nearby/candidate ride request এখানে দেখাবে। Accept না করলে Reject করতে পারবেন।</span></section>`:`<section class="voice-help"><button>📍 Booking</button><span>Passenger booking দিলে nearby online approved driver-দের কাছে request যাবে। Driver accept করলে Pay button আসবে।</span></section>`;
    shell(`${topNote}<section class="card"><div class="section-title"><h2>${roleMode==='DRIVER'?L('req'):L('myrides')}</h2><button onclick="ridesView()">Refresh · ${r.rides.length}</button></div>${flow}<div class="list">${rows}</div></section>`);
    startRideTimer();
    if(currentTab==='rides') rideListPollTimerV2=setInterval(()=>{ if(currentTab==='rides') ridesView().catch(()=>{}); else stopRideListPollV2(); }, 12000);
  }catch(e){shell(`<section class="card"><div class="alert">${esc(e.message)}</div></section>`)}
}
function rideRow(r){
  const isDriver=roleMode==='DRIVER';
  const isPassenger=roleMode==='PASSENGER';
  let actions='';
  if(isDriver && r.status==='REQUESTED') actions=`<div class="ride-action-stack"><button class="ghost big-action" onclick="rideAction('${r.id}','reject')">✖ Reject</button><button class="primary big-action" onclick="rideAction('${r.id}','accept')">✅ ${L('accept')}</button></div>`;
  else if(isPassenger&&r.status==='DRIVER_ACCEPTED') actions=`<button class="primary mini-pay" onclick="rideAction('${r.id}','pay')">💳 Pay Now</button>`;
  else if(isDriver&&r.status==='CONFIRMED') actions=`<button class="ghost big-action" onclick="rideAction('${r.id}','arrive')">📍 Reached Pickup</button>`;
  else if(isDriver&&r.status==='ARRIVED') actions=`<div class="otp-start-box"><input id="otp-${r.id}" inputmode="numeric" maxlength="4" placeholder="Passenger OTP"><button class="ghost big-action" onclick="rideAction('${r.id}','start')">▶️ ${L('start')}</button></div>`;
  else if(isDriver&&r.status==='STARTED') actions=`<button class="ghost big-action" onclick="rideAction('${r.id}','complete')">🏁 ${L('complete')}</button>`;
  else if(isPassenger&&r.status==='COMPLETED'&&!r.rating_by_passenger) actions=`<button class="primary mini-pay" onclick="rateRide('${r.id}')">⭐ Rate</button>`;
  else actions=`<em>›</em>`;
  const seatTxt=r.ride_type==='SHARING'?` · ${r.seats||1} seat`:'';
  const driverTxt=r.driver_name?` · Driver: ${esc(r.driver_name)} ${r.driver_vehicle_no?`(${esc(r.driver_vehicle_no)})`:''}`:'';
  const distTxt=(isDriver&&r.distance_to_pickup_km)?` · Pickup ${r.distance_to_pickup_km} km`:'';
  return `<div class="row ride-row ride-row-${esc(r.status)}"><i>🛺</i><div><b>${esc(r.pickup)} → ${esc(r.drop)}</b><span><b class="status-pill">${rideStatusText(r.status)}</b> · ${esc(r.ride_type||'FULL')}${seatTxt} · ₹${r.estimated_fare}${distTxt}${r.driver_earning?` · Driver ₹${r.driver_earning}`:''}${r.rating_by_passenger?` · ${r.rating_by_passenger}⭐`:''}${driverTxt}</span>${candidateText(r)}${timerHtml(r)}${safetyActions(r)}<div class="ride-progress"><b style="width:${rideProgressPct(r.status)}%"></b></div></div>${actions}</div>`
}
async function rideAction(id,action){
  try{
    const body={};
    if(action==='start'){
      const otp=$(`otp-${id}`)?.value.trim();
      if(!otp)return toast('Passenger OTP দিন');
      body.otp=otp;
    }
    if(action==='pay'){
      const p=await api('/payments/create-order',{method:'POST',body:{ride_id:id}});
      let ref='DEMO-'+Date.now();
      if(p.payment?.provider==='MANUAL_QR') ref=prompt(`UPI payment reference দিন\nUPI: ${p.payment.manual_upi_id||'not set'}`,ref)||ref;
      else if(p.payment?.provider==='RAZORPAY') ref=prompt('Razorpay payment id / UPI reference দিন',ref)||ref;
      await api(`/payments/${p.order.id}/verify`,{method:'POST',body:{transaction_id:ref,payment_method:p.payment?.methods?.[0]||'DEMO_PAYMENT'}});
      toast('Payment verified - Booking confirmed. OTP generated');
      return ridesView();
    }
    await api(`/rides/${id}/${action}`,{method:'POST',body});
    toast(action==='accept'?'Ride accepted. Passenger-কে payment করতে বলা হয়েছে।':action==='reject'?'Ride request rejected':action==='arrive'?'Passenger notified: Driver reached pickup':action==='start'?'OTP verified - Ride started':action==='complete'?'Ride completed':'Ride updated');
    ridesView();
  }catch(e){toast(e.message);ridesView()}
}


// v2.0 Sprint-3 - Live Ride OTP + Tracking + Safer Ride Flow (Server Update Only)
try { window.NEXO_RIDE_SPRINT3 = true; } catch(e) {}
function coordLink(lat,lng,label='Location'){
  if(!lat||!lng) return '';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(String(lat)+','+String(lng))}`;
}
function navLinkFromRide(r,to='pickup'){
  const lat = to==='drop' ? (r.drop_lat||r.drop_coords?.lat) : (r.pickup_lat||r.pickup_coords?.lat);
  const lng = to==='drop' ? (r.drop_lng||r.drop_coords?.lng) : (r.pickup_lng||r.pickup_coords?.lng);
  if(lat&&lng) return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(String(lat)+','+String(lng))}&travelmode=driving`;
  const place = to==='drop' ? r.drop : r.pickup;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place||'Kalna')}`;
}
function liveTrackingBox(r){
  const active=['DRIVER_ACCEPTED','CONFIRMED','ARRIVED','STARTED'].includes(String(r.status||''));
  if(!active) return '';
  const driverSeen=r.driver_last_seen_at?String(r.driver_last_seen_at).slice(11,19):'pending';
  const otp = (roleMode==='PASSENGER' && r.ride_otp && ['CONFIRMED','ARRIVED'].includes(r.status)) ? `<div class="ride-otp-card"><b>Ride Start OTP</b><strong>${esc(r.ride_otp)}</strong><small>Driver pickup-এ এলে এই OTP বলবেন।</small></div>` : '';
  const callDriver = (roleMode==='PASSENGER' && r.driver_mobile) ? `<a class="ride-mini-btn" href="tel:${esc(r.driver_mobile)}">📞 Driver Call</a>` : '';
  const callPassenger = (roleMode==='DRIVER' && r.passenger_mobile) ? `<a class="ride-mini-btn" href="tel:${esc(r.passenger_mobile)}">📞 Passenger Call</a>` : '';
  const nav = roleMode==='DRIVER' ? `<a class="ride-mini-btn" target="_blank" href="${navLinkFromRide(r,r.status==='STARTED'?'drop':'pickup')}">🧭 Navigate</a>` : `<a class="ride-mini-btn" target="_blank" href="${navLinkFromRide(r,'pickup')}">📍 Pickup Map</a>`;
  const liveText = r.driver_lat&&r.driver_lng ? `Driver GPS: ${Number(r.driver_lat).toFixed(5)}, ${Number(r.driver_lng).toFixed(5)} · ${driverSeen}` : `Driver GPS updating...`;
  return `<div class="live-ride-box"><div><b>📡 Live Ride</b><span>${liveText}</span></div><div class="ride-mini-actions">${nav}${callDriver}${callPassenger}<button class="ride-mini-btn" onclick="refreshSingleRide('${r.id}')">↻ Refresh</button></div>${otp}</div>`;
}
async function refreshSingleRide(id){
  try{
    const r=await api(`/rides/${id}/live?t=${Date.now()}`);
    toast('Live ride refreshed');
    return ridesView();
  }catch(e){toast(e.message)}
}
function rideRow(r){
  const isDriver=roleMode==='DRIVER';
  const isPassenger=roleMode==='PASSENGER';
  let actions='';
  if(isDriver && r.status==='REQUESTED') actions=`<div class="ride-action-stack"><button class="ghost big-action" onclick="rideAction('${r.id}','reject')">✖ Reject</button><button class="primary big-action" onclick="rideAction('${r.id}','accept')">✅ ${L('accept')}</button></div>`;
  else if(isPassenger&&r.status==='DRIVER_ACCEPTED') actions=`<button class="primary mini-pay" onclick="rideAction('${r.id}','pay')">💳 Pay Now</button>`;
  else if(isDriver&&r.status==='CONFIRMED') actions=`<button class="ghost big-action" onclick="rideAction('${r.id}','arrive')">📍 Reached Pickup</button>`;
  else if(isDriver&&r.status==='ARRIVED') actions=`<div class="otp-start-box"><input id="otp-${r.id}" inputmode="numeric" maxlength="4" placeholder="Passenger OTP"><button class="ghost big-action" onclick="rideAction('${r.id}','start')">▶️ ${L('start')}</button></div>`;
  else if(isDriver&&r.status==='STARTED') actions=`<button class="ghost big-action" onclick="rideAction('${r.id}','complete')">🏁 ${L('complete')}</button>`;
  else if(isPassenger&&r.status==='COMPLETED'&&!r.rating_by_passenger) actions=`<button class="primary mini-pay" onclick="rateRide('${r.id}')">⭐ Rate</button>`;
  else actions=`<em>›</em>`;
  const seatTxt=r.ride_type==='SHARING'?` · ${r.seats||1} seat`:'';
  const driverTxt=r.driver_name?` · Driver: ${esc(r.driver_name)} ${r.driver_vehicle_no?`(${esc(r.driver_vehicle_no)})`:''}`:'';
  const passengerTxt=isDriver&&r.passenger_name?` · Passenger: ${esc(r.passenger_name)}`:'';
  const distTxt=(isDriver&&r.distance_to_pickup_km)?` · Pickup ${r.distance_to_pickup_km} km`:'';
  const fareLine=`${esc(r.ride_type||'FULL')}${seatTxt} · ₹${r.estimated_fare}${distTxt}${r.driver_earning?` · Driver ₹${r.driver_earning}`:''}${r.rating_by_passenger?` · ${r.rating_by_passenger}⭐`:''}${driverTxt}${passengerTxt}`;
  return `<div class="row ride-row ride-row-${esc(r.status)}"><i>🛺</i><div><b>${esc(r.pickup)} → ${esc(r.drop)}</b><span><b class="status-pill">${rideStatusText(r.status)}</b> · ${fareLine}</span>${candidateText(r)}${timerHtml(r)}${liveTrackingBox(r)}${safetyActions(r)}<div class="ride-progress"><b style="width:${rideProgressPct(r.status)}%"></b></div></div>${actions}</div>`;
}
async function rideAction(id,action){
  try{
    const body={};
    if(['accept','arrive','start','complete'].includes(action)){
      try{ Object.assign(body, await getDeviceLocation('Kalna')); }catch(e){}
    }
    if(action==='start'){
      const otp=$(`otp-${id}`)?.value.trim();
      if(!otp)return toast('Passenger OTP দিন');
      body.otp=otp;
    }
    if(action==='pay'){
      const p=await api('/payments/create-order',{method:'POST',body:{ride_id:id}});
      let ref='DEMO-'+Date.now();
      if(p.payment?.provider==='MANUAL_QR') ref=prompt(`UPI payment reference দিন\nUPI: ${p.payment.manual_upi_id||'not set'}`,ref)||ref;
      else if(p.payment?.provider==='RAZORPAY') ref=prompt('Razorpay payment id / UPI reference দিন',ref)||ref;
      await api(`/payments/${p.order.id}/verify`,{method:'POST',body:{transaction_id:ref,payment_method:p.payment?.methods?.[0]||'DEMO_PAYMENT'}});
      toast('Payment verified - Booking confirmed. Passenger OTP দেখুন');
      return ridesView();
    }
    await api(`/rides/${id}/${action}`,{method:'POST',body});
    const msg={accept:'Ride accepted. Passenger-কে payment করতে বলা হয়েছে।',reject:'Ride request rejected',arrive:'Passenger notified: Driver reached pickup',start:'OTP verified - Ride started',complete:'Ride completed'}[action]||'Ride updated';
    toast(msg);
    ridesView();
  }catch(e){toast(e.message);ridesView()}
}
async function ridesView(){
  try{
    stopRideListPollV2();
    const r=await api('/rides?role='+roleMode+'&t='+Date.now());
    const rows=r.rides.map(rideRow).join('')||`<div class="alert">${roleMode==='DRIVER'?'নতুন ride request নেই। Online থাকুন।':L('norides')}</div>`;
    const flow=`<div class="status-flow ride-flow"><span>Request</span><span>Accept</span><span>Pay</span><span>OTP</span><span>Start</span><span>Complete</span></div>`;
    const topNote=roleMode==='DRIVER'?`<section class="voice-help"><button>📡 Live</button><span>Online + approved driver হলে request আসবে। Accept করার পর Navigate/Call/OTP flow ব্যবহার করুন।</span></section>`:`<section class="voice-help"><button>🔐 OTP Safe Ride</button><span>Payment confirm হলে passenger OTP দেখাবে। Driver pickup-এ এলে OTP বলবেন।</span></section>`;
    shell(`${topNote}<section class="card"><div class="section-title"><h2>${roleMode==='DRIVER'?L('req'):L('myrides')}</h2><button onclick="ridesView()">Refresh · ${r.rides.length}</button></div>${flow}<div class="list">${rows}</div></section>`);
    startRideTimer();
    if(currentTab==='rides') rideListPollTimerV2=setInterval(()=>{ if(currentTab==='rides') ridesView().catch(()=>{}); else stopRideListPollV2(); }, 10000);
  }catch(e){shell(`<section class="card"><div class="alert">${esc(e.message)}</div></section>`)}
}

// v2.0 Sprint-4 - Mappls/MapmyIndia Fare Route + Driver Wallet UX (Server Update Only)
try { window.NEXO_RIDE_SPRINT4 = true; } catch(e) {}
async function mapApi(path){ return api('/maps'+path); }
function coordsText(c){ if(!c) return ''; return `${Number(c.lat).toFixed(5)}, ${Number(c.lng).toFixed(5)}`; }
function mapProviderLabel(p){ p=String(p||'DEMO').toUpperCase(); return p==='MAPPLS'?'MapmyIndia / Mappls':p==='GOOGLE'?'Google Maps':'Demo Map'; }
async function loadPlaceSuggestions(q=''){
  try{ const r=await mapApi('/places?q='+encodeURIComponent(q)); return r.places||[]; }
  catch(e){ return []; }
}
function placesDatalistHtml(id, places){ return `<datalist id="${id}">${(places||[]).map(p=>`<option value="${esc(p.name)}"></option>`).join('')}</datalist>`; }
async function previewRouteBox(){
  const pickup=booking.pickup || $('pickup')?.value?.trim() || '';
  const drop=booking.drop || $('drop')?.value?.trim() || '';
  const box=$('routePreviewBox');
  if(!box) return;
  if(!pickup || !drop){ box.innerHTML='<div class="alert">Pickup এবং Drop দিলে route/fare preview দেখাবে।</div>'; return; }
  try{
    const r=await mapApi(`/route?pickup=${encodeURIComponent(pickup)}&drop=${encodeURIComponent(drop)}&ride_type=${activeRideType}&seats=${activeSeats}`);
    const rt=r.route||{}; const fare=rt.fare||{}; const geo=rt.geofence||{}; const links=rt.navigation_links||{};
    const nav=links.mappls_web || links.google_web || links.google_search || '#';
    box.innerHTML=`<div class="mappls-route-card"><div class="map-head"><b>🗺️ ${mapProviderLabel(rt.provider)} Route Preview</b><a target="_blank" href="${nav}">Open Map</a></div><div class="route-line"><span>📍 ${esc(rt.pickup)}</span><i></i><span>🏁 ${esc(rt.drop)}</span></div><div class="route-grid"><div><b>${rt.distance_km||'-'} km</b><small>Route</small></div><div><b>${rt.eta_minutes||'-'} min</b><small>ETA</small></div><div><b>₹${fare.estimated_fare||'-'}</b><small>Fare</small></div></div><div class="fare-breakup"><span>Base ₹${fare.base_fare||0}</span><span>Extra ₹${fare.fare_breakup?.extra_fare||0}</span><span>${esc(fare.ride_type||activeRideType)}</span></div><div class="geo-chip ${geo.inside?'route-ok':'route-warn'}">${geo.inside?'✅':'⚠️'} ${esc(geo.message||'Service area check')}</div><small>Pickup: ${coordsText(rt.pickup_coords||fare.pickup_coords)} · Drop: ${coordsText(rt.drop_coords||fare.drop_coords)}</small></div>`;
  }catch(e){ box.innerHTML=`<div class="alert">${esc(e.message)}</div>`; }
}
async function selectCurrentPickup(){
  try{ const g=await getDeviceLocation('Current Location'); booking.pickup=`Current GPS ${Number(g.lat).toFixed(5)},${Number(g.lng).toFixed(5)}`; if($('pickup')) $('pickup').value=booking.pickup; toast('Current GPS pickup set'); previewRouteBox(); }
  catch(e){ toast(e.message); }
}
async function enhancedBookingSheet(){
  let places=[]; try{ places=await loadPlaceSuggestions(''); }catch(e){}
  const commonList=places.slice(0,12).map(p=>`<button type="button" onclick="setPoint(booking.step===1?'pickup':'drop','${esc(p.name)}');refreshBookingStep();setTimeout(previewRouteBox,50)">${esc(p.name)}</button>`).join('');
  return `<div class="booking-enhanced"><div class="step-dots"><span class="${booking.step===1?'on':''}">1</span><span class="${booking.step===2?'on':''}">2</span><span class="${booking.step===3?'on':''}">3</span></div>${booking.step===1?`<h3>${L('step1')}</h3><label class="input-wrap"><i>📍</i><input id="pickup" list="pickupPlaces" value="${esc(booking.pickup)}" oninput="booking.pickup=this.value;previewRouteBox()" placeholder="${L('pickup')}"></label>${placesDatalistHtml('pickupPlaces',places)}<button class="ghost" onclick="selectCurrentPickup()">📡 Current GPS Pickup</button><div class="place-chips">${commonList}</div><button class="primary" onclick="saveStep1();setTimeout(previewRouteBox,50)">${L('next')}</button>`:booking.step===2?`<h3>${L('step2')}</h3><label class="input-wrap"><i>🏁</i><input id="drop" list="dropPlaces" value="${esc(booking.drop)}" oninput="booking.drop=this.value;previewRouteBox()" placeholder="${L('drop')}"></label>${placesDatalistHtml('dropPlaces',places)}<div class="place-chips">${commonList}</div><button class="ghost" onclick="booking.step=1;refreshBookingStep()">${L('prev')}</button><button class="primary" onclick="saveStep2();setTimeout(previewRouteBox,50)">${L('next')}</button>`:`<h3>${L('step3')}</h3><div class="ride-type-toggle"><button id="fullBtn" class="${activeRideType==='FULL'?'active':''}" onclick="setRideType('FULL');previewRouteBox()">${L('full')}</button><button id="sharingBtn" class="${activeRideType==='SHARING'?'active':''}" onclick="setRideType('SHARING');previewRouteBox()">${L('sharing')}</button></div><div id="seatBox" class="seat-box ${activeRideType==='SHARING'?'':'hidden'}"><button onclick="setSeats(1);previewRouteBox()">1 Seat</button><button onclick="setSeats(2);previewRouteBox()">2 Seats</button><button onclick="setSeats(3);previewRouteBox()">3 Seats</button><button onclick="setSeats(4);previewRouteBox()">4 Seats</button></div><div id="routePreviewBox"><div class="alert">Route preview loading...</div></div><button class="ghost" onclick="booking.step=2;refreshBookingStep()">${L('prev')}</button><button class="primary" onclick="previewRouteBox()">🗺️ Preview Fare</button><button class="primary" onclick="requestRide()">${L('confirm')}</button>`}</div>`;
}
async function refreshBookingStep(){ const c=$('stepContent'); if(!c) return; c.innerHTML=await enhancedBookingSheet(); document.querySelectorAll('.step-dots span').forEach((s,i)=>s.classList.toggle('on',i+1===booking.step)); if(booking.step===3) setTimeout(previewRouteBox,100); }
async function openBookingSheet(pick=''){ if(pick) booking.pickup=pick; booking.step=booking.pickup?2:1; $('overlay')?.classList.add('show'); $('bookSheet')?.classList.add('show'); await refreshBookingStep(); }
async function fareView(){
  let map={map:{provider:'DEMO'},service_area:{}}; try{map=await api('/maps/options')}catch(e){}
  const f=config?.fare_rules||{}; const places=await loadPlaceSuggestions('');
  const placeRows=places.slice(0,12).map(p=>`<div class="row"><i>📍</i><div><b>${esc(p.name)}</b><span>${coordsText(p.coords)} · ${p.inside?'inside service area':'outside'}</span></div><button onclick="openBookingSheet('${esc(p.name)}')">Book</button></div>`).join('');
  shell(`<section class="hero-card"><div><span class="glow-chip">Map + Fare</span><h2>${mapProviderLabel(map.map.provider)}</h2><p>MapmyIndia/Mappls external navigation + service area geofence + fare preview ready.</p></div><button class="primary" onclick="openBookingSheet()">Book Ride</button></section><section class="summary earnings-summary"><div><b>₹${f.minimum_full||40}</b><span>Full Min</span></div><div><b>₹${f.sharing_base_per_seat||10}</b><span>Sharing Seat</span></div><div><b>${map.service_area?.name||'Kalna'}</b><span>Area</span></div></section><section class="card"><div class="section-title"><h2>Fare Rules</h2><button>${f.currency||'INR'}</button></div><div class="list"><div class="row"><i>🛺</i><div><b>${L('full')}</b><span>Minimum ₹${f.minimum_full||40} · first ${f.base_km||4} km base</span></div><em>›</em></div><div class="row"><i>🔁</i><div><b>${L('sharing')}</b><span>₹${f.sharing_base_per_seat||10} per seat · capacity ${f.sharing_capacity||4}</span></div><em>›</em></div><div class="row"><i>➕</i><div><b>Extra Fare</b><span>After ${f.base_km||4} km, every ${f.extra_step_km||2} km = ₹${f.extra_step_fare||5}</span></div><em>›</em></div></div></section><section class="card"><div class="section-title"><h2>Popular Service Points</h2><button>${places.length}</button></div><div class="list">${placeRows}</div></section><section class="card"><div class="section-title"><h2>Support</h2><button>24x7</button></div><div class="list"><a class="row link-row" href="tel:${config?.app_settings?.support_mobile||'9749983737'}"><i>☎</i><div><b>Call Support</b><span>${config?.app_settings?.support_mobile||'9749983737'}</span></div><em>›</em></a></div></section>`);
}
async function driverEarningsView(){
  try{const r=await api('/driver/earnings'); const s=r.summary||{}; const rows=(r.rides||[]).slice(0,30).map(x=>`<div class="row"><i>₹</i><div><b>${esc(x.pickup)} → ${esc(x.drop)}</b><span>${(x.completed_at||x.updated_at||'').slice(0,16).replace('T',' ')} · Fare ₹${x.estimated_fare} · Your ₹${x.driver_earning||0} · Commission ₹${x.platform_commission||0}</span></div><em>${x.settlement_status||'PENDING'}</em></div>`).join('')||`<div class="alert">Complete ride হলে earning এখানে দেখাবে।</div>`; const paidRows=(r.settlements||[]).slice(0,15).map(x=>`<div class="row"><i>✅</i><div><b>Payout Paid ₹${x.amount||0}</b><span>${(x.paid_at||'').slice(0,10)} · ${x.ride_count||0} rides · Ref: ${esc(x.payment_ref||'Manual')}</span></div><em>PAID</em></div>`).join('')||`<div class="ok">Admin payout mark paid করলে settlement history এখানে দেখাবে।</div>`; shell(`<section class="hero-card"><div><span class="glow-chip">Driver Wallet</span><h2>Today ₹${s.today_earnings||0}</h2><p>Total ₹${s.total_earnings||0} · Pending payout ₹${s.pending_payout||0}</p></div><button class="primary" onclick="currentTab='rides';render()">Ride Requests</button></section><section class="summary earnings-summary wallet-highlight"><div><b>₹${s.total_earnings||0}</b><span>Total</span></div><div><b>₹${s.pending_payout||0}</b><span>Pending</span></div><div><b>₹${s.paid_payout||0}</b><span>Paid</span></div></section><section class="summary earnings-summary"><div><b>${s.total_rides||0}</b><span>Rides</span></div><div><b>${s.rating||5}⭐</b><span>Rating</span></div><div><b>₹${s.platform_commission||0}</b><span>Commission</span></div></section><section class="voice-help"><button>ℹ️</button><span>Ride completed হলেই earning pending payout-এ যাবে। Admin payout paid করলে Paid balance বাড়বে।</span></section><section class="card"><div class="section-title"><h2>Earning History</h2><button>${s.total_rides||0}</button></div><div class="list">${rows}</div></section><section class="card settlement-card"><div class="section-title"><h2>Payout Settlement</h2><button>${(r.settlements||[]).length}</button></div><div class="list">${paidRows}</div></section>`)}catch(e){shell(`<section class="card"><div class="alert">${esc(e.message)}</div></section>`)}
}
async function rateRide(id){
  try{ const rating=await new Promise(resolve=>{ const box=document.createElement('div'); box.className='rating-overlay'; box.innerHTML=`<div class="rating-card"><h3>Driver Rating দিন</h3><p>Ride complete হয়েছে। Driver service কেমন ছিল?</p><div class="star-row">${[1,2,3,4,5].map(n=>`<button onclick="this.closest('.rating-overlay').__rating=${n};this.closest('.rating-overlay').querySelectorAll('.star-row button').forEach((b,i)=>b.classList.toggle('on',i<${n}))">⭐</button>`).join('')}</div><input placeholder="Comment optional" id="ratingComment"><div class="ride-mini-actions"><button class="ghost" onclick="this.closest('.rating-overlay').remove();this.closest('.rating-overlay').__resolve(null)">Cancel</button><button class="primary" onclick="this.closest('.rating-overlay').__resolve({rating:this.closest('.rating-overlay').__rating||5,comment:document.getElementById('ratingComment').value});this.closest('.rating-overlay').remove()">Submit</button></div></div>`; box.__rating=5; box.__resolve=resolve; document.body.appendChild(box); box.querySelectorAll('.star-row button').forEach(b=>b.classList.add('on')); }); if(!rating) return; await api(`/rides/${id}/rate`,{method:'POST',body:rating}); toast('Rating saved'); ridesView(); }catch(e){toast(e.message);ridesView();}
}

// v2.0 Sprint-4C - in-app pickup/drop map pin + live place search (Server Update Only)
try { window.NEXO_RIDE_SPRINT4C_MAP_PIN_SEARCH = true; } catch(e) {}
let placeSearchTimerV2 = null;
function clampPct(v){ v=Number(v); if(!Number.isFinite(v)) return 50; return Math.max(4, Math.min(96, v)); }
function serviceBounds(){ return (config && config.service_area && config.service_area.bounds) || {minLat:23.10,maxLat:23.29,minLng:88.25,maxLng:88.43}; }
function pointStyleFromCoords(c){
  const b = serviceBounds();
  const lat = Number(c && c.lat), lng = Number(c && c.lng);
  if(!Number.isFinite(lat) || !Number.isFinite(lng)) return 'left:50%;top:50%';
  const x = ((lng-Number(b.minLng))/(Number(b.maxLng)-Number(b.minLng)))*100;
  const y = 100-(((lat-Number(b.minLat))/(Number(b.maxLat)-Number(b.minLat)))*100);
  return `left:${clampPct(x)}%;top:${clampPct(y)}%`;
}
function coordsObj(lat,lng){ return {lat:Number(lat), lng:Number(lng)}; }
function rideCoordsFromNames(pickup,drop){ return {pickup_coords:null,drop_coords:null}; }
function mapPin(label, coords, cls='pin-blue'){
  if(!coords || coords.lat===undefined || coords.lng===undefined) return '';
  return `<span class="nexo-map-pin ${cls}" style="${pointStyleFromCoords(coords)}"><b>${esc(label||'')}</b></span>`;
}
function inAppMapHtml(route, mode='booking'){
  route = route || {};
  const pc = route.pickup_coords || route.fare?.pickup_coords || (route.pickup_lat && route.pickup_lng ? coordsObj(route.pickup_lat,route.pickup_lng) : null);
  const dc = route.drop_coords || route.fare?.drop_coords || (route.drop_lat && route.drop_lng ? coordsObj(route.drop_lat,route.drop_lng) : null);
  const dvc = route.driver_coords || (route.driver_lat && route.driver_lng ? coordsObj(route.driver_lat,route.driver_lng) : null);
  const nav = route.navigation_links?.mappls_web || route.navigation_links?.google_web || '#';
  const routeInfo = route.distance_km ? `<div class="nexo-map-info"><b>${route.distance_km} km</b><span>${route.eta_minutes||'-'} min · ₹${route.fare?.estimated_fare||route.estimated_fare||'-'}</span></div>` : '';
  return `<div class="nexo-inapp-map ${mode}">
    <div class="map-grid-bg"></div>
    <div class="map-road road-one"></div><div class="map-road road-two"></div><div class="map-road road-three"></div>
    ${pc && dc ? `<i class="nexo-route-line"></i>` : ''}
    ${mapPin('P',pc,'pin-pick')}${mapPin('D',dc,'pin-drop')}${mapPin('🚕',dvc,'pin-driver')}
    <div class="map-legend"><span><i class="pick-dot"></i> Pickup</span><span><i class="drop-dot"></i> Drop</span>${dvc?'<span><i class="driver-dot"></i> Driver</span>':''}</div>
    ${routeInfo}
    ${nav !== '#' ? `<a class="map-open-btn" target="_blank" href="${nav}">Open Map</a>` : ''}
  </div>`;
}
async function resolveRoutePreview(){
  const pickup = booking.pickup || $('pickup')?.value?.trim() || '';
  const drop = booking.drop || $('drop')?.value?.trim() || '';
  if(!pickup || !drop) return null;
  const r = await mapApi(`/route?pickup=${encodeURIComponent(pickup)}&drop=${encodeURIComponent(drop)}&ride_type=${activeRideType}&seats=${activeSeats}`);
  return r.route || null;
}
function renderSuggestionsBox(type, places){
  const el = $(`${type}Suggestions`); if(!el) return;
  if(!places || !places.length){ el.innerHTML = `<div class="place-empty">কোনো suggestion নেই। চাইলে address লিখে Next চাপুন।</div>`; return; }
  el.innerHTML = places.slice(0,8).map(p=>`<button type="button" onclick="selectSuggestedPlace('${type}','${esc(p.name)}')"><b>${esc(p.name)}</b><small>${coordsText(p.coords)} ${p.inside?'· service area':'· outside area'}</small></button>`).join('');
}
async function searchPlaceTyping(type, value){
  clearTimeout(placeSearchTimerV2);
  placeSearchTimerV2 = setTimeout(async()=>{
    try{ const places = await loadPlaceSuggestions(value || ''); renderSuggestionsBox(type, places); }
    catch(e){ renderSuggestionsBox(type, []); }
  }, 250);
}
function selectSuggestedPlace(type, name){
  setPoint(type,name);
  if($(type)) $(type).value = name;
  renderSuggestionsBox(type, []);
  if(type==='pickup') booking.pickup = name; else booking.drop = name;
  setTimeout(()=>{ previewRouteBox(); refreshMiniBookingMap(); }, 80);
}
async function selectCurrentPickup(){
  try{
    const g=await getDeviceLocation('Current Location');
    booking.pickup=`Current GPS ${Number(g.lat).toFixed(5)},${Number(g.lng).toFixed(5)}`;
    if($('pickup')) $('pickup').value=booking.pickup;
    const rev=await mapApi(`/reverse?lat=${encodeURIComponent(g.lat)}&lng=${encodeURIComponent(g.lng)}&limit=6`).catch(()=>null);
    if(rev && rev.nearest && rev.nearest.name){ toast('Nearby: '+rev.nearest.name); renderSuggestionsBox('pickup', rev.places||[]); }
    else toast('Current GPS pickup set');
    previewRouteBox(); refreshMiniBookingMap();
  } catch(e){ toast(e.message); }
}
async function refreshMiniBookingMap(){
  const box = $('miniBookingMap'); if(!box) return;
  const pickup = booking.pickup || $('pickup')?.value?.trim() || '';
  const drop = booking.drop || $('drop')?.value?.trim() || '';
  try{
    if(pickup && drop){ const rt=await resolveRoutePreview(); box.innerHTML = inAppMapHtml(rt,'picker'); return; }
    const places = await loadPlaceSuggestions('');
    const center = places[0]?.coords || {lat:23.2199,lng:88.3625};
    box.innerHTML = `<div class="nexo-inapp-map picker"><div class="map-grid-bg"></div><div class="map-road road-one"></div><div class="map-road road-two"></div>${(places||[]).slice(0,10).map((p,i)=>mapPin(String(i+1),p.coords,'pin-small')).join('')}<div class="map-legend"><span>📍 Tap নিচের list থেকে point select করুন</span></div></div>`;
  }catch(e){ box.innerHTML = `<div class="nexo-inapp-map picker"><div class="map-legend"><span>Map preview loading...</span></div></div>`; }
}
function mapPickerModal(type){
  const old = document.getElementById('mapPickerOverlay'); if(old) old.remove();
  const overlay=document.createElement('div'); overlay.id='mapPickerOverlay'; overlay.className='map-picker-overlay';
  overlay.innerHTML=`<div class="map-picker-card"><div class="section-title"><h2>${type==='pickup'?'Pickup map':'Drop map'}</h2><button onclick="document.getElementById('mapPickerOverlay').remove()">Close</button></div><input class="big-input" id="mapPickerSearch" placeholder="জায়গার নাম লিখুন / Search place" oninput="mapPickerSearch('${type}',this.value)"><div id="mapPickerMap" class="map-picker-map"><div class="alert">Map loading...</div></div><div id="mapPickerList" class="map-picker-list"></div></div>`;
  document.body.appendChild(overlay);
  mapPickerSearch(type,'');
}
async function mapPickerSearch(type,q){
  const list=$('mapPickerList'), map=$('mapPickerMap'); if(!list||!map) return;
  const places=await loadPlaceSuggestions(q||'');
  map.innerHTML=`<div class="nexo-inapp-map picker"><div class="map-grid-bg"></div><div class="map-road road-one"></div><div class="map-road road-two"></div><div class="map-road road-three"></div>${places.slice(0,12).map((p,i)=>mapPin(String(i+1),p.coords,type==='pickup'?'pin-pick':'pin-drop')).join('')}<div class="map-legend"><span>${type==='pickup'?'Pickup':'Drop'} point select করুন</span></div></div>`;
  list.innerHTML=places.slice(0,12).map((p,i)=>`<button onclick="selectSuggestedPlace('${type}','${esc(p.name)}');document.getElementById('mapPickerOverlay')?.remove();refreshBookingStep()"><b>${i+1}. ${esc(p.name)}</b><small>${coordsText(p.coords)} ${p.inside?'· service area':'· outside'}</small></button>`).join('') || '<div class="alert">No place found</div>';
}
async function previewRouteBox(){
  const pickup=booking.pickup || $('pickup')?.value?.trim() || '';
  const drop=booking.drop || $('drop')?.value?.trim() || '';
  const box=$('routePreviewBox');
  if(!box) return;
  if(!pickup || !drop){ box.innerHTML='<div class="alert">Pickup এবং Drop দিলে map pin, route ও fare preview দেখাবে।</div>'; return; }
  try{
    const rt=await resolveRoutePreview(); const fare=rt.fare||{}; const geo=rt.geofence||{}; const links=rt.navigation_links||{};
    const nav=links.mappls_web || links.google_web || links.google_search || '#';
    box.innerHTML=`<div class="mappls-route-card"><div class="map-head"><b>🗺️ Pickup/Drop Map Preview</b><a target="_blank" href="${nav}">Open Map</a></div>${inAppMapHtml(rt,'route')}<div class="route-line"><span>📍 ${esc(rt.pickup)}</span><i></i><span>🏁 ${esc(rt.drop)}</span></div><div class="route-grid"><div><b>${rt.distance_km||'-'} km</b><small>Route</small></div><div><b>${rt.eta_minutes||'-'} min</b><small>ETA</small></div><div><b>₹${fare.estimated_fare||'-'}</b><small>Fare</small></div></div><div class="fare-breakup"><span>Base ₹${fare.base_fare||0}</span><span>Extra ₹${fare.fare_breakup?.extra_fare||0}</span><span>${esc(fare.ride_type||activeRideType)}</span></div><div class="geo-chip ${geo.inside?'route-ok':'route-warn'}">${geo.inside?'✅':'⚠️'} ${esc(geo.message||'Service area check')}</div><small>Pickup: ${coordsText(rt.pickup_coords||fare.pickup_coords)} · Drop: ${coordsText(rt.drop_coords||fare.drop_coords)}</small></div>`;
  }catch(e){ box.innerHTML=`<div class="alert">${esc(e.message)}</div>`; }
}
async function enhancedBookingSheet(){
  let places=[]; try{ places=await loadPlaceSuggestions(''); }catch(e){}
  const commonList=places.slice(0,10).map(p=>`<button type="button" onclick="selectSuggestedPlace(booking.step===1?'pickup':'drop','${esc(p.name)}')">${esc(p.name)}</button>`).join('');
  const mapBox=`<div id="miniBookingMap" class="mini-booking-map"><div class="alert">Map preview loading...</div></div>`;
  const pickInput=`<label class="input-wrap"><i>📍</i><input id="pickup" value="${esc(booking.pickup)}" oninput="booking.pickup=this.value;searchPlaceTyping('pickup',this.value);previewRouteBox();refreshMiniBookingMap()" placeholder="পিকআপ লিখুন / Search pickup"></label><div id="pickupSuggestions" class="place-suggestions"></div><div class="two-btn"><button class="ghost" onclick="selectCurrentPickup()">📡 Current GPS Pickup</button><button class="ghost" onclick="mapPickerModal('pickup')">🗺️ Map থেকে Pickup</button></div>`;
  const dropInput=`<label class="input-wrap"><i>🏁</i><input id="drop" value="${esc(booking.drop)}" oninput="booking.drop=this.value;searchPlaceTyping('drop',this.value);previewRouteBox();refreshMiniBookingMap()" placeholder="ড্রপ লিখুন / Search drop"></label><div id="dropSuggestions" class="place-suggestions"></div><div class="two-btn"><button class="ghost" onclick="mapPickerModal('drop')">🗺️ Map থেকে Drop Pin</button><button class="ghost" onclick="previewRouteBox();refreshMiniBookingMap()">↻ Map Refresh</button></div>`;
  let html='';
  if(booking.step===1) html=`<h3>${L('step1')}</h3>${pickInput}${mapBox}<div class="place-chips">${commonList}</div><button class="primary" onclick="saveStep1();setTimeout(refreshMiniBookingMap,100)">${L('next')}</button>`;
  else if(booking.step===2) html=`<h3>${L('step2')}</h3>${dropInput}${mapBox}<div class="place-chips">${commonList}</div><button class="ghost" onclick="booking.step=1;refreshBookingStep()">${L('prev')}</button><button class="primary" onclick="saveStep2();setTimeout(previewRouteBox,80)">${L('next')}</button>`;
  else html=`<h3>${L('step3')}</h3><div class="ride-type-toggle"><button id="fullBtn" class="${activeRideType==='FULL'?'active':''}" onclick="setRideType('FULL');previewRouteBox()">${L('full')}</button><button id="sharingBtn" class="${activeRideType==='SHARING'?'active':''}" onclick="setRideType('SHARING');previewRouteBox()">${L('sharing')}</button></div><div id="seatBox" class="seat-box ${activeRideType==='SHARING'?'':'hidden'}"><button onclick="setSeats(1);previewRouteBox()">1 Seat</button><button onclick="setSeats(2);previewRouteBox()">2 Seats</button><button onclick="setSeats(3);previewRouteBox()">3 Seats</button><button onclick="setSeats(4);previewRouteBox()">4 Seats</button></div><div id="routePreviewBox"><div class="alert">Route preview loading...</div></div><button class="ghost" onclick="booking.step=2;refreshBookingStep()">${L('prev')}</button><button class="primary" onclick="previewRouteBox()">🗺️ Preview Fare</button><button class="primary" onclick="requestRide()">${L('confirm')}</button>`;
  return `<div class="booking-enhanced map-search-enabled"><div class="step-dots"><span class="${booking.step===1?'on':''}">1</span><span class="${booking.step===2?'on':''}">2</span><span class="${booking.step===3?'on':''}">3</span></div>${html}</div>`;
}
async function refreshBookingStep(){
  const c=$('stepContent'); if(!c) return;
  c.innerHTML=await enhancedBookingSheet();
  document.querySelectorAll('.step-dots span').forEach((s,i)=>s.classList.toggle('on',i+1===booking.step));
  setTimeout(()=>{ if(booking.step===3) previewRouteBox(); else refreshMiniBookingMap(); },100);
}
function rideRouteMiniMap(r){
  const rt={pickup:r.pickup,drop:r.drop,pickup_lat:r.pickup_lat,pickup_lng:r.pickup_lng,drop_lat:r.drop_lat,drop_lng:r.drop_lng,driver_lat:r.driver_lat,driver_lng:r.driver_lng,estimated_fare:r.estimated_fare,distance_km:r.distance_km,navigation_links:{google_web:navLinkFromRide(r,'drop')}};
  return `<div class="ride-map-mini-wrap">${inAppMapHtml(rt,'ride')}</div>`;
}
function rideRow(r){
  const isDriver=roleMode==='DRIVER'; const isPassenger=roleMode==='PASSENGER';
  let actions='';
  if(isDriver && r.status==='REQUESTED') actions=`<div class="ride-action-stack"><button class="ghost big-action" onclick="rideAction('${r.id}','reject')">✖ Reject</button><button class="primary big-action" onclick="rideAction('${r.id}','accept')">✅ ${L('accept')}</button></div>`;
  else if(isPassenger&&r.status==='DRIVER_ACCEPTED') actions=`<button class="primary mini-pay" onclick="rideAction('${r.id}','pay')">💳 Pay Now</button>`;
  else if(isDriver&&r.status==='CONFIRMED') actions=`<button class="ghost big-action" onclick="rideAction('${r.id}','arrive')">📍 Reached Pickup</button>`;
  else if(isDriver&&r.status==='ARRIVED') actions=`<div class="otp-start-box"><input id="otp-${r.id}" inputmode="numeric" maxlength="4" placeholder="Passenger OTP"><button class="ghost big-action" onclick="rideAction('${r.id}','start')">▶️ ${L('start')}</button></div>`;
  else if(isDriver&&r.status==='STARTED') actions=`<button class="ghost big-action" onclick="rideAction('${r.id}','complete')">🏁 ${L('complete')}</button>`;
  else if(isPassenger&&r.status==='COMPLETED'&&!r.rating_by_passenger) actions=`<button class="primary mini-pay" onclick="rateRide('${r.id}')">⭐ Rate</button>`;
  else actions=`<em>›</em>`;
  const seatTxt=r.ride_type==='SHARING'?` · ${r.seats||1} seat`:'';
  const driverTxt=r.driver_name?` · Driver: ${esc(r.driver_name)} ${r.driver_vehicle_no?`(${esc(r.driver_vehicle_no)})`:''}`:'';
  const passengerTxt=isDriver&&r.passenger_name?` · Passenger: ${esc(r.passenger_name)}`:'';
  const distTxt=(isDriver&&r.distance_to_pickup_km)?` · Pickup ${r.distance_to_pickup_km} km`:'';
  const fareLine=`${esc(r.ride_type||'FULL')}${seatTxt} · ₹${r.estimated_fare}${distTxt}${r.driver_earning?` · Driver ₹${r.driver_earning}`:''}${r.rating_by_passenger?` · ${r.rating_by_passenger}⭐`:''}${driverTxt}${passengerTxt}`;
  return `<div class="row ride-row ride-row-${esc(r.status)}"><i>🛺</i><div><b>${esc(r.pickup)} → ${esc(r.drop)}</b><span><b class="status-pill">${rideStatusText(r.status)}</b> · ${fareLine}</span>${rideRouteMiniMap(r)}${candidateText(r)}${timerHtml(r)}${liveTrackingBox(r)}${safetyActions(r)}<div class="ride-progress"><b style="width:${rideProgressPct(r.status)}%"></b></div></div>${actions}</div>`;
}


// v2.0 Sprint-4D - REAL Mappls Web SDK map + marker + search (Server Update Only)
try { window.NEXO_RIDE_SPRINT4D_REAL_MAPPLS = true; } catch(e) {}
let __mapplsPublicConfig=null;
let __mapplsSdkPromise=null;
let __mapplsSearchPromise=null;
let __realMapCounter=0;
async function mapplsPublicConfig(){
  if(__mapplsPublicConfig) return __mapplsPublicConfig;
  try{ const r=await api('/maps/public-config'); __mapplsPublicConfig=r||{}; return __mapplsPublicConfig; }
  catch(e){ __mapplsPublicConfig={ok:false,provider:'DEMO',has_key:false,error:e.message}; return __mapplsPublicConfig; }
}
function loadScriptOnce(src, id){
  return new Promise((resolve,reject)=>{
    if(!src) return reject(new Error('Map script URL missing'));
    const old=document.getElementById(id);
    if(old){ if(old.dataset.loaded==='1') return resolve(); old.addEventListener('load',()=>resolve(),{once:true}); old.addEventListener('error',()=>reject(new Error('Map script failed: '+src)),{once:true}); return; }
    const s=document.createElement('script'); s.id=id; s.src=src; s.async=true; s.defer=true; s.onload=()=>{s.dataset.loaded='1'; resolve();}; s.onerror=()=>reject(new Error('Map script failed: '+src)); document.head.appendChild(s);
  });
}
async function ensureMapplsSdk(withSearch=false){
  const cfg=await mapplsPublicConfig();
  if(String(cfg.provider||'').toUpperCase()!=='MAPPLS' || !cfg.has_key || !cfg.access_token) throw new Error('Mappls Static Key configured নেই। production.env-এ MAP_PROVIDER=MAPPLS এবং MAPPLS_STATIC_KEY দিন।');
  if(!__mapplsSdkPromise){
    __mapplsSdkPromise=loadScriptOnce(cfg.sdk_url || `https://sdk.mappls.com/map/sdk/web?v=3.0&access_token=${encodeURIComponent(cfg.access_token)}`,'mappls-web-sdk-v3')
      .then(()=>new Promise((resolve,reject)=>{let n=0;const t=setInterval(()=>{n++; if(window.mappls && window.mappls.Map){clearInterval(t); resolve(true);} if(n>80){clearInterval(t); reject(new Error('Mappls SDK load হয়েছে কিন্তু mappls.Map পাওয়া যায়নি'));}},100);}));
  }
  await __mapplsSdkPromise;
  if(withSearch && !__mapplsSearchPromise){
    const url=cfg.plugins_url || `https://apis.mappls.com/advancedmaps/api/${encodeURIComponent(cfg.access_token)}/map_sdk_plugins?v=3.0&libraries=search`;
    __mapplsSearchPromise=loadScriptOnce(url,'mappls-search-plugin-v3').catch(e=>{ console.warn('Mappls search plugin failed',e); return false; });
  }
  if(withSearch) await __mapplsSearchPromise;
  return true;
}
function asCoords(c, fallback){
  const lat=Number(c&&c.lat), lng=Number(c&&c.lng);
  if(Number.isFinite(lat)&&Number.isFinite(lng)) return {lat,lng};
  return fallback || {lat:23.2199,lng:88.3625};
}
function coordsFromPlaceObj(p){
  if(!p) return null;
  const cand=[
    [p.lat,p.lng],[p.latitude,p.longitude],[p.Latitude,p.Longitude],[p.placeLatitude,p.placeLongitude],[p.y,p.x]
  ];
  for(const a of cand){ const lat=Number(a[0]), lng=Number(a[1]); if(Number.isFinite(lat)&&Number.isFinite(lng)) return {lat,lng}; }
  if(p.coords) return asCoords(p.coords,null);
  return null;
}
function normalizeMapplsSearchResults(raw, q=''){
  const pools=[];
  if(Array.isArray(raw)) pools.push(raw);
  ['suggestedLocations','places','data','results','result','response'].forEach(k=>{ if(raw && Array.isArray(raw[k])) pools.push(raw[k]); });
  const arr=(pools[0]||[]).slice(0,12);
  return arr.map((x,i)=>{
    const name=x.placeName||x.name||x.formatted_address||x.placeAddress||x.addr||x.address||x.mapplsPin||x.eLoc||String(q||'Place');
    const address=x.placeAddress||x.address||x.formatted_address||x.subDistrict||x.district||'';
    const coords=coordsFromPlaceObj(x) || getDemoCoords(name);
    return {name: String(address && !String(name).includes(address) ? `${name} - ${address}` : name), coords, inside:true, provider:'MAPPLS', raw:x, index:i+1};
  }).filter(p=>p.name);
}
async function mapplsSearchPlaces(q){
  q=String(q||'').trim(); if(q.length<2) return [];
  try{
    await ensureMapplsSdk(true);
    if(!window.mappls || typeof window.mappls.search!=='function') return [];
    return await new Promise(resolve=>{
      let done=false;
      const finish=v=>{ if(done) return; done=true; resolve(v||[]); };
      setTimeout(()=>finish([]),4500);
      const opts={location:[23.2199,88.3625], hyperLocal:true, distance:true, tokenizeAddress:true, bridge:true};
      try{ new window.mappls.search(q, opts, data=>finish(normalizeMapplsSearchResults(data,q))); }
      catch(e){ try{ new window.mappls.search(document.createElement('input'), opts, data=>finish(normalizeMapplsSearchResults(data,q))); }catch(_){ finish([]); } }
    });
  }catch(e){ console.warn('Mappls search failed',e); return []; }
}
async function loadPlaceSuggestions(q=''){
  const text=String(q||'').trim();
  if(text.length>=2){
    const mp=await mapplsSearchPlaces(text);
    if(mp && mp.length) return mp;
  }
  try{ const r=await mapApi('/places?q='+encodeURIComponent(text)); return r.places||[]; }
  catch(e){ return []; }
}
function destroyOldMapNode(el){ if(!el) return; el.innerHTML=''; }
async function renderRealMapplsInto(container, routeOrPlaces, opts={}){
  if(!container) return false;
  const mode=opts.mode||'picker';
  try{
    await ensureMapplsSdk(false);
    const points=[];
    if(Array.isArray(routeOrPlaces)){
      routeOrPlaces.filter(p=>p&&p.coords).slice(0,12).forEach((p,i)=>points.push({label:String(i+1), coords:asCoords(p.coords), name:p.name||('Place '+(i+1)), cls:opts.type==='drop'?'drop':'pickup'}));
    }else{
      const r=routeOrPlaces||{};
      const fare=r.fare||{};
      const pc=asCoords(r.pickup_coords||fare.pickup_coords, null);
      const dc=asCoords(r.drop_coords||fare.drop_coords, null);
      const dr=asCoords(r.driver_coords|| (r.driver_lat&&r.driver_lng?{lat:r.driver_lat,lng:r.driver_lng}:null), null);
      if(pc) points.push({label:'P', coords:pc, name:r.pickup||'Pickup', cls:'pickup'});
      if(dc) points.push({label:'D', coords:dc, name:r.drop||'Drop', cls:'drop'});
      if(dr) points.push({label:'🛺', coords:dr, name:'Driver', cls:'driver'});
    }
    const center=points[0]?.coords || {lat:23.2199,lng:88.3625};
    const id='realMapplsCanvas_'+(++__realMapCounter);
    destroyOldMapNode(container);
    container.classList.add('real-mappls-host');
    container.innerHTML=`<div id="${id}" class="real-mappls-canvas"></div><div class="real-map-badge">Mappls Live Map</div>`;
    const map=new window.mappls.Map(id,{center:{lat:center.lat,lng:center.lng}, zoom: mode==='ride'?13:14, geolocation:false});
    setTimeout(()=>{
      try{
        points.forEach(p=>{
          const html=`<div class="html-pin html-pin-${p.cls||'pickup'}"><b>${esc(p.label)}</b></div>`;
          try{ new window.mappls.Marker({map, position:{lat:p.coords.lat,lng:p.coords.lng}, html, popupHtml:esc(p.name)}); }
          catch(e){ new window.mappls.Marker({map, position:{lat:p.coords.lat,lng:p.coords.lng}}); }
        });
        if(points.length>=2 && window.mappls.Polyline){
          try{ new window.mappls.Polyline({map, paths:points.slice(0,2).map(p=>({lat:p.coords.lat,lng:p.coords.lng})), strokeColor:'#24d7ff', strokeOpacity:0.85, strokeWeight:5}); }catch(e){}
        }
      }catch(e){ console.warn('Marker add failed',e); }
    },650);
    return true;
  }catch(e){
    console.warn('Real Mappls map failed',e);
    container.innerHTML=`<div class="nexo-inapp-map picker map-error"><div class="map-legend"><span>Real Map load হয়নি: ${esc(e.message)}</span></div></div>`;
    return false;
  }
}
async function renderRealOrFallbackMap(container, data, opts={}){
  const ok=await renderRealMapplsInto(container,data,opts);
  if(ok) return true;
  if(Array.isArray(data)){
    container.innerHTML=`<div class="nexo-inapp-map picker"><div class="map-grid-bg"></div><div class="map-road road-one"></div><div class="map-road road-two"></div>${data.slice(0,12).map((p,i)=>mapPin(String(i+1),p.coords,opts.type==='drop'?'pin-drop':'pin-pick')).join('')}<div class="map-legend"><span>Fallback map · Mappls key/domain check করুন</span></div></div>`;
  }else container.innerHTML=inAppMapHtml(data,opts.mode||'route');
  return false;
}
async function mapPickerSearch(type,q){
  const list=$('mapPickerList'), map=$('mapPickerMap'); if(!list||!map) return;
  list.innerHTML='<div class="alert">Search হচ্ছে...</div>';
  const places=await loadPlaceSuggestions(q||'');
  await renderRealOrFallbackMap(map,places,{type,mode:'picker'});
  list.innerHTML=places.slice(0,12).map((p,i)=>`<button onclick="selectSuggestedPlace('${type}','${esc(p.name)}');document.getElementById('mapPickerOverlay')?.remove();refreshBookingStep()"><b>${i+1}. ${esc(p.name)}</b><small>${coordsText(p.coords)} ${p.provider==='MAPPLS'?'· Mappls':''} ${p.inside?'· service area':'· outside'}</small></button>`).join('') || '<div class="alert">No place found — spelling/nearby area লিখে আবার search করুন।</div>';
}
async function refreshMiniBookingMap(){
  const box=$('miniBookingMap'); if(!box) return;
  const pickup=booking.pickup || $('pickup')?.value?.trim() || '';
  const drop=booking.drop || $('drop')?.value?.trim() || '';
  try{
    if(pickup && drop){ const rt=await resolveRoutePreview(); await renderRealOrFallbackMap(box,rt,{mode:'route'}); return; }
    const places=await loadPlaceSuggestions(pickup||drop||'Kalna');
    await renderRealOrFallbackMap(box,places,{type:booking.step===2?'drop':'pickup',mode:'picker'});
  }catch(e){ box.innerHTML=`<div class="alert">Map preview error: ${esc(e.message)}</div>`; }
}
async function previewRouteBox(){
  const pickup=booking.pickup || $('pickup')?.value?.trim() || '';
  const drop=booking.drop || $('drop')?.value?.trim() || '';
  const box=$('routePreviewBox'); if(!box) return;
  if(!pickup || !drop){ box.innerHTML='<div class="alert">Pickup এবং Drop দিলে real map pin, route ও fare preview দেখাবে।</div>'; return; }
  try{
    const rt=await resolveRoutePreview(); const fare=rt.fare||{}; const geo=rt.geofence||{}; const links=rt.navigation_links||{};
    const nav=links.mappls_web || links.google_web || links.google_search || '#';
    box.innerHTML=`<div class="mappls-route-card"><div class="map-head"><b>🗺️ Real Pickup/Drop Map</b><a target="_blank" href="${nav}">Open Navigation</a></div><div id="routeRealMap" class="mini-booking-map real-route-map"><div class="alert">Real map loading...</div></div><div class="route-line"><span>📍 ${esc(rt.pickup)}</span><i></i><span>🏁 ${esc(rt.drop)}</span></div><div class="route-grid"><div><b>${rt.distance_km||'-'} km</b><small>Route</small></div><div><b>${rt.eta_minutes||'-'} min</b><small>ETA</small></div><div><b>₹${fare.estimated_fare||'-'}</b><small>Fare</small></div></div><div class="fare-breakup"><span>Base ₹${fare.base_fare||0}</span><span>Extra ₹${fare.fare_breakup?.extra_fare||0}</span><span>${esc(fare.ride_type||activeRideType)}</span></div><div class="geo-chip ${geo.inside?'route-ok':'route-warn'}">${geo.inside?'✅':'⚠️'} ${esc(geo.message||'Service area check')}</div><small>Pickup: ${coordsText(rt.pickup_coords||fare.pickup_coords)} · Drop: ${coordsText(rt.drop_coords||fare.drop_coords)}</small></div>`;
    await renderRealOrFallbackMap($('routeRealMap'),rt,{mode:'route'});
  }catch(e){ box.innerHTML=`<div class="alert">${esc(e.message)}</div>`; }
}
function rideRouteMiniMap(r){
  const rt={pickup:r.pickup,drop:r.drop,pickup_coords:r.pickup_coords || (r.pickup_lat&&r.pickup_lng?{lat:r.pickup_lat,lng:r.pickup_lng}:null), drop_coords:r.drop_coords || (r.drop_lat&&r.drop_lng?{lat:r.drop_lat,lng:r.drop_lng}:null), driver_coords:r.driver_lat&&r.driver_lng?{lat:r.driver_lat,lng:r.driver_lng}:null, estimated_fare:r.estimated_fare,distance_km:r.distance_km,navigation_links:{google_web:navLinkFromRide(r,'drop')}};
  const id='rideMap_'+String(r.id||'').replace(/[^a-zA-Z0-9_]/g,'_');
  setTimeout(()=>{ const el=$(id); if(el) renderRealOrFallbackMap(el,rt,{mode:'ride'}).catch(()=>{}); },120);
  return `<div class="ride-map-mini-wrap"><div id="${id}" class="mini-booking-map real-ride-map"><div class="alert">Map loading...</div></div></div>`;
}


// v2.0 Sprint-4E - Tap-to-pin + strong local search fallback (Server Update Only)
try { window.NEXO_RIDE_SPRINT4E_TAP_PIN_SEARCH = true; } catch(e) {}
function __nexoKnownLocalPlaces(){
  return [
    ['Kalna Station',23.2196,88.3622],['Kalna Hospital',23.2247,88.3600],['Kalna Court',23.2221,88.3656],['Kalna Bus Stand',23.2215,88.3615],['Kalna New Bus Stand',23.2220,88.3599],
    ['Ambika Kalna',23.2181,88.3629],['Kalna College',23.2142,88.3592],['College More',23.2146,88.3587],['Court More',23.2221,88.3656],['Hospital More',23.2247,88.3600],
    ['Siddheswari More',23.2182,88.3571],['STKK Road',23.2188,88.3562],['Rail Gate',23.2165,88.3611],['108 Shiv Mandir',23.2207,88.3677],['Sub-Division Office',23.2203,88.3649],
    ['Ganga Ghat',23.2233,88.3728],['Kalna Ferry Ghat',23.2252,88.3741],['Nabadwip Ghat',23.2257,88.3748],['Guptipara Road',23.2088,88.3763],
    ['Dhatrigram',23.1902,88.4029],['Dhatrigram Station',23.1906,88.4033],['Baidyapur',23.1587,88.3472],['Baidyapur Station',23.1579,88.3467],['Madhupur',23.2382,88.3439],
    ['Baghnapara',23.1749,88.3862],['Bagnapara Station',23.1754,88.3866],['Muktarpur',23.2262,88.3500],['Nandai',23.2503,88.3718],['Sultanpur',23.2051,88.3319],
    ['Badla',23.1847,88.3118],['Akalpoush',23.1503,88.2956],['Krishnadebpur',23.1964,88.3708],['Nibhuji',23.2289,88.3625],['Nibhujii',23.2289,88.3625],['Nibhuji More',23.2289,88.3625],['নিভুজি',23.2289,88.3625]
  ].map(x=>({name:x[0], coords:{lat:x[1],lng:x[2]}, inside:true, provider:'LOCAL'}));
}
function __nexoNorm(s){return String(s||'').toLowerCase().replace(/[^a-z0-9\u0980-\u09ff]+/g,'');}
function parseCoordsFromText(text){
  const raw=String(text||'').trim();
  if(!raw) return null;
  const m=raw.match(/(-?\d{1,2}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)/);
  if(!m) return null;
  const lat=Number(m[1]); const lng=Number(m[2]);
  if(!Number.isFinite(lat)||!Number.isFinite(lng)) return null;
  if(lat<6||lat>38||lng<68||lng>98) return null;
  return {lat,lng,source:'TEXT'};
}
function __nexoLocalSearch(q){
  const text=String(q||'').trim(); const needle=__nexoNorm(text);
  let items=__nexoKnownLocalPlaces().map(p=>{ const n=__nexoNorm(p.name); let score=0; if(!needle) score=1; else if(n===needle) score=100; else if(n.startsWith(needle)) score=80; else if(n.includes(needle)) score=55; else if(needle.includes(n) && n.length>3) score=35; return {...p, score}; }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name)).slice(0,12);
  const gps=(typeof parseCoordsFromText==='function') ? parseCoordsFromText(text) : null;
  if(gps) items.unshift({name:`Pinned GPS ${Number(gps.lat).toFixed(5)},${Number(gps.lng).toFixed(5)}`, coords:gps, inside:true, provider:'GPS', score:120});
  if(text && text.length>=2 && !items.some(p=>__nexoNorm(p.name)===needle)){
    const c=getDemoCoords(text); items.unshift({name:`${text} (manual pin)`, coords:{lat:c.lat,lng:c.lng}, inside:true, provider:'MANUAL', manual:true, score:90});
  }
  return items.slice(0,12);
}
async function loadPlaceSuggestions(q=''){
  const text=String(q||'').trim();
  let out=[];
  if(text.length>=2){
    try{ const mp=await mapplsSearchPlaces(text); if(mp && mp.length) out=mp; }catch(e){}
  }
  if(!out.length){ try{ const r=await mapApi('/places?q='+encodeURIComponent(text)); if(r && r.places && r.places.length) out=r.places; }catch(e){} }
  const local=__nexoLocalSearch(text);
  const seen=new Set();
  const merged=[...out,...local].filter(p=>p&&p.name).filter(p=>{ const k=__nexoNorm(p.name); if(seen.has(k)) return false; seen.add(k); return true; });
  return merged.slice(0,16);
}
function __nexoPinnedName(type, coords, label){
  const p=type==='pickup'?'Pickup':'Drop';
  const suffix=label ? String(label).replace(/\s*\(manual pin\)\s*/i,'') : `${p} Pin`;
  return `${suffix} ${Number(coords.lat).toFixed(5)},${Number(coords.lng).toFixed(5)}`;
}
function setPinnedMapPoint(type, coords, label){
  if(!coords) return;
  const name=__nexoPinnedName(type,coords,label);
  setPoint(type,name);
  if($(type)) $(type).value=name;
  if(type==='pickup') booking.pickup=name; else booking.drop=name;
  toast((type==='pickup'?'Pickup':'Drop')+' pin set');
  document.getElementById('mapPickerOverlay')?.remove();
  setTimeout(()=>{ refreshBookingStep(); previewRouteBox(); refreshMiniBookingMap(); },100);
}
function __nexoClickToApproxCoords(ev, host, center){
  const rect=host.getBoundingClientRect();
  const x=(ev.clientX-rect.left)/Math.max(1,rect.width), y=(ev.clientY-rect.top)/Math.max(1,rect.height);
  const c=center||{lat:23.2199,lng:88.3625};
  const lat=Number(c.lat)+(0.5-y)*0.040; const lng=Number(c.lng)+(x-0.5)*0.055;
  return {lat:Math.round(lat*1000000)/1000000,lng:Math.round(lng*1000000)/1000000};
}
function __nexoAttachTapPin(container,type,center){
  if(!container || !type) return;
  container.dataset.tapPin='1';
  const hint=document.createElement('button'); hint.type='button'; hint.className='map-tap-hint'; hint.textContent='📍 Map-এ tap করে pin বসান'; hint.onclick=(e)=>{e.stopPropagation();};
  container.appendChild(hint);
  container.addEventListener('click', ev=>{
    const ignore=ev.target && (ev.target.closest('button') || ev.target.closest('a') || ev.target.closest('.map-tap-hint'));
    if(ignore) return;
    const coords=__nexoClickToApproxCoords(ev,container,center);
    const temp={name:`Tap Pin ${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}`,coords,inside:true,provider:'TAP'};
    renderRealOrFallbackMap(container,[temp],{type,mode:'picker',enableTap:true}).catch(()=>{});
    const list=$('mapPickerList');
    if(list) list.innerHTML = `<button onclick="setPinnedMapPoint('${type}',{lat:${coords.lat},lng:${coords.lng}},'Map Tap Pin')"><b>✅ এই pin select করুন</b><small>${coordsText(coords)} · tap point</small></button>` + list.innerHTML;
  });
}
async function renderRealMapplsInto(container, routeOrPlaces, opts={}){
  if(!container) return false;
  const mode=opts.mode||'picker';
  try{
    await ensureMapplsSdk(false);
    const points=[];
    if(Array.isArray(routeOrPlaces)){
      routeOrPlaces.filter(p=>p&&p.coords).slice(0,12).forEach((p,i)=>points.push({label:String(i+1), coords:asCoords(p.coords), name:p.name||('Place '+(i+1)), cls:opts.type==='drop'?'drop':'pickup'}));
    }else{
      const r=routeOrPlaces||{}; const fare=r.fare||{};
      const pc=asCoords(r.pickup_coords||fare.pickup_coords, null);
      const dc=asCoords(r.drop_coords||fare.drop_coords, null);
      const dr=asCoords(r.driver_coords|| (r.driver_lat&&r.driver_lng?{lat:r.driver_lat,lng:r.driver_lng}:null), null);
      if(pc) points.push({label:'P', coords:pc, name:r.pickup||'Pickup', cls:'pickup'});
      if(dc) points.push({label:'D', coords:dc, name:r.drop||'Drop', cls:'drop'});
      if(dr) points.push({label:'🛺', coords:dr, name:'Driver', cls:'driver'});
    }
    const center=points[0]?.coords || {lat:23.2199,lng:88.3625};
    const id='realMapplsCanvas_'+(++__realMapCounter);
    destroyOldMapNode(container);
    container.classList.add('real-mappls-host');
    container.innerHTML=`<div id="${id}" class="real-mappls-canvas"></div><div class="real-map-badge">Mappls Live Map</div>`;
    const map=new window.mappls.Map(id,{center:{lat:center.lat,lng:center.lng}, zoom: mode==='ride'?13:14, geolocation:false});
    setTimeout(()=>{
      try{
        points.forEach(p=>{
          const html=`<div class="html-pin html-pin-${p.cls||'pickup'}"><b>${esc(p.label)}</b></div>`;
          try{ new window.mappls.Marker({map, position:{lat:p.coords.lat,lng:p.coords.lng}, html, popupHtml:esc(p.name)}); }
          catch(e){ new window.mappls.Marker({map, position:{lat:p.coords.lat,lng:p.coords.lng}}); }
        });
        if(points.length>=2 && window.mappls.Polyline){ try{ new window.mappls.Polyline({map, paths:points.slice(0,2).map(p=>({lat:p.coords.lat,lng:p.coords.lng})), strokeColor:'#24d7ff', strokeOpacity:0.85, strokeWeight:5}); }catch(e){} }
      }catch(e){ console.warn('Marker add failed',e); }
    },650);
    if(opts.enableTap && opts.type) setTimeout(()=>__nexoAttachTapPin(container,opts.type,center),850);
    return true;
  }catch(e){
    console.warn('Real Mappls map failed',e);
    container.innerHTML=`<div class="nexo-inapp-map picker map-error"><div class="map-legend"><span>Real Map load হয়নি: ${esc(e.message)}</span></div></div>`;
    if(opts.enableTap && opts.type) __nexoAttachTapPin(container,opts.type,{lat:23.2199,lng:88.3625});
    return false;
  }
}
async function renderRealOrFallbackMap(container, data, opts={}){
  const ok=await renderRealMapplsInto(container,data,opts);
  if(ok) return true;
  if(Array.isArray(data)){
    const pts=data.slice(0,12);
    container.innerHTML=`<div class="nexo-inapp-map picker"><div class="map-grid-bg"></div><div class="map-road road-one"></div><div class="map-road road-two"></div>${pts.map((p,i)=>`<button class="pin-button" onclick="setPinnedMapPoint('${opts.type||'drop'}',{lat:${Number(p.coords?.lat||23.2199)},lng:${Number(p.coords?.lng||88.3625)}},'${esc(p.name)}')">${mapPin(String(i+1),p.coords,opts.type==='drop'?'pin-drop':'pin-pick')}</button>`).join('')}<div class="map-legend"><span>Tap pin/list থেকে select করুন</span></div></div>`;
    if(opts.enableTap && opts.type) __nexoAttachTapPin(container,opts.type,pts[0]?.coords||{lat:23.2199,lng:88.3625});
  }else container.innerHTML=inAppMapHtml(data,opts.mode||'route');
  return false;
}
async function mapPickerSearch(type,q){
  const list=$('mapPickerList'), map=$('mapPickerMap'); if(!list||!map) return;
  list.innerHTML='<div class="alert">Search হচ্ছে...</div>';
  const places=await loadPlaceSuggestions(q||'');
  await renderRealOrFallbackMap(map,places,{type,mode:'picker',enableTap:true});
  const typed=String(q||'').trim();
  const manual = typed.length>=2 ? `<button class="manual-pin-btn" onclick="setPinnedMapPoint('${type}', __nexoLocalSearch('${esc(typed)}')[0].coords, '${esc(typed)}')"><b>📌 “${esc(typed)}” এই নামেই pin করুন</b><small>Search না এলেও service area-তে manual pin হবে</small></button>` : '';
  list.innerHTML=manual + (places.slice(0,12).map((p,i)=>`<button onclick="setPinnedMapPoint('${type}',{lat:${Number(p.coords?.lat||23.2199)},lng:${Number(p.coords?.lng||88.3625)}},'${esc(p.name)}')"><b>${i+1}. ${esc(p.name)}</b><small>${coordsText(p.coords)} ${p.provider==='MAPPLS'?'· Mappls':''} ${p.provider==='LOCAL'?'· Local':''} ${p.manual?'· Manual':''} ${p.inside?'· service area':'· outside'}</small></button>`).join('') || '<div class="alert">No place found — map-এর উপর tap করে pin করুন অথবা এই নামেই pin করুন।</div>');
}
async function refreshMiniBookingMap(){
  const box=$('miniBookingMap'); if(!box) return;
  const pickup=booking.pickup || $('pickup')?.value?.trim() || '';
  const drop=booking.drop || $('drop')?.value?.trim() || '';
  try{
    if(pickup && drop){ const rt=await resolveRoutePreview(); await renderRealOrFallbackMap(box,rt,{mode:'route'}); return; }
    const places=await loadPlaceSuggestions(pickup||drop||'Kalna');
    await renderRealOrFallbackMap(box,places,{type:booking.step===2?'drop':'pickup',mode:'picker',enableTap:true});
  }catch(e){ box.innerHTML=`<div class="alert">Map preview error: ${esc(e.message)}</div>`; }
}

/* v2.0 Sprint-4G - Movable Center Pin Map Picker + Nearby Suggestions
   Server Update Only. Overrides previous map picker UX with a fixed center pin
   so the user moves the map/pin accurately and confirms after checking suggestions. */
try { window.NEXO_RIDE_SPRINT4G_CENTER_PIN = true; } catch(e) {}
let __nexoPinPicker = null;
function __nexoClamp(n,min,max){ n=Number(n); if(!Number.isFinite(n)) return min; return Math.max(min, Math.min(max, n)); }
function __nexoDistKm(a,b){
  const R=6371, dLat=(Number(b.lat)-Number(a.lat))*Math.PI/180, dLng=(Number(b.lng)-Number(a.lng))*Math.PI/180;
  const la1=Number(a.lat)*Math.PI/180, la2=Number(b.lat)*Math.PI/180;
  const h=Math.sin(dLat/2)**2 + Math.cos(la1)*Math.cos(la2)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}
function __nexoSafeCoords(c,fallback){
  const p=asCoords ? asCoords(c,null) : null;
  if(p) return {lat:Number(p.lat), lng:Number(p.lng)};
  return fallback || {lat:23.2199,lng:88.3625};
}
function __nexoInitialPickerCoords(type){
  const text=(type==='pickup' ? (booking.pickup||$('pickup')?.value||'') : (booking.drop||$('drop')?.value||''));
  const parsed=(typeof parseCoordsFromText==='function') ? parseCoordsFromText(text) : null;
  if(parsed) return {lat:parsed.lat,lng:parsed.lng};
  const known=(typeof __nexoLocalSearch==='function') ? __nexoLocalSearch(text||'Kalna') : [];
  if(known && known[0] && known[0].coords) return __nexoSafeCoords(known[0].coords);
  return {lat:23.2199,lng:88.3625};
}
function __nexoMapEventCoords(ev){
  try{
    const x=ev||{};
    const candidates=[x.latLng,x.latlng,x.lngLat,x.coords,x.coordinate,x.location,x.point,x];
    for(const c of candidates){
      if(!c) continue;
      if(Array.isArray(c) && c.length>=2){ const lng=Number(c[0]), lat=Number(c[1]); if(Number.isFinite(lat)&&Number.isFinite(lng)) return {lat,lng}; }
      const lat=Number(c.lat ?? c.latitude ?? (typeof c.getLat==='function'?c.getLat():undefined));
      const lng=Number(c.lng ?? c.lon ?? c.longitude ?? (typeof c.getLng==='function'?c.getLng():undefined));
      if(Number.isFinite(lat)&&Number.isFinite(lng)) return {lat,lng};
    }
  }catch(e){}
  return null;
}
function __nexoMapCenter(map, fallback){
  try{
    if(!map) return fallback;
    let c=null;
    if(typeof map.getCenter==='function') c=map.getCenter();
    else if(map.center) c=map.center;
    const p=__nexoMapEventCoords(c) || __nexoSafeCoords(c,null);
    if(p && Number.isFinite(p.lat) && Number.isFinite(p.lng)) return p;
  }catch(e){}
  return fallback || {lat:23.2199,lng:88.3625};
}
function __nexoSetMapCenter(map, coords){
  if(!map || !coords) return;
  try{ if(typeof map.setCenter==='function'){ map.setCenter({lat:coords.lat,lng:coords.lng}); return; } }catch(e){}
  try{ if(typeof map.panTo==='function'){ map.panTo({lat:coords.lat,lng:coords.lng}); return; } }catch(e){}
  try{ if(typeof map.flyTo==='function'){ map.flyTo({center:[coords.lng,coords.lat],zoom:15}); return; } }catch(e){}
}
function __nexoNearbySuggestions(coords, q=''){
  const text=String(q||'').trim();
  const local=(typeof __nexoKnownLocalPlaces==='function' ? __nexoKnownLocalPlaces() : []).map(p=>{
    const d=coords && p.coords ? __nexoDistKm(coords,p.coords) : 999;
    return {...p, distance_km:Math.round(d*100)/100, provider:p.provider||'LOCAL'};
  }).sort((a,b)=>a.distance_km-b.distance_km).slice(0,8);
  if(text && text.length>=2){
    const manual={name:`${text} (pin name)`, coords:coords||{lat:23.2199,lng:88.3625}, inside:true, provider:'MANUAL', manual:true, distance_km:0};
    return [manual,...local].slice(0,10);
  }
  return local;
}
function __nexoUpdatePickerStatus(){
  const s=__nexoPinPicker; if(!s) return;
  const box=$('pinPickerStatus');
  if(box) box.innerHTML=`<b>${s.type==='pickup'?'Pickup':'Drop'} Pin</b><span>${Number(s.coords.lat).toFixed(6)}, ${Number(s.coords.lng).toFixed(6)}</span><small>${esc(s.name||'Map-এর center pin select করুন')}</small>`;
}
async function __nexoUpdateNearbyList(q=''){
  const s=__nexoPinPicker; const list=$('mapPickerList'); if(!s || !list) return;
  const typed=String(q||$('mapPickerSearch')?.value||'').trim();
  let places=[];
  if(typed.length>=2){ try{ places=await loadPlaceSuggestions(typed); }catch(e){ places=[]; } }
  const nearby=__nexoNearbySuggestions(s.coords, typed);
  const seen=new Set();
  const all=[...places,...nearby].filter(p=>p&&p.name&&p.coords).filter(p=>{const k=__nexoNorm ? __nexoNorm(p.name) : String(p.name).toLowerCase(); if(seen.has(k)) return false; seen.add(k); return true;}).slice(0,14);
  const useCurrent=`<button class="pin-confirm-suggestion" onclick="__nexoConfirmCenterPin()"><b>✅ এই center pin select করুন</b><small>${coordsText(s.coords)} · ${esc(s.name||'selected point')}</small></button>`;
  const html=all.map((p,i)=>{
    const c=__nexoSafeCoords(p.coords,s.coords);
    const d=Number.isFinite(p.distance_km)?` · ${p.distance_km} km`:'';
    return `<button onclick="__nexoCenterPinFromSuggestion(${c.lat},${c.lng},'${esc(p.name)}')"><b>${i+1}. ${esc(p.name)}</b><small>${coordsText(c)} ${p.provider?`· ${esc(p.provider)}`:''}${d}</small></button>`;
  }).join('') || `<div class="alert">Area না এলে map নাড়িয়ে center pin বসিয়ে Confirm করুন।</div>`;
  list.innerHTML=useCurrent+html;
}
function __nexoCenterPinFromSuggestion(lat,lng,name){
  const s=__nexoPinPicker; if(!s) return;
  s.coords={lat:__nexoClamp(lat,6,38), lng:__nexoClamp(lng,68,98)};
  s.name=String(name||'Selected place');
  __nexoSetMapCenter(s.map,s.coords);
  __nexoUpdatePickerStatus();
  __nexoUpdateNearbyList('').catch(()=>{});
}
function __nexoMovePin(dLat,dLng){
  const s=__nexoPinPicker; if(!s) return;
  s.coords={lat:Math.round((Number(s.coords.lat)+dLat)*1000000)/1000000, lng:Math.round((Number(s.coords.lng)+dLng)*1000000)/1000000};
  s.name='Manual adjusted pin';
  __nexoSetMapCenter(s.map,s.coords);
  __nexoUpdatePickerStatus();
  __nexoUpdateNearbyList('').catch(()=>{});
}
function __nexoConfirmCenterPin(){
  const s=__nexoPinPicker; if(!s) return;
  const label=(s.name && !/^Manual adjusted|Map center|Selected point/i.test(s.name)) ? s.name : `${s.type==='pickup'?'Pickup':'Drop'} selected point`;
  setPinnedMapPoint(s.type,{lat:s.coords.lat,lng:s.coords.lng},label);
}
async function __nexoUseCurrentGPSInPicker(){
  const s=__nexoPinPicker; if(!s) return;
  try{
    const g=await getDeviceLocation('Current Location');
    s.coords={lat:Number(g.lat),lng:Number(g.lng)}; s.name='Current GPS location';
    __nexoSetMapCenter(s.map,s.coords); __nexoUpdatePickerStatus(); await __nexoUpdateNearbyList('');
  }catch(e){ toast(e.message||'GPS পাওয়া যায়নি'); }
}
function __nexoAttachMapEvents(map, s){
  const updateFromMap=()=>{
    const c=__nexoMapCenter(map,s.coords);
    if(!c) return;
    s.coords={lat:Number(c.lat),lng:Number(c.lng)}; s.name='Map center pin';
    __nexoUpdatePickerStatus();
    clearTimeout(s.moveTimer); s.moveTimer=setTimeout(()=>__nexoUpdateNearbyList('').catch(()=>{}),450);
  };
  const updateFromClick=(ev)=>{
    const c=__nexoMapEventCoords(ev) || __nexoMapCenter(map,s.coords);
    if(!c) return;
    s.coords={lat:Number(c.lat),lng:Number(c.lng)}; s.name='Tapped map point';
    __nexoSetMapCenter(map,s.coords); __nexoUpdatePickerStatus(); __nexoUpdateNearbyList('').catch(()=>{});
  };
  ['moveend','dragend','zoomend'].forEach(ev=>{ try{ if(typeof map.addListener==='function') map.addListener(ev,updateFromMap); }catch(e){} try{ if(typeof map.on==='function') map.on(ev,updateFromMap); }catch(e){} });
  ['click','tap'].forEach(ev=>{ try{ if(typeof map.addListener==='function') map.addListener(ev,updateFromClick); }catch(e){} try{ if(typeof map.on==='function') map.on(ev,updateFromClick); }catch(e){} });
}
async function __nexoRenderCenterPinMap(){
  const s=__nexoPinPicker, holder=$('mapPickerMap'); if(!s||!holder) return;
  holder.innerHTML=`<div class="pin-map-loading">Map loading...</div>`;
  try{
    await ensureMapplsSdk(false);
    const id='centerPinMap_'+Date.now();
    holder.className='map-picker-map center-pin-map-wrap real-mappls-host';
    holder.innerHTML=`<div id="${id}" class="real-mappls-canvas center-pin-canvas"></div><div class="center-pin-crosshair"></div><div class="fixed-center-pin ${s.type==='drop'?'drop':'pickup'}"><span>${s.type==='drop'?'D':'P'}</span></div><button type="button" class="pin-confirm-floating" onclick="__nexoConfirmCenterPin()">✅ এই pin নিন</button><div id="pinPickerStatus" class="pin-picker-status"></div>`;
    const map=new window.mappls.Map(id,{center:{lat:s.coords.lat,lng:s.coords.lng},zoom:16,geolocation:false});
    s.map=map;
    setTimeout(()=>{ __nexoAttachMapEvents(map,s); __nexoUpdatePickerStatus(); __nexoUpdateNearbyList('').catch(()=>{}); },800);
  }catch(e){
    holder.className='map-picker-map center-pin-map-wrap fallback-center-pin';
    holder.innerHTML=`<div class="nexo-inapp-map picker movable-fallback-map"><div class="map-grid-bg"></div><div class="map-road road-one"></div><div class="map-road road-two"></div><div class="center-pin-crosshair"></div><div class="fixed-center-pin ${s.type==='drop'?'drop':'pickup'}"><span>${s.type==='drop'?'D':'P'}</span></div><button type="button" class="pin-confirm-floating" onclick="__nexoConfirmCenterPin()">✅ এই pin নিন</button><div id="pinPickerStatus" class="pin-picker-status"></div><div class="map-sdk-warning">Real map load না হলে arrow দিয়ে pin নাড়ান</div></div>`;
    holder.onclick=(ev)=>{ if(ev.target.closest('button')) return; const c=__nexoClickToApproxCoords(ev,holder,s.coords); s.coords=c; s.name='Map tap pin'; __nexoUpdatePickerStatus(); __nexoUpdateNearbyList('').catch(()=>{}); };
    __nexoUpdatePickerStatus(); __nexoUpdateNearbyList('').catch(()=>{});
  }
}
function mapPickerModal(type){
  const old=document.getElementById('mapPickerOverlay'); if(old) old.remove();
  const center=__nexoInitialPickerCoords(type);
  __nexoPinPicker={type, coords:center, name:type==='pickup'?'Pickup selected point':'Drop selected point', map:null, moveTimer:null};
  const overlay=document.createElement('div'); overlay.id='mapPickerOverlay'; overlay.className='map-picker-overlay center-pin-picker-overlay';
  overlay.innerHTML=`<div class="map-picker-card center-pin-picker-card"><div class="section-title"><h2>${type==='pickup'?'Pickup map':'Drop map'}</h2><button onclick="document.getElementById('mapPickerOverlay')?.remove()">Close</button></div><div class="pin-help">Map নাড়ান — মাঝখানের pin যেখানে থাকবে সেটাই ${type==='pickup'?'pickup':'drop'} হবে। Area search করলে নিচে nearby suggestion আসবে।</div><input class="big-input" id="mapPickerSearch" placeholder="জায়গার নাম লিখুন / Search place" oninput="mapPickerSearch('${type}',this.value)"><div class="pin-picker-tools"><button class="ghost" onclick="__nexoUseCurrentGPSInPicker()">📡 Current GPS</button><button class="ghost" onclick="__nexoMovePin(0.0005,0)">↑</button><button class="ghost" onclick="__nexoMovePin(0,-0.0005)">←</button><button class="ghost" onclick="__nexoMovePin(0,0.0005)">→</button><button class="ghost" onclick="__nexoMovePin(-0.0005,0)">↓</button></div><div id="mapPickerMap" class="map-picker-map center-pin-map-wrap"><div class="alert">Map loading...</div></div><div id="mapPickerList" class="map-picker-list"></div></div>`;
  document.body.appendChild(overlay);
  __nexoRenderCenterPinMap().catch(()=>{});
}
async function mapPickerSearch(type,q){
  const s=__nexoPinPicker; if(!s) return;
  const list=$('mapPickerList'); if(list) list.innerHTML='<div class="alert">Search হচ্ছে...</div>';
  const typed=String(q||'').trim();
  if(typed.length>=2){
    let places=[]; try{ places=await loadPlaceSuggestions(typed); }catch(e){ places=[]; }
    if(places && places[0] && places[0].coords){
      const c=__nexoSafeCoords(places[0].coords,s.coords);
      s.coords=c; s.name=places[0].name || typed; __nexoSetMapCenter(s.map,c); __nexoUpdatePickerStatus();
    }else{
      s.name=typed;
    }
  }
  await __nexoUpdateNearbyList(typed);
}

/* v2.0 Sprint-4H - Pickup + Drop Same Center-Pin Selection Flow
   Server Update Only. Ensures both pickup and drop use the movable center pin,
   and after confirming pickup the booking flow moves to drop selection; after
   confirming drop it moves to fare/route preview. */
try { window.NEXO_RIDE_SPRINT4H_PICKUP_DROP_CENTER_PIN = true; } catch(e) {}
function setPinnedMapPoint(type, coords, label){
  try{
    const t = (String(type||'').toLowerCase()==='drop') ? 'drop' : 'pickup';
    const c = coords ? {lat:Number(coords.lat), lng:Number(coords.lng)} : null;
    if(!c || !Number.isFinite(c.lat) || !Number.isFinite(c.lng)) return toast('Pin location পাওয়া যায়নি');
    const cleanLabel = String(label||'').replace(/\s*\(manual pin\)\s*/i,'').trim();
    const prefix = t==='pickup' ? 'Pickup' : 'Drop';
    const name = cleanLabel && !/^pickup selected point|drop selected point|selected point$/i.test(cleanLabel)
      ? `${cleanLabel} ${c.lat.toFixed(5)},${c.lng.toFixed(5)}`
      : `${prefix} selected point ${c.lat.toFixed(5)},${c.lng.toFixed(5)}`;
    booking[t] = name;
    try{ booking[t+'_coords'] = {lat:c.lat,lng:c.lng}; }catch(e){}
    if($(t)) $(t).value = name;
    try{ setPoint(t, name); }catch(e){}
    document.getElementById('mapPickerOverlay')?.remove();
    toast((t==='pickup'?'Pickup':'Drop')+' pin set');
    if(t==='pickup'){
      booking.step = 2;
      setTimeout(async()=>{
        await refreshBookingStep();
        setTimeout(()=>{ try{ document.getElementById('drop')?.focus(); }catch(e){} },150);
      },80);
    }else{
      booking.step = 3;
      setTimeout(async()=>{
        await refreshBookingStep();
        setTimeout(()=>{ try{ previewRouteBox(); refreshMiniBookingMap(); }catch(e){} },150);
      },80);
    }
  }catch(err){
    toast(err.message || 'Pin set error');
  }
}
function __nexoConfirmCenterPin(){
  const s=__nexoPinPicker; if(!s) return;
  const label=(s.name && !/^Manual adjusted|Map center|Selected point|Tapped map point/i.test(s.name)) ? s.name : `${s.type==='pickup'?'Pickup':'Drop'} selected point`;
  setPinnedMapPoint(s.type,{lat:s.coords.lat,lng:s.coords.lng},label);
}


/* v2.0 Sprint-4I - Live Driver Distance + Moving Ride Map Tracking
   Server Update Only. After driver selection, passenger can see driver-to-pickup distance on map.
   After ride start, passenger/admin/driver can see driver-to-drop remaining map and ETA.
   Driver app sends fresh GPS before ride actions and while ride screen is open. */
try { window.NEXO_RIDE_SPRINT4I_LIVE_DRIVER_ROUTE_TRACKING = true; } catch(e) {}

function __nexoRideCoord(r,type){
  if(!r) return null;
  if(type==='driver') return asCoords(r.driver_coords || (r.driver_lat&&r.driver_lng?{lat:r.driver_lat,lng:r.driver_lng}:null), null);
  if(type==='pickup') return asCoords(r.pickup_coords || (r.pickup_lat&&r.pickup_lng?{lat:r.pickup_lat,lng:r.pickup_lng}:null), null);
  if(type==='drop') return asCoords(r.drop_coords || (r.drop_lat&&r.drop_lng?{lat:r.drop_lat,lng:r.drop_lng}:null), null);
  return null;
}
function __nexoKm(a,b){
  a=asCoords(a,null); b=asCoords(b,null); if(!a||!b) return null;
  const R=6371, dLat=(Number(b.lat)-Number(a.lat))*Math.PI/180, dLng=(Number(b.lng)-Number(a.lng))*Math.PI/180;
  const la1=Number(a.lat)*Math.PI/180, la2=Number(b.lat)*Math.PI/180;
  const h=Math.sin(dLat/2)**2 + Math.cos(la1)*Math.cos(la2)*Math.sin(dLng/2)**2;
  return Math.round((2*R*Math.atan2(Math.sqrt(h),Math.sqrt(1-h)))*100)/100;
}
function __nexoEta(km){
  km=Number(km); if(!Number.isFinite(km)) return '-';
  return Math.max(1, Math.round((km/16)*60));
}
function __nexoLiveRideTarget(r){
  const st=String(r.status||'').toUpperCase();
  const driver=__nexoRideCoord(r,'driver');
  const pickup=__nexoRideCoord(r,'pickup');
  const drop=__nexoRideCoord(r,'drop');
  const goingDrop=st==='STARTED';
  const target=goingDrop?drop:pickup;
  const targetLabel=goingDrop?'Drop':'Pickup';
  const Bengali=goingDrop?'ড্রপ':'পিকআপ';
  return {driver,pickup,drop,target,targetLabel,Bengali,goingDrop,status:st};
}
function __nexoLiveMapStatusHtml(r){
  const t=__nexoLiveRideTarget(r);
  if(!t.driver || !t.target){
    return `<div class="live-map-wait"><b>📡 Live GPS waiting</b><span>${r.driver_id?'Driver GPS update হলে map-এ গাড়ি দেখাবে।':'Driver accept করলে live map চালু হবে।'}</span></div>`;
  }
  const km=__nexoKm(t.driver,t.target); const eta=__nexoEta(km);
  const seen=r.driver_last_seen_at?String(r.driver_last_seen_at).slice(11,19):'live';
  const msg=t.goingDrop?`রাইড চলছে · ${t.Bengali} পর্যন্ত ${km} km`:`Driver pickup-এর দিকে আসছে · ${km} km দূরে`;
  return `<div class="live-map-metrics"><div><b>${esc(msg)}</b><span>ETA approx ${eta} min · GPS ${seen}</span></div><button class="ride-mini-btn" onclick="openLiveRideMap('${esc(r.id)}')">🗺️ Full Map</button></div>`;
}
async function __nexoRenderLiveDriverMapInto(container,r,opts={}){
  if(!container || !r) return false;
  const t=__nexoLiveRideTarget(r);
  const points=[];
  if(t.driver) points.push({label:'🛺', coords:t.driver, name:'Driver / Toto', cls:'driver'});
  if(t.target) points.push({label:t.goingDrop?'D':'P', coords:t.target, name:t.targetLabel, cls:t.goingDrop?'drop':'pickup'});
  if(!t.goingDrop && t.drop) points.push({label:'D', coords:t.drop, name:'Drop', cls:'drop-soft'});
  if(t.goingDrop && t.pickup) points.push({label:'P', coords:t.pickup, name:'Pickup', cls:'pickup-soft'});
  try{
    if(!points.length) throw new Error('No live points');
    await ensureMapplsSdk(false);
    const id='liveDriverMap_'+(++__realMapCounter);
    container.classList.add('real-mappls-host','live-driver-real-map');
    container.innerHTML=`<div id="${id}" class="real-mappls-canvas live-driver-canvas"></div><div class="real-map-badge">Live Driver Map</div>`;
    const center=t.driver || t.target || {lat:23.2199,lng:88.3625};
    const zoom=opts.full?15:14;
    const map=new window.mappls.Map(id,{center:{lat:center.lat,lng:center.lng},zoom,geolocation:false});
    setTimeout(()=>{
      try{
        points.forEach(p=>{
          const label=p.label;
          const html=`<div class="html-pin html-pin-${p.cls||'pickup'} live-html-pin"><b>${esc(label)}</b></div>`;
          try{ new window.mappls.Marker({map, position:{lat:p.coords.lat,lng:p.coords.lng}, html, popupHtml:esc(p.name)}); }
          catch(e){ new window.mappls.Marker({map, position:{lat:p.coords.lat,lng:p.coords.lng}}); }
        });
        if(t.driver && t.target && window.mappls.Polyline){
          try{ new window.mappls.Polyline({map, paths:[{lat:t.driver.lat,lng:t.driver.lng},{lat:t.target.lat,lng:t.target.lng}], strokeColor:'#22d3ee', strokeOpacity:0.92, strokeWeight:6}); }catch(e){}
        }
        if(t.pickup && t.drop && window.mappls.Polyline){
          try{ new window.mappls.Polyline({map, paths:[{lat:t.pickup.lat,lng:t.pickup.lng},{lat:t.drop.lat,lng:t.drop.lng}], strokeColor:'#a78bfa', strokeOpacity:0.42, strokeWeight:4}); }catch(e){}
        }
      }catch(e){ console.warn('live marker/line failed',e); }
    },650);
    return true;
  }catch(e){
    const rt={pickup:r.pickup,drop:r.drop,pickup_coords:t.pickup,drop_coords:t.drop,driver_coords:t.driver,estimated_fare:r.estimated_fare,distance_km:r.distance_km,navigation_links:{google_web:navLinkFromRide(r,t.goingDrop?'drop':'pickup')}};
    container.innerHTML=inAppMapHtml(rt,'ride');
    return false;
  }
}
function liveDriverTrackingBox(r){
  const st=String(r.status||'').toUpperCase();
  const active=['DRIVER_ACCEPTED','CONFIRMED','ARRIVED','STARTED'].includes(st);
  if(!active || !r.driver_id) return '';
  const id='liveRoute_'+String(r.id||'').replace(/[^a-zA-Z0-9_]/g,'_');
  setTimeout(()=>{ const el=$(id); if(el) __nexoRenderLiveDriverMapInto(el,r,{full:false}).catch(()=>{}); },180);
  const title=st==='STARTED'?'🚕 Live Ride Tracking':'🚕 Driver Coming to Pickup';
  const note=st==='STARTED'?'গাড়ি কোথা দিয়ে যাচ্ছে এবং drop পর্যন্ত কতদূর আছে দেখাবে।':'driver select হওয়ার পর গাড়ি pickup থেকে কত দূরে আছে দেখাবে।';
  return `<div class="live-driver-track-card"><div class="live-track-head"><b>${title}</b><span>${note}</span></div>${__nexoLiveMapStatusHtml(r)}<div id="${id}" class="live-driver-map-box"><div class="alert">Live map loading...</div></div></div>`;
}
async function openLiveRideMap(id){
  try{
    const data=await api(`/rides/${id}/live?t=${Date.now()}`);
    const r=data.ride||data;
    const old=document.getElementById('liveRideMapOverlay'); if(old) old.remove();
    const t=__nexoLiveRideTarget(r); const km=(t.driver&&t.target)?__nexoKm(t.driver,t.target):null;
    const overlay=document.createElement('div'); overlay.id='liveRideMapOverlay'; overlay.className='map-picker-overlay live-ride-overlay';
    overlay.innerHTML=`<div class="map-picker-card live-ride-card"><div class="section-title"><h2>${t.goingDrop?'Live Ride to Drop':'Driver to Pickup'}</h2><button onclick="document.getElementById('liveRideMapOverlay')?.remove()">Close</button></div><div class="pin-help">${esc(r.pickup)} → ${esc(r.drop)}<br>${km!==null?`Remaining approx ${km} km · ETA ${__nexoEta(km)} min`: 'Driver GPS update waiting'}</div><div id="liveRideFullMap" class="center-pin-map-wrap live-full-map"><div class="alert">Live map loading...</div></div><div class="pin-picker-tools"><button class="primary" onclick="openLiveRideMap('${esc(id)}')">↻ Refresh</button><a class="ghost" target="_blank" href="${navLinkFromRide(r,t.goingDrop?'drop':'pickup')}">Open Navigation</a></div></div>`;
    document.body.appendChild(overlay);
    await __nexoRenderLiveDriverMapInto($('liveRideFullMap'),r,{full:true});
  }catch(e){toast(e.message)}
}
function rideRouteMiniMap(r){
  const st=String(r.status||'').toUpperCase();
  if(['DRIVER_ACCEPTED','CONFIRMED','ARRIVED','STARTED'].includes(st) && r.driver_id) return liveDriverTrackingBox(r);
  const rt={pickup:r.pickup,drop:r.drop,pickup_coords:r.pickup_coords || (r.pickup_lat&&r.pickup_lng?{lat:r.pickup_lat,lng:r.pickup_lng}:null), drop_coords:r.drop_coords || (r.drop_lat&&r.drop_lng?{lat:r.drop_lat,lng:r.drop_lng}:null), driver_coords:r.driver_lat&&r.driver_lng?{lat:r.driver_lat,lng:r.driver_lng}:null, estimated_fare:r.estimated_fare,distance_km:r.distance_km,navigation_links:{google_web:navLinkFromRide(r,'drop')}};
  const id='rideMap_'+String(r.id||'').replace(/[^a-zA-Z0-9_]/g,'_');
  setTimeout(()=>{ const el=$(id); if(el) renderRealOrFallbackMap(el,rt,{mode:'ride'}).catch(()=>{}); },120);
  return `<div class="ride-map-mini-wrap"><div id="${id}" class="mini-booking-map real-ride-map"><div class="alert">Map loading...</div></div></div>`;
}
function rideRow(r){
  const isDriver=roleMode==='DRIVER';
  const isPassenger=roleMode==='PASSENGER';
  let actions='';
  if(isDriver && r.status==='REQUESTED') actions=`<div class="ride-action-stack"><button class="ghost big-action" onclick="rideAction('${r.id}','reject')">✖ Reject</button><button class="primary big-action" onclick="rideAction('${r.id}','accept')">✅ ${L('accept')}</button></div>`;
  else if(isPassenger&&r.status==='DRIVER_ACCEPTED') actions=`<button class="primary mini-pay" onclick="rideAction('${r.id}','pay')">💳 Pay Now</button>`;
  else if(isDriver&&r.status==='CONFIRMED') actions=`<button class="ghost big-action" onclick="rideAction('${r.id}','arrive')">📍 Reached Pickup</button>`;
  else if(isDriver&&r.status==='ARRIVED') actions=`<div class="otp-start-box"><input id="otp-${r.id}" inputmode="numeric" maxlength="4" placeholder="Passenger OTP"><button class="ghost big-action" onclick="rideAction('${r.id}','start')">▶️ ${L('start')}</button></div>`;
  else if(isDriver&&r.status==='STARTED') actions=`<button class="ghost big-action" onclick="rideAction('${r.id}','complete')">🏁 ${L('complete')}</button>`;
  else if(isPassenger&&r.status==='COMPLETED'&&!r.rating_by_passenger) actions=`<button class="primary mini-pay" onclick="rateRide('${r.id}')">⭐ Rate</button>`;
  else actions=`<em>›</em>`;
  const seatTxt=r.ride_type==='SHARING'?` · ${r.seats||1} seat`:'';
  const driverTxt=r.driver_name?` · Driver: ${esc(r.driver_name)} ${r.driver_vehicle_no?`(${esc(r.driver_vehicle_no)})`:''}`:'';
  const passengerTxt=isDriver&&r.passenger_name?` · Passenger: ${esc(r.passenger_name)}`:'';
  const fareLine=`${esc(r.ride_type||'FULL')}${seatTxt} · ₹${r.estimated_fare}${r.driver_earning?` · Driver ₹${r.driver_earning}`:''}${r.rating_by_passenger?` · ${r.rating_by_passenger}⭐`:''}${driverTxt}${passengerTxt}`;
  const liveMap=rideRouteMiniMap(r);
  return `<div class="row ride-row ride-row-${esc(r.status)}"><i>🛺</i><div><b>${esc(r.pickup)} → ${esc(r.drop)}</b><span><b class="status-pill">${rideStatusText(r.status)}</b> · ${fareLine}</span>${candidateText(r)}${timerHtml(r)}${liveMap}${safetyActions(r)}<div class="ride-progress"><b style="width:${rideProgressPct(r.status)}%"></b></div></div>${actions}</div>`;
}
const __nexoBaseRideAction4I = typeof rideAction==='function' ? rideAction : null;
if(__nexoBaseRideAction4I){
  rideAction = async function(id, action){
    try{
      if(roleMode==='DRIVER' && ['accept','arrive','start','complete'].includes(String(action||''))){
        await sendDriverLocation('DRIVER_RIDE_ACTION_'+String(action||'').toUpperCase()).catch(()=>{});
      }
    }catch(e){}
    return __nexoBaseRideAction4I(id, action);
  };
}
const __nexoBaseRidesView4I = typeof ridesView==='function' ? ridesView : null;
if(__nexoBaseRidesView4I){
  ridesView = async function(){
    try{
      if(roleMode==='DRIVER' && driverProfile && (driverProfile.online || isDriverApprovedForOnline(driverProfile))){
        sendDriverLocation('DRIVER_RIDES_SCREEN_LIVE').catch(()=>{});
      }
    }catch(e){}
    return __nexoBaseRidesView4I();
  };
}


// v2.0 Sprint-5A - Payment Wallet + Cancel Ride + Ride Details (Server Update Only)
try { window.NEXO_RIDE_SPRINT5A_PAYMENT_CANCEL_DETAILS = true; } catch(e) {}
function nexoFmtDate(v){ if(!v) return '-'; try{return new Date(v).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});}catch(e){return String(v).slice(0,16).replace('T',' ')} }
function nexoFullDate(v){ if(!v) return '-'; try{return new Date(v).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'});}catch(e){return String(v).slice(0,19).replace('T',' ')} }
function canCancelRideLocal(r){ const st=String(r?.status||'').toUpperCase(); return !['COMPLETED','CANCELLED','PAYMENT_TIMEOUT'].includes(st) && st!=='STARTED'; }
function cancelButtonHtml(r, cls='ghost'){ return canCancelRideLocal(r)?`<button class="${cls} danger-action" onclick="event.stopPropagation();cancelRide('${esc(r.id)}')">✖ Cancel</button>`:''; }
function statusBadgeHtml(r){ return `<b class="status-pill status-${esc(String(r.status||'').toLowerCase())}">${rideStatusText(r.status)}</b>`; }
function rideAmountLine(r){ const seatTxt=r.ride_type==='SHARING'?` · ${r.seats||1} seat`:''; return `${esc(r.ride_type||'FULL')}${seatTxt} · Fare ₹${r.estimated_fare||0} · Payment ${esc(r.payment_status||'PENDING')}`; }
function rideActionButtons(r){
  const isDriver=roleMode==='DRIVER', isPassenger=roleMode==='PASSENGER'; let buttons='';
  if(isDriver && r.status==='REQUESTED') buttons=`<button class="ghost big-action" onclick="event.stopPropagation();rideAction('${r.id}','reject')">✖ Reject</button><button class="primary big-action" onclick="event.stopPropagation();rideAction('${r.id}','accept')">✅ ${L('accept')}</button>`;
  else if(isPassenger&&r.status==='DRIVER_ACCEPTED') buttons=`<button class="primary mini-pay" onclick="event.stopPropagation();rideAction('${r.id}','pay')">💳 Pay Now</button>`;
  else if(isDriver&&r.status==='CONFIRMED') buttons=`<button class="ghost big-action" onclick="event.stopPropagation();rideAction('${r.id}','arrive')">📍 Reached Pickup</button>`;
  else if(isDriver&&r.status==='ARRIVED') buttons=`<div class="otp-start-box" onclick="event.stopPropagation()"><input id="otp-${r.id}" inputmode="numeric" maxlength="4" placeholder="Passenger OTP"><button class="ghost big-action" onclick="event.stopPropagation();rideAction('${r.id}','start')">▶️ ${L('start')}</button></div>`;
  else if(isDriver&&r.status==='STARTED') buttons=`<button class="ghost big-action" onclick="event.stopPropagation();rideAction('${r.id}','complete')">🏁 ${L('complete')}</button>`;
  else if(isPassenger&&r.status==='COMPLETED'&&!r.rating_by_passenger) buttons=`<button class="primary mini-pay" onclick="event.stopPropagation();rateRide('${r.id}')">⭐ Rate</button>`;
  const cancel=cancelButtonHtml(r,'ghost');
  const details=`<button class="ghost mini-detail" onclick="event.stopPropagation();openRideDetails('${esc(r.id)}')">Details</button>`;
  if(buttons || cancel) return `<div class="ride-action-stack sprint5-actions">${buttons}${cancel}${details}</div>`;
  return `<div class="ride-action-stack sprint5-actions">${details}</div>`;
}
function rideRow(r){
  const isDriver=roleMode==='DRIVER';
  const driverTxt=r.driver_name?` · Driver: ${esc(r.driver_name)} ${r.driver_vehicle_no?`(${esc(r.driver_vehicle_no)})`:''}`:'';
  const passengerTxt=isDriver&&r.passenger_name?` · Passenger: ${esc(r.passenger_name)}`:'';
  const earnTxt=((roleMode==='DRIVER'||roleMode==='ADMIN')&&r.driver_earning)?` · Driver ₹${r.driver_earning}`:'';
  const ratingTxt=r.rating_by_passenger?` · ${r.rating_by_passenger}⭐`:'';
  const fareLine=`${rideAmountLine(r)}${earnTxt}${ratingTxt}${driverTxt}${passengerTxt}`;
  const liveMap=rideRouteMiniMap(r);
  const timeLine=(r.created_at?`Booked ${nexoFmtDate(r.created_at)}`:'')+(r.completed_at?` · Completed ${nexoFmtDate(r.completed_at)}`:'')+(r.cancelled_at?` · Cancelled ${nexoFmtDate(r.cancelled_at)}`:'');
  return `<div class="row ride-row ride-row-${esc(r.status)} ride-clickable" onclick="openRideDetails('${esc(r.id)}')"><i>🛺</i><div><b>${esc(r.pickup)} → ${esc(r.drop)}</b><span>${statusBadgeHtml(r)} · ${fareLine}</span><small>${esc(timeLine)}</small>${candidateText(r)}${timerHtml(r)}${liveMap}${safetyActions(r)}<div class="ride-progress"><b style="width:${rideProgressPct(r.status)}%"></b></div></div>${rideActionButtons(r)}</div>`;
}
async function cancelRide(id){
  try{
    const reason=prompt('Ride cancel করার কারণ লিখুন','Passenger/Driver request')||'Cancelled from app';
    if(reason===null) return;
    await api(`/rides/${id}/cancel`,{method:'POST',body:{reason}});
    toast('Ride cancelled');
    document.getElementById('rideDetailsOverlay')?.remove();
    ridesView();
  }catch(e){ toast(e.message); }
}
function rideTimelineHtml(timeline){
  if(!timeline||!timeline.length) return '<div class="alert">Timeline not available.</div>';
  return `<div class="ride-detail-timeline">${timeline.map(x=>`<div><i>●</i><b>${esc(x.label)}</b><span>${nexoFullDate(x.at)}</span></div>`).join('')}</div>`;
}
function rideDetailFinanceHtml(d){
  const r=d.ride||{}, f=d.finance||{}, p=d.payment||{};
  const fare=f.fare||r.estimated_fare||0;
  const pay=esc(p.status||r.payment_status||'PENDING');
  const refund=esc(f.refund_status||r.refund_status||'NOT_REQUIRED');
  const km=(r.distance_km||r.route_distance_km||r.straight_distance_km||'');
  const rideType=esc(r.ride_type||'FULL');
  // Passenger screen should show customer-facing details only.
  // Internal business fields (driver earning / commission / settlement) are hidden from passengers.
  if(roleMode==='PASSENGER'){
    return `<div class="ride-detail-grid passenger-detail-grid"><div><b>₹${fare}</b><span>Total Fare</span></div><div><b>${pay}</b><span>Payment</span></div><div><b>${rideType}</b><span>Ride Type</span></div><div><b>${km?esc(String(km)+' km'):'-'}</b><span>Distance</span></div>${refund&&refund!=='NOT_REQUIRED'?`<div><b>${refund}</b><span>Refund</span></div>`:''}</div>`;
  }
  if(roleMode==='DRIVER'){
    return `<div class="ride-detail-grid driver-detail-grid"><div><b>₹${fare}</b><span>Total Fare</span></div><div><b>₹${f.driver_earning||0}</b><span>Your Earning</span></div><div><b>${esc(f.settlement_status||'PENDING')}</b><span>Payout</span></div><div><b>${pay}</b><span>Payment</span></div></div>`;
  }
  return `<div class="ride-detail-grid admin-detail-grid"><div><b>₹${fare}</b><span>Total Fare</span></div><div><b>₹${f.driver_earning||0}</b><span>Driver Earning</span></div><div><b>₹${f.platform_commission||0}</b><span>Commission</span></div><div><b>${esc(f.settlement_status||'PENDING')}</b><span>Settlement</span></div><div><b>${pay}</b><span>Payment</span></div><div><b>${refund}</b><span>Refund</span></div></div>`;
}
function rideDetailPeopleHtml(d){
  const p=d.passenger||{}, dr=d.driver||{};
  return `<div class="ride-detail-people"><div><b>Passenger</b><span>${esc(p.name||'')} ${p.mobile?`· ${esc(p.mobile)}`:''}</span></div><div><b>Driver</b><span>${esc(dr.name||'Not assigned')} ${dr.mobile?`· ${esc(dr.mobile)}`:''} ${dr.vehicle_no?`· Toto ${esc(dr.vehicle_no)}`:''}</span></div></div>`;
}
async function openRideDetails(id){
  try{
    const d=await api(`/rides/${id}/details?t=${Date.now()}`);
    const r=d.ride||{};
    const old=document.getElementById('rideDetailsOverlay'); if(old) old.remove();
    const overlay=document.createElement('div'); overlay.id='rideDetailsOverlay'; overlay.className='map-picker-overlay ride-details-overlay';
    const cancelBtn=d.can_cancel?`<button class="ghost danger-action" onclick="cancelRide('${esc(r.id)}')">✖ Cancel Ride</button>`:'';
    const payBtn=(roleMode==='PASSENGER'&&r.status==='DRIVER_ACCEPTED')?`<button class="primary" onclick="document.getElementById('rideDetailsOverlay')?.remove();rideAction('${esc(r.id)}','pay')">💳 Pay Now</button>`:'';
    const rateBtn=(roleMode==='PASSENGER'&&r.status==='COMPLETED'&&!r.rating_by_passenger)?`<button class="primary" onclick="document.getElementById('rideDetailsOverlay')?.remove();rateRide('${esc(r.id)}')">⭐ Rate Driver</button>`:'';
    const liveBtn=['DRIVER_ACCEPTED','CONFIRMED','ARRIVED','STARTED'].includes(String(r.status||''))&&r.driver_id?`<button class="ghost" onclick="openLiveRideMap('${esc(r.id)}')">🚕 Live Map</button>`:'';
    overlay.innerHTML=`<div class="map-picker-card ride-details-card"><div class="section-title"><h2>Ride Details</h2><button onclick="document.getElementById('rideDetailsOverlay')?.remove()">Close</button></div><div class="ride-detail-route"><b>${esc(r.pickup||'-')}</b><i>→</i><b>${esc(r.drop||'-')}</b></div><div class="ride-detail-status">${statusBadgeHtml(r)}<span>Ride ID: ${esc(String(r.id||'').slice(-8))}</span></div><div class="ride-detail-map">${rideRouteMiniMap(r)}</div>${rideDetailFinanceHtml(d)}${rideDetailPeopleHtml(d)}<div class="card inner-card"><div class="section-title"><h2>Booking Timeline</h2><button>${esc(r.status||'')}</button></div>${rideTimelineHtml(d.timeline)}</div><div class="ride-detail-note">${esc(d.cancel_note||'')}</div><div class="ride-detail-actions">${payBtn}${rateBtn}${liveBtn}<button class="ghost" onclick="shareTrip('${esc(r.id)}')">🔗 Share</button><button class="ghost" onclick="currentTab='support';document.getElementById('rideDetailsOverlay')?.remove();render()">🆘 Support</button>${cancelBtn}</div></div>`;
    document.body.appendChild(overlay);
  }catch(e){ toast(e.message); }
}
async function requestDriverPayout(){
  try{
    const payout_account=prompt('UPI ID / Bank reference লিখুন (optional)','')||'';
    const r=await api('/driver/payout-request',{method:'POST',body:{payout_account,payout_method:payout_account?'UPI/Bank':'Manual'}});
    toast(`Payout request sent: ₹${r.request?.amount||0}`);
    driverEarningsView();
  }catch(e){toast(e.message)}
}
async function adminMarkDriverPayoutRequest(id){
  try{
    const payment_ref=prompt('Payment reference লিখুন','Manual payout')||'Manual payout';
    await api(`/admin/driver-payout-requests/${id}/pay`,{method:'POST',body:{payment_ref}});
    toast('Payout request paid');
    adminPaymentsView();
  }catch(e){toast(e.message)}
}
async function driverEarningsView(){
  try{
    const r=await api('/driver/earnings'); let pr={requests:[],summary:{}}; try{pr=await api('/driver/payout-requests')}catch(e){}
    const s=r.summary||{};
    const rows=(r.rides||[]).slice(0,30).map(x=>`<div class="row ride-clickable" onclick="openRideDetails('${esc(x.id)}')"><i>₹</i><div><b>${esc(x.pickup)} → ${esc(x.drop)}</b><span>${nexoFmtDate(x.completed_at||x.updated_at)} · Fare ₹${x.estimated_fare} · Your ₹${x.driver_earning||0} · Commission ₹${x.platform_commission||0}</span></div><em>${x.settlement_status||'PENDING'}</em></div>`).join('')||`<div class="alert">Complete ride হলে earning এখানে দেখাবে।</div>`;
    const reqRows=(pr.requests||[]).slice(0,10).map(x=>`<div class="row"><i>💸</i><div><b>Payout Request ₹${x.amount||0}</b><span>${nexoFmtDate(x.created_at)} · ${x.ride_count||0} rides · ${esc(x.payout_account||'Manual')}</span></div><em>${esc(x.status||'REQUESTED')}</em></div>`).join('')||`<div class="ok">Payout request করলে এখানে status দেখাবে।</div>`;
    const paidRows=(r.settlements||[]).slice(0,15).map(x=>`<div class="row"><i>✅</i><div><b>Payout Paid ₹${x.amount||0}</b><span>${(x.paid_at||'').slice(0,10)} · ${x.ride_count||0} rides · Ref: ${esc(x.payment_ref||'Manual')}</span></div><em>PAID</em></div>`).join('')||`<div class="ok">Admin payout mark paid করলে settlement history দেখাবে।</div>`;
    shell(`<section class="hero-card"><div><span class="glow-chip">Driver Wallet</span><h2>Today ₹${s.today_earnings||0}</h2><p>Total ₹${s.total_earnings||0} · Pending payout ₹${s.pending_payout||0}</p></div><button class="primary" onclick="requestDriverPayout()">Payout Request</button></section><section class="summary earnings-summary wallet-highlight"><div><b>₹${s.total_earnings||0}</b><span>Total</span></div><div><b>₹${s.pending_payout||0}</b><span>Pending</span></div><div><b>₹${s.paid_payout||0}</b><span>Paid</span></div></section><section class="summary earnings-summary"><div><b>${s.total_rides||0}</b><span>Rides</span></div><div><b>${s.rating||5}⭐</b><span>Rating</span></div><div><b>₹${s.platform_commission||0}</b><span>Commission</span></div></section><section class="voice-help"><button>ℹ️</button><span>Ride completed হলেই earning pending payout-এ যাবে। Payout Request দিলে admin approve/paid করবে।</span></section><section class="card"><div class="section-title"><h2>Payout Requests</h2><button>${(pr.requests||[]).length}</button></div><div class="list">${reqRows}</div></section><section class="card"><div class="section-title"><h2>Earning History</h2><button>${s.total_rides||0}</button></div><div class="list">${rows}</div></section><section class="card settlement-card"><div class="section-title"><h2>Payout Settlement</h2><button>${(r.settlements||[]).length}</button></div><div class="list">${paidRows}</div></section>`)
  }catch(e){shell(`<section class="card"><div class="alert">${esc(e.message)}</div></section>`)}
}
async function adminPaymentsView(){
  try{
    const r=await api('/admin/payments'); let set={summary:{},drivers:[],settlements:[]}; let pr={summary:{},requests:[]};
    try{set=await api('/admin/settlements')}catch(e){} try{pr=await api('/admin/driver-payout-requests')}catch(e){}
    const reqRows=(pr.requests||[]).filter(x=>x.status!=='PAID').map(x=>`<div class="row settlement-driver-row"><i>🧾</i><div><b>${esc(x.driver_name||'Driver')} · ${esc(x.vehicle_no||'Toto')}</b><span>${esc(x.driver_mobile||'')} · Request ₹${x.amount||0} · ${x.ride_count||0} rides · ${nexoFmtDate(x.created_at)}</span></div><button class="primary mini-pay" onclick="adminMarkDriverPayoutRequest('${esc(x.id)}')">Pay</button></div>`).join('')||`<div class="ok">No pending driver payout request.</div>`;
    const pendingRows=(set.drivers||[]).map(x=>`<div class="row settlement-driver-row"><i>💸</i><div><b>${esc(x.driver_name||'Driver')} · ${esc(x.vehicle_no||'Toto')}</b><span>${esc(x.driver_mobile||'')} · ${x.rides||0} rides · Pending ₹${x.amount||0}</span></div><button class="primary mini-pay" onclick="adminMarkPayout('${x.driver_id}')">Mark Paid</button></div>`).join('')||`<div class="ok">No pending driver payout.</div>`;
    const rows=(r.rides||[]).slice(0,25).map(x=>`<div class="row ride-clickable" onclick="openRideDetails('${esc(x.id)}')"><i>🧾</i><div><b>${esc(x.driver_name||'Driver')} · ${esc(x.driver_vehicle_no||'Toto')}</b><span>${esc(x.pickup)} → ${esc(x.drop)} · Fare ₹${x.estimated_fare} · Driver ₹${x.driver_earning||0} · Commission ₹${x.platform_commission||0}</span></div><em>${x.settlement_status||'PENDING'}</em></div>`).join('')||`<div class="alert">Completed ride হলে payment report এখানে দেখাবে।</div>`;
    const paidRows=(set.settlements||[]).slice(0,10).map(x=>`<div class="row"><i>✅</i><div><b>Paid ₹${x.amount||0}</b><span>${(x.paid_at||'').slice(0,10)} · ${x.ride_count||0} rides · Ref: ${esc(x.payment_ref||'Manual')}</span></div><em>PAID</em></div>`).join('')||`<div class="alert">Settlement history empty.</div>`;
    shell(`<section class="hero-card"><div><span class="glow-chip">Payment Monitor</span><h2>₹${r.summary.total_fare||0}</h2><p>Driver payout ₹${r.summary.driver_payout||0} · Commission ₹${r.summary.platform_commission||0}</p></div><button class="primary" onclick="currentTab='home';render()">Dashboard</button></section><section class="summary earnings-summary"><div><b>${r.summary.completed||0}</b><span>Completed</span></div><div><b>₹${set.summary.pending_amount||r.summary.pending_payout||0}</b><span>Driver Due</span></div><div><b>${pr.summary.requested||0}</b><span>Payout Requests</span></div></section><section class="card settlement-card"><div class="section-title"><h2>Driver Payout Requests</h2><button>${pr.summary.requested||0}</button></div><div class="list">${reqRows}</div></section><section class="card settlement-card"><div class="section-title"><h2>Driver Payout Settlement</h2><button>${set.summary.pending_drivers||0}</button></div><div class="list">${pendingRows}</div></section><section class="card"><div class="section-title"><h2>Completed Ride Payments</h2><button>${(r.rides||[]).length}</button></div><div class="list">${rows}</div></section><section class="card"><div class="section-title"><h2>Paid Settlement History</h2><button>${(set.settlements||[]).length}</button></div><div class="list">${paidRows}</div></section>`)
  }catch(e){shell(`<section class="card"><div class="alert">${esc(e.message)}</div></section>`)}
}

// v2.0 Sprint-5B - Modern Ride Booking App UI Redesign (server-only)
try { window.NEXO_RIDE_SPRINT5B_MODERN_UI = true; } catch(e) {}
function nexoInitials(){try{return String(me?.name||'NEXO Rider').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'NR'}catch(e){return 'NR'}}
function modernStat(label,value){return `<div><b>${esc(String(value))}</b><span>${esc(label)}</span></div>`}
function profileSummaryStats(){
  if(roleMode==='DRIVER') return `<div class="modern-stat-row">${modernStat('Earning','₹'+(driverProfile?.total_earnings||0))}${modernStat('Trips',driverProfile?.total_rides||0)}${modernStat('Rating',(driverProfile?.rating||5)+'⭐')}</div>`;
  return `<div class="modern-stat-row">${modernStat('Trips',me?.total_rides||0)}${modernStat('Wallet','₹0')}${modernStat('Rating','5⭐')}</div>`;
}
function modernMiniMapCard(){return `<section class="card modern-map-card"><div class="section-title"><h2>Choose Location</h2><button onclick="openBookingSheet()">Open Map</button></div><div class="nexo-inapp-map picker movable-fallback-map" style="min-height:190px"><div class="map-grid-bg"></div><div class="map-road road-one"></div><div class="map-road road-two"></div><div class="fixed-center-pin pickup"><span>P</span></div><div class="map-sdk-warning">Pickup / Drop pin map ready</div></div><button class="primary" style="width:100%;margin-top:12px" onclick="openBookingSheet()">📍 Set pickup & destination</button></section>`}
function passengerHome(){
  shell(`<section class="hero-card hero-logo-card"><div><span class="glow-chip">NEXO Smart Toto</span><h2>কোথায় যাবেন?</h2><p>Pickup set করুন, map থেকে drop pin নিন, nearby driver matching হবে।</p></div><button class="primary" onclick="openBookingSheet()">Book</button></section>${profileSummaryStats()}${modernMiniMapCard()}<section class="card"><div class="section-title"><h2>Bookings</h2><button onclick="currentTab='rides';render()">View all</button></div><div class="booking-pill-grid"><button onclick="openBookingSheet()"><i>🛺</i> Current Booking</button><button onclick="activeRideType='SHARING';openBookingSheet()"><i>🔁</i> Sharing</button><button onclick="currentTab='rides';render()"><i>🕘</i> History</button><button onclick="currentTab='wallet';render()"><i>₹</i> Fare / Wallet</button></div></section><section class="card"><div class="section-title"><h2>Popular nearby</h2><button>Kalna</button></div><div class="list">${points().slice(0,5).map(p=>`<div class="row" onclick="openBookingSheet('${esc(p)}')"><i>📍</i><div><b>${esc(p)}</b><span>Tap to start booking from here</span></div><em>›</em></div>`).join('')}</div></section>${bookingSheetHtml()}`);
}
function driverHome(){
  const online=!!driverProfile?.online;
  const eligible=isDriverApprovedForOnline(driverProfile);
  const lockMsg=driverOnlineLockMessage(driverProfile);
  if(online && eligible) startDriverLocationTracking(); else stopDriverLocationTracking();
  const onlineBtn=eligible?`<button class="primary driver-main-btn" onclick="toggleOnline(${online?'false':'true'})">${online?'🔴 Go Offline':'🟢 Go Online'}</button>`:`<button class="primary driver-main-btn" onclick="currentTab='kyc';render()">🔒 KYC Required</button>`;
  const locText=driverGpsText();
  shell(`<section class="hero-card"><div><span class="glow-chip">Driver Panel</span><h2>${online?'Online':'Offline'}</h2><p>${eligible?locText:lockMsg}</p></div>${onlineBtn}</section>${profileSummaryStats()}<section class="card"><div class="section-title"><h2>Bookings</h2><button onclick="currentTab='rides';render()">Requests</button></div><div class="booking-pill-grid"><button onclick="currentTab='rides';render()"><i>📥</i> Current Requests</button><button onclick="currentTab='wallet';render()"><i>₹</i> Wallet</button><button onclick="currentTab='rides';render()"><i>🕘</i> History</button><button onclick="currentTab='kyc';render()"><i>🪪</i> Documents</button></div></section><section class="card"><div class="section-title"><h2>Driver Status</h2><button>${driverProfile?.status||'PENDING'}</button></div><div class="${eligible?(online?'ok':'alert'):'alert'}">${eligible?(online?L('online'):L('offline')):esc(lockMsg)}</div><div class="voice-help" style="margin-top:10px"><button onclick="checkDriverGps()">📍 Check GPS</button><span>${esc(locText)}</span></div></section>`);
}
function profileView(){
  const st=config?.app_settings||{};
  const driverBlock=driverProfile?`<div class="row"><i>🛺</i><div><b>${esc(driverProfile.vehicle_no||L('veh'))}</b><span>${driverProfile.status} · KYC ${driverProfile.kyc_status||'INCOMPLETE'} · ${driverProfile.online?'Online':'Offline'}</span></div><em>›</em></div><div class="row" onclick="currentTab='kyc';render()"><i>🪪</i><div><b>Driver Documents</b><span>KYC, photo, vehicle, licence</span></div><em>›</em></div>`:'';
  shell(`<section class="profile-hero"><div class="profile-avatar">${esc(nexoInitials())}</div><div><h2>${esc(me.name||'NEXO Rider')}</h2><p>${esc(me.mobile||'')} · ${roleMode==='DRIVER'?'Toto Driver':roleMode==='ADMIN'?'Admin':'Passenger'}</p></div></section>${profileSummaryStats()}<section class="card"><div class="section-title"><h2>Account</h2><button>Profile</button></div><div class="list"><div class="row"><i>👤</i><div><b>${esc(me.name)}</b><span>${esc(me.email||L('noemail'))}</span></div><em>›</em></div>${driverBlock}<div class="row" onclick="currentTab='rides';render()"><i>🕘</i><div><b>Booking History</b><span>Completed, cancelled, fare details</span></div><em>›</em></div><div class="row" onclick="currentTab='wallet';render()"><i>₹</i><div><b>${roleMode==='PASSENGER'?'Fare / Payment':'Wallet / Fare'}</b><span>${roleMode==='PASSENGER'?'Payment history, fare, refund':'Payment, earning, payout'}</span></div><em>›</em></div><div class="row" onclick="currentTab='notifications';render()"><i>🔔</i><div><b>Notification Center</b><span>Ride request, payment, SOS alert</span></div><em>›</em></div><div class="row" onclick="currentTab='support';render()"><i>🆘</i><div><b>Help & Support</b><span>${esc(st.support_mobile||'9749983737')}</span></div><em>›</em></div>${roleMode!=='ADMIN'?`<div class="row" onclick="switchRole()"><i>🔄</i><div><b>${L('switch')}</b><span>${L('oneapk')}</span></div><em>›</em></div>`:''}<div class="row" onclick="languageView()"><i>🌐</i><div><b>${L('changeLang')}</b><span>${L('choose')}</span></div><em>›</em></div><div class="row" onclick="clearAppCache()"><i>♻️</i><div><b>Clear Cache / Update App</b><span>পুরনো UI দেখালে এখানে চাপুন</span></div><em>›</em></div></div><br><button class="primary" style="width:100%" onclick="logout()">${L('logout')}</button></section>`);
}

/* v2.0 Sprint-5C - Full Map Booking Flow + Fare Before Driver Search
   Server Update Only. Booking now opens in full-screen map mode:
   Pickup full map -> Drop full map -> compact fare card -> Book -> driver search -> Pay after driver accept. */
try { window.NEXO_RIDE_SPRINT5C_FULL_MAP_BOOKING_FLOW = true; } catch(e) {}
let __nexoBookingFlowActive = false;
let __nexoLastFareRoute = null;

function __nexoEnsureBookingShell(){
  if(!document.getElementById('overlay')){
    const overlay=document.createElement('div'); overlay.id='overlay'; overlay.className='overlay'; overlay.onclick=closeSheet; document.body.appendChild(overlay);
  }
  if(!document.getElementById('bookSheet')){
    const sheet=document.createElement('section'); sheet.id='bookSheet'; sheet.className='sheet step-sheet fare-confirm-sheet';
    sheet.innerHTML=`<div class="handle"></div><div class="section-title"><h2>${L('book')}</h2><button onclick="closeSheet()">${L('close')}</button></div><div class="step-dots"><span></span><span></span><span></span></div><div id="stepContent"></div>`;
    document.body.appendChild(sheet);
  }
}
function __nexoBookingTopLabel(){
  const p=booking.pickup?`<b>📍 ${esc(String(booking.pickup).replace(/\s*-?\d{1,2}\.\d+\s*,\s*\d{2,3}\.\d+\s*$/,''))}</b>`:'<b>📍 Pickup select করুন</b>';
  const d=booking.drop?`<b>🏁 ${esc(String(booking.drop).replace(/\s*-?\d{1,2}\.\d+\s*,\s*\d{2,3}\.\d+\s*$/,''))}</b>`:'<b>🏁 Drop select করুন</b>';
  return `<div class="full-map-trip-bar"><div>${p}<small>Pickup</small></div><i>→</i><div>${d}<small>Drop</small></div></div>`;
}
function __nexoBookingProgress(type){
  const step=type==='pickup'?1:type==='drop'?2:3;
  return `<div class="full-map-progress"><span class="${step>=1?'on':''}">1 Pickup</span><span class="${step>=2?'on':''}">2 Drop</span><span class="${step>=3?'on':''}">3 Fare</span></div>`;
}
function __nexoCleanPlaceLabel(label, type, coords){
  const clean=String(label||'').replace(/\s*\(manual pin\)\s*/i,'').replace(/\s*-?\d{1,2}\.\d+\s*,\s*\d{2,3}\.\d+\s*$/,'').trim();
  const prefix=type==='drop'?'Drop':'Pickup';
  const base=clean && !/^pickup selected point|drop selected point|selected point|map center pin|tapped map point|manual adjusted pin/i.test(clean) ? clean : `${prefix} selected point`;
  return `${base} ${Number(coords.lat).toFixed(5)},${Number(coords.lng).toFixed(5)}`;
}
function __nexoCompactLocationName(v){
  const s=String(v||'').trim();
  return s.replace(/\s*-?\d{1,2}\.\d+\s*,\s*\d{2,3}\.\d+\s*$/,'').slice(0,70) || '-';
}
function __nexoShowFareConfirmSheet(){
  __nexoEnsureBookingShell();
  booking.step=3;
  document.getElementById('overlay')?.classList.add('show');
  const sheet=document.getElementById('bookSheet');
  if(sheet){ sheet.classList.add('show','fare-confirm-sheet'); }
  refreshBookingStep();
  setTimeout(()=>previewRouteBox(),120);
}
function __nexoOpenNextMapStep(type){
  const old=document.getElementById('mapPickerOverlay'); if(old) old.remove();
  setTimeout(()=>mapPickerModal(type),160);
}

// Full-screen pickup/drop selector. User moves the map, fixed center pin is final point.
mapPickerModal = function(type){
  type=(String(type||'pickup').toLowerCase()==='drop')?'drop':'pickup';
  const old=document.getElementById('mapPickerOverlay'); if(old) old.remove();
  const center=__nexoInitialPickerCoords(type);
  __nexoPinPicker={type, coords:center, name:type==='pickup'?'Pickup selected point':'Drop selected point', map:null, moveTimer:null};
  const overlay=document.createElement('div'); overlay.id='mapPickerOverlay'; overlay.className='map-picker-overlay full-booking-map-overlay center-pin-picker-overlay';
  overlay.innerHTML=`<div class="map-picker-card full-booking-map-card center-pin-picker-card">
    <div class="full-map-top">
      <button class="full-back" onclick="document.getElementById('mapPickerOverlay')?.remove();${type==='drop'?"mapPickerModal('pickup')":"''"}">←</button>
      <div><h2>${type==='pickup'?'Pickup location':'Drop location'}</h2><p>Map নাড়ান — মাঝখানের ${type==='pickup'?'P':'D'} pin যেখানে থাকবে সেটাই select হবে</p></div>
      <button class="full-close" onclick="document.getElementById('mapPickerOverlay')?.remove()">×</button>
    </div>
    ${__nexoBookingProgress(type)}
    ${__nexoBookingTopLabel()}
    <div class="full-map-search-wrap"><input class="big-input" id="mapPickerSearch" placeholder="জায়গার নাম লিখুন / Search nearby area" oninput="mapPickerSearch('${type}',this.value)"><button onclick="__nexoUseCurrentGPSInPicker()">GPS</button></div>
    <div id="mapPickerMap" class="map-picker-map center-pin-map-wrap full-main-map"><div class="alert">Map loading...</div></div>
    <div class="full-map-bottom-panel">
      <div id="mapPickerList" class="map-picker-list full-suggestion-list"></div>
      <button class="primary full-confirm-btn" onclick="__nexoConfirmCenterPin()">✅ ${type==='pickup'?'Pickup':'Drop'} এই pin নিন</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  __nexoRenderCenterPinMap().catch(()=>{});
};

// Confirm pickup -> immediately open full drop map. Confirm drop -> compact fare sheet.
setPinnedMapPoint = function(type, coords, label){
  try{
    const t=(String(type||'').toLowerCase()==='drop')?'drop':'pickup';
    const c=coords?{lat:Number(coords.lat),lng:Number(coords.lng)}:null;
    if(!c || !Number.isFinite(c.lat) || !Number.isFinite(c.lng)) return toast('Pin location পাওয়া যায়নি');
    const name=__nexoCleanPlaceLabel(label,t,c);
    booking[t]=name;
    booking[t+'_coords']={lat:c.lat,lng:c.lng};
    if($(t)) $(t).value=name;
    try{ setPoint(t,name); }catch(e){}
    document.getElementById('mapPickerOverlay')?.remove();
    if(t==='pickup'){
      booking.step=2;
      toast('Pickup set — এবার Drop location select করুন');
      __nexoOpenNextMapStep('drop');
    }else{
      booking.step=3;
      toast('Drop set — Fare calculation হচ্ছে');
      __nexoShowFareConfirmSheet();
    }
  }catch(err){ toast(err.message || 'Pin set error'); }
};
function __nexoConfirmCenterPin(){
  const s=__nexoPinPicker; if(!s) return;
  const label=(s.name && !/^Manual adjusted|Map center|Selected point|Tapped map point/i.test(s.name)) ? s.name : `${s.type==='pickup'?'Pickup':'Drop'} selected point`;
  setPinnedMapPoint(s.type,{lat:s.coords.lat,lng:s.coords.lng},label);
}

// Booking entry now starts with full-screen map, not small sheet.
openBookingSheet = async function(pick=''){
  try{
    __nexoBookingFlowActive=true;
    closeSheet();
    booking.step=1;
    if(pick){ booking.pickup=String(pick); }
    setTimeout(()=>mapPickerModal('pickup'),80);
  }catch(e){ toast(e.message||'Booking open error'); }
};

// Fare screen after full map selection: small map + route + fare + Book button.
enhancedBookingSheet = async function(){
  const pickup=booking.pickup||''; const drop=booking.drop||'';
  const pName=__nexoCompactLocationName(pickup), dName=__nexoCompactLocationName(drop);
  return `<div class="booking-enhanced full-flow-fare-card">
    ${__nexoBookingProgress('fare')}
    <h3>Fare calculation</h3>
    <div class="full-flow-route-card"><div><i>📍</i><b>${esc(pName)}</b><small>Pickup</small></div><em>→</em><div><i>🏁</i><b>${esc(dName)}</b><small>Drop</small></div></div>
    <div class="ride-type-toggle premium-toggle"><button id="fullBtn" class="${activeRideType==='FULL'?'active':''}" onclick="setRideType('FULL');previewRouteBox()">${L('full')}</button><button id="sharingBtn" class="${activeRideType==='SHARING'?'active':''}" onclick="setRideType('SHARING');previewRouteBox()">${L('sharing')}</button></div>
    <div id="seatBox" class="seat-box ${activeRideType==='SHARING'?'':'hidden'}"><button onclick="setSeats(1);previewRouteBox()">1 Seat</button><button onclick="setSeats(2);previewRouteBox()">2 Seats</button><button onclick="setSeats(3);previewRouteBox()">3 Seats</button><button onclick="setSeats(4);previewRouteBox()">4 Seats</button></div>
    <div id="routePreviewBox"><div class="alert">Map ছোট হচ্ছে, distance ও fare হিসাব হচ্ছে...</div></div>
    <div class="fare-action-row"><button class="ghost" onclick="document.getElementById('bookSheet')?.classList.remove('show');document.getElementById('overlay')?.classList.remove('show');mapPickerModal('pickup')">↺ Pickup বদলান</button><button class="ghost" onclick="document.getElementById('bookSheet')?.classList.remove('show');document.getElementById('overlay')?.classList.remove('show');mapPickerModal('drop')">↺ Drop বদলান</button></div>
    <button class="primary book-driver-main" onclick="requestRide()">🛺 Book করুন / Driver Search</button>
    <small class="payment-after-driver">Driver accept করলে তারপর Pay Now আসবে।</small>
  </div>`;
};
refreshBookingStep = async function(){
  const c=$('stepContent'); if(!c) return;
  c.innerHTML=await enhancedBookingSheet();
  document.querySelectorAll('.step-dots span').forEach((s,i)=>s.classList.toggle('on',i+1===booking.step));
  setTimeout(()=>{ if(booking.step===3) previewRouteBox(); },80);
};

// Stronger fare preview: small map after full map selection.
previewRouteBox = async function(){
  const pickup=booking.pickup || $('pickup')?.value?.trim() || '';
  const drop=booking.drop || $('drop')?.value?.trim() || '';
  const box=$('routePreviewBox'); if(!box) return;
  if(!pickup || !drop){ box.innerHTML='<div class="alert">Pickup এবং Drop select করুন।</div>'; return; }
  try{
    const rt=await resolveRoutePreview(); __nexoLastFareRoute=rt;
    const fare=rt.fare||{}; const geo=rt.geofence||{}; const links=rt.navigation_links||{};
    const nav=links.mappls_web || links.google_web || links.google_search || '#';
    box.innerHTML=`<div class="premium-fare-preview">
      <div id="routeRealMap" class="mini-booking-map real-route-map compact-after-map"><div class="alert">Map loading...</div></div>
      <div class="fare-big-grid"><div><b>${rt.distance_km||'-'} km</b><span>Distance</span></div><div><b>${rt.eta_minutes||'-'} min</b><span>Approx time</span></div><div><b>₹${fare.estimated_fare||rt.estimated_fare||'-'}</b><span>Fare</span></div></div>
      <div class="fare-breakup premium-breakup"><span>Base ₹${fare.base_fare||0}</span><span>Extra ₹${fare.fare_breakup?.extra_fare||0}</span><span>${esc(fare.ride_type||activeRideType)}</span></div>
      <div class="geo-chip ${geo.inside?'route-ok':'route-warn'}">${geo.inside?'✅':'⚠️'} ${esc(geo.message||'Service area check')}</div>
      <a class="open-nav-small" target="_blank" href="${nav}">Open navigation preview</a>
    </div>`;
    await renderRealOrFallbackMap($('routeRealMap'),rt,{mode:'route'});
  }catch(e){ box.innerHTML=`<div class="alert">${esc(e.message)}</div>`; }
};

requestRide = async function(){
  try{
    if(!booking.pickup || !booking.drop) return toast('প্রথমে Pickup ও Drop full map থেকে select করুন');
    const btn=document.querySelector('.book-driver-main');
    if(btn){ btn.disabled=true; btn.textContent='🔎 Driver search হচ্ছে...'; }
    let g={}; try{ g=await getDeviceLocation(booking.pickup); }catch(e){ g={}; }
    const body={pickup:booking.pickup, drop:booking.drop, ride_type:activeRideType, seats:activeSeats, ...g};
    if(booking.pickup_coords){ body.pickup_lat=booking.pickup_coords.lat; body.pickup_lng=booking.pickup_coords.lng; }
    if(booking.drop_coords){ body.drop_lat=booking.drop_coords.lat; body.drop_lng=booking.drop_coords.lng; }
    const r=await api('/rides',{method:'POST',body});
    closeSheet();
    const cnt=r.matching?.candidate_count ?? r.ride?.nearby_driver_count ?? 0;
    if(cnt>0) toast(`Driver search started · ${cnt} জন nearby driver-কে request পাঠানো হয়েছে। Accept করলে Pay Now আসবে।`);
    else toast('এখন nearby online driver নেই। My Rides থেকে status দেখুন।');
    currentTab='rides'; render();
  }catch(e){ toast(e.message); }
  finally{ const btn=document.querySelector('.book-driver-main'); if(btn){ btn.disabled=false; btn.textContent='🛺 Book করুন / Driver Search'; } }
};


// v2.0 Sprint-5D - Passenger Ride Details Cleanup
try { window.NEXO_RIDE_SPRINT5D_PASSENGER_DETAILS_CLEAN = true; } catch(e) {}


// v2.0 Sprint-5E - Profile Edit + Passenger Details Readability Fix
try { window.NEXO_RIDE_SPRINT5E_PROFILE_EDIT_CONTRAST = true; } catch(e) {}
function nexoOpenProfileEditor(){
  const old=document.getElementById('profileEditOverlay'); if(old) old.remove();
  const overlay=document.createElement('div'); overlay.id='profileEditOverlay'; overlay.className='map-picker-overlay profile-edit-overlay';
  overlay.innerHTML=`<div class="map-picker-card profile-edit-card"><div class="section-title"><h2>Profile Edit</h2><button onclick="document.getElementById('profileEditOverlay')?.remove()">Close</button></div>
    <div class="voice-help profile-edit-note"><button>ℹ️</button><span>নাম, মোবাইল, ইমেল, এলাকা ঠিক করুন। Driver হলে Vehicle Profile আলাদা করে edit করা যাবে।</span></div>
    <label class="field"><label>Name / নাম</label><input id="profileName" value="${esc(me?.name||'')}" placeholder="Full name"></label>
    <label class="field"><label>Mobile / মোবাইল</label><input id="profileMobile" value="${esc(me?.mobile||'')}" inputmode="tel" placeholder="Mobile number"></label>
    <label class="field"><label>Email / ইমেল</label><input id="profileEmail" value="${esc(me?.email||'')}" placeholder="Email optional"></label>
    <label class="field"><label>Area / এলাকা</label><input id="profileArea" value="${esc(me?.area||'Kalna')}" placeholder="Kalna"></label>
    <button class="primary" style="width:100%;margin-top:12px" onclick="nexoSaveProfileEdit()">✅ Save Profile</button>
  </div>`;
  document.body.appendChild(overlay);
}
async function nexoSaveProfileEdit(){
  try{
    const body={name:$('profileName')?.value||'',mobile:$('profileMobile')?.value||'',email:$('profileEmail')?.value||'',area:$('profileArea')?.value||''};
    const r=await api('/me',{method:'POST',body});
    me=r.user; if(r.driver_profile) driverProfile=r.driver_profile;
    toast('Profile saved');
    document.getElementById('profileEditOverlay')?.remove();
    profileView();
  }catch(e){ toast(e.message); }
}
function nexoOpenDriverProfileEditor(){
  const old=document.getElementById('driverProfileEditOverlay'); if(old) old.remove();
  const overlay=document.createElement('div'); overlay.id='driverProfileEditOverlay'; overlay.className='map-picker-overlay profile-edit-overlay';
  const dp=driverProfile||{};
  overlay.innerHTML=`<div class="map-picker-card profile-edit-card"><div class="section-title"><h2>Vehicle / Driver Profile</h2><button onclick="document.getElementById('driverProfileEditOverlay')?.remove()">Close</button></div>
    <div class="voice-help profile-edit-note"><button>🛺</button><span>গাড়ির নম্বর, লাইসেন্স/আইডি ও এলাকা update করুন। KYC documents আলাদা Documents section-এ upload করবেন।</span></div>
    <label class="field"><label>Vehicle No / গাড়ির নম্বর</label><input id="drvVehicleNo" value="${esc(dp.vehicle_no||'')}" placeholder="WB xx xxxx"></label>
    <label class="field"><label>License / ID No</label><input id="drvLicenseNo" value="${esc(dp.license_no||'')}" placeholder="License / ID"></label>
    <label class="field"><label>Aadhaar No</label><input id="drvAadhaarNo" value="${esc(dp.aadhaar_no||'')}" inputmode="numeric" placeholder="Aadhaar"></label>
    <label class="field"><label>Area / Location</label><input id="drvArea" value="${esc(dp.area||me?.area||'Kalna')}" placeholder="Kalna"></label>
    <button class="primary" style="width:100%;margin-top:12px" onclick="nexoSaveDriverProfileEdit()">✅ Save Vehicle Profile</button>
    <button class="ghost" style="width:100%;margin-top:10px" onclick="document.getElementById('driverProfileEditOverlay')?.remove();currentTab='kyc';render()">🪪 KYC Documents Upload</button>
  </div>`;
  document.body.appendChild(overlay);
}
async function nexoSaveDriverProfileEdit(){
  try{
    const body={vehicle_no:$('drvVehicleNo')?.value||'',license_no:$('drvLicenseNo')?.value||'',aadhaar_no:$('drvAadhaarNo')?.value||'',area:$('drvArea')?.value||'',location:$('drvArea')?.value||''};
    const r=await api('/driver/profile',{method:'POST',body});
    driverProfile=r.driver_profile; roleMode='DRIVER'; localStorage.setItem('nexoRideRole','DRIVER');
    toast('Vehicle profile saved');
    document.getElementById('driverProfileEditOverlay')?.remove();
    profileView();
  }catch(e){ toast(e.message); }
}

// Override profileView so user can create/edit profile clearly.
profileView=function(){
  const st=config?.app_settings||{};
  const roleText=roleMode==='DRIVER'?'Toto Driver':roleMode==='ADMIN'?'Admin':'Passenger';
  const driverBlock=roleMode!=='ADMIN'?`<div class="row" onclick="nexoOpenDriverProfileEditor()"><i>🛺</i><div><b>${driverProfile?esc(driverProfile.vehicle_no||'Vehicle Profile'):'Create Driver / Vehicle Profile'}</b><span>${driverProfile?`${esc(driverProfile.status||'PENDING')} · KYC ${esc(driverProfile.kyc_status||'INCOMPLETE')} · ${driverProfile.online?'Online':'Offline'}`:'চালক হিসেবে কাজ করতে চাইলে এখানে প্রোফাইল তৈরি করুন'}</span></div><em>›</em></div>${driverProfile?`<div class="row" onclick="currentTab='kyc';render()"><i>🪪</i><div><b>Driver Documents / KYC</b><span>Photo, Aadhaar, licence, vehicle document upload</span></div><em>›</em></div>`:''}`:'';
  shell(`<section class="profile-hero"><div class="profile-avatar">${esc(nexoInitials())}</div><div><h2>${esc(me.name||'NEXO Rider')}</h2><p>${esc(me.mobile||'')} · ${esc(roleText)}</p></div></section>${profileSummaryStats()}<section class="card profile-action-card"><div class="section-title"><h2>Account</h2><button onclick="nexoOpenProfileEditor()">Edit</button></div><div class="list"><div class="row" onclick="nexoOpenProfileEditor()"><i>👤</i><div><b>Edit / Create Profile</b><span>${esc(me.name||'Name not set')} · ${esc(me.email||L('noemail'))} · ${esc(me.area||'Kalna')}</span></div><em>›</em></div>${driverBlock}<div class="row" onclick="currentTab='rides';render()"><i>🕘</i><div><b>Booking History</b><span>Completed, cancelled, fare details</span></div><em>›</em></div><div class="row" onclick="currentTab='wallet';render()"><i>₹</i><div><b>${roleMode==='PASSENGER'?'Fare / Payment':'Wallet / Fare'}</b><span>${roleMode==='PASSENGER'?'Payment history, fare, refund':'Payment, earning, payout'}</span></div><em>›</em></div><div class="row" onclick="currentTab='notifications';render()"><i>🔔</i><div><b>Notification Center</b><span>Ride request, payment, SOS alert</span></div><em>›</em></div><div class="row" onclick="currentTab='support';render()"><i>🆘</i><div><b>Help & Support</b><span>${esc(st.support_mobile||'9749983737')}</span></div><em>›</em></div>${roleMode!=='ADMIN'?`<div class="row" onclick="switchRole()"><i>🔄</i><div><b>${L('switch')}</b><span>${L('oneapk')}</span></div><em>›</em></div>`:''}<div class="row" onclick="languageView()"><i>🌐</i><div><b>${L('changeLang')}</b><span>${L('choose')}</span></div><em>›</em></div><div class="row" onclick="clearAppCache()"><i>♻️</i><div><b>Clear Cache / Update App</b><span>পুরনো UI দেখালে এখানে চাপুন</span></div><em>›</em></div></div><br><button class="primary" style="width:100%" onclick="logout()">${L('logout')}</button></section>`);
};


/* v2.0 Sprint-5F - Admin dashboard details/edit override */
function adminMetricCard(value,label,type){
  return `<div class="admin-metric-card" onclick="openAdminMetric('${esc(type)}')"><b>${value}</b><span>${esc(label)}</span></div>`;
}
function adminCloseModal(){ document.getElementById('adminDetailOverlay')?.remove(); }
function adminMetricTitle(type){
  return ({users:'Users',drivers:'Drivers',bookings:'All Bookings',requested:'Requested Rides',online:'Online Drivers',completed:'Completed Rides',accepted:'Accepted Rides',arrived:'Arrived Rides',sos:'SOS Alerts',fare:'Total Fare',commission:'Commission / Fare Rules',due:'Driver Due / Payout'})[type]||'Details';
}
function adminMetricHelp(type){
  return ({users:'User profile list. Tap edit to correct name/mobile/area.',drivers:'Driver profile, KYC, online status এবং approval control.',bookings:'All ride list. Tap any ride to see full ride details.',requested:'Passenger requested rides waiting for driver.',online:'Drivers currently online/live.',completed:'Completed rides and payment history.',accepted:'Driver accepted rides waiting payment/OTP flow.',arrived:'Driver reached pickup rides.',sos:'Open safety/SOS events.',fare:'Fare earning report and fare rule edit.',commission:'Platform commission report and fare rule edit.',due:'Pending driver payout and settlement control.'})[type]||'Tap item for details.';
}
function adminModal(title,body,actions=''){
  const old=document.getElementById('adminDetailOverlay'); if(old) old.remove();
  const overlay=document.createElement('div'); overlay.id='adminDetailOverlay'; overlay.className='map-picker-overlay admin-detail-overlay';
  overlay.innerHTML=`<div class="map-picker-card"><div class="section-title"><h2>${esc(title)}</h2><button onclick="adminCloseModal()">Close</button></div>${body}${actions}</div>`;
  document.body.appendChild(overlay);
}
function adminRow(icon,title,sub,extra='',onclick=''){
  return `<div class="row" ${onclick?`onclick="${onclick}"`:''}><i>${icon}</i><div><b>${esc(title||'-')}</b><span>${esc(sub||'')}</span></div>${extra||'<em>›</em>'}</div>`;
}
function adminFilterRides(rides,type){
  const st={requested:'REQUESTED',accepted:'DRIVER_ACCEPTED',arrived:'ARRIVED',completed:'COMPLETED'}[type];
  if(st) return rides.filter(x=>String(x.status||'')===st);
  return rides;
}
async function openAdminMetric(type){
  try{
    const title=adminMetricTitle(type);
    adminModal(title,`<div class="alert">Loading ${esc(title)}...</div>`);
    if(type==='users'){
      const r=await api('/admin/users');
      const rows=(r.users||[]).map(u=>adminRow('👤',`${u.name||'User'} · ${u.mobile||''}`,`${u.role||''} · ${u.area||'No area'} · Joined ${nexoFmtDate(u.created_at)}`,`<button class="ghost" onclick="event.stopPropagation();adminEditUser('${esc(u.id)}')">Edit</button>`)).join('')||'<div class="alert">No user found.</div>';
      return adminModal(title,`<p class="profile-edit-note">${adminMetricHelp(type)}</p><div class="list">${rows}</div>`);
    }
    if(type==='drivers'||type==='online'){
      const r=await api('/admin/drivers'); let list=r.drivers||[]; if(type==='online') list=list.filter(d=>d.online);
      const rows=list.map(d=>adminRow('🛺',`${d.name||'Driver'} · ${d.vehicle_no||'No vehicle'}`,`${d.mobile||''} · ${d.status||''} · ${d.online?'Online':'Offline'} · ${d.location||d.area||'Kalna'}`,`<button class="ghost" onclick="event.stopPropagation();adminDriverDetail('${esc(d.id||d.user_id)}')">Details/Edit</button>`)).join('')||'<div class="alert">No driver found.</div>';
      return adminModal(title,`<p class="profile-edit-note">${adminMetricHelp(type)}</p><div class="list">${rows}</div><div class="admin-detail-actions"><button class="primary" onclick="adminCloseModal();currentTab='rides';render()">Driver Approval Page</button><button class="ghost" onclick="openAdminMetric('online')">Online Drivers</button></div>`);
    }
    if(['bookings','requested','accepted','arrived','completed'].includes(type)){
      const r=await api('/rides?role=ADMIN'); const list=adminFilterRides(r.rides||[],type).slice(0,80);
      const rows=list.map(x=>adminRow('🛺',`${x.pickup||'-'} → ${x.drop||'-'}`,`${rideStatusText(x.status)} · ₹${x.estimated_fare||0} · ${x.passenger_name||'Passenger'} · ${nexoFmtDate(x.created_at||x.updated_at)}`,`<button class="ghost" onclick="event.stopPropagation();adminCloseModal();openRideDetails('${esc(x.id)}')">Details</button>`)).join('')||'<div class="alert">No ride found.</div>';
      return adminModal(title,`<p class="profile-edit-note">${adminMetricHelp(type)}</p><div class="list">${rows}</div>`);
    }
    if(type==='sos'){
      const r=await api('/admin/safety-events');
      const rows=(r.events||[]).map(x=>adminRow('🆘',`${x.user_name||'User'} · ${x.user_mobile||''}`,`${x.status||'OPEN'} · ${x.pickup||'Ride'} → ${x.drop||''} · ${x.reason||'SOS'}`,`<button class="ghost" onclick="event.stopPropagation();adminCloseModal();openRideDetails('${esc(x.ride_id)}')">Ride</button>`)).join('')||'<div class="ok">No SOS alert.</div>';
      return adminModal(title,`<p class="profile-edit-note">${adminMetricHelp(type)}</p><div class="list">${rows}</div>`);
    }
    if(['fare','commission'].includes(type)) return adminFareEditor(type);
    if(type==='due'){
      let set={summary:{},drivers:[]}, pr={summary:{},requests:[]}; try{set=await api('/admin/settlements')}catch(e){} try{pr=await api('/admin/driver-payout-requests')}catch(e){}
      const reqRows=(pr.requests||[]).filter(x=>x.status!=='PAID').map(x=>adminRow('🧾',`${x.driver_name||'Driver'} · ₹${x.amount||0}`,`${x.driver_mobile||''} · ${x.ride_count||0} rides · ${nexoFmtDate(x.created_at)}`,`<button class="primary" onclick="event.stopPropagation();adminMarkDriverPayoutRequest('${esc(x.id)}')">Pay</button>`)).join('');
      const pendingRows=(set.drivers||[]).map(x=>adminRow('💸',`${x.driver_name||'Driver'} · Pending ₹${x.amount||0}`,`${x.driver_mobile||''} · ${x.rides||0} rides`, `<button class="primary" onclick="event.stopPropagation();adminMarkPayout('${esc(x.driver_id)}')">Mark Paid</button>`)).join('');
      return adminModal(title,`<p class="profile-edit-note">${adminMetricHelp(type)}</p><div class="list">${reqRows}${pendingRows||'<div class="ok">No pending payout.</div>'}</div>`, `<div class="admin-detail-actions"><button class="primary" onclick="adminCloseModal();currentTab='wallet';render()">Payout Page</button></div>`);
    }
  }catch(e){ adminModal(adminMetricTitle(type),`<div class="alert">${esc(e.message)}</div>`); }
}
async function adminEditUser(id){
  try{
    const r=await api('/admin/users'); const u=(r.users||[]).find(x=>String(x.id)===String(id)); if(!u) return toast('User not found');
    adminModal('Edit User',`<div class="admin-edit-form">
      <label>Name<input id="adUserName" value="${esc(u.name||'')}"></label>
      <label>Mobile<input id="adUserMobile" value="${esc(u.mobile||'')}"></label>
      <label>Email<input id="adUserEmail" value="${esc(u.email||'')}"></label>
      <label>Area<input id="adUserArea" value="${esc(u.area||'')}"></label>
      <p class="profile-edit-note">Role: ${esc(u.role||'USER')} · ID: ${esc(String(u.id||'').slice(-8))}</p>
    </div>`, `<div class="admin-detail-actions"><button class="primary" onclick="adminSaveUser('${esc(id)}')">Save</button><button class="ghost" onclick="openAdminMetric('users')">Back</button></div>`);
  }catch(e){toast(e.message)}
}
async function adminSaveUser(id){
  try{
    await api(`/admin/users/${id}/update`,{method:'POST',body:{name:$('adUserName').value,mobile:$('adUserMobile').value,email:$('adUserEmail').value,area:$('adUserArea').value}});
    toast('User updated'); openAdminMetric('users');
  }catch(e){toast(e.message)}
}
async function adminDriverDetail(id){
  try{
    const r=await api('/admin/drivers'); const d=(r.drivers||[]).find(x=>String(x.id)===String(id)||String(x.user_id)===String(id)); if(!d) return toast('Driver not found');
    adminModal('Driver Details / Edit',`<div class="admin-edit-form">
      <label>Name<input id="adDrvName" value="${esc(d.name||'')}"></label>
      <label>Mobile<input id="adDrvMobile" value="${esc(d.mobile||'')}"></label>
      <label>Vehicle No<input id="adDrvVehicle" value="${esc(d.vehicle_no||'')}"></label>
      <label>Location / Area<input id="adDrvLoc" value="${esc(d.location||d.area||'')}"></label>
      <label>Status<select id="adDrvStatus"><option ${d.status==='PENDING'?'selected':''}>PENDING</option><option ${d.status==='APPROVED'?'selected':''}>APPROVED</option><option ${d.status==='REJECTED'?'selected':''}>REJECTED</option><option ${d.status==='SUSPENDED'?'selected':''}>SUSPENDED</option></select></label>
      <p class="profile-edit-note">KYC: ${esc(d.kyc_status||'')} · Online: ${d.online?'YES':'NO'} · ID: ${esc(String(d.id||d.user_id||'').slice(-8))}</p>
    </div>`, `<div class="admin-editor-grid"><button onclick="adminSaveDriver('${esc(d.id||d.user_id)}')">Save Details</button><button onclick="adminDriverAction('${esc(d.id||d.user_id)}','approve')">Approve</button><button onclick="adminDriverAction('${esc(d.id||d.user_id)}','offline')">Set Offline</button><button class="admin-danger" onclick="adminDriverAction('${esc(d.id||d.user_id)}','suspend')">Suspend</button></div><div class="admin-detail-actions"><button class="ghost" onclick="openAdminMetric('drivers')">Back</button></div>`);
  }catch(e){toast(e.message)}
}
async function adminSaveDriver(id){
  try{
    await api(`/admin/drivers/${id}/update`,{method:'POST',body:{name:$('adDrvName').value,mobile:$('adDrvMobile').value,vehicle_no:$('adDrvVehicle').value,location:$('adDrvLoc').value,status:$('adDrvStatus').value}});
    toast('Driver updated'); adminDriverDetail(id);
  }catch(e){toast(e.message)}
}
async function adminFareEditor(type='fare'){
  await loadConfig(); const f=config?.fare_rules||{};
  adminModal(adminMetricTitle(type),`<p class="profile-edit-note">${adminMetricHelp(type)}</p><div class="admin-edit-form">
    <label>Full Base Fare<input id="fare_full_base_fare" type="number" value="${esc(f.full_base_fare||40)}"></label>
    <label>Minimum Full Fare<input id="fare_minimum_full" type="number" value="${esc(f.minimum_full||40)}"></label>
    <label>Sharing Base Per Seat<input id="fare_sharing_base_per_seat" type="number" value="${esc(f.sharing_base_per_seat||10)}"></label>
    <label>Base KM<input id="fare_base_km" type="number" step="0.1" value="${esc(f.base_km||2)}"></label>
    <label>Extra Step KM<input id="fare_extra_step_km" type="number" step="0.1" value="${esc(f.extra_step_km||1)}"></label>
    <label>Extra Step Fare<input id="fare_extra_step_fare" type="number" value="${esc(f.extra_step_fare||10)}"></label>
    <label>Platform Commission %<input id="fare_platform_commission_percent" type="number" value="${esc(f.platform_commission_percent||0)}"></label>
  </div>`, `<div class="admin-detail-actions"><button class="primary" onclick="adminSaveFareRules()">Save Fare Rules</button><button class="ghost" onclick="adminCloseModal()">Close</button></div>`);
}
async function adminSaveFareRules(){
  try{
    const keys=['full_base_fare','minimum_full','sharing_base_per_seat','base_km','extra_step_km','extra_step_fare','platform_commission_percent']; const body={};
    keys.forEach(k=>body[k]=Number($('fare_'+k).value||0));
    await api('/admin/fare',{method:'POST',body}); toast('Fare rules updated'); await loadConfig(); openAdminMetric('fare');
  }catch(e){toast(e.message)}
}
async function adminHome(){try{
  const r=await api('/admin/summary');let rr={rides:[]},ss={events:[]},live={drivers:[],rides:[]};try{rr=await api('/rides?role=ADMIN')}catch(e){}try{ss=await api('/admin/safety-events')}catch(e){}try{live=await api('/live/locations')}catch(e){}const st=config?.app_settings||{};
  const recent=(rr.rides||[]).slice(0,5).map(x=>adminRow('🛺',`${x.pickup||'-'} → ${x.drop||'-'}`,`${rideStatusText(x.status)} · ₹${x.estimated_fare||0} · ${x.passenger_name||'Passenger'}`,`<button class="ghost" onclick="event.stopPropagation();openRideDetails('${esc(x.id)}')">Details</button>`,`openRideDetails('${esc(x.id)}')`)).join('')||`<div class="alert">এখনো booking নেই। Passenger side থেকে test booking করলে এখানে দেখাবে।</div>`;
  const safetyRows=(ss.events||[]).slice(0,4).map(x=>adminRow('🆘',`${x.user_name||'User'} · ${x.user_mobile||''}`,`${x.reason||'SOS'} · ${x.pickup||'Ride'} → ${x.drop||''}`,`<button class="ghost" onclick="event.stopPropagation();openAdminMetric('sos')">Open</button>`)).join('')||`<div class="ok">No SOS alert now.</div>`;
  shell(`<section class="hero-card"><div><span class="glow-chip">NEXO Control</span><h2>Admin Dashboard</h2><p>নীচের প্রতিটি card tap করলে details/edit খুলবে। Driver approval, booking monitor, fare rule এবং support control।</p></div><button class="primary" onclick="currentTab='rides';render()">Driver Approval</button></section>
  <section class="summary">${adminMetricCard(r.summary.users,'Users','users')}${adminMetricCard(r.summary.drivers,'Drivers','drivers')}${adminMetricCard(r.summary.rides||0,'Bookings','bookings')}</section>
  <section class="summary">${adminMetricCard(r.summary.requested||0,'Requested','requested')}${adminMetricCard(r.summary.online_drivers,'Online Driver','online')}${adminMetricCard(r.summary.completed||0,'Completed','completed')}</section>
  <section class="summary">${adminMetricCard(r.summary.accepted||0,'Accepted','accepted')}${adminMetricCard(r.summary.arrived||0,'Arrived','arrived')}${adminMetricCard(r.summary.safety_open||0,'SOS Open','sos')}</section>
  <section class="summary earnings-summary">${adminMetricCard('₹'+(r.summary.total_fare||0),'Total Fare','fare')}${adminMetricCard('₹'+(r.summary.platform_commission||0),'Commission','commission')}${adminMetricCard('₹'+(r.summary.driver_payout_pending||0),'Driver Due','due')}</section>
  <section class="card live-location-card"><div class="section-title"><h2>Live Geo Monitor</h2><button onclick="openAdminMetric('online')">${(live.drivers||[]).filter(d=>d.online).length} Online</button></div>${miniMapHtml(live)}<div class="list">${(live.drivers||[]).slice(0,4).map(d=>adminRow('📡',`${d.name} · ${d.vehicle_no||'Toto'}`,`${d.online?'Online':'Offline'} · ${Number(d.lat||0).toFixed(4)}, ${Number(d.lng||0).toFixed(4)} · ${d.location||'Kalna'}`,`<button class="ghost" onclick="event.stopPropagation();adminDriverDetail('${esc(d.profile_id||d.driver_id)}')">Edit</button>`)).join('')||`<div class="alert">Driver online করলে live geo এখানে দেখাবে।</div>`}</div></section>
  <section class="card"><div class="section-title"><h2>Live Booking Monitor</h2><button onclick="openAdminMetric('bookings')">${(rr.rides||[]).length}</button></div><div class="list">${recent}</div></section>
  <section class="card safety-monitor"><div class="section-title"><h2>Safety Monitor</h2><button onclick="openAdminMetric('sos')">${r.summary.safety_open||0} Open</button></div><div class="list">${safetyRows}</div></section>
  <section class="card"><div class="section-title"><h2>Admin Tools</h2><button>Manage</button></div><div class="list"><div class="row" onclick="openAdminMetric('users')"><i>👤</i><div><b>Users & Profiles</b><span>Passenger/driver profile details/edit</span></div><em>›</em></div><div class="row" onclick="openAdminMetric('fare')"><i>₹</i><div><b>Fare Rule Edit</b><span>Base fare, km step, commission</span></div><em>›</em></div><div class="row" onclick="currentTab='support';render()"><i>🆘</i><div><b>Support / Complaint / Refund</b><span>${esc(st.support_mobile||'9749983737')} · ${esc(st.support_email||'support@nexo')}</span></div><em>›</em></div></div></section>`)
}catch(e){shell(`<section class="card"><div class="alert">${esc(e.message)}</div></section>`)}}
async function adminDriversView(){try{const r=await api('/admin/drivers');const rows=(r.drivers||[]).map(d=>`<div class="row" onclick="adminDriverDetail('${esc(d.id||d.user_id)}')"><i>🛺</i><div><b>${esc(d.name||'Driver')} · ${esc(d.vehicle_no||'No Vehicle')}</b><span>${esc(d.mobile||'')} · ${d.status} · ${d.online?'Online':'Offline'} · ${esc(d.location||d.area||'')}</span></div>${d.status==='APPROVED'?`<button class="ghost" onclick="event.stopPropagation();adminDriverAction('${esc(d.id||d.user_id)}','offline')">Offline</button>`:`<button class="primary mini-pay" onclick="event.stopPropagation();adminDriverAction('${esc(d.id||d.user_id)}','approve')">Approve</button>`}</div>`).join('')||`<div class="alert">No driver registration yet.</div>`;shell(`<section class="card"><div class="section-title"><h2>Driver Approval</h2><button onclick="openAdminMetric('drivers')">${(r.drivers||[]).length}</button></div><div class="list">${rows}</div></section>`)}catch(e){shell(`<section class="card"><div class="alert">${esc(e.message)}</div></section>`)} }


/* v2.0 Sprint-6C - Razorpay Payment Gateway Checkout + Server Signature Verify */
try { window.NEXO_RIDE_SPRINT6C_RAZORPAY_GATEWAY = true; } catch(e) {}
function nexoLoadRazorpayCheckout(){
  return new Promise((resolve,reject)=>{
    if(window.Razorpay) return resolve(window.Razorpay);
    const existing=document.querySelector('script[data-nexo-razorpay]');
    if(existing){ existing.addEventListener('load',()=>resolve(window.Razorpay)); existing.addEventListener('error',()=>reject(new Error('Razorpay checkout load failed'))); return; }
    const s=document.createElement('script'); s.src='https://checkout.razorpay.com/v1/checkout.js'; s.async=true; s.setAttribute('data-nexo-razorpay','1');
    s.onload=()=>window.Razorpay?resolve(window.Razorpay):reject(new Error('Razorpay checkout unavailable'));
    s.onerror=()=>reject(new Error('Razorpay checkout load failed'));
    document.head.appendChild(s);
  });
}
async function nexoRazorpayPayRide(id){
  const p=await api('/payments/create-order',{method:'POST',body:{ride_id:id}});
  const pay=p.payment||{}, order=p.order||{}, ride=p.ride||{};
  if(pay.provider==='RAZORPAY' && pay.razorpay_enabled && pay.razorpay_key_id && order.razorpay_order_id){
    await nexoLoadRazorpayCheckout();
    return await new Promise((resolve,reject)=>{
      const opts={
        key: pay.razorpay_key_id,
        amount: Math.round(Number(order.amount||ride.estimated_fare||0)*100),
        currency: order.razorpay_currency || 'INR',
        name: pay.razorpay_company_name || 'NEXO Ride',
        description: `${ride.pickup||'Pickup'} → ${ride.drop||'Drop'}`,
        order_id: order.razorpay_order_id,
        prefill:{name:me?.name||'', email:me?.email||'', contact:me?.mobile||''},
        notes:{ride_id:id, passenger_id:me?.id||''},
        theme:{color:'#0A66FF'},
        handler: async function(resp){
          try{
            await api(`/payments/${order.id}/verify`,{method:'POST',body:{
              razorpay_payment_id:resp.razorpay_payment_id,
              razorpay_order_id:resp.razorpay_order_id,
              razorpay_signature:resp.razorpay_signature,
              payment_method:'RAZORPAY_CHECKOUT'
            }});
            toast('Razorpay payment verified. OTP generated.');
            resolve(true);
          }catch(e){ reject(e); }
        },
        modal:{ondismiss:function(){reject(new Error('Payment cancelled / dismissed'));}}
      };
      const rz=new window.Razorpay(opts);
      rz.on('payment.failed',function(resp){
        const msg=resp?.error?.description || resp?.error?.reason || 'Razorpay payment failed';
        reject(new Error(msg));
      });
      rz.open();
    });
  }
  // Fallback for demo/manual mode
  let ref='DEMO-'+Date.now();
  if(pay.provider==='MANUAL_QR') ref=prompt(`UPI payment reference দিন\nUPI: ${pay.manual_upi_id||'not set'}`,ref)||ref;
  else if(pay.provider==='RAZORPAY') ref=prompt('Razorpay payment id / UPI reference দিন',ref)||ref;
  await api(`/payments/${order.id}/verify`,{method:'POST',body:{transaction_id:ref,payment_method:pay.methods?.[0]||'DEMO_PAYMENT'}});
  toast('Payment verified - Booking confirmed. OTP generated');
  return true;
}
const __nexoBaseRideAction6C = typeof rideAction==='function' ? rideAction : null;
if(__nexoBaseRideAction6C){
  rideAction = async function(id, action){
    try{
      if(String(action||'')==='pay'){
        await nexoRazorpayPayRide(id);
        return ridesView();
      }
      return __nexoBaseRideAction6C(id, action);
    }catch(e){ toast(e.message||String(e)); try{ridesView()}catch(_){ } }
  };
}
function razorpayEnvHelpCard(){
  return `<section class="card"><div class="section-title"><h2>Razorpay Gateway</h2><button>Checkout</button></div><div class="voice-help"><button>₹</button><span>Driver accept করার পরে Pay Now চাপলে Razorpay Checkout খুলবে। Success হলে server signature verify করে OTP generate করবে।</span></div></section>`;
}

/* v2.0 Sprint-6D - Restored Profile + Logout after Razorpay */
/* v2.0 Sprint-6B - Visible Logout + Account Menu */
try { window.NEXO_RIDE_SPRINT6B_LOGOUT_VISIBLE = true; } catch(e) {}
function nexoLogoutLabel(){ return lang==='bn'?'লগআউট':(lang==='hi'?'लॉगआउट':'Logout'); }
function nexoLogoutHelp(){ return lang==='bn'?'এই ডিভাইস থেকে NEXO Ride session logout হবে। Google account device থেকে logout হবে না।':(lang==='hi'?'इस डिवाइस से NEXO Ride session logout होगा। Google account device से logout नहीं होगा।':'This will sign out this device from NEXO Ride. It will not sign out the Google account from the device.'); }
function nexoAskLogout(){
  const old=document.getElementById('nexoLogoutOverlay'); if(old) old.remove();
  const overlay=document.createElement('div'); overlay.id='nexoLogoutOverlay'; overlay.className='map-picker-overlay logout-confirm-overlay';
  overlay.innerHTML=`<div class="map-picker-card logout-confirm-card"><div class="logout-icon-big">🚪</div><h2>${nexoLogoutLabel()}?</h2><p>${esc(nexoLogoutHelp())}</p><div class="logout-action-row"><button class="ghost" onclick="document.getElementById('nexoLogoutOverlay')?.remove()">${L('close')||'Close'}</button><button class="logout-danger-btn" onclick="nexoDoLogout()">${nexoLogoutLabel()}</button></div></div>`;
  document.body.appendChild(overlay);
}
function nexoDoLogout(){
  try{document.getElementById('nexoLogoutOverlay')?.remove();}catch(e){}
  try{
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('nexoRideToken');
    localStorage.removeItem('nexoRideAdminToken');
    localStorage.removeItem('nexoRideRole');
    sessionStorage.clear?.();
  }catch(e){}
  token=''; me=null; driverProfile=null; roleMode='PASSENGER'; currentTab='home';
  authView('login');
  setTimeout(()=>toast(nexoLogoutLabel()+' done'),250);
}
logout=function(){ nexoAskLogout(); };

shell=function(content){
  const name=me?.name||'NEXO Rider';
  const navHome=roleMode==='ADMIN'?'Dashboard':L('home'), navRides=roleMode==='ADMIN'?'Drivers':L('rides'), navWallet=roleMode==='ADMIN'?'Payout':L('fare'), navProfile=roleMode==='ADMIN'?'Admin':L('profile');
  app.innerHTML=`<div class="page ${IS_ADMIN_WEB?'admin-web-page':''}"><header class="topbar astra-head"><div class="toprow"><button class="icon-btn" onclick="currentTab='home';render()">⌂</button><button class="lang-chip" onclick="languageView()">🌐 ${lang==='bn'?'বাংলা':lang==='hi'?'हिन्दी':'English'}</button><button class="install-mini" onclick="installNexoApp()">⬇ App</button><button class="icon-btn notify-top-btn" onclick="currentTab='notifications';render()">🔔</button><button class="logout-mini-top" onclick="logout()">🚪 ${nexoLogoutLabel()}</button><span class="status-pill">${roleMode==='ADMIN'?'ADMIN WEB':roleMode==='DRIVER'?L('drv'):L('pass')}</span></div><div class="nexo-head-brand" onclick="currentTab='profile';render()">${nexoIcon('header-icon')}<div><h1>${esc(currentTabTitle())}</h1><p>${esc(name)} · ${config?.service_area?.name||'Kalna Sub-Division'} · tap for profile</p></div><button class="profile-mini-top" onclick="event.stopPropagation();currentTab='profile';render()">👤</button></div></header>${content}<nav class="bottom-nav"><button class="${currentTab==='home'?'active':''}" onclick="currentTab='home';render()"><i>🏠</i>${navHome}</button><button class="${currentTab==='rides'?'active':''}" onclick="currentTab='rides';render()"><i>🛺</i>${navRides}</button><button class="${currentTab==='wallet'?'active':''}" onclick="currentTab='wallet';render()"><i>₹</i>${navWallet}</button><button class="${currentTab==='profile'?'active':''}" onclick="currentTab='profile';render()"><i>👤</i>${navProfile}</button></nav></div>`;
};

// Stronger profile screen with visible logout row at the top and bottom.
profileView=function(){
  const st=config?.app_settings||{};
  const roleText=roleMode==='DRIVER'?'Toto Driver':roleMode==='ADMIN'?'Admin':'Passenger';
  const driverBlock=roleMode!=='ADMIN'?`<div class="row" onclick="nexoOpenDriverProfileEditor()"><i>🛺</i><div><b>${driverProfile?esc(driverProfile.vehicle_no||'Vehicle Profile'):'Create Driver / Vehicle Profile'}</b><span>${driverProfile?`${esc(driverProfile.status||'PENDING')} · KYC ${esc(driverProfile.kyc_status||'INCOMPLETE')} · ${driverProfile.online?'Online':'Offline'}`:'চালক হিসেবে কাজ করতে চাইলে এখানে প্রোফাইল তৈরি করুন'}</span></div><em>›</em></div>${driverProfile?`<div class="row" onclick="currentTab='kyc';render()"><i>🪪</i><div><b>Driver Documents / KYC</b><span>Photo, Aadhaar, licence, vehicle document upload</span></div><em>›</em></div>`:''}`:'';
  shell(`<section class="profile-hero profile-hero-actions"><div class="profile-avatar">${esc(nexoInitials())}</div><div><h2>${esc(me.name||'NEXO Rider')}</h2><p>${esc(me.mobile||me.email||'')} · ${esc(roleText)}</p></div><button class="logout-hero-btn" onclick="logout()">🚪 ${nexoLogoutLabel()}</button></section>${profileSummaryStats()}<section class="card profile-action-card"><div class="section-title"><h2>Account</h2><button onclick="nexoOpenProfileEditor()">Edit</button></div><div class="list"><div class="row" onclick="nexoOpenProfileEditor()"><i>👤</i><div><b>Edit / Create Profile</b><span>${esc(me.name||'Name not set')} · ${esc(me.email||L('noemail'))} · ${esc(me.area||'Kalna')}</span></div><em>›</em></div>${driverBlock}<div class="row" onclick="currentTab='rides';render()"><i>🕘</i><div><b>Booking History</b><span>Completed, cancelled, fare details</span></div><em>›</em></div><div class="row" onclick="currentTab='wallet';render()"><i>₹</i><div><b>${roleMode==='PASSENGER'?'Fare / Payment':'Wallet / Fare'}</b><span>${roleMode==='PASSENGER'?'Payment history, fare, refund':'Payment, earning, payout'}</span></div><em>›</em></div><div class="row" onclick="currentTab='notifications';render()"><i>🔔</i><div><b>Notification Center</b><span>Ride request, payment, SOS alert</span></div><em>›</em></div><div class="row" onclick="currentTab='support';render()"><i>🆘</i><div><b>Help & Support</b><span>${esc(st.support_mobile||'9749983737')}</span></div><em>›</em></div>${roleMode!=='ADMIN'?`<div class="row" onclick="switchRole()"><i>🔄</i><div><b>${L('switch')}</b><span>${L('oneapk')}</span></div><em>›</em></div>`:''}<div class="row" onclick="languageView()"><i>🌐</i><div><b>${L('changeLang')}</b><span>${L('choose')}</span></div><em>›</em></div><div class="row" onclick="clearAppCache()"><i>♻️</i><div><b>Clear Cache / Update App</b><span>পুরনো UI দেখালে এখানে চাপুন</span></div><em>›</em></div><div class="row logout-row" onclick="logout()"><i>🚪</i><div><b>${nexoLogoutLabel()}</b><span>এই device থেকে logout করুন</span></div><em>›</em></div></div><br><button class="logout-danger-wide" onclick="logout()">🚪 ${nexoLogoutLabel()}</button></section>`);
};


/* Sprint-6E hotfix marker: driver admin approval / KYC sync + visible GPS status */
try{window.NEXO_RIDE_SPRINT6E_DRIVER_APPROVAL_GPS_FIX=true;}catch(e){}

/* Sprint-6F - Driver GPS Running + Local Area Status + Start Taking Fare
   Check GPS now uses real device GPS only (no demo fallback), stores nearest local area,
   and Go Online starts fare/request availability from that area. */
try{window.NEXO_RIDE_SPRINT6F_DRIVER_GPS_RUNNING_AREA=true;}catch(e){}

function nexoOpenAppSettings(){
  try{
    if(window.NexoRideNative && typeof window.NexoRideNative.openAppSettings==='function') return window.NexoRideNative.openAppSettings();
    toast('Phone Settings → Apps → NEXO Ride → Permissions → Location Allow করুন');
  }catch(e){ toast('App Settings থেকে Location permission Allow করুন'); }
}
function nexoRequestNativePermissions(){
  try{
    if(window.NexoRideNative && typeof window.NexoRideNative.requestAllPermissions==='function') return window.NexoRideNative.requestAllPermissions();
    toast('Location permission allow করুন');
  }catch(e){ toast('Permission request failed'); }
}

function nexoStrictGpsLocation(){
  return new Promise((resolve,reject)=>{
    if(!navigator.geolocation) return reject(new Error('এই মোবাইলে GPS/Location support নেই'));
    navigator.geolocation.getCurrentPosition(p=>{
      resolve({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:Math.round(p.coords.accuracy||0),source:'GPS'});
    }, err=>{
      let msg='GPS permission দিন / Location ON করুন';
      if(err && err.code===1) msg='Location permission denied. App settings থেকে Location Allow করুন।';
      if(err && err.code===2) msg='GPS signal পাওয়া যাচ্ছে না। Location/GPS ON করে বাইরে গিয়ে চেষ্টা করুন।';
      if(err && err.code===3) msg='GPS timeout. High accuracy location ON করে আবার চাপুন।';
      reject(new Error(msg));
    }, {enableHighAccuracy:true, timeout:10000, maximumAge:15000});
  });
}
async function nexoReverseAreaFromGps(g){
  try{
    const r=await api(`/maps/reverse?lat=${encodeURIComponent(g.lat)}&lng=${encodeURIComponent(g.lng)}&limit=8`);
    return {area:r.nearest?.name || (r.inside?'Kalna Sub-Division':'Outside Service Area'), inside:r.inside!==false, nearest:r.nearest||null, places:r.places||[]};
  }catch(e){
    return {area:driverProfile?.location||'Kalna', inside:true, nearest:null, places:[]};
  }
}
function driverGpsText(){
  const g=driverGpsHealth||{};
  const lat=driverProfile?.lat||g.lat, lng=driverProfile?.lng||g.lng;
  const area=g.location_name || g.nearest?.name || driverProfile?.location || driverProfile?.area || 'Local Area';
  const running = !!(g.running || g.status==='RUNNING' || (g.gps_on && g.inside_service_area!==false));
  if(lat&&lng){
    if(running) return `🟢 GPS Running · ${area} · ${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
    if(g.inside_service_area===false) return `🔴 GPS বাইরে · ${area} · ${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
    return `${driverProfile?.online?'🟢 GPS ON':'🟡 Last GPS'} · ${area} · ${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
  }
  return '🔴 GPS status unknown — Check GPS চাপুন';
}
async function checkDriverGps(){
  try{
    toast('GPS checking... Location permission allow করুন');
    const g=await nexoStrictGpsLocation();
    const rev=await nexoReverseAreaFromGps(g);
    const body={...g,location:rev.area,source:'DRIVER_GPS_CHECK'};
    let r=null;
    try{ r=await api('/driver/check-gps',{method:'POST',body}); }catch(e){ r=null; }
    driverProfile={...(driverProfile||{}),...(r?.driver_profile||{}),lat:g.lat,lng:g.lng,location:rev.area,area:rev.area,last_location_at:new Date().toISOString()};
    driverGpsHealth=r?.gps_health || {available:true,gps_on:true,running:rev.inside,inside_service_area:rev.inside,lat:g.lat,lng:g.lng,location_name:rev.area,nearest:rev.nearest,last_location_at:driverProfile.last_location_at,status:rev.inside?'RUNNING':'OUTSIDE_SERVICE_AREA'};
    toast(rev.inside?`GPS Running · ${rev.area}`:`GPS বাইরে · ${rev.area}`);
    render();
  }catch(e){
    driverGpsHealth={available:false,gps_on:false,running:false,message:e.message||'GPS পাওয়া যায়নি'};
    toast(e.message||'GPS পাওয়া যায়নি');
    try{ if(window.NexoRideNative && typeof window.NexoRideNative.requestAllPermissions==='function') window.NexoRideNative.requestAllPermissions(); }catch(_e){}
    render();
  }
}
async function goDriverOnline(){
  try{
    if(!isDriverApprovedForOnline(driverProfile)){
      toast(driverOnlineLockMessage(driverProfile));
      currentTab='kyc';
      return render();
    }
    toast('GPS checking... Online করার আগে location confirm হচ্ছে');
    const g=await nexoStrictGpsLocation();
    const rev=await nexoReverseAreaFromGps(g);
    if(!rev.inside){
      driverGpsHealth={available:true,gps_on:true,running:false,inside_service_area:false,lat:g.lat,lng:g.lng,location_name:rev.area,status:'OUTSIDE_SERVICE_AREA'};
      toast('Service area-এর বাইরে আছেন। Go Online করা যাবে না।');
      return render();
    }
    const r=await api('/driver/go-online',{method:'POST',body:{location:rev.area,...g,source:'DRIVER_GO_ONLINE'}});
    if(r.driver_profile) driverProfile={...(driverProfile||{}),...r.driver_profile,location:rev.area,area:rev.area};
    driverGpsHealth=r.gps_health || {available:true,gps_on:true,running:true,inside_service_area:true,lat:g.lat,lng:g.lng,location_name:rev.area,status:'RUNNING'};
    await loadMe();
    if(driverProfile) { driverProfile.location=rev.area; driverProfile.area=rev.area; driverProfile.online=true; }
    startDriverLocationTracking();
    toast(`Online Running · ${rev.area} থেকে ভাড়া নেওয়া শুরু হয়েছে`);
    driverHome();
  }catch(e){toast(e.message||'Go Online failed')}
}
function driverHome(){
  const online=!!driverProfile?.online;
  const eligible=isDriverApprovedForOnline(driverProfile);
  const lockMsg=driverOnlineLockMessage(driverProfile);
  if(online && eligible) startDriverLocationTracking(); else stopDriverLocationTracking();
  const locText=driverGpsText();
  const localArea=driverGpsHealth?.location_name || driverProfile?.location || driverProfile?.area || 'Not set';
  const actionBtn=eligible
    ? `<button class="primary driver-main-btn" onclick="toggleOnline(${online?'false':'true'})">${online?'🔴 Go Offline':'🟢 Go Online / ভাড়া নেওয়া শুরু'}</button>`
    : `<button class="primary driver-main-btn" onclick="currentTab='kyc';render()">🔒 Go Online Locked</button><button class="ghost" style="margin-top:10px" onclick="currentTab='kyc';render()">KYC / Admin Approval খুলুন</button>`;
  const statusBox=eligible?`<div class="${online?'ok':'alert'}">${online?`🟢 Running · ${esc(localArea)} থেকে ride request নেওয়া হচ্ছে`:L('offline')}</div>`:`<div class="alert">${esc(lockMsg)}</div>`;
  shell(`<section class="hero-card driver-live-hero"><div><span class="glow-chip">Driver Panel</span><h2>${online?'Online Running':'Offline'}</h2><p>${eligible?esc(locText):esc(lockMsg)}</p></div>${actionBtn}</section>${profileSummaryStats()}<section class="card driver-gps-card"><div class="section-title"><h2>GPS / Local Area Status</h2><button>${online?'RUNNING':'CHECK'}</button></div>${statusBox}<div class="driver-gps-line"><b>${esc(localArea)}</b><span>${esc(locText)}</span></div><div class="voice-help" style="margin-top:10px"><button onclick="checkDriverGps()">📍 Check GPS</button><span>GPS Running দেখালে local area name status-এ উঠবে।</span></div><div class="two-btn" style="margin-top:10px"><button class="ghost" onclick="nexoRequestNativePermissions()">🔐 Ask Permission</button><button class="ghost" onclick="nexoOpenAppSettings()">⚙️ App Settings</button></div></section><section class="card"><div class="section-title"><h2>Bookings</h2><button onclick="currentTab='rides';render()">Requests</button></div><div class="booking-pill-grid"><button onclick="currentTab='rides';render()"><i>📥</i> Current Requests</button><button onclick="currentTab='wallet';render()"><i>₹</i> Wallet</button><button onclick="currentTab='rides';render()"><i>🕘</i> History</button><button onclick="currentTab='kyc';render()"><i>🪪</i> Documents</button></div></section><section class="card"><div class="section-title"><h2>${L('dmenu')}</h2><button>Toto</button></div><div class="grid ${easyMode?'easy-grid':''}">${tile('📥',L('acceptReq'),L('req'),"currentTab='rides';render()")} ${tile('🔔','Alerts','Ride/payment alert',"currentTab='notifications';render()")} ${tile('🧾',L('history'),L('myrides'),"currentTab='rides';render()")} ${tile('🪪',L('docs'),'KYC / Vehicle profile',"currentTab='kyc';render()")} ${tile('₹',L('fareRules'),L('localFare'),"currentTab='wallet';render()")}</div></section>`);
}

/* Sprint-7A marker: APK permission bridge + Google return-to-app */
try{window.NEXO_RIDE_SPRINT7A_APK_PERMISSION_GOOGLE_RETURN=true;}catch(e){}
