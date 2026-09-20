const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{
  // Real Leaflet, deterministic local assets; no dependency on third-party tile availability.
  await page.route('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',route=>route.fulfill({path:require.resolve('leaflet/dist/leaflet.js'),contentType:'text/javascript'}));
  await page.route('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',route=>route.fulfill({path:require.resolve('leaflet/dist/leaflet.css'),contentType:'text/css'}));
  await page.route('https://*.tile.openstreetmap.org/**',route=>route.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aP1sAAAAASUVORK5CYII=','base64')}));
});
async function choose(page,name){await page.getByRole('combobox').fill(name);await page.getByRole('combobox').press('Enter');}
test('search, selection, zoom and reset keep a fixed number of layers',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
  const paths=page.locator('#map svg path');
  const initial=await paths.count();
  await choose(page,'Ambonnay');await expect(page.getByRole('heading',{name:'Ambonnay',exact:true})).toBeVisible();
  const selectedCount=await paths.count();
  await choose(page,'Ambonnay');await expect(paths).toHaveCount(selectedCount);
  await page.getByRole('button',{name:'Zoomer',exact:true}).click();
  await expect(page.locator('#map svg path[stroke="#9a7b43"]')).toHaveCount(1);
  await page.getByRole('button',{name:'Revenir à la vue d’ensemble'}).click();
  await expect(page.getByRole('heading',{name:'Explorez la Champagne'})).toBeVisible();
  await expect(paths).toHaveCount(initial);await expect(page.locator('#map svg path[stroke="#9a7b43"]')).toHaveCount(0);
  await choose(page,'epernay');await expect(page.getByRole('heading',{name:'Épernay',exact:true})).toBeVisible();
  await choose(page,'Montagne de Reims');await expect(page.getByRole('heading',{name:'Montagne de Reims',exact:true})).toBeVisible();
  expect(errors).toEqual([]);
});
test('broken aliases have cards and suspicious percentages are withheld',async({page})=>{
  await page.goto('/');await choose(page,'Mesneux');
  await expect(page.getByRole('heading',{name:'Les Mesneux'})).toBeVisible();
  await expect(page.locator('#f2')).toHaveText('Vesle et Ardre');
  await page.getByText('Voir les chiffres à vérifier',{exact:true}).click();
  await expect(page.locator('.grape-line')).toHaveCount(3);
  await choose(page,'Bezu');await expect(page.locator('#grapeContent')).toContainText('incomplets ou incohérents');
  await expect(page.locator('.grape-line')).toHaveCount(0);
});
test('keyboard, no-result state and mobile layout',async({page})=>{
  await page.goto('/');const input=page.getByRole('combobox');await input.fill('cote');
  await input.press('ArrowDown');await expect(input).toHaveAttribute('aria-activedescendant','search-option-0');
  await input.press('Enter');await expect(page.getByRole('listbox')).toBeHidden();
  await input.fill('zzzzzz');await expect(page.getByText('Aucun résultat',{exact:true})).toBeVisible();
  await input.press('Escape');await expect(page.getByRole('listbox')).toBeHidden();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
  await page.setViewportSize({width:375,height:667});await choose(page,'Villers-Allerand');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
  await page.setViewportSize({width:667,height:375});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
});
