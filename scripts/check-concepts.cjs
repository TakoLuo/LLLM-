const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const context = { window: { addEventListener() {} }, document: { addEventListener() {} }, console };
vm.createContext(context);
vm.runInContext(fs.readFileSync('dist/concept-data.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('dist/foundation-labs.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('dist/concepts.js', 'utf8').replace('  createPages();', ''), context);
const { entries, groups } = context.window.ConceptData;
const { math } = context.window.ReportConcepts;
const foundations=context.window.ReportFoundations.math;
assert.deepEqual(Array.from({length:48},(_,i)=>i+1).filter(n=>context.window.ReportFoundations.handles(n)),[2,5,7,8,24]);
for(let k=0;k<3;k++) {
  assert.ok(Math.abs(foundations.response[k].reduce((s,v)=>s+v,0)-1)<1e-12);
  foundations.response[k].forEach((v,i)=>assert.ok(Math.abs(v-math.response[k][i])<1e-12,'Topics 07 and 08 must use the existing sensor weights'));
}
for(const material of ['leaf','soil']) {
  const neutral=foundations.illumination(material,'neutral'),warm=foundations.illumination(material,'warm');
  assert.deepEqual(Array.from(neutral.reflectance),Array.from(warm.reflectance));
  neutral.reflectance.forEach((v,i)=>assert.ok(Math.abs(warm.outgoing[i]-v*warm.light[i])<1e-12));
  assert.ok(Math.abs(warm.outgoing[5]/neutral.outgoing[5]-.6)<1e-12,'450 nm must change visibly');
  assert.ok(Math.abs(warm.outgoing[25]/neutral.outgoing[25]-1.4)<1e-12,'650 nm must change visibly');
  for(const warmth of [-100,-35,0,45,100])for(const brightness of [0,25,100,150]) {
    const m=foundations.illumination(material,warmth,brightness);
    assert.deepEqual(Array.from(m.reflectance),Array.from(neutral.reflectance),'Lighting must not change material reflectance');
    m.outgoing.forEach((v,i)=>{
      assert.ok(v>=0&&v<=1&&m.light[i]>=0&&m.light[i]<=1.8+1e-12,'All plotted values must remain inside the fixed axes');
      assert.ok(Math.abs(v-m.light[i]*m.reflectance[i])<1e-12,'Every band must use E times reflectance');
      assert.ok(Math.abs(v-foundations.illumination(material,warmth,100).outgoing[i]*brightness/100)<1e-12,'Brightness must scale all bands equally');
    });
    m.rgb.forEach((v,k)=>{
      assert.ok(Math.abs(v-foundations.response[k].reduce((sum,r,i)=>sum+r*m.outgoing[i],0))<1e-12);
      assert.ok(v>=0&&v<=1,'Preview must not require clipping within supported controls');
      assert.equal(m.display[k],Math.round(255*v**(1/2.2)));
      if(brightness===0){assert.equal(v,0);assert.equal(m.display[k],0);}
    });
  }
  const cool=foundations.illumination(material,-100);
  assert.ok(cool.outgoing[5]>neutral.outgoing[5]&&cool.outgoing[25]<neutral.outgoing[25]);
}
assert.ok(Math.abs(foundations.weighted('toy','leaf',3).full[0]-.56)<1e-12);
for(let mask=0;mask<8;mask++) {
  const selected=[0,1,2].filter(i=>mask&(1<<i)),m=foundations.weighted('toy','leaf',selected);
  assert.equal(m.included,selected.length);
  m.partial.forEach((v,k)=>assert.ok(Math.abs(v-selected.reduce((s,i)=>s+foundations.toy.signal[i]*foundations.toy.response[k][i],0))<1e-12));
}
assert.ok(Math.abs(foundations.weighted('toy','leaf',[2]).partial[0]-.24)<1e-12,'650 nm can be selected first');
assert.ok(Math.abs(foundations.weighted('toy','leaf',[2,0]).partial[0]-.26)<1e-12,'Noncontiguous bands must not become a prefix');
assert.deepEqual(Array.from(foundations.weighted('toy','leaf',[2,0]).partial),Array.from(foundations.weighted('toy','leaf',[0,2]).partial),'Selection order must not change the sum');
for(const selected of [[],[30],[0,15,30],[30,0,15,15],Array.from({length:31},(_,i)=>i)])for(const material of ['leaf','soil','sky']){
  const m=foundations.weighted('full',material,selected),unique=[...new Set(selected)].sort((a,b)=>a-b);
  assert.equal(m.included,unique.length);
  m.partial.forEach((v,k)=>assert.ok(Math.abs(v-unique.reduce((s,i)=>s+m.h[i]*m.r[k][i],0))<1e-12));
  if(unique.length===31)assert.deepEqual(Array.from(m.partial),Array.from(m.full));
}
for(const size of ['toy','full'])for(const material of ['leaf','soil','sky']) {
  const count=size==='toy'?3:31;
  for(let n=0;n<=count;n++) {
    const m=foundations.weighted(size,material,n);
    m.partial.forEach((v,k)=>assert.ok(Math.abs(v-m.products[k].slice(0,n).reduce((s,a)=>s+a,0))<1e-12));
    if(n===count)assert.deepEqual(Array.from(m.partial),Array.from(m.full));
  }
}
for(let pixel=0;pixel<25;pixel++)for(const lambda of foundations.waves){const m=foundations.cube(pixel,lambda);assert.equal(m.value,m.image[pixel]);assert.equal(m.value,m.h[m.index]);}
const one=foundations.sparse([.8,0,0,0,0,0,0,0]),two=foundations.sparse([.8,0,0,.45,0,0,0,0]),negative=foundations.sparse([-.5,0,0,0,0,0,0,0]);
assert.equal(one.used,1);assert.equal(two.used,2);assert.ok(one.error>.01);assert.ok(two.error<1e-12);assert.ok(negative.error>one.error);
assert.equal(entries.length, 48);
assert.equal(groups.length, 8);
assert.equal(new Set(entries.map(e => e.id)).size, 48);
entries.forEach(e => {
  for (const field of ['title', 'question', 'idea', 'example', 'boundary']) {
    assert.equal(e[field].length, 2, `${e.id}: missing bilingual ${field}`);
    assert.ok(e[field].every(s => typeof s === 'string' && s.length > 3));
  }
  assert.equal(e.steps.length, 3);
  assert.equal(e.terms.length, 2);
  assert.ok(e.terms.every(term => term.length === 4));
  assert.ok(e.group >= 0 && e.group < 8);
});
const dot = (a,b) => a.reduce((s,v,i) => s+v*b[i],0);
const norm = a => Math.sqrt(dot(a,a));
const q = math.nullDirection;
assert.ok(norm(math.response.map(row => dot(row,q))) < 1e-12, 'Null direction must really cancel all three responses');
assert.ok(q.every(v => Math.abs(v) <= 1+1e-12));
const pair=math.signaturePair();
assert.ok(pair.a.every(v=>v>=0&&v<=.7) && pair.b.every(v=>v>=0&&v<=.7), 'Signature samples must stay in the displayed signal range');
assert.ok(norm(pair.rgbA.map((v,i)=>v-pair.rgbB[i]))<1e-12, 'The two signature samples must really match in linear RGB');
assert.deepEqual(Array.from(pair.displayA),Array.from(pair.displayB), 'The displayed colors must match after encoding');
assert.ok(pair.displayA[1]>pair.displayA[0]&&pair.displayA[1]>pair.displayA[2], 'Both camera previews must be green-dominant');
assert.ok(Math.abs(pair.a[pair.maxDifferenceIndex]-pair.b[pair.maxDifferenceIndex])>.1, 'The selected band must show a visible spectral difference');
const states = math.omp();
assert.equal(states.length, 4);
for (let i=1;i<states.length;i++) {
  assert.ok(norm(states[i].residual) <= norm(states[i-1].residual)+1e-12, 'OMP error must not grow');
}
assert.ok(norm(states.at(-1).residual)<1e-9, 'Three independent atoms must fit this synthetic RGB');
assert.ok(Math.abs(states[2].weights[0]-states[1].weights[0])>1e-4, 'The refit example must actually change an old weight');
const vectors = [[1,.6],[.7,.9],[1.2,1],[.9,.7]];
const optimum = math.principalAngle(vectors), minimum = math.directionError(vectors,optimum);
for(let degrees=0;degrees<=90;degrees++)assert.ok(minimum<=math.directionError(vectors,degrees*Math.PI/180)+1e-10, 'SVD direction must minimize this residual objective');
assert.ok(Math.abs(minimum-math.directionError(vectors,optimum+Math.PI))<1e-10, 'Joint sign flip must preserve error');
console.log(JSON.stringify({topics:entries.length,groups:groups.length,uniqueLabs:new Set(entries.map(e=>e.lab)).size,foundationPages:[2,5,7,8,24],cubeIntersectionsChecked:25*31,sparseErrors:[one.error,two.error],nullResidual:norm(math.response.map(row=>dot(row,q))),ompOrder:states.at(-1).selected.map(i=>i+1),ompFinalResidual:norm(states.at(-1).residual),svdMinimum:minimum}));
