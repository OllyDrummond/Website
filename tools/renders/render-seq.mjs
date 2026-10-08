import { chromium } from 'playwright';
import fs from 'fs';
const [,,name,query,outdir]=process.argv;
fs.mkdirSync(outdir,{recursive:true});
const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:400,height:300}});
p.on('pageerror',e=>console.log('ERR',e.message)); p.on('console',m=>m.type()==='error'&&console.log(m.text()));
const t=Date.now(); let saved=0;
await p.goto('http://localhost:8790/scene.html?s='+name+'&'+query);
while(true){
  const st=await p.evaluate((k)=>({n:(window.shots||[]).length,done:!!window.done,next:(window.shots||[]).slice(k)}),saved);
  for(const d of st.next){fs.writeFileSync(`${outdir}/${String(saved).padStart(2,'0')}.webp`,Buffer.from(d.split(',')[1],'base64'));saved++;}
  if(st.done&&saved>=st.n)break; await new Promise(r=>setTimeout(r,2000));
}
await b.close(); console.log(name,saved,'frames',(Date.now()-t)/1000+'s');
