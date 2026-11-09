const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,email TEXT NOT NULL COLLATE NOCASE UNIQUE,username TEXT NOT NULL COLLATE NOCASE UNIQUE,display_name TEXT NOT NULL,password_hash TEXT NOT NULL,password_salt TEXT NOT NULL,bio TEXT NOT NULL DEFAULT '',location TEXT NOT NULL DEFAULT '',role TEXT NOT NULL DEFAULT '',avatar_url TEXT,is_active INTEGER NOT NULL DEFAULT 1,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,token_hash TEXT NOT NULL UNIQUE,created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,last_seen_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,body TEXT NOT NULL,media_url TEXT,media_type TEXT,visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','followers')),created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,deleted_at INTEGER);
CREATE INDEX IF NOT EXISTS idx_posts_feed ON posts(visibility,created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS post_likes (post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,created_at INTEGER NOT NULL,PRIMARY KEY (post_id,user_id));
CREATE TABLE IF NOT EXISTS comments (id TEXT PRIMARY KEY,post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,body TEXT NOT NULL,created_at INTEGER NOT NULL,deleted_at INTEGER);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id,created_at);
CREATE TABLE IF NOT EXISTS follows (follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,following_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,created_at INTEGER NOT NULL,PRIMARY KEY (follower_id,following_id),CHECK (follower_id <> following_id));
CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY,kind TEXT NOT NULL DEFAULT 'direct' CHECK (kind IN ('direct','group')),title TEXT,created_by TEXT NOT NULL REFERENCES users(id),created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS conversation_members (conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,joined_at INTEGER NOT NULL,last_read_at INTEGER,PRIMARY KEY (conversation_id,user_id));
CREATE INDEX IF NOT EXISTS idx_conversation_members_user ON conversation_members(user_id);
CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY,conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,sender_id TEXT NOT NULL REFERENCES users(id),body TEXT NOT NULL,message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text','image','video','voice')),media_url TEXT,created_at INTEGER NOT NULL,deleted_at INTEGER);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id,created_at);
CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mime_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  byte_length INTEGER NOT NULL,
  data_b64 TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_media_owner ON media_assets(owner_id,created_at DESC);
CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY,title TEXT NOT NULL,organization TEXT NOT NULL,description TEXT NOT NULL,category TEXT NOT NULL,location TEXT NOT NULL DEFAULT 'Remote',compensation_label TEXT NOT NULL DEFAULT 'See details',status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS job_applications (id TEXT PRIMARY KEY,job_id TEXT NOT NULL REFERENCES jobs(id),user_id TEXT NOT NULL REFERENCES users(id),message TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','reviewing','accepted','declined')),created_at INTEGER NOT NULL,UNIQUE(job_id,user_id));
CREATE TABLE IF NOT EXISTS wallets (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,balance INTEGER NOT NULL DEFAULT 1000 CHECK (balance >= 0),updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,kind TEXT NOT NULL CHECK (kind IN ('credit','debit')),amount INTEGER NOT NULL CHECK (amount > 0),description TEXT NOT NULL,reference_type TEXT,reference_id TEXT,created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS properties (id TEXT PRIMARY KEY,name TEXT NOT NULL,city TEXT NOT NULL,country TEXT NOT NULL,description TEXT NOT NULL,price INTEGER NOT NULL CHECK (price > 0),status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','unavailable')));
CREATE TABLE IF NOT EXISTS user_properties (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,property_id TEXT NOT NULL REFERENCES properties(id),purchased_at INTEGER NOT NULL,UNIQUE(user_id,property_id));
CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,kind TEXT NOT NULL,reference_id TEXT,body TEXT NOT NULL,read_at INTEGER,created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY,reporter_id TEXT NOT NULL REFERENCES users(id),target_type TEXT NOT NULL,target_id TEXT NOT NULL,reason TEXT NOT NULL,details TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'open',created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS auth_attempts (id TEXT PRIMARY KEY,ip_hash TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_auth_attempts_ip ON auth_attempts(ip_hash,created_at DESC);
CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY,applied_at INTEGER NOT NULL);
INSERT OR IGNORE INTO jobs (id,title,organization,description,category,location,compensation_label,status,created_at) VALUES
('community-host','Community host','ELYVORA COMMUNITY','Welcome new members, support healthy discussions and help communities thrive.','Community','Remote','Paid role · Details after verification','open',unixepoch()),
('digital-creator','Digital creator','CREATOR NETWORK','Create useful stories, short videos and visual content for a growing audience.','Creative','Remote','Paid role · Details after verification','open',unixepoch()),
('local-guide','Local experience guide','WORLD EXPLORERS','Share local recommendations and help people discover destinations.','Travel','Flexible','Per assignment · Details after verification','open',unixepoch()),
('product-assistant','Product assistant','BUILDERS STUDIO','Help a team test ideas, organize feedback and shape better digital experiences.','Technology','Remote','Paid role · Details after verification','open',unixepoch());
INSERT OR IGNORE INTO properties (id,name,city,country,description,price,status) VALUES
('lagos-studio','City studio','Lagos','Nigeria','A compact starter space in the creative district of the ELYVORA virtual city.',900,'available'),
('london-loft','Skyline loft','London','United Kingdom','A bright virtual home overlooking the riverside district.',1800,'available'),
('tokyo-retreat','Garden retreat','Tokyo','Japan','A peaceful virtual retreat in the east gardens district.',1350,'available');
INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES (1,unixepoch()),(2,unixepoch());
`;

const ACCOUNT_SCHEMA_SQL = `-- ELYVORA account identity and privacy v3
CREATE TABLE IF NOT EXISTS account_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  country TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT,
  interests_json TEXT NOT NULL DEFAULT '[]',
  email_verified_at INTEGER,
  updated_at INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS user_privacy (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  profile_visibility TEXT NOT NULL DEFAULT 'public' CHECK (profile_visibility IN ('public','followers','private')),
  content_visibility TEXT NOT NULL DEFAULT 'public' CHECK (content_visibility IN ('public','followers','private')),
  message_privacy TEXT NOT NULL DEFAULT 'everyone' CHECK (message_privacy IN ('everyone','followers','none')),
  comment_privacy TEXT NOT NULL DEFAULT 'everyone' CHECK (comment_privacy IN ('everyone','followers','none')),
  show_online INTEGER NOT NULL DEFAULT 1 CHECK (show_online IN (0,1)),
  read_receipts INTEGER NOT NULL DEFAULT 1 CHECK (read_receipts IN (0,1)),
  updated_at INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS user_blocks (
  blocker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (blocker_id,blocked_id),
  CHECK (blocker_id <> blocked_id)
);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);
CREATE TABLE IF NOT EXISTS email_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK (purpose IN ('verify_email','reset_password')),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_email_tokens_user ON email_tokens(user_id,purpose,created_at DESC);
INSERT OR IGNORE INTO account_profiles(user_id,country,city,interests_json,updated_at)
  SELECT id,'','', '[]', updated_at FROM users;
INSERT OR IGNORE INTO user_privacy(user_id,updated_at)
  SELECT id,updated_at FROM users;
INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES (3,unixepoch());
`;
let schemaReady;
const encoder = new TextEncoder();
const SESSION_SECONDS = 60 * 60 * 24 * 30;

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers } });
}
function fail(message, status = 400, code = "bad_request") { return json({ error: { code, message } }, status); }
function randomId() { return crypto.randomUUID(); }
function base64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function fromBase64url(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}
async function digest(text) {
  const out = await crypto.subtle.digest("SHA-256", encoder.encode(text));
  return base64url(new Uint8Array(out));
}
async function passwordHash(password, salt) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: fromBase64url(salt), iterations: 120000, hash: "SHA-256" }, key, 256);
  return base64url(new Uint8Array(bits));
}
function constantEqual(a, b) {
  const x = encoder.encode(a), y = encoder.encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
function cookieValue(request, name) {
  const raw = request.headers.get("Cookie") || "";
  for (const item of raw.split(";")) {
    const [key, ...rest] = item.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return "";
}
function sessionCookie(token, request, clear = false) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return "elyvora_session=" + (clear ? "" : token) + "; Path=/; HttpOnly; SameSite=Lax" + secure + "; Max-Age=" + (clear ? "0" : SESSION_SECONDS);
}
async function bodyJson(request) {
  const text = await request.text();
  if (text.length > 20000) throw new Error("Request body is too large.");
  try { return text ? JSON.parse(text) : {}; } catch { throw new Error("Invalid JSON body."); }
}
async function ensureSchema(db) {
  if (!schemaReady) {
    schemaReady = (async () => {
      const migrationTable = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'").first();
      const applied = migrationTable ? await db.prepare("SELECT version FROM schema_migrations WHERE version=2").first() : null;
      if (!applied) await db.exec(SCHEMA_SQL);
      const accountMigration = await db.prepare("SELECT version FROM schema_migrations WHERE version=3").first();
      if (!accountMigration) await db.exec(ACCOUNT_SCHEMA_SQL);
    })().catch(error => { schemaReady = null; throw error; });
  }
  return schemaReady;
}

async function userRecord(db, userId) {
  return db.prepare(`SELECT u.*,ap.country,ap.city,ap.cover_image_url,ap.interests_json,ap.email_verified_at,
    COALESCE(up.profile_visibility,'public') AS profile_visibility,
    COALESCE(up.content_visibility,'public') AS content_visibility,
    COALESCE(up.message_privacy,'everyone') AS message_privacy,
    COALESCE(up.comment_privacy,'everyone') AS comment_privacy,
    COALESCE(up.show_online,1) AS show_online,COALESCE(up.read_receipts,1) AS read_receipts
    FROM users u LEFT JOIN account_profiles ap ON ap.user_id=u.id
    LEFT JOIN user_privacy up ON up.user_id=u.id WHERE u.id=?`).bind(userId).first();
}
function parseInterests(value) {
  try { const parsed=JSON.parse(value||"[]"); return Array.isArray(parsed)?parsed.filter(x=>typeof x==="string").slice(0,20):[]; }
  catch { return []; }
}
function publicPrivacy(row) {
  return {profileVisibility:row?.profile_visibility||"public",contentVisibility:row?.content_visibility||"public",
    messagePrivacy:row?.message_privacy||"everyone",commentPrivacy:row?.comment_privacy||"everyone",
    showOnline:Boolean(row?.show_online??1),readReceipts:Boolean(row?.read_receipts??1)};
}
function escapeHtml(value) {
  return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
async function emailToken(db,userId,purpose,ttlSeconds) {
  const token=base64url(crypto.getRandomValues(new Uint8Array(32))),now=Math.floor(Date.now()/1000);
  await db.prepare("DELETE FROM email_tokens WHERE user_id=? AND purpose=? AND (used_at IS NOT NULL OR expires_at<?)").bind(userId,purpose,now).run();
  await db.prepare("INSERT INTO email_tokens(id,user_id,purpose,token_hash,expires_at,created_at) VALUES (?,?,?,?,?,?)")
    .bind(randomId(),userId,purpose,await digest(token),now+ttlSeconds,now).run();
  return token;
}
async function sendAccountEmail(env,to,subject,html) {
  if(!env.RESEND_API_KEY||!env.EMAIL_FROM)return false;
  try {
    const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+env.RESEND_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({from:env.EMAIL_FROM,to:[to],subject,html})});
    if(!response.ok){console.error("ELYVORA email delivery failed:",response.status,await response.text());return false;}
    return true;
  } catch(error) { console.error("ELYVORA email delivery error:",error); return false; }
}
async function isBlocked(db,firstId,secondId) {
  return Boolean(await db.prepare("SELECT 1 FROM user_blocks WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?) LIMIT 1")
    .bind(firstId,secondId,secondId,firstId).first());
}
function publicUser(row) {
  return row ? { id: row.id, email: row.email, username: row.username, displayName: row.display_name, bio: row.bio,
    location: row.location, city: row.city||"", country: row.country||"", role: row.role, avatarUrl: row.avatar_url,
    coverImageUrl: row.cover_image_url||null, interests:parseInterests(row.interests_json), emailVerified:Boolean(row.email_verified_at),
    createdAt: row.created_at } : null;
}
async function currentUser(request, db) {
  const token = cookieValue(request, "elyvora_session");
  if (!token) return null;
  const hash = await digest(token);
  const now = Math.floor(Date.now() / 1000);
  const row = await db.prepare("SELECT u.*,s.id AS session_id,s.last_seen_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.is_active=1").bind(hash, now).first();
  if (row && now - Number(row.last_seen_at) > 300) {
    await db.prepare("UPDATE sessions SET last_seen_at=? WHERE id=?").bind(now, row.session_id).run();
  }
  return row || null;
}
async function createSession(db, userId, request) {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = base64url(bytes), now = Math.floor(Date.now() / 1000);
  await db.prepare("INSERT INTO sessions (id,user_id,token_hash,created_at,expires_at,last_seen_at) VALUES (?,?,?,?,?,?)")
    .bind(randomId(), userId, await digest(token), now, now + SESSION_SECONDS, now).run();
  return sessionCookie(token, request);
}
function checkSameOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return false;
  try { return new URL(origin).origin === new URL(request.url).origin; } catch { return false; }
}
function requireUser(user) { return user ? null : fail("Sign in to continue.", 401, "authentication_required"); }
async function authRateLimit(request, db) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const key = await digest("elyvora-auth:" + ip);
  const now = Math.floor(Date.now() / 1000);
  const row = await db.prepare("SELECT COUNT(*) AS n FROM auth_attempts WHERE ip_hash=? AND created_at>?").bind(key, now - 900).first();
  await db.prepare("INSERT INTO auth_attempts (id,ip_hash,created_at) VALUES (?,?,?)").bind(randomId(), key, now).run();
  if (Number(row?.n || 0) >= 15) return false;
  if (Math.random() < 0.03) await db.prepare("DELETE FROM auth_attempts WHERE created_at<?").bind(now - 86400).run();
  return true;
}

export async function handleApi(request, env) {
  const url = new URL(request.url), path = url.pathname;
  if (!path.startsWith("/api/")) return null;
  if (!env.DB) return fail("The ELYVORA database binding is not configured.", 503, "database_unavailable");
  try {
    await ensureSchema(env.DB);
    const method = request.method.toUpperCase();
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && !checkSameOrigin(request)) return fail("Cross-origin request blocked.", 403, "origin_rejected");

    if (method === "GET" && path === "/api/health") return json({ok:true,service:"elyvora-api",schemaVersion:3,time:new Date().toISOString()});

    const mediaMatch=path.match(/^\/api\/media\/([a-f0-9-]+)$/);
    if(method==="GET"&&mediaMatch){
      const user=await currentUser(request,env.DB);
      const id=mediaMatch[1],mediaUrl="/api/media/"+id;
      const asset=await env.DB.prepare("SELECT id,owner_id,mime_type,file_name,byte_length,data_b64 FROM media_assets WHERE id=?").bind(id).first();
      if(!asset)return fail("Media not found.",404,"not_found");
      const publicPost=await env.DB.prepare("SELECT 1 FROM posts p JOIN user_privacy up ON up.user_id=p.user_id WHERE p.media_url=? AND p.visibility='public' AND p.deleted_at IS NULL AND up.profile_visibility='public' AND up.content_visibility='public' LIMIT 1").bind(mediaUrl).first();
      const conversation=user?await env.DB.prepare("SELECT 1 FROM messages m JOIN conversation_members cm ON cm.conversation_id=m.conversation_id WHERE m.media_url=? AND cm.user_id=? LIMIT 1").bind(mediaUrl,user.id).first():null;
      const publicProfile=await env.DB.prepare(`SELECT 1 FROM users u JOIN user_privacy up ON up.user_id=u.id
        WHERE (u.avatar_url=? OR EXISTS(SELECT 1 FROM account_profiles ap WHERE ap.user_id=u.id AND ap.cover_image_url=?))
          AND (up.profile_visibility='public' OR (up.profile_visibility='followers' AND EXISTS(SELECT 1 FROM follows f WHERE f.follower_id=? AND f.following_id=u.id)))
          AND NOT EXISTS(SELECT 1 FROM user_blocks b WHERE b.blocker_id=? AND b.blocked_id=u.id)
          AND NOT EXISTS(SELECT 1 FROM user_blocks b WHERE b.blocker_id=u.id AND b.blocked_id=?)
        LIMIT 1`).bind(mediaUrl,mediaUrl,user?.id||"",user?.id||"",user?.id||"").first();
      if(asset.owner_id!==user?.id&&!publicPost&&!conversation&&!publicProfile)return fail("You do not have access to this media.",403,"forbidden");
      const bytes=fromBase64url(asset.data_b64);
      return new Response(bytes,{status:200,headers:{"Content-Type":asset.mime_type,"Content-Length":String(asset.byte_length),"Content-Disposition":"inline; filename*=UTF-8''"+encodeURIComponent(asset.file_name),"Cache-Control":publicPost?"public, max-age=3600":"private, no-store","X-Content-Type-Options":"nosniff"}});
    }

    if(method==="POST"&&path==="/api/media/upload"){
      const user=await currentUser(request,env.DB);const denied=requireUser(user);if(denied)return denied;
      let form;try{form=await request.formData();}catch{return fail("Upload must use multipart form data.");}
      const file=form.get("file");
      if(!file||typeof file.arrayBuffer!=="function"||typeof file.size!=="number")return fail("Choose an image, video or audio file.");
      const mimeType=String(file.type||"").split(";")[0].toLowerCase();
      const allowed=new Set(["image/jpeg","image/png","image/webp","image/gif","image/avif","video/mp4","video/webm","video/quicktime","audio/webm","audio/ogg","audio/mp4","audio/mpeg"]);
      if(!allowed.has(mimeType))return fail("This file type is not supported.");
      const MAX_MEDIA_BYTES=1_000_000;
      if(file.size<1||file.size>MAX_MEDIA_BYTES)return fail("This first release supports media files up to 1 MB. Larger media needs the R2 storage upgrade.",413,"media_too_large");
      const id=randomId(),bytes=new Uint8Array(await file.arrayBuffer()),encoded=base64url(bytes);
      const fileName=String(file.name||"elyvora-media").replace(/[\r\n\\/]/g,"_").slice(0,100);
      try{
        await env.DB.prepare("INSERT INTO media_assets(id,owner_id,mime_type,file_name,byte_length,data_b64,created_at) VALUES (?,?,?,?,?,?,?)").bind(id,user.id,mimeType,fileName,file.size,encoded,Math.floor(Date.now()/1000)).run();
      }catch(error){
        console.error("ELYVORA media upload failed:",error);
        return fail("The media could not be stored. Please try a smaller file.",507,"media_storage_failed");
      }
      return json({id,url:"/api/media/"+id,mimeType,byteLength:file.size,fileName},201);
    }

    if (method === "POST" && path === "/api/auth/register") {
      if (!await authRateLimit(request, env.DB)) return fail("Too many attempts. Please try again later.", 429, "rate_limited");
      const data = await bodyJson(request);
      const email = String(data.email || "").trim().toLowerCase();
      const username = String(data.username || "").trim().replace(/^@/, "").toLowerCase();
      const displayName = String(data.displayName || "").trim();
      const country = String(data.country || "").trim();
      const city = String(data.city || "").trim();
      const password = String(data.password || "");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return fail("Enter a valid email address.");
      if (!/^[a-z0-9_.]{3,24}$/.test(username)) return fail("Username must be 3–24 characters using letters, numbers, underscores or dots.");
      if (displayName.length < 2 || displayName.length > 50) return fail("Your full name must be 2–50 characters.");
      if (country.length < 2 || country.length > 80) return fail("Choose your country to complete registration.");
      if (city.length > 80) return fail("Your city must be 80 characters or fewer.");
      if (password.length < 10 || password.length > 128) return fail("Use a password with at least 10 characters.");
      const id = randomId(), now = Math.floor(Date.now()/1000), salt = base64url(crypto.getRandomValues(new Uint8Array(16)));
      const hash = await passwordHash(password, salt);
      try {
        await env.DB.batch([
          env.DB.prepare("INSERT INTO users (id,email,username,display_name,password_hash,password_salt,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)").bind(id,email,username,displayName,hash,salt,now,now),
          env.DB.prepare("INSERT INTO wallets (user_id,balance,updated_at) VALUES (?,1000,?)").bind(id,now),
          env.DB.prepare("INSERT INTO transactions (id,user_id,kind,amount,description,reference_type,created_at) VALUES (?,?, 'credit',1000,'Welcome credits','welcome',?)").bind(randomId(),id,now),
          env.DB.prepare("INSERT INTO account_profiles(user_id,country,city,interests_json,updated_at) VALUES (?,?,?,'[]',?)").bind(id,country,city,now),
          env.DB.prepare("INSERT INTO user_privacy(user_id,updated_at) VALUES (?,?)").bind(id,now)
        ]);
      } catch (error) {
        const message = String(error?.message || "");
        if (message.includes("UNIQUE")) return fail("That email or username is already registered.", 409, "account_exists");
        throw error;
      }
      const cookie = await createSession(env.DB,id,request);
      let verificationSent=false;
      if(env.RESEND_API_KEY&&env.EMAIL_FROM){
        const token=await emailToken(env.DB,id,"verify_email",86400);
        const verifyUrl=new URL("/",request.url);verifyUrl.searchParams.set("verify",token);
        verificationSent=await sendAccountEmail(env,email,"Verify your ELYVORA email",
          '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#17212b"><h1>Welcome to ELYVORA</h1><p>Confirm your email address to help secure your account.</p><p><a href="'+escapeHtml(verifyUrl.toString())+'" style="display:inline-block;padding:12px 18px;background:#4e79d4;color:#fff;border-radius:8px;text-decoration:none">Verify email address</a></p><p>This link expires in 24 hours. If you did not create this account, you can ignore this email.</p></div>');
      }
      const user=await userRecord(env.DB,id);
      return json({user:publicUser(user),wallet:{balance:1000},verificationSent},201,{"Set-Cookie":cookie});
    }

    if (method === "POST" && path === "/api/auth/login") {
      if (!await authRateLimit(request, env.DB)) return fail("Too many attempts. Please try again later.", 429, "rate_limited");
      const data = await bodyJson(request), identifier = String(data.identifier || "").trim().toLowerCase(), password = String(data.password || "");
      if (!identifier || !password) return fail("Enter your email or username and password.");
      const user = await env.DB.prepare("SELECT * FROM users WHERE email=? OR username=?").bind(identifier,identifier).first();
      if (!user || !constantEqual(await passwordHash(password,user.password_salt),user.password_hash)) return fail("Your sign-in details do not match.", 401, "invalid_credentials");
      const cookie = await createSession(env.DB,user.id,request);
      const profile=await userRecord(env.DB,user.id);
      return json({user:publicUser(profile)},200,{"Set-Cookie":cookie});
    }

    if (method === "POST" && path === "/api/auth/logout") {
      const token = cookieValue(request,"elyvora_session");
      if (token) await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(await digest(token)).run();
      return json({ ok:true },200,{"Set-Cookie":sessionCookie("",request,true)});
    }

    if (method === "POST" && path === "/api/auth/password/forgot") {
      if (!await authRateLimit(request,env.DB)) return fail("Too many attempts. Please try again later.",429,"rate_limited");
      const data=await bodyJson(request),email=String(data.email||"").trim().toLowerCase();
      if(email&&email.length<=254&&env.RESEND_API_KEY&&env.EMAIL_FROM){
        const found=await env.DB.prepare("SELECT id,email FROM users WHERE email=? AND is_active=1").bind(email).first();
        if(found){
          const token=await emailToken(env.DB,found.id,"reset_password",3600);
          const resetUrl=new URL("/",request.url);resetUrl.searchParams.set("reset",token);
          await sendAccountEmail(env,found.email,"Reset your ELYVORA password",
            '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#17212b"><h1>Password reset</h1><p>We received a request to reset your ELYVORA password.</p><p><a href="'+escapeHtml(resetUrl.toString())+'" style="display:inline-block;padding:12px 18px;background:#4e79d4;color:#fff;border-radius:8px;text-decoration:none">Choose a new password</a></p><p>This link expires in one hour. If you did not request a reset, ignore this email.</p></div>');
        }
      }
      return json({sent:true,deliveryConfigured:Boolean(env.RESEND_API_KEY&&env.EMAIL_FROM),
        message:"If an account matches that address and email delivery is configured, password reset instructions will be sent."});
    }

    if (method === "POST" && path === "/api/auth/password/reset") {
      const data=await bodyJson(request),token=String(data.token||""),password=String(data.password||"");
      if(token.length<30||token.length>100)return fail("This password reset link is invalid or expired.",400,"invalid_token");
      if(password.length<10||password.length>128)return fail("Use a new password with at least 10 characters.");
      const tokenHash=await digest(token),now=Math.floor(Date.now()/1000);
      const record=await env.DB.prepare("SELECT id,user_id FROM email_tokens WHERE token_hash=? AND purpose='reset_password' AND used_at IS NULL AND expires_at>?").bind(tokenHash,now).first();
      if(!record)return fail("This password reset link is invalid or expired.",400,"invalid_token");
      const salt=base64url(crypto.getRandomValues(new Uint8Array(16))),hash=await passwordHash(password,salt);
      await env.DB.batch([
        env.DB.prepare("UPDATE users SET password_hash=?,password_salt=?,updated_at=? WHERE id=?").bind(hash,salt,now,record.user_id),
        env.DB.prepare("UPDATE email_tokens SET used_at=? WHERE id=?").bind(now,record.id),
        env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(record.user_id),
        env.DB.prepare("UPDATE email_tokens SET used_at=? WHERE user_id=? AND purpose='reset_password' AND used_at IS NULL").bind(now,record.user_id)
      ]);
      return json({reset:true,message:"Your password has been updated. Sign in with your new password."});
    }

    if (method === "POST" && path === "/api/auth/verify-email") {
      const data=await bodyJson(request),token=String(data.token||"");
      if(token.length<30||token.length>100)return fail("This verification link is invalid or expired.",400,"invalid_token");
      const now=Math.floor(Date.now()/1000),record=await env.DB.prepare("SELECT id,user_id FROM email_tokens WHERE token_hash=? AND purpose='verify_email' AND used_at IS NULL AND expires_at>?").bind(await digest(token),now).first();
      if(!record)return fail("This verification link is invalid or expired.",400,"invalid_token");
      await env.DB.batch([
        env.DB.prepare("UPDATE account_profiles SET email_verified_at=?,updated_at=? WHERE user_id=?").bind(now,now,record.user_id),
        env.DB.prepare("UPDATE email_tokens SET used_at=? WHERE id=?").bind(now,record.id)
      ]);
      return json({verified:true});
    }

    if (method === "POST" && path === "/api/auth/verification/resend") {
      const user=await currentUser(request,env.DB);const denied=requireUser(user);if(denied)return denied;
      if(!env.RESEND_API_KEY||!env.EMAIL_FROM)return fail("Email delivery is not configured yet. Verification becomes available when ELYVORA's email service is connected.",503,"email_unavailable");
      const profile=await userRecord(env.DB,user.id);if(profile?.email_verified_at)return json({sent:false,verified:true});
      const token=await emailToken(env.DB,user.id,"verify_email",86400),verifyUrl=new URL("/",request.url);verifyUrl.searchParams.set("verify",token);
      const sent=await sendAccountEmail(env,user.email,"Verify your ELYVORA email",
        '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#17212b"><h1>Verify your email</h1><p>Confirm your email address for ELYVORA.</p><p><a href="'+escapeHtml(verifyUrl.toString())+'" style="display:inline-block;padding:12px 18px;background:#4e79d4;color:#fff;border-radius:8px;text-decoration:none">Verify email address</a></p><p>This link expires in 24 hours.</p></div>');
      if(!sent)return fail("We could not send the verification email. Please try again later.",502,"email_delivery_failed");
      return json({sent:true});
    }

    if (method === "GET" && path === "/api/me") {
      const user = await currentUser(request,env.DB);
      return user ? json({user:publicUser(await userRecord(env.DB,user.id))}) : json({user:null});
    }

    if (method === "POST" && path === "/api/profile") {
      const user=await currentUser(request,env.DB);const denied=requireUser(user);if(denied)return denied;
      const data=await bodyJson(request),displayName=String(data.displayName||"").trim(),username=String(data.username||"").trim().replace(/^@/,"").toLowerCase(),
        bio=String(data.bio||"").trim(),location=String(data.location||"").trim(),role=String(data.role||"").trim(),
        country=String(data.country||"").trim(),city=String(data.city||"").trim(),
        avatarUrl=data.avatarUrl===null?null:String(data.avatarUrl??user.avatar_url??"").trim()||null,
        coverImageUrl=data.coverImageUrl===null?null:String(data.coverImageUrl??"").trim()||null;
      const interests=Array.isArray(data.interests)?[...new Set(data.interests.map(x=>String(x).trim()).filter(Boolean))].slice(0,20):[];
      if(displayName.length<2||displayName.length>50)return fail("Your full name must be 2–50 characters.");
      if(!/^[a-z0-9_.]{3,24}$/.test(username))return fail("Username must be 3–24 characters using letters, numbers, underscores or dots.");
      if(bio.length>220||location.length>80||role.length>80||country.length>80||city.length>80||interests.some(x=>x.length>32))return fail("One or more profile fields are too long.");
      for(const mediaUrl of [avatarUrl,coverImageUrl]){
        if(!mediaUrl)continue;
        const match=mediaUrl.match(/^\/api\/media\/([a-f0-9-]+)$/);
        if(!match)return fail("Profile photos must be uploaded to ELYVORA before they can be saved.");
        const asset=await env.DB.prepare("SELECT owner_id,mime_type FROM media_assets WHERE id=?").bind(match[1]).first();
        if(!asset||asset.owner_id!==user.id||!asset.mime_type.startsWith("image/"))return fail("Choose an image uploaded from your own account.",403,"media_not_owned");
      }
      const now=Math.floor(Date.now()/1000);
      try{
        await env.DB.batch([
          env.DB.prepare("UPDATE users SET display_name=?,username=?,bio=?,location=?,role=?,avatar_url=?,updated_at=? WHERE id=?").bind(displayName,username,bio,location,role,avatarUrl,now,user.id),
          env.DB.prepare("INSERT INTO account_profiles(user_id,country,city,cover_image_url,interests_json,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET country=excluded.country,city=excluded.city,cover_image_url=excluded.cover_image_url,interests_json=excluded.interests_json,updated_at=excluded.updated_at").bind(user.id,country,city,coverImageUrl,JSON.stringify(interests),now)
        ]);
      }catch(error){if(String(error?.message||"").includes("UNIQUE"))return fail("That username is already in use.",409,"username_exists");throw error;}
      return json({user:publicUser(await userRecord(env.DB,user.id))});
    }

    if(method==="GET"&&path==="/api/privacy"){
      const user=await currentUser(request,env.DB);const denied=requireUser(user);if(denied)return denied;
      const row=await env.DB.prepare("SELECT * FROM user_privacy WHERE user_id=?").bind(user.id).first();
      return json({privacy:publicPrivacy(row)});
    }
    if(method==="POST"&&path==="/api/privacy"){
      const user=await currentUser(request,env.DB);const denied=requireUser(user);if(denied)return denied;
      const data=await bodyJson(request),profileVisibility=String(data.profileVisibility||"public"),contentVisibility=String(data.contentVisibility||"public"),
        messagePrivacy=String(data.messagePrivacy||"everyone"),commentPrivacy=String(data.commentPrivacy||"everyone"),
        showOnline=data.showOnline===false?0:1,readReceipts=data.readReceipts===false?0:1;
      if(!["public","followers","private"].includes(profileVisibility)||!["public","followers","private"].includes(contentVisibility)||!["everyone","followers","none"].includes(messagePrivacy)||!["everyone","followers","none"].includes(commentPrivacy))return fail("Choose valid privacy settings.");
      await env.DB.prepare("INSERT INTO user_privacy(user_id,profile_visibility,content_visibility,message_privacy,comment_privacy,show_online,read_receipts,updated_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET profile_visibility=excluded.profile_visibility,content_visibility=excluded.content_visibility,message_privacy=excluded.message_privacy,comment_privacy=excluded.comment_privacy,show_online=excluded.show_online,read_receipts=excluded.read_receipts,updated_at=excluded.updated_at")
        .bind(user.id,profileVisibility,contentVisibility,messagePrivacy,commentPrivacy,showOnline,readReceipts,Math.floor(Date.now()/1000)).run();
      return json({privacy:publicPrivacy(await env.DB.prepare("SELECT * FROM user_privacy WHERE user_id=?").bind(user.id).first())});
    }

    if (method === "GET" && path === "/api/feed") {
      const user=await currentUser(request,env.DB),viewerId=user?.id||"",limit=Math.min(50,Math.max(1,Number(url.searchParams.get("limit")||20)));
      const rows=await env.DB.prepare(`SELECT p.id,p.body,p.media_url,p.media_type,p.visibility,p.created_at,u.id AS user_id,u.display_name,u.username,u.avatar_url,
        (SELECT COUNT(*) FROM post_likes l WHERE l.post_id=p.id) AS likes,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id=p.id AND c.deleted_at IS NULL) AS comments,
        EXISTS(SELECT 1 FROM post_likes l WHERE l.post_id=p.id AND l.user_id=?) AS liked
        FROM posts p JOIN users u ON u.id=p.user_id LEFT JOIN user_privacy up ON up.user_id=p.user_id
        WHERE p.deleted_at IS NULL
          AND NOT EXISTS(SELECT 1 FROM user_blocks b WHERE b.blocker_id=? AND b.blocked_id=p.user_id)
          AND NOT EXISTS(SELECT 1 FROM user_blocks b WHERE b.blocker_id=p.user_id AND b.blocked_id=?)
          AND (p.user_id=? OR
            (COALESCE(up.profile_visibility,'public')='public' AND COALESCE(up.content_visibility,'public')='public' AND p.visibility='public') OR
            (EXISTS(SELECT 1 FROM follows f WHERE f.follower_id=? AND f.following_id=p.user_id)
              AND COALESCE(up.profile_visibility,'public')<>'private'
              AND COALESCE(up.content_visibility,'public') IN ('public','followers')))
        ORDER BY p.created_at DESC LIMIT ?`).bind(viewerId,viewerId,viewerId,viewerId,viewerId,limit).all();
      return json({posts:(rows.results||[]).map(p=>({...p,author:{id:p.user_id,name:p.display_name,username:p.username,avatarUrl:p.avatar_url}}))});
    }

    if (method === "POST" && path === "/api/posts") {
      const user=await currentUser(request,env.DB);const denied=requireUser(user);if(denied)return denied;
      const data=await bodyJson(request), body=String(data.body||"").trim(), visibility=data.visibility==="followers"?"followers":"public";
      if(!body||body.length>5000)return fail("A post must contain 1–5,000 characters.");
      let mediaUrl=null,mediaType=null;
      if(data.mediaUrl){
        const value=String(data.mediaUrl).trim();
        if(value.startsWith("/api/media/")){
          const match=value.match(/^\/api\/media\/([a-f0-9-]+)$/);
          if(!match)return fail("Invalid ELYVORA media reference.");
          const asset=await env.DB.prepare("SELECT id,owner_id,mime_type FROM media_assets WHERE id=?").bind(match[1]).first();
          if(!asset||asset.owner_id!==user.id)return fail("Upload this media from your own account before sharing it.",403,"media_not_owned");
          mediaUrl=value;
          mediaType=asset.mime_type.startsWith("video/")?"video":"image";
        }else{
          try{
            const parsed=new URL(value);
            if(parsed.protocol!=="https:"||parsed.username||parsed.password)return fail("Media links must be secure HTTPS URLs.");
            mediaUrl=parsed.toString();
            mediaType=data.mediaType==="video"?"video":"image";
          }catch{return fail("Enter a valid HTTPS media URL.");}
          if(mediaUrl.length>2000)return fail("Media URL is too long.");
        }
      }
      const id=randomId(),now=Math.floor(Date.now()/1000);
      await env.DB.prepare("INSERT INTO posts (id,user_id,body,media_url,media_type,visibility,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)").bind(id,user.id,body,mediaUrl,mediaType,visibility,now,now).run();
      return json({post:{id,body,media_url:mediaUrl,media_type:mediaType,visibility,created_at:now,author:publicUser(user),likes:0,comments:0,liked:0}},201);
    }

    const likeMatch=path.match(/^\/api\/posts\/([a-f0-9-]+)\/like$/);
    if(method==="POST"&&likeMatch){
      const user=await currentUser(request,env.DB);const denied=requireUser(user);if(denied)return denied;
      const post=await env.DB.prepare("SELECT id,user_id FROM posts WHERE id=? AND deleted_at IS NULL").bind(likeMatch[1]).first();
      if(!post)return fail("Post not found.",404,"not_found");
      const inserted=await env.DB.prepare("INSERT OR IGNORE INTO post_likes (post_id,user_id,created_at) VALUES (?,?,?)").bind(post.id,user.id,Math.floor(Date.now()/1000)).run();
      let liked=Number(inserted.meta?.changes||0)>0;
      if(!liked){await env.DB.prepare("DELETE FROM post_likes WHERE post_id=? AND user_id=?").bind(post.id,user.id).run();liked=false;}
      const count=await env.DB.prepare("SELECT COUNT(*) AS n FROM post_likes WHERE post_id=?").bind(post.id).first();
      return json({liked,likes:Number(count?.n||0)});
    }

    const commentMatch=path.match(/^\/api\/posts\/([a-f0-9-]+)\/comments$/);
    if(commentMatch&&(method==="GET"||method==="POST")){
      const viewer=await currentUser(request,env.DB),post=await env.DB.prepare("SELECT p.id,p.user_id FROM posts p WHERE p.id=? AND p.deleted_at IS NULL").bind(commentMatch[1]).first();
      if(!post)return fail("Post not found.",404,"not_found");
      if(viewer&&await isBlocked(env.DB,viewer.id,post.user_id))return fail("Post not found.",404,"not_found");
      const settings=await env.DB.prepare("SELECT profile_visibility,content_visibility,comment_privacy FROM user_privacy WHERE user_id=?").bind(post.user_id).first();
      const follows=viewer?Boolean(await env.DB.prepare("SELECT 1 FROM follows WHERE follower_id=? AND following_id=?").bind(viewer.id,post.user_id).first()):false;
      const owner=viewer?.id===post.user_id,profileVisibility=settings?.profile_visibility||"public",contentVisibility=settings?.content_visibility||"public";
      if(!owner&&profileVisibility==="private"&&!follows)return fail("This post is not available.",403,"content_restricted");
      if(!owner&&profileVisibility==="followers"&&!follows)return fail("Follow this member to view the discussion.",403,"content_restricted");
      if(!owner&&contentVisibility==="private")return fail("Comments are not available for this post.",403,"content_restricted");
      if(!owner&&contentVisibility==="followers"&&!follows)return fail("Follow this member to view the discussion.",403,"content_restricted");
      if(method==="GET"){
        const rows=await env.DB.prepare("SELECT c.id,c.body,c.created_at,u.display_name,u.username,u.avatar_url FROM comments c JOIN users u ON u.id=c.user_id WHERE c.post_id=? AND c.deleted_at IS NULL ORDER BY c.created_at ASC LIMIT 100").bind(commentMatch[1]).all();
        return json({comments:rows.results||[]});
      }
      const denied=requireUser(viewer);if(denied)return denied;
      const commentPrivacy=settings?.comment_privacy||"everyone";
      if(commentPrivacy==="none"||commentPrivacy==="followers"&&!follows)return fail("This member does not accept comments from your account.",403,"comments_restricted");
      const data=await bodyJson(request),body=String(data.body||"").trim();
      if(!body||body.length>1500)return fail("A comment must contain 1–1,500 characters.");
      const id=randomId(),now=Math.floor(Date.now()/1000);
      await env.DB.prepare("INSERT INTO comments(id,post_id,user_id,body,created_at) VALUES (?,?,?,?,?)").bind(id,commentMatch[1],viewer.id,body,now).run();
      return json({comment:{id,body,created_at:now,author:publicUser(await userRecord(env.DB,viewer.id))}},201);
    }

    if(method==="GET"&&path==="/api/users"){
      const user=await currentUser(request,env.DB);const denied=requireUser(user);if(denied)return denied;
      const q=String(url.searchParams.get("q")||"").trim().toLowerCase();if(q.length<2)return json({users:[]});
      const rows=await env.DB.prepare(`SELECT u.id,u.username,u.display_name,u.bio,u.location,u.role,u.avatar_url,ap.country,ap.city,
        EXISTS(SELECT 1 FROM follows f WHERE f.follower_id=? AND f.following_id=u.id) AS is_following,
        CASE WHEN COALESCE(up.show_online,1)=1 AND EXISTS(SELECT 1 FROM sessions s WHERE s.user_id=u.id AND s.expires_at>? AND s.last_seen_at>?) THEN 1 ELSE 0 END AS is_online
        FROM users u LEFT JOIN user_privacy up ON up.user_id=u.id LEFT JOIN account_profiles ap ON ap.user_id=u.id
        WHERE u.is_active=1 AND u.id<>? AND (u.username LIKE ? OR u.display_name LIKE ?)
          AND COALESCE(up.profile_visibility,'public') IN ('public','followers')
          AND NOT EXISTS(SELECT 1 FROM user_blocks b WHERE b.blocker_id=? AND b.blocked_id=u.id)
          AND NOT EXISTS(SELECT 1 FROM user_blocks b WHERE b.blocker_id=u.id AND b.blocked_id=?)
        ORDER BY u.display_name LIMIT 20`).bind(user.id,Math.floor(Date.now()/1000),Math.floor(Date.now()/1000)-300,user.id,"%"+q+"%","%"+q+"%",user.id,user.id).all();
      return json({users:rows.results||[]});
    }

    const profileMatch=path.match(/^\/api\/users\/([a-f0-9-]+)\/profile$/);
    if(method==="GET"&&profileMatch){
      const viewer=await currentUser(request,env.DB),target=await userRecord(env.DB,profileMatch[1]);
      if(!target||!target.is_active)return fail("Profile not found.",404,"not_found");
      if(viewer&&await isBlocked(env.DB,viewer.id,target.id))return fail("Profile not found.",404,"not_found");
      const follows=viewer?Boolean(await env.DB.prepare("SELECT 1 FROM follows WHERE follower_id=? AND following_id=?").bind(viewer.id,target.id).first()):false;
      const owner=viewer?.id===target.id,privacy=publicPrivacy(target);
      if(!owner&&privacy.profileVisibility==="private"&&!follows)return fail("This profile is private.",403,"profile_private");
      if(!owner&&privacy.profileVisibility==="followers"&&!follows)return fail("Follow this member to view their profile.",403,"profile_restricted");
      const canSeePosts=owner||privacy.contentVisibility==="public"||(follows&&privacy.contentVisibility==="followers");
      let posts=[];
      if(canSeePosts){
        const rows=await env.DB.prepare(`SELECT p.id,p.body,p.media_url,p.media_type,p.visibility,p.created_at,
          (SELECT COUNT(*) FROM post_likes l WHERE l.post_id=p.id) AS likes,
          (SELECT COUNT(*) FROM comments c WHERE c.post_id=p.id AND c.deleted_at IS NULL) AS comments,
          EXISTS(SELECT 1 FROM post_likes l WHERE l.post_id=p.id AND l.user_id=?) AS liked
          FROM posts p WHERE p.user_id=? AND p.deleted_at IS NULL AND (?=1 OR p.visibility='public' OR EXISTS(SELECT 1 FROM follows f WHERE f.follower_id=? AND f.following_id=p.user_id))
          ORDER BY p.created_at DESC LIMIT 30`).bind(viewer?.id||"",target.id,owner?1:0,viewer?.id||"").all();
        posts=rows.results||[];
      }
      const [followers,following,presence]=await Promise.all([
        env.DB.prepare("SELECT COUNT(*) AS n FROM follows WHERE following_id=?").bind(target.id).first(),
        env.DB.prepare("SELECT COUNT(*) AS n FROM follows WHERE follower_id=?").bind(target.id).first(),
        env.DB.prepare("SELECT MAX(last_seen_at) AS last_seen_at FROM sessions WHERE user_id=? AND expires_at>?").bind(target.id,Math.floor(Date.now()/1000)).first()
      ]);
      const isOnline=privacy.showOnline&&presence?.last_seen_at&&Math.floor(Date.now()/1000)-Number(presence.last_seen_at)<300;
      return json({profile:{...publicUser(target),privacy,isOnline:Boolean(isOnline),followers:Number(followers?.n||0),following:Number(following?.n||0),
        isFollowing:follows,isSelf:owner,posts,communities:[]}});
    }

    const followMatch=path.match(/^\/api\/users\/([a-f0-9-]+)\/follow$/);
    if(followMatch&&(method==="POST"||method==="DELETE")){
      const user=await currentUser(request,env.DB);const denied=requireUser(user);if(denied)return denied;
      const targetId=followMatch[1];if(targetId===user.id)return fail("You cannot follow your own account.");
      const target=await env.DB.prepare("SELECT id FROM users WHERE id=? AND is_active=1").bind(targetId).first();if(!target)return fail("Member not found.",404,"not_found");
      if(await isBlocked(env.DB,user.id,target.id))return fail("This action is unavailable for this member.",403,"blocked");
      if(method==="DELETE"){
        await env.DB.prepare("DELETE FROM follows WHERE follower_id=? AND following_id=?").bind(user.id,target.id).run();
        return json({following:false});
      }
      await env.DB.prepare("INSERT OR IGNORE INTO follows(follower_id,following_id,created_at) VALUES (?,?,?)").bind(user.id,target.id,Math.floor(Date.now()/1000)).run();
      await env.DB.prepare("INSERT INTO notifications(id,user_id,actor_id,kind,body,created_at) SELECT ?,?,?,'follow',?,? WHERE NOT EXISTS(SELECT 1 FROM notifications WHERE user_id=? AND actor_id=? AND kind='follow' AND created_at>?)")
        .bind(randomId(),target.id,user.id,user.display_name+" started following you.",Math.floor(Date.now()/1000),target.id,user.id,Math.floor(Date.now()/1000)-60).run();
      return json({following:true});
    }

    const blockMatch=path.match(/^\/api\/users\/([a-f0-9-]+)\/block$/);
    if(blockMatch&&(method==="POST"||method==="DELETE")){
      const user=await currentUser(request,env.DB);const denied=requireUser(user);if(denied)return denied;
      const targetId=blockMatch[1];if(targetId===user.id)return fail("You cannot block your own account.");
      const target=await env.DB.prepare("SELECT id FROM users WHERE id=? AND is_active=1").bind(targetId).first();if(!target)return fail("Member not found.",404,"not_found");
      if(method==="DELETE"){await env.DB.prepare("DELETE FROM user_blocks WHERE blocker_id=? AND blocked_id=?").bind(user.id,targetId).run();return json({blocked:false});}
      await env.DB.batch([
        env.DB.prepare("INSERT OR IGNORE INTO user_blocks(blocker_id,blocked_id,created_at) VALUES (?,?,?)").bind(user.id,targetId,Math.floor(Date.now()/1000)),
        env.DB.prepare("DELETE FROM follows WHERE (follower_id=? AND following_id=?) OR (follower_id=? AND following_id=?)").bind(user.id,targetId,targetId,user.id)
      ]);
      return json({blocked:true});
    }
    if(method==="GET"&&path==="/api/blocks"){
      const user=await currentUser(request,env.DB);const denied=requireUser(user);if(denied)return denied;
      const rows=await env.DB.prepare("SELECT u.id,u.username,u.display_name,u.avatar_url FROM user_blocks b JOIN users u ON u.id=b.blocked_id WHERE b.blocker_id=? ORDER BY b.created_at DESC").bind(user.id).all();
      return json({users:rows.results||[]});
    }

    if(method==="GET"&&path==="/api/careers"){
      const user=await currentUser(request,env.DB);
      const rows=await env.DB.prepare("SELECT j.*,a.status AS application_status FROM jobs j LEFT JOIN job_applications a ON a.job_id=j.id AND a.user_id=? WHERE j.status='open' ORDER BY j.created_at DESC").bind(user?.id||"").all();
      return json({jobs:rows.results||[]});
    }
    const applyMatch=path.match(/^\/api\/careers\/([a-z0-9-]+)\/apply$/);
    if(method==="POST"&&applyMatch){
      const user=await currentUser(request,env.DB);const denied=requireUser(user);if(denied)return denied;
      const job=await env.DB.prepare("SELECT id FROM jobs WHERE id=? AND status='open'").bind(applyMatch[1]).first();if(!job)return fail("This opportunity is no longer available.",404,"not_found");
      const data=await bodyJson(request),message=String(data.message||"").trim().slice(0,1200),now=Math.floor(Date.now()/1000);
      try{await env.DB.prepare("INSERT INTO job_applications(id,job_id,user_id,message,created_at) VALUES (?,?,?,?,?)").bind(randomId(),job.id,user.id,message,now).run();}
      catch(e){if(String(e.message).includes("UNIQUE"))return fail("You've already applied for this opportunity.",409,"already_applied");throw e;}
      return json({submitted:true},201);
    }

    if(method==="GET"&&path==="/api/economy"){
      const user=await currentUser(request,env.DB);const denied=requireUser(user);if(denied)return denied;
      const [wallet,props,owned,transactions]=await Promise.all([
        env.DB.prepare("SELECT balance FROM wallets WHERE user_id=?").bind(user.id).first(),
        env.DB.prepare("SELECT * FROM properties WHERE status='available' ORDER BY price").all(),
        env.DB.prepare("SELECT property_id,purchased_at FROM user_properties WHERE user_id=?").bind(user.id).all(),
        env.DB.prepare("SELECT id,kind,amount,description,created_at FROM transactions WHERE user_id=? ORDER BY created_at DESC LIMIT 30").bind(user.id).all()
      ]);
      return json({balance:Number(wallet?.balance||0),properties:props.results||[],owned:owned.results||[],transactions:transactions.results||[]});
    }

    const purchaseMatch=path.match(/^\/api\/economy\/properties\/([a-z0-9-]+)\/purchase$/);
    if(method==="POST"&&purchaseMatch){
      const user=await currentUser(request,env.DB);const denied=requireUser(user);if(denied)return denied;
      const property=await env.DB.prepare("SELECT id,name,price FROM properties WHERE id=? AND status='available'").bind(purchaseMatch[1]).first();
      if(!property)return fail("Property is unavailable.",404,"not_found");
      const now=Math.floor(Date.now()/1000),txId=randomId(),ownershipId=randomId();
      const results=await env.DB.batch([
        env.DB.prepare("UPDATE wallets SET balance=balance-?,updated_at=? WHERE user_id=? AND balance>=? AND NOT EXISTS(SELECT 1 FROM user_properties WHERE user_id=? AND property_id=?)").bind(property.price,now,user.id,property.price,user.id,property.id),
        env.DB.prepare("INSERT INTO user_properties(id,user_id,property_id,purchased_at) SELECT ?,?,?,? WHERE changes()=1").bind(ownershipId,user.id,property.id,now),
        env.DB.prepare("INSERT INTO transactions(id,user_id,kind,amount,description,reference_type,reference_id,created_at) SELECT ?,?,'debit',?,?, 'property',?,? WHERE changes()=1").bind(txId,user.id,property.price,"Acquired "+property.name,property.id,now)
      ]);
      const changed=Number(results[0]?.meta?.changes||0);
      if(!changed){
        const owned=await env.DB.prepare("SELECT 1 FROM user_properties WHERE user_id=? AND property_id=?").bind(user.id,property.id).first();
        if(owned)return fail("You already own this virtual property.",409,"already_owned");
        return fail("You do not have enough virtual credits.",402,"insufficient_credits");
      }
      const wallet=await env.DB.prepare("SELECT balance FROM wallets WHERE user_id=?").bind(user.id).first();
      return json({purchased:true,balance:Number(wallet?.balance||0),property});
    }

    if(method==="GET"&&path==="/api/conversations"){
      const user=await currentUser(request,env.DB);const denied=requireUser(user);if(denied)return denied;
      const rows=await env.DB.prepare(`SELECT c.id,c.kind,c.title,c.updated_at,
        (SELECT m.body FROM messages m WHERE m.conversation_id=c.id AND m.deleted_at IS NULL ORDER BY m.created_at DESC LIMIT 1) AS last_message,
        (SELECT m.created_at FROM messages m WHERE m.conversation_id=c.id AND m.deleted_at IS NULL ORDER BY m.created_at DESC LIMIT 1) AS last_message_at,
        (SELECT u.id FROM conversation_members cm2 JOIN users u ON u.id=cm2.user_id WHERE cm2.conversation_id=c.id AND cm2.user_id<>? LIMIT 1) AS other_user_id,
        (SELECT u.display_name FROM conversation_members cm2 JOIN users u ON u.id=cm2.user_id WHERE cm2.conversation_id=c.id AND cm2.user_id<>? LIMIT 1) AS other_user_name,
        (SELECT u.username FROM conversation_members cm2 JOIN users u ON u.id=cm2.user_id WHERE cm2.conversation_id=c.id AND cm2.user_id<>? LIMIT 1) AS other_username,
        (SELECT cm2.last_read_at FROM conversation_members cm2 WHERE cm2.conversation_id=c.id AND cm2.user_id<>? LIMIT 1) AS other_last_read_at
        FROM conversations c JOIN conversation_members cm ON cm.conversation_id=c.id
        WHERE cm.user_id=? AND NOT EXISTS(
          SELECT 1 FROM conversation_members cp WHERE cp.conversation_id=c.id AND cp.user_id<>? AND EXISTS(
            SELECT 1 FROM user_blocks b WHERE (b.blocker_id=? AND b.blocked_id=cp.user_id) OR (b.blocker_id=cp.user_id AND b.blocked_id=?)
          )
        ) ORDER BY COALESCE(last_message_at,c.updated_at) DESC LIMIT 50`).bind(user.id,user.id,user.id,user.id,user.id,user.id,user.id).all();
      return json({conversations:rows.results||[]});
    }
    if(method==="POST"&&path==="/api/conversations"){
      const user=await currentUser(request,env.DB);const denied=requireUser(user);if(denied)return denied;
      const data=await bodyJson(request),recipient=String(data.recipientId||"");
      if(!recipient||recipient===user.id)return fail("Choose another member to start a conversation.");
      const other=await env.DB.prepare("SELECT id FROM users WHERE id=? AND is_active=1").bind(recipient).first();if(!other)return fail("Member not found.",404,"not_found");
      if(await isBlocked(env.DB,user.id,recipient))return fail("You cannot message this member.",403,"blocked");
      const otherProfile=await userRecord(env.DB,recipient),messagePrivacy=otherProfile?.message_privacy||"everyone";
      const following=Boolean(await env.DB.prepare("SELECT 1 FROM follows WHERE follower_id=? AND following_id=?").bind(user.id,recipient).first());
      if(messagePrivacy==="none"||messagePrivacy==="followers"&&!following)return fail("This member only accepts messages from people they follow.",403,"messages_restricted");
      const existing=await env.DB.prepare("SELECT c.id FROM conversations c JOIN conversation_members a ON a.conversation_id=c.id AND a.user_id=? JOIN conversation_members b ON b.conversation_id=c.id AND b.user_id=? WHERE c.kind='direct' LIMIT 1").bind(user.id,recipient).first();
      if(existing)return json({conversationId:existing.id,existing:true});
      const id=randomId(),now=Math.floor(Date.now()/1000);
      await env.DB.batch([
        env.DB.prepare("INSERT INTO conversations(id,kind,created_by,created_at,updated_at) VALUES (?,'direct',?,?,?)").bind(id,user.id,now,now),
        env.DB.prepare("INSERT INTO conversation_members(conversation_id,user_id,joined_at) VALUES (?,?,?),(?,?,?)").bind(id,user.id,now,id,recipient,now)
      ]);
      return json({conversationId:id},201);
    }

    const liveChatMatch=path.match(/^\/api\/conversations\/([a-f0-9-]+)\/live$/);
    if(method==="GET"&&liveChatMatch){
      const user=await currentUser(request,env.DB);const denied=requireUser(user);if(denied)return denied;
      const member=await env.DB.prepare("SELECT 1 FROM conversation_members WHERE conversation_id=? AND user_id=?").bind(liveChatMatch[1],user.id).first();
      if(!member)return fail("Conversation not found.",404,"not_found");
      if(request.headers.get("Upgrade")?.toLowerCase()!=="websocket")return fail("A WebSocket connection is required.",426,"upgrade_required");
      if(!env.CHAT_ROOMS)return fail("Real-time messaging is not configured.",503,"realtime_unavailable");
      const room=env.CHAT_ROOMS.get(env.CHAT_ROOMS.idFromName(liveChatMatch[1]));
      const headers=new Headers(request.headers);
      headers.set("X-Elyvora-User-Id",user.id);
      return room.fetch(new Request("https://chat-room.internal/connect",{method:"GET",headers}));
    }

    const messagesMatch=path.match(/^\/api\/conversations\/([a-f0-9-]+)\/messages$/);
    if(messagesMatch&&method==="GET"){
      const user=await currentUser(request,env.DB);const denied=requireUser(user);if(denied)return denied;
      const member=await env.DB.prepare("SELECT 1 FROM conversation_members WHERE conversation_id=? AND user_id=?").bind(messagesMatch[1],user.id).first();if(!member)return fail("Conversation not found.",404,"not_found");
      const blockedPeer=await env.DB.prepare("SELECT cm.user_id FROM conversation_members cm WHERE cm.conversation_id=? AND cm.user_id<>? AND EXISTS(SELECT 1 FROM user_blocks b WHERE (b.blocker_id=? AND b.blocked_id=cm.user_id) OR (b.blocker_id=cm.user_id AND b.blocked_id=?)) LIMIT 1").bind(messagesMatch[1],user.id,user.id,user.id).first();
      if(blockedPeer)return fail("Conversation not found.",404,"not_found");
      const rows=await env.DB.prepare("SELECT m.id,m.body,m.message_type,m.media_url,m.created_at,m.sender_id,u.display_name,u.username FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.conversation_id=? AND m.deleted_at IS NULL ORDER BY m.created_at DESC LIMIT 100").bind(messagesMatch[1]).all();
      const receipt=await env.DB.prepare("SELECT read_receipts FROM user_privacy WHERE user_id=?").bind(user.id).first();
      if(receipt?.read_receipts!==0)await env.DB.prepare("UPDATE conversation_members SET last_read_at=? WHERE conversation_id=? AND user_id=?").bind(Math.floor(Date.now()/1000),messagesMatch[1],user.id).run();
      return json({messages:(rows.results||[]).reverse()});
    }
    if(messagesMatch&&method==="POST"){
      const user=await currentUser(request,env.DB);const denied=requireUser(user);if(denied)return denied;
      const member=await env.DB.prepare("SELECT 1 FROM conversation_members WHERE conversation_id=? AND user_id=?").bind(messagesMatch[1],user.id).first();if(!member)return fail("Conversation not found.",404,"not_found");
      const blockedPeer=await env.DB.prepare("SELECT cm.user_id FROM conversation_members cm WHERE cm.conversation_id=? AND cm.user_id<>? AND EXISTS(SELECT 1 FROM user_blocks b WHERE (b.blocker_id=? AND b.blocked_id=cm.user_id) OR (b.blocker_id=cm.user_id AND b.blocked_id=?)) LIMIT 1").bind(messagesMatch[1],user.id,user.id,user.id).first();
      if(blockedPeer)return fail("You cannot send messages in this conversation.",403,"blocked");
      const recipient=await env.DB.prepare("SELECT cm.user_id FROM conversation_members cm WHERE cm.conversation_id=? AND cm.user_id<>? LIMIT 1").bind(messagesMatch[1],user.id).first();
      if(recipient){
        const recipientProfile=await userRecord(env.DB,recipient.user_id),setting=recipientProfile?.message_privacy||"everyone";
        const senderFollows=Boolean(await env.DB.prepare("SELECT 1 FROM follows WHERE follower_id=? AND following_id=?").bind(user.id,recipient.user_id).first());
        if(setting==="none"||setting==="followers"&&!senderFollows)return fail("This member no longer accepts messages from your account.",403,"messages_restricted");
      }
      const data=await bodyJson(request),body=String(data.body||"").trim();
      const messageType=["text","image","video","voice"].includes(data.messageType)?data.messageType:"text";
      const mediaUrl=data.mediaUrl?String(data.mediaUrl):null;
      if(messageType==="text"&&(!body||body.length>4000))return fail("A text message must contain 1–4,000 characters.");
      if(messageType!=="text"){
        if(!mediaUrl||!/^\/api\/media\/[a-f0-9-]+$/.test(mediaUrl))return fail("Upload the attachment before sending it.");
        const media=await env.DB.prepare("SELECT owner_id,mime_type FROM media_assets WHERE id=?").bind(mediaUrl.split("/").pop()).first();
        if(!media||media.owner_id!==user.id)return fail("The attachment is not available to this account.",403,"media_not_owned");
        const expected=messageType==="image"?"image/":messageType==="video"?"video/":"audio/";
        if(!media.mime_type.startsWith(expected))return fail("The attachment type does not match this message.");
      }
      const id=randomId(),now=Math.floor(Date.now()/1000);
      await env.DB.batch([
        env.DB.prepare("INSERT INTO messages(id,conversation_id,sender_id,body,message_type,media_url,created_at) VALUES (?,?,?,?,?,?,?)").bind(id,messagesMatch[1],user.id,body,messageType,mediaUrl,now),
        env.DB.prepare("UPDATE conversations SET updated_at=? WHERE id=?").bind(now,messagesMatch[1])
      ]);
      const savedMessage={id,body,sender_id:user.id,message_type:messageType,media_url:mediaUrl,created_at:now};
      if(env.CHAT_ROOMS){
        try{
          const room=env.CHAT_ROOMS.get(env.CHAT_ROOMS.idFromName(messagesMatch[1]));
          await room.fetch("https://chat-room.internal/broadcast",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"message",message:savedMessage})});
        }catch(error){console.warn("ELYVORA real-time broadcast failed:",error);}
      }
      return json({message:savedMessage},201);
    }

    if(method==="GET"&&path==="/api/notifications"){
      const user=await currentUser(request,env.DB);const denied=requireUser(user);if(denied)return denied;
      const rows=await env.DB.prepare("SELECT id,kind,body,reference_id,read_at,created_at FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50").bind(user.id).all();
      return json({notifications:rows.results||[]});
    }

    const notificationReadMatch=path.match(/^\/api\/notifications\/([a-f0-9-]+)\/read$/);
    if(method==="POST"&&notificationReadMatch){
      const user=await currentUser(request,env.DB);const denied=requireUser(user);if(denied)return denied;
      await env.DB.prepare("UPDATE notifications SET read_at=? WHERE id=? AND user_id=? AND read_at IS NULL").bind(Math.floor(Date.now()/1000),notificationReadMatch[1],user.id).run();
      return json({markedRead:true});
    }

    const reportMatch=path==="/api/reports";
    if(method==="POST"&&reportMatch){
      const user=await currentUser(request,env.DB);const denied=requireUser(user);if(denied)return denied;
      const data=await bodyJson(request),targetType=String(data.targetType||""),targetId=String(data.targetId||""),reason=String(data.reason||""),details=String(data.details||"").slice(0,1000);
      if(!["user","post","message"].includes(targetType)||!targetId||!["spam","harassment","hate","misinformation","other"].includes(reason))return fail("Choose a valid report target and reason.");
      await env.DB.prepare("INSERT INTO reports(id,reporter_id,target_type,target_id,reason,details,created_at) VALUES (?,?,?,?,?,?,?)").bind(randomId(),user.id,targetType,targetId,reason,details,Math.floor(Date.now()/1000)).run();
      return json({submitted:true},201);
    }

    return fail("API route not found.",404,"not_found");
  } catch (error) {
    console.error("ELYVORA API error:", error);
    return fail("The request could not be completed. Please try again.",500,"server_error");
  }
}
