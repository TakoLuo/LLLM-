const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const context={window:{}};vm.createContext(context);
vm.runInContext(fs.readFileSync('dist/literature.js','utf8'),context);
const {sources,topics,math:m}=context.window.ReportLiterature;
assert.equal(topics.length,26);assert.equal(new Set(topics.map(x=>x.number)).size,26);
assert.equal(topics.filter(x=>x.kind).length,8);assert.equal(new Set(topics.filter(x=>x.kind).map(x=>x.kind)).size,8);
for(const p of topics){assert.ok(p.number>=1&&p.number<=48);assert.equal(p.points.length,2);assert.ok(p.points.every(pair=>pair.length===2&&pair.every(x=>typeof x==='string'&&x.length>15)));for(const id of p.refs)assert.ok(sources[id]);}
for(const s of Object.values(sources)){assert.ok(s.url.startsWith('https://'));assert.equal(s.scope.length,2);}
for(const t of [1,1.5,2,3,4]){const x=m.calibration(t);x.counts.forEach((v,i)=>assert.ok(Math.abs(v/(x.light[i]*t)-x.sensitivity[i])<1e-12));}
assert.equal(m.denominator(false).percent,.08);assert.equal(m.denominator(true).percent,8);
assert.deepEqual(Array.from(m.pcaCounts.NATURAL),[8,23]);assert.deepEqual(Array.from(m.pcaCounts.MUNSELL),[5,18]);
for(const n of Object.values(m.pcaCounts))assert.ok(n[0]<n[1]);
const best=m.rankOne(m.optimum()),flipped=m.rankOne(m.optimum(),true);
for(let i=0;i<=900;i++)assert.ok(best.error<=m.rankOne(i*Math.PI/1800).error+1e-12);
assert.ok(Math.abs(best.error-flipped.error)<1e-12);
best.estimate.forEach((v,i)=>v.forEach((x,j)=>assert.ok(Math.abs(x-flipped.estimate[i][j])<1e-12)));
const fit=m.refitExample();assert.ok(fit.joint.error<fit.frozen.error);assert.ok(Math.abs(fit.joint.oldDot)<1e-12);assert.ok(Math.abs(fit.frozen.oldDot)>.001);assert.ok(Math.abs(fit.joint.weights[0]-fit.initial)>.001);
assert.equal(sources[26].status,'unavailable');assert.equal(sources[31].status,'abstract');
const used=[...new Set(topics.flatMap(p=>p.refs))].filter(id=>sources[id].status==='read');
assert.equal(used.length,9); // Eight original papers plus NASA/JPL website [23].
console.log(JSON.stringify({updatedPages:topics.length,newInteractions:8,readSources:used,bestRankOneError:best.error,frozenError:fit.frozen.error,ompRefitError:fit.joint.error}));
