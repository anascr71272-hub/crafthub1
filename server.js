const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret-in-production";
const DB = path.join(__dirname, "data.json");

const seed = {
  users: [
    {id:"u1", username:"Admin", password:bcrypt.hashSync("admin123",10), role:"admin", favorites:[], createdAt:Date.now()},
    {id:"u2", username:"Steve", password:bcrypt.hashSync("steve123",10), role:"user", favorites:["s1"], createdAt:Date.now()}
  ],
  servers: [
    {id:"s1",name:"VortexMC",ip:"play.vortexmc.net",port:25565,version:"1.21.x",type:"SMP",description:"Survival SMP عربي مع اقتصاد ومهام ومجتمع نشط.",players:128,maxPlayers:500,rating:4.8,reviews:[],tags:["SMP","Survival","Arabic"],createdAt:Date.now()},
    {id:"s2",name:"LifeCraft",ip:"play.lifecraft.net",port:25565,version:"1.20-1.21",type:"LifeSteal",description:"LifeSteal PvP مع أحداث موسمية ونظام قلوب.",players:74,maxPlayers:300,rating:4.5,reviews:[],tags:["LifeSteal","PvP"],createdAt:Date.now()},
    {id:"s3",name:"BlockWars",ip:"play.blockwars.net",port:25565,version:"1.21.x",type:"BedWars",description:"BedWars سريع مع خرائط متنوعة وتحديات يومية.",players:203,maxPlayers:1000,rating:4.7,reviews:[],tags:["BedWars","Minigames"],createdAt:Date.now()}
  ],
  mods: [
    {id:"m1",name:"Simple Voice Chat",type:"Mod",version:"1.21",loader:"Fabric/Forge",description:"إضافة محادثة صوتية داخل Minecraft.",downloads:12000, rating:4.9},
    {id:"m2",name:"EssentialsX",type:"Plugin",version:"1.21",loader:"Paper/Spigot",description:"أدوات أساسية لإدارة سيرفرات Minecraft.",downloads:45000, rating:4.8},
    {id:"m3",name:"LuckPerms",type:"Plugin",version:"1.21",loader:"Paper/Spigot",description:"نظام صلاحيات ورُتب متقدم.",downloads:39000, rating:4.9}
  ],
  reports: []
};
function load(){ try { return JSON.parse(fs.readFileSync(DB,"utf8")); } catch { fs.writeFileSync(DB,JSON.stringify(seed,null,2)); return seed; } }
let db = load();
function save(){ fs.writeFileSync(DB, JSON.stringify(db,null,2)); }
function auth(req,res,next){
  const h=req.headers.authorization||"";
  if(!h.startsWith("Bearer ")) return res.status(401).json({error:"تسجيل الدخول مطلوب"});
  try { req.user=jwt.verify(h.slice(7),JWT_SECRET); next(); } catch { res.status(401).json({error:"جلسة غير صالحة"}); }
}
function admin(req,res,next){ if(req.user.role!=="admin") return res.status(403).json({error:"صلاحية Admin مطلوبة"}); next(); }
function publicUser(u){ return {id:u.id,username:u.username,role:u.role,favorites:u.favorites||[]}; }

app.use(express.json());
app.use(express.static(path.join(__dirname,"public")));

app.post("/api/register", async (req,res)=>{
  const {username,password}=req.body;
  if(!username || !password || username.length<3 || password.length<6) return res.status(400).json({error:"اسم المستخدم 3 أحرف على الأقل وكلمة المرور 6 أحرف على الأقل"});
  if(db.users.some(u=>u.username.toLowerCase()===username.toLowerCase())) return res.status(409).json({error:"اسم المستخدم موجود بالفعل"});
  const user={id:"u"+Date.now(),username,password:await bcrypt.hash(password,10),role:"user",favorites:[],createdAt:Date.now()};
  db.users.push(user); save();
  const token=jwt.sign({id:user.id,username:user.username,role:user.role},JWT_SECRET,{expiresIn:"7d"});
  res.json({token,user:publicUser(user)});
});
app.post("/api/login", async (req,res)=>{
  const {username,password}=req.body;
  const user=db.users.find(u=>u.username.toLowerCase()===String(username||"").toLowerCase());
  if(!user || !(await bcrypt.compare(password||"",user.password))) return res.status(401).json({error:"بيانات الدخول غير صحيحة"});
  const token=jwt.sign({id:user.id,username:user.username,role:user.role},JWT_SECRET,{expiresIn:"7d"});
  res.json({token,user:publicUser(user)});
});
app.get("/api/me",auth,(req,res)=>res.json(publicUser(db.users.find(u=>u.id===req.user.id))));

app.get("/api/servers",(req,res)=>{
  let list=db.servers.map(s=>({...s,rating:s.reviews.length?s.reviews.reduce((a,r)=>a+r.rating,0)/s.reviews.length:s.rating}));
  const q=String(req.query.q||"").toLowerCase(), type=req.query.type||"all";
  if(q) list=list.filter(s=>(s.name+" "+s.type+" "+s.description+" "+s.tags.join(" ")).toLowerCase().includes(q));
  if(type!=="all") list=list.filter(s=>s.type===type);
  res.json(list);
});
app.post("/api/servers",auth,admin,(req,res)=>{
  const {name,ip,port=25565,version,type="Survival",description="",maxPlayers=100,tags=[]}=req.body;
  if(!name||!ip) return res.status(400).json({error:"الاسم وIP مطلوبان"});
  const s={id:"s"+Date.now(),name,ip,port:Number(port),version,type,description,players:0,maxPlayers:Number(maxPlayers),rating:0,reviews:[],tags,createdAt:Date.now()};
  db.servers.push(s); save(); res.json(s);
});
app.delete("/api/servers/:id",auth,admin,(req,res)=>{
  db.servers=db.servers.filter(s=>s.id!==req.params.id); save(); res.json({ok:true});
});
app.post("/api/servers/:id/reviews",auth,(req,res)=>{
  const s=db.servers.find(x=>x.id===req.params.id), rating=Number(req.body.rating), text=String(req.body.text||"").slice(0,500);
  if(!s || rating<1 || rating>5 || !text) return res.status(400).json({error:"تقييم غير صالح"});
  if(s.reviews.some(r=>r.userId===req.user.id)) return res.status(409).json({error:"لقد قيّمت هذا السيرفر من قبل"});
  s.reviews.push({id:"r"+Date.now(),userId:req.user.id,username:req.user.username,rating,text,createdAt:Date.now()}); save();
  res.json(s.reviews.at(-1));
});
app.get("/api/servers/:id/reviews",(req,res)=>{
  const s=db.servers.find(x=>x.id===req.params.id); if(!s) return res.status(404).json({error:"غير موجود"});
  res.json(s.reviews);
});
app.post("/api/favorites/:id",auth,(req,res)=>{
  const u=db.users.find(x=>x.id===req.user.id);
  u.favorites=u.favorites||[];
  if(u.favorites.includes(req.params.id)) u.favorites=u.favorites.filter(x=>x!==req.params.id); else u.favorites.push(req.params.id);
  save(); res.json(u.favorites);
});

app.get("/api/mods",(req,res)=>{
  let list=db.mods; const q=String(req.query.q||"").toLowerCase(), type=req.query.type||"all";
  if(q) list=list.filter(m=>(m.name+" "+m.description+" "+m.loader).toLowerCase().includes(q));
  if(type!=="all") list=list.filter(m=>m.type===type);
  res.json(list);
});
app.post("/api/mods",auth,admin,(req,res)=>{
  const {name,type="Mod",version,loader,description="",downloads=0,rating=0}=req.body;
  if(!name) return res.status(400).json({error:"اسم التعديل مطلوب"});
  const m={id:"m"+Date.now(),name,type,version,loader,description,downloads:Number(downloads),rating:Number(rating)};
  db.mods.push(m); save(); res.json(m);
});
app.delete("/api/mods/:id",auth,admin,(req,res)=>{db.mods=db.mods.filter(m=>m.id!==req.params.id);save();res.json({ok:true})});

app.post("/api/reports",auth,(req,res)=>{
  const {targetType,targetId,reason}=req.body;
  if(!reason) return res.status(400).json({error:"اكتب سبب البلاغ"});
  db.reports.push({id:"rep"+Date.now(),userId:req.user.id,username:req.user.username,targetType,targetId,reason,status:"open",createdAt:Date.now()});
  save(); res.json({ok:true});
});
app.get("/api/admin/reports",auth,admin,(req,res)=>res.json(db.reports));
app.patch("/api/admin/reports/:id",auth,admin,(req,res)=>{
  const r=db.reports.find(x=>x.id===req.params.id); if(!r)return res.status(404).json({error:"غير موجود"});
  r.status=req.body.status||"closed"; save(); res.json(r);
});

const rooms = new Map(); // room -> Map(socketId,{username})
io.on("connection", socket=>{
  socket.on("room:join",({room,username})=>{
    room=String(room||"Lobby").slice(0,40); username=String(username||"Guest").slice(0,24);
    const old=socket.data.room;
    if(old && rooms.has(old)) { rooms.get(old).delete(socket.id); socket.to(old).emit("room:user-left",socket.id); }
    if(!rooms.has(room)) rooms.set(room,new Map());
    const members=[...rooms.get(room)].map(([id,v])=>({id,username:v.username}));
    socket.join(room); socket.data.room=room; socket.data.username=username;
    socket.emit("room:members",members); socket.to(room).emit("room:user-joined",{id:socket.id,username});
  });
  socket.on("voice:offer",({to,offer})=>io.to(to).emit("voice:offer",{from:socket.id,offer}));
  socket.on("voice:answer",({to,answer})=>io.to(to).emit("voice:answer",{from:socket.id,answer}));
  socket.on("voice:ice",({to,candidate})=>io.to(to).emit("voice:ice",{from:socket.id,candidate}));
  socket.on("disconnect",()=>{const r=socket.data.room;if(r&&rooms.has(r)){rooms.get(r).delete(socket.id);socket.to(r).emit("room:user-left",socket.id);}});
  socket.on("room:join",({room,username})=>{ if(rooms.has(room)) rooms.get(room).set(socket.id,{username}); });
});
app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
server.listen(PORT,()=>console.log(`Minecraft Hub running on http://localhost:${PORT}`));
