const express=require('express'),path=require('path'),dns=require('dns').promises,net=require('net'),{Readable}=require('stream');
const S=require('scrapr');
const app=express(),UA='Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36';
app.set('trust proxy',1);app.use(express.json({limit:'10kb'}));
app.use(express.static(path.join(__dirname,'public')));

// batas 30 permintaan / menit / IP
const hits=new Map();setInterval(()=>hits.clear(),10*60*1000).unref();
app.use('/api',(req,res,next)=>{const n=Date.now(),a=(hits.get(req.ip)||[]).filter(t=>n-t<6e4);a.push(n);hits.set(req.ip,a);
 if(a.length>30)return res.status(429).json({ok:false,message:'Terlalu banyak permintaan, coba lagi sebentar.'});next()});

// pilih scraper berdasarkan domain (cadangan berurutan, tanpa yang butuh browser)
const f=(p,...m)=>m.map(x=>S[p]&&S[p][x]).filter(Boolean);
const PLAT=[
 [/(^|\.)(tiktok\.com)$/,'TikTok',()=>f('tiktok','tiktokio','snaptik','ssstik')],
 [/(^|\.)(instagram\.com)$/,'Instagram',()=>f('instagram','indown','downreels')],
 [/(^|\.)(facebook\.com|fb\.watch)$/,'Facebook',()=>f('facebook','snapsave')],
 [/(^|\.)(twitter\.com|x\.com)$/,'X / Twitter',()=>f('twitter','tweeload','tvd')],
 [/(^|\.)(pinterest\.[a-z.]+|pin\.it)$/,'Pinterest',()=>f('pinterest','pindown')],
 [/(^|\.)(youtube\.com|youtu\.be)$/,'YouTube',()=>f('youtube','ytmp3')],
 [/(^|\.)(spotify\.com)$/,'Spotify',()=>f('spotify','spotmate','spotidown')],
 [/(^|\.)(soundcloud\.com)$/,'SoundCloud',()=>f('soundcloud','klickaud')],
 [/(^|\.)(threads\.net|threads\.com)$/,'Threads',()=>f('threads','threadster')],
 [/(^|\.)(bandcamp\.com)$/,'Bandcamp',()=>f('bandcamp','bandcampdownloader')],
 [/(^|\.)(bilibili\.com|b23\.tv)$/,'Bilibili',()=>f('bilibili','snapwc')],
 [/(^|\.)(douyin\.com)$/,'Douyin',()=>f('douyin','direct')],
 [/(^|\.)(music\.apple\.com)$/,'Apple Music',()=>f('applemusic','aplmate')],
];
const ext=u=>((String(u).split('?')[0].match(/\.(\w{2,4})$/)||[])[1]||'').toLowerCase();
function kindOf(d){const t=String(d.type||'').toLowerCase(),e=ext(d.url);
 if(/audio|mp3|music/.test(t)||['mp3','m4a','aac','opus'].includes(e))return'audio';
 if(/image|photo|pic/.test(t)||['jpg','jpeg','png','webp','heic'].includes(e))return'photo';
 return'video'}
const timeout=(p,ms)=>Promise.race([p,new Promise((_,j)=>setTimeout(()=>j(new Error('timeout')),ms))]);

app.post('/api/resolve',async(req,res)=>{
 let u;try{u=new URL(String(req.body.url||'').slice(0,500));if(!/^https?:$/.test(u.protocol))throw 0}
 catch(e){return res.status(400).json({ok:false,message:'Tautan tidak valid.'})}
 const p=PLAT.find(x=>x[0].test(u.hostname));
 if(!p)return res.status(400).json({ok:false,message:'Platform ini belum didukung.'});
 for(const scrape of p[2]()){
  try{const r=await timeout(scrape(u.href),60000);
   if(r&&r.status&&r.result){const x=r.result;
    const items=(x.downloads||[]).filter(d=>d&&d.url).map(d=>{const kind=kindOf(d);
     return{url:d.url,kind,quality:String(d.quality||d.label||d.name||d.text||d.resolution||d.format||d.size||''),caption:d.caption||d.title||d.text||'',thumb:d.thumbnail||d.thumb||(kind==='photo'?d.url:'')}}).filter((d,i,a)=>a.findIndex(y=>y.url===d.url)===i);
    console.log('[scrapr]',p[1],JSON.stringify(x.downloads).slice(0,1500));if(items.length)return res.json({ok:true,platform:p[1],title:x.title||'Tanpa judul',thumbnail:x.thumbnail||'',items})}
  }catch(e){}
 }
 res.status(502).json({ok:false,message:'Gagal mengambil media. Pastikan tautan publik, atau coba lagi nanti.'});
});

// proxy unduhan (menghindari blokir CDN) dengan perlindungan SSRF
const priv=ip=>net.isIPv4(ip)?/^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip):/^(::1|::|fc|fd|fe80)/i.test(ip);
async function safeFetch(u,n=0){const x=new URL(u);if(!/^https?:$/.test(x.protocol)||n>4)throw 0;
 const{address}=await dns.lookup(x.hostname);if(priv(address))throw 0;
 const r=await fetch(x,{redirect:'manual',headers:{'user-agent':UA}});
 if(r.status>=300&&r.status<400&&r.headers.get('location'))return safeFetch(new URL(r.headers.get('location'),x).href,n+1);
 return r}
app.get('/api/dl',async(req,res)=>{
 try{const r=await safeFetch(String(req.query.url||''));if(!r.ok||!r.body)throw 0;
  const name=String(req.query.name||'necdl').replace(/[^\w.\- ]/g,'_').slice(0,80);
  res.setHeader('Content-Type',r.headers.get('content-type')||'application/octet-stream');
  const l=r.headers.get('content-length');if(l)res.setHeader('Content-Length',l);
  if(!req.query.inline)res.setHeader('Content-Disposition',`attachment; filename="${name}"`);
  const s=Readable.fromWeb(r.body);s.on('error',()=>res.destroy());s.pipe(res);
 }catch(e){res.status(400).send('Gagal mengambil file')}
});
if(require.main===module)app.listen(process.env.PORT||3000,()=>console.log('NecDL jalan di port '+(process.env.PORT||3000)));
module.exports=app;
