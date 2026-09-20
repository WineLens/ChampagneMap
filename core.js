(function(root){
  'use strict';
  function normalize(value){return String(value).toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/œ/g,'oe').replace(/æ/g,'ae').replace(/[^a-z0-9]/g,'');}
  function key(feature){return feature.properties.code ? 'commune:'+feature.properties.code : 'region:'+feature.properties.id;}
  function buildIndex(data){
    return data.regions.concat(data.communes.features).map(function(feature){
      var card=feature.properties.code ? data.cards[feature.properties.code] : feature.properties;
      if(!card) throw new Error('Fiche manquante : '+feature.properties.code);
      return {id:key(feature),feature:feature,card:card,name:card.name,kind:feature.properties.code?'Commune':'Région',search:normalize(card.name)};
    }).sort(function(a,b){return a.name.localeCompare(b.name,'fr');});
  }
  function search(index,query){var q=normalize(query);return q?index.filter(function(x){return x.search.includes(q);}).sort(function(a,b){return Number(b.search===q)-Number(a.search===q)||a.name.localeCompare(b.name,'fr');}):[];}
  function grapeState(record){
    if(!record||!record.values)return {status:'missing',entries:[]};
    var entries=Object.entries(record.values),total=entries.reduce(function(sum,x){return sum+x[1];},0);
    if(!entries.length||entries.some(function(x){return typeof x[1]!=='number'||!Number.isFinite(x[1])||x[1]<0||x[1]>100;})||Math.abs(total-100)>2)return {status:'invalid',entries:[],total:total};
    var verified=record.status==='verified'&&record.source&&record.source.url&&record.year;
    return {status:verified?'verified':'unverified',entries:entries,total:total};
  }
  var api={normalize:normalize,key:key,buildIndex:buildIndex,search:search,grapeState:grapeState};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.WineLensCore=api;
})(typeof window!=='undefined'?window:this);
