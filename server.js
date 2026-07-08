const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const VERSION = '2.0-SPRINT7A_APK_PERMISSION_GOOGLE_RETURN';
// SmartASP.NET assigns a dynamic Node.js port in process.env.PORT. Do not hardcode 3333 on shared hosting.
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
function loadEnvFile(file){
  try{
    if(!fs.existsSync(file)) return;
    const lines = fs.readFileSync(file,'utf8').split(/\r?\n/);
    for(const line of lines){
      const t = line.trim();
      if(!t || t.startsWith('#') || !t.includes('=')) continue;
      const idx = t.indexOf('=');
      const key = t.slice(0,idx).trim();
      let val = t.slice(idx+1).trim();
      if((val.startsWith('\"') && val.endsWith('\"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1,-1);
      if(key && process.env[key] === undefined) process.env[key] = val;
    }
  }catch(e){ console.error('ENV_LOAD_ERROR', file, e.message); }
}
loadEnvFile(path.join(__dirname,'.env'));
loadEnvFile(path.join(__dirname,'data','production.env'));
const DB_FILE = path.join(DATA_DIR, 'nexo_ride_db.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(DATA_DIR, 'uploads');
const PUBLIC_DIR = path.join(__dirname, 'web', 'app');
const ADMIN_DIR = path.join(__dirname, 'web', 'admin');
const SUBADMIN_DIR = path.join(__dirname, 'web', 'subadmin');
const SESSION_DAYS = 30;
const PAYMENT_HOLD_SECONDS = 180; // Driver accept করার পর passenger payment করার সময়

function now(){ return new Date().toISOString(); }
function ensureDataDir(){ if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR,{recursive:true}); }
function uid(prefix='id'){ return prefix + '_' + crypto.randomBytes(8).toString('hex'); }
function sha(v){ return crypto.createHash('sha256').update(String(v||'')).digest('hex'); }
function salt(){ return crypto.randomBytes(16).toString('hex'); }
function hashPassword(password, s){ return crypto.pbkdf2Sync(String(password||''), s, 120000, 32, 'sha256').toString('hex'); }
function verifyPassword(password, s, h){ if(!s||!h) return false; return hashPassword(password,s) === h; }
function safeUser(u){ if(!u) return null; const {password_hash,password_salt,...rest}=u; return rest; }

function normalizeIndianMobile(mobile){
  let d = String(mobile||'').replace(/\D/g,'');
  if(d.length === 10) d = '91' + d;
  if(d.length === 12 && d.startsWith('91')) return d;
  return d;
}
function httpGetJson(url){
  return new Promise((resolve,reject)=>{
    const lib = url.startsWith('https://') ? https : http;
    const req = lib.get(url, {timeout:15000, headers:{'User-Agent':'NEXO-Ride-OTP/2.0'}}, (resp)=>{
      let data='';
      resp.on('data', chunk => data += chunk);
      resp.on('end', ()=>{
        try{ resolve({statusCode:resp.statusCode, json:JSON.parse(data), raw:data}); }
        catch(e){ resolve({statusCode:resp.statusCode, json:null, raw:data}); }
      });
    });
    req.on('timeout', ()=>{ req.destroy(new Error('OTP gateway timeout')); });
    req.on('error', reject);
  });
}
function twoFactorApiKey(){ return process.env.TWOFACTOR_API_KEY || process.env.TWO_FACTOR_API_KEY || ''; }
function mapplsStaticKey(){ return process.env.MAPPLS_STATIC_KEY || process.env.MAPPLS_WEB_KEY || process.env.MAPPLS_API_KEY || ''; }
function googleMapsKey(){ return process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_WEB_KEY || ''; }
function envBool(v){ return String(v||'').trim().toLowerCase()==='true' || String(v||'').trim()==='1' || String(v||'').trim().toLowerCase()==='yes'; }
function googleClientId(){ return process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID || ''; }
function googleClientSecret(){ return process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET || ''; }
function googleLoginEnabled(){ return envBool(process.env.GOOGLE_LOGIN_ENABLED) && !!googleClientId() && !!googleClientSecret(); }
function publicBaseUrl(req){
  const envUrl = String(process.env.SERVER_URL || '').trim().replace(/\/$/,'');
  if(envUrl) return envUrl;
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim() || 'https';
  const host = req.headers.host || 'ride.nexoofficial.in';
  return `${proto}://${host}`;
}
function googleCallbackUrl(req){ return String(process.env.GOOGLE_CALLBACK_URL || `${publicBaseUrl(req)}/api/auth/google/callback`).trim(); }
function base64url(v){ return Buffer.from(String(v),'utf8').toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_'); }
function unbase64url(v){ let s=String(v||'').replace(/-/g,'+').replace(/_/g,'/'); while(s.length%4) s+='='; return Buffer.from(s,'base64').toString('utf8'); }
function googleStateSign(payload){ const secret=process.env.APP_SECRET || process.env.SESSION_SECRET || googleClientSecret() || 'nexo-ride-google'; return crypto.createHmac('sha256', secret).update(payload).digest('hex'); }
function makeGoogleState(role='PASSENGER', opts={}){ const payload=base64url(JSON.stringify({role:String(role||'PASSENGER').toUpperCase(), ts:Date.now(), nonce:crypto.randomBytes(8).toString('hex'), return_app:!!opts.return_app, source:String(opts.source||'web')})); return `${payload}.${googleStateSign(payload)}`; }
function verifyGoogleState(state){
  const [payload,sig]=String(state||'').split('.');
  if(!payload || !sig || googleStateSign(payload)!==sig) return null;
  try{ const j=JSON.parse(unbase64url(payload)); if(Date.now()-Number(j.ts||0)>10*60*1000) return null; return j; }catch(e){ return null; }
}
function httpPostFormJson(url, form, headers={}){
  return new Promise((resolve,reject)=>{
    const u = new URL(url);
    const data = new URLSearchParams(form).toString();
    const opts = {method:'POST', hostname:u.hostname, path:u.pathname+u.search, port:u.port || 443, timeout:15000, headers:{'Content-Type':'application/x-www-form-urlencoded','Content-Length':Buffer.byteLength(data),'User-Agent':'NEXO-Ride-GoogleAuth/6A',...headers}};
    const req = https.request(opts, resp=>{ let body=''; resp.on('data',ch=>body+=ch); resp.on('end',()=>{ try{ resolve({statusCode:resp.statusCode,json:JSON.parse(body),raw:body}); }catch(e){ resolve({statusCode:resp.statusCode,json:null,raw:body}); } }); });
    req.on('timeout',()=>req.destroy(new Error('Google OAuth timeout')));
    req.on('error',reject);
    req.write(data); req.end();
  });
}
function httpGetJsonWithHeaders(url, headers={}){
  return new Promise((resolve,reject)=>{
    const lib = url.startsWith('https://') ? https : http;
    const req = lib.get(url, {timeout:15000, headers:{'User-Agent':'NEXO-Ride-GoogleAuth/6A',...headers}}, resp=>{ let data=''; resp.on('data',ch=>data+=ch); resp.on('end',()=>{ try{ resolve({statusCode:resp.statusCode,json:JSON.parse(data),raw:data}); }catch(e){ resolve({statusCode:resp.statusCode,json:null,raw:data}); } }); });
    req.on('timeout',()=>req.destroy(new Error('Google userinfo timeout')));
    req.on('error',reject);
  });
}
async function sendOtpViaGateway(provider, mobile, purpose){
  provider = String(provider||'DEMO').toUpperCase();
  if(provider !== 'TWOFACTOR') return null;
  const key = twoFactorApiKey();
  if(!key) throw new Error('TWOFACTOR_API_KEY not configured');
  const phone = normalizeIndianMobile(mobile);
  const template = String(process.env.TWOFACTOR_TEMPLATE_NAME || '').trim();
  const url = `https://2factor.in/API/V1/${encodeURIComponent(key)}/SMS/${encodeURIComponent(phone)}/AUTOGEN` + (template ? `/${encodeURIComponent(template)}` : '');
  const r = await httpGetJson(url);
  const j = r.json || {};
  if(String(j.Status||'').toLowerCase() !== 'success') throw new Error('2Factor send failed: ' + (j.Details || r.raw || r.statusCode));
  return {gateway:'2FACTOR', phone, session_id:String(j.Details||''), raw_status:j.Status, purpose};
}
async function verifyOtpViaGateway(reqItem, otp){
  const provider = String(reqItem?.provider||'DEMO').toUpperCase();
  if(provider !== 'TWOFACTOR') return !!(reqItem && reqItem.code_hash === sha(otp));
  const key = twoFactorApiKey();
  if(!key) throw new Error('TWOFACTOR_API_KEY not configured');
  const session = String(reqItem.gateway_session_id || reqItem.session_id || '').trim();
  if(!session) return false;
  const url = `https://2factor.in/API/V1/${encodeURIComponent(key)}/SMS/VERIFY/${encodeURIComponent(session)}/${encodeURIComponent(String(otp||'').trim())}`;
  const r = await httpGetJson(url);
  const j = r.json || {};
  return String(j.Status||'').toLowerCase() === 'success' && String(j.Details||'').toLowerCase().includes('matched');
}

function createAdminUser(){
  const s = salt();
  return {
    id:'admin_primary',
    name:'NEXO Ride Admin',
    mobile:'6295192839',
    email:'bappa.roysm@gmail.com',
    role:'ADMIN',
    nexo_id:'NEXO-ADMIN',
    status:'ACTIVE',
    created_at:now(),
    last_login_at:null,
    consent_at:now(),
    consent_version:'v1',
    must_change_password:true,
    password_salt:s,
    password_hash:hashPassword('admin@123',s)
  };
}
function appSettings(){
  return {
    app_name:'NEXO Ride',
    brand:'Astra Technologies',
    package_name:'com.astratechnologies.nexoride',
    service_area:'Kalna Sub-Division',
    admin_mobile:'6295192839',
    admin_email:'bappa.roysm@gmail.com',
    support_mobile:'9749983737',
    support_email:'babairoykalma@gmail.com',
    payment_mode:'Razorpay ready + manual UPI QR later',
    otp_mode:'2Factor SMS OTP ready; Demo fallback available',
    driver_approval_required:false,
    map_mode: process.env.MAP_PROVIDER==='MAPPLS' ? 'Mappls/MapmyIndia enabled' : 'Demo route preview now; Mappls/Google API later',
    matching_mode:'Nearest online approved drivers',
    geofence_enabled:true
  };
}

function defaultIntegrations(){
  const mapProvider = String(process.env.MAP_PROVIDER || 'DEMO').toUpperCase();
  const otpProvider = String(process.env.OTP_PROVIDER || 'DEMO').toUpperCase();
  const paymentProvider = String(process.env.PAYMENT_PROVIDER || (envBool(process.env.RAZORPAY_ENABLED) || process.env.RAZORPAY_KEY_ID ? 'RAZORPAY' : 'DEMO')).toUpperCase();
  return {
    map:{
      provider: mapProvider,
      mappls_key_present: !!mapplsStaticKey(),
      google_key_present: !!googleMapsKey(),
      api_key_configured: !!(mapplsStaticKey() || googleMapsKey()),
      search_enabled: mapProvider !== 'DEMO',
      route_enabled: mapProvider !== 'DEMO',
      navigation_provider: process.env.NAVIGATION_PROVIDER || (mapProvider==='MAPPLS' ? 'MAPPLS_WEB' : 'GOOGLE_WEB'),
      external_navigation_enabled: true,
      mappls_key_label: mapplsStaticKey() ? 'SET_FROM_ENV' : '',
      google_key_label: googleMapsKey() ? 'SET_FROM_ENV' : '',
      mappls_public_key_enabled: envBool(process.env.MAPPLS_PUBLIC_KEY_ENABLED),
      note:'DEMO mode works without key. Use Mappls/Google key for real pickup/drop search, distance, ETA and in-app map. External navigation link works now.'
    },
    otp:{
      provider: otpProvider,
      demo_code: process.env.DEMO_OTP || '123456',
      firebase_project_id: process.env.FIREBASE_PROJECT_ID || '',
      msg91_key_present: !!process.env.MSG91_AUTH_KEY,
      twofactor_key_present: !!process.env.TWOFACTOR_API_KEY,
      note:'DEMO OTP is for testing only. Production should use Firebase, MSG91 or 2Factor.'
    },
    payment:{
      provider: paymentProvider,
      razorpay_key_id: process.env.RAZORPAY_KEY_ID || '',
      razorpay_secret_present: !!process.env.RAZORPAY_KEY_SECRET,
      manual_upi_id: process.env.MANUAL_UPI_ID || '',
      manual_qr_label:'Manual QR/UPI will be added by admin when available.',
      note:'Production payment must verify success from backend/webhook before confirming booking.'
    },
    auth:{
      google_login_enabled: googleLoginEnabled(),
      google_client_id_present: !!googleClientId(),
      google_client_secret_present: !!googleClientSecret(),
      google_callback_url: process.env.GOOGLE_CALLBACK_URL || '',
      passenger_only:true,
      note:'Passenger Google Login uses secure OAuth redirect. Mobile OTP remains fallback and driver login stays OTP/KYC.'
    },
    push:{
      provider:String(process.env.PUSH_PROVIDER || 'DEMO').toUpperCase(),
      firebase_project_id: process.env.FIREBASE_PROJECT_ID || '',
      firebase_config_present: !!process.env.FIREBASE_PROJECT_ID,
      fcm_server_key_present: !!process.env.FCM_SERVER_KEY,
      vapid_public_key_present: !!process.env.FCM_VAPID_PUBLIC_KEY,
      web_push_enabled: !!process.env.FCM_VAPID_PUBLIC_KEY,
      android_push_enabled: !!process.env.FCM_SERVER_KEY,
      demo_delivery_log_enabled:true,
      note:'DEMO push logs notifications now. Production needs Firebase project, FCM server credential and Web Push VAPID key for real push delivery.'
    },
    storage:{
      provider: String(process.env.STORAGE_PROVIDER || 'LOCAL_FILE').toUpperCase(),
      upload_dir: process.env.UPLOAD_DIR || 'data/uploads',
      max_upload_mb: Number(process.env.MAX_UPLOAD_MB || 10),
      allowed_mime: ['image/jpeg','image/png','image/webp','application/pdf'],
      kyc_local_upload_enabled: true,
      production_object_storage_present: !!(process.env.S3_BUCKET || process.env.R2_BUCKET || process.env.GCS_BUCKET),
      note:'Driver KYC files are stored locally for prototype. Production should use S3/R2/GCS with signed URLs, encryption and access audit.'
    },
    production:{
      server_url: process.env.SERVER_URL || '',
      deploy_provider: process.env.DEPLOY_PROVIDER || 'DEMO',
      domain_name: process.env.DOMAIN_NAME || '',
      ssl_configured: !!process.env.SSL_CONFIGURED,
      repo_url: process.env.REPO_URL || '',
      branch: process.env.DEPLOY_BRANCH || 'main',
      database_target:'PostgreSQL',
      database_url_present: !!process.env.DATABASE_URL,
      data_storage_current:'LOCAL_JSON_PERSISTENT',
      health_check_path:'/api/health',
      deployment_note:'Termux/local preview works now. Production needs HTTPS domain, public server, PostgreSQL and environment secrets.'
    },
    updated_at: now()
  };
}
function mergeIntegrations(saved){
  const d = defaultIntegrations();
  const s = saved || {};
  const merged = {
    map:{...d.map, ...(s.map||{})},
    otp:{...d.otp, ...(s.otp||{})},
    payment:{...d.payment, ...(s.payment||{})},
    push:{...d.push, ...(s.push||{})},
    auth:{...d.auth, ...(s.auth||{})},
    storage:{...d.storage, ...(s.storage||{})},
    production:{...d.production, ...(s.production||{})},
    updated_at:s.updated_at || d.updated_at
  };
  // production.env must override old admin/demo settings after deployment
  if(process.env.MAP_PROVIDER) merged.map.provider = String(process.env.MAP_PROVIDER).toUpperCase();
  if(process.env.NAVIGATION_PROVIDER) merged.map.navigation_provider = String(process.env.NAVIGATION_PROVIDER).toUpperCase();
  if(mapplsStaticKey()){ merged.map.mappls_key_present = true; merged.map.api_key_configured = true; merged.map.mappls_key_label = 'SET_FROM_ENV'; }
  if(googleMapsKey()){ merged.map.google_key_present = true; merged.map.api_key_configured = true; merged.map.google_key_label = 'SET_FROM_ENV'; }
  merged.map.mappls_public_key_enabled = envBool(process.env.MAPPLS_PUBLIC_KEY_ENABLED);
  if(process.env.OTP_PROVIDER) merged.otp.provider = String(process.env.OTP_PROVIDER).toUpperCase();
  if(twoFactorApiKey()) merged.otp.twofactor_key_present = true;
  if(process.env.PAYMENT_PROVIDER) merged.payment.provider = String(process.env.PAYMENT_PROVIDER).toUpperCase();
  if(envBool(process.env.RAZORPAY_ENABLED) || process.env.RAZORPAY_KEY_ID){
    merged.payment.provider = 'RAZORPAY';
    merged.payment.razorpay_key_id = process.env.RAZORPAY_KEY_ID || merged.payment.razorpay_key_id || '';
    merged.payment.razorpay_secret_present = !!process.env.RAZORPAY_KEY_SECRET;
  }
  return merged;
}
function integrationReadiness(db){
  const i = mergeIntegrations(db.integrations);
  const checks = [
    {key:'database', title:'Persistent Database', ok:true, mode:'LOCAL_JSON', next:'Production launch-এর আগে PostgreSQL migrate করুন'},
    {key:'map', title:'Real Map API', ok:i.map.provider!=='DEMO' && (i.map.mappls_key_present || i.map.google_key_present || i.map.api_key_configured), mode:i.map.provider, next:'Mappls বা Google key বসান'},
    {key:'otp', title:'Real OTP', ok:i.otp.provider!=='DEMO' && (i.otp.firebase_project_id || i.otp.msg91_key_present || i.otp.twofactor_key_present || i.otp.api_key_configured), mode:i.otp.provider, next:'Firebase/MSG91/2Factor configure করুন'},
    {key:'payment', title:'Real Payment', ok:i.payment.provider!=='DEMO' && ((i.payment.provider==='RAZORPAY' && (i.payment.razorpay_key_id || i.payment.key_id_configured)) || (i.payment.provider==='MANUAL_QR' && !!i.payment.manual_upi_id)), mode:i.payment.provider, next:'Razorpay key অথবা manual UPI ID/QR add করুন'},
    {key:'push', title:'Push Notification', ok:!!(i.push.fcm_server_key_present || i.push.firebase_config_present), mode:i.push.provider, next:'Firebase Cloud Messaging configure করুন'},
    {key:'server', title:'Public Server URL', ok:!!i.production.server_url, mode:i.production.server_url || 'LOCAL_TERMUX', next:'DigitalOcean/Render/VPS + HTTPS domain দিন'},
    {key:'ssl', title:'HTTPS / SSL', ok:!!i.production.ssl_configured || String(i.production.server_url||'').startsWith('https://'), mode:i.production.ssl_configured ? 'CONFIGURED' : 'PENDING', next:'Production domain-এ SSL/HTTPS enable করুন'},
    {key:'dbprod', title:'Production PostgreSQL', ok:!!i.production.database_url_present, mode:i.production.database_target || 'PostgreSQL', next:'DATABASE_URL set করে PostgreSQL migration করুন'}
  ];
  return {integrations:i, checks, ready_count:checks.filter(x=>x.ok).length, total:checks.length, production_ready:checks.every(x=>x.ok)};
}

function defaultLegalDocuments(){
  const stamp = now();
  return {
    privacy_policy:{version:'PP-v1', title:'Privacy Policy', status:'DRAFT', last_updated:stamp, mandatory:true, language:'BN+EN', summary:'Mobile number, role, live location, ride details, payment status, support/refund records and driver KYC documents will be used for NEXO Ride operation and legal compliance.'},
    terms:{version:'TC-v1', title:'Terms & Conditions', status:'DRAFT', last_updated:stamp, mandatory:true, language:'BN+EN', summary:'NEXO Ride is a Kalna Sub-Division local Toto booking platform. Booking confirms only after driver acceptance and payment confirmation.'},
    refund_policy:{version:'RF-v1', title:'Refund Policy', status:'DRAFT', last_updated:stamp, mandatory:true, language:'BN+EN', summary:'Refund requests can be raised from Support Center. Admin will review and mark approved/paid/rejected.'},
    driver_agreement:{version:'DA-v1', title:'Driver Agreement', status:'DRAFT', last_updated:stamp, mandatory:true, language:'BN+EN', summary:'Driver must complete KYC, obey safety rules, maintain vehicle details, accept rides responsibly and follow payout/commission rules.'},
    sub_admin_agreement:{version:'SA-v1', title:'Sub Admin Agreement', status:'DRAFT', last_updated:stamp, mandatory:true, language:'BN+EN', summary:'Area Sub Admin can add/manage local drivers/passengers and receives configured share from platform commission of managed drivers.'},
    data_retention:{version:'DR-v1', title:'Data Retention Policy', status:'DRAFT', last_updated:stamp, mandatory:true, language:'BN+EN', summary:'Ride/payment/KYC/support/audit records should be retained for operations, dispute handling and lawful compliance.'}
  };
}
function legalStatus(db){
  db.legal_documents = db.legal_documents || defaultLegalDocuments();
  db.legal_acceptance_records = db.legal_acceptance_records || [];
  const docs = Object.entries(db.legal_documents).map(([key,doc])=>({key, ...doc}));
  const mandatory = docs.filter(d=>d.mandatory !== false);
  const approved = mandatory.filter(d=>String(d.status||'').toUpperCase()==='APPROVED');
  const draft = docs.filter(d=>String(d.status||'').toUpperCase()==='DRAFT');
  const acceptanceSummary = db.legal_acceptance_records.reduce((acc,r)=>{ acc[r.doc_key]=(acc[r.doc_key]||0)+1; return acc; },{});
  const checks = [
    {title:'Privacy Policy approved', ok:String(db.legal_documents.privacy_policy?.status||'').toUpperCase()==='APPROVED', detail:db.legal_documents.privacy_policy?.version||''},
    {title:'Terms approved', ok:String(db.legal_documents.terms?.status||'').toUpperCase()==='APPROVED', detail:db.legal_documents.terms?.version||''},
    {title:'Refund policy approved', ok:String(db.legal_documents.refund_policy?.status||'').toUpperCase()==='APPROVED', detail:db.legal_documents.refund_policy?.version||''},
    {title:'Driver agreement approved', ok:String(db.legal_documents.driver_agreement?.status||'').toUpperCase()==='APPROVED', detail:db.legal_documents.driver_agreement?.version||''},
    {title:'Sub Admin agreement approved', ok:String(db.legal_documents.sub_admin_agreement?.status||'').toUpperCase()==='APPROVED', detail:db.legal_documents.sub_admin_agreement?.version||''},
    {title:'Consent records enabled', ok:true, detail:`${db.legal_acceptance_records.length} acceptance records`}
  ];
  return {summary:{total:docs.length, mandatory:mandatory.length, approved:approved.length, draft:draft.length, legal_ready:mandatory.length>0 && approved.length===mandatory.length, acceptance_records:db.legal_acceptance_records.length}, docs, checks, acceptance_summary:acceptanceSummary};
}


function defaultAuthSettings(){
  return {
    login_methods:['PASSWORD','OTP'],
    default_method:'OTP',
    otp_provider:String(process.env.OTP_PROVIDER || 'DEMO').toUpperCase(),
    demo_otp:String(process.env.DEMO_OTP || '123456'),
    otp_expiry_minutes:Number(process.env.OTP_EXPIRY_MINUTES || 5),
    resend_cooldown_seconds:Number(process.env.OTP_RESEND_COOLDOWN_SECONDS || 60),
    max_otp_per_mobile_per_hour:Number(process.env.MAX_OTP_PER_MOBILE_PER_HOUR || 5),
    session_days:Number(process.env.SESSION_DAYS || 30),
    rolling_session_enabled:true,
    consent_required:true,
    password_login_enabled:true,
    otp_login_enabled:true,
    production_sms_ready:false,
    firebase_ready:!!process.env.FIREBASE_PROJECT_ID,
    msg91_ready:!!process.env.MSG91_AUTH_KEY,
    twofactor_ready:!!process.env.TWOFACTOR_API_KEY,
    note:'DEMO OTP testing-এর জন্য। Production launch-এর আগে Firebase/MSG91/2Factor configure করে real SMS OTP চালু করুন।',
    updated_at:now()
  };
}
function authSettings(db){
  db.auth_settings = {...defaultAuthSettings(), ...(db.auth_settings || {})};
  const integ = mergeIntegrations(db.integrations || {});
  if(integ.otp){
    db.auth_settings.otp_provider = String(db.auth_settings.otp_provider || integ.otp.provider || 'DEMO').toUpperCase();
    db.auth_settings.demo_otp = String(db.auth_settings.demo_otp || integ.otp.demo_code || '123456');
    db.auth_settings.firebase_ready = !!(db.auth_settings.firebase_ready || integ.otp.firebase_project_id);
    db.auth_settings.msg91_ready = !!(db.auth_settings.msg91_ready || integ.otp.msg91_key_present);
    db.auth_settings.twofactor_ready = !!(db.auth_settings.twofactor_ready || integ.otp.twofactor_key_present);
  }
  db.auth_settings.otp_expiry_minutes = Math.max(1, Math.min(30, Number(db.auth_settings.otp_expiry_minutes || 5)));
  db.auth_settings.resend_cooldown_seconds = Math.max(0, Math.min(600, Number(db.auth_settings.resend_cooldown_seconds || 60)));
  db.auth_settings.max_otp_per_mobile_per_hour = Math.max(1, Math.min(50, Number(db.auth_settings.max_otp_per_mobile_per_hour || 5)));
  db.auth_settings.session_days = Math.max(1, Math.min(365, Number(db.auth_settings.session_days || 30)));
  return db.auth_settings;
}
function maskMobile(m){ const x=String(m||''); return x.length>4 ? x.slice(0,2)+'****'+x.slice(-2) : x; }
function authStatus(db){
  const set = authSettings(db);
  const otpReqs = db.otp_requests || [];
  const sessions = db.sessions || [];
  const nowMs = Date.now();
  const activeSessions = sessions.filter(x=>new Date(x.expires_at).getTime()>nowMs);
  const expiredSessions = sessions.length - activeSessions.length;
  const lastHour = otpReqs.filter(x=>new Date(x.created_at).getTime()>nowMs-60*60*1000);
  const verified = otpReqs.filter(x=>x.verified);
  const providerReady = set.otp_provider !== 'DEMO' && (set.firebase_ready || set.msg91_ready || set.twofactor_ready || set.production_sms_ready);
  const checks = [
    {key:'otp_enabled', title:'OTP login enabled', ok:!!set.otp_login_enabled, detail:`Provider: ${set.otp_provider}`},
    {key:'real_provider', title:'Real SMS OTP provider configured', ok:providerReady, detail:providerReady?'Production SMS provider ready':'Firebase/MSG91/2Factor key pending'},
    {key:'demo_warning', title:'Demo OTP disabled for production', ok:set.otp_provider !== 'DEMO', detail:set.otp_provider==='DEMO'?'DEMO OTP is only for testing':'Real provider selected'},
    {key:'expiry', title:'OTP expiry configured', ok:set.otp_expiry_minutes>=1 && set.otp_expiry_minutes<=10, detail:`${set.otp_expiry_minutes} minutes`},
    {key:'rate_limit', title:'OTP rate limit configured', ok:set.max_otp_per_mobile_per_hour<=10, detail:`${set.max_otp_per_mobile_per_hour}/mobile/hour`},
    {key:'session', title:'30-day session / rolling login ready', ok:!!set.rolling_session_enabled && set.session_days>=30, detail:`${set.session_days} days`},
    {key:'consent', title:'Consent required before account use', ok:!!set.consent_required, detail:set.consent_required?'Mandatory':'Disabled'},
    {key:'password', title:'Fallback password login available', ok:!!set.password_login_enabled, detail:'Admin/main user fallback'}
  ];
  const recent = otpReqs.slice(-80).reverse().map(x=>({id:x.id, mobile_masked:maskMobile(x.mobile), provider:x.provider, purpose:x.purpose, created_at:x.created_at, expires_at:x.expires_at, verified:!!x.verified, verified_at:x.verified_at||'', status:x.verified?'VERIFIED':(new Date(x.expires_at)<new Date()?'EXPIRED':'PENDING')}));
  return {settings:set, summary:{active_sessions:activeSessions.length, expired_sessions:expiredSessions, total_sessions:sessions.length, otp_requests:otpReqs.length, otp_last_hour:lastHour.length, otp_verified:verified.length, otp_pending:otpReqs.filter(x=>!x.verified && new Date(x.expires_at)>new Date()).length, production_ready:checks.every(c=>c.ok)}, checks, recent_otp:recent, updated_at:now()};
}


function defaultPushSettings(){
  return {
    provider:String(process.env.PUSH_PROVIDER || 'DEMO').toUpperCase(),
    firebase_project_id:process.env.FIREBASE_PROJECT_ID || '',
    fcm_server_key_present:!!process.env.FCM_SERVER_KEY,
    vapid_public_key_present:!!process.env.FCM_VAPID_PUBLIC_KEY,
    vapid_public_key_label:process.env.FCM_VAPID_PUBLIC_KEY ? 'SET_FROM_ENV' : '',
    web_push_enabled:!!process.env.FCM_VAPID_PUBLIC_KEY,
    android_push_enabled:!!process.env.FCM_SERVER_KEY,
    demo_delivery_log_enabled:true,
    auto_register_web_demo_token:true,
    notify_ride_request:true,
    notify_driver_accept:true,
    notify_payment:true,
    notify_sos:true,
    notify_support_refund:true,
    notify_kyc:true,
    note:'DEMO mode-এ notification app-এর ভিতরে এবং delivery log-এ থাকবে। Real push চালাতে Firebase Cloud Messaging + VAPID/Public key configure করুন।',
    updated_at:now()
  };
}
function pushSettings(db){
  const integ = mergeIntegrations(db.integrations||{}).push || {};
  db.push_settings = {...defaultPushSettings(), ...(db.push_settings || {})};
  db.push_settings.provider = String(db.push_settings.provider || integ.provider || 'DEMO').toUpperCase();
  db.push_settings.firebase_project_id = db.push_settings.firebase_project_id || integ.firebase_project_id || '';
  db.push_settings.fcm_server_key_present = !!(db.push_settings.fcm_server_key_present || integ.fcm_server_key_present);
  db.push_settings.vapid_public_key_present = !!(db.push_settings.vapid_public_key_present || integ.vapid_public_key_present);
  if(!db.push_settings.vapid_public_key_label && integ.vapid_public_key_present) db.push_settings.vapid_public_key_label='SET_FROM_INTEGRATION';
  return db.push_settings;
}
function pushTokenOut(db,t){
  const u=(db.users||[]).find(x=>x.id===t.user_id)||{};
  return {id:t.id, user_id:t.user_id, user_name:u.name||'', user_mobile:u.mobile||'', user_role:u.role||'', area:u.area||t.area||'', platform:t.platform||'WEB', device_name:t.device_name||'', permission_status:t.permission_status||'', app_version:t.app_version||'', active:t.active!==false, created_at:t.created_at, updated_at:t.updated_at, last_seen_at:t.last_seen_at||t.updated_at||t.created_at};
}
function matchingPushTokens(db, notification){
  let tokens=(db.push_tokens||[]).filter(t=>t.active!==false);
  if(notification.user_id) tokens=tokens.filter(t=>t.user_id===notification.user_id);
  else if(notification.role) {
    const role=String(notification.role||'').toUpperCase();
    const ids=(db.users||[]).filter(u=>String(u.role||'').toUpperCase()===role).map(u=>u.id);
    tokens=tokens.filter(t=>ids.includes(t.user_id));
  } else if(notification.area) {
    const area=String(notification.area||'').toLowerCase();
    const ids=(db.users||[]).filter(u=>String(u.area||'').toLowerCase()===area || String(u.role||'').toUpperCase()==='ADMIN').map(u=>u.id);
    tokens=tokens.filter(t=>ids.includes(t.user_id));
  }
  return tokens;
}
function queuePushDeliveries(db, notification){
  const set=pushSettings(db);
  db.push_delivery_logs = db.push_delivery_logs || [];
  const tokens=matchingPushTokens(db, notification);
  const mode=String(set.provider||'DEMO').toUpperCase();
  const realReady = mode==='FCM' && (set.fcm_server_key_present || set.vapid_public_key_present || set.web_push_enabled || set.android_push_enabled);
  const out=[];
  for(const t of tokens){
    const log={id:uid('pdl'), notification_id:notification.id, push_token_id:t.id, user_id:t.user_id, platform:t.platform||'WEB', provider:mode, title:notification.title, event_type:notification.event_type, status: realReady?'QUEUED':'DEMO_LOGGED', attempts:0, created_at:now(), last_attempt_at:null, error:null, note:realReady?'Ready for FCM worker/webhook delivery':'Stored as demo in-app notification; no real device push sent'};
    db.push_delivery_logs.push(log); out.push(log);
  }
  if(db.push_delivery_logs.length>1000) db.push_delivery_logs=db.push_delivery_logs.slice(-1000);
  return out;
}
function pushCenterStatus(db){
  const set=pushSettings(db);
  const tokens=(db.push_tokens||[]).map(t=>pushTokenOut(db,t));
  const active=tokens.filter(t=>t.active);
  const logs=db.push_delivery_logs||[];
  const byRole={};
  for(const t of active){ byRole[t.user_role||'UNKNOWN']=(byRole[t.user_role||'UNKNOWN']||0)+1; }
  const providerReady = String(set.provider||'DEMO').toUpperCase()==='FCM' && (set.fcm_server_key_present || set.vapid_public_key_present || set.web_push_enabled || set.android_push_enabled);
  const checks=[
    {key:'tokens', title:'Device tokens registered', ok:active.length>0, detail:`Active tokens: ${active.length}`},
    {key:'provider', title:'Push provider selected', ok:String(set.provider||'DEMO').toUpperCase()!=='DEMO', detail:String(set.provider||'DEMO')},
    {key:'firebase', title:'Firebase project configured', ok:!!set.firebase_project_id, detail:set.firebase_project_id||'Pending'},
    {key:'fcm', title:'FCM server credential / VAPID key', ok:providerReady, detail:providerReady?'Ready':'Pending key'},
    {key:'web', title:'Web/PWA push option', ok:!!set.web_push_enabled || String(set.provider||'DEMO').toUpperCase()==='DEMO', detail:set.web_push_enabled?'Enabled':'Demo/in-app only'},
    {key:'events', title:'Ride/SOS/payment event routing', ok:!!(set.notify_ride_request && set.notify_payment && set.notify_sos), detail:'Critical alerts enabled'},
    {key:'logs', title:'Delivery log enabled', ok:!!set.demo_delivery_log_enabled, detail:`Logs: ${logs.length}`}
  ];
  return {settings:set, summary:{active_tokens:active.length,total_tokens:tokens.length,passenger_tokens:byRole.PASSENGER||0,driver_tokens:byRole.DRIVER||0,admin_tokens:byRole.ADMIN||0,delivery_logs:logs.length,queued:logs.filter(x=>x.status==='QUEUED').length,demo_logged:logs.filter(x=>x.status==='DEMO_LOGGED').length,failed:logs.filter(x=>x.status==='FAILED').length,provider_ready:providerReady,production_ready:checks.every(c=>c.ok)}, checks, tokens:tokens.slice(-250).reverse(), recent_notifications:(db.notifications||[]).slice(-80).reverse(), delivery_logs:logs.slice(-120).reverse(), updated_at:now()};
}


function defaultMonitoringSettings(){
  return {
    enabled:true,
    slow_api_ms:1500,
    error_log_enabled:true,
    max_error_logs:300,
    max_audit_logs:1000,
    db_size_warn_mb:20,
    upload_size_warn_mb:200,
    backup_min_count:1,
    production_monitoring_ready:!!process.env.MONITORING_WEBHOOK_URL,
    monitoring_webhook_present:!!process.env.MONITORING_WEBHOOK_URL,
    note:'Prototype mode-এ local monitoring চলছে। Production-এ uptime monitor, error alert webhook এবং log rotation configure করুন।',
    updated_at:now()
  };
}
function monitoringSettings(db){
  db.monitoring_settings = {...defaultMonitoringSettings(), ...(db.monitoring_settings || {})};
  return db.monitoring_settings;
}
function folderSizeBytes(dir){
  try{
    if(!fs.existsSync(dir)) return 0;
    let total=0;
    const stack=[dir];
    while(stack.length){
      const current=stack.pop();
      for(const name of fs.readdirSync(current)){
        const p=path.join(current,name);
        const st=fs.statSync(p);
        if(st.isDirectory()) stack.push(p); else total += st.size;
      }
    }
    return total;
  }catch(e){ return 0; }
}
function mb(bytes){ return Math.round((Number(bytes||0)/1024/1024)*100)/100; }
function logError(db, source, err, extra={}){
  try{
    const set = monitoringSettings(db);
    if(!set.error_log_enabled) return;
    db.error_logs = db.error_logs || [];
    db.error_logs.push({id:uid('err'), at:now(), source:String(source||'server').slice(0,80), message:String(err && (err.message||err) || 'Error').slice(0,500), stack:String(err && err.stack || '').split('\n').slice(0,5).join('\n').slice(0,1200), extra});
    const max=Math.max(50, Math.min(2000, Number(set.max_error_logs||300)));
    if(db.error_logs.length>max) db.error_logs=db.error_logs.slice(-max);
  }catch(e){}
}
function monitoringStatus(db){
  const set=monitoringSettings(db);
  db.error_logs = db.error_logs || [];
  const dbBytes=fileSize(DB_FILE);
  const uploadBytes=folderSizeBytes(UPLOAD_DIR);
  const backups=listBackups();
  const sessions=db.sessions||[];
  const activeSessions=sessions.filter(x=>new Date(x.expires_at)>new Date());
  const rides=db.rides||[];
  const drivers=db.driver_profiles||[];
  const nowMs=Date.now();
  const last24 = (arr, field='created_at') => (arr||[]).filter(x=> nowMs - new Date(x[field]||x.at||0).getTime() <= 24*60*60*1000);
  const payments=db.payment_orders||[];
  const support=(db.support_tickets||[]).filter(x=>!['RESOLVED','CLOSED'].includes(String(x.status||'').toUpperCase()));
  const refunds=(db.refund_requests||[]).filter(x=>!['PAID','REJECTED','CLOSED'].includes(String(x.status||'').toUpperCase()));
  const kycPending=drivers.filter(d=>String(d.kyc_status||'').toUpperCase()!=='VERIFIED' || !['APPROVED'].includes(String(d.status||'').toUpperCase()));
  const integ=integrationReadiness(db);
  const dbWarn = mb(dbBytes) >= Number(set.db_size_warn_mb||20);
  const uploadWarn = mb(uploadBytes) >= Number(set.upload_size_warn_mb||200);
  const checks=[
    {key:'server', title:'Server running', ok:true, detail:`Uptime ${Math.floor(process.uptime()/60)} min`},
    {key:'database', title:'Local database readable', ok:fs.existsSync(DB_FILE), detail:`${mb(dbBytes)} MB`},
    {key:'backup', title:'Backup available', ok:backups.length >= Number(set.backup_min_count||1), detail:`Backups: ${backups.length}`},
    {key:'storage', title:'Upload storage size safe', ok:!uploadWarn, detail:`Uploads ${mb(uploadBytes)} MB`},
    {key:'dbsize', title:'Database size safe', ok:!dbWarn, detail:`Warn at ${set.db_size_warn_mb} MB`},
    {key:'errors', title:'No critical error log', ok:(db.error_logs||[]).filter(e=>String(e.level||'ERROR')==='CRITICAL').length===0, detail:`Errors: ${(db.error_logs||[]).length}`},
    {key:'integrations', title:'Production integrations progress', ok:integ.ready_count>=3, detail:`${integ.ready_count}/${integ.total} ready`},
    {key:'sessions', title:'Session system active', ok:true, detail:`Active sessions: ${activeSessions.length}`}
  ];
  const endpoints=[
    {name:'Health', path:'/api/health', status:'READY'},
    {name:'Admin Summary', path:'/api/admin/summary', status:'AUTH_REQUIRED'},
    {name:'Operations', path:'/api/admin/operations', status:'AUTH_REQUIRED'},
    {name:'Push', path:'/api/admin/push-status', status:'AUTH_REQUIRED'},
    {name:'Database', path:'/api/admin/database-migration', status:'AUTH_REQUIRED'},
    {name:'Monitoring', path:'/api/admin/monitoring-status', status:'AUTH_REQUIRED'},
    {name:'Security', path:'/api/admin/security-status', status:'AUTH_REQUIRED'}
  ];
  const issues=[];
  if(support.length) issues.push({type:'SUPPORT', title:'Open support tickets', count:support.length, action:'Support tab থেকে resolve করুন'});
  if(refunds.length) issues.push({type:'REFUND', title:'Pending refund requests', count:refunds.length, action:'Support/Refund Center check করুন'});
  if(kycPending.length) issues.push({type:'KYC', title:'Pending/unverified driver KYC', count:kycPending.length, action:'KYC tab থেকে approve/reject করুন'});
  if(db.error_logs.length) issues.push({type:'ERROR', title:'Server error logs present', count:db.error_logs.length, action:'Monitor tab error log দেখুন'});
  if(backups.length < Number(set.backup_min_count||1)) issues.push({type:'BACKUP', title:'No backup found', count:1, action:'Database tab থেকে backup নিন'});
  return {
    settings:set,
    summary:{
      version:VERSION,
      uptime_seconds:Math.round(process.uptime()),
      uptime_minutes:Math.round(process.uptime()/60),
      memory_mb:mb(process.memoryUsage().rss),
      db_size_mb:mb(dbBytes),
      upload_size_mb:mb(uploadBytes),
      backup_count:backups.length,
      users:(db.users||[]).length,
      drivers:drivers.length,
      rides:rides.length,
      rides_last_24h:last24(rides).length,
      completed_rides:rides.filter(r=>r.status==='COMPLETED').length,
      pending_payments:payments.filter(p=>p.status!=='PAID').length,
      active_sessions:activeSessions.length,
      notifications:(db.notifications||[]).length,
      errors:(db.error_logs||[]).length,
      audit_logs:(db.audit||[]).length,
      production_ready:checks.every(c=>c.ok)
    },
    checks,
    endpoints,
    issues,
    recent_errors:(db.error_logs||[]).slice(-80).reverse(),
    recent_audit:(db.audit||[]).slice(-80).reverse(),
    recent_backups:backups.slice(0,10),
    updated_at:now()
  };
}

function defaultStorageSettings(){
  return {
    provider:'LOCAL_FILE',
    upload_dir:'data/uploads',
    max_upload_mb:10,
    allowed_mime:['image/jpeg','image/png','image/webp','application/pdf'],
    secure_file_serving:true,
    require_admin_review_for_kyc:true,
    auto_link_kyc_files:true,
    production_note:'Production launch-এর আগে S3/R2/GCS object storage + signed URL + encryption configure করা উচিত.',
    updated_at:now()
  };
}

function defaultDatabaseMigrationSettings(){
  return {
    current_engine:'LOCAL_JSON',
    target_engine:'POSTGRESQL',
    migration_mode:'PLANNING',
    database_url_present: !!process.env.DATABASE_URL,
    backup_before_migration:true,
    allow_json_export:true,
    dry_run_required:true,
    last_snapshot_at:null,
    last_dry_run_at:null,
    last_migration_at:null,
    production_note:'Public launch-এর আগে local JSON থেকে PostgreSQL-এ migrate করুন। Migration করার আগে full backup/export রাখবেন.',
    updated_at:now()
  };
}
function databaseCollectionsOverview(db){
  const collections = ['users','sessions','driver_profiles','rides','payment_orders','support_tickets','refund_requests','sub_admins','sub_admin_commissions','settlements','legal_acceptance_records','file_uploads','audit','notifications','push_tokens','push_delivery_logs','otp_requests','live_locations','qa_issues','field_test_runs'];
  return collections.map(name=>{
    const arr = Array.isArray(db[name]) ? db[name] : [];
    const sample = arr.find(x=>x && typeof x==='object') || {};
    return {collection:name, rows:arr.length, sample_fields:Object.keys(sample).slice(0,18), ready_for_sql:Array.isArray(arr)};
  }).sort((a,b)=>b.rows-a.rows || a.collection.localeCompare(b.collection));
}
function databaseMigrationStatus(db){
  db.database_migration_settings = {...defaultDatabaseMigrationSettings(), ...(db.database_migration_settings||{})};
  db.database_migration_logs = db.database_migration_logs || [];
  const settings = db.database_migration_settings;
  const prod = mergeIntegrations(db.integrations).production || {};
  const databaseUrlPresent = !!(settings.database_url_present || prod.database_url_present || process.env.DATABASE_URL);
  const backups = listBackups();
  const collections = databaseCollectionsOverview(db);
  const nonEmpty = collections.filter(c=>c.rows>0).length;
  const checks = [
    {key:'local_json', title:'Local JSON database readable', ok:true, detail:`${Math.round(fileSize(DB_FILE)/1024)} KB`},
    {key:'backup', title:'At least one backup available', ok:backups.length>0, detail:`Backups: ${backups.length}`},
    {key:'export', title:'Full JSON export available', ok:true, detail:'/api/admin/data/export ready'},
    {key:'schema', title:'PostgreSQL schema note included', ok:fs.existsSync(path.join(__dirname,'docs','POSTGRESQL_PRODUCTION_SCHEMA_NOTE.sql')), detail:'docs/POSTGRESQL_PRODUCTION_SCHEMA_NOTE.sql'},
    {key:'collections', title:'Collections scanned', ok:collections.length>=10, detail:`${collections.length} collections, ${nonEmpty} non-empty`},
    {key:'database_url', title:'DATABASE_URL configured', ok:databaseUrlPresent, detail:databaseUrlPresent?'Configured':'Pending production PostgreSQL URL'},
    {key:'dry_run', title:'Migration dry-run recorded', ok:!!settings.last_dry_run_at, detail:settings.last_dry_run_at || 'Run dry-run/snapshot first'},
    {key:'production_cutover', title:'Production cutover completed', ok:!!settings.last_migration_at, detail:settings.last_migration_at || 'Pending'}
  ];
  const steps = [
    'Admin Data Center থেকে fresh backup/export নিন',
    'Production PostgreSQL database তৈরি করুন',
    'DATABASE_URL environment variable set করুন',
    'docs/POSTGRESQL_PRODUCTION_SCHEMA_NOTE.sql অনুযায়ী tables/schema তৈরি করুন',
    'JSON export থেকে users/drivers/rides/payments/kyc/support data migrate dry-run করুন',
    'Dry-run count match করলে production cutover window fix করুন',
    'Old local JSON read-only রাখুন এবং new server PostgreSQL mode-এ start করুন',
    'Passenger/Driver/Admin/Sub Admin login ও booking smoke-test করুন',
    'Backup retention + daily DB dump configure করুন'
  ];
  return {
    version:VERSION,
    settings:{...settings, database_url_present:databaseUrlPresent},
    summary:{ready:checks.filter(x=>x.ok).length,total:checks.length,production_db_ready:databaseUrlPresent && !!settings.last_dry_run_at, collections:collections.length, total_rows:collections.reduce((a,c)=>a+c.rows,0), backup_count:backups.length, db_size_bytes:fileSize(DB_FILE)},
    checks,
    collections,
    recent_logs:(db.database_migration_logs||[]).slice(-50).reverse(),
    backups:backups.slice(0,10),
    steps,
    commands:[
      'export DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/nexoride"',
      'node server.js',
      'curl https://YOUR-DOMAIN/api/health',
      'psql "$DATABASE_URL" -f docs/POSTGRESQL_PRODUCTION_SCHEMA_NOTE.sql'
    ],
    production_note:'এই version-এ PostgreSQL migration planning, dry-run record, backup/export readiness control আছে। Real migration script deployment environment অনুযায়ী final করতে হবে।'
  };
}
function markDatabaseMigrationLog(db, user, action, details={}){
  db.database_migration_logs = db.database_migration_logs || [];
  const rec = {id:uid('dbmig'), action, at:now(), user_id:user?.id||'system', details};
  db.database_migration_logs.push(rec);
  if(db.database_migration_logs.length>300) db.database_migration_logs = db.database_migration_logs.slice(-300);
  return rec;
}


function defaultDb(){
  return {
    meta:{version:VERSION, created_at:now(), updated_at:now()},
    app_settings: appSettings(),
    users:[createAdminUser()],
    sessions:[],
    driver_profiles:[],
    kyc_submissions:[],
    rides:[],
    fare_rules:{
      full_base_fare: 40,
      sharing_base_per_seat: 10,
      minimum_full: 40,
      minimum_sharing: 10,
      base_km: 4,
      extra_step_km: 2,
      extra_step_fare: 5,
      sharing_capacity: 4,
      night_extra_percent: 0,
      platform_commission_percent: 10,
      sub_admin_share_percent: 30,
      currency: 'INR'
    },
    service_area:{
      name:'Kalna Sub-Division',
      geofence_enabled:true,
      driver_auto_approve_inside_service_area:true,
      bounds:{minLat:23.10,maxLat:23.29,minLng:88.25,maxLng:88.43},
      center:{lat:23.2199,lng:88.3625},
      road_distance_multiplier:1.25,
      points:[
        'Kalna Station','Kalna Hospital','Kalna Court','Kalna Bus Stand','Dhatrigram',
        'Baidyapur','Madhupur','Baghnapara','Ambika Kalna','Guptipara Road',
        'Muktarpur','Nandai','Sultanpur','Badla','Akalpoush','Kalna College','Aghoreswar Park','Ganga Ghat','Sub-Division Office','Rail Gate'
      ]
    },
    area_catalog:[
      {id:'area_kalna_town', name:'Kalna Town', status:'ACTIVE', sub_admin_user_id:null, created_at:now()},
      {id:'area_dhatrigram', name:'Dhatrigram', status:'ACTIVE', sub_admin_user_id:null, created_at:now()},
      {id:'area_baidyapur', name:'Baidyapur', status:'ACTIVE', sub_admin_user_id:null, created_at:now()},
      {id:'area_baghnapara', name:'Baghnapara', status:'ACTIVE', sub_admin_user_id:null, created_at:now()},
      {id:'area_madhupur', name:'Madhupur', status:'ACTIVE', sub_admin_user_id:null, created_at:now()}
    ],
    audit:[],
    safety_events:[],
    settlements:[],
    driver_payout_requests:[],
    sub_admins:[],
    sub_admin_commissions:[],
    sub_admin_commission_settlements:[],
    sub_admin_payout_requests:[],
    live_locations:[],
    otp_requests:[],
    password_reset_requests:[],
    notifications:[],
    push_tokens:[],
    push_delivery_logs:[],
    push_settings: defaultPushSettings(),
    monitoring_settings: defaultMonitoringSettings(),
    security_settings: defaultSecuritySettings(),
    security_events:[],
    error_logs:[],
    kyc_reviews:[],
    support_tickets:[],
    refund_requests:[],
    qa_issues:[],
    field_test_runs:[],
    payment_orders:[],
    payment_webhooks:[],
    legal_documents: defaultLegalDocuments(),
    legal_acceptance_records:[],
    file_uploads:[],
    storage_settings: defaultStorageSettings(),
    database_migration_settings: defaultDatabaseMigrationSettings(),
    database_migration_logs:[],
    auth_settings: defaultAuthSettings(),
    integrations: defaultIntegrations()
  };
}
function readDb(){
  ensureDataDir();
  if(!fs.existsSync(DB_FILE)){
    const db = defaultDb();
    fs.writeFileSync(DB_FILE, JSON.stringify(db,null,2));
    return db;
  }
  try{
    const db = JSON.parse(fs.readFileSync(DB_FILE,'utf8'));
    db.meta = db.meta || {};
    db.users = db.users || [];
    db.sessions = db.sessions || [];
    db.driver_profiles = db.driver_profiles || [];
    db.rides = db.rides || [];
    db.audit = db.audit || [];
    db.safety_events = db.safety_events || [];
    db.settlements = db.settlements || [];
    db.driver_payout_requests = db.driver_payout_requests || [];
    db.sub_admins = db.sub_admins || [];
    db.sub_admin_commissions = db.sub_admin_commissions || [];
    db.sub_admin_commission_settlements = db.sub_admin_commission_settlements || [];
    db.sub_admin_payout_requests = db.sub_admin_payout_requests || [];
    db.live_locations = db.live_locations || [];
    db.otp_requests = db.otp_requests || [];
    db.password_reset_requests = db.password_reset_requests || [];
    db.notifications = db.notifications || [];
    db.push_tokens = db.push_tokens || [];
    db.push_delivery_logs = db.push_delivery_logs || [];
    db.push_settings = {...defaultPushSettings(), ...(db.push_settings || {})};
    db.monitoring_settings = {...defaultMonitoringSettings(), ...(db.monitoring_settings || {})};
    db.security_settings = {...defaultSecuritySettings(), ...(db.security_settings || {})};
    db.security_events = db.security_events || [];
    db.error_logs = db.error_logs || [];
    db.kyc_reviews = db.kyc_reviews || [];
    db.support_tickets = db.support_tickets || [];
    db.refund_requests = db.refund_requests || [];
    db.qa_issues = db.qa_issues || [];
    db.field_test_runs = db.field_test_runs || [];
    db.payment_orders = db.payment_orders || [];
    db.payment_webhooks = db.payment_webhooks || [];
    db.file_uploads = db.file_uploads || [];
    db.storage_settings = {...defaultStorageSettings(), ...(db.storage_settings || {})};
    db.database_migration_settings = {...defaultDatabaseMigrationSettings(), ...(db.database_migration_settings || {})};
    db.database_migration_logs = db.database_migration_logs || [];
    db.auth_settings = {...defaultAuthSettings(), ...(db.auth_settings || {})};
    db.area_catalog = db.area_catalog || defaultDb().area_catalog;
    db.integrations = mergeIntegrations(db.integrations);
    db.app_settings = {...appSettings(), ...(db.app_settings || {})};
    db.fare_rules = db.fare_rules || defaultDb().fare_rules;
    // v1.0.3 fare migration: apply NEXO Ride Kalna Toto fare rule if older demo rules are present.
    if(!db.fare_rules.base_km || db.fare_rules.minimum_full !== 40 || db.fare_rules.minimum_sharing !== 10){
      db.fare_rules = defaultDb().fare_rules;
    }
    db.service_area = {...defaultDb().service_area, driver_matching_radius_km:8, max_driver_candidates:5, ...(db.service_area || {})};
    db.service_area.bounds = db.service_area.bounds || defaultDb().service_area.bounds;
    db.service_area.center = db.service_area.center || defaultDb().service_area.center;
    db.service_area.road_distance_multiplier = Number(db.service_area.road_distance_multiplier || 1.25);
    if(db.service_area.driver_auto_approve_inside_service_area === undefined) db.service_area.driver_auto_approve_inside_service_area = true;
    // v1.0.14 migration: driver earnings/rating fields.
    for(const d of db.driver_profiles){
      if(d.total_earnings === undefined) d.total_earnings = 0;
      if(d.pending_payout === undefined) d.pending_payout = 0;
      if(d.paid_payout === undefined) d.paid_payout = 0;
      if(d.rating === undefined) d.rating = 5;
      if(d.total_rides === undefined) d.total_rides = 0;
      if(d.kyc_status === undefined){
        const k = driverKycSummary(db,d);
        d.kyc_status = k.complete ? (d.status==='APPROVED'?'VERIFIED':'SUBMITTED') : 'INCOMPLETE';
      }
      // Sprint-6E hotfix: Admin profile approval and KYC verification must not drift.
      // Older builds could set status=APPROVED while leaving kyc_status=INCOMPLETE/SUBMITTED,
      // causing the driver app to still show "KYC Required" after admin approval.
      if(String(d.status||'').toUpperCase()==='APPROVED' && !['VERIFIED','REJECTED'].includes(String(d.kyc_status||'').toUpperCase())){
        d.kyc_status = 'VERIFIED';
        d.kyc_admin_synced_at = d.kyc_admin_synced_at || now();
        d.kyc_last_message = d.kyc_last_message || 'Admin approved profile; KYC status synced to VERIFIED.';
      }
    }
    if(db.fare_rules.platform_commission_percent === undefined) db.fare_rules.platform_commission_percent = 10;
    if(db.fare_rules.sub_admin_share_percent === undefined) db.fare_rules.sub_admin_share_percent = 30;
    for(const d of db.driver_profiles){
      if(!d.area) d.area = d.location || 'Kalna';
      if(!d.added_by) d.added_by = null;
      if(!d.sub_admin_user_id && d.added_by_role === 'SUB_ADMIN') d.sub_admin_user_id = d.added_by;
    }
    for(const u of db.users){ if(!u.area && u.role!=='ADMIN') u.area = 'Kalna'; }
    // v1.0.15 migration: settlement status for completed rides.
    for(const r of db.rides){
      if(r.status === 'COMPLETED' && !r.settlement_status) r.settlement_status = 'PENDING';
    }
    const hasAdmin = db.users.some(u => u.role === 'ADMIN' && (u.email === 'bappa.roysm@gmail.com' || u.mobile === '6295192839'));
    if(!hasAdmin){ db.users.push(createAdminUser()); }
    return db;
  }catch(e){
    const backup = DB_FILE + '.broken-' + Date.now();
    fs.copyFileSync(DB_FILE, backup);
    const db = defaultDb();
    fs.writeFileSync(DB_FILE, JSON.stringify(db,null,2));
    return db;
  }
}
function ensureBackupDir(){ ensureDataDir(); if(!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR,{recursive:true}); }
function safeStamp(){ return new Date().toISOString().replace(/[:.]/g,'-'); }
function fileSize(file){ try{return fs.statSync(file).size;}catch(e){return 0;} }
function listBackups(){
  ensureBackupDir();
  return fs.readdirSync(BACKUP_DIR).filter(f=>f.endsWith('.json')).map(f=>{
    const p=path.join(BACKUP_DIR,f); const st=fs.statSync(p);
    return {file:f, path:p, size_bytes:st.size, created_at:st.mtime.toISOString()};
  }).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
}
function pruneBackups(max=30){
  const items=listBackups();
  for(const b of items.slice(max)){ try{fs.unlinkSync(b.path);}catch(e){} }
}
function createBackup(reason='manual'){
  ensureBackupDir();
  if(!fs.existsSync(DB_FILE)) return null;
  const cleanReason = String(reason||'manual').replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,40) || 'manual';
  const file = `nexo_ride_${cleanReason}_${safeStamp()}.json`;
  const target = path.join(BACKUP_DIR,file);
  fs.copyFileSync(DB_FILE,target);
  pruneBackups(30);
  const st=fs.statSync(target);
  return {file, path:target, size_bytes:st.size, created_at:st.mtime.toISOString(), reason:cleanReason};
}
function saveDb(db){
  db.meta = db.meta || {};
  db.meta.updated_at = now();
  db.meta.storage_mode = 'LOCAL_JSON_PERSISTENT';
  db.meta.db_file = DB_FILE;
  ensureDataDir();
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db,null,2));
  fs.renameSync(tmp, DB_FILE);
}
function dbStatus(db){
  const backups=listBackups();
  return {
    storage_mode:'LOCAL_JSON_PERSISTENT',
    production_ready_note:'Prototype uses persistent local JSON. For public launch migrate to PostgreSQL using included schema notes.',
    db_file:DB_FILE,
    backup_dir:BACKUP_DIR,
    db_size_bytes:fileSize(DB_FILE),
    backup_count:backups.length,
    last_backup:backups[0] || null,
    counts:{
      users:(db.users||[]).length,
      drivers:(db.driver_profiles||[]).length,
      rides:(db.rides||[]).length,
      sessions:(db.sessions||[]).length,
      sub_admins:(db.sub_admins||[]).length,
      settlements:(db.settlements||[]).length,
      audit:(db.audit||[]).length,
      safety_events:(db.safety_events||[]).length,
      otp_requests:(db.otp_requests||[]).length,
      support_tickets:(db.support_tickets||[]).length,
      refund_requests:(db.refund_requests||[]).length,
      areas:(db.area_catalog||[]).length,
      file_uploads:(db.file_uploads||[]).length,
      database_migration_logs:(db.database_migration_logs||[]).length,
      security_events:(db.security_events||[]).length
    },
    updated_at:db.meta?.updated_at || null,
    version:VERSION
  };
}
function validateImportedDb(candidate){
  if(!candidate || typeof candidate !== 'object') throw new Error('Invalid database JSON');
  const requiredArrays = ['users','sessions','driver_profiles','rides'];
  for(const k of requiredArrays){ if(!Array.isArray(candidate[k])) throw new Error(`Invalid database: ${k} array missing`); }
  candidate.meta = candidate.meta || {};
  candidate.app_settings = {...appSettings(), ...(candidate.app_settings || {})};
  candidate.fare_rules = candidate.fare_rules || defaultDb().fare_rules;
  candidate.service_area = {...defaultDb().service_area, ...(candidate.service_area || {})};
  candidate.audit = candidate.audit || [];
  candidate.safety_events = candidate.safety_events || [];
  candidate.settlements = candidate.settlements || [];
  candidate.sub_admins = candidate.sub_admins || [];
  candidate.sub_admin_commissions = candidate.sub_admin_commissions || [];
  candidate.sub_admin_commission_settlements = candidate.sub_admin_commission_settlements || [];
  candidate.sub_admin_payout_requests = candidate.sub_admin_payout_requests || [];
  candidate.live_locations = candidate.live_locations || [];
  candidate.otp_requests = candidate.otp_requests || [];
  candidate.support_tickets = candidate.support_tickets || [];
  candidate.refund_requests = candidate.refund_requests || [];
  candidate.payment_orders = candidate.payment_orders || [];
  candidate.payment_webhooks = candidate.payment_webhooks || [];
  candidate.file_uploads = candidate.file_uploads || [];
  candidate.storage_settings = {...defaultStorageSettings(), ...(candidate.storage_settings || {})};
  candidate.database_migration_settings = {...defaultDatabaseMigrationSettings(), ...(candidate.database_migration_settings || {})};
  candidate.database_migration_logs = candidate.database_migration_logs || [];
  candidate.auth_settings = {...defaultAuthSettings(), ...(candidate.auth_settings || {})};
  candidate.monitoring_settings = {...defaultMonitoringSettings(), ...(candidate.monitoring_settings || {})};
  candidate.security_settings = {...defaultSecuritySettings(), ...(candidate.security_settings || {})};
  candidate.security_events = candidate.security_events || [];
  candidate.error_logs = candidate.error_logs || [];
  candidate.integrations = mergeIntegrations(candidate.integrations);
  candidate.meta.imported_at = now();
  candidate.meta.version = VERSION;
  return candidate;
}
function audit(db,user_id,action,target,target_id,details={}){
  db.audit.push({id:uid('aud'), at:now(), user_id, action, target, target_id, details});
}
function getBody(req){
  return new Promise((resolve,reject)=>{
    let data='';
    req.on('data',chunk=>{ data += chunk; if(data.length>1024*1024) req.destroy(); });
    req.on('end',()=>{ try{ resolve(data ? JSON.parse(data) : {}); }catch(e){ reject(e); }});
    req.on('error',reject);
  });
}
function send(res,status,obj,headers={}){
  const body = JSON.stringify(obj);
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});
  res.end(body);
}
function sendText(res,status,text,type='text/plain; charset=utf-8'){
  res.writeHead(status, {'Content-Type':type,'Cache-Control':'no-store'});
  res.end(text);
}
function extType(file){
  const ext = path.extname(file).toLowerCase();
  return {
    '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8',
    '.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8',
    '.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon'
  }[ext] || 'application/octet-stream';
}
function serveDir(res, baseDir, relPath){
  let file = path.join(baseDir, relPath || '');
  if(relPath === '' || relPath.endsWith('/')) file = path.join(baseDir,'index.html');
  const resolved = path.resolve(file);
  if(!resolved.startsWith(path.resolve(baseDir))) return sendText(res,403,'Forbidden');
  if(fs.existsSync(resolved) && fs.statSync(resolved).isFile()){
    const type = extType(resolved);
    const ext = path.extname(resolved).toLowerCase();
    const noCacheExts = ['.html','.js','.css','.webmanifest','.json'];
    const cache = noCacheExts.includes(ext) ? 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0' : 'public, max-age=300';
    res.writeHead(200, {'Content-Type':type,'Cache-Control':cache,'Pragma':'no-cache','Expires':'0'});
    fs.createReadStream(resolved).pipe(res);
    return true;
  }
  return false;
}

function defaultSecuritySettings(){
  return {
    enforce_admin_2fa:false,
    force_password_change_on_default:true,
    min_password_length:8,
    login_rate_limit_enabled:true,
    login_rate_limit_per_minute:8,
    account_lockout_enabled:true,
    max_failed_login_attempts:5,
    lockout_minutes:15,
    admin_session_days:7,
    require_consent_for_admin:true,
    ip_allowlist_enabled:false,
    ip_allowlist:[],
    trusted_device_required:false,
    audit_sensitive_actions:true,
    mask_personal_data_in_logs:true,
    environment_secrets_required:true,
    production_https_required:true,
    last_rotation_at:null,
    note:'Prototype mode-এ security guardrail ready. Production launch-এর আগে default admin password change, HTTPS, secrets, rate limit এবং admin 2FA enable করুন।',
    updated_at:now()
  };
}
function securitySettings(db){
  db.security_settings = {...defaultSecuritySettings(), ...(db.security_settings || {})};
  db.security_events = db.security_events || [];
  return db.security_settings;
}
function isDefaultAdminPasswordLikely(u){
  try{return !!(u && u.email==='bappa.roysm@gmail.com' && verifyPassword('admin@123', u.password_salt, u.password_hash));}catch(e){return false;}
}
function maskMobile(v){ const s=String(v||''); return s.length>4 ? s.slice(0,2)+'****'+s.slice(-2) : s; }
function maskEmail(v){ const s=String(v||''); const parts=s.split('@'); if(parts.length<2) return s; return parts[0].slice(0,2)+'***@'+parts[1]; }
function securityEvent(db, user_id, event_type, details={}){
  db.security_events = db.security_events || [];
  db.security_events.push({id:uid('sec'), at:now(), user_id:user_id||null, event_type:String(event_type||'SECURITY_EVENT'), details});
  if(db.security_events.length>500) db.security_events=db.security_events.slice(-500);
}
function securityStatus(db){
  const set=securitySettings(db);
  const integ=mergeIntegrations(db.integrations||{});
  const users=db.users||[];
  const admins=users.filter(u=>String(u.role||'').toUpperCase()==='ADMIN');
  const activeSessions=(db.sessions||[]).filter(s=>new Date(s.expires_at)>new Date());
  const adminIds=new Set(admins.map(u=>u.id));
  const adminSessions=activeSessions.filter(s=>adminIds.has(s.user_id));
  const defaultPassword=admins.some(isDefaultAdminPasswordLikely);
  const envSecretReady=!!(process.env.JWT_SECRET || process.env.APP_SECRET || process.env.SESSION_SECRET);
  const httpsReady=!!(integ.production && (integ.production.ssl_configured || String(integ.production.server_url||'').startsWith('https://')));
  const dbReady=!!(integ.production && integ.production.database_url_present);
  const checks=[
    {key:'default_password', title:'Default admin password changed', ok:!defaultPassword, detail:defaultPassword?'admin@123 এখনও active হতে পারে':'Default password not detected'},
    {key:'password_policy', title:'Password policy active', ok:!!set.force_password_change_on_default && Number(set.min_password_length||0)>=8, detail:`Minimum ${set.min_password_length} characters`},
    {key:'rate_limit', title:'Login rate limit', ok:!!set.login_rate_limit_enabled, detail:`${set.login_rate_limit_per_minute}/minute`},
    {key:'lockout', title:'Failed login lockout', ok:!!set.account_lockout_enabled, detail:`${set.max_failed_login_attempts} attempts → ${set.lockout_minutes} min`},
    {key:'admin_2fa', title:'Admin 2FA / OTP step', ok:!!set.enforce_admin_2fa, detail:set.enforce_admin_2fa?'Required':'Recommended for production'},
    {key:'admin_session', title:'Admin session lifetime limited', ok:Number(set.admin_session_days||30)<=7, detail:`${set.admin_session_days} days`},
    {key:'audit', title:'Sensitive action audit', ok:!!set.audit_sensitive_actions, detail:`Audit logs: ${(db.audit||[]).length}`},
    {key:'masking', title:'Personal data masking in logs', ok:!!set.mask_personal_data_in_logs, detail:set.mask_personal_data_in_logs?'Enabled':'Disabled'},
    {key:'https', title:'Production HTTPS configured', ok:httpsReady || !set.production_https_required, detail:httpsReady?'HTTPS ready':'Pending public HTTPS URL'},
    {key:'secrets', title:'Environment secrets configured', ok:envSecretReady || !set.environment_secrets_required, detail:envSecretReady?'Secret present':'APP_SECRET/JWT_SECRET pending'},
    {key:'database', title:'Production database secured', ok:dbReady, detail:dbReady?'DATABASE_URL present':'PostgreSQL pending'},
    {key:'ip_allowlist', title:'Admin IP allowlist option', ok:true, detail:set.ip_allowlist_enabled ? `${(set.ip_allowlist||[]).length} IPs` : 'Available but off'}
  ];
  const blockers=checks.filter(c=>!c.ok).map(c=>({key:c.key,title:c.title,detail:c.detail}));
  const score=Math.round((checks.filter(c=>c.ok).length/checks.length)*100);
  return {
    settings:set,
    summary:{score, ready:score>=80 && blockers.length<=2, admins:admins.length, active_sessions:activeSessions.length, admin_sessions:adminSessions.length, default_password_detected:defaultPassword, https_ready:httpsReady, env_secret_ready:envSecretReady, db_ready:dbReady, security_events:(db.security_events||[]).length},
    checks, blockers,
    admins:admins.map(u=>({id:u.id,name:u.name,role:u.role,status:u.status,email:maskEmail(u.email),mobile:maskMobile(u.mobile),must_change_password:!!u.must_change_password,last_login_at:u.last_login_at||null,created_at:u.created_at||null})),
    active_admin_sessions:adminSessions.slice(-50).reverse(),
    recent_security_events:(db.security_events||[]).slice(-80).reverse(),
    updated_at:now()
  };
}

function serveStatic(req,res,pathname){
  // v1.0.17: robust routing so mobile browser opens admin from common URLs.
  let rel = pathname === '/' ? '/home/' : pathname;
  if(rel === '/home/' || rel === '/home'){
    const html = `<!doctype html><html lang="bn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NEXO Ride</title><style>body{font-family:system-ui;background:#070b1f;color:#fff;padding:24px}a{display:block;margin:14px 0;padding:16px;border-radius:14px;background:#101a3d;color:#7df9ff;text-decoration:none;font-weight:800}.muted{color:#b9c7ff}</style></head><body><h2>NEXO Ride Server Running · ${VERSION}</h2><p class="muted">Choose a panel:</p><a href="/app/">Passenger / Driver App</a><a href="/app/admin.html">Main Admin Web App</a><a href="/subadmin/">Area Sub Admin Web App</a><a href="/admin/">Admin Web App</a><a href="/api/health">Health Check</a><a href="/api/live/locations">Live Location API (Admin Login Required)</a></body></html>`;
    sendText(res,200,html,'text/html; charset=utf-8'); return true;
  }
  if(rel === '/app') rel = '/app/';
  if(rel === '/subadmin') rel = '/subadmin/';
  if(rel.startsWith('/subadmin/')) return serveDir(res, SUBADMIN_DIR, rel.replace('/subadmin/',''));
  if(rel === '/admin' || rel === '/admin.html' || rel === '/app/admin' || rel === '/app/admin/' || rel === '/app/admin.html') rel = '/admin/';
  if(rel.startsWith('/app/admin/')) rel = rel.replace('/app/admin/','/admin/');
  if(rel.startsWith('/admin/')) return serveDir(res, ADMIN_DIR, rel.replace('/admin/',''));
  if(rel.startsWith('/app/')) return serveDir(res, PUBLIC_DIR, rel.replace('/app/',''));
  return false;
}
function tokenUser(req,db){
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if(!token) return null;
  const sess = db.sessions.find(s=>s.token===token && new Date(s.expires_at)>new Date());
  if(!sess) return null;
  const user = db.users.find(u=>u.id===sess.user_id && u.status==='ACTIVE');
  return user || null;
}
function requireUser(req,res,db){
  const user = tokenUser(req,db);
  if(!user){ send(res,401,{detail:'Login required'}); return null; }
  return user;
}
function makeSession(db,user){
  const token = crypto.randomBytes(32).toString('hex');
  const sessionDays = Number((db.auth_settings||{}).session_days || SESSION_DAYS);
  const expires = new Date(Date.now()+sessionDays*24*60*60*1000).toISOString();
  db.sessions.push({id:uid('ses'), user_id:user.id, token, created_at:now(), expires_at:expires});
  return {token, expires_at:expires};
}
function findUser(db,login){
  const l = String(login||'').trim().toLowerCase();
  if(!l) return null;
  return db.users.find(u=>String(u.mobile||'').toLowerCase()===l || String(u.email||'').toLowerCase()===l || String(u.nexo_id||'').toLowerCase()===l || String(u.google_id||'').toLowerCase()===l);
}
function serviceAreaBounds(db){
  return (db.service_area && db.service_area.bounds) || {minLat:23.10,maxLat:23.29,minLng:88.25,maxLng:88.43};
}
function isInsideServiceArea(db, coords){
  if(!coords || coords.lat===undefined || coords.lng===undefined) return false;
  const b = serviceAreaBounds(db);
  const lat = Number(coords.lat), lng = Number(coords.lng);
  return lat >= Number(b.minLat) && lat <= Number(b.maxLat) && lng >= Number(b.minLng) && lng <= Number(b.maxLng);
}
function routeMidPoint(a,b){
  return {lat:Math.round(((Number(a.lat)+Number(b.lat))/2)*1000000)/1000000, lng:Math.round(((Number(a.lng)+Number(b.lng))/2)*1000000)/1000000};
}
function estimateFare(db, pickup, drop, ride_type, seats=1){
  const rules = db.fare_rules;
  const p = String(pickup||'').trim();
  const d = String(drop||'').trim();
  const pickup_coords = placeCoords(p);
  const drop_coords = placeCoords(d);
  const straightKm = distanceKm(pickup_coords, drop_coords) || 1.1;
  const multiplier = Number(db.service_area?.road_distance_multiplier || 1.25);
  let km = Math.max(1.1, Math.min(45, straightKm * multiplier));
  km = Math.round(km*10)/10;
  const sharing = String(ride_type||'FULL').toUpperCase() === 'SHARING';
  const baseKm = Number(rules.base_km || 4);
  const stepKm = Number(rules.extra_step_km || 2);
  const extraSteps = Math.max(0, Math.ceil((km - baseKm) / stepKm));
  const extra = extraSteps * Number(rules.extra_step_fare || 5);
  const seatCount = Math.min(Number(rules.sharing_capacity || 4), Math.max(1, Number(seats || 1)));
  const pickupInside = isInsideServiceArea(db, pickup_coords);
  const dropInside = isInsideServiceArea(db, drop_coords);
  const geofence = {
    inside: pickupInside && dropInside,
    pickup_inside: pickupInside,
    drop_inside: dropInside,
    area: db.service_area?.name || 'Kalna Sub-Division',
    message: pickupInside && dropInside ? 'Serviceable inside Kalna Sub-Division' : 'Outside current service area'
  };
  const common = {
    distance_km:km,
    straight_distance_km:straightKm,
    pickup_coords,
    drop_coords,
    route_points:[pickup_coords, routeMidPoint(pickup_coords, drop_coords), drop_coords],
    geofence,
    fare_policy:`First ${baseKm} km base, then every ${stepKm} km ₹${rules.extra_step_fare || 5} extra`,
    fare_breakup:{base_km:baseKm, extra_step_km:stepKm, extra_steps:extraSteps, extra_fare:extra, road_multiplier:multiplier}
  };
  if(sharing){
    const baseFare = Number(rules.sharing_base_per_seat || 10);
    const perSeat = Math.max(Number(rules.minimum_sharing || 10), baseFare + extra);
    return {...common, seats:seatCount, base_fare:baseFare, fare_per_seat:perSeat, estimated_fare:perSeat * seatCount, currency:rules.currency, ride_type:'SHARING', fare_breakup:{...common.fare_breakup, base_fare:baseFare, per_seat_fare:perSeat, total:perSeat * seatCount}};
  }
  const baseFare = Number(rules.full_base_fare || 40);
  const fare = Math.max(Number(rules.minimum_full || 40), baseFare + extra);
  return {...common, seats:0, base_fare:baseFare, fare_per_seat:0, estimated_fare:fare, currency:rules.currency, ride_type:'FULL', fare_breakup:{...common.fare_breakup, base_fare:baseFare, total:fare}};
}
function driverOnlineEligibility(prof){
  if(!prof) return {ok:false, detail:'Driver profile required'};
  const status = String(prof.status || 'PENDING').toUpperCase();
  const kyc = String(prof.kyc_status || 'INCOMPLETE').toUpperCase();
  if(status === 'SUSPENDED') return {ok:false, detail:'Driver profile suspended. Contact admin/support'};
  if(status === 'REJECTED' || kyc === 'REJECTED') return {ok:false, detail:'Driver profile/KYC rejected. Re-submit KYC documents'};
  // Sprint-6E: Admin approval is treated as final driver approval. Older builds could
  // leave kyc_status stale even after admin approved the profile. Do not block such drivers.
  if(status === 'APPROVED') return {ok:true, detail:kyc==='VERIFIED'?'KYC verified':'Admin approved; KYC status synced'};
  if(kyc !== 'VERIFIED') return {ok:false, detail:'KYC verified না হলে Go Online করা যাবে না। Admin approval / KYC verification pending.'};
  return {ok:true};
}

function driverGpsHealth(db, prof){
  const coords = coordsFromRequestOrProfile({}, prof);
  const last = prof?.last_location_at || prof?.last_online_at || '';
  let age_minutes = null;
  if(last){
    const t = new Date(last).getTime();
    if(Number.isFinite(t)) age_minutes = Math.max(0, Math.round((Date.now()-t)/60000));
  }
  const inside = coords ? isInsideServiceArea(db, coords) : false;
  const fresh = age_minutes !== null && age_minutes <= 10;
  return {
    available: !!coords,
    gps_on: !!coords && (!!prof?.online || fresh),
    inside_service_area: inside,
    fresh,
    age_minutes,
    lat: coords?.lat || null,
    lng: coords?.lng || null,
    last_location_at: last || null,
    message: !coords ? 'GPS not updated yet. Press Check GPS / Go Online.' : (inside ? `GPS OK${fresh?'':' (old)'}` : 'GPS outside service area')
  };
}

function coordsFromRequestOrProfile(body={}, prof=null){
  const lat = Number(body.lat ?? body.latitude ?? prof?.lat);
  const lng = Number(body.lng ?? body.longitude ?? prof?.lng);
  if(Number.isFinite(lat) && Number.isFinite(lng)) return {lat:Math.round(lat*1000000)/1000000,lng:Math.round(lng*1000000)/1000000};
  return null;
}

function autoApproveDriverKycIfEligible(db, prof, user=null, body={}){
  if(!prof) return {auto_approved:false, reason:'Driver profile required'};
  const status = String(prof.status || 'PENDING').toUpperCase();
  if(status === 'SUSPENDED') return {auto_approved:false, reason:'Driver suspended'};
  if(status === 'REJECTED' && String(prof.kyc_status||'').toUpperCase() === 'REJECTED') return {auto_approved:false, reason:'Rejected profile requires re-submit'};
  const summary = driverKycSummary(db, prof);
  if(!summary.complete) return {auto_approved:false, reason:`KYC incomplete: ${summary.docs_present}/${summary.docs_required}`, kyc:summary};
  const coords = coordsFromRequestOrProfile(body, prof);
  if(!coords) return {auto_approved:false, reason:'GPS location required for service-area auto approval', kyc:summary};
  const inside = isInsideServiceArea(db, coords);
  if(!inside) return {auto_approved:false, reason:'Driver current GPS is outside service area', coords, kyc:summary};
  if(db.service_area?.driver_auto_approve_inside_service_area === false) return {auto_approved:false, reason:'Auto approval disabled by admin', coords, kyc:summary};
  const oldStatus = prof.status || 'PENDING';
  const oldKyc = prof.kyc_status || 'INCOMPLETE';
  prof.kyc_status = 'VERIFIED';
  prof.status = 'APPROVED';
  prof.kyc_auto_approved = true;
  prof.kyc_auto_approved_at = now();
  prof.kyc_auto_approved_reason = 'KYC complete + GPS inside service area';
  prof.kyc_reviewed_at = prof.kyc_auto_approved_at;
  prof.kyc_reviewed_by = 'AUTO_SERVICE_AREA';
  prof.lat = coords.lat; prof.lng = coords.lng; prof.last_location_at = now();
  db.kyc_reviews = db.kyc_reviews || [];
  db.kyc_reviews.push({id:uid('kycauto'), profile_id:prof.id, driver_user_id:prof.user_id, action:'AUTO_APPROVE', reason:prof.kyc_auto_approved_reason, reviewed_by:'SYSTEM', reviewed_at:prof.kyc_auto_approved_at, coords, service_area:db.service_area?.name||'Kalna Sub-Division', old_status:oldStatus, old_kyc_status:oldKyc});
  if(user){
    notifyUsers(db, notificationTargets(db,{user_id:prof.user_id}), {event_type:'DRIVER_KYC_AUTO_APPROVED', priority:'HIGH', title:'KYC Auto Approved', message:'আপনার KYC complete এবং GPS service area-এর ভিতরে পাওয়া গেছে। এখন Go Online করতে পারবেন।'});
    notifyAdmins(db,{event_type:'DRIVER_KYC_AUTO_APPROVED', priority:'NORMAL', title:'Driver KYC Auto Approved', message:`${user.name||'Driver'} auto approved inside ${db.service_area?.name||'service area'}`, area:prof.area||prof.location||'Kalna', data:{driver_profile_id:prof.id, coords}});
  }
  return {auto_approved:true, coords, service_area:db.service_area?.name||'Kalna Sub-Division'};
}
function activeDrivers(db){
  return (db.driver_profiles||[]).filter(d=>driverOnlineEligibility(d).ok && d.online);
}
function driverHasActiveRide(db, driverUserId){
  const activeStatuses = ['DRIVER_ACCEPTED','CONFIRMED','ARRIVED','STARTED'];
  return (db.rides||[]).some(r=>r.driver_id===driverUserId && activeStatuses.includes(String(r.status||'').toUpperCase()));
}
function nearestAvailableDrivers(db, pickupCoords, options={}){
  const maxRadiusKm = Number(options.max_radius_km || db.service_area?.driver_matching_radius_km || process.env.DRIVER_MATCH_RADIUS_KM || 8);
  const maxDrivers = Number(options.max_drivers || db.service_area?.max_driver_candidates || process.env.MAX_DRIVER_CANDIDATES || 5);
  const pickup = pickupCoords || placeCoords('Kalna Station');
  return activeDrivers(db)
    .filter(d=>!driverHasActiveRide(db, d.user_id))
    .map(d=>{
      const loc = {lat:d.lat||placeCoords(d.location||d.area||'Kalna').lat, lng:d.lng||placeCoords(d.location||d.area||'Kalna').lng};
      return { ...d, distance_to_pickup_km: distanceKm(loc, pickup) ?? 99, lat:loc.lat, lng:loc.lng };
    })
    .filter(d=>Number(d.distance_to_pickup_km) <= maxRadiusKm)
    .sort((a,b)=>(a.distance_to_pickup_km||99)-(b.distance_to_pickup_km||99) || Number(b.rating||0)-Number(a.rating||0))
    .slice(0, maxDrivers);
}

function parseCoordsFromText(text){
  const m = String(text||'').match(/(-?\d{1,2}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)/);
  if(!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if(!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if(lat < 20 || lat > 27 || lng < 84 || lng > 92) return null;
  return {lat:Math.round(lat*1000000)/1000000, lng:Math.round(lng*1000000)/1000000};
}
function placeCoords(name){
  const direct = parseCoordsFromText(name);
  if(direct) return direct;
  const base = {lat:23.2199, lng:88.3625}; // Kalna approx center
  const table = {
    'Kalna Station':{lat:23.2196,lng:88.3622}, 'Kalna Hospital':{lat:23.2247,lng:88.3600},
    'Kalna Court':{lat:23.2221,lng:88.3656}, 'Kalna Bus Stand':{lat:23.2215,lng:88.3615},
    'Dhatrigram':{lat:23.1902,lng:88.4029}, 'Baidyapur':{lat:23.1587,lng:88.3472},
    'Madhupur':{lat:23.2382,lng:88.3439}, 'Baghnapara':{lat:23.1749,lng:88.3862},
    'Ambika Kalna':{lat:23.2181,lng:88.3629}, 'Muktarpur':{lat:23.2262,lng:88.3500},
    'Nandai':{lat:23.2503,lng:88.3718}, 'Sultanpur':{lat:23.2051,lng:88.3319},
    'Badla':{lat:23.1847,lng:88.3118}, 'Akalpoush':{lat:23.1503,lng:88.2956},
    'Kalna College':{lat:23.2142,lng:88.3592}, 'Aghoreswar Park':{lat:23.2189,lng:88.3564},
    'Ganga Ghat':{lat:23.2233,lng:88.3728}, 'Sub-Division Office':{lat:23.2203,lng:88.3649},
    'Rail Gate':{lat:23.2165,lng:88.3611}, 'Guptipara Road':{lat:23.2088,lng:88.3763},
    'Kalna Bus Stand':{lat:23.2215,lng:88.3615}, 'Kalna New Bus Stand':{lat:23.2220,lng:88.3599},
    'Kalna Ferry Ghat':{lat:23.2252,lng:88.3741}, '108 Shiv Mandir':{lat:23.2207,lng:88.3677},
    'Siddheswari More':{lat:23.2182,lng:88.3571}, 'College More':{lat:23.2146,lng:88.3587},
    'Court More':{lat:23.2221,lng:88.3656}, 'Hospital More':{lat:23.2247,lng:88.3600},
    'STKK Road':{lat:23.2188,lng:88.3562}, 'Bagnapara Station':{lat:23.1754,lng:88.3866},
    'Dhatrigram Station':{lat:23.1906,lng:88.4033}, 'Baidyapur Station':{lat:23.1579,lng:88.3467},
    'Nabadwip Ghat':{lat:23.2257,lng:88.3748}, 'Krishnadebpur':{lat:23.1964,lng:88.3708},
    'Nibhuji':{lat:23.2289,lng:88.3625}, 'Nibhujii':{lat:23.2289,lng:88.3625}, 'Nibhuji More':{lat:23.2289,lng:88.3625}, 'নিভুজি':{lat:23.2289,lng:88.3625}
  };
  const key = String(name||'').trim();
  if(table[key]) return table[key];
  const h = sha(key || 'Kalna');
  const a = parseInt(h.slice(0,4),16)/65535 - 0.5;
  const b = parseInt(h.slice(4,8),16)/65535 - 0.5;
  return {lat: Math.round((base.lat + a*0.08)*1000000)/1000000, lng: Math.round((base.lng + b*0.08)*1000000)/1000000};
}
function distanceKm(a,b){
  if(!a||!b||a.lat===undefined||b.lat===undefined) return null;
  const R=6371, toRad=x=>Number(x)*Math.PI/180;
  const dLat=toRad(b.lat-a.lat), dLng=toRad(b.lng-a.lng);
  const q=Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;
  return Math.round((R*2*Math.atan2(Math.sqrt(q),Math.sqrt(1-q)))*10)/10;
}

function mapIntegration(db){ return mergeIntegrations(db.integrations).map || {}; }
function mapOptions(db){
  const m = mapIntegration(db);
  const provider = String(m.provider || 'DEMO').toUpperCase();
  return {
    provider,
    navigation_provider: String(m.navigation_provider || 'GOOGLE_WEB').toUpperCase(),
    external_navigation_enabled: m.external_navigation_enabled !== false,
    api_key_configured: !!(m.api_key_configured || m.mappls_key_present || m.google_key_present),
    mappls_key_present: !!m.mappls_key_present,
    google_key_present: !!m.google_key_present,
    mappls_public_key_enabled: !!m.mappls_public_key_enabled,
    mappls_public_key: mapplsStaticKey() || '',
    mappls_key_label: m.mappls_key_label || '',
    google_key_label: m.google_key_label || '',
    search_enabled: provider !== 'DEMO' && !!(m.api_key_configured || m.mappls_key_present || m.google_key_present),
    route_enabled: provider !== 'DEMO' && !!(m.api_key_configured || m.mappls_key_present || m.google_key_present),
    demo_mode: provider === 'DEMO',
    note: provider === 'DEMO' ? 'Demo coordinates active. External navigation link works using Google Maps web.' : 'Map provider configured for production API integration.'
  };
}
function queryEnc(v){ return encodeURIComponent(String(v||'')); }
function navigationLinks(pickup, drop, pickupCoords, dropCoords){
  const p = pickupCoords || placeCoords(pickup);
  const d = dropCoords || placeCoords(drop);
  const origin = `${p.lat},${p.lng}`;
  const dest = `${d.lat},${d.lng}`;
  return {
    google_web: `https://www.google.com/maps/dir/?api=1&origin=${queryEnc(origin)}&destination=${queryEnc(dest)}&travelmode=driving`,
    google_search: `https://www.google.com/maps/search/?api=1&query=${queryEnc(drop || dest)}`,
    mappls_web: `https://maps.mappls.com/direction?origin=${queryEnc(origin)}&destination=${queryEnc(dest)}`,
    pickup_label: pickup,
    drop_label: drop,
    pickup_coords: p,
    drop_coords: d
  };
}
function routePlan(db, pickup, drop, ride_type='FULL', seats=1){
  const est = estimateFare(db, pickup, drop, ride_type, seats);
  return {
    pickup: String(pickup||''),
    drop: String(drop||''),
    provider: mapOptions(db).provider,
    map_options: mapOptions(db),
    distance_km: est.distance_km,
    straight_distance_km: est.straight_distance_km,
    eta_minutes: Math.max(4, Math.ceil((Number(est.distance_km||1) / 18) * 60)),
    route_points: est.route_points,
    geofence: est.geofence,
    fare: est,
    navigation_links: navigationLinks(pickup, drop, est.pickup_coords, est.drop_coords)
  };
}
function searchablePlaces(db, q=''){
  const needle = String(q||'').trim().toLowerCase();
  const areaPoints = (db.service_area?.points || []);
  const catalog = (db.area_catalog || []).map(a=>a.name).filter(Boolean);
  const extra = [
    'Kalna Station','Kalna Hospital','Kalna Court','Kalna Bus Stand','Kalna New Bus Stand',
    'Dhatrigram','Dhatrigram Station','Baidyapur','Baidyapur Station','Madhupur','Baghnapara','Bagnapara Station',
    'Ambika Kalna','Muktarpur','Nandai','Sultanpur','Badla','Akalpoush','Kalna College','Aghoreswar Park',
    'Ganga Ghat','Kalna Ferry Ghat','Nabadwip Ghat','Sub-Division Office','Rail Gate','Guptipara Road',
    '108 Shiv Mandir','Siddheswari More','College More','Court More','Hospital More','STKK Road','Krishnadebpur','Nibhuji','Nibhujii','Nibhuji More','নিভুজি'
  ];
  const direct = parseCoordsFromText(q);
  const base = Array.from(new Set([...areaPoints, ...catalog, ...extra]));
  const ranked = base.map(name=>{
    const n = String(name||'');
    const l = n.toLowerCase();
    let score = 0;
    if(!needle) score = 1;
    else if(l === needle) score = 100;
    else if(l.startsWith(needle)) score = 70;
    else if(l.includes(needle)) score = 40;
    else score = 0;
    return {name:n, score};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score || a.name.localeCompare(b.name)).slice(0,30)
    .map(x=>({name:x.name, coords:placeCoords(x.name), inside:isInsideServiceArea(db, placeCoords(x.name)), type:'PLACE'}));
  if(direct){
    ranked.unshift({name:`Pinned GPS ${direct.lat.toFixed(5)},${direct.lng.toFixed(5)}`, coords:direct, inside:isInsideServiceArea(db,direct), type:'GPS'});
  }
  if(needle && ranked.length===0){
    const manual = placeCoords(q);
    ranked.push({name:`${String(q).trim()} (manual pin)`, coords:manual, inside:isInsideServiceArea(db,manual), type:'MANUAL'});
  }
  return ranked.slice(0,30);
}
function nearbyPlaces(db, lat, lng, limit=8){
  const origin = {lat:Number(lat), lng:Number(lng)};
  if(!Number.isFinite(origin.lat) || !Number.isFinite(origin.lng)) return [];
  return searchablePlaces(db,'').map(p=>({...p, distance_km: distanceKm(origin,p.coords)}))
    .sort((a,b)=>(a.distance_km||99)-(b.distance_km||99)).slice(0, Math.max(1, Math.min(20, Number(limit)||8)));
}
function upsertLocation(db,user,body={}){
  const lat = Number(body.lat), lng = Number(body.lng);
  const fallback = body.location ? placeCoords(body.location) : null;
  const coords = Number.isFinite(lat) && Number.isFinite(lng) ? {lat:Math.round(lat*1000000)/1000000,lng:Math.round(lng*1000000)/1000000} : fallback;
  if(!coords) return null;
  db.live_locations = db.live_locations || [];
  let item = db.live_locations.find(x=>x.user_id===user.id);
  if(!item){ item={id:uid('loc'), user_id:user.id, created_at:now()}; db.live_locations.push(item); }
  item.lat = coords.lat; item.lng = coords.lng;
  item.accuracy = Number(body.accuracy || item.accuracy || 0);
  item.source = String(body.source || 'APP');
  item.role = user.role;
  item.updated_at = now();
  item.location_name = String(body.location || item.location_name || 'Kalna');
  item.online = body.online !== undefined ? !!body.online : item.online;
  const prof = db.driver_profiles.find(d=>d.user_id===user.id);
  if(prof){ prof.lat=item.lat; prof.lng=item.lng; prof.last_location_at=item.updated_at; prof.location=item.location_name; if(body.online!==undefined) prof.online=!!body.online; }
  return item;
}

function expirePaymentHolds(db){
  let changed = false;
  const t = Date.now();
  for(const r of db.rides || []){
    if(r.status === 'DRIVER_ACCEPTED' && r.payment_due_at && new Date(r.payment_due_at).getTime() < t){
      r.status = 'PAYMENT_TIMEOUT';
      r.payment_status = 'EXPIRED';
      r.expired_at = now();
      changed = true;
    }
  }
  return changed;
}
function settlementSummary(db){
  const completed = (db.rides || []).filter(r=>r.status==='COMPLETED');
  const pendingRides = completed.filter(r=>r.settlement_status!=='PAID');
  const byDriver = {};
  for(const r of pendingRides){
    const driverId = r.driver_id || 'unassigned';
    if(!byDriver[driverId]) byDriver[driverId] = {driver_id:driverId, rides:0, amount:0, fare:0, commission:0, ride_ids:[]};
    byDriver[driverId].rides += 1;
    byDriver[driverId].amount += Number(r.driver_earning || 0);
    byDriver[driverId].fare += Number(r.estimated_fare || 0);
    byDriver[driverId].commission += Number(r.platform_commission || 0);
    byDriver[driverId].ride_ids.push(r.id);
  }
  const drivers = Object.values(byDriver).map(x=>{
    const u = db.users.find(z=>z.id===x.driver_id) || {};
    const p = db.driver_profiles.find(z=>z.user_id===x.driver_id) || {};
    return {
      ...x,
      amount: Math.round(x.amount*100)/100,
      fare: Math.round(x.fare*100)/100,
      commission: Math.round(x.commission*100)/100,
      driver_name: u.name || 'Driver',
      driver_mobile: u.mobile || '',
      vehicle_no: p.vehicle_no || '',
      rating: p.rating || 5,
      pending_payout: Math.round(Number(p.pending_payout || x.amount)*100)/100
    };
  }).sort((a,b)=>b.amount-a.amount);
  const paid = (db.settlements || []).reduce((a,s)=>a+Number(s.amount||0),0);
  return {
    summary:{
      pending_drivers: drivers.length,
      pending_rides: pendingRides.length,
      pending_amount: Math.round(pendingRides.reduce((a,r)=>a+Number(r.driver_earning||0),0)*100)/100,
      paid_amount: Math.round(paid*100)/100,
      settlements: (db.settlements||[]).length
    },
    drivers,
    settlements:(db.settlements||[]).slice(-100).reverse()
  };
}


function isAdminRole(user){ return !!user && ['ADMIN','SUPER_ADMIN','SUB_ADMIN'].includes(user.role); }
function isMainAdmin(user){ return !!user && ['ADMIN','SUPER_ADMIN'].includes(user.role); }
function subAdminProfile(db, userOrId){
  const userId = typeof userOrId === 'string' ? userOrId : userOrId?.id;
  return (db.sub_admins || []).find(x=>x.user_id===userId) || null;
}
function adminScopeArea(db,user){
  if(!user || isMainAdmin(user)) return null;
  const p = subAdminProfile(db,user);
  return p?.area || user.area || null;
}

function driverKycSummary(db, prof){
  db.file_uploads = db.file_uploads || [];
  db.kyc_submissions = db.kyc_submissions || [];
  const u = db.users.find(x=>x.id===prof.user_id) || {};
  const fileMeta = (val)=>{
    const m = String(val||'').match(/^\/api\/files\/([^/?#]+)/);
    if(!m) return null;
    return db.file_uploads.find(f=>f.id===m[1] && f.status!=='DELETED') || null;
  };
  const required = [
    ['driver_photo','Driver photo','file'],
    ['vehicle_photo','Vehicle photo','file'],
    ['aadhaar_no','Aadhaar number','text'],
    ['aadhaar_doc','Aadhaar document/photo','file'],
    ['license_no','Driving licence number','text'],
    ['license_doc','Driving licence/photo','file'],
    ['vehicle_no','Toto number','text']
  ];
  const docs = required.map(([key,label,type])=>{
    const value = String(prof[key]||'').trim();
    const meta = fileMeta(value);
    return {key,label,type,present:!!value,value:type==='text'?value:undefined,url:type==='file'?value:'',file_id:meta?.id||'',mime_type:meta?.mime_type||'',size_bytes:meta?.size_bytes||0,created_at:meta?.created_at||''};
  });
  const present = docs.filter(x=>x.present).length;
  const complete = present === docs.length;
  let kyc_status = prof.kyc_status || (complete ? 'SUBMITTED' : 'INCOMPLETE');
  if(prof.status === 'APPROVED' && !prof.kyc_status) kyc_status = complete ? 'VERIFIED' : 'INCOMPLETE';
  const lastSubmission = db.kyc_submissions.filter(x=>x.profile_id===prof.id || x.driver_user_id===prof.user_id).slice(-1)[0] || null;
  const missing = docs.filter(x=>!x.present).map(x=>x.label);
  const uploaded_files = ['driver_photo','vehicle_photo','aadhaar_doc','license_doc'].map(k=>fileMeta(prof[k])).filter(Boolean);
  const review_status = prof.kyc_status==='VERIFIED' ? 'VERIFIED' : prof.kyc_status==='REJECTED' ? 'REJECTED' : (prof.kyc_submitted_at ? (complete ? 'UNDER_ADMIN_REVIEW' : 'SUBMITTED_BUT_INCOMPLETE') : 'NOT_SUBMITTED');
  return {
    profile_id: prof.id, user_id: prof.user_id,
    name: u.name || 'Driver', mobile: u.mobile || '', email: u.email || '',
    area: prof.area || prof.location || 'Kalna', vehicle_no: prof.vehicle_no || '',
    profile_status: prof.status || 'PENDING', kyc_status, review_status,
    review_label: review_status==='UNDER_ADMIN_REVIEW' ? 'Submitted - waiting for admin review' : review_status==='SUBMITTED_BUT_INCOMPLETE' ? 'Submitted but some documents are missing' : review_status==='VERIFIED' ? 'Verified by Admin' : review_status==='REJECTED' ? 'Rejected by Admin' : 'Not submitted yet',
    docs_present: present, docs_required: docs.length, complete, missing,
    docs, uploaded_files,
    driver_photo: prof.driver_photo || '', vehicle_photo: prof.vehicle_photo || '',
    aadhaar_doc: prof.aadhaar_doc || '', license_doc: prof.license_doc || '',
    aadhaar_no: prof.aadhaar_no || '', license_no: prof.license_no || '',
    kyc_submitted_at: prof.kyc_submitted_at || null,
    kyc_reviewed_at: prof.kyc_reviewed_at || null,
    kyc_reviewed_by: prof.kyc_reviewed_by || null,
    kyc_rejection_reason: prof.kyc_rejection_reason || '',
    last_submission: lastSubmission,
    last_submission_message: prof.kyc_last_message || (lastSubmission?.message || '')
  };
}
function ensureUploadDir(){ ensureDataDir(); if(!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR,{recursive:true}); }
function extensionFromMime(mime){
  const m=String(mime||'').toLowerCase();
  if(m.includes('png')) return 'png';
  if(m.includes('webp')) return 'webp';
  if(m.includes('pdf')) return 'pdf';
  if(m.includes('jpeg') || m.includes('jpg')) return 'jpg';
  return 'bin';
}
function parseDataUrl(v){
  const s = String(v || '').trim();
  const m = s.match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
  if(!m) return null;
  const mime = m[1] || 'application/octet-stream';
  const isBase64 = !!m[2];
  const raw = m[3] || '';
  const buffer = isBase64 ? Buffer.from(raw, 'base64') : Buffer.from(decodeURIComponent(raw), 'utf8');
  return {mime, buffer};
}
function storeUploadFile(db, user, docType, value, refId=''){
  const parsed = parseDataUrl(value);
  if(!parsed) return String(value || '').trim();
  db.storage_settings = {...defaultStorageSettings(), ...(db.storage_settings||{})};
  const maxBytes = Math.max(Number(db.storage_settings.max_upload_mb || 10), 10) * 1024 * 1024;
  if(parsed.buffer.length > maxBytes) throw new Error(`File too large. Max ${Math.max(Number(db.storage_settings.max_upload_mb || 10),10)} MB allowed`);
  const allowed = db.storage_settings.allowed_mime || defaultStorageSettings().allowed_mime;
  if(Array.isArray(allowed) && allowed.length && !allowed.includes(parsed.mime)) throw new Error(`File type not allowed: ${parsed.mime}`);
  ensureUploadDir();
  const id = uid('file');
  const ext = extensionFromMime(parsed.mime);
  const monthDir = path.join(UPLOAD_DIR, new Date().toISOString().slice(0,7));
  if(!fs.existsSync(monthDir)) fs.mkdirSync(monthDir,{recursive:true});
  const filename = `${id}.${ext}`;
  const filePath = path.join(monthDir, filename);
  fs.writeFileSync(filePath, parsed.buffer);
  const rec = {
    id, doc_type:String(docType||'document'), filename,
    original_name:String(docType||'document')+'.'+ext,
    mime_type:parsed.mime,
    size_bytes:parsed.buffer.length,
    sha256:crypto.createHash('sha256').update(parsed.buffer).digest('hex'),
    path:filePath,
    url:'/api/files/'+id,
    owner_user_id:user?.id||'',
    owner_role:user?.role||'',
    ref_id:String(refId||''),
    status:'ACTIVE',
    created_at:now()
  };
  db.file_uploads = db.file_uploads || [];
  db.file_uploads.push(rec);
  return rec.url;
}
function normalizeDocInput(v, db=null, user=null, docType='document', refId=''){
  const s = String(v || '').trim();
  if(!s) return '';
  if(s.startsWith('data:') && db) return storeUploadFile(db,user,docType,s,refId);
  return s.length > 750000 ? s.slice(0,750000) : s;
}
function storageStatus(db){
  db.file_uploads = db.file_uploads || [];
  db.storage_settings = {...defaultStorageSettings(), ...(db.storage_settings||{})};
  const active = db.file_uploads.filter(f=>f.status!=='DELETED');
  const totalSize = active.reduce((a,f)=>a+Number(f.size_bytes||0),0);
  const byType = {};
  for(const f of active){
    const k=f.doc_type||'document';
    byType[k]=byType[k]||{doc_type:k,count:0,size_bytes:0};
    byType[k].count++; byType[k].size_bytes += Number(f.size_bytes||0);
  }
  const checks = [
    {title:'Local upload folder ready', ok:true, detail:UPLOAD_DIR},
    {title:'KYC files saved outside JSON DB', ok:true, detail:'Data URL upload হলে file storage-এ convert হবে'},
    {title:'Max upload size configured', ok:Number(db.storage_settings.max_upload_mb||0)>0, detail:`${db.storage_settings.max_upload_mb} MB`},
    {title:'Allowed MIME configured', ok:Array.isArray(db.storage_settings.allowed_mime)&&db.storage_settings.allowed_mime.length>0, detail:(db.storage_settings.allowed_mime||[]).join(', ')},
    {title:'Production object storage', ok:!!mergeIntegrations(db.integrations).storage.production_object_storage_present, detail:'S3/R2/GCS not configured in prototype'}
  ];
  return {
    settings:db.storage_settings,
    upload_dir:UPLOAD_DIR,
    summary:{total_files:active.length, total_size_bytes:totalSize, total_size_mb:Math.round(totalSize/1024/1024*100)/100, deleted:(db.file_uploads||[]).filter(f=>f.status==='DELETED').length, provider:db.storage_settings.provider||'LOCAL_FILE'},
    by_type:Object.values(byType).map(x=>({...x,size_mb:Math.round(x.size_bytes/1024/1024*100)/100})).sort((a,b)=>b.count-a.count),
    recent:active.slice(-100).reverse(),
    checks,
    production_note:'Real launch-এর আগে Aadhaar/licence/photo storage secure object storage-এ রাখবেন; public URL নয়, signed URL + audit দরকার।'
  };
}
function serveUploadedFile(res, db, fileId){
  const rec = (db.file_uploads||[]).find(f=>f.id===fileId && f.status!=='DELETED');
  if(!rec) return send(res,404,{detail:'File not found'});
  const filePath = path.resolve(rec.path||'');
  if(!filePath || !fs.existsSync(filePath)) return send(res,404,{detail:'Stored file missing'});
  res.writeHead(200, {'Content-Type':rec.mime_type||'application/octet-stream','Cache-Control':'private, max-age=3600','X-File-Id':rec.id});
  fs.createReadStream(filePath).pipe(res);
}

function driverManagedBySubAdmin(db, driverUserId, subAdminUserId){
  const d = (db.driver_profiles||[]).find(x=>x.user_id===driverUserId);
  return !!d && (d.sub_admin_user_id===subAdminUserId || d.added_by===subAdminUserId || (d.area && d.area === adminScopeArea(db,{id:subAdminUserId, role:'SUB_ADMIN'})));
}
function filterDriversForAdmin(db,user,drivers){
  if(isMainAdmin(user)) return drivers;
  const area = adminScopeArea(db,user);
  return drivers.filter(d => d.sub_admin_user_id===user.id || d.added_by===user.id || (area && d.area===area));
}
function filterUsersForAdmin(db,user,users){
  if(isMainAdmin(user)) return users;
  const area = adminScopeArea(db,user);
  return users.filter(u => u.managed_by_subadmin_id===user.id || u.added_by===user.id || (area && u.area===area));
}
function filterRidesForAdmin(db,user,rides){
  if(isMainAdmin(user)) return rides;
  const area = adminScopeArea(db,user);
  return rides.filter(r=>{
    const driver = (db.driver_profiles||[]).find(d=>d.user_id===r.driver_id) || {};
    const passenger = (db.users||[]).find(u=>u.id===r.passenger_id) || {};
    return driver.sub_admin_user_id===user.id || driver.added_by===user.id || passenger.managed_by_subadmin_id===user.id || passenger.added_by===user.id || (area && (driver.area===area || passenger.area===area));
  });
}
function allocateSubAdminCommission(db, ride, driverProfile){
  if(!ride || !driverProfile) return null;
  const subAdminUserId = driverProfile.sub_admin_user_id || driverProfile.added_by || null;
  if(!subAdminUserId) return null;
  const subProfile = subAdminProfile(db, subAdminUserId);
  const sharePercent = Number(subProfile?.commission_share_percent ?? db.fare_rules.sub_admin_share_percent ?? 30);
  const platformCommission = Number(ride.platform_commission || 0);
  const amount = Math.round(platformCommission * sharePercent) / 100;
  if(amount <= 0) return null;
  ride.sub_admin_user_id = subAdminUserId;
  ride.sub_admin_commission_percent = sharePercent;
  ride.sub_admin_commission = amount;
  ride.platform_net_commission = Math.max(0, Math.round((platformCommission - amount) * 100) / 100);
  db.sub_admin_commissions = db.sub_admin_commissions || [];
  if(!db.sub_admin_commissions.find(x=>x.ride_id===ride.id)){
    db.sub_admin_commissions.push({id:uid('sac'), ride_id:ride.id, sub_admin_user_id:subAdminUserId, driver_id:ride.driver_id, amount, share_percent:sharePercent, platform_commission:platformCommission, status:'PENDING', created_at:now(), area:driverProfile.area || subProfile?.area || 'Kalna'});
  }
  if(subProfile){
    subProfile.total_commission = Math.round((Number(subProfile.total_commission||0)+amount)*100)/100;
    subProfile.pending_commission = Math.round((Number(subProfile.pending_commission||0)+amount)*100)/100;
    subProfile.last_commission_at = now();
  }
  return amount;
}
function subAdminCommissionSummary(db,user){
  const all = (db.sub_admin_commissions||[]).filter(x=>isMainAdmin(user) || x.sub_admin_user_id===user.id);
  const pending = all.filter(x=>x.status!=='PAID');
  const paid = all.filter(x=>x.status==='PAID');
  const bySub = {};
  for(const x of pending){
    const sid = x.sub_admin_user_id;
    if(!bySub[sid]) bySub[sid] = {sub_admin_user_id:sid, amount:0, count:0, commission_ids:[], area:x.area||'Kalna'};
    bySub[sid].amount += Number(x.amount||0); bySub[sid].count += 1; bySub[sid].commission_ids.push(x.id);
  }
  const rows = Object.values(bySub).map(x=>{
    const u = db.users.find(z=>z.id===x.sub_admin_user_id) || {};
    const p = subAdminProfile(db, x.sub_admin_user_id) || {};
    return {...x, amount:Math.round(x.amount*100)/100, name:u.name||'Sub Admin', mobile:u.mobile||'', email:u.email||'', area:p.area||x.area||'', share_percent:p.commission_share_percent ?? db.fare_rules.sub_admin_share_percent};
  });
  const scopedRequests = (db.sub_admin_payout_requests||[]).filter(x=>isMainAdmin(user) || x.sub_admin_user_id===user.id);
  const requested = scopedRequests.filter(x=>x.status==='REQUESTED');
  return {summary:{pending_amount:Math.round(pending.reduce((a,x)=>a+Number(x.amount||0),0)*100)/100, paid_amount:Math.round(paid.reduce((a,x)=>a+Number(x.amount||0),0)*100)/100, pending_count:pending.length, paid_count:paid.length, sub_admins:(db.sub_admins||[]).length, payout_requests:requested.length, requested_amount:Math.round(requested.reduce((a,x)=>a+Number(x.amount||0),0)*100)/100}, rows, commissions:all.slice(-200).reverse(), settlements:(db.sub_admin_commission_settlements||[]).slice(-100).reverse(), payout_requests:scopedRequests.slice(-100).reverse()};
}
function subAdminPayoutRequestList(db,user){
  const list = (db.sub_admin_payout_requests||[]).filter(x=>isMainAdmin(user) || x.sub_admin_user_id===user.id).map(x=>{
    const u = db.users.find(z=>z.id===x.sub_admin_user_id) || {};
    const p = subAdminProfile(db, x.sub_admin_user_id) || {};
    return {...x, name:u.name||'Sub Admin', mobile:u.mobile||'', email:u.email||'', area:p.area||x.area||'Kalna'};
  });
  return list.slice(-100).reverse();
}


function addNotification(db, payload={}){
  db.notifications = db.notifications || [];
  const item = {
    id:uid('ntf'),
    user_id:payload.user_id || null,
    role:payload.role || null,
    area:payload.area || null,
    title:String(payload.title || 'NEXO Ride'),
    message:String(payload.message || ''),
    event_type:String(payload.event_type || 'INFO'),
    priority:String(payload.priority || 'NORMAL'),
    ride_id:payload.ride_id || null,
    data:payload.data || {},
    read_by:[],
    created_at:now()
  };
  db.notifications.push(item);
  try{ queuePushDeliveries(db,item); }catch(e){}
  if(db.notifications.length>500){ db.notifications = db.notifications.slice(-500); }
  return item;
}
function notificationTargets(db, filter={}){
  let users = db.users || [];
  if(filter.user_id) users = users.filter(u=>u.id===filter.user_id);
  if(filter.role) users = users.filter(u=>String(u.role||'').toUpperCase()===String(filter.role||'').toUpperCase());
  if(filter.roles) users = users.filter(u=>filter.roles.map(x=>String(x).toUpperCase()).includes(String(u.role||'').toUpperCase()));
  if(filter.area) users = users.filter(u=>!u.area || String(u.area).toLowerCase()===String(filter.area).toLowerCase() || String(u.role||'')==='ADMIN');
  return users;
}
function notifyUsers(db, users, payload={}){
  const list = [];
  for(const u of users||[]){ list.push(addNotification(db,{...payload,user_id:u.id,role:u.role,area:u.area||payload.area||null})); }
  return list;
}
function notifyAdmins(db,payload={}){ return notifyUsers(db, notificationTargets(db,{roles:['ADMIN','SUPER_ADMIN']}), payload); }
function notificationsForUser(db,user,limit=80){
  const area = adminScopeArea(db,user);
  return (db.notifications||[]).filter(n=>{
    if(n.user_id && n.user_id===user.id) return true;
    if(!n.user_id && n.role && String(n.role).toUpperCase()===String(user.role||'').toUpperCase()) return true;
    if(isAdminRole(user) && (!n.area || !area || n.area===area || isMainAdmin(user))) return true;
    return false;
  }).slice(-limit).reverse().map(n=>({...n, read: Array.isArray(n.read_by) && n.read_by.includes(user.id)}));
}
function unreadNotificationCount(db,user){ return notificationsForUser(db,user,200).filter(n=>!n.read).length; }

function supportTicketOut(db,t){
  const u = db.users.find(x=>x.id===t.user_id) || {};
  const assigned = db.users.find(x=>x.id===t.assigned_to) || {};
  const ride = t.ride_id ? db.rides.find(r=>r.id===t.ride_id) : null;
  return {...t, user_name:u.name||'', user_mobile:u.mobile||'', user_role:u.role||'', assigned_name:assigned.name||'', ride: ride ? {id:ride.id, pickup:ride.pickup, drop:ride.drop, status:ride.status, fare:ride.estimated_fare} : null};
}
function refundRequestOut(db,r){
  const ride = db.rides.find(x=>x.id===r.ride_id) || {};
  const passenger = db.users.find(x=>x.id===r.user_id) || {};
  return {...r, passenger_name:passenger.name||'', passenger_mobile:passenger.mobile||'', ride_status:ride.status||'', pickup:ride.pickup||'', drop:ride.drop||'', fare:ride.estimated_fare||0, payment_status:ride.payment_status||''};
}
function supportSummary(db,user){
  let tickets = db.support_tickets || [];
  let refunds = db.refund_requests || [];
  if(!isAdminRole(user)){
    tickets = tickets.filter(t=>t.user_id===user.id);
    refunds = refunds.filter(r=>r.user_id===user.id);
  } else if(!isMainAdmin(user)){
    const area = adminScopeArea(db,user);
    tickets = tickets.filter(t=>!area || t.area===area || t.assigned_to===user.id);
    refunds = refunds.filter(r=>!area || r.area===area);
  }
  return {tickets, refunds, summary:{open_tickets:tickets.filter(t=>t.status!=='CLOSED').length, closed_tickets:tickets.filter(t=>t.status==='CLOSED').length, open_refunds:refunds.filter(r=>['REQUESTED','UNDER_REVIEW'].includes(r.status)).length, approved_refunds:refunds.filter(r=>r.status==='APPROVED'||r.status==='PAID').length}};
}


function rideDto(r, db=null, viewer=null){
  const out = {...r};
  // Ride OTP should be visible only to passenger/admin, not to driver.
  if(out.ride_otp && viewer && !isAdminRole(viewer) && viewer.id !== out.passenger_id){
    delete out.ride_otp;
  }
  if(out.ride_otp && !viewer){ delete out.ride_otp; }
  if(db){
    const passenger = db.users.find(u=>u.id===r.passenger_id) || {};
    const driverUser = db.users.find(u=>u.id===r.driver_id) || {};
    const driverProfile = db.driver_profiles.find(d=>d.user_id===r.driver_id) || {};
    out.passenger_name = passenger.name || '';
    out.passenger_mobile = passenger.mobile || '';
    out.driver_name = driverUser.name || '';
    out.driver_mobile = driverUser.mobile || '';
    out.driver_vehicle_no = driverProfile.vehicle_no || '';
    out.driver_rating = driverProfile.rating || 5;
    const driverLive = (db.live_locations || []).find(x=>x.user_id===r.driver_id) || {};
    const passengerLive = (db.live_locations || []).find(x=>x.user_id===r.passenger_id) || {};
    out.driver_lat = driverLive.lat || driverProfile.lat || null;
    out.driver_lng = driverLive.lng || driverProfile.lng || null;
    out.driver_last_seen_at = driverLive.updated_at || driverProfile.last_location_at || null;
    out.passenger_lat = passengerLive.lat || r.passenger_location?.lat || null;
    out.passenger_lng = passengerLive.lng || r.passenger_location?.lng || null;
    out.pickup_lat = r.pickup_coords?.lat || null;
    out.pickup_lng = r.pickup_coords?.lng || null;
    out.drop_lat = r.drop_coords?.lat || null;
    out.drop_lng = r.drop_coords?.lng || null;
    out.driver_rating = driverProfile.rating || 5;
    if(Array.isArray(out.driver_candidate_ids)){
      out.driver_candidate_count = out.driver_candidate_ids.length;
      if(viewer && String(viewer.role||'').toUpperCase()==='DRIVER') out.is_candidate = out.driver_candidate_ids.includes(viewer.id);
    }
  }
  if(out.status === 'DRIVER_ACCEPTED' && out.payment_due_at){
    out.payment_time_left_seconds = Math.max(0, Math.floor((new Date(out.payment_due_at).getTime() - Date.now())/1000));
  }
  return out;
}


function money(n){ return Math.round(Number(n||0)*100)/100; }
function reportDateKey(iso){
  const d = iso ? new Date(iso) : new Date();
  if(Number.isNaN(d.getTime())) return 'Unknown';
  return d.toISOString().slice(0,10);
}
function reportRideOut(db,r){
  const passenger = db.users.find(u=>u.id===r.passenger_id) || {};
  const driverUser = db.users.find(u=>u.id===r.driver_id) || {};
  const driverProfile = db.driver_profiles.find(d=>d.user_id===r.driver_id) || {};
  return {...r, passenger_name: passenger.name||'', passenger_mobile: passenger.mobile||'', driver_name: driverUser.name||'', driver_mobile: driverUser.mobile||'', driver_vehicle_no: driverProfile.vehicle_no||'', driver_rating: driverProfile.rating||5};
}
function buildAdminReports(db,user){
  const rides = filterRidesForAdmin(db,user,db.rides||[]);
  const drivers = filterDriversForAdmin(db,user,db.driver_profiles||[]);
  const users = filterUsersForAdmin(db,user,db.users||[]);
  const completed = rides.filter(r=>r.status==='COMPLETED');
  const pending = rides.filter(r=>['REQUESTED','DRIVER_ACCEPTED','CONFIRMED','ARRIVED','STARTED'].includes(r.status));
  const paidSettlements = db.settlements||[];
  const subSummary = subAdminCommissionSummary(db,user).summary;
  const overview = {
    total_users: users.length,
    total_drivers: drivers.length,
    total_rides: rides.length,
    completed_rides: completed.length,
    active_or_pending_rides: pending.length,
    gross_fare: money(completed.reduce((a,r)=>a+Number(r.estimated_fare||0),0)),
    platform_commission: money(completed.reduce((a,r)=>a+Number(r.platform_commission||0),0)),
    driver_payout: money(completed.reduce((a,r)=>a+Number(r.driver_earning||0),0)),
    driver_payout_pending: money(completed.filter(r=>r.settlement_status!=='PAID').reduce((a,r)=>a+Number(r.driver_earning||0),0)),
    driver_payout_paid: money(paidSettlements.reduce((a,s)=>a+Number(s.amount||0),0)),
    sub_admin_commission_pending: subSummary.pending_amount,
    sub_admin_commission_paid: subSummary.paid_amount,
    net_platform_commission: money(completed.reduce((a,r)=>a+Number(r.platform_commission||0),0) - Number(subSummary.pending_amount||0) - Number(subSummary.paid_amount||0)),
    generated_at: now()
  };
  const status_counts = rides.reduce((acc,r)=>{acc[r.status||'UNKNOWN']=(acc[r.status||'UNKNOWN']||0)+1;return acc;},{});
  const dailyMap = {};
  for(const r of completed){
    const k = reportDateKey(r.completed_at||r.updated_at||r.created_at);
    dailyMap[k] = dailyMap[k] || {date:k, rides:0, gross_fare:0, platform_commission:0, driver_payout:0};
    dailyMap[k].rides += 1;
    dailyMap[k].gross_fare = money(dailyMap[k].gross_fare + Number(r.estimated_fare||0));
    dailyMap[k].platform_commission = money(dailyMap[k].platform_commission + Number(r.platform_commission||0));
    dailyMap[k].driver_payout = money(dailyMap[k].driver_payout + Number(r.driver_earning||0));
  }
  const daily = Object.values(dailyMap).sort((a,b)=>a.date.localeCompare(b.date)).slice(-30);
  const driverMap = {};
  for(const d of drivers){
    const userObj = db.users.find(u=>u.id===d.user_id) || {};
    driverMap[d.user_id] = {driver_id:d.user_id, name:userObj.name||d.name||'Driver', mobile:userObj.mobile||d.mobile||'', vehicle_no:d.vehicle_no||'', area:d.area||d.location||'Kalna', rides:0, gross_fare:0, driver_earning:0, platform_commission:0, rating:d.rating||5};
  }
  for(const r of completed){
    const item = driverMap[r.driver_id] || {driver_id:r.driver_id, name:r.driver_name||'Driver', mobile:'', vehicle_no:'', area:r.area||'Kalna', rides:0, gross_fare:0, driver_earning:0, platform_commission:0, rating:5};
    item.rides += 1;
    item.gross_fare = money(item.gross_fare + Number(r.estimated_fare||0));
    item.driver_earning = money(item.driver_earning + Number(r.driver_earning||0));
    item.platform_commission = money(item.platform_commission + Number(r.platform_commission||0));
    driverMap[r.driver_id] = item;
  }
  const top_drivers = Object.values(driverMap).sort((a,b)=>b.rides-a.rides || b.driver_earning-a.driver_earning).slice(0,10);
  const areaMap = {};
  for(const d of drivers){
    const area=d.area||d.location||'Kalna';
    areaMap[area] = areaMap[area] || {area, drivers:0, rides:0, gross_fare:0, commission:0};
    areaMap[area].drivers += 1;
  }
  for(const r of completed){
    const dp = drivers.find(d=>d.user_id===r.driver_id) || {};
    const area = dp.area || r.area || 'Kalna';
    areaMap[area] = areaMap[area] || {area, drivers:0, rides:0, gross_fare:0, commission:0};
    areaMap[area].rides += 1;
    areaMap[area].gross_fare = money(areaMap[area].gross_fare + Number(r.estimated_fare||0));
    areaMap[area].commission = money(areaMap[area].commission + Number(r.platform_commission||0));
  }
  const area_summary = Object.values(areaMap).sort((a,b)=>b.rides-a.rides || a.area.localeCompare(b.area));
  const sub_admins = (db.sub_admins||[]).map(sa=>{
    const userObj = db.users.find(u=>u.id===sa.user_id) || {};
    const cms = (db.sub_admin_commissions||[]).filter(c=>c.sub_admin_id===sa.id);
    return {id:sa.id, name:userObj.name||sa.name||'Sub Admin', mobile:userObj.mobile||sa.mobile||'', area:sa.area||'', pending:money(cms.filter(c=>c.status!=='PAID').reduce((a,c)=>a+Number(c.amount||0),0)), paid:money(cms.filter(c=>c.status==='PAID').reduce((a,c)=>a+Number(c.amount||0),0)), drivers:drivers.filter(d=>d.sub_admin_id===sa.id).length};
  });
  return {overview, status_counts, daily, top_drivers, area_summary, sub_admins, recent_completed: completed.slice(-100).reverse().map(r=>reportRideOut(db,r))};
}
function csvCell(v){
  const s=String(v??'');
  return /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s;
}
function buildCompletedRidesCsv(db,user){
  const reports = buildAdminReports(db,user);
  const rows = [['ride_id','date','passenger','driver','pickup','drop','ride_type','status','fare','platform_commission','driver_payout','settlement_status']];
  for(const r of reports.recent_completed.slice().reverse()){
    rows.push([r.id, (r.completed_at||r.updated_at||r.created_at||'').slice(0,19), r.passenger_name||'', r.driver_name||'', r.pickup||'', r.drop||'', r.ride_type||'', r.status||'', r.estimated_fare||0, r.platform_commission||0, r.driver_earning||0, r.settlement_status||'PENDING']);
  }
  return rows.map(row=>row.map(csvCell).join(',')).join('\n');
}


function paymentIntegration(db){
  return mergeIntegrations(db.integrations).payment || {};
}
function paymentProviderMode(db){
  return String(paymentIntegration(db).provider || 'DEMO').toUpperCase();
}

function razorpayKeyId(){ return process.env.RAZORPAY_KEY_ID || ''; }
function razorpayKeySecret(){ return process.env.RAZORPAY_KEY_SECRET || ''; }
function razorpayMode(){ return String(process.env.RAZORPAY_MODE || 'test').toLowerCase()==='live' ? 'live' : 'test'; }
function razorpayCompanyName(){ return process.env.RAZORPAY_COMPANY_NAME || 'NEXO Ride'; }
function razorpayCurrency(){ return (process.env.RAZORPAY_CURRENCY || 'INR').toUpperCase(); }
function httpsJsonRequest(urlString, opts={}, bodyObj=null){
  return new Promise((resolve,reject)=>{
    try{
      const u=new URL(urlString);
      const body=bodyObj?JSON.stringify(bodyObj):'';
      const req=https.request({hostname:u.hostname, path:u.pathname+u.search, method:opts.method||'GET', headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body),...(opts.headers||{})}}, res=>{
        let data=''; res.on('data',d=>data+=d); res.on('end',()=>{
          let parsed={}; try{parsed=data?JSON.parse(data):{};}catch(e){parsed={raw:data};}
          if(res.statusCode>=200 && res.statusCode<300) return resolve(parsed);
          const msg=(parsed && parsed.error && (parsed.error.description||parsed.error.reason)) || parsed.message || data || ('HTTP '+res.statusCode);
          const err=new Error(msg); err.statusCode=res.statusCode; err.payload=parsed; reject(err);
        });
      });
      req.on('error',reject); if(body) req.write(body); req.end();
    }catch(e){ reject(e); }
  });
}
async function createRazorpayGatewayOrder(ride, user){
  const key=razorpayKeyId(), secret=razorpayKeySecret();
  if(!key || !secret) throw new Error('Razorpay key/secret not configured');
  const amountPaise=Math.max(100, Math.round(Number(ride.estimated_fare||0)*100));
  const auth=Buffer.from(key+':'+secret).toString('base64');
  const receipt=String('nexo_'+String(ride.id||uid('ride')).replace(/[^A-Za-z0-9_]/g,'').slice(-25));
  return await httpsJsonRequest('https://api.razorpay.com/v1/orders', {method:'POST', headers:{Authorization:'Basic '+auth}}, {
    amount: amountPaise,
    currency: razorpayCurrency(),
    receipt,
    payment_capture: 1,
    notes:{ride_id:String(ride.id||''), passenger_id:String(user?.id||''), app:'NEXO Ride'}
  });
}
function verifyRazorpayPaymentSignature(orderId, paymentId, signature){
  const secret=razorpayKeySecret();
  if(!secret) return false;
  const expected=crypto.createHmac('sha256', secret).update(String(orderId)+'|'+String(paymentId)).digest('hex');
  try{
    const a=Buffer.from(expected,'hex'); const b=Buffer.from(String(signature||''),'hex');
    return a.length===b.length && crypto.timingSafeEqual(a,b);
  }catch(e){ return expected===String(signature||''); }
}
function paymentOptions(db){
  const p = paymentIntegration(db);
  const provider = paymentProviderMode(db);
  return {
    provider,
    demo_mode: provider === 'DEMO',
    razorpay_key_id: p.razorpay_key_id || razorpayKeyId() || '',
    razorpay_mode: razorpayMode(),
    razorpay_company_name: razorpayCompanyName(),
    razorpay_enabled: provider === 'RAZORPAY' && !!(p.razorpay_key_id || razorpayKeyId() || p.key_id_configured),
    manual_upi_id: p.manual_upi_id || '',
    manual_qr_label: p.manual_qr_label || 'Manual QR/UPI will be added by admin',
    methods: provider === 'RAZORPAY' ? ['RAZORPAY_CHECKOUT','UPI','CARD','NETBANKING'] : provider === 'MANUAL_QR' ? ['MANUAL_UPI_QR','UPI_REFERENCE'] : ['DEMO_PAYMENT','MANUAL_TEST_REFERENCE'],
    note: provider === 'DEMO' ? 'Testing mode. No real money is collected.' : provider === 'RAZORPAY' ? 'Razorpay key configured; server-side verification/webhook must be enabled before production launch.' : 'Manual UPI QR mode; booking is confirmed only after transaction/reference verification.'
  };
}
function createPaymentOrder(db, ride, user, source='APP'){
  db.payment_orders = db.payment_orders || [];
  const open = db.payment_orders.find(o=>o.ride_id===ride.id && ['CREATED','PENDING'].includes(o.status));
  if(open) return open;
  const opts = paymentOptions(db);
  const order = {
    id: uid('pay'),
    provider: opts.provider,
    source,
    ride_id: ride.id,
    passenger_id: ride.passenger_id,
    driver_id: ride.driver_id || null,
    amount: Number(ride.estimated_fare || 0),
    currency: 'INR',
    status: opts.demo_mode ? 'PENDING' : 'CREATED',
    payment_method: opts.methods[0],
    razorpay_order_id: opts.provider === 'RAZORPAY' ? 'order_demo_' + crypto.randomBytes(6).toString('hex') : '',
    manual_upi_id: opts.manual_upi_id || '',
    manual_qr_label: opts.manual_qr_label || '',
    transaction_id: '',
    created_at: now(),
    expires_at: ride.payment_due_at || new Date(Date.now()+PAYMENT_HOLD_SECONDS*1000).toISOString(),
    paid_at: null,
    verified_at: null,
    verified_by: null,
    note: opts.note
  };
  db.payment_orders.push(order);
  ride.payment_order_id = order.id;
  ride.payment_provider = opts.provider;
  return order;
}
function confirmRidePayment(db, ride, user, details={}){
  if(ride.status !== 'DRIVER_ACCEPTED') throw new Error('Driver must accept before payment');
  if(ride.payment_due_at && new Date(ride.payment_due_at).getTime() < Date.now()){
    ride.status='PAYMENT_TIMEOUT'; ride.payment_status='EXPIRED'; ride.expired_at=now();
    throw new Error('Payment time expired. Please book again.');
  }
  ride.payment_status='PAID';
  ride.status='CONFIRMED';
  ride.paid_at=now();
  ride.confirmed_at=ride.confirmed_at || now();
  ride.payment_ref = String(details.transaction_id || details.payment_ref || ride.payment_ref || 'DEMO-PAYMENT');
  ride.payment_method = String(details.payment_method || ride.payment_method || paymentOptions(db).methods[0]);
  ride.payment_provider = String(details.provider || ride.payment_provider || paymentProviderMode(db));
  if(!ride.ride_otp) ride.ride_otp = String(Math.floor(1000 + Math.random()*9000));
  notifyUsers(db, notificationTargets(db,{user_id:ride.driver_id}), {event_type:'PAYMENT_CONFIRMED', priority:'HIGH', ride_id:ride.id, title:'Payment Confirmed', message:'Payment received. Proceed to pickup.'});
  notifyUsers(db, notificationTargets(db,{user_id:ride.passenger_id}), {event_type:'RIDE_OTP', priority:'HIGH', ride_id:ride.id, title:'Ride OTP Generated', message:`Your Ride OTP is ${ride.ride_otp}`});
  notifyAdmins(db,{event_type:'PAYMENT_VERIFIED_ADMIN', priority:'NORMAL', ride_id:ride.id, title:'Ride Payment Verified', message:`${ride.pickup||''} → ${ride.drop||''} · ₹${ride.estimated_fare||0} · ${ride.payment_provider||''}`});
  audit(db,user?.id || 'system','PAYMENT_CONFIRMED','ride',ride.id,{provider:ride.payment_provider, ref:ride.payment_ref});
  return ride;
}


function deploymentStatus(db){
  const integrations = mergeIntegrations(db.integrations);
  const p = integrations.production || {};
  const publicUrl = p.server_url || process.env.SERVER_URL || '';
  const checks = [
    {key:'source', title:'Source package ready', ok:true, detail:'NEXO Ride source package available'},
    {key:'repo', title:'GitHub repository', ok:!!p.repo_url, detail:p.repo_url || 'Repo URL add করুন'},
    {key:'server', title:'Public server URL', ok:!!publicUrl, detail:publicUrl || 'DigitalOcean/Render/VPS URL add করুন'},
    {key:'https', title:'HTTPS/SSL', ok:!!p.ssl_configured || String(publicUrl).startsWith('https://'), detail:(p.ssl_configured || String(publicUrl).startsWith('https://')) ? 'HTTPS ready' : 'SSL configure করুন'},
    {key:'database', title:'PostgreSQL DATABASE_URL', ok:!!p.database_url_present, detail:p.database_url_present ? 'DATABASE_URL configured' : 'Production DB pending'},
    {key:'env', title:'Environment secrets', ok:!!(integrations.map.api_key_configured && integrations.otp.provider!=='DEMO' && integrations.payment.provider!=='DEMO'), detail:'Map + OTP + Payment env secrets check'},
    {key:'health', title:'Health check path', ok:true, detail:p.health_check_path || '/api/health'},
    {key:'apk', title:'APK build target', ok:!!publicUrl, detail: publicUrl ? publicUrl.replace(/\/$/,'') + '/app/' : 'Set public server URL first'}
  ];
  const deploySteps = [
    'Create GitHub private repository and upload latest NEXO Ride package',
    'Create production server on DigitalOcean/Render/VPS',
    'Set environment variables from .env.example',
    'Attach PostgreSQL DATABASE_URL and run server',
    'Add domain + SSL HTTPS',
    'Open /api/health and confirm OK',
    'Set APK target URL to https://your-domain/app/',
    'Run GitHub Actions APK build and test on Android phone'
  ];
  return {
    settings:{
      provider:p.deploy_provider || 'DEMO',
      server_url:publicUrl,
      domain_name:p.domain_name || '',
      ssl_configured:!!p.ssl_configured,
      repo_url:p.repo_url || '',
      branch:p.branch || 'main',
      database_target:p.database_target || 'PostgreSQL',
      database_url_present:!!p.database_url_present,
      health_check_path:p.health_check_path || '/api/health',
      note:p.deployment_note || ''
    },
    checks,
    ready_count:checks.filter(x=>x.ok).length,
    total:checks.length,
    production_ready:checks.every(x=>x.ok),
    urls:{
      root: publicUrl ? publicUrl.replace(/\/$/,'') + '/' : 'https://YOUR-DOMAIN/',
      app: publicUrl ? publicUrl.replace(/\/$/,'') + '/app/' : 'https://YOUR-DOMAIN/app/',
      admin: publicUrl ? publicUrl.replace(/\/$/,'') + '/app/admin.html' : 'https://YOUR-DOMAIN/app/admin.html',
      subadmin: publicUrl ? publicUrl.replace(/\/$/,'') + '/subadmin/' : 'https://YOUR-DOMAIN/subadmin/',
      health: publicUrl ? publicUrl.replace(/\/$/,'') + (p.health_check_path || '/api/health') : 'https://YOUR-DOMAIN/api/health'
    },
    deploy_steps:deploySteps
  };
}

function launchReadinessStatus(db){
  const integration = integrationReadiness(db);
  const deployment = deploymentStatus(db);
  const completedRides = (db.rides||[]).filter(r=>r.status==='COMPLETED');
  const approvedDrivers = (db.driver_profiles||[]).filter(d=>d.status==='APPROVED');
  const passengers = (db.users||[]).filter(u=>u.role==='PASSENGER');
  const subAdmins = (db.sub_admins||[]);
  const supportOpen = (db.support_tickets||[]).filter(t=>!['RESOLVED','CLOSED'].includes(t.status)).length;
  const refundsOpen = (db.refund_requests||[]).filter(r=>!['PAID','REJECTED'].includes(r.status)).length;
  const kycPending = (db.driver_profiles||[]).filter(d=>['PENDING','SUBMITTED','INCOMPLETE'].includes(String(d.kyc_status||'INCOMPLETE'))).length;
  const coreChecks = [
    {key:'passenger_app', title:'Passenger/Driver app flow', ok:true, detail:'Single app role flow ready'},
    {key:'admin_web', title:'Main Admin Web', ok:true, detail:'Admin panel available at /app/admin.html'},
    {key:'sub_admin_web', title:'Sub Admin Web', ok:true, detail:'Area sub-admin panel available at /subadmin/'},
    {key:'booking', title:'Booking + payment hold flow', ok:true, detail:'Request → Accept → Pay → OTP → Complete'},
    {key:'kyc', title:'Driver KYC workflow', ok:true, detail:'KYC submit + admin verify/reject ready'},
    {key:'commission', title:'Driver/Sub Admin commission', ok:true, detail:'Driver payout and sub-admin share calculation ready'},
    {key:'support', title:'Support/refund workflow', ok:true, detail:'Ticket + refund request workflow ready'},
    {key:'backup', title:'Persistent local database/backup', ok:true, detail:'Local JSON DB with backup/restore ready'}
  ];
  const productionChecks = [
    ...integration.checks.map(c=>({key:'int_'+c.key, title:c.title, ok:c.ok, detail:c.ok ? `${c.mode} ready` : c.next})),
    ...deployment.checks.map(c=>({key:'dep_'+c.key, title:c.title, ok:c.ok, detail:c.detail}))
  ];
  const pilotChecks = [
    {key:'drivers_5', title:'Minimum 5 approved drivers', ok:approvedDrivers.length>=5, detail:`Approved drivers: ${approvedDrivers.length}`},
    {key:'passengers_5', title:'Minimum 5 passenger accounts', ok:passengers.length>=5, detail:`Passengers: ${passengers.length}`},
    {key:'completed_20', title:'Minimum 20 completed test rides', ok:completedRides.length>=20, detail:`Completed rides: ${completedRides.length}`},
    {key:'subadmin_1', title:'At least 1 sub-admin', ok:subAdmins.length>=1, detail:`Sub-admins: ${subAdmins.length}`},
    {key:'kyc_clear', title:'No pending KYC before launch', ok:kycPending===0, detail:`Pending KYC: ${kycPending}`},
    {key:'support_clear', title:'No unresolved support/refund before launch', ok:(supportOpen+refundsOpen)===0, detail:`Support: ${supportOpen}, Refund: ${refundsOpen}`}
  ];
  const all = [...coreChecks, ...productionChecks, ...pilotChecks];
  const launchSteps = [
    'Public HTTPS server/domain set করুন',
    'PostgreSQL DATABASE_URL configure করুন',
    'Mappls/Google key বসান এবং live route test করুন',
    'Firebase/MSG91/2Factor OTP enable করুন',
    'Razorpay/manual QR payment verify করুন',
    'Firebase FCM push notification configure করুন',
    '5 driver + 5 passenger + 1 sub-admin দিয়ে field test করুন',
    '20 completed ride, OTP start, SOS, support/refund, payout test করুন',
    'APK build করে Android phone-এ install করে final smoke test করুন',
    'Privacy/Terms/Refund/Driver/Sub Admin policy final publish করুন'
  ];
  return {
    version: VERSION,
    summary:{
      ready: all.filter(x=>x.ok).length,
      total: all.length,
      core_ready: coreChecks.every(x=>x.ok),
      production_ready: productionChecks.every(x=>x.ok),
      pilot_ready: pilotChecks.every(x=>x.ok),
      launch_ready: all.every(x=>x.ok)
    },
    current_counts:{
      users:(db.users||[]).length,
      passengers:passengers.length,
      drivers:(db.driver_profiles||[]).length,
      approved_drivers:approvedDrivers.length,
      sub_admins:subAdmins.length,
      rides:(db.rides||[]).length,
      completed_rides:completedRides.length,
      support_open:supportOpen,
      refund_open:refundsOpen,
      kyc_pending:kycPending
    },
    core_checks:coreChecks,
    production_checks:productionChecks,
    pilot_checks:pilotChecks,
    launch_steps:launchSteps,
    blockers:all.filter(x=>!x.ok).map(x=>({key:x.key,title:x.title,detail:x.detail}))
  };
}


function operationsSummary(db){
  const activeStatuses = ['REQUESTED','DRIVER_ACCEPTED','CONFIRMED','ARRIVED','STARTED'];
  const drivers = (db.driver_profiles||[]).map(d=>{
    const u = (db.users||[]).find(x=>x.id===d.user_id) || {};
    const activeRide = (db.rides||[]).find(r=>r.driver_id===d.user_id && activeStatuses.includes(r.status));
    const loc = [...(db.live_locations||[])].reverse().find(x=>x.user_id===d.user_id) || {};
    const isBusy = !!activeRide;
    const status = String(d.status||'PENDING').toUpperCase();
    const online = !!d.online;
    const lastSeen = loc.updated_at || d.last_online_at || d.admin_reviewed_at || d.created_at || '';
    const docAlerts = [];
    const expFields = [
      ['license_expiry','Licence expiry'], ['insurance_expiry','Insurance expiry'], ['permit_expiry','Permit expiry'], ['pollution_expiry','Pollution expiry']
    ];
    const today = Date.now();
    for(const [key,label] of expFields){
      if(!d[key]) { docAlerts.push({type:'MISSING', key, label, message:`${label} not set`}); continue; }
      const diff = Math.ceil((new Date(d[key]).getTime()-today)/(24*60*60*1000));
      if(diff < 0) docAlerts.push({type:'EXPIRED', key, label, days:diff, message:`${label} expired`});
      else if(diff <= 30) docAlerts.push({type:'DUE_SOON', key, label, days:diff, message:`${label} due in ${diff} days`});
    }
    return {
      profile_id:d.id, driver_user_id:d.user_id, name:u.name||'Driver', mobile:u.mobile||'', area:d.area||u.area||'Kalna', vehicle_no:d.vehicle_no||'', status, online, busy:isBusy, availability: isBusy?'BUSY':(online&&status==='APPROVED'?'IDLE':(online?'ONLINE_NOT_APPROVED':'OFFLINE')),
      active_ride_id:activeRide?.id||'', active_ride_status:activeRide?.status||'', rating:d.rating||5, total_rides:d.total_rides||0, pending_payout:d.pending_payout||0, lat:loc.lat||d.lat||null, lng:loc.lng||d.lng||null, last_seen:lastSeen, doc_alerts:docAlerts
    };
  });
  const rides = db.rides||[];
  const queue = rides.filter(r=>activeStatuses.includes(r.status)).slice(-100).reverse().map(r=>{
    const p=(db.users||[]).find(u=>u.id===r.passenger_id)||{};
    const du=(db.users||[]).find(u=>u.id===r.driver_id)||{};
    return {id:r.id, status:r.status, pickup:r.pickup, drop:r.drop, fare:r.estimated_fare||0, ride_type:r.ride_type||'FULL', passenger_name:p.name||'', driver_name:du.name||'', created_at:r.created_at, payment_due_at:r.payment_due_at};
  });
  const areas = {};
  const addArea=(name)=> areas[name] ||= {area:name, drivers_total:0, online:0, idle:0, busy:0, requested:0, active_rides:0, completed_today:0};
  for(const d of drivers){ const a=addArea(d.area||'Kalna'); a.drivers_total++; if(d.online)a.online++; if(d.availability==='IDLE')a.idle++; if(d.busy)a.busy++; }
  const todayStr = new Date().toISOString().slice(0,10);
  for(const r of rides){ const area = r.area || (r.pickup||'Kalna').split(',')[0] || 'Kalna'; const a=addArea(area); if(r.status==='REQUESTED')a.requested++; if(activeStatuses.includes(r.status))a.active_rides++; if(r.status==='COMPLETED' && String(r.completed_at||'').slice(0,10)===todayStr)a.completed_today++; }
  const healthAlerts = [];
  for(const d of drivers){
    if(d.status==='APPROVED' && !d.online) healthAlerts.push({priority:'NORMAL', type:'OFFLINE_APPROVED_DRIVER', driver:d.name, area:d.area, message:'Approved driver is offline'});
    for(const al of d.doc_alerts){ if(al.type!=='MISSING') healthAlerts.push({priority:al.type==='EXPIRED'?'HIGH':'NORMAL', type:al.type, driver:d.name, area:d.area, message:al.message}); }
  }
  const summary = {
    total_drivers:drivers.length,
    approved:drivers.filter(d=>d.status==='APPROVED').length,
    pending:drivers.filter(d=>d.status==='PENDING').length,
    suspended:drivers.filter(d=>d.status==='SUSPENDED').length,
    online:drivers.filter(d=>d.online).length,
    offline:drivers.filter(d=>!d.online).length,
    busy:drivers.filter(d=>d.busy).length,
    idle:drivers.filter(d=>d.availability==='IDLE').length,
    active_rides:queue.length,
    requested_rides:queue.filter(r=>r.status==='REQUESTED').length,
    completed_today:rides.filter(r=>r.status==='COMPLETED' && String(r.completed_at||'').slice(0,10)===todayStr).length,
    alerts:healthAlerts.length
  };
  return {summary, drivers, queue, areas:Object.values(areas).sort((a,b)=>(b.active_rides+b.requested+b.online)-(a.active_rides+a.requested+a.online)), health_alerts:healthAlerts.slice(0,100), updated_at:now()};
}

async function route(req,res){
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const method = req.method.toUpperCase();

  res.setHeader('X-NEXO-Ride-Version', VERSION);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  if(pathname === '/subadmin' || pathname === '/subadmin/' || pathname === '/subadmin.html') {
    serveDir(res, SUBADMIN_DIR, '');
    return;
  }
  if(pathname === '/admin' || pathname === '/admin/' || pathname === '/admin.html' || pathname === '/app/admin' || pathname === '/app/admin/' || pathname === '/app/admin.html') {
    serveDir(res, ADMIN_DIR, '');
    return;
  }
  if(pathname === '/') {
    if(serveStatic(req,res,'/home/')) return;
  }
  if(serveStatic(req,res,pathname)) return;

  const db = readDb();
  const uploadedFileMatch = pathname.match(/^\/api\/files\/([^/]+)$/);
  if(method==='GET' && uploadedFileMatch) return serveUploadedFile(res, db, uploadedFileMatch[1]);
  if(expirePaymentHolds(db)) saveDb(db);

  try{
    if(method==='GET' && pathname==='/api/health'){
      return send(res,200,{ok:true, app:'NEXO Ride', version:VERSION, service_area:db.service_area.name, storage:dbStatus(db), time:now()});
    }

    if(method==='GET' && pathname==='/api/env-check'){
      return send(res,200,{ok:true, version:VERSION, env:{otp_provider:String(process.env.OTP_PROVIDER||'DEMO'), twofactor_key_present:!!twoFactorApiKey(), map_provider:String(process.env.MAP_PROVIDER||'DEMO'), mappls_key_present:!!mapplsStaticKey(), navigation_provider:String(process.env.NAVIGATION_PROVIDER||''), google_login_enabled:googleLoginEnabled(), google_client_id_present:!!googleClientId(), google_client_secret_present:!!googleClientSecret(), production_env_loaded:fs.existsSync(path.join(__dirname,'data','production.env'))}, apk:{package_name:'com.astratechnologies.nexoride', deep_link_scheme:'nexoride://auth/google', permission_fix:'SPRINT7A'}, note:'Secrets are hidden. If key_present is true, configuration file is loaded.'});
    }
    if(method==='GET' && pathname==='/api/config'){
      return send(res,200,{ok:true, version:VERSION, app_settings:db.app_settings, service_area:db.service_area, area_catalog:db.area_catalog||[], fare_rules:db.fare_rules, integrations: integrationReadiness(db).integrations});
    }

    if(method==='GET' && pathname==='/api/auth/google/start'){
      if(!googleLoginEnabled()) return send(res,400,{detail:'Google Login is not configured. Set GOOGLE_LOGIN_ENABLED=true, GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in data/production.env'});
      const role = String(url.searchParams.get('role') || 'PASSENGER').toUpperCase();
      if(role !== 'PASSENGER') return send(res,400,{detail:'Google Login is available for passengers only. Driver login uses mobile OTP/KYC.'});
      const appReturnParam = String(url.searchParams.get('app') || url.searchParams.get('return_app') || '').toLowerCase();
      const nativeUa = /NEXO-Ride-Android/i.test(String(req.headers['user-agent']||''));
      const returnApp = nativeUa || ['1','true','yes','apk','app'].includes(appReturnParam);
      const state = makeGoogleState('PASSENGER',{return_app:returnApp, source:returnApp?'android_apk':'web'});
      const redirectUri = googleCallbackUrl(req);
      const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
        client_id: googleClientId(),
        redirect_uri: redirectUri,
        response_type:'code',
        scope:'openid email profile',
        access_type:'offline',
        prompt:'select_account',
        state
      }).toString();
      res.writeHead(302,{Location:authUrl,'Cache-Control':'no-store'});
      return res.end();
    }

    if(method==='GET' && pathname==='/api/auth/google/callback'){
      const code = String(url.searchParams.get('code') || '');
      const err = String(url.searchParams.get('error') || '');
      const state = verifyGoogleState(url.searchParams.get('state') || '');
      const appRedirect = '/app/';
      const deepAppRedirect = 'nexoride://auth/google';
      function googleReturnLocation(params){
        const q=new URLSearchParams(params).toString();
        if(state && state.return_app) return `${deepAppRedirect}?${q}`;
        return `${appRedirect}?${q}`;
      }
      if(err){ res.writeHead(302,{Location:googleReturnLocation({google_error:err}),'Cache-Control':'no-store'}); return res.end(); }
      if(!googleLoginEnabled() || !code || !state){ res.writeHead(302,{Location:`${appRedirect}?google_error=${encodeURIComponent('Google login configuration/state invalid')}`,'Cache-Control':'no-store'}); return res.end(); }
      try{
        const redirectUri = googleCallbackUrl(req);
        const tokenResp = await httpPostFormJson('https://oauth2.googleapis.com/token',{code, client_id:googleClientId(), client_secret:googleClientSecret(), redirect_uri:redirectUri, grant_type:'authorization_code'});
        const tok = tokenResp.json || {};
        if(!tok.access_token) throw new Error(tok.error_description || tok.error || 'Google token exchange failed');
        const infoResp = await httpGetJsonWithHeaders('https://www.googleapis.com/oauth2/v3/userinfo',{Authorization:'Bearer '+tok.access_token});
        const info = infoResp.json || {};
        if(!info.sub || !info.email) throw new Error('Google profile email not available');
        if(info.email_verified === false) throw new Error('Google email is not verified');
        let user = (db.users||[]).find(u=>String(u.google_id||'')===String(info.sub)) || findUser(db, info.email);
        if(user && String(user.role||'PASSENGER').toUpperCase() !== 'PASSENGER') throw new Error('This email is already used for non-passenger account. Use mobile login.');
        if(!user){
          const s=salt();
          user = {id:uid('usr'), name:String(info.name||info.given_name||'Passenger').trim(), mobile:'', email:String(info.email||'').toLowerCase(), role:'PASSENGER', nexo_id:'', area:'Kalna', status:'ACTIVE', created_at:now(), last_login_at:null, consent_at:now(), consent_version:'v1-google', password_salt:s, password_hash:hashPassword(crypto.randomBytes(18).toString('hex'),s)};
          db.users.push(user);
        }
        user.google_id = String(info.sub);
        user.google_email_verified = true;
        user.google_photo = String(info.picture||user.google_photo||'');
        user.auth_provider = user.auth_provider || 'GOOGLE';
        user.name = user.name || String(info.name||'Passenger');
        user.email = user.email || String(info.email||'').toLowerCase();
        user.last_login_at = now();
        const sess = makeSession(db,user);
        audit(db,user.id,'GOOGLE_LOGIN','user',user.id,{email:user.email});
        saveDb(db);
        res.writeHead(302,{Location:googleReturnLocation({google_token:sess.token, google_login:'ok'}),'Cache-Control':'no-store'});
        return res.end();
      }catch(e){
        audit(db,'system','GOOGLE_LOGIN_FAILED','auth','google',{error:e.message});
        saveDb(db);
        res.writeHead(302,{Location:googleReturnLocation({google_error:e.message}),'Cache-Control':'no-store'});
        return res.end();
      }
    }

    if(method==='POST' && pathname==='/api/auth/google/fake-login-dev'){
      return send(res,403,{detail:'Disabled. Use Google OAuth redirect flow.'});
    }

    if(method==='POST' && pathname==='/api/auth/request-otp'){
      const body = await getBody(req);
      const mobile = String(body.mobile||'').trim();
      if(!mobile) return send(res,400,{detail:'Mobile number required'});
      const authSet = authSettings(db);
      const i = mergeIntegrations(db.integrations);
      const provider = String(authSet.otp_provider || i.otp.provider || 'DEMO').toUpperCase();
      const recentForMobile = (db.otp_requests||[]).filter(x=>x.mobile===mobile && new Date(x.created_at).getTime() > Date.now()-60*60*1000);
      if(recentForMobile.length >= Number(authSet.max_otp_per_mobile_per_hour||5)) return send(res,429,{detail:'Too many OTP requests. Please try later.'});
      const latest = [...(db.otp_requests||[])].reverse().find(x=>x.mobile===mobile && new Date(x.created_at).getTime() > Date.now() - Number(authSet.resend_cooldown_seconds||0)*1000);
      if(latest) return send(res,429,{detail:`Please wait ${authSet.resend_cooldown_seconds} seconds before requesting another OTP`});
      const purpose = String(body.purpose||'LOGIN');
      let code = provider === 'DEMO' ? String(authSet.demo_otp || i.otp.demo_code || '123456') : '';
      const reqItem = {id:uid('otp'), mobile, code_hash:provider==='DEMO'?sha(code):'', provider, purpose, created_at:now(), expires_at:new Date(Date.now()+Number(authSet.otp_expiry_minutes||5)*60*1000).toISOString(), verified:false};
      try{
        const gateway = await sendOtpViaGateway(provider, mobile, purpose);
        if(gateway){ reqItem.gateway='2FACTOR'; reqItem.gateway_session_id = gateway.session_id; reqItem.gateway_phone = gateway.phone; }
        else if(provider !== 'DEMO') return send(res,400,{detail:`OTP provider ${provider} is not configured for live sending yet. Use TWOFACTOR or DEMO.`});
      }catch(e){
        audit(db,'system','OTP_SEND_FAILED','mobile',mobile,{provider, error:e.message});
        saveDb(db);
        return send(res,502,{detail:'OTP gateway failed', provider, error:e.message});
      }
      db.otp_requests.push(reqItem);
      if(db.otp_requests.length > 500) db.otp_requests = db.otp_requests.slice(-500);
      audit(db,'system','OTP_REQUEST','mobile',mobile,{provider, purpose:reqItem.purpose, gateway:reqItem.gateway||''});
      saveDb(db);
      return send(res,200,{ok:true, provider, expires_at:reqItem.expires_at, demo_code:provider==='DEMO'?code:undefined, message:provider==='DEMO'?'Testing OTP generated.':'OTP sent to mobile.'});
    }

    if(method==='POST' && pathname==='/api/auth/login-otp'){
      const body = await getBody(req);
      const mobile = String(body.mobile||'').trim();
      const otp = String(body.otp||'').trim();
      if(!mobile || !otp) return send(res,400,{detail:'Mobile and OTP required'});
      const reqItem = [...(db.otp_requests||[])].reverse().find(x=>x.mobile===mobile && !x.verified && new Date(x.expires_at)>new Date());
      let otpOk = false;
      try{ otpOk = !!reqItem && await verifyOtpViaGateway(reqItem, otp); }
      catch(e){ return send(res,502,{detail:'OTP verification gateway failed', error:e.message}); }
      if(!otpOk) return send(res,401,{detail:'Invalid or expired OTP'});
      reqItem.verified = true; reqItem.verified_at = now();
      let user = findUser(db,mobile);
      if(!user){
        if(!body.consent) return send(res,400,{detail:'Privacy and Terms consent required for new user'});
        const role = String(body.role||'PASSENGER').toUpperCase()==='DRIVER' ? 'DRIVER' : 'PASSENGER';
        const s = salt();
        user = {id:uid('usr'), name:String(body.name||('User '+mobile.slice(-4))).trim(), mobile, email:String(body.email||''), role, nexo_id:'', area:String(body.area||'Kalna'), status:'ACTIVE', created_at:now(), last_login_at:null, consent_at:now(), consent_version:'v1', password_salt:s, password_hash:hashPassword(crypto.randomBytes(12).toString('hex'),s)};
        db.users.push(user);
        if(role==='DRIVER') db.driver_profiles.push({id:uid('drv'), user_id:user.id, vehicle_type:'TOTO', vehicle_no:String(body.vehicle_no||''), license_no:String(body.license_no||''), aadhaar_no:String(body.aadhaar_no||''), location:String(body.area||'Kalna'), area:String(body.area||'Kalna'), online:false, status:'PENDING', kyc_status:'INCOMPLETE', rating:5, total_rides:0, total_earnings:0, pending_payout:0, created_at:now()});
      }
      const sess = makeSession(db,user);
      user.last_login_at = now();
      audit(db,user.id,'OTP_LOGIN','user',user.id,{provider:reqItem.provider});
      saveDb(db);
      return send(res,200,{ok:true, token:sess.token, expires_at:sess.expires_at, user:safeUser(user), driver_profile:db.driver_profiles.find(d=>d.user_id===user.id)||null});
    }

    if(method==='POST' && pathname==='/api/auth/register'){
      const body = await getBody(req);
      const role = String(body.role||'PASSENGER').toUpperCase()==='DRIVER' ? 'DRIVER' : 'PASSENGER';
      const name = String(body.name||'').trim();
      const mobile = String(body.mobile||'').trim();
      const email = String(body.email||'').trim();
      const password = String(body.password||'');
      const consent = !!body.consent;
      if(!consent) return send(res,400,{detail:'Privacy and Terms consent required'});
      if(!name || !mobile || password.length<6) return send(res,400,{detail:'Name, mobile and 6+ digit password required'});
      if(findUser(db,mobile) || (email && findUser(db,email))) return send(res,409,{detail:'Account already exists'});
      const s = salt();
      const user = {
        id:uid('usr'), name, mobile, email, role, nexo_id: body.nexo_id || '', area:String(body.area||'Kalna'), managed_by_subadmin_id:String(body.managed_by_subadmin_id||''), added_by:String(body.added_by||''),
        status:'ACTIVE', created_at:now(), last_login_at:null,
        consent_at:now(), consent_version:'v1',
        password_salt:s, password_hash:hashPassword(password,s)
      };
      db.users.push(user);
      if(role==='DRIVER'){
        db.driver_profiles.push({
          id:uid('drv'), user_id:user.id, vehicle_type:'TOTO', vehicle_no:String(body.vehicle_no||''),
          license_no:String(body.license_no||''), aadhaar_no:String(body.aadhaar_no||''), driver_photo:String(body.driver_photo||''), vehicle_photo:String(body.vehicle_photo||''), aadhaar_doc:String(body.aadhaar_doc||''), license_doc:String(body.license_doc||''), kyc_status:'INCOMPLETE', location:String(body.location||body.area||'Kalna'), area:String(body.area||'Kalna'), sub_admin_user_id:String(body.managed_by_subadmin_id||''), added_by:String(body.added_by||''), online:false, status:'PENDING',
          rating:5, total_rides:0, total_earnings:0, pending_payout:0, created_at:now()
        });
      }
      const sess = makeSession(db,user);
      user.last_login_at = now();
      audit(db,user.id,'REGISTER','user',user.id,{role});
      saveDb(db);
      return send(res,200,{ok:true, token:sess.token, expires_at:sess.expires_at, user:safeUser(user)});
    }

    if(method==='POST' && pathname==='/api/auth/login'){
      const body = await getBody(req);
      const user = findUser(db, body.login);
      if(!user || !verifyPassword(body.password,user.password_salt,user.password_hash)){
        return send(res,401,{detail:'Invalid login or password'});
      }
      const sess = makeSession(db,user);
      user.last_login_at = now();
      audit(db,user.id,'LOGIN','user',user.id,{});
      saveDb(db);
      return send(res,200,{ok:true, token:sess.token, expires_at:sess.expires_at, user:safeUser(user)});
    }

    if(method==='POST' && pathname==='/api/auth/forgot-password'){
      const body = await getBody(req);
      const login = String(body.login||'').trim();
      if(!login) return send(res,400,{detail:'Mobile / Email / NEXO ID required'});
      const user = findUser(db, login);
      if(!user || String(user.status||'ACTIVE').toUpperCase()==='SUSPENDED') return send(res,404,{detail:'Account not found. Please check mobile number or contact admin.'});
      const mobile = String(user.mobile||'').trim();
      if(!mobile) return send(res,400,{detail:'No mobile number linked with this account. Contact admin.'});
      const authSet = authSettings(db);
      const i = mergeIntegrations(db.integrations);
      const provider = String(authSet.otp_provider || i.otp.provider || 'DEMO').toUpperCase();
      const recentForMobile = (db.otp_requests||[]).filter(x=>x.mobile===mobile && String(x.purpose||'')==='RESET_PASSWORD' && new Date(x.created_at).getTime() > Date.now()-60*60*1000);
      if(recentForMobile.length >= Number(authSet.max_otp_per_mobile_per_hour||5)) return send(res,429,{detail:'Too many reset OTP requests. Please try later.'});
      const latest = [...(db.otp_requests||[])].reverse().find(x=>x.mobile===mobile && String(x.purpose||'')==='RESET_PASSWORD' && new Date(x.created_at).getTime() > Date.now() - Number(authSet.resend_cooldown_seconds||0)*1000);
      if(latest) return send(res,429,{detail:`Please wait ${authSet.resend_cooldown_seconds} seconds before requesting another OTP`});
      let code = provider === 'DEMO' ? String(authSet.demo_otp || i.otp.demo_code || '123456') : '';
      const reqItem = {id:uid('rst'), user_id:user.id, mobile, code_hash:provider==='DEMO'?sha(code):'', provider, purpose:'RESET_PASSWORD', created_at:now(), expires_at:new Date(Date.now()+Number(authSet.otp_expiry_minutes||5)*60*1000).toISOString(), verified:false};
      try{
        const gateway = await sendOtpViaGateway(provider, mobile, 'RESET_PASSWORD');
        if(gateway){ reqItem.gateway='2FACTOR'; reqItem.gateway_session_id = gateway.session_id; reqItem.gateway_phone = gateway.phone; }
        else if(provider !== 'DEMO') return send(res,400,{detail:`OTP provider ${provider} is not configured for live sending yet. Use TWOFACTOR or DEMO.`});
      }catch(e){
        audit(db,user.id,'PASSWORD_RESET_OTP_FAILED','user',user.id,{provider,error:e.message});
        saveDb(db);
        return send(res,502,{detail:'OTP gateway failed', provider, error:e.message});
      }
      db.otp_requests.push(reqItem);
      db.password_reset_requests = db.password_reset_requests || [];
      db.password_reset_requests.push({id:reqItem.id,user_id:user.id,mobile,provider,status:'OTP_SENT',created_at:reqItem.created_at,expires_at:reqItem.expires_at});
      if(db.otp_requests.length > 500) db.otp_requests = db.otp_requests.slice(-500);
      if(db.password_reset_requests.length > 300) db.password_reset_requests = db.password_reset_requests.slice(-300);
      audit(db,user.id,'PASSWORD_RESET_OTP','user',user.id,{provider});
      saveDb(db);
      return send(res,200,{ok:true, message:'Password reset OTP sent', mobile_mask:maskMobile(mobile), expires_at:reqItem.expires_at, provider, demo_code:provider==='DEMO'?code:undefined, note:provider==='DEMO'?'Testing OTP only. Production SMS provider not configured yet.':'OTP sent through configured provider.'});
    }

    if(method==='POST' && pathname==='/api/auth/reset-password'){
      const body = await getBody(req);
      const login = String(body.login||'').trim();
      const otp = String(body.otp||'').trim();
      const newPassword = String(body.new_password||'');
      if(!login || !otp || !newPassword) return send(res,400,{detail:'Login, OTP and new password required'});
      if(newPassword.length < 6) return send(res,400,{detail:'New password must be at least 6 characters'});
      const user = findUser(db, login);
      if(!user) return send(res,404,{detail:'Account not found'});
      const mobile = String(user.mobile||'').trim();
      const reqItem = [...(db.otp_requests||[])].reverse().find(x=>x.mobile===mobile && x.user_id===user.id && String(x.purpose||'')==='RESET_PASSWORD' && !x.verified && new Date(x.expires_at)>new Date());
      let otpOk = false;
      try{ otpOk = !!reqItem && await verifyOtpViaGateway(reqItem, otp); }
      catch(e){ return send(res,502,{detail:'OTP verification gateway failed', error:e.message}); }
      if(!otpOk) return send(res,401,{detail:'Invalid or expired reset OTP'});
      reqItem.verified = true;
      reqItem.verified_at = now();
      const s = salt();
      user.password_salt = s;
      user.password_hash = hashPassword(newPassword,s);
      user.must_change_password = false;
      user.password_changed_at = now();
      // For safety, logout this user from old sessions after password reset.
      db.sessions = (db.sessions||[]).filter(sess=>sess.user_id!==user.id);
      db.password_reset_requests = db.password_reset_requests || [];
      const log = [...db.password_reset_requests].reverse().find(x=>x.id===reqItem.id);
      if(log){ log.status='PASSWORD_RESET_DONE'; log.completed_at=now(); }
      audit(db,user.id,'PASSWORD_RESET_DONE','user',user.id,{via:'OTP'});
      saveDb(db);
      return send(res,200,{ok:true, message:'Password reset successful. Please login with new password.'});
    }

    if(method==='GET' && pathname==='/api/me'){
      const user = requireUser(req,res,db); if(!user) return;
      // 30-day rolling session: every app open extends the current login session.
      const auth = req.headers.authorization || '';
      const reqToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';
      const sess = db.sessions.find(s=>s.token===reqToken && s.user_id===user.id);
      if(sess){ const sessionDays = Number((db.auth_settings||{}).session_days || SESSION_DAYS); sess.expires_at = new Date(Date.now()+sessionDays*24*60*60*1000).toISOString(); user.last_seen_at = now(); }
      const driver_profile = db.driver_profiles.find(d=>d.user_id===user.id) || null;
      const gps_health = driver_profile ? driverGpsHealth(db, driver_profile) : null;
      saveDb(db);
      return send(res,200,{ok:true, user:safeUser(user), driver_profile, gps_health, session_expires_at:sess?.expires_at});
    }


    if(method==='POST' && pathname==='/api/me'){
      const user = requireUser(req,res,db); if(!user) return;
      const body = await getBody(req);
      const name = String(body.name||'').trim();
      const email = String(body.email||'').trim();
      const mobile = String(body.mobile||'').trim();
      const area = String(body.area||'').trim();
      if(name) user.name = name.slice(0,120);
      if(email){
        const exists = db.users.find(u=>u.id!==user.id && String(u.email||'').toLowerCase()===email.toLowerCase());
        if(exists) return send(res,409,{detail:'This email is already used by another account'});
        user.email = email.slice(0,160);
      } else if(body.email !== undefined){ user.email=''; }
      if(mobile && mobile !== user.mobile){
        const exists = db.users.find(u=>u.id!==user.id && String(u.mobile||'')===mobile);
        if(exists) return send(res,409,{detail:'This mobile number is already used by another account'});
        user.mobile = mobile.slice(0,20);
      }
      if(area) user.area = area.slice(0,120);
      user.updated_at = now();
      audit(db,user.id,'PROFILE_UPDATE','user',user.id,{role:user.role});
      saveDb(db);
      return send(res,200,{ok:true, user:safeUser(user), driver_profile:db.driver_profiles.find(d=>d.user_id===user.id)||null});
    }

    if(method==='POST' && pathname==='/api/auth/change-password'){
      const user = requireUser(req,res,db); if(!user) return;
      const body = await getBody(req);
      const currentPassword = String(body.current_password||'');
      const newPassword = String(body.new_password||'');
      if(newPassword.length < 6) return send(res,400,{detail:'New password must be at least 6 characters'});
      if(!verifyPassword(currentPassword,user.password_salt,user.password_hash)) return send(res,401,{detail:'Current password is wrong'});
      const s = salt();
      user.password_salt = s;
      user.password_hash = hashPassword(newPassword,s);
      user.must_change_password = false;
      user.password_changed_at = now();
      audit(db,user.id,'PASSWORD_CHANGE','user',user.id,{role:user.role});
      saveDb(db);
      return send(res,200,{ok:true, message:'Password changed successfully'});
    }

    if(method==='POST' && pathname==='/api/me/role'){
      const user = requireUser(req,res,db); if(!user) return;
      const body = await getBody(req);
      const role = String(body.role||'PASSENGER').toUpperCase()==='DRIVER' ? 'DRIVER' : 'PASSENGER';
      user.role = role;
      if(role==='DRIVER' && !db.driver_profiles.find(d=>d.user_id===user.id)){
        db.driver_profiles.push({id:uid('drv'),user_id:user.id,vehicle_type:'TOTO',vehicle_no:'',license_no:'',location:'Kalna',area:user.area||'Kalna',online:false,status:'PENDING',rating:5,total_rides:0,created_at:now()});
      }
      audit(db,user.id,'ROLE_CHANGE','user',user.id,{role});
      saveDb(db);
      return send(res,200,{ok:true,user:safeUser(user),driver_profile:db.driver_profiles.find(d=>d.user_id===user.id)||null});
    }

    if(method==='POST' && pathname==='/api/driver/profile'){
      const user = requireUser(req,res,db); if(!user) return;
      const body = await getBody(req);
      user.role='DRIVER';
      let prof = db.driver_profiles.find(d=>d.user_id===user.id);
      if(!prof){
        prof={id:uid('drv'),user_id:user.id,created_at:now(),rating:5,total_rides:0,total_earnings:0,pending_payout:0,status:'PENDING',online:false};
        db.driver_profiles.push(prof);
      }
      prof.vehicle_type='TOTO';
      prof.vehicle_no=String(body.vehicle_no||prof.vehicle_no||'');
      prof.license_no=String(body.license_no||prof.license_no||'');
      prof.aadhaar_no=String(body.aadhaar_no||prof.aadhaar_no||'');
      prof.driver_photo=normalizeDocInput(body.driver_photo||prof.driver_photo||'',db,user,'driver_photo',prof.id);
      prof.vehicle_photo=normalizeDocInput(body.vehicle_photo||prof.vehicle_photo||'',db,user,'vehicle_photo',prof.id);
      prof.aadhaar_doc=normalizeDocInput(body.aadhaar_doc||prof.aadhaar_doc||'',db,user,'aadhaar_doc',prof.id);
      prof.license_doc=normalizeDocInput(body.license_doc||prof.license_doc||'',db,user,'license_doc',prof.id);
      prof.location=String(body.location||prof.location||'Kalna');
      prof.area=String(body.area||prof.area||prof.location||'Kalna');
      if(body.managed_by_subadmin_id) prof.sub_admin_user_id=String(body.managed_by_subadmin_id);
      prof.status = body.status || prof.status || 'PENDING';
      audit(db,user.id,'DRIVER_PROFILE_UPDATE','driver_profile',prof.id,{});
      saveDb(db);
      return send(res,200,{ok:true,driver_profile:prof});
    }


    if(method==='GET' && pathname==='/api/driver/kyc'){
      const user = requireUser(req,res,db); if(!user) return;
      if(user.role!=='DRIVER') return send(res,403,{detail:'Driver only'});
      let prof = db.driver_profiles.find(d=>d.user_id===user.id);
      if(!prof) return send(res,404,{detail:'Driver profile not found'});
      return send(res,200,{ok:true, kyc:driverKycSummary(db,prof)});
    }

    if(method==='POST' && pathname==='/api/driver/kyc'){
      const user = requireUser(req,res,db); if(!user) return;
      if(user.role!=='DRIVER') user.role='DRIVER';
      const body = await getBody(req);
      let prof = db.driver_profiles.find(d=>d.user_id===user.id);
      if(!prof){ prof={id:uid('drv'),user_id:user.id,vehicle_type:'TOTO',created_at:now(),rating:5,total_rides:0,total_earnings:0,pending_payout:0,status:'PENDING',online:false}; db.driver_profiles.push(prof); }
      prof.vehicle_type='TOTO';
      prof.vehicle_no=String(body.vehicle_no||prof.vehicle_no||'').trim();
      prof.license_no=String(body.license_no||prof.license_no||'').trim();
      prof.aadhaar_no=String(body.aadhaar_no||prof.aadhaar_no||'').trim();
      prof.driver_photo=normalizeDocInput(body.driver_photo||prof.driver_photo||'',db,user,'driver_photo',prof.id);
      prof.vehicle_photo=normalizeDocInput(body.vehicle_photo||prof.vehicle_photo||'',db,user,'vehicle_photo',prof.id);
      prof.aadhaar_doc=normalizeDocInput(body.aadhaar_doc||prof.aadhaar_doc||'',db,user,'aadhaar_doc',prof.id);
      prof.license_doc=normalizeDocInput(body.license_doc||prof.license_doc||'',db,user,'license_doc',prof.id);
      prof.area=String(body.area||prof.area||user.area||'Kalna');
      prof.location=String(body.location||prof.location||prof.area||'Kalna');
      const k = driverKycSummary(db,prof);
      if(prof.status==='REJECTED') prof.status='PENDING';
      prof.kyc_status = k.docs_present > 0 ? 'SUBMITTED' : 'INCOMPLETE';
      prof.kyc_submitted_at = now();
      const auto = autoApproveDriverKycIfEligible(db, prof, user, body);
      if(auto.auto_approved){
        prof.kyc_last_message = 'KYC complete এবং GPS service area-এর ভিতরে আছে। Driver auto approved. এখন Go Online করতে পারবেন।';
      }else{
        prof.kyc_last_message = k.complete ? `KYC complete. Auto approval pending: ${auto.reason}. GPS allow করে service area-এর ভিতর থেকে আবার Submit/Go Online করুন।` : `KYC submitted, but ${k.docs_required-k.docs_present} item(s) still missing: ${k.missing.join(', ')}`;
      }
      db.kyc_submissions = db.kyc_submissions || [];
      const finalSummary = driverKycSummary(db,prof);
      const submission = {id:uid('kycsub'), profile_id:prof.id, driver_user_id:user.id, driver_name:user.name||'', mobile:user.mobile||'', area:prof.area, status:prof.kyc_status, review_status:auto.auto_approved?'AUTO_APPROVED':(k.complete?'AUTO_APPROVAL_PENDING':'SUBMITTED_BUT_INCOMPLETE'), auto_approved:!!auto.auto_approved, auto_approval_reason:auto.reason||'', coords:auto.coords||coordsFromRequestOrProfile(body,prof), docs_present:finalSummary.docs_present, docs_required:finalSummary.docs_required, missing:finalSummary.missing, uploaded_files:(finalSummary.uploaded_files||[]).map(f=>({id:f.id, doc_type:f.doc_type, url:f.url, mime_type:f.mime_type, size_bytes:f.size_bytes})), message:prof.kyc_last_message, submitted_at:prof.kyc_submitted_at};
      db.kyc_submissions.push(submission);
      notifyAdmins(db,{event_type:auto.auto_approved?'DRIVER_KYC_AUTO_APPROVED':'DRIVER_KYC_SUBMITTED', priority:auto.auto_approved?'NORMAL':(k.complete?'HIGH':'NORMAL'), title:auto.auto_approved?'Driver KYC Auto Approved':'Driver KYC Submitted', message:auto.auto_approved?`${user.name||'Driver'} auto approved · service area GPS OK`:`${user.name||'Driver'} submitted KYC documents · ${k.docs_present}/${k.docs_required}`, area:prof.area, data:{driver_profile_id:prof.id, submission_id:submission.id}});
      audit(db,user.id,auto.auto_approved?'DRIVER_KYC_AUTO_APPROVED':'DRIVER_KYC_SUBMIT','driver_profile',prof.id,{docs_present:finalSummary.docs_present, docs_required:finalSummary.docs_required, missing:finalSummary.missing, auto});
      saveDb(db);
      return send(res,200,{ok:true, message:prof.kyc_last_message, kyc:driverKycSummary(db,prof), submission, auto_approval:auto});
    }

    if(method==='GET' && pathname==='/api/driver/status'){
      const user = requireUser(req,res,db); if(!user) return;
      const prof = db.driver_profiles.find(d=>d.user_id===user.id);
      if(!prof) return send(res,404,{detail:'Driver profile not found'});
      return send(res,200,{ok:true, driver_profile:prof, online_eligible:driverOnlineEligibility(prof), gps_health:driverGpsHealth(db,prof)});
    }



    // Sprint-6F: Check GPS can run while driver is offline. It stores the real GPS,
    // resolves nearest local area name, and returns a running/inside status for UI.
    if(method==='POST' && pathname==='/api/driver/check-gps'){
      const user = requireUser(req,res,db); if(!user) return;
      if(user.role !== 'DRIVER') return send(res,403,{detail:'Driver account required'});
      const body = await parseBody(req);
      const prof = db.driver_profiles.find(d=>d.user_id===user.id);
      if(!prof) return send(res,404,{detail:'Driver profile required'});
      const lat = Number(body.lat ?? body.latitude);
      const lng = Number(body.lng ?? body.longitude);
      if(!Number.isFinite(lat) || !Number.isFinite(lng)) return send(res,400,{detail:'Real GPS location required. Please allow Location permission.'});
      const coords = {lat:Math.round(lat*1000000)/1000000,lng:Math.round(lng*1000000)/1000000};
      const nearby = nearbyPlaces(db, coords.lat, coords.lng, 8);
      const inside = isInsideServiceArea(db, coords);
      const nearest = nearby[0] || null;
      const locationName = String(nearest?.name || (inside ? (db.service_area?.name || 'Kalna Sub-Division') : 'Outside Service Area'));
      prof.lat = coords.lat; prof.lng = coords.lng;
      prof.last_location_at = now();
      prof.gps_status = inside ? 'RUNNING' : 'OUTSIDE_SERVICE_AREA';
      prof.gps_running = !!inside;
      prof.gps_last_accuracy = Number(body.accuracy || 0);
      prof.location = locationName;
      prof.area = locationName;
      const loc = upsertLocation(db,user,{lat:coords.lat,lng:coords.lng,accuracy:body.accuracy,source:'DRIVER_GPS_CHECK',location:locationName,online:prof.online});
      const health = {...driverGpsHealth(db,prof), running:!!inside, status:inside?'RUNNING':'OUTSIDE_SERVICE_AREA', location_name:locationName, nearest, status_text: inside ? `GPS Running · ${locationName}` : `GPS Outside Service Area · ${locationName}`};
      audit(db,user.id,'DRIVER_CHECK_GPS','driver_profile',prof.id,{coords,inside,location_name:locationName});
      saveDb(db);
      return send(res,200,{ok:true, driver_profile:prof, location:loc, gps_health:health, nearest, inside_service_area:inside});
    }

    if(method==='POST' && (pathname==='/api/driver/online' || pathname==='/api/driver/go-online' || pathname==='/api/driver/go-offline' || pathname==='/api/driver/location-update')){
      const user = requireUser(req,res,db); if(!user) return;
      const body = await getBody(req);
      let prof = db.driver_profiles.find(d=>d.user_id===user.id);
      if(!prof) return send(res,400,{detail:'Driver profile required'});
      const wantsOnline = pathname==='/api/driver/go-online' ? true : pathname==='/api/driver/go-offline' ? false : pathname==='/api/driver/location-update' ? !!prof.online : !!body.online;
      if(wantsOnline || pathname==='/api/driver/location-update'){
        if(wantsOnline) autoApproveDriverKycIfEligible(db, prof, user, body);
        const elig = driverOnlineEligibility(prof);
        if(!elig.ok) return send(res,403,{detail:elig.detail, online_eligible:elig, kyc_status:prof.kyc_status, status:prof.status, auto_approval_hint:'Complete KYC + allow GPS inside service area for automatic approval'});
        const onlineCoords = coordsFromRequestOrProfile(body, prof);
        if(!onlineCoords) return send(res,400,{detail:'GPS location required before Go Online. Press Check GPS and allow location permission.'});
        if(!isInsideServiceArea(db, onlineCoords)) return send(res,403,{detail:'আপনি service area-এর বাইরে আছেন। লোকাল area-এর ভিতরে এসে Go Online করুন।', gps_health:driverGpsHealth(db,{...prof, lat:onlineCoords.lat, lng:onlineCoords.lng})});
        const nearForOnline = nearbyPlaces(db, onlineCoords.lat, onlineCoords.lng, 1)[0];
        if(nearForOnline?.name && (!body.location || body.location==='Kalna')) body.location = nearForOnline.name;
        if(pathname==='/api/driver/location-update' && !prof.online) return send(res,409,{detail:'Driver is offline. Go Online first.'});
      }
      prof.online = !!wantsOnline;
      prof.location = String(body.location||prof.location||'Kalna');
      if(prof.online && !prof.online_since) prof.online_since = now();
      if(!prof.online){ prof.online_since = null; prof.offline_at = now(); }
      prof.last_online_at = now();
      prof.last_seen_at = now();
      const src = pathname==='/api/driver/location-update' ? (body.source||'DRIVER_LOCATION_HEARTBEAT') : (prof.online?'DRIVER_GO_ONLINE':'DRIVER_GO_OFFLINE');
      const loc = upsertLocation(db,user,{...body, online:prof.online, location:prof.location, source:src});
      if(loc){ prof.lat = loc.lat; prof.lng = loc.lng; prof.last_location_at = loc.updated_at; }
      notifyAdmins(db,{event_type:prof.online?'DRIVER_ONLINE':'DRIVER_OFFLINE', priority:'NORMAL', title:prof.online?'Driver Online':'Driver Offline', message:`${user.name||'Driver'} is ${prof.online?'online':'offline'} · ${prof.location}`, area:prof.area||prof.location||'Kalna', data:{driver_profile_id:prof.id, lat:prof.lat, lng:prof.lng}});
      audit(db,user.id,prof.online?'DRIVER_GO_ONLINE':'DRIVER_GO_OFFLINE','driver_profile',prof.id,{lat:prof.lat,lng:prof.lng,source:src});
      saveDb(db);
      return send(res,200,{ok:true,driver_profile:prof, location:loc, online_eligible:driverOnlineEligibility(prof), gps_health:driverGpsHealth(db,prof)});
    }

    if(method==='POST' && pathname==='/api/fare/estimate'){
      const user = requireUser(req,res,db); if(!user) return;
      const body = await getBody(req);
      const est = estimateFare(db, body.pickup, body.drop, body.ride_type, body.seats);
      return send(res,200,{ok:true, ...est});
    }


    if(method==='GET' && pathname==='/api/payments/options'){
      const user = requireUser(req,res,db); if(!user) return;
      return send(res,200,{ok:true, payment:paymentOptions(db)});
    }

    if(method==='POST' && pathname==='/api/payments/create-order'){
      const user = requireUser(req,res,db); if(!user) return;
      const body = await getBody(req);
      const ride = db.rides.find(r=>r.id===String(body.ride_id||''));
      if(!ride) return send(res,404,{detail:'Ride not found'});
      if(ride.passenger_id!==user.id) return send(res,403,{detail:'Only passenger can create payment order'});
      if(ride.status!=='DRIVER_ACCEPTED') return send(res,409,{detail:'Driver accept করার পর payment order create হবে'});
      if(ride.payment_due_at && new Date(ride.payment_due_at).getTime() < Date.now()){
        ride.status='PAYMENT_TIMEOUT'; ride.payment_status='EXPIRED'; ride.expired_at=now(); saveDb(db);
        return send(res,409,{detail:'Payment time expired. Please book again.'});
      }
      const payOpts = paymentOptions(db);
      let order = (db.payment_orders||[]).find(o=>o.ride_id===ride.id && ['CREATED','PENDING'].includes(o.status));
      if(!order){
        order = createPaymentOrder(db, ride, user, 'PASSENGER_APP');
        if(payOpts.provider === 'RAZORPAY' && payOpts.razorpay_enabled){
          try{
            const rp = await createRazorpayGatewayOrder(ride,user);
            order.razorpay_order_id = rp.id || order.razorpay_order_id;
            order.razorpay_amount = rp.amount || Math.round(Number(order.amount||0)*100);
            order.razorpay_currency = rp.currency || payOpts.currency || 'INR';
            order.razorpay_status = rp.status || 'created';
            order.status = 'CREATED';
            order.note = 'Razorpay order created. Verify signature before confirming ride.';
          }catch(e){
            order.status='FAILED'; order.error=e.message; saveDb(db);
            return send(res,502,{detail:'Razorpay order create failed: '+e.message});
          }
        }
      }
      audit(db,user.id,'PAYMENT_ORDER_CREATE','payment_order',order.id,{ride_id:ride.id, amount:order.amount, provider:order.provider, razorpay_order_id:order.razorpay_order_id||''});
      saveDb(db);
      return send(res,200,{ok:true, order, payment:paymentOptions(db), ride:rideDto(ride,db,user)});
    }

    const paymentVerifyMatch = pathname.match(/^\/api\/payments\/([^/]+)\/verify$/);
    if(method==='POST' && paymentVerifyMatch){
      const user = requireUser(req,res,db); if(!user) return;
      const order = (db.payment_orders||[]).find(o=>o.id===paymentVerifyMatch[1]);
      if(!order) return send(res,404,{detail:'Payment order not found'});
      const ride = db.rides.find(r=>r.id===order.ride_id);
      if(!ride) return send(res,404,{detail:'Linked ride not found'});
      if(ride.passenger_id!==user.id && !isAdminRole(user)) return send(res,403,{detail:'Only passenger/admin can verify this payment'});
      const body = await getBody(req);
      const provider = String(order.provider || paymentProviderMode(db)).toUpperCase();
      let txn = String(body.transaction_id || body.razorpay_payment_id || body.payment_ref || '').trim();
      try{
        if(provider === 'RAZORPAY'){
          const rpOrderId = String(body.razorpay_order_id || order.razorpay_order_id || '').trim();
          const rpPaymentId = String(body.razorpay_payment_id || '').trim();
          const rpSignature = String(body.razorpay_signature || '').trim();
          if(!rpOrderId || !rpPaymentId || !rpSignature) return send(res,400,{detail:'Razorpay payment_id/order_id/signature required'});
          if(order.razorpay_order_id && rpOrderId !== order.razorpay_order_id) return send(res,400,{detail:'Razorpay order mismatch'});
          if(!verifyRazorpayPaymentSignature(rpOrderId, rpPaymentId, rpSignature)) return send(res,400,{detail:'Razorpay signature verification failed'});
          txn = rpPaymentId;
          order.razorpay_order_id = rpOrderId;
          order.razorpay_payment_id = rpPaymentId;
          order.razorpay_signature_verified = true;
        }else if(provider !== 'DEMO' && !txn){
          return send(res,400,{detail:'Payment transaction/reference required'});
        }
        order.status='PAID'; order.transaction_id = txn || ('DEMO-' + Date.now()); order.payment_method=String(body.payment_method||order.payment_method||(provider==='RAZORPAY'?'RAZORPAY_CHECKOUT':'DEMO_PAYMENT')); order.paid_at=now(); order.verified_at=now(); order.verified_by=user.id;
        confirmRidePayment(db, ride, user, {provider, transaction_id:order.transaction_id, payment_method:order.payment_method});
      }catch(e){ saveDb(db); return send(res,409,{detail:e.message}); }
      saveDb(db);
      return send(res,200,{ok:true, order, ride:rideDto(ride,db,user)});
    }

    if(method==='POST' && pathname==='/api/rides'){
      const user = requireUser(req,res,db); if(!user) return;
      const body = await getBody(req);
      const pickup = String(body.pickup||'').trim();
      const drop = String(body.drop||'').trim();
      const ride_type = String(body.ride_type||'FULL').toUpperCase()==='SHARING'?'SHARING':'FULL';
      if(!pickup || !drop) return send(res,400,{detail:'Pickup and drop required'});
      const fare = estimateFare(db,pickup,drop,ride_type,body.seats);
      if(db.service_area?.geofence_enabled && fare.geofence && !fare.geofence.inside) return send(res,400,{detail:'NEXO Ride এখন শুধু Kalna Sub-Division service area-এর মধ্যে চলছে', geofence:fare.geofence});
      const pickup_coords = fare.pickup_coords || placeCoords(pickup);
      const drop_coords = fare.drop_coords || placeCoords(drop);
      const passenger_loc = upsertLocation(db,user,{lat:body.lat,lng:body.lng,accuracy:body.accuracy,location:pickup,source:'PASSENGER_BOOKING'}) || {lat:pickup_coords.lat,lng:pickup_coords.lng};
      const drivers = nearestAvailableDrivers(db, pickup_coords, {max_radius_km: body.max_radius_km, max_drivers: body.max_drivers});
      const driverUsers = drivers.map(d=>db.users.find(u=>u.id===d.user_id)).filter(Boolean);
      const ride = {
        id:uid('ride'), passenger_id:user.id, driver_id:null, status:'REQUESTED',
        pickup, drop, pickup_coords, drop_coords, passenger_location:passenger_loc, ride_type, ...fare, nearby_driver_count:drivers.length,
        driver_candidate_ids: drivers.map(d=>d.user_id), driver_candidate_profile_ids: drivers.map(d=>d.id), rejected_driver_ids: [], match_radius_km: Number(body.max_radius_km || db.service_area?.driver_matching_radius_km || process.env.DRIVER_MATCH_RADIUS_KM || 8), matching_status: drivers.length ? 'DRIVER_REQUEST_SENT' : 'NO_ONLINE_DRIVER',
        created_at:now(), accepted_at:null, payment_due_at:null, payment_hold_seconds:PAYMENT_HOLD_SECONDS, paid_at:null, confirmed_at:null, arrived_at:null, started_at:null, completed_at:null, cancelled_at:null, expired_at:null, payment_status:'PENDING', ride_otp:null, otp_verified_at:null
      };
      db.rides.push(ride);
      if(driverUsers.length){
        notifyUsers(db, driverUsers, {event_type:'RIDE_REQUEST', priority:'HIGH', ride_id:ride.id, title:'New Toto Request', message:`${pickup} → ${drop} · ₹${fare.estimated_fare}`, area:user.area||'Kalna', data:{candidate_count:driverUsers.length, pickup, drop, fare:fare.estimated_fare}});
      }
      notifyUsers(db, notificationTargets(db,{user_id:user.id}), {event_type:'RIDE_SEARCHING', priority:'NORMAL', ride_id:ride.id, title:drivers.length?'Driver Request Sent':'No Online Driver', message:drivers.length?`${drivers.length} nearby driver-কে request পাঠানো হয়েছে।`:'এখন কাছাকাছি online driver নেই। একটু পরে আবার চেষ্টা করুন।'});
      notifyAdmins(db,{event_type:'RIDE_REQUEST_ADMIN', priority:'NORMAL', ride_id:ride.id, title:'New Booking Requested', message:`${pickup} → ${drop} · ${ride_type} · ₹${fare.estimated_fare} · candidates ${drivers.length}`, area:user.area||'Kalna'});
      audit(db,user.id,'RIDE_REQUEST_MATCHING','ride',ride.id,{pickup,drop,ride_type,candidates:drivers.map(d=>({user_id:d.user_id,km:d.distance_to_pickup_km}))});
      saveDb(db);
      return send(res,200,{ok:true, ride:rideDto(ride,db,user), matching:{status:ride.matching_status, candidate_count:drivers.length, radius_km:ride.match_radius_km}, nearby_drivers:drivers.map(d=>({id:d.id, user_id:d.user_id, location:d.location, lat:d.lat, lng:d.lng, distance_to_pickup_km:d.distance_to_pickup_km, rating:d.rating, total_rides:d.total_rides}))});
    }

    if(method==='GET' && pathname==='/api/rides'){
      const user = requireUser(req,res,db); if(!user) return;
      const role = url.searchParams.get('role') || user.role;
      let rides;
      if(isAdminRole(user)){
        rides = filterRidesForAdmin(db,user,db.rides).slice(-100).reverse();
      } else if(String(role).toUpperCase()==='DRIVER'){
        const prof = db.driver_profiles.find(d=>d.user_id===user.id);
        rides = db.rides.filter(r=>{
          if(r.driver_id===user.id) return true;
          if(r.status!=='REQUESTED' || r.driver_id) return false;
          if(Array.isArray(r.rejected_driver_ids) && r.rejected_driver_ids.includes(user.id)) return false;
          if(Array.isArray(r.driver_candidate_ids) && r.driver_candidate_ids.length) return r.driver_candidate_ids.includes(user.id);
          return prof && driverOnlineEligibility(prof).ok && prof.online;
        }).slice(-50).reverse();
      } else {
        rides = db.rides.filter(r=>r.passenger_id===user.id).slice(-50).reverse();
      }
      return send(res,200,{ok:true, rides:rides.map(r=>rideDto(r,db,user))});
    }

    const liveRideMatch = pathname.match(/^\/api\/rides\/([^/]+)\/live$/);
    if(method==='GET' && liveRideMatch){
      const user = requireUser(req,res,db); if(!user) return;
      const ride = (db.rides||[]).find(r=>r.id===liveRideMatch[1]);
      if(!ride) return send(res,404,{detail:'Ride not found'});
      if(!isAdminRole(user) && ride.passenger_id!==user.id && ride.driver_id!==user.id) return send(res,403,{detail:'Only related passenger/driver can view live ride'});
      const out = rideDto(ride,db,user);
      const route = routePlan(db, ride.pickup, ride.drop, ride.ride_type, ride.seats||1);
      return send(res,200,{ok:true, ride:out, route, updated_at:now()});
    }

    const rideMatch = pathname.match(/^\/api\/rides\/([^/]+)\/(accept|reject|pay|arrive|start|complete|cancel)$/);
    if(method==='POST' && rideMatch){
      const user = requireUser(req,res,db); if(!user) return;
      const ride = db.rides.find(r=>r.id===rideMatch[1]);
      if(!ride) return send(res,404,{detail:'Ride not found'});
      const action = rideMatch[2];
      if(action==='reject'){
        const prof = db.driver_profiles.find(d=>d.user_id===user.id);
        if(!prof) return send(res,403,{detail:'Driver profile required'});
        if(ride.status!=='REQUESTED') return send(res,409,{detail:'Ride already assigned/closed'});
        ride.rejected_driver_ids = Array.isArray(ride.rejected_driver_ids) ? ride.rejected_driver_ids : [];
        if(!ride.rejected_driver_ids.includes(user.id)) ride.rejected_driver_ids.push(user.id);
        ride.driver_candidate_ids = (ride.driver_candidate_ids||[]).filter(id=>id!==user.id);
        ride.last_rejected_at = now();
        ride.matching_status = ride.driver_candidate_ids.length ? 'PARTIALLY_REJECTED' : 'WAITING_FOR_DRIVER';
        audit(db,user.id,'RIDE_REJECT','ride',ride.id,{remaining_candidates:ride.driver_candidate_ids.length});
        saveDb(db);
        return send(res,200,{ok:true, message:'Request rejected', ride:rideDto(ride,db,user)});
      }
      if(action==='accept'){
        const prof = db.driver_profiles.find(d=>d.user_id===user.id);
        if(!prof) return send(res,403,{detail:'Driver profile required'});
        const elig = driverOnlineEligibility(prof);
        if(!elig.ok) return send(res,403,{detail:elig.detail});
        if(!prof.online) return send(res,403,{detail:'Go Online required before accepting ride'});
        if(Array.isArray(ride.driver_candidate_ids) && ride.driver_candidate_ids.length && !ride.driver_candidate_ids.includes(user.id)) return send(res,403,{detail:'This ride request is not assigned to your driver app'});
        if(ride.status!=='REQUESTED') return send(res,409,{detail:'Ride already taken'});
        ride.driver_id=user.id; ride.status='DRIVER_ACCEPTED'; ride.accepted_at=now(); ride.payment_due_at = new Date(Date.now()+PAYMENT_HOLD_SECONDS*1000).toISOString(); ride.payment_hold_seconds = PAYMENT_HOLD_SECONDS; ride.matching_status='DRIVER_ACCEPTED';
        const driverUser = db.users.find(u=>u.id===user.id) || {};
        ride.driver_name = driverUser.name || ''; ride.driver_vehicle_no = prof.vehicle_no || '';
        notifyUsers(db, notificationTargets(db,{user_id:ride.passenger_id}), {event_type:'DRIVER_ACCEPTED', priority:'HIGH', ride_id:ride.id, title:'Driver Accepted', message:'Driver accepted your booking. Please pay within 3 minutes.'});
        notifyAdmins(db,{event_type:'RIDE_DRIVER_ACCEPTED_ADMIN', priority:'NORMAL', ride_id:ride.id, title:'Driver Accepted Booking', message:`${driverUser.name||'Driver'} accepted ${ride.pickup} → ${ride.drop}`, area:prof.area||prof.location||'Kalna'});
      }
      if(action==='pay'){
        if(ride.passenger_id!==user.id) return send(res,403,{detail:'Only passenger can pay'});
        const body = await getBody(req);
        try{
          const order = createPaymentOrder(db, ride, user, 'LEGACY_PAY_ACTION');
          order.status='PAID'; order.transaction_id=String(body.transaction_id||body.payment_ref||('DEMO-' + Date.now())); order.payment_method=String(body.payment_method||order.payment_method||'DEMO_PAYMENT'); order.paid_at=now(); order.verified_at=now(); order.verified_by=user.id;
          confirmRidePayment(db, ride, user, {provider:order.provider, transaction_id:order.transaction_id, payment_method:order.payment_method});
        }catch(e){ saveDb(db); return send(res,409,{detail:e.message}); }
      }
      if(action==='arrive'){
        if(ride.driver_id!==user.id) return send(res,403,{detail:'Only assigned driver can update pickup'});
        if(ride.status!=='CONFIRMED') return send(res,409,{detail:'Booking must be confirmed before pickup reached'});
        ride.status='ARRIVED'; ride.arrived_at=now();
        notifyUsers(db, notificationTargets(db,{user_id:ride.passenger_id}), {event_type:'DRIVER_ARRIVED', priority:'HIGH', ride_id:ride.id, title:'Driver Reached Pickup', message:'Your Toto has reached the pickup point.'});
      }
      if(action==='start'){
        if(ride.driver_id!==user.id) return send(res,403,{detail:'Only assigned driver can start'});
        if(ride.status!=='ARRIVED') return send(res,409,{detail:'Tap Reached Pickup before starting ride'});
        const body = await getBody(req);
        if(ride.ride_otp && String(body.otp||'').trim() !== String(ride.ride_otp)){
          return send(res,409,{detail:'Passenger OTP ভুল। সঠিক 4-digit OTP দিন।'});
        }
        ride.status='STARTED'; ride.started_at=now(); ride.otp_verified_at=now();
        notifyUsers(db, notificationTargets(db,{user_id:ride.passenger_id}), {event_type:'RIDE_STARTED', priority:'NORMAL', ride_id:ride.id, title:'Ride Started', message:'OTP verified. Ride started safely.'});
      }
      if(action==='complete'){
        if(ride.driver_id!==user.id) return send(res,403,{detail:'Only assigned driver can complete'});
        if(ride.status!=='STARTED') return send(res,409,{detail:'Ride must be started before completion'});
        ride.status='COMPLETED'; ride.completed_at=now();
        const commissionRate = Number(db.fare_rules.platform_commission_percent || 10);
        const totalFare = Number(ride.estimated_fare || 0);
        const commission = Math.round(totalFare * commissionRate) / 100;
        const earning = Math.max(0, Math.round((totalFare - commission) * 100) / 100);
        ride.platform_commission = commission;
        ride.driver_earning = earning;
        ride.settlement_status = ride.settlement_status || 'PENDING';
        notifyUsers(db, notificationTargets(db,{user_id:ride.passenger_id}), {event_type:'RIDE_COMPLETED', priority:'NORMAL', ride_id:ride.id, title:'Ride Completed', message:'Please rate your driver.'});
        notifyAdmins(db,{event_type:'RIDE_COMPLETED_ADMIN', priority:'NORMAL', ride_id:ride.id, title:'Ride Completed', message:`Fare ₹${ride.estimated_fare} · payout settlement pending`});
        const prof = db.driver_profiles.find(d=>d.user_id===user.id);
        if(prof){
          prof.total_rides = (prof.total_rides||0)+1;
          prof.total_earnings = Math.round((Number(prof.total_earnings||0) + earning) * 100) / 100;
          prof.pending_payout = Math.round((Number(prof.pending_payout||0) + earning) * 100) / 100;
          allocateSubAdminCommission(db, ride, prof);
        }
      }
      if(action==='cancel'){
        const body = await getBody(req);
        const actorIsAdmin = isAdminRole(user);
        if(!actorIsAdmin && ride.passenger_id!==user.id && ride.driver_id!==user.id) return send(res,403,{detail:'Only related passenger/driver can cancel'});
        const currentStatus = String(ride.status||'').toUpperCase();
        if(['COMPLETED','CANCELLED','PAYMENT_TIMEOUT'].includes(currentStatus)) return send(res,409,{detail:'এই ride আর cancel করা যাবে না'});
        if(currentStatus==='STARTED' && !actorIsAdmin) return send(res,409,{detail:'Ride start হয়ে গেলে app থেকে cancel নয়; support/SOS ব্যবহার করুন'});
        if(currentStatus==='REQUESTED' && ride.driver_id && ride.driver_id!==user.id && ride.passenger_id!==user.id && !actorIsAdmin) return send(res,403,{detail:'Not allowed'});
        ride.previous_status = currentStatus;
        ride.status='CANCELLED';
        ride.cancelled_at=now();
        ride.cancelled_by=user.id;
        ride.cancelled_by_role=user.role;
        ride.cancel_reason=String(body.reason||body.cancel_reason||'User cancelled from app').slice(0,250);
        ride.cancellation_fee=0;
        if(String(ride.payment_status||'').toUpperCase()==='PAID'){
          ride.refund_status = ride.refund_status || 'REFUND_REQUIRED';
          db.refund_requests = db.refund_requests || [];
          if(!db.refund_requests.find(x=>x.ride_id===ride.id && ['REQUESTED','UNDER_REVIEW','APPROVED'].includes(String(x.status||'')))){
            db.refund_requests.push({id:uid('ref'), ride_id:ride.id, user_id:ride.passenger_id, amount:Number(ride.estimated_fare||0), reason:'Ride cancelled after payment', status:'REQUESTED', created_at:now(), area:ride.area||'Kalna'});
          }
        } else {
          ride.refund_status = 'NOT_REQUIRED';
        }
        notifyUsers(db, notificationTargets(db,{user_id:ride.passenger_id}), {event_type:'RIDE_CANCELLED', priority:'HIGH', ride_id:ride.id, title:'Ride Cancelled', message:`Ride cancelled: ${ride.cancel_reason}`});
        if(ride.driver_id) notifyUsers(db, notificationTargets(db,{user_id:ride.driver_id}), {event_type:'RIDE_CANCELLED', priority:'HIGH', ride_id:ride.id, title:'Ride Cancelled', message:`Ride cancelled: ${ride.cancel_reason}`});
        notifyAdmins(db,{event_type:'RIDE_CANCELLED_ADMIN', priority:'NORMAL', ride_id:ride.id, title:'Ride Cancelled', message:`${ride.pickup||''} → ${ride.drop||''} · ${currentStatus} · ${ride.cancel_reason}`});
      }
      audit(db,user.id,'RIDE_'+action.toUpperCase(),'ride',ride.id,{});
      saveDb(db);
      return send(res,200,{ok:true,ride:rideDto(ride,db,user)});
    }
 

    const rideRateMatch = pathname.match(/^\/api\/rides\/([^/]+)\/rate$/);
    if(method==='POST' && rideRateMatch){
      const user = requireUser(req,res,db); if(!user) return;
      const ride = db.rides.find(r=>r.id===rideRateMatch[1]);
      if(!ride) return send(res,404,{detail:'Ride not found'});
      if(ride.passenger_id!==user.id) return send(res,403,{detail:'Only passenger can rate this ride'});
      if(ride.status!=='COMPLETED') return send(res,409,{detail:'Ride complete না হলে rating দেওয়া যাবে না'});
      const body = await getBody(req);
      const rating = Math.max(1, Math.min(5, Number(body.rating||5)));
      ride.rating_by_passenger = rating;
      ride.rating_comment = String(body.comment||'').slice(0,200);
      ride.rated_at = now();
      const prof = db.driver_profiles.find(d=>d.user_id===ride.driver_id);
      if(prof){
        const rated = db.rides.filter(x=>x.driver_id===ride.driver_id && x.rating_by_passenger);
        const avg = rated.reduce((a,x)=>a+Number(x.rating_by_passenger||0),0) / Math.max(1,rated.length);
        prof.rating = Math.round(avg*10)/10;
      }
      audit(db,user.id,'RIDE_RATE','ride',ride.id,{rating});
      saveDb(db);
      return send(res,200,{ok:true, ride:rideDto(ride,db,user), driver_profile:prof||null});
    }

    if(method==='GET' && pathname==='/api/driver/earnings'){
      const user = requireUser(req,res,db); if(!user) return;
      if(user.role!=='DRIVER') return send(res,403,{detail:'Driver only'});
      const prof = db.driver_profiles.find(d=>d.user_id===user.id) || {};
      const rides = db.rides.filter(r=>r.driver_id===user.id && r.status==='COMPLETED').slice(-100).reverse();
      const todayStr = new Date().toISOString().slice(0,10);
      const today = rides.filter(r=>String(r.completed_at||'').slice(0,10)===todayStr).reduce((a,r)=>a+Number(r.driver_earning||0),0);
      const total = rides.reduce((a,r)=>a+Number(r.driver_earning||0),0);
      const commission = rides.reduce((a,r)=>a+Number(r.platform_commission||0),0);
      const settlements = (db.settlements||[]).filter(s=>s.driver_id===user.id).slice(-20).reverse();
      return send(res,200,{ok:true, summary:{total_earnings:Math.round(total*100)/100, today_earnings:Math.round(today*100)/100, pending_payout:Number(prof.pending_payout||0), paid_payout:Number(prof.paid_payout||0), total_rides:rides.length, rating:Number(prof.rating||5), platform_commission:Math.round(commission*100)/100}, rides:rides.map(r=>rideDto(r,db,user)), settlements});
    }




    if(method==='GET' && pathname==='/api/subadmin/payout-requests'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Sub Admin only'});
      return send(res,200,{ok:true, requests:subAdminPayoutRequestList(db,user), summary:subAdminCommissionSummary(db,user).summary});
    }

    if(method==='POST' && pathname==='/api/subadmin/payout-request'){
      const user = requireUser(req,res,db); if(!user) return;
      if(user.role !== 'SUB_ADMIN') return send(res,403,{detail:'Only Sub Admin can request payout'});
      const body = await getBody(req);
      const pending = (db.sub_admin_commissions||[]).filter(x=>x.sub_admin_user_id===user.id && x.status!=='PAID');
      if(!pending.length) return send(res,409,{detail:'No pending commission available for payout request'});
      const open = (db.sub_admin_payout_requests||[]).find(x=>x.sub_admin_user_id===user.id && x.status==='REQUESTED');
      if(open) return send(res,409,{detail:'One payout request is already pending'});
      const amount = Math.round(pending.reduce((a,x)=>a+Number(x.amount||0),0)*100)/100;
      const request = {id:uid('sapr'), sub_admin_user_id:user.id, amount, commission_ids:pending.map(x=>x.id), status:'REQUESTED', note:String(body.note||'Sub Admin payout requested'), area:adminScopeArea(db,user)||'Kalna', requested_at:now()};
      db.sub_admin_payout_requests.push(request);
      audit(db,user.id,'SUB_ADMIN_PAYOUT_REQUEST','sub_admin',user.id,{request_id:request.id, amount});
      saveDb(db);
      return send(res,200,{ok:true, request, requests:subAdminPayoutRequestList(db,user), summary:subAdminCommissionSummary(db,user).summary});
    }

    if(method==='GET' && pathname==='/api/admin/subadmin-payout-requests'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      return send(res,200,{ok:true, requests:subAdminPayoutRequestList(db,user), summary:subAdminCommissionSummary(db,user).summary});
    }

    const subAdminRequestPayMatch = pathname.match(/^\/api\/admin\/subadmin-payout-requests\/([^/]+)\/pay$/);
    if(method==='POST' && subAdminRequestPayMatch){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main admin only'});
      const reqId = subAdminRequestPayMatch[1];
      const payoutRequest = (db.sub_admin_payout_requests||[]).find(x=>x.id===reqId);
      if(!payoutRequest) return send(res,404,{detail:'Payout request not found'});
      if(payoutRequest.status==='PAID') return send(res,409,{detail:'This payout request is already paid'});
      const body = await getBody(req);
      const subAdminUserId = payoutRequest.sub_admin_user_id;
      const pending = (db.sub_admin_commissions||[]).filter(x=>x.sub_admin_user_id===subAdminUserId && x.status!=='PAID');
      if(!pending.length) return send(res,409,{detail:'No pending Sub Admin commission'});
      const amount = Math.round(pending.reduce((a,x)=>a+Number(x.amount||0),0)*100)/100;
      const settlement = {id:uid('sacs'), sub_admin_user_id:subAdminUserId, amount, commission_ids:pending.map(x=>x.id), request_id:reqId, payment_ref:String(body.payment_ref||'Manual Sub Admin payout'), note:String(body.note||'Sub Admin payout request paid'), paid_at:now(), paid_by:user.id};
      db.sub_admin_commission_settlements.push(settlement);
      for(const x of pending){ x.status='PAID'; x.settlement_id=settlement.id; x.paid_at=settlement.paid_at; }
      payoutRequest.status='PAID'; payoutRequest.settlement_id=settlement.id; payoutRequest.paid_at=settlement.paid_at; payoutRequest.payment_ref=settlement.payment_ref; payoutRequest.paid_amount=amount;
      const p = subAdminProfile(db,subAdminUserId);
      if(p){ p.pending_commission=Math.max(0, Math.round((Number(p.pending_commission||0)-amount)*100)/100); p.paid_commission=Math.round((Number(p.paid_commission||0)+amount)*100)/100; p.last_paid_at=settlement.paid_at; }
      audit(db,user.id,'SUB_ADMIN_PAYOUT_REQUEST_PAID','sub_admin',subAdminUserId,{request_id:reqId, settlement_id:settlement.id, amount});
      saveDb(db);
      return send(res,200,{ok:true, settlement, request:payoutRequest, requests:subAdminPayoutRequestList(db,user), summary:subAdminCommissionSummary(db,user)});
    }

    if(method==='GET' && pathname==='/api/admin/subadmins'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const list = (db.sub_admins||[]).filter(p=>isMainAdmin(user) || p.user_id===user.id).map(p=>{
        const u = db.users.find(x=>x.id===p.user_id) || {};
        return {...p, name:u.name||'', mobile:u.mobile||'', email:u.email||''};
      });
      return send(res,200,{ok:true, sub_admins:list, default_share_percent:db.fare_rules.sub_admin_share_percent});
    }

    if(method==='POST' && pathname==='/api/admin/subadmins'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main admin only'});
      const body = await getBody(req);
      const name = String(body.name||'').trim();
      const mobile = String(body.mobile||'').trim();
      const email = String(body.email||'').trim();
      const area = String(body.area||'Kalna').trim();
      const password = String(body.password||'123456');
      if(!name || !mobile || password.length<6) return send(res,400,{detail:'Sub Admin name, mobile and 6+ digit password required'});
      if(findUser(db,mobile) || (email && findUser(db,email))) return send(res,409,{detail:'Sub Admin account already exists'});
      const saltValue = salt();
      const subUser = {id:uid('usr'), name, mobile, email, role:'SUB_ADMIN', nexo_id:'NEXO-SUBADMIN', area, status:'ACTIVE', created_at:now(), consent_at:now(), consent_version:'v1', added_by:user.id, password_salt:saltValue, password_hash:hashPassword(password,saltValue)};
      db.users.push(subUser);
      const profile = {id:uid('sub'), user_id:subUser.id, area, status:'ACTIVE', commission_share_percent:Number(body.commission_share_percent ?? db.fare_rules.sub_admin_share_percent ?? 30), total_commission:0, pending_commission:0, paid_commission:0, created_at:now(), created_by:user.id};
      db.sub_admins.push(profile);
      audit(db,user.id,'SUB_ADMIN_CREATE','sub_admin',profile.id,{area, share:profile.commission_share_percent});
      saveDb(db);
      return send(res,200,{ok:true, user:safeUser(subUser), sub_admin:profile});
    }

    if(method==='GET' && pathname==='/api/admin/subadmin-commissions'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      return send(res,200,{ok:true, ...subAdminCommissionSummary(db,user)});
    }

    const subAdminPayMatch = pathname.match(/^\/api\/admin\/subadmin-commissions\/([^/]+)\/pay$/);
    if(method==='POST' && subAdminPayMatch){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main admin only'});
      const subAdminUserId = subAdminPayMatch[1];
      const body = await getBody(req);
      const pending = (db.sub_admin_commissions||[]).filter(x=>x.sub_admin_user_id===subAdminUserId && x.status!=='PAID');
      if(!pending.length) return send(res,409,{detail:'No pending Sub Admin commission'});
      const amount = Math.round(pending.reduce((a,x)=>a+Number(x.amount||0),0)*100)/100;
      const settlement = {id:uid('sacs'), sub_admin_user_id:subAdminUserId, amount, commission_ids:pending.map(x=>x.id), payment_ref:String(body.payment_ref||'Manual Sub Admin payout'), note:String(body.note||'Sub Admin commission paid'), paid_at:now(), paid_by:user.id};
      db.sub_admin_commission_settlements.push(settlement);
      for(const x of pending){ x.status='PAID'; x.settlement_id=settlement.id; x.paid_at=settlement.paid_at; }
      const p = subAdminProfile(db,subAdminUserId);
      if(p){ p.pending_commission=Math.max(0, Math.round((Number(p.pending_commission||0)-amount)*100)/100); p.paid_commission=Math.round((Number(p.paid_commission||0)+amount)*100)/100; p.last_paid_at=settlement.paid_at; }
      for(const pr of (db.sub_admin_payout_requests||[]).filter(x=>x.sub_admin_user_id===subAdminUserId && x.status==='REQUESTED')){ pr.status='PAID'; pr.settlement_id=settlement.id; pr.paid_at=settlement.paid_at; pr.payment_ref=settlement.payment_ref; pr.paid_amount=amount; }
      audit(db,user.id,'SUB_ADMIN_COMMISSION_PAID','sub_admin',subAdminUserId,{settlement_id:settlement.id, amount});
      saveDb(db);
      return send(res,200,{ok:true, settlement, summary:subAdminCommissionSummary(db,user)});
    }

    if(method==='POST' && pathname==='/api/subadmin/users'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin/Sub Admin only'});
      const body = await getBody(req);
      const role = String(body.role||'PASSENGER').toUpperCase()==='DRIVER' ? 'DRIVER' : 'PASSENGER';
      const name = String(body.name||'').trim();
      const mobile = String(body.mobile||'').trim();
      const email = String(body.email||'').trim();
      const password = String(body.password||'123456');
      const area = String(body.area||adminScopeArea(db,user)||'Kalna').trim();
      const subAdminUserId = isMainAdmin(user) ? String(body.sub_admin_user_id||'') : user.id;
      if(!name || !mobile || password.length<6) return send(res,400,{detail:'Name, mobile and 6+ digit password required'});
      if(findUser(db,mobile) || (email && findUser(db,email))) return send(res,409,{detail:'Account already exists'});
      const saltValue = salt();
      const u = {id:uid('usr'), name, mobile, email, role, nexo_id:'', area, managed_by_subadmin_id:subAdminUserId, added_by:user.id, status:'ACTIVE', created_at:now(), consent_at:now(), consent_version:'v1', password_salt:saltValue, password_hash:hashPassword(password,saltValue)};
      db.users.push(u);
      if(role==='DRIVER'){
        db.driver_profiles.push({id:uid('drv'), user_id:u.id, vehicle_type:'TOTO', vehicle_no:String(body.vehicle_no||''), license_no:String(body.license_no||''), aadhaar_no:String(body.aadhaar_no||''), driver_photo:String(body.driver_photo||''), vehicle_photo:String(body.vehicle_photo||''), location:area, area, sub_admin_user_id:subAdminUserId, added_by:user.id, online:false, status:'PENDING', rating:5, total_rides:0, total_earnings:0, pending_payout:0, paid_payout:0, created_at:now()});
      }
      audit(db,user.id,'SUB_ADMIN_USER_CREATE','user',u.id,{role,area,subAdminUserId});
      saveDb(db);
      return send(res,200,{ok:true, user:safeUser(u), driver_profile:db.driver_profiles.find(d=>d.user_id===u.id)||null});
    }

    if(method==='GET' && pathname==='/api/subadmin/users'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin/Sub Admin only'});
      const users = filterUsersForAdmin(db,user,db.users).filter(u=>!['ADMIN','SUPER_ADMIN'].includes(u.role)).slice(-200).reverse().map(safeUser);
      return send(res,200,{ok:true, users});
    }

    if(method==='GET' && pathname==='/api/admin/settlements'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main admin only'});
      return send(res,200,{ok:true, ...settlementSummary(db)});
    }

    const adminSettlementPay = pathname.match(/^\/api\/admin\/settlements\/([^/]+)\/pay$/);
    if(method==='POST' && adminSettlementPay){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main admin only'});
      const driverId = adminSettlementPay[1];
      const body = await getBody(req);
      const pendingRides = db.rides.filter(r=>r.driver_id===driverId && r.status==='COMPLETED' && r.settlement_status!=='PAID');
      if(!pendingRides.length) return send(res,409,{detail:'No pending payout for this driver'});
      const amount = Math.round(pendingRides.reduce((a,r)=>a+Number(r.driver_earning||0),0)*100)/100;
      const settlement = {
        id:uid('set'), driver_id:driverId, amount,
        ride_count:pendingRides.length,
        ride_ids:pendingRides.map(r=>r.id),
        payment_ref:String(body.payment_ref||''),
        note:String(body.note||'Admin marked payout paid'),
        paid_by:user.id, paid_at:now(), status:'PAID'
      };
      for(const r of pendingRides){
        r.settlement_status='PAID';
        r.settlement_id=settlement.id;
        r.settled_at=settlement.paid_at;
      }
      db.settlements.push(settlement);
      const prof = db.driver_profiles.find(d=>d.user_id===driverId);
      if(prof){
        prof.pending_payout = Math.max(0, Math.round((Number(prof.pending_payout||0)-amount)*100)/100);
        prof.paid_payout = Math.round((Number(prof.paid_payout||0)+amount)*100)/100;
        prof.last_payout_at = settlement.paid_at;
      }
      audit(db,user.id,'ADMIN_PAYOUT_MARK_PAID','driver',driverId,{settlement_id:settlement.id, amount, rides:pendingRides.length});
      saveDb(db);
      return send(res,200,{ok:true, settlement, ...settlementSummary(db)});
    }

    if(method==='GET' && pathname==='/api/admin/payments'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const rides = filterRidesForAdmin(db,user,db.rides).filter(r=>r.status==='COMPLETED').slice(-200).reverse();
      const totalFare = rides.reduce((a,r)=>a+Number(r.estimated_fare||0),0);
      const driverPay = rides.reduce((a,r)=>a+Number(r.driver_earning||0),0);
      const commission = rides.reduce((a,r)=>a+Number(r.platform_commission||0),0);
      const pending = rides.filter(r=>r.settlement_status!=='PAID').reduce((a,r)=>a+Number(r.driver_earning||0),0);
      return send(res,200,{ok:true, summary:{completed:rides.length,total_fare:Math.round(totalFare*100)/100, driver_payout:Math.round(driverPay*100)/100, platform_commission:Math.round(commission*100)/100, pending_payout:Math.round(pending*100)/100}, rides:rides.map(r=>rideDto(r,db,user))});
    }


    const rideSafetyMatch = pathname.match(/^\/api\/rides\/([^/]+)\/(sos|share)$/);
    if(method==='POST' && rideSafetyMatch){
      const user = requireUser(req,res,db); if(!user) return;
      const ride = db.rides.find(r=>r.id===rideSafetyMatch[1]);
      if(!ride) return send(res,404,{detail:'Ride not found'});
      const action = rideSafetyMatch[2];
      const related = ride.passenger_id===user.id || ride.driver_id===user.id || isAdminRole(user);
      if(!related) return send(res,403,{detail:'Only related passenger/driver can use safety tools'});
      const passenger = db.users.find(u=>u.id===ride.passenger_id) || {};
      const driverUser = db.users.find(u=>u.id===ride.driver_id) || {};
      const driverProfile = db.driver_profiles.find(d=>d.user_id===ride.driver_id) || {};
      const shareText = `NEXO Ride Trip\nRoute: ${ride.pickup} to ${ride.drop}\nStatus: ${ride.status}\nFare: ₹${ride.estimated_fare}\nPassenger: ${passenger.name||''} ${passenger.mobile||''}\nDriver: ${driverUser.name||'Not assigned'} ${driverUser.mobile||''} ${driverProfile.vehicle_no?('Toto: '+driverProfile.vehicle_no):''}\nSupport: ${db.app_settings.support_mobile}`;
      if(action==='share'){
        return send(res,200,{ok:true, share_text:shareText, support_mobile:db.app_settings.support_mobile, support_email:db.app_settings.support_email});
      }
      const body = await getBody(req);
      const event = {
        id:uid('sos'), ride_id:ride.id, user_id:user.id, user_role:user.role,
        reason:String(body.reason||'SOS pressed from app'), location:String(body.location||'Kalna Sub-Division'),
        status:'OPEN', created_at:now(), support_mobile:db.app_settings.support_mobile,
        ride_status:ride.status
      };
      db.safety_events.push(event);
      notifyAdmins(db,{event_type:'SOS_ALERT', priority:'CRITICAL', ride_id:ride.id, title:'SOS Alert', message:`${event.reason} · Ride ${ride.pickup||''} → ${ride.drop||''}`, data:{sos_id:event.id}});
      ride.sos_count = (ride.sos_count||0)+1;
      ride.last_sos_at = now();
      audit(db,user.id,'RIDE_SOS','ride',ride.id,{event_id:event.id, reason:event.reason});
      saveDb(db);
      return send(res,200,{ok:true, event, support_mobile:db.app_settings.support_mobile, share_text:shareText});
    }


    if(method==='POST' && pathname==='/api/location/update'){
      const user = requireUser(req,res,db); if(!user) return;
      const body = await getBody(req);
      const loc = upsertLocation(db,user,body);
      if(!loc) return send(res,400,{detail:'Latitude/longitude or location required'});
      audit(db,user.id,'LOCATION_UPDATE','user',user.id,{lat:loc.lat,lng:loc.lng,source:loc.source});
      saveDb(db);
      return send(res,200,{ok:true, location:loc});
    }

    if(method==='GET' && pathname==='/api/live/locations'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const driverLocations = filterDriversForAdmin(db,user,db.driver_profiles).map(d=>{
        const u = db.users.find(x=>x.id===d.user_id) || {};
        const loc = db.live_locations.find(x=>x.user_id===d.user_id) || {};
        const c = (d.lat && d.lng) ? {lat:d.lat,lng:d.lng} : placeCoords(d.location || 'Kalna');
        return {driver_id:d.user_id, profile_id:d.id, name:u.name||'Driver', mobile:u.mobile||'', vehicle_no:d.vehicle_no||'', status:d.status, online:!!d.online, rating:d.rating||5, lat:loc.lat||c.lat, lng:loc.lng||c.lng, location:loc.location_name||d.location||'Kalna', updated_at:loc.updated_at||d.last_location_at||d.last_online_at||d.created_at};
      }).filter(x=>x.status==='APPROVED' || x.online);
      const activeRides = filterRidesForAdmin(db,user,db.rides).filter(r=>['REQUESTED','DRIVER_ACCEPTED','CONFIRMED','ARRIVED','STARTED'].includes(r.status)).slice(-100).reverse().map(r=>rideDto(r,db,user));
      return send(res,200,{ok:true, service_area:db.service_area.name, center:placeCoords('Kalna Station'), drivers:driverLocations, rides:activeRides, updated_at:now()});
    }



    if(method==='GET' && pathname==='/api/admin/operations'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const ops = operationsSummary(db);
      if(!isMainAdmin(user)){
        const area = user.area || '';
        ops.drivers = ops.drivers.filter(d=>!area || d.area===area || d.area===user.assigned_area);
        ops.areas = ops.areas.filter(a=>!area || a.area===area || a.area===user.assigned_area);
        ops.queue = ops.queue.filter(r=>true);
      }
      return send(res,200,{ok:true, operations:ops});
    }

    if(method==='GET' && pathname==='/api/admin/driver-kyc'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const list = filterDriversForAdmin(db,user,db.driver_profiles).map(p=>driverKycSummary(db,p)).sort((a,b)=>String(b.kyc_submitted_at||'').localeCompare(String(a.kyc_submitted_at||''))).slice(0,250);
      return send(res,200,{ok:true, drivers:list, submissions:(db.kyc_submissions||[]).slice(-100).reverse(), summary:{total:list.length, submitted:list.filter(x=>x.kyc_status==='SUBMITTED').length, under_review:list.filter(x=>x.review_status==='UNDER_ADMIN_REVIEW').length, submitted_incomplete:list.filter(x=>x.review_status==='SUBMITTED_BUT_INCOMPLETE').length, verified:list.filter(x=>x.kyc_status==='VERIFIED').length, incomplete:list.filter(x=>x.kyc_status==='INCOMPLETE').length, rejected:list.filter(x=>x.kyc_status==='REJECTED').length}});
    }

    const adminKycAction = pathname.match(/^\/api\/admin\/driver-kyc\/([^/]+)\/(verify|reject)$/);
    if(method==='POST' && adminKycAction){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const prof = db.driver_profiles.find(d=>d.id===adminKycAction[1] || d.user_id===adminKycAction[1]);
      if(!prof) return send(res,404,{detail:'Driver profile not found'});
      if(!isMainAdmin(user)){ const allowed = filterDriversForAdmin(db,user,[prof]).length>0; if(!allowed) return send(res,403,{detail:'Sub Admin can verify own area drivers only'}); }
      const body = await getBody(req);
      const action = adminKycAction[2];
      const summary = driverKycSummary(db,prof);
      if(action==='verify'){
        if(!summary.complete) return send(res,409,{detail:`KYC incomplete: ${summary.docs_present}/${summary.docs_required} documents present`});
        prof.kyc_status='VERIFIED'; prof.status='APPROVED'; prof.kyc_rejection_reason='';
        notifyUsers(db, notificationTargets(db,{user_id:prof.user_id}), {event_type:'DRIVER_KYC_VERIFIED', priority:'HIGH', title:'KYC Verified', message:'Your KYC is verified and driver profile is approved. You can go online now.'});
      }
      if(action==='reject'){
        prof.kyc_status='REJECTED'; prof.status='REJECTED'; prof.online=false;
        prof.kyc_rejection_reason=String(body.reason||'Document verification failed');
        notifyUsers(db, notificationTargets(db,{user_id:prof.user_id}), {event_type:'DRIVER_KYC_REJECTED', priority:'HIGH', title:'KYC Rejected', message:`KYC rejected: ${prof.kyc_rejection_reason}`});
      }
      prof.kyc_reviewed_at=now(); prof.kyc_reviewed_by=user.id;
      db.kyc_reviews = db.kyc_reviews || [];
      db.kyc_reviews.push({id:uid('kyc'), profile_id:prof.id, driver_user_id:prof.user_id, action:action.toUpperCase(), reason:String(body.reason||''), reviewed_by:user.id, reviewed_at:prof.kyc_reviewed_at, docs_present:summary.docs_present, docs_required:summary.docs_required});
      audit(db,user.id,'ADMIN_DRIVER_KYC_'+action.toUpperCase(),'driver_profile',prof.id,{docs_present:summary.docs_present, docs_required:summary.docs_required});
      saveDb(db);
      return send(res,200,{ok:true, kyc:driverKycSummary(db,prof)});
    }

    if(method==='GET' && pathname==='/api/admin/drivers'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const drivers = filterDriversForAdmin(db,user,db.driver_profiles).map(d=>{
        const u = db.users.find(x=>x.id===d.user_id) || {};
        return {...d, name:u.name, mobile:u.mobile, email:u.email};
      }).slice(-200).reverse();
      return send(res,200,{ok:true, drivers});
    }

    const adminDriverAction = pathname.match(/^\/api\/admin\/drivers\/([^/]+)\/(approve|reject|offline|suspend|reactivate)$/);
    if(method==='POST' && adminDriverAction){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const prof = db.driver_profiles.find(d=>d.id===adminDriverAction[1] || d.user_id===adminDriverAction[1]);
      if(!prof) return send(res,404,{detail:'Driver profile not found'});
      if(!isMainAdmin(user)){ const allowed = filterDriversForAdmin(db,user,[prof]).length>0; if(!allowed) return send(res,403,{detail:'Sub Admin can manage own area drivers only'}); }
      const action = adminDriverAction[2];
      if(action==='approve') {
        prof.status='APPROVED';
        // Sprint-6E: Profile approval from admin means driver can go online; sync KYC too.
        prof.kyc_status='VERIFIED';
        prof.kyc_rejection_reason='';
        prof.kyc_reviewed_at=now();
        prof.kyc_reviewed_by=user.id;
        prof.kyc_last_message='Admin approved profile and KYC. Driver can go online.';
        notifyUsers(db, notificationTargets(db,{user_id:prof.user_id}), {event_type:'DRIVER_APPROVED', priority:'HIGH', title:'Driver Approved', message:'Your driver profile and KYC are approved. You can go online now.'});
      }
      if(action==='reject') { prof.status='REJECTED'; prof.online=false; notifyUsers(db, notificationTargets(db,{user_id:prof.user_id}), {event_type:'DRIVER_REJECTED', priority:'HIGH', title:'Driver Rejected', message:'Your driver profile was rejected. Contact support.'}); }
      if(action==='offline') { prof.online=false; notifyUsers(db, notificationTargets(db,{user_id:prof.user_id}), {event_type:'DRIVER_OFFLINE_BY_ADMIN', priority:'NORMAL', title:'Set Offline', message:'Admin set your driver profile offline.'}); }
      if(action==='suspend') { prof.status='SUSPENDED'; prof.online=false; prof.suspended_at=now(); prof.suspended_by=user.id; notifyUsers(db, notificationTargets(db,{user_id:prof.user_id}), {event_type:'DRIVER_SUSPENDED', priority:'HIGH', title:'Driver Suspended', message:'Your driver profile is suspended by admin. Contact support.'}); }
      if(action==='reactivate') { prof.status='APPROVED'; if(String(prof.kyc_status||'').toUpperCase()!=='REJECTED') prof.kyc_status='VERIFIED'; prof.reactivated_at=now(); prof.reactivated_by=user.id; notifyUsers(db, notificationTargets(db,{user_id:prof.user_id}), {event_type:'DRIVER_REACTIVATED', priority:'HIGH', title:'Driver Reactivated', message:'Your driver profile is active again. You can go online.'}); }
      prof.admin_reviewed_at = now();
      prof.admin_reviewed_by = user.id;
      audit(db,user.id,'ADMIN_DRIVER_'+action.toUpperCase(),'driver_profile',prof.id,{});
      saveDb(db);
      return send(res,200,{ok:true, driver_profile:prof});
    }

    if(method==='POST' && pathname==='/api/admin/fare'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const body = await getBody(req);
      const keys = ['full_base_fare','sharing_base_per_seat','minimum_full','minimum_sharing','base_km','extra_step_km','extra_step_fare','sharing_capacity','night_extra_percent','platform_commission_percent','sub_admin_share_percent'];
      for(const k of keys){ if(body[k] !== undefined && !Number.isNaN(Number(body[k]))) db.fare_rules[k] = Number(body[k]); }
      if(body.currency) db.fare_rules.currency = String(body.currency).slice(0,8).toUpperCase();
      audit(db,user.id,'ADMIN_FARE_UPDATE','fare_rules','default',body);
      saveDb(db);
      return send(res,200,{ok:true, fare_rules:db.fare_rules});
    }

    if(method==='POST' && pathname==='/api/admin/service-area'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const body = await getBody(req);
      db.service_area = db.service_area || defaultDb().service_area;
      if(body.name !== undefined) db.service_area.name = String(body.name || 'Kalna Sub-Division').slice(0,80);
      if(body.geofence_enabled !== undefined) db.service_area.geofence_enabled = !!body.geofence_enabled;
      if(body.driver_auto_approve_inside_service_area !== undefined) db.service_area.driver_auto_approve_inside_service_area = !!body.driver_auto_approve_inside_service_area;
      if(body.road_distance_multiplier !== undefined && !Number.isNaN(Number(body.road_distance_multiplier))) db.service_area.road_distance_multiplier = Number(body.road_distance_multiplier);
      db.service_area.bounds = db.service_area.bounds || defaultDb().service_area.bounds;
      for(const k of ['minLat','maxLat','minLng','maxLng']){ if(body[k] !== undefined && !Number.isNaN(Number(body[k]))) db.service_area.bounds[k] = Number(body[k]); }
      if(Array.isArray(body.points)) db.service_area.points = body.points.map(x=>String(x).trim()).filter(Boolean).slice(0,100);
      audit(db,user.id,'ADMIN_SERVICE_AREA_UPDATE','service_area','default',body);
      saveDb(db);
      return send(res,200,{ok:true, service_area:db.service_area});
    }

    if(method==='GET' && pathname==='/api/admin/areas'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      return send(res,200,{ok:true, areas:db.area_catalog||[], service_area:db.service_area, fare_rules:db.fare_rules});
    }

    if(method==='POST' && pathname==='/api/admin/areas'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const body = await getBody(req);
      const name = String(body.name||'').trim();
      if(!name) return send(res,400,{detail:'Area name required'});
      db.area_catalog = db.area_catalog || [];
      const existing = db.area_catalog.find(a=>String(a.name).toLowerCase()===name.toLowerCase());
      if(existing) return send(res,409,{detail:'Area already exists'});
      const area = {id:uid('area'), name, status:String(body.status||'ACTIVE').toUpperCase(), sub_admin_user_id:body.sub_admin_user_id||null, created_at:now(), created_by:user.id};
      db.area_catalog.push(area);
      audit(db,user.id,'ADMIN_AREA_CREATE','area',area.id,area);
      saveDb(db);
      return send(res,200,{ok:true, area});
    }

    const areaAction = pathname.match(/^\/api\/admin\/areas\/([^/]+)\/(activate|deactivate)$/);
    if(method==='POST' && areaAction){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const area = (db.area_catalog||[]).find(a=>a.id===areaAction[1]);
      if(!area) return send(res,404,{detail:'Area not found'});
      area.status = areaAction[2]==='activate' ? 'ACTIVE' : 'INACTIVE';
      area.updated_at=now();
      audit(db,user.id,'ADMIN_AREA_'+area.status,'area',area.id,{});
      saveDb(db);
      return send(res,200,{ok:true, area});
    }

    if(method==='POST' && pathname==='/api/notifications/register-token'){
      const user = requireUser(req,res,db); if(!user) return;
      const body = await getBody(req);
      db.push_tokens = db.push_tokens || [];
      const raw = String(body.token || body.fcm_token || '').trim();
      const platform = String(body.platform || 'WEB').toUpperCase();
      if(!raw) return send(res,400,{detail:'Token required'});
      let item = db.push_tokens.find(x=>x.user_id===user.id && x.token===raw);
      if(!item){ item={id:uid('ptk'), user_id:user.id, token:raw, created_at:now()}; db.push_tokens.push(item); }
      item.platform = platform;
      item.device_name = String(body.device_name || req.headers['user-agent'] || 'Device').slice(0,120);
      item.device_id = String(body.device_id || item.device_id || '').slice(0,80);
      item.permission_status = String(body.permission_status || item.permission_status || 'unknown').slice(0,30);
      item.app_version = String(body.app_version || VERSION).slice(0,80);
      item.area = user.area || item.area || 'Kalna';
      item.last_seen_at = now();
      item.updated_at = now(); item.active=true;
      audit(db,user.id,'PUSH_TOKEN_REGISTER','push_token',item.id,{platform});
      saveDb(db);
      return send(res,200,{ok:true, token:{id:item.id, platform:item.platform, active:item.active}, demo_mode:!mergeIntegrations(db.integrations).push.fcm_server_key_present});
    }

    if(method==='GET' && pathname==='/api/notifications'){
      const user = requireUser(req,res,db); if(!user) return;
      const items = notificationsForUser(db,user,Number(url.searchParams.get('limit')||80));
      return send(res,200,{ok:true, unread:items.filter(x=>!x.read).length, notifications:items});
    }

    if(method==='POST' && pathname==='/api/notifications/read-all'){
      const user = requireUser(req,res,db); if(!user) return;
      let count=0;
      for(const n of notificationsForUser(db,user,500)){
        const real = (db.notifications||[]).find(x=>x.id===n.id); if(!real) continue;
        real.read_by = Array.isArray(real.read_by)?real.read_by:[];
        if(!real.read_by.includes(user.id)){ real.read_by.push(user.id); count++; }
      }
      audit(db,user.id,'NOTIFICATIONS_READ_ALL','notifications','self',{count});
      saveDb(db);
      return send(res,200,{ok:true, marked:count});
    }


    if(method==='GET' && pathname==='/api/admin/push-status'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      return send(res,200,{ok:true, push:pushCenterStatus(db)});
    }

    if(method==='POST' && pathname==='/api/admin/push-settings'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const body = await getBody(req);
      const set = pushSettings(db);
      const keysBool=['fcm_server_key_present','vapid_public_key_present','web_push_enabled','android_push_enabled','demo_delivery_log_enabled','auto_register_web_demo_token','notify_ride_request','notify_driver_accept','notify_payment','notify_sos','notify_support_refund','notify_kyc'];
      if(body.provider !== undefined) set.provider=String(body.provider||'DEMO').toUpperCase();
      if(body.firebase_project_id !== undefined) set.firebase_project_id=String(body.firebase_project_id||'').slice(0,120);
      if(body.vapid_public_key_label !== undefined) set.vapid_public_key_label=String(body.vapid_public_key_label||'').slice(0,120);
      for(const k of keysBool){ if(body[k] !== undefined) set[k]=!!body[k]; }
      if(body.note !== undefined) set.note=String(body.note||'').slice(0,500);
      set.updated_at=now();
      db.push_settings=set;
      db.integrations = mergeIntegrations(db.integrations);
      db.integrations.push.provider=set.provider;
      db.integrations.push.firebase_project_id=set.firebase_project_id;
      db.integrations.push.fcm_server_key_present=!!set.fcm_server_key_present;
      db.integrations.push.vapid_public_key_present=!!set.vapid_public_key_present;
      db.integrations.push.web_push_enabled=!!set.web_push_enabled;
      db.integrations.push.android_push_enabled=!!set.android_push_enabled;
      audit(db,user.id,'PUSH_SETTINGS_UPDATE','push_settings','default',set);
      saveDb(db);
      return send(res,200,{ok:true, push:pushCenterStatus(db)});
    }

    if(method==='POST' && pathname==='/api/admin/push-send'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const body = await getBody(req);
      const role = String(body.role || 'ALL').toUpperCase();
      const title = String(body.title || 'NEXO Ride Alert').slice(0,120);
      const message = String(body.message || 'NEXO Ride notification test.').slice(0,500);
      const priority = String(body.priority || 'NORMAL').toUpperCase();
      let targets = [];
      if(body.user_id) targets = notificationTargets(db,{user_id:String(body.user_id)});
      else targets = role==='ALL' ? (db.users||[]) : notificationTargets(db,{role});
      const before=(db.push_delivery_logs||[]).length;
      const list = notifyUsers(db, targets, {event_type:'MANUAL_PUSH', priority, title, message, data:{sent_by:user.id, target_role:role}});
      const after=(db.push_delivery_logs||[]).length;
      audit(db,user.id,'ADMIN_MANUAL_PUSH','notifications','manual',{role,count:list.length,deliveries:after-before});
      saveDb(db);
      return send(res,200,{ok:true, notifications:list.length, delivery_logs:after-before, push:pushCenterStatus(db)});
    }

    const pushTokenAction = pathname.match(/^\/api\/admin\/push-tokens\/([^/]+)\/(deactivate|activate)$/);
    if(method==='POST' && pushTokenAction){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const tok=(db.push_tokens||[]).find(x=>x.id===pushTokenAction[1]);
      if(!tok) return send(res,404,{detail:'Push token not found'});
      tok.active = pushTokenAction[2] === 'activate';
      tok.updated_at = now(); tok.admin_action_by=user.id;
      audit(db,user.id,'PUSH_TOKEN_'+pushTokenAction[2].toUpperCase(),'push_token',tok.id,{});
      saveDb(db);
      return send(res,200,{ok:true, token:pushTokenOut(db,tok), push:pushCenterStatus(db)});
    }


    if(method==='GET' && pathname==='/api/admin/monitoring-status'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      return send(res,200,{ok:true, monitoring:monitoringStatus(db)});
    }

    if(method==='POST' && pathname==='/api/admin/monitoring-settings'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const body = await getBody(req);
      const set = monitoringSettings(db);
      const numKeys=['slow_api_ms','max_error_logs','max_audit_logs','db_size_warn_mb','upload_size_warn_mb','backup_min_count'];
      for(const k of numKeys){ if(body[k] !== undefined && !Number.isNaN(Number(body[k]))) set[k]=Number(body[k]); }
      if(body.enabled !== undefined) set.enabled=!!body.enabled;
      if(body.error_log_enabled !== undefined) set.error_log_enabled=!!body.error_log_enabled;
      if(body.production_monitoring_ready !== undefined) set.production_monitoring_ready=!!body.production_monitoring_ready;
      if(body.monitoring_webhook_present !== undefined) set.monitoring_webhook_present=!!body.monitoring_webhook_present;
      if(body.note !== undefined) set.note=String(body.note||'').slice(0,500);
      set.updated_at=now(); db.monitoring_settings=set;
      audit(db,user.id,'MONITORING_SETTINGS_UPDATE','monitoring','settings',set);
      saveDb(db);
      return send(res,200,{ok:true, monitoring:monitoringStatus(db)});
    }

    if(method==='POST' && pathname==='/api/admin/monitoring/test-error'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const body = await getBody(req);
      const err = new Error(String(body.message || 'Manual monitoring test error'));
      logError(db,'manual_test',err,{created_by:user.id});
      audit(db,user.id,'MONITORING_TEST_ERROR','monitoring','error_log',{});
      saveDb(db);
      return send(res,200,{ok:true, monitoring:monitoringStatus(db)});
    }

    if(method==='POST' && pathname==='/api/admin/monitoring/clear-errors'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const before=(db.error_logs||[]).length;
      db.error_logs=[];
      audit(db,user.id,'MONITORING_CLEAR_ERRORS','monitoring','error_logs',{removed:before});
      saveDb(db);
      return send(res,200,{ok:true, removed:before, monitoring:monitoringStatus(db)});
    }

    if(method==='GET' && pathname==='/api/admin/notifications'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const area = adminScopeArea(db,user);
      let items = (db.notifications||[]);
      if(!isMainAdmin(user) && area) items = items.filter(n=>!n.area || n.area===area || n.user_id===user.id);
      return send(res,200,{ok:true, notifications:items.slice(-200).reverse(), push_tokens:(db.push_tokens||[]).filter(x=>x.active).length});
    }

    if(method==='POST' && pathname==='/api/admin/notifications/test'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const body = await getBody(req);
      const targetRole = String(body.role || 'ADMIN').toUpperCase();
      const title = String(body.title || 'NEXO Ride Test Notification');
      const message = String(body.message || 'Notification center is ready. Firebase FCM key দিলে real push চালু হবে।');
      const targets = targetRole==='ALL' ? (db.users||[]) : notificationTargets(db,{role:targetRole});
      const list = notifyUsers(db, targets, {event_type:'TEST_NOTIFICATION', priority:'NORMAL', title, message});
      audit(db,user.id,'ADMIN_TEST_NOTIFICATION','notifications','test',{role:targetRole,count:list.length});
      saveDb(db);
      return send(res,200,{ok:true, sent:list.length, demo_push:true});
    }

    if(method==='GET' && pathname==='/api/admin/integrations'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      return send(res,200,{ok:true, ...integrationReadiness(db)});
    }

    if(method==='POST' && pathname==='/api/admin/integrations'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const body = await getBody(req);
      const current = mergeIntegrations(db.integrations);
      const next = mergeIntegrations(current);
      if(body.map){
        next.map.provider = String(body.map.provider || next.map.provider || 'DEMO').toUpperCase();
        if(body.map.api_key_configured !== undefined) next.map.api_key_configured = !!body.map.api_key_configured;
        if(body.map.navigation_provider !== undefined) next.map.navigation_provider = String(body.map.navigation_provider || next.map.navigation_provider || 'GOOGLE_WEB').toUpperCase();
        if(body.map.external_navigation_enabled !== undefined) next.map.external_navigation_enabled = !!body.map.external_navigation_enabled;
        if(body.map.mappls_key_label !== undefined) next.map.mappls_key_label = String(body.map.mappls_key_label||'');
        if(body.map.google_key_label !== undefined) next.map.google_key_label = String(body.map.google_key_label||'');
        if(body.map.note !== undefined) next.map.note = String(body.map.note||'');
      }
      if(body.otp){
        next.otp.provider = String(body.otp.provider || next.otp.provider || 'DEMO').toUpperCase();
        if(body.otp.demo_code !== undefined) next.otp.demo_code = String(body.otp.demo_code||'123456').slice(0,8);
        if(body.otp.api_key_configured !== undefined) next.otp.api_key_configured = !!body.otp.api_key_configured;
        if(body.otp.firebase_project_id !== undefined) next.otp.firebase_project_id = String(body.otp.firebase_project_id||'');
      }
      if(body.payment){
        next.payment.provider = String(body.payment.provider || next.payment.provider || 'DEMO').toUpperCase();
        if(body.payment.razorpay_key_id !== undefined) next.payment.razorpay_key_id = String(body.payment.razorpay_key_id||'');
        if(body.payment.manual_upi_id !== undefined) next.payment.manual_upi_id = String(body.payment.manual_upi_id||'');
        if(body.payment.manual_qr_label !== undefined) next.payment.manual_qr_label = String(body.payment.manual_qr_label||'');
        if(body.payment.key_id_configured !== undefined) next.payment.key_id_configured = !!body.payment.key_id_configured;
      }
      if(body.push){
        next.push.provider = String(body.push.provider || next.push.provider || 'FCM').toUpperCase();
        if(body.push.fcm_configured !== undefined) next.push.fcm_configured = !!body.push.fcm_configured;
        if(body.push.web_push_ready !== undefined) next.push.web_push_ready = !!body.push.web_push_ready;
      }
      if(body.production){
        if(body.production.server_url !== undefined) next.production.server_url = String(body.production.server_url||'');
        if(body.production.deploy_provider !== undefined) next.production.deploy_provider = String(body.production.deploy_provider||'DEMO').toUpperCase();
        if(body.production.domain_name !== undefined) next.production.domain_name = String(body.production.domain_name||'');
        if(body.production.ssl_configured !== undefined) next.production.ssl_configured = !!body.production.ssl_configured;
        if(body.production.repo_url !== undefined) next.production.repo_url = String(body.production.repo_url||'');
        if(body.production.branch !== undefined) next.production.branch = String(body.production.branch||'main');
        if(body.production.database_url_present !== undefined) next.production.database_url_present = !!body.production.database_url_present;
        if(body.production.deployment_note !== undefined) next.production.deployment_note = String(body.production.deployment_note||'');
      }
      next.updated_at = now();
      db.integrations = next;
      db.app_settings.map_mode = `${next.map.provider} map mode`;
      db.app_settings.otp_mode = `${next.otp.provider} OTP mode`;
      db.app_settings.payment_mode = `${next.payment.provider} payment mode`;
      audit(db,user.id,'ADMIN_INTEGRATIONS_UPDATE','integrations','default',{map:next.map.provider, otp:next.otp.provider, payment:next.payment.provider, push:next.push.provider});
      saveDb(db);
      return send(res,200,{ok:true, ...integrationReadiness(db)});
    }

    if(method==='GET' && pathname==='/api/admin/data/status'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      return send(res,200,{ok:true, data:dbStatus(db), backups:listBackups().slice(0,30)});
    }

    if(method==='GET' && pathname==='/api/admin/data/backups'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      return send(res,200,{ok:true, backups:listBackups().slice(0,30)});
    }

    if(method==='POST' && pathname==='/api/admin/data/backup'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const b = createBackup('manual');
      audit(db,user.id,'ADMIN_DATA_BACKUP','database',b?.file||'none',{});
      saveDb(db);
      return send(res,200,{ok:true, backup:b, data:dbStatus(db)});
    }

    if(method==='GET' && pathname==='/api/admin/data/export'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      audit(db,user.id,'ADMIN_DATA_EXPORT','database','json',{});
      saveDb(db);
      const fileName = `nexo_ride_export_${safeStamp()}.json`;
      const body = JSON.stringify(db,null,2);
      res.writeHead(200, {'Content-Type':'application/json; charset=utf-8','Content-Disposition':`attachment; filename="${fileName}"`,'Cache-Control':'no-store'});
      return res.end(body);
    }

    if(method==='POST' && pathname==='/api/admin/data/import'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const body = await getBody(req);
      const candidate = validateImportedDb(body.database || body.db || body);
      const before = createBackup('before_import');
      candidate.audit.push({id:uid('aud'), at:now(), user_id:user.id, action:'ADMIN_DATA_IMPORT', target:'database', target_id:'json', details:{backup_before_import:before?.file||null}});
      saveDb(candidate);
      return send(res,200,{ok:true, imported:true, backup_before_import:before, data:dbStatus(candidate)});
    }

    if(method==='POST' && pathname==='/api/admin/data/cleanup'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const beforeSessions = db.sessions.length;
      const nowMs = Date.now();
      db.sessions = (db.sessions||[]).filter(s=>new Date(s.expires_at).getTime()>nowMs);
      if((db.audit||[]).length > 1000) db.audit = db.audit.slice(-1000);
      audit(db,user.id,'ADMIN_DATA_CLEANUP','database','local_json',{removed_sessions:beforeSessions-db.sessions.length});
      saveDb(db);
      return send(res,200,{ok:true, removed_sessions:beforeSessions-db.sessions.length, data:dbStatus(db)});
    }

    if(method==='GET' && pathname==='/api/admin/database-migration'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      return send(res,200,{ok:true, database:databaseMigrationStatus(db)});
    }

    if(method==='POST' && pathname==='/api/admin/database-settings'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const body = await getBody(req);
      db.database_migration_settings = {...defaultDatabaseMigrationSettings(), ...(db.database_migration_settings||{})};
      if(body.current_engine) db.database_migration_settings.current_engine = String(body.current_engine||'LOCAL_JSON').toUpperCase();
      if(body.target_engine) db.database_migration_settings.target_engine = String(body.target_engine||'POSTGRESQL').toUpperCase();
      if(body.migration_mode) db.database_migration_settings.migration_mode = String(body.migration_mode||'PLANNING').toUpperCase();
      if(body.database_url_present !== undefined) db.database_migration_settings.database_url_present = !!body.database_url_present;
      if(body.backup_before_migration !== undefined) db.database_migration_settings.backup_before_migration = !!body.backup_before_migration;
      if(body.dry_run_required !== undefined) db.database_migration_settings.dry_run_required = !!body.dry_run_required;
      if(body.production_note !== undefined) db.database_migration_settings.production_note = String(body.production_note||'').trim();
      db.database_migration_settings.updated_at = now();
      const next = mergeIntegrations(db.integrations);
      next.production.database_url_present = !!db.database_migration_settings.database_url_present;
      next.production.database_target = db.database_migration_settings.target_engine || 'PostgreSQL';
      next.updated_at = now();
      db.integrations = next;
      markDatabaseMigrationLog(db,user,'DATABASE_SETTINGS_UPDATE',{target_engine:db.database_migration_settings.target_engine,database_url_present:db.database_migration_settings.database_url_present});
      audit(db,user.id,'DATABASE_SETTINGS_UPDATE','database','migration_settings',{database_url_present:db.database_migration_settings.database_url_present});
      saveDb(db);
      return send(res,200,{ok:true, database:databaseMigrationStatus(db)});
    }

    if(method==='POST' && pathname==='/api/admin/database/snapshot'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const b = createBackup('migration_snapshot');
      db.database_migration_settings = {...defaultDatabaseMigrationSettings(), ...(db.database_migration_settings||{})};
      db.database_migration_settings.last_snapshot_at = now();
      db.database_migration_settings.last_dry_run_at = now();
      const status = databaseMigrationStatus(db);
      markDatabaseMigrationLog(db,user,'MIGRATION_DRY_RUN_SNAPSHOT',{backup:b?.file||null,total_rows:status.summary.total_rows,collections:status.summary.collections});
      audit(db,user.id,'MIGRATION_DRY_RUN_SNAPSHOT','database','postgresql',{backup:b?.file||null,total_rows:status.summary.total_rows});
      saveDb(db);
      return send(res,200,{ok:true, backup:b, database:databaseMigrationStatus(db)});
    }

    if(method==='GET' && pathname==='/api/admin/database/schema.sql'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const schemaPath = path.join(__dirname,'docs','POSTGRESQL_PRODUCTION_SCHEMA_NOTE.sql');
      if(!fs.existsSync(schemaPath)) return sendText(res,404,'Schema note not found');
      return sendText(res,200,fs.readFileSync(schemaPath,'utf8'),'text/sql; charset=utf-8');
    }


    if(method==='GET' && pathname==='/api/admin/audit'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const limit = Math.min(300, Math.max(20, Number(url.searchParams.get('limit')||120)));
      const action = String(url.searchParams.get('action')||'').trim().toUpperCase();
      let rows = (db.audit||[]).slice(-limit*3).reverse();
      if(action) rows = rows.filter(a=>String(a.action||'').toUpperCase().includes(action));
      if(!isMainAdmin(user)) rows = rows.filter(a=>{
        const actor = db.users.find(u=>u.id===a.user_id) || {};
        const area = adminScopeArea(db,user);
        return a.user_id===user.id || actor.added_by===user.id || actor.managed_by_subadmin_id===user.id || (area && actor.area===area);
      });
      rows = rows.slice(0,limit).map(a=>{
        const actor = db.users.find(u=>u.id===a.user_id) || {};
        return {...a, actor_name:actor.name||a.user_id||'system', actor_role:actor.role||'', actor_mobile:actor.mobile||'', details:a.details||{}};
      });
      const counts = (db.audit||[]).reduce((acc,a)=>{ const k=String(a.action||'UNKNOWN'); acc[k]=(acc[k]||0)+1; return acc; },{});
      return send(res,200,{ok:true, audit:rows, counts, total:(db.audit||[]).length});
    }




    if(method==='GET' && pathname==='/api/maps/public-config'){
      const user = requireUser(req,res,db); if(!user) return;
      const m = mapOptions(db);
      const provider = String(m.provider || 'DEMO').toUpperCase();
      const key = provider === 'MAPPLS' ? mapplsStaticKey() : '';
      return send(res,200,{
        ok:true,
        provider,
        has_key:!!key,
        mappls_static_key:key,
        access_token:key,
        sdk_url:key ? `https://sdk.mappls.com/map/sdk/web?v=3.0&access_token=${encodeURIComponent(key)}` : '',
        plugins_url:key ? `https://apis.mappls.com/advancedmaps/api/${encodeURIComponent(key)}/map_sdk_plugins?v=3.0&libraries=search` : '',
        allowed_domain: process.env.MAPPLS_ALLOWED_DOMAIN || '',
        note:'Mappls Web SDK needs the static key in browser. Restrict this key to ride.nexoofficial.in in Mappls Console.'
      });
    }

    if(method==='GET' && pathname==='/api/maps/options'){
      const user = requireUser(req,res,db); if(!user) return;
      return send(res,200,{ok:true, map:mapOptions(db), service_area:db.service_area});
    }

    if(method==='GET' && pathname==='/api/maps/places'){
      const user = requireUser(req,res,db); if(!user) return;
      const q = u.searchParams.get('q') || '';
      return send(res,200,{ok:true, places:searchablePlaces(db,q), provider:mapOptions(db).provider});
    }

    if(method==='GET' && pathname==='/api/maps/reverse'){
      const user = requireUser(req,res,db); if(!user) return;
      const lat = Number(u.searchParams.get('lat'));
      const lng = Number(u.searchParams.get('lng'));
      if(!Number.isFinite(lat) || !Number.isFinite(lng)) return send(res,400,{detail:'lat and lng required'});
      const list = nearbyPlaces(db, lat, lng, Number(u.searchParams.get('limit') || 8));
      return send(res,200,{ok:true, query:{lat,lng}, nearest:list[0]||null, places:list, inside:isInsideServiceArea(db,{lat,lng}), provider:mapOptions(db).provider});
    }

    if(method==='GET' && pathname==='/api/maps/route'){
      const user = requireUser(req,res,db); if(!user) return;
      const pickup = u.searchParams.get('pickup') || '';
      const drop = u.searchParams.get('drop') || '';
      const rideType = u.searchParams.get('ride_type') || 'FULL';
      const seats = Number(u.searchParams.get('seats') || 1);
      if(!pickup || !drop) return send(res,400,{detail:'pickup and drop required'});
      return send(res,200,{ok:true, route:routePlan(db,pickup,drop,rideType,seats)});
    }

    const navMatch = pathname.match(/^\/api\/rides\/([^/]+)\/navigation$/);
    if(method==='GET' && navMatch){
      const user = requireUser(req,res,db); if(!user) return;
      const ride = db.rides.find(r=>r.id===navMatch[1]);
      if(!ride) return send(res,404,{detail:'Ride not found'});
      if(ride.passenger_id!==user.id && ride.driver_id!==user.id && !isAdminRole(user)) return send(res,403,{detail:'Not allowed'});
      const links = navigationLinks(ride.pickup, ride.drop, ride.pickup_coords, ride.drop_coords);
      return send(res,200,{ok:true, ride_id:ride.id, provider:mapOptions(db).navigation_provider, links});
    }

    if(method==='GET' && pathname==='/api/admin/maps'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const sample = routePlan(db,'Kalna Station','Kalna Hospital','FULL',1);
      return send(res,200,{ok:true, map:mapOptions(db), service_area:db.service_area, sample_route:sample, places:searchablePlaces(db,'')});
    }

    if(method==='POST' && pathname==='/api/admin/maps/settings'){
      const user = requireUser(req,res,db); if(!user) return;
      if(user.role!=='ADMIN') return send(res,403,{detail:'Main Admin only'});
      const body = await getBody(req);
      const cur = mergeIntegrations(db.integrations);
      cur.map.provider = String(body.provider || cur.map.provider || 'DEMO').toUpperCase();
      cur.map.navigation_provider = String(body.navigation_provider || cur.map.navigation_provider || 'GOOGLE_WEB').toUpperCase();
      cur.map.external_navigation_enabled = body.external_navigation_enabled !== false;
      cur.map.api_key_configured = !!body.api_key_configured;
      cur.map.mappls_key_label = String(body.mappls_key_label || cur.map.mappls_key_label || '');
      cur.map.google_key_label = String(body.google_key_label || cur.map.google_key_label || '');
      cur.map.search_enabled = cur.map.provider !== 'DEMO' && !!cur.map.api_key_configured;
      cur.map.route_enabled = cur.map.provider !== 'DEMO' && !!cur.map.api_key_configured;
      cur.updated_at = now();
      db.integrations = cur;
      db.app_settings.map_mode = `${cur.map.provider} map mode · ${cur.map.navigation_provider} navigation`;
      audit(db,user.id,'MAP_SETTINGS_UPDATE','integrations','map',{provider:cur.map.provider,navigation_provider:cur.map.navigation_provider,api_key_configured:cur.map.api_key_configured});
      saveDb(db);
      return send(res,200,{ok:true, map:mapOptions(db), readiness:integrationReadiness(db)});
    }

    if(method==='GET' && pathname==='/api/admin/payment-gateway'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin access required'});
      const orders = (db.payment_orders||[]).slice(-100).reverse().map(o=>{
        const ride = db.rides.find(r=>r.id===o.ride_id) || {};
        const passenger = db.users.find(u=>u.id===o.passenger_id) || {};
        return {...o, pickup:ride.pickup||'', drop:ride.drop||'', passenger_name:passenger.name||'', passenger_mobile:passenger.mobile||'', ride_status:ride.status||''};
      });
      const paid = orders.filter(o=>o.status==='PAID');
      const pending = orders.filter(o=>o.status!=='PAID');
      return send(res,200,{ok:true, payment:paymentOptions(db), summary:{orders:orders.length, paid:paid.length, pending:pending.length, paid_amount:money(paid.reduce((a,o)=>a+Number(o.amount||0),0)), pending_amount:money(pending.reduce((a,o)=>a+Number(o.amount||0),0))}, orders});
    }

    if(method==='POST' && pathname==='/api/admin/payment-gateway/settings'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin access required'});
      const body = await getBody(req);
      const current = mergeIntegrations(db.integrations);
      current.payment.provider = String(body.provider || current.payment.provider || 'DEMO').toUpperCase();
      current.payment.razorpay_key_id = String(body.razorpay_key_id ?? current.payment.razorpay_key_id ?? '');
      current.payment.key_id_configured = !!body.key_id_configured || !!current.payment.razorpay_key_id;
      current.payment.manual_upi_id = String(body.manual_upi_id ?? current.payment.manual_upi_id ?? '');
      current.payment.manual_qr_label = String(body.manual_qr_label ?? current.payment.manual_qr_label ?? '');
      current.updated_at = now();
      db.integrations = current;
      db.app_settings.payment_mode = `${current.payment.provider} payment mode`;
      audit(db,user.id,'PAYMENT_GATEWAY_SETTINGS_UPDATE','integrations','payment',{provider:current.payment.provider, manual_upi_id:current.payment.manual_upi_id, razorpay_key_id:current.payment.razorpay_key_id ? 'SET' : 'EMPTY'});
      saveDb(db);
      return send(res,200,{ok:true, payment:paymentOptions(db), integrations:integrationReadiness(db)});
    }

    if(method==='GET' && pathname==='/api/admin/auth-status'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      return send(res,200,{ok:true, auth:authStatus(db)});
    }

    if(method==='POST' && pathname==='/api/admin/auth-settings'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const body = await getBody(req);
      const cur = authSettings(db);
      cur.otp_provider = String(body.otp_provider || cur.otp_provider || 'DEMO').toUpperCase();
      cur.demo_otp = String(body.demo_otp || cur.demo_otp || '123456').trim();
      cur.otp_expiry_minutes = Math.max(1, Math.min(30, Number(body.otp_expiry_minutes || cur.otp_expiry_minutes || 5)));
      cur.resend_cooldown_seconds = Math.max(0, Math.min(600, Number(body.resend_cooldown_seconds || cur.resend_cooldown_seconds || 60)));
      cur.max_otp_per_mobile_per_hour = Math.max(1, Math.min(50, Number(body.max_otp_per_mobile_per_hour || cur.max_otp_per_mobile_per_hour || 5)));
      cur.session_days = Math.max(1, Math.min(365, Number(body.session_days || cur.session_days || 30)));
      cur.rolling_session_enabled = body.rolling_session_enabled === undefined ? cur.rolling_session_enabled !== false : !!body.rolling_session_enabled;
      cur.consent_required = body.consent_required === undefined ? cur.consent_required !== false : !!body.consent_required;
      cur.password_login_enabled = body.password_login_enabled === undefined ? cur.password_login_enabled !== false : !!body.password_login_enabled;
      cur.otp_login_enabled = body.otp_login_enabled === undefined ? cur.otp_login_enabled !== false : !!body.otp_login_enabled;
      cur.production_sms_ready = !!body.production_sms_ready;
      cur.firebase_ready = !!body.firebase_ready;
      cur.msg91_ready = !!body.msg91_ready;
      cur.twofactor_ready = !!body.twofactor_ready;
      cur.note = String(body.note || cur.note || '').trim();
      cur.updated_at = now();
      db.auth_settings = cur;
      const integ = mergeIntegrations(db.integrations);
      integ.otp.provider = cur.otp_provider;
      integ.otp.demo_code = cur.demo_otp;
      integ.otp.firebase_project_id = cur.firebase_ready ? (integ.otp.firebase_project_id || 'SET_FROM_ADMIN') : '';
      integ.otp.msg91_key_present = !!cur.msg91_ready;
      integ.otp.twofactor_key_present = !!cur.twofactor_ready;
      integ.updated_at = now();
      db.integrations = integ;
      db.app_settings.otp_mode = `${cur.otp_provider} OTP · ${cur.otp_expiry_minutes} min expiry · ${cur.session_days} day session`;
      audit(db,user.id,'AUTH_SETTINGS_UPDATE','auth','settings',{provider:cur.otp_provider, expiry:cur.otp_expiry_minutes, session_days:cur.session_days});
      saveDb(db);
      return send(res,200,{ok:true, auth:authStatus(db)});
    }

    if(method==='POST' && pathname==='/api/admin/auth/cleanup-sessions'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const before = (db.sessions||[]).length;
      db.sessions = (db.sessions||[]).filter(x=>new Date(x.expires_at)>new Date());
      const removed = before - db.sessions.length;
      audit(db,user.id,'AUTH_SESSION_CLEANUP','sessions','expired',{removed});
      saveDb(db);
      return send(res,200,{ok:true, removed, auth:authStatus(db)});
    }

    if(method==='GET' && pathname==='/api/admin/security-status'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      return send(res,200,{ok:true, security:securityStatus(db)});
    }

    if(method==='POST' && pathname==='/api/admin/security-settings'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const body = await getBody(req);
      const set = securitySettings(db);
      const bools=['enforce_admin_2fa','force_password_change_on_default','login_rate_limit_enabled','account_lockout_enabled','require_consent_for_admin','ip_allowlist_enabled','trusted_device_required','audit_sensitive_actions','mask_personal_data_in_logs','environment_secrets_required','production_https_required'];
      for(const k of bools){ if(body[k] !== undefined) set[k]=!!body[k]; }
      const nums=['min_password_length','login_rate_limit_per_minute','max_failed_login_attempts','lockout_minutes','admin_session_days'];
      for(const k of nums){ if(body[k] !== undefined) set[k]=Math.max(1, Number(body[k]||1)); }
      if(body.ip_allowlist !== undefined){
        if(Array.isArray(body.ip_allowlist)) set.ip_allowlist=body.ip_allowlist.map(x=>String(x).trim()).filter(Boolean).slice(0,50);
        else set.ip_allowlist=String(body.ip_allowlist||'').split(/[\n,]/).map(x=>x.trim()).filter(Boolean).slice(0,50);
      }
      if(body.note !== undefined) set.note=String(body.note||'');
      set.updated_at=now();
      db.security_settings=set;
      securityEvent(db,user.id,'SECURITY_SETTINGS_UPDATE',{score:securityStatus(db).summary.score});
      audit(db,user.id,'SECURITY_SETTINGS_UPDATE','security','settings',{score:securityStatus(db).summary.score});
      saveDb(db);
      return send(res,200,{ok:true, security:securityStatus(db)});
    }

    if(method==='POST' && pathname==='/api/admin/security/force-logout'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const auth = req.headers.authorization || '';
      const currentToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';
      const before=(db.sessions||[]).length;
      db.sessions=(db.sessions||[]).filter(s=>s.token===currentToken);
      const removed=before-db.sessions.length;
      securityEvent(db,user.id,'FORCE_LOGOUT_ALL_SESSIONS',{removed});
      audit(db,user.id,'SECURITY_FORCE_LOGOUT','sessions','all',{removed});
      saveDb(db);
      return send(res,200,{ok:true, removed, security:securityStatus(db)});
    }

    if(method==='POST' && pathname==='/api/admin/security/rotate-admin-key'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const set=securitySettings(db);
      const code='NEXO-SEC-'+crypto.randomBytes(4).toString('hex').toUpperCase();
      set.last_rotation_at=now();
      set.last_recovery_code_hash=sha(code);
      db.security_settings=set;
      securityEvent(db,user.id,'ADMIN_RECOVERY_CODE_ROTATED',{at:set.last_rotation_at});
      audit(db,user.id,'SECURITY_ROTATE_ADMIN_KEY','security','recovery_code',{});
      saveDb(db);
      return send(res,200,{ok:true, recovery_code:code, warning:'এই code একবারই দেখানো হচ্ছে। নিরাপদ জায়গায় লিখে রাখুন।', security:securityStatus(db)});
    }



    if(method==='GET' && pathname==='/api/support/tickets'){
      const user = requireUser(req,res,db); if(!user) return;
      const data = supportSummary(db,user);
      return send(res,200,{ok:true, summary:data.summary, tickets:data.tickets.slice(-100).reverse().map(t=>supportTicketOut(db,t)), refunds:data.refunds.slice(-100).reverse().map(r=>refundRequestOut(db,r))});
    }

    if(method==='POST' && pathname==='/api/support/tickets'){
      const user = requireUser(req,res,db); if(!user) return;
      const body = await getBody(req);
      const ride = body.ride_id ? db.rides.find(r=>r.id===body.ride_id) : null;
      if(body.ride_id && !ride) return send(res,404,{detail:'Ride not found'});
      if(ride && !isAdminRole(user) && ride.passenger_id!==user.id && ride.driver_id!==user.id) return send(res,403,{detail:'This ride is not linked with your account'});
      const subject = String(body.subject||body.category||'Support request').trim();
      const message = String(body.message||'').trim();
      if(!subject || !message) return send(res,400,{detail:'Subject and message required'});
      const t = {id:uid('tkt'), user_id:user.id, ride_id:ride?.id||null, area:user.area||ride?.area||'Kalna', category:String(body.category||'GENERAL').toUpperCase(), subject, message, status:'OPEN', priority:String(body.priority||'NORMAL').toUpperCase(), admin_response:'', assigned_to:null, created_at:now(), updated_at:now(), closed_at:null};
      db.support_tickets = db.support_tickets || [];
      db.support_tickets.push(t);
      notifyAdmins(db,{event_type:'SUPPORT_TICKET_OPEN', priority:t.priority, title:'New Support Ticket', message:`${user.name||user.mobile}: ${subject}`, area:t.area, data:{ticket_id:t.id, ride_id:t.ride_id}});
      audit(db,user.id,'SUPPORT_TICKET_CREATE','support_ticket',t.id,{category:t.category, ride_id:t.ride_id});
      saveDb(db);
      return send(res,200,{ok:true, ticket:supportTicketOut(db,t)});
    }

    const refundMatch = pathname.match(/^\/api\/rides\/([^/]+)\/refund-request$/);
    if(method==='POST' && refundMatch){
      const user = requireUser(req,res,db); if(!user) return;
      const ride = db.rides.find(r=>r.id===refundMatch[1]);
      if(!ride) return send(res,404,{detail:'Ride not found'});
      if(ride.passenger_id!==user.id) return send(res,403,{detail:'Only passenger can request refund'});
      if(ride.payment_status!=='PAID') return send(res,409,{detail:'Refund request allowed only for paid rides'});
      const exists = (db.refund_requests||[]).find(r=>r.ride_id===ride.id && ['REQUESTED','UNDER_REVIEW','APPROVED'].includes(r.status));
      if(exists) return send(res,409,{detail:'Refund request already open', refund:refundRequestOut(db,exists)});
      const body = await getBody(req);
      const rr = {id:uid('ref'), ride_id:ride.id, user_id:user.id, area:user.area||ride.area||'Kalna', amount:Number(ride.estimated_fare||0), reason:String(body.reason||'Passenger refund request').trim(), status:'REQUESTED', admin_note:'', refund_ref:'', created_at:now(), updated_at:now(), paid_at:null};
      db.refund_requests = db.refund_requests || [];
    db.qa_issues = db.qa_issues || [];
    db.field_test_runs = db.field_test_runs || [];
      db.refund_requests.push(rr);
      ride.refund_status='REQUESTED';
      notifyAdmins(db,{event_type:'REFUND_REQUEST', priority:'HIGH', title:'Refund Request', message:`Ride ${ride.pickup||''} → ${ride.drop||''} · ₹${rr.amount}`, area:rr.area, data:{refund_id:rr.id, ride_id:ride.id}});
      audit(db,user.id,'REFUND_REQUEST','ride',ride.id,{amount:rr.amount});
      saveDb(db);
      return send(res,200,{ok:true, refund:refundRequestOut(db,rr)});
    }

    if(method==='GET' && pathname==='/api/admin/support/tickets'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const data = supportSummary(db,user);
      return send(res,200,{ok:true, summary:data.summary, tickets:data.tickets.slice(-200).reverse().map(t=>supportTicketOut(db,t)), refunds:data.refunds.slice(-200).reverse().map(r=>refundRequestOut(db,r))});
    }

    const ticketAct = pathname.match(/^\/api\/admin\/support\/tickets\/([^/]+)\/action$/);
    if(method==='POST' && ticketAct){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const t = (db.support_tickets||[]).find(x=>x.id===ticketAct[1]);
      if(!t) return send(res,404,{detail:'Ticket not found'});
      const body = await getBody(req);
      const status = String(body.status||t.status||'OPEN').toUpperCase();
      if(!['OPEN','IN_PROGRESS','RESOLVED','CLOSED'].includes(status)) return send(res,400,{detail:'Invalid ticket status'});
      t.status = status; t.admin_response = String(body.response||body.admin_response||t.admin_response||''); t.assigned_to = user.id; t.updated_at=now(); if(status==='CLOSED'||status==='RESOLVED') t.closed_at=now();
      notifyUsers(db, notificationTargets(db,{user_id:t.user_id}), {event_type:'SUPPORT_TICKET_UPDATE', priority:'NORMAL', title:'Support Ticket Updated', message:`${t.subject}: ${t.status}`, data:{ticket_id:t.id}});
      audit(db,user.id,'SUPPORT_TICKET_ACTION','support_ticket',t.id,{status});
      saveDb(db);
      return send(res,200,{ok:true, ticket:supportTicketOut(db,t)});
    }

    if(method==='GET' && pathname==='/api/admin/refunds'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const data = supportSummary(db,user);
      return send(res,200,{ok:true, summary:data.summary, refunds:data.refunds.slice(-200).reverse().map(r=>refundRequestOut(db,r))});
    }

    const refundAct = pathname.match(/^\/api\/admin\/refunds\/([^/]+)\/action$/);
    if(method==='POST' && refundAct){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const rr = (db.refund_requests||[]).find(x=>x.id===refundAct[1]);
      if(!rr) return send(res,404,{detail:'Refund request not found'});
      const ride = db.rides.find(r=>r.id===rr.ride_id);
      const body = await getBody(req);
      const status = String(body.status||rr.status||'UNDER_REVIEW').toUpperCase();
      if(!['UNDER_REVIEW','APPROVED','REJECTED','PAID'].includes(status)) return send(res,400,{detail:'Invalid refund status'});
      rr.status=status; rr.admin_note=String(body.note||body.admin_note||rr.admin_note||''); rr.refund_ref=String(body.refund_ref||rr.refund_ref||''); rr.updated_at=now(); if(status==='PAID') rr.paid_at=now();
      if(ride) ride.refund_status=status;
      notifyUsers(db, notificationTargets(db,{user_id:rr.user_id}), {event_type:'REFUND_STATUS_UPDATE', priority:'HIGH', title:'Refund Status Updated', message:`Refund ${status} · ₹${rr.amount}`, data:{refund_id:rr.id, ride_id:rr.ride_id}});
      audit(db,user.id,'REFUND_ACTION','refund_request',rr.id,{status, amount:rr.amount});
      saveDb(db);
      return send(res,200,{ok:true, refund:refundRequestOut(db,rr)});
    }

    if(method==='GET' && pathname==='/api/admin/reports'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      return send(res,200,{ok:true, reports:buildAdminReports(db,user)});
    }

    if(method==='GET' && pathname==='/api/admin/reports/completed-rides.csv'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      return sendText(res,200,buildCompletedRidesCsv(db,user),'text/csv; charset=utf-8');
    }

    if(method==='GET' && pathname==='/api/admin/build-status'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const integrations = mergeIntegrations(db.integrations);
      const publicUrl = integrations.production.server_url || process.env.SERVER_URL || '';
      return send(res,200,{ok:true, build:{
        version:VERSION,
        app_name:'NEXO Ride',
        package_name:'com.astratechnologies.nexoride',
        apk_target_url: publicUrl ? publicUrl.replace(/\/$/,'') + '/app/' : 'https://YOUR-DOMAIN/app/',
        admin_url: publicUrl ? publicUrl.replace(/\/$/,'') + '/app/admin.html' : 'https://YOUR-DOMAIN/app/admin.html',
        subadmin_url: publicUrl ? publicUrl.replace(/\/$/,'') + '/subadmin/' : 'https://YOUR-DOMAIN/subadmin/',
        workflows:['android-apk.yml','android-aab.yml'],
        pwa_ready:true,
        apk_wrapper_ready:true,
        debug_apk_ready:true,
        release_aab_ready:true,
        required_for_final_apk:['Public HTTPS server URL','App icon/logo final','Map API key for real map','OTP provider key','Payment gateway or manual QR','Firebase FCM for push'],
        mobile_github_steps:['Upload project to GitHub','Open Actions tab','Run Build NEXO Ride APK','Enter live server_url ending with /app/','Download APK artifact'],
        termux_preview:'http://127.0.0.1:3333/app/'
      }});
    }



    if(method==='GET' && pathname==='/api/admin/qa'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      db.qa_issues = db.qa_issues || [];
      const issues = db.qa_issues.slice(-300).reverse();
      const open = issues.filter(x=>!['RESOLVED','CLOSED'].includes(String(x.status||'').toUpperCase())).length;
      const high = issues.filter(x=>['HIGH','CRITICAL'].includes(String(x.priority||'').toUpperCase()) && !['RESOLVED','CLOSED'].includes(String(x.status||'').toUpperCase())).length;
      const modules = {};
      issues.forEach(x=>{ const m=x.module||'General'; modules[m]=(modules[m]||0)+1; });
      const checklist = [
        {title:'Passenger booking', detail:'Pickup/drop → fare → request → accept → pay → OTP → complete', ok:(db.rides||[]).length>0},
        {title:'Driver KYC', detail:'Driver profile + document submit + admin verification', ok:(db.driver_profiles||[]).some(d=>d.kyc_status==='VERIFIED' || d.status==='APPROVED')},
        {title:'Payment flow', detail:'Payment order + payment verify + booking confirm', ok:(db.payment_orders||[]).length>0 || (db.rides||[]).some(r=>r.payment_status==='PAID')},
        {title:'Safety flow', detail:'SOS/share trip/support/refund test', ok:(db.safety_events||[]).length>0 || (db.support_tickets||[]).length>0 || (db.refund_requests||[]).length>0},
        {title:'Reports/export', detail:'Completed ride report and CSV export test', ok:(db.rides||[]).some(r=>r.status==='COMPLETED')},
        {title:'Sub Admin commission', detail:'Area sub-admin mapping + commission + payout request', ok:(db.sub_admins||[]).length>0 && (db.sub_admin_commissions||[]).length>0}
      ];
      return send(res,200,{ok:true, qa:{summary:{total:issues.length, open, high, closed:issues.length-open, modules}, checklist, issues}});
    }

    if(method==='POST' && pathname==='/api/admin/qa/issues'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const body = await getBody(req);
      db.qa_issues = db.qa_issues || [];
      const issue = {
        id: uid('qa'),
        title: String(body.title||'').trim(),
        module: String(body.module||'General').trim(),
        priority: String(body.priority||'MEDIUM').toUpperCase(),
        status: 'OPEN',
        details: String(body.details||'').trim(),
        expected: String(body.expected||'').trim(),
        actual: String(body.actual||'').trim(),
        created_by: user.id,
        created_at: now(),
        updated_at: now()
      };
      if(!issue.title) return send(res,400,{detail:'Issue title required'});
      db.qa_issues.push(issue);
      audit(db,user.id,'QA_ISSUE_CREATE','qa_issue',issue.id,{title:issue.title, priority:issue.priority, module:issue.module});
      saveDb(db);
      return send(res,200,{ok:true, issue});
    }

    const qaIssueAction = pathname.match(/^\/api\/admin\/qa\/issues\/([^/]+)\/status$/);
    if(method==='POST' && qaIssueAction){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const body = await getBody(req);
      db.qa_issues = db.qa_issues || [];
      const issue = db.qa_issues.find(x=>x.id===qaIssueAction[1]);
      if(!issue) return send(res,404,{detail:'QA issue not found'});
      const status = String(body.status||issue.status||'OPEN').toUpperCase();
      if(!['OPEN','IN_PROGRESS','RESOLVED','CLOSED'].includes(status)) return send(res,400,{detail:'Invalid status'});
      issue.status = status;
      issue.resolution_note = String(body.note||body.resolution_note||issue.resolution_note||'').trim();
      issue.updated_at = now();
      if(status==='RESOLVED' || status==='CLOSED') issue.closed_at = now();
      audit(db,user.id,'QA_ISSUE_STATUS','qa_issue',issue.id,{status});
      saveDb(db);
      return send(res,200,{ok:true, issue});
    }




    if(method==='GET' && pathname==='/api/admin/storage-status'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      return send(res,200,{ok:true, storage:storageStatus(db)});
    }

    if(method==='GET' && pathname==='/api/admin/uploads'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      let uploads = (db.file_uploads||[]).slice(-300).reverse();
      if(!isMainAdmin(user)) uploads = uploads.filter(f=>f.owner_user_id===user.id || !f.owner_user_id);
      return send(res,200,{ok:true, uploads, summary:storageStatus(db).summary});
    }

    if(method==='POST' && pathname==='/api/admin/storage-settings'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const body = await getBody(req);
      db.storage_settings = {...defaultStorageSettings(), ...(db.storage_settings||{})};
      if(body.provider) db.storage_settings.provider = String(body.provider||'LOCAL_FILE').toUpperCase();
      if(body.max_upload_mb !== undefined) db.storage_settings.max_upload_mb = Math.max(0.5, Math.min(10, Number(body.max_upload_mb||2)));
      if(body.allowed_mime) db.storage_settings.allowed_mime = String(body.allowed_mime).split(',').map(x=>x.trim()).filter(Boolean);
      if(body.production_note !== undefined) db.storage_settings.production_note = String(body.production_note||'').trim();
      db.storage_settings.secure_file_serving = body.secure_file_serving === undefined ? db.storage_settings.secure_file_serving : !!body.secure_file_serving;
      db.storage_settings.updated_at = now();
      const next = mergeIntegrations(db.integrations);
      next.storage.provider = db.storage_settings.provider;
      next.storage.max_upload_mb = db.storage_settings.max_upload_mb;
      next.storage.allowed_mime = db.storage_settings.allowed_mime;
      next.updated_at = now();
      db.integrations = next;
      audit(db,user.id,'STORAGE_SETTINGS_UPDATE','storage','settings',{provider:db.storage_settings.provider,max_upload_mb:db.storage_settings.max_upload_mb});
      saveDb(db);
      return send(res,200,{ok:true, storage:storageStatus(db)});
    }

    const uploadStatusMatch = pathname.match(/^\/api\/admin\/uploads\/([^/]+)\/(archive|restore|delete)$/);
    if(method==='POST' && uploadStatusMatch){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const rec = (db.file_uploads||[]).find(f=>f.id===uploadStatusMatch[1]);
      if(!rec) return send(res,404,{detail:'Upload not found'});
      const action = uploadStatusMatch[2];
      if(action==='archive') rec.status='ARCHIVED';
      if(action==='restore') rec.status='ACTIVE';
      if(action==='delete') rec.status='DELETED';
      rec.updated_at = now(); rec.updated_by = user.id;
      audit(db,user.id,'UPLOAD_'+action.toUpperCase(),'file_upload',rec.id,{doc_type:rec.doc_type});
      saveDb(db);
      return send(res,200,{ok:true, storage:storageStatus(db)});
    }

    if(method==='GET' && pathname==='/api/admin/legal-status'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      return send(res,200,{ok:true, legal:legalStatus(db)});
    }

    if(method==='POST' && pathname==='/api/admin/legal-documents'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const body = await getBody(req);
      const key = String(body.key||'').trim();
      if(!key) return send(res,400,{detail:'Document key required'});
      db.legal_documents = db.legal_documents || defaultLegalDocuments();
      const current = db.legal_documents[key] || {title:key, version:'v1', status:'DRAFT', mandatory:true, language:'BN+EN', summary:''};
      const next = {
        ...current,
        title: String(body.title || current.title || key).trim(),
        version: String(body.version || current.version || 'v1').trim(),
        status: String(body.status || current.status || 'DRAFT').toUpperCase(),
        mandatory: body.mandatory === undefined ? current.mandatory !== false : !!body.mandatory,
        language: String(body.language || current.language || 'BN+EN').trim(),
        summary: String(body.summary || current.summary || '').trim(),
        last_updated: now(),
        updated_by: user.id
      };
      if(!['DRAFT','APPROVED','ARCHIVED'].includes(next.status)) return send(res,400,{detail:'Invalid legal document status'});
      db.legal_documents[key] = next;
      audit(db,user.id,'LEGAL_DOCUMENT_UPDATE','legal_document',key,{version:next.version,status:next.status});
      saveDb(db);
      return send(res,200,{ok:true, legal:legalStatus(db)});
    }

    if(method==='POST' && pathname==='/api/legal/accept'){
      const user = requireUser(req,res,db); if(!user) return;
      const body = await getBody(req);
      const key = String(body.key||'terms').trim();
      db.legal_documents = db.legal_documents || defaultLegalDocuments();
      const doc = db.legal_documents[key];
      if(!doc) return send(res,404,{detail:'Legal document not found'});
      db.legal_acceptance_records = db.legal_acceptance_records || [];
      const rec = {id:uid('legalacc'), user_id:user.id, user_role:user.role, doc_key:key, version:doc.version, accepted_at:now(), device_id:String(body.device_id||''), ip:req.socket?.remoteAddress||'', consent_text:String(body.consent_text||doc.title||key)};
      db.legal_acceptance_records.push(rec);
      audit(db,user.id,'LEGAL_ACCEPT','legal_document',key,{version:doc.version});
      saveDb(db);
      return send(res,200,{ok:true, acceptance:rec});
    }

    if(method==='GET' && pathname==='/api/admin/launch-readiness'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      return send(res,200,{ok:true, launch:launchReadinessStatus(db)});
    }

    if(method==='GET' && pathname==='/api/admin/deployment-status'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      return send(res,200,{ok:true, ...deploymentStatus(db)});
    }

    if(method==='POST' && pathname==='/api/admin/deployment-settings'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const body = await getBody(req);
      const next = mergeIntegrations(db.integrations);
      next.production.server_url = String(body.server_url || next.production.server_url || '').trim();
      next.production.deploy_provider = String(body.deploy_provider || next.production.deploy_provider || 'DEMO').toUpperCase();
      next.production.domain_name = String(body.domain_name || next.production.domain_name || '').trim();
      next.production.ssl_configured = !!body.ssl_configured;
      next.production.repo_url = String(body.repo_url || next.production.repo_url || '').trim();
      next.production.branch = String(body.branch || next.production.branch || 'main').trim();
      next.production.database_url_present = !!body.database_url_present;
      next.production.deployment_note = String(body.deployment_note || next.production.deployment_note || '').trim();
      next.updated_at = now();
      db.integrations = next;
      audit(db,user.id,'DEPLOYMENT_SETTINGS_UPDATE','integrations','production',{provider:next.production.deploy_provider, server_url:next.production.server_url, ssl:next.production.ssl_configured, db:next.production.database_url_present});
      saveDb(db);
      return send(res,200,{ok:true, ...deploymentStatus(db)});
    }



    const rideDetailsMatch = pathname.match(/^\/api\/rides\/([^/]+)\/(details|detail)$/);
    if(method==='GET' && rideDetailsMatch){
      const user = requireUser(req,res,db); if(!user) return;
      const ride = (db.rides||[]).find(r=>r.id===rideDetailsMatch[1]);
      if(!ride) return send(res,404,{detail:'Ride not found'});
      if(!isAdminRole(user) && ride.passenger_id!==user.id && ride.driver_id!==user.id) return send(res,403,{detail:'Only related passenger/driver can view ride details'});
      const passenger = db.users.find(u=>u.id===ride.passenger_id) || {};
      const driverUser = db.users.find(u=>u.id===ride.driver_id) || {};
      const driverProfile = db.driver_profiles.find(d=>d.user_id===ride.driver_id) || {};
      const order = (db.payment_orders||[]).find(o=>o.id===ride.payment_order_id || o.ride_id===ride.id) || null;
      const refunds = (db.refund_requests||[]).filter(x=>x.ride_id===ride.id).slice(-10).reverse();
      const timeline = [
        ['created_at','Booking requested'], ['accepted_at','Driver accepted'], ['paid_at','Payment confirmed'],
        ['arrived_at','Driver reached pickup'], ['started_at','Ride started'], ['completed_at','Ride completed'], ['cancelled_at','Ride cancelled']
      ].filter(([k])=>ride[k]).map(([k,label])=>({key:k,label,at:ride[k]}));
      const details = {
        ride: rideDto(ride,db,user),
        timeline,
        passenger:{id:passenger.id||'', name:passenger.name||'', mobile:passenger.mobile||''},
        driver:{id:driverUser.id||'', name:driverUser.name||'', mobile:driverUser.mobile||'', vehicle_no:driverProfile.vehicle_no||ride.driver_vehicle_no||'', rating:driverProfile.rating||ride.driver_rating||5},
        payment: order ? {...order, secret:null} : {status:ride.payment_status||'PENDING', amount:Number(ride.estimated_fare||0), provider:ride.payment_provider||paymentProviderMode(db), payment_ref:ride.payment_ref||''},
        finance: (!isAdminRole(user) && user.role==='PASSENGER')
          ? {fare:Number(ride.estimated_fare||0), payment_status:ride.payment_status||'PENDING', refund_status:ride.refund_status||'NOT_REQUIRED'}
          : {fare:Number(ride.estimated_fare||0), driver_earning:Number(ride.driver_earning||0), platform_commission:Number(ride.platform_commission||0), settlement_status:ride.settlement_status||'PENDING', refund_status:ride.refund_status||'NOT_REQUIRED'},
        refunds,
        can_cancel: !['COMPLETED','CANCELLED','PAYMENT_TIMEOUT'].includes(String(ride.status||'').toUpperCase()) && (String(ride.status||'').toUpperCase()!=='STARTED' || isAdminRole(user)),
        cancel_note: String(ride.status||'').toUpperCase()==='STARTED' ? 'Ride start হয়ে গেলে support/SOS ব্যবহার করুন' : 'Ride complete হওয়ার আগে cancel করা যাবে। Paid ride হলে refund review তৈরি হবে।'
      };
      return send(res,200,{ok:true, ...details});
    }

    if(method==='GET' && pathname==='/api/driver/payout-requests'){
      const user = requireUser(req,res,db); if(!user) return;
      if(user.role!=='DRIVER') return send(res,403,{detail:'Driver only'});
      const prof = db.driver_profiles.find(d=>d.user_id===user.id) || {};
      const requests=(db.driver_payout_requests||[]).filter(x=>x.driver_id===user.id).slice(-50).reverse();
      return send(res,200,{ok:true, summary:{pending_payout:Number(prof.pending_payout||0), paid_payout:Number(prof.paid_payout||0), request_count:requests.length}, requests});
    }

    if(method==='POST' && pathname==='/api/driver/payout-request'){
      const user = requireUser(req,res,db); if(!user) return;
      if(user.role!=='DRIVER') return send(res,403,{detail:'Driver only'});
      const body = await getBody(req);
      const prof = db.driver_profiles.find(d=>d.user_id===user.id) || {};
      const amount = Math.round(Number(prof.pending_payout||0)*100)/100;
      if(amount<=0) return send(res,409,{detail:'Pending payout নেই'});
      const existing=(db.driver_payout_requests||[]).find(x=>x.driver_id===user.id && ['REQUESTED','UNDER_REVIEW'].includes(String(x.status||'')));
      if(existing) return send(res,409,{detail:'আগের payout request pending আছে', request:existing});
      const pendingRides=(db.rides||[]).filter(r=>r.driver_id===user.id && r.status==='COMPLETED' && r.settlement_status!=='PAID');
      const reqObj={id:uid('dpr'), driver_id:user.id, amount, ride_count:pendingRides.length, ride_ids:pendingRides.map(r=>r.id), status:'REQUESTED', payout_method:String(body.payout_method||'UPI/Bank'), payout_account:String(body.payout_account||'').slice(0,120), note:String(body.note||'Driver payout requested from app').slice(0,200), created_at:now(), area:prof.area||'Kalna'};
      db.driver_payout_requests = db.driver_payout_requests || [];
      db.driver_payout_requests.push(reqObj);
      notifyAdmins(db,{event_type:'DRIVER_PAYOUT_REQUEST', priority:'NORMAL', title:'Driver Payout Request', message:`${user.name||'Driver'} requested payout ₹${amount}`, data:{request_id:reqObj.id, driver_id:user.id}});
      audit(db,user.id,'DRIVER_PAYOUT_REQUEST','driver',user.id,{amount, request_id:reqObj.id});
      saveDb(db);
      return send(res,200,{ok:true, request:reqObj});
    }

    if(method==='GET' && pathname==='/api/admin/driver-payout-requests'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const scopedDrivers = new Set(filterDriversForAdmin(db,user,db.driver_profiles).map(d=>d.user_id));
      const requests=(db.driver_payout_requests||[]).filter(x=>isMainAdmin(user)||scopedDrivers.has(x.driver_id)).slice(-100).reverse().map(x=>{const u=db.users.find(y=>y.id===x.driver_id)||{};const p=db.driver_profiles.find(d=>d.user_id===x.driver_id)||{};return {...x, driver_name:u.name||'', driver_mobile:u.mobile||'', vehicle_no:p.vehicle_no||''};});
      return send(res,200,{ok:true, requests, summary:{requested:requests.filter(x=>x.status==='REQUESTED').length, paid:requests.filter(x=>x.status==='PAID').length, requested_amount:Math.round(requests.filter(x=>x.status==='REQUESTED').reduce((a,x)=>a+Number(x.amount||0),0)*100)/100}});
    }

    const adminDriverPayoutRequestPay = pathname.match(/^\/api\/admin\/driver-payout-requests\/([^/]+)\/pay$/);
    if(method==='POST' && adminDriverPayoutRequestPay){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main admin only'});
      const reqObj=(db.driver_payout_requests||[]).find(x=>x.id===adminDriverPayoutRequestPay[1]);
      if(!reqObj) return send(res,404,{detail:'Payout request not found'});
      if(reqObj.status==='PAID') return send(res,409,{detail:'Already paid'});
      const body=await getBody(req);
      const driverId=reqObj.driver_id;
      const pendingRides=db.rides.filter(r=>r.driver_id===driverId && r.status==='COMPLETED' && r.settlement_status!=='PAID');
      if(!pendingRides.length) return send(res,409,{detail:'No pending payout for this driver'});
      const amount=Math.round(pendingRides.reduce((a,r)=>a+Number(r.driver_earning||0),0)*100)/100;
      const settlement={id:uid('set'), driver_id:driverId, amount, ride_count:pendingRides.length, ride_ids:pendingRides.map(r=>r.id), request_id:reqObj.id, payment_ref:String(body.payment_ref||reqObj.payout_account||'Manual payout'), note:String(body.note||'Driver payout request paid'), paid_by:user.id, paid_at:now(), status:'PAID'};
      for(const r of pendingRides){ r.settlement_status='PAID'; r.settlement_id=settlement.id; r.settled_at=settlement.paid_at; }
      db.settlements.push(settlement);
      reqObj.status='PAID'; reqObj.settlement_id=settlement.id; reqObj.paid_at=settlement.paid_at; reqObj.payment_ref=settlement.payment_ref; reqObj.paid_amount=amount;
      const prof=db.driver_profiles.find(d=>d.user_id===driverId);
      if(prof){ prof.pending_payout=Math.max(0,Math.round((Number(prof.pending_payout||0)-amount)*100)/100); prof.paid_payout=Math.round((Number(prof.paid_payout||0)+amount)*100)/100; prof.last_payout_at=settlement.paid_at; }
      notifyUsers(db, notificationTargets(db,{user_id:driverId}), {event_type:'DRIVER_PAYOUT_PAID', priority:'HIGH', title:'Payout Paid', message:`Payout ₹${amount} paid/marked paid.`});
      audit(db,user.id,'DRIVER_PAYOUT_REQUEST_PAID','driver',driverId,{request_id:reqObj.id, settlement_id:settlement.id, amount});
      saveDb(db);
      return send(res,200,{ok:true, settlement, request:reqObj, ...settlementSummary(db)});
    }

    if(method==='GET' && pathname==='/api/admin/safety-events'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const events = (db.safety_events||[]).slice(-100).reverse().map(ev=>{
        const u = db.users.find(x=>x.id===ev.user_id) || {};
        const ride = db.rides.find(r=>r.id===ev.ride_id) || {};
        return {...ev, user_name:u.name||'', user_mobile:u.mobile||'', pickup:ride.pickup||'', drop:ride.drop||'', ride_status:ride.status||ev.ride_status};
      });
      return send(res,200,{ok:true, events});
    }

    if(method==='GET' && pathname==='/api/admin/summary'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const scopedRides = filterRidesForAdmin(db,user,db.rides);
      const scopedDrivers = filterDriversForAdmin(db,user,db.driver_profiles);
      const scopedUsers = filterUsersForAdmin(db,user,db.users);
      const subCms = subAdminCommissionSummary(db,user).summary;
      return send(res,200,{ok:true, summary:{
        users:scopedUsers.length,
        drivers:scopedDrivers.length,
        sub_admins:(db.sub_admins||[]).length,
        online_drivers:scopedDrivers.filter(d=>d.status==='APPROVED' && d.online).length,
        live_locations:(db.live_locations||[]).length,
        rides:scopedRides.length,
        requested:scopedRides.filter(r=>r.status==='REQUESTED').length,
        accepted:scopedRides.filter(r=>r.status==='DRIVER_ACCEPTED').length,
        confirmed:scopedRides.filter(r=>r.status==='CONFIRMED').length,
        arrived:scopedRides.filter(r=>r.status==='ARRIVED').length,
        expired:scopedRides.filter(r=>r.status==='PAYMENT_TIMEOUT').length,
        completed:scopedRides.filter(r=>r.status==='COMPLETED').length,
        otp_verified:scopedRides.filter(r=>r.otp_verified_at).length,
        safety_open:(db.safety_events||[]).filter(e=>e.status==='OPEN').length,
        notifications_unread: unreadNotificationCount(db,user),
        notifications_total: (db.notifications||[]).length,
        total_fare: Math.round(scopedRides.filter(r=>r.status==='COMPLETED').reduce((a,r)=>a+Number(r.estimated_fare||0),0)*100)/100,
        driver_payout_pending: Math.round(scopedRides.filter(r=>r.status==='COMPLETED' && r.settlement_status!=='PAID').reduce((a,r)=>a+Number(r.driver_earning||0),0)*100)/100,
        driver_payout_paid: Math.round((db.settlements||[]).reduce((a,s)=>a+Number(s.amount||0),0)*100)/100,
        platform_commission: Math.round(scopedRides.filter(r=>r.status==='COMPLETED').reduce((a,r)=>a+Number(r.platform_commission||0),0)*100)/100,
        sub_admin_commission_pending:subCms.pending_amount,
        sub_admin_commission_paid:subCms.paid_amount,
        rated: scopedRides.filter(r=>r.rating_by_passenger).length
      }});
    }


    // v2.0 Sprint-5F - Admin dashboard details/edit APIs
    if(method==='GET' && pathname==='/api/admin/users'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const users = filterUsersForAdmin(db,user,db.users).slice(-500).reverse().map(u=>({
        id:u.id, name:u.name||'', mobile:u.mobile||'', email:u.email||'', role:u.role||'PASSENGER', area:u.area||u.assigned_area||'', created_at:u.created_at||'', updated_at:u.updated_at||'', last_login_at:u.last_login_at||''
      }));
      return send(res,200,{ok:true, users, summary:{total:users.length, admins:users.filter(u=>u.role==='ADMIN').length, drivers:users.filter(u=>u.role==='DRIVER').length, passengers:users.filter(u=>u.role==='PASSENGER').length}});
    }

    const adminUserUpdate = pathname.match(/^\/api\/admin\/users\/([^/]+)\/update$/);
    if(method==='POST' && adminUserUpdate){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const target = db.users.find(u=>u.id===adminUserUpdate[1]);
      if(!target) return send(res,404,{detail:'User not found'});
      if(!isMainAdmin(user) && target.area && target.area!==user.area && target.assigned_area!==user.area) return send(res,403,{detail:'Sub Admin can edit own area users only'});
      const body = await getBody(req);
      if(body.name!==undefined) target.name=String(body.name||'').slice(0,80);
      if(body.mobile!==undefined) target.mobile=String(body.mobile||'').replace(/\D/g,'').slice(-10) || target.mobile;
      if(body.email!==undefined) target.email=String(body.email||'').slice(0,120);
      if(body.area!==undefined){ target.area=String(body.area||'').slice(0,80); target.assigned_area=target.area; }
      target.updated_at=now();
      audit(db,user.id,'ADMIN_USER_UPDATE','user',target.id,{fields:Object.keys(body||{})});
      saveDb(db);
      return send(res,200,{ok:true,user:{id:target.id,name:target.name,mobile:target.mobile,email:target.email,role:target.role,area:target.area}});
    }

    const adminDriverUpdate = pathname.match(/^\/api\/admin\/drivers\/([^/]+)\/update$/);
    if(method==='POST' && adminDriverUpdate){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const prof = db.driver_profiles.find(d=>d.id===adminDriverUpdate[1] || d.user_id===adminDriverUpdate[1]);
      if(!prof) return send(res,404,{detail:'Driver profile not found'});
      if(!isMainAdmin(user)){ const allowed = filterDriversForAdmin(db,user,[prof]).length>0; if(!allowed) return send(res,403,{detail:'Sub Admin can edit own area drivers only'}); }
      const body = await getBody(req);
      const du = db.users.find(u=>u.id===prof.user_id);
      if(du){
        if(body.name!==undefined) du.name=String(body.name||du.name||'').slice(0,80);
        if(body.mobile!==undefined) du.mobile=String(body.mobile||du.mobile||'').replace(/\D/g,'').slice(-10) || du.mobile;
        if(body.location!==undefined || body.area!==undefined){ du.area=String(body.location||body.area||du.area||'').slice(0,80); du.assigned_area=du.area; }
        du.updated_at=now();
      }
      if(body.vehicle_no!==undefined) prof.vehicle_no=String(body.vehicle_no||'').toUpperCase().slice(0,30);
      if(body.location!==undefined || body.area!==undefined) prof.location=String(body.location||body.area||prof.location||'').slice(0,80);
      if(body.status!==undefined && ['PENDING','APPROVED','REJECTED','SUSPENDED'].includes(String(body.status).toUpperCase())){
        prof.status=String(body.status).toUpperCase(); if(prof.status!=='APPROVED') prof.online=false;
      }
      prof.updated_at=now(); prof.admin_reviewed_at=now(); prof.admin_reviewed_by=user.id;
      audit(db,user.id,'ADMIN_DRIVER_UPDATE','driver_profile',prof.id,{fields:Object.keys(body||{})});
      saveDb(db);
      return send(res,200,{ok:true, driver_profile:prof});
    }

    const adminRideUpdate = pathname.match(/^\/api\/admin\/rides\/([^/]+)\/update$/);
    if(method==='POST' && adminRideUpdate){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const ride = db.rides.find(r=>r.id===adminRideUpdate[1]);
      if(!ride) return send(res,404,{detail:'Ride not found'});
      if(!isMainAdmin(user)){ const allowed = filterRidesForAdmin(db,user,[ride]).length>0; if(!allowed) return send(res,403,{detail:'Sub Admin can edit own area rides only'}); }
      const body = await getBody(req);
      if(body.pickup!==undefined) ride.pickup=String(body.pickup||ride.pickup||'').slice(0,120);
      if(body.drop!==undefined) ride.drop=String(body.drop||ride.drop||'').slice(0,120);
      if(body.estimated_fare!==undefined && !Number.isNaN(Number(body.estimated_fare))) ride.estimated_fare=Number(body.estimated_fare);
      if(body.payment_status!==undefined) ride.payment_status=String(body.payment_status||ride.payment_status||'').toUpperCase().slice(0,30);
      if(body.status!==undefined && isMainAdmin(user)) ride.status=String(body.status||ride.status||'').toUpperCase().slice(0,40);
      ride.updated_at=now();
      audit(db,user.id,'ADMIN_RIDE_UPDATE','ride',ride.id,{fields:Object.keys(body||{})});
      saveDb(db);
      return send(res,200,{ok:true, ride:rideDto(ride,db,user)});
    }

    send(res,404,{detail:'Not found'});
  }catch(e){
    console.error(e);
    try{ const errDb=readDb(); logError(errDb, pathname || 'route', e, {method}); saveDb(errDb); }catch(_e){}
    send(res,e.status||500,{detail:e.message||'Server error'});
  }
}

const HOST = process.env.HOST || '0.0.0.0';
try{ ensureDataDir(); readDb(); createBackup('startup'); }catch(e){ console.error('Startup DB backup skipped:', e.message); }
const server = http.createServer(route);
server.on('error', (e)=>{
  if(e && e.code === 'EADDRINUSE'){
    console.error(`Port ${PORT} is already busy. In Termux run: pkill node  then  npm start`);
  } else {
    console.error(e);
  }
  process.exit(1);
});
server.listen(PORT, HOST, ()=>{
  console.log('===============================================');
  console.log(`NEXO Ride ${VERSION} running`);
  console.log(`App: http://127.0.0.1:${PORT}/app/ | Admin: http://127.0.0.1:${PORT}/app/admin.html | Sub Admin: http://127.0.0.1:${PORT}/subadmin/`);
  console.log(`Health check:   http://127.0.0.1:${PORT}/api/health`);
  console.log('SmartASP compatible: listening on process.env.PORT when provided.');
  console.log('===============================================');
});

