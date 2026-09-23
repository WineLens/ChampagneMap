const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
// DOM integration tests with a Leaflet adapter. Real rendering is tested separately by Playwright.
function setup(){
  const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;w.HTMLElement.prototype.scrollIntoView=function(){};
  const groups=[],handlers={},visible=new Set();
  const map={
    zoom:8,setView(c,z){this.zoom=z;handlers.zoomend?.();return this;},setMaxBounds(){return this;},
    on(name,fn){handlers[name]=fn;return this;},getZoom(){return this.zoom;},
    setZoom(z){this.zoom=z;handlers.zoomend?.();return this;},
    fitBounds(bounds,options){this.setZoom(options.maxZoom);return this;},
    hasLayer(layer){return visible.has(layer)||[...visible].some(g=>g.children?.includes(layer));},
    removeLayer(group){visible.delete(group);return this;}
  };
  w.L={map:()=>map,latLngBounds:()=>({}),tileLayer:()=>({addTo(){return this;},on(){return this;}}),
    geoJSON(data,options){
      const features=Array.isArray(data)?data:data.features;
      const group={children:[],addTo(){visible.add(this);return this;}};
      for(const feature of features){
        const layer={feature,style:{...options.style},handlers:{},
          on(event,fn){this.handlers[event]=fn;return this;},
          setStyle(style){Object.assign(this.style,style);return this;},getBounds(){return {};},bringToFront(){}};
        group.children.push(layer);options.onEachFeature(feature,layer);
      }
      groups.push(group);return group;
    }
  };
  for(const file of ['data.js','core.js','script.js'])w.eval(fs.readFileSync(file,'utf8'));
  const input=w.document.getElementById('mapSearch');
  function search(name){input.value=name;input.dispatchEvent(new w.Event('input'));}
  function key(name){input.dispatchEvent(new w.KeyboardEvent('keydown',{key:name,bubbles:true}));}
  function select(name){search(name);key('Enter');}
  return {dom,w,map,groups,visible,search,key,select,input,$:id=>w.document.getElementById(id)};
}
test('repeated search, direct click, zoom threshold and reset preserve layer identity',()=>{
  const x=setup();try{
    const features=x.groups.flatMap(g=>g.children);assert.equal(features.length,309);
    x.select('Ambonnay');assert.equal(x.$('typeOfZone').textContent,'Ambonnay');
    const layer=features.find(l=>l.feature.properties.code==='51007');
    assert.equal(layer.style.color,'#9a7b43');
    for(let i=0;i<10;i++)x.select('Ambonnay');
    assert.equal(x.groups.length,2);assert.equal(features.length,309);
    x.map.setZoom(11);assert.equal(x.map.hasLayer(layer),false);
    x.map.setZoom(13);assert.equal(x.map.hasLayer(layer),true);assert.equal(layer.style.color,'#9a7b43');
    const other=features.find(l=>l.feature.properties.code==='51365');
    other.handlers.click();assert.equal(x.$('typeOfZone').textContent,'Les Mesneux');
    assert.notEqual(layer.style.color,'#9a7b43');assert.equal(other.style.color,'#9a7b43');
    x.$('resetMap').click();assert.equal(x.map.zoom,8);assert.equal(x.visible.size,1);
    assert.equal(x.input.value,'');assert.equal(x.$('typeOfZone').textContent,'Explorez la Champagne');
    assert.equal(features.filter(l=>l.style.color==='#9a7b43').length,0);
  }finally{x.dom.window.close();}
});
test('keyboard selection, region search, status and Escape update the actual DOM',()=>{
  const x=setup();try{
    x.select('epernay');assert.equal(x.$('typeOfZone').textContent,'Épernay');
    x.search('montagne de reims');x.key('ArrowDown');assert.equal(x.input.getAttribute('aria-activedescendant'),'search-option-0');
    x.key('Enter');assert.equal(x.$('typeOfZone').textContent,'Montagne de Reims');
    assert.ok(x.$('grapeContent').querySelector('a[href^="https://www.champagne.fr"]'));
    x.search('zzzzzz');assert.ok(x.$('searchResults').textContent.includes('Aucun résultat'));
    x.key('Escape');assert.equal(x.$('searchResults').hidden,true);
    x.select('Bezu');assert.ok(x.$('grapeContent').textContent.includes('incomplets ou incohérents'));
    assert.equal(x.$('grapeContent').querySelectorAll('.grape-line').length,0);
  }finally{x.dom.window.close();}
});
test('every mapped feature opens a defined card without legacy event handlers',()=>{
  const x=setup();try{
    for(const layer of x.groups.flatMap(g=>g.children)){
      layer.handlers.click();layer.handlers.mouseover();layer.handlers.mouseout();
      assert.ok(x.$('typeOfZone').textContent);assert.ok(x.$('f3').textContent);
      assert.ok(!x.w.document.body.textContent.includes('undefined'));
    }
  }finally{x.dom.window.close();}
});
