const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const core=require('../core.js');
const sandbox={window:{}};vm.runInNewContext(fs.readFileSync('data.js','utf8'),sandbox);
const data=JSON.parse(JSON.stringify(sandbox.window.WineLensData)),index=core.buildIndex(data);
test('every geometry has one stable code and one complete French card',()=>{
  assert.equal(data.communes.features.length,304);
  const codes=data.communes.features.map(f=>f.properties.code);
  assert.equal(new Set(codes).size,codes.length);
  assert.equal(Object.keys(data.cards).length,codes.length);
  for(const code of codes){const c=data.cards[code];assert.match(code,/^\d{5}$/);assert.ok(c.name&&c.area&&c.info);assert.ok(c.grapes);}
});
test('all formerly broken communes resolve by INSEE code',()=>{
  for(const name of ['Les Mesneux','Le Breuil','La Chapelle-sous-Orbais','La Neuville-aux-Larris','Étoges','Étréchy','Éguilly-sous-Bois']){
    const item=index.find(x=>x.name===name);assert.ok(item,name);assert.ok(item.card.grapes.values);assert.ok(item.card.area);
  }
});
test('search includes regions, ignores accents, punctuation and ligatures',()=>{
  for(const [query,name] of [['epernay','Épernay'],['oeuilly','Œuilly'],['ay champagne','Aÿ-Champagne'],['montagne de reims','Montagne de Reims'],['cote des blancs','Côte des Blancs']]){
    assert.ok(core.search(index,query).some(x=>x.name===name),query);
  }
  assert.equal(core.search(index,'  ').length,0);assert.equal(core.search(index,'zzzzzz').length,0);
});
test('invalid percentages are never displayed or silently normalized',()=>{
  const bezu=index.find(x=>x.name==='Bézu-le-Guéry');
  assert.equal(core.grapeState(bezu.card.grapes).status,'invalid');
  assert.deepEqual(core.grapeState(bezu.card.grapes).entries,[]);
  for(const value of [-1,101,NaN,Infinity,'100']){
    assert.equal(core.grapeState({values:{Chardonnay:value}}).status,'invalid');
  }
});
test('verified status requires a source and year; legacy data stays unverified',()=>{
  assert.equal(core.grapeState({status:'verified',values:{Chardonnay:100}}).status,'unverified');
  for(const card of Object.values(data.cards))assert.notEqual(core.grapeState(card.grapes).status,'verified');
  const record={status:'verified',values:{Chardonnay:100},source:{url:'https://example.org'},year:2024};
  assert.equal(core.grapeState(record).status,'verified');
});
test('fallback descriptions are short and explicit',()=>{
  assert.ok(Object.values(data.cards).some(x=>x.info.includes('nous n’avons pas d’anecdote')));
  for(const card of Object.values(data.cards))assert.doesNotMatch(card.info,/vignoble accompagne|lecture locale|paysage communal/);
});
test('communal geometry is unchanged from eca8fed, after removing one exact duplicate',()=>{
  const crypto=require('node:crypto');
  const geometry=data.communes.features.map(f=>[f.properties.code,f.geometry]).sort((a,b)=>a[0].localeCompare(b[0]));
  const sha=crypto.createHash('sha256').update(JSON.stringify(geometry)).digest('hex');
  assert.equal(sha,'d19129ccf553471d148e790149dcb3027e550636dca092343de74547e51c0dcb');
});
test('homonymous Bligny communes stay distinct and do not share unsourced grape values',()=>{
  const matches=core.search(index,'Bligny').filter(x=>x.name==='Bligny');
  assert.equal(matches.length,2);assert.notEqual(matches[0].id,matches[1].id);
  assert.equal(data.cards['51069'].area,'Vesle et Ardre');
  assert.equal(core.grapeState(data.cards['51069'].grapes).status,'missing');
});
