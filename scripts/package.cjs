const fs=require('node:fs');
fs.mkdirSync('dist',{recursive:true});
for(const file of ['index.html','style.css','data.js','core.js','script.js'])fs.copyFileSync(file,'dist/'+file);
fs.writeFileSync('dist/.nojekyll','');
