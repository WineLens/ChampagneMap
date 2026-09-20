(function(){
  'use strict';
  const data=window.WineLensData, core=window.WineLensCore, $=id=>document.getElementById(id);
  const input=$('mapSearch'), results=$('searchResults');
  if(!window.L||!data||!core){$('mapStatus').textContent='La carte n’a pas pu être chargée. Vérifiez votre connexion puis rechargez la page.';return;}
  const index=core.buildIndex(data), entries=new Map(index.map(x=>[x.id,x]));
  const map=L.map('map').setView([48.848,4.345],8).setMaxBounds(L.latLngBounds([49.4065,2.8290],[47.8633,5.3334]));
  const tiles=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',maxZoom:19
  }).addTo(map);
  tiles.on('tileerror',()=>{$('mapStatus').textContent='Fond de carte indisponible. La recherche et les contours restent utilisables.';});
  const normal={weight:2,color:'#667a6a',fillColor:'#a5b7a3',fillOpacity:.18};
  const highlight={weight:4,color:'#9a7b43',fillColor:'#d9c79f',fillOpacity:.38};
  const layers=new Map();
  let selectedId=null, activeGroup=null, matches=[], activeResult=-1;
  // Create each feature once. Search reuses the same layer as a map click.
  function onFeature(feature,layer){
    const id=core.key(feature);layers.set(id,layer);
    layer.on('mouseover',()=>{if(id!==selectedId)layer.setStyle({weight:3,color:'#9a7b43',fillOpacity:.28});});
    layer.on('mouseout',()=>{if(id!==selectedId)layer.setStyle(normal);});
    layer.on('click',()=>select(id,true));
  }
  const regions=L.geoJSON(data.regions,{style:normal,onEachFeature:onFeature});
  const communes=L.geoJSON(data.communes,{style:normal,onEachFeature:onFeature});
  function renderZoom(){
    const next=map.getZoom()>=12?communes:regions;
    if(activeGroup!==next){if(activeGroup)map.removeLayer(activeGroup);activeGroup=next;activeGroup.addTo(map);}
    const layer=layers.get(selectedId);
    if(layer&&map.hasLayer(layer)){layer.setStyle(highlight);layer.bringToFront();}
  }
  map.on('zoomend',renderZoom);renderZoom();
  function paragraph(container,text,className='empty-copy'){
    const p=document.createElement('p');p.className=className;p.textContent=text;container.appendChild(p);return p;
  }
  function sourceLink(container,source){
    if(!source||!source.url.startsWith('https://'))return;
    const a=document.createElement('a');a.href=source.url;a.textContent=source.title||'Source';a.className='source-link';container.appendChild(a);
  }
  function showCard(item){
    const card=item.card;
    $('zoneKind').textContent=item.kind==='Commune'?'COMMUNE':'RÉGION VITICOLE';
    $('typeOfZone').textContent=item.name;$('f1').textContent=item.kind==='Commune'?'Terroir':'Champagne';
    $('f2').textContent=card.area||item.name;$('f3').textContent=card.info;
    const grapes=$('grapeContent');grapes.replaceChildren();
    if(card.grapeNote){paragraph(grapes,card.grapeNote);sourceLink(grapes,card.grapeSource);}
    const state=core.grapeState(card.grapes);
    if(state.status==='invalid')paragraph(grapes,'Répartition en cours de vérification : les chiffres disponibles sont incomplets ou incohérents.');
    else if(state.status==='missing')paragraph(grapes,'Répartition des cépages non documentée pour cette zone.');
    else{
      let target=grapes;
      if(state.status==='unverified'){
        paragraph(grapes,'Chiffres indicatifs non vérifiés — source et année non renseignées.');
        target=document.createElement('details');
        const summary=document.createElement('summary');summary.textContent='Voir les chiffres à vérifier';
        target.appendChild(summary);grapes.appendChild(target);
      }else{sourceLink(grapes,card.grapes.source);paragraph(grapes,'Année : '+card.grapes.year);}
      const list=document.createElement('div');list.className='grape-list';target.appendChild(list);
      state.entries.forEach(([name,value])=>{
        const row=document.createElement('div');row.className='grape-line';
        const label=document.createElement('span');label.textContent=name==='Other'?'Autres':name;
        const bar=document.createElement('div');bar.className='grape-bar';bar.setAttribute('aria-hidden','true');
        const fill=document.createElement('i');fill.style.width=value+'%';bar.appendChild(fill);
        const amount=document.createElement('strong');amount.textContent=value.toLocaleString('fr')+' %';
        row.append(label,bar,amount);list.appendChild(row);
      });
      if(state.total!==100)paragraph(target,'Total : '+state.total.toLocaleString('fr')+' %. Écart non corrigé automatiquement.');
    }
    $('producerContent').textContent='Nous n’avons pas encore de fiche producteur pour cette zone.';
    $('selectionStatus').textContent=item.kind+' sélectionnée : '+item.name;
  }
  function select(id,zoom){
    const item=entries.get(id);if(!item)return;
    const previous=layers.get(selectedId);if(previous)previous.setStyle(normal);
    selectedId=id;const layer=layers.get(id);layer.setStyle(highlight);
    showCard(item);input.value=item.name;closeResults();
    if(zoom){
      map.fitBounds(layer.getBounds(),{padding:[25,25],maxZoom:item.kind==='Commune'?13:11,animate:false});
      if(item.kind==='Commune'&&map.getZoom()<12)map.setZoom(12,{animate:false});
    }
    renderZoom();
  }
  function closeResults(){results.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');activeResult=-1;}
  function activate(i){
    activeResult=i;results.querySelectorAll('[role="option"]').forEach((el,n)=>el.setAttribute('aria-selected',String(n===i)));
    if(i>=0){input.setAttribute('aria-activedescendant','search-option-'+i);results.querySelectorAll('[role="option"]')[i].scrollIntoView({block:'nearest'});}
  }
  function renderResults(){
    matches=core.search(index,input.value);results.replaceChildren();activeResult=-1;input.removeAttribute('aria-activedescendant');
    if(!core.normalize(input.value)){closeResults();$('searchStatus').textContent='';return;}
    if(!matches.length)paragraph(results,'Aucun résultat','search-empty');
    matches.forEach((item,i)=>{
      const option=document.createElement('div');option.id='search-option-'+i;option.className='search-result';
      option.setAttribute('role','option');option.setAttribute('aria-selected','false');
      const name=document.createElement('strong');name.textContent=item.name;
      const kind=document.createElement('span');kind.textContent=item.kind+(item.card.area?' · '+item.card.area:'');
      option.append(name,kind);option.addEventListener('click',()=>select(item.id,true));results.appendChild(option);
    });
    results.hidden=false;input.setAttribute('aria-expanded','true');$('searchStatus').textContent=matches.length+' résultat'+(matches.length===1?'':'s');
  }
  input.addEventListener('input',renderResults);input.addEventListener('focus',()=>{if(input.value)renderResults();});
  input.addEventListener('keydown',event=>{
    if(event.key==='Escape'||event.key==='Tab'){closeResults();return;}
    if((event.key==='ArrowDown'||event.key==='ArrowUp')&&matches.length){
      event.preventDefault();if(results.hidden)renderResults();
      activate(activeResult<0?(event.key==='ArrowDown'?0:matches.length-1):(activeResult+(event.key==='ArrowDown'?1:-1)+matches.length)%matches.length);
    }else if(event.key==='Enter'&&!results.hidden&&matches.length){event.preventDefault();select(matches[Math.max(0,activeResult)].id,true);}
  });
  document.addEventListener('click',event=>{if(!event.target.closest('.search-wrap'))closeResults();});
  $('resetMap').addEventListener('click',()=>{
    const layer=layers.get(selectedId);if(layer)layer.setStyle(normal);
    selectedId=null;input.value='';matches=[];closeResults();
    $('zoneKind').textContent='RÉGIONS ET COMMUNES';$('typeOfZone').textContent='Explorez la Champagne';
    $('f1').textContent='Vignoble champenois';$('f2').textContent='Vue d’ensemble';
    $('f3').textContent='Sélectionnez une région ou recherchez une commune pour découvrir sa fiche.';
    $('grapeContent').replaceChildren();paragraph($('grapeContent'),'Sélectionnez une zone pour consulter les informations sur ses cépages.');
    $('producerContent').textContent='Sélectionnez une zone pour consulter les informations disponibles.';
    $('selectionStatus').textContent='Vue d’ensemble de la Champagne';$('searchStatus').textContent='';
    map.setView([48.848,4.345],8,{animate:false});renderZoom();
  });
  if(window.ResizeObserver)new ResizeObserver(()=>map.invalidateSize({pan:false})).observe($('map'));
  document.querySelector('.leaflet-control-zoom-in')?.setAttribute('aria-label','Zoomer');
  document.querySelector('.leaflet-control-zoom-out')?.setAttribute('aria-label','Dézoomer');
})();
