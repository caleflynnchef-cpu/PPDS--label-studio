'use strict';
/* PPDS Label Studio v1 — offline, client-side only. No automatic compliance guarantee. */
const STORE_KEY='ppds-studio.v1';
const STOCKS={
  L7160:{name:'21 per A4',desc:'63.5 × 38.1 mm · small',cols:3,rows:7,w:63.5,h:38.1,gapX:2.5,gapY:0,marginX:7.25,marginY:15.15,size:'small'},
  L7163:{name:'14 per A4',desc:'99.1 × 38.1 mm · medium',cols:2,rows:7,w:99.1,h:38.1,gapX:2.5,gapY:0,marginX:4.65,marginY:15.15,size:'medium'},
  L7165:{name:'8 per A4',desc:'99.1 × 67.7 mm · large',cols:2,rows:4,w:99.1,h:67.7,gapX:2.5,gapY:0,marginX:4.65,marginY:13.1,size:'large'}
};
const ALLERGENS=[
  ['celery','Celery'],['gluten','Cereals containing gluten'],['crustaceans','Crustaceans'],['egg','Egg'],['fish','Fish'],['lupin','Lupin'],['milk','Milk'],['molluscs','Molluscs'],['mustard','Mustard'],['peanut','Peanuts'],['sesame','Sesame'],['soy','Soya'],['sulphites','Sulphites'],['nuts','Tree nuts']
];
/* Explicit allergen terms can be underlined/bolded in the finished ingredient statement. */
const EXPLICIT={
 celery:/\bcelery\b/gi,
 gluten:/\b(?:wheat|spelt|rye|barley|oats?|khorasan|kamut|triticale)\b/gi,
 crustaceans:/\b(?:crustaceans?|prawns?|shrimps?|crabs?|lobsters?|crayfish)\b/gi,
 egg:/\beggs?\b/gi,
 fish:/\b(?:fish|salmon|tuna|cod|haddock|anchov(?:y|ies)|trout|sardines?)\b/gi,
 lupin:/\blupin\b/gi,
 milk:/\b(?:milk|buttermilk|whey|casein(?:ate)?|lactose)\b/gi,
 molluscs:/\b(?:molluscs?|mussels?|oysters?|scallops?|squid|octopus|clams?)\b/gi,
 mustard:/\bmustard\b/gi,
 peanut:/\b(?:peanuts?|groundnuts?)\b/gi,
 sesame:/\bsesame\b/gi,
 soy:/\b(?:soy(?:a)?(?:beans?)?)\b/gi,
 sulphites:/\b(?:sulphites?|sulfites?|sulphur dioxide|sulfur dioxide)\b/gi,
 nuts:/\b(?:almonds?|hazelnuts?|walnuts?|cashews?|pecans?|pistachios?|macadamias?|brazil nuts?)\b/gi
};
/* Common synonyms imply an allergen but do not always name it in a consumer-friendly way. */
const IMPLIED={
 milk:/\b(?:cheddar|cheese|butter|cream|yog(?:h)?urt|ghee|mascarpone|mozzarella|parmesan)\b/i,
 egg:/\b(?:mayonnaise|meringue)\b/i,
 soy:/\b(?:tofu|edamame|miso|tempeh)\b/i,
 sesame:/\btahini\b/i
};
const DISPLAY_ALLERGEN={celery:'CELERY',crustaceans:'CRUSTACEANS',egg:'EGG',fish:'FISH',lupin:'LUPIN',milk:'MILK',molluscs:'MOLLUSCS',mustard:'MUSTARD',peanut:'PEANUTS',sesame:'SESAME',soy:'SOYA',sulphites:'SULPHITES'};
const app=document.getElementById('app');
const printRoot=document.getElementById('print-root');
let activeTab='recipes';
let searchTerm='';
let reviewTick=false;
let showFitProblem=false;
let state=loadState();
let toastTimer;
function freshIngredient(){return {id:id(),name:'',grams:'',quid:'',compound:false,components:'',allergens:[]};}
function id(){return 'r'+Math.random().toString(36).slice(2,10)+Date.now().toString(36);}
function loadState(){
 try{
  const parsed=JSON.parse(localStorage.getItem(STORE_KEY)||'null');
  if(parsed&&Array.isArray(parsed.recipes))return {recipes:parsed.recipes,activeId:parsed.activeId,settings:{businessName:'',stock:'L7163',...parsed.settings},print:{quantity:14,start:1,...parsed.print}};
 }catch(e){}
 return {recipes:[],activeId:null,settings:{businessName:'',stock:'L7163'},print:{quantity:14,start:1}};
}
function save(){try{localStorage.setItem(STORE_KEY,JSON.stringify(state));return true;}catch(e){toast('Device storage full. Export a backup immediately.');return false;}}
function activeRecipe(){return state.recipes.find(r=>r.id===state.activeId)||null;}
function signature(r){return JSON.stringify({name:r.name,ingredients:r.ingredients,storage:r.storage,expiry:r.expiry,expiryType:r.expiryType||'use-by',notes:r.notes});}
function isVerified(r){return !!r&&!!r.approvedSig&&r.approvedSig===signature(r);}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function detectKeys(item){
 const text=[item.name,item.components].filter(Boolean).join(' ');
 return ALLERGENS.map(x=>x[0]).filter(k=>new RegExp(EXPLICIT[k].source,'i').test(text)||(IMPLIED[k]&&IMPLIED[k].test(text)));
}
function flags(item){return [...new Set([...(item.allergens||[]),...detectKeys(item)])];}
function hasExplicit(k,text){return new RegExp(EXPLICIT[k].source,'i').test(text);}
function emphasize(text){
 const source=String(text||'');const terms=Object.values(EXPLICIT).map(r=>r.source);
 const re=new RegExp(terms.map(p=>'('+p+')').join('|'),'gi');
 let result='',at=0,m;
 while((m=re.exec(source))!==null){result+=esc(source.slice(at,m.index))+'<b>'+esc(m[0])+'</b>';at=re.lastIndex;}
 return result+esc(source.slice(at));
}
function formatIngredient(item){
 const name=String(item.name||'').trim(), components=String(item.components||'').trim();
 const whole=name+' '+components;
 const implicitTags=flags(item).filter(k=>!hasExplicit(k,whole)&&DISPLAY_ALLERGEN[k]);
 let declaration=emphasize(name);
 if(item.quid!==''&&item.quid!==undefined&&item.quid!==null&&Number.isFinite(+item.quid))declaration+=' ('+esc(Number(item.quid).toString())+'%)';
 if(components)declaration+=' ('+emphasize(components)+')';
 if(implicitTags.length)declaration+=' (<b>'+implicitTags.map(k=>esc(DISPLAY_ALLERGEN[k])).join('</b>, <b>')+'</b>)';
 return declaration;
}
function recipeIngredients(r){return [...(r.ingredients||[])].sort((a,b)=>+b.grams-+a.grams).map(formatIngredient).join(', ');}
function getStock(){return STOCKS[state.settings.stock]||STOCKS.L7163;}
function getCapacity(){const s=getStock();return s.cols*s.rows;}
function labelInner(r,stock){
 const labelClass=stock.size||'medium';
 const biz=String(state.settings.businessName||'').trim();
 const meta=[];
 if(r.expiry)meta.push('<p><b>'+(r.expiryType==='best-before'?'Best before':'Use by')+':</b> '+esc(r.expiry)+'</p>');
 if(r.storage)meta.push('<p>'+esc(r.storage)+'</p>');
 return '<div class="label-body label-'+esc(labelClass)+'">'+
  (biz?'<p class="biz-name">'+esc(biz)+'</p>':'')+
  '<h3 class="food-name">'+esc(r.name||'Untitled food')+'</h3>'+
  '<p class="ingredients"><b>Ingredients:</b> '+recipeIngredients(r)+'</p>'+
  (meta.length?'<div class="label-meta">'+meta.join('')+'</div>':'')+'</div>';
}
function validate(r){
 const errors=[];
 if(!r)return ['Create or select a recipe.'];
 if(!String(r.name||'').trim())errors.push('Enter an accurate name of the food.');
 if(!r.ingredients?.length)errors.push('Add at least one ingredient.');
 for(let i=0;i<(r.ingredients||[]).length;i++){
  const item=r.ingredients[i],num=i+1, txt=(item.name||'')+' '+(item.components||'');
  if(!String(item.name||'').trim())errors.push('Ingredient '+num+': enter its name.');
  if(!Number.isFinite(+item.grams)||+item.grams<=0)errors.push('Ingredient '+num+': enter a positive weight in grams.');
  if(item.compound&&!String(item.components||'').trim())errors.push('Ingredient '+num+': add the supplier’s full sub-ingredient declaration.');
  if(item.quid!==''&&item.quid!==null&&item.quid!==undefined&&(!Number.isFinite(+item.quid)||+item.quid<0||+item.quid>100))errors.push('Ingredient '+num+': QUID must be between 0 and 100%.');
  const f=flags(item);
  if(f.includes('gluten')&&!hasExplicit('gluten',txt))errors.push('Ingredient '+num+': name the exact gluten-containing cereal (e.g. WHEAT) in the declaration.');
  if(f.includes('nuts')&&!hasExplicit('nuts',txt))errors.push('Ingredient '+num+': name the actual tree nut type (e.g. ALMOND).');
 }
 return errors;
}
function totalWeight(r){return (r.ingredients||[]).reduce((s,i)=>s+(+i.grams||0),0);}
function allergenSummary(r){return [...new Set((r.ingredients||[]).flatMap(flags))].map(k=>ALLERGENS.find(a=>a[0]===k)?.[1]||k);}
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2900);}
function setTab(t){activeTab=t;render();window.scrollTo({top:0,behavior:'instant'});}
function addRecipe(demo=false){
 const r={id:id(),name:demo?'DEMO — Cheese & tomato roll':'',expiry:'',expiryType:'use-by',storage:'',notes:'',ingredients:demo?[
  {id:id(),name:'Bread roll',grams:'90',quid:'',compound:true,components:'WHEAT flour, water, yeast, salt',allergens:['gluten']},
  {id:id(),name:'Cheddar cheese',grams:'30',quid:'',compound:true,components:'MILK, salt, starter culture, rennet',allergens:['milk']},
  {id:id(),name:'Tomato',grams:'20',quid:'',compound:false,components:'',allergens:[]}
 ]:[freshIngredient()],approvedSig:'',approvedAt:null,demo};
 state.recipes.unshift(r);state.activeId=r.id;reviewTick=false;save();setTab('editor');toast(demo?'Demo created — not approved for food service.':'New recipe created.');
}
function duplicateRecipe(idVal){const old=state.recipes.find(r=>r.id===idVal);if(!old)return;const r=JSON.parse(JSON.stringify(old));r.id=id();r.name='Copy of '+r.name;r.approvedSig='';r.approvedAt=null;r.demo=false;r.ingredients.forEach(i=>i.id=id());state.recipes.unshift(r);state.activeId=r.id;save();setTab('editor');}
function deleteRecipe(idVal){const r=state.recipes.find(r=>r.id===idVal);if(!r)return;if(!confirm('Delete “'+r.name+'”? This cannot be undone unless you have a backup.'))return;state.recipes=state.recipes.filter(x=>x.id!==idVal);if(state.activeId===idVal)state.activeId=state.recipes[0]?.id||null;save();setTab('recipes');}
function layoutHeader(title,subtitle,button=''){return '<div class="page-head"><div><h1 class="page-title">'+title+'</h1><p class="page-desc">'+subtitle+'</p></div>'+button+'</div>';}
function statusBadge(r){return '<span class="badge-status '+(isVerified(r)?'ok':'')+'">'+(isVerified(r)?'✓ Reviewed':'• Needs review')+'</span>';}
function recipesView(){
 const filtered=state.recipes.filter(r=>String(r.name||'Untitled').toLowerCase().includes(searchTerm.toLowerCase()));
 return layoutHeader('Your recipes','Build once, review ingredients, then print whenever you need.', '<button class="btn" data-action="add">＋ New recipe</button>')+
 '<div class="stats">'+
 '<div class="stat"><div class="stat-number">'+state.recipes.length+'</div><div class="stat-caption">Saved recipes</div></div>'+
 '<div class="stat"><div class="stat-number">'+state.recipes.filter(isVerified).length+'</div><div class="stat-caption">Reviewed</div></div>'+
 '<div class="stat"><div class="stat-number">'+state.recipes.reduce((n,r)=>n+(r.ingredients?.length||0),0)+'</div><div class="stat-caption">Ingredient entries</div></div></div>'+
 '<div class="section-bar"><h2>Recipe library</h2><input id="recipe-search" class="search" placeholder="Search recipes…" aria-label="Search recipes" value="'+esc(searchTerm)+'"></div>'+
 (!state.recipes.length?'<div class="empty-state"><div class="empty-icon">▤</div><h2>No recipes yet</h2><p>Start with your own recipe or explore the interface using a clearly marked demonstration recipe.</p><div class="row" style="justify-content:center"><button class="btn" data-action="add">＋ Create a recipe</button><button class="btn secondary" data-action="demo">Load a demo</button></div></div>':
  !filtered.length?'<div class="empty-state"><p>No recipes match that search.</p></div>':
  '<div class="recipe-grid">'+filtered.map(r=>'<article class="recipe-card">'+statusBadge(r)+'<h3 class="recipe-card-title">'+esc(r.name||'Untitled recipe')+'</h3><div class="recipe-meta">'+(r.ingredients?.length||0)+' ingredients · '+(allergenSummary(r).length?esc(allergenSummary(r).join(', ')):'No allergens flagged')+'</div><div class="recipe-actions"><button class="btn small" data-action="edit" data-id="'+r.id+'">Edit recipe</button><button class="btn secondary small" data-action="open-print" data-id="'+r.id+'">Print</button><button class="btn secondary small" data-action="duplicate" data-id="'+r.id+'" aria-label="Duplicate recipe">⧉</button></div></article>').join('')+'</div>')+
 '<div class="warning-note" style="margin-top:18px"><b>Important:</b> This app prepares PPDS labels; it cannot check supplier changes, ingredient omissions, allergens that are not entered, or whether other legal information is required. Never use demonstration ingredient data for service.</div>';
}
function ingredientCard(item,index){
 const detected=detectKeys(item);
 return '<div class="ingredient-card" data-ingredient="'+esc(item.id)+'"><div class="ingredient-head"><strong>Ingredient '+(index+1)+'</strong><button class="btn danger small" data-action="remove-ingredient" data-index="'+index+'" aria-label="Remove ingredient '+(index+1)+'">Remove</button></div>'+
 '<div class="ingredient-fields"><div class="form-field"><label>Ingredient name</label><input data-ing-index="'+index+'" data-ing-field="name" value="'+esc(item.name)+'" placeholder="e.g. Cheddar cheese"></div>'+
 '<div class="form-field"><label>Weight (g)</label><input data-ing-index="'+index+'" data-ing-field="grams" type="number" inputmode="decimal" min="0.01" step="any" value="'+esc(item.grams)+'" placeholder="30"></div>'+
 '<div class="form-field"><label>QUID % (optional)</label><input data-ing-index="'+index+'" data-ing-field="quid" type="number" inputmode="decimal" min="0" max="100" step="any" value="'+esc(item.quid)+'" placeholder="e.g. 25"></div></div>'+
 '<label class="ing-compound"><input type="checkbox" data-ing-index="'+index+'" data-ing-field="compound" '+(item.compound?'checked':'')+'> This is a compound ingredient (bread, sauce, pastry, etc.)</label>'+
 (item.compound?'<div class="form-field"><label>Full supplier sub-ingredients (in order)</label><textarea data-ing-index="'+index+'" data-ing-field="components" rows="2" placeholder="e.g. WHEAT flour, water, sunflower oil, yeast, salt">'+esc(item.components)+'</textarea><p class="hint">Copy the supplier declaration. Include additives and sub-ingredients; avoid putting an allergen only in an extra summary.</p></div>':'')+
 '<div class="ingredient-flags"><div class="flags-head">Allergens in this ingredient <span class="hint" style="font-weight:400">(check against supplier specification)</span></div><div class="allergen-chips">'+ALLERGENS.map(([k,n])=>{const selected=(item.allergens||[]).includes(k),suggested=detected.includes(k);return '<label class="allergen-chip '+(selected?'selected':suggested?'suggested':'')+'"><input type="checkbox" data-allergen-index="'+index+'" data-allergen="'+k+'" '+(selected?'checked':'')+'><span>'+esc(n)+(suggested&&!selected?' ◇':'')+'</span></label>'}).join('')+'</div><div class="hint">◇ Dashed chips indicate keyword-based suggestions. You still need to verify each ingredient. Selected allergens without a clear word in the ingredients will be added in bold, where appropriate.</div></div></div>';
}
function reviewMarkup(r){const problems=validate(r);return '<div class="panel"><h2 class="panel-title">4. Safety review</h2><p class="panel-desc">Approval is invalidated whenever recipe data changes.</p>'+
 (r.demo?'<div class="danger-note">DEMONSTRATION ONLY. Ingredient details are fictional examples and must be replaced with actual supplier specifications.</div>':'')+
 (problems.length?'<div class="danger-note"><b>Fix before approval:</b><ul class="checklist">'+problems.map(p=>'<li>'+esc(p)+'</li>').join('')+'</ul></div>':'<div class="inline-note">Basic fields are present. This does not guarantee legal accuracy; complete the manual review below.</div>')+
 '<div class="review-box"><p><b>Confirm all of the following before using the label:</b> exact supplier ingredient lists (including compound ingredients), allergen information, quantity order at manufacture, legal food name, QUID when needed, and any extra labelling requirements for this food.</p><label class="check-line"><input id="review-check" type="checkbox" '+(reviewTick?'checked':'')+'> I have checked the actual ingredients and supplier specifications for this recipe and approve this version for printing.</label><div class="review-btns"><button class="btn" data-action="approve" '+((problems.length||!reviewTick||r.demo)?'disabled':'')+'>✓ Approve this recipe</button>'+(isVerified(r)?'<span class="badge-status ok">Reviewed '+esc(new Date(r.approvedAt||Date.now()).toLocaleDateString('en-GB'))+'</span>':'<span class="badge-status">Not yet approved</span>')+'</div></div></div>';
}
function editorView(){let r=activeRecipe();if(!r)return layoutHeader('Edit label','You need a recipe first.')+'<button class="btn" data-action="add">Create a recipe</button>';
 return layoutHeader('Edit your label','Complete each step, then approve the recipe before printing.', '<div class="row"><button class="btn secondary" data-action="delete" data-id="'+r.id+'">Delete</button><button class="btn" data-action="open-print" data-id="'+r.id+'">Print labels →</button></div>')+
 '<div class="editor-layout"><div>'+
 '<section class="panel"><h2 class="panel-title">1. Product details</h2><p class="panel-desc">Use the legal, customary or accurately descriptive food name.</p><div class="form-field"><label for="food-name">Food name <span aria-hidden="true">*</span></label><input id="food-name" data-recipe-field="name" value="'+esc(r.name)+'" placeholder="e.g. Cheese & tomato sandwich"></div><div class="two-col"><div class="form-field"><label>Date marking type (optional)</label><select data-recipe-field="expiryType"><option value="use-by" '+((r.expiryType||'use-by')==='use-by'?'selected':'')+'>Use by</option><option value="best-before" '+(r.expiryType==='best-before'?'selected':'')+'>Best before</option></select><input style="margin-top:8px" data-recipe-field="expiry" value="'+esc(r.expiry||'')+'" placeholder="e.g. 29/10/2026"><p class="hint">Enter a validated date. The app does not calculate shelf life.</p></div><div class="form-field"><label>Storage instructions (optional)</label><input data-recipe-field="storage" value="'+esc(r.storage||'')+'" placeholder="e.g. Keep refrigerated below 5°C"></div></div></section>'+
 '<section class="panel"><h2 class="panel-title">2. Ingredients</h2><p class="panel-desc">Enter weights in grams at the point of manufacture. Print order is calculated highest to lowest.</p>'+r.ingredients.map(ingredientCard).join('')+'<button class="btn secondary full" data-action="add-ingredient">＋ Add ingredient</button><p class="hint">Total entered weight: <b id="weight-total">'+totalWeight(r).toLocaleString('en-GB')+' g</b>. Weight is used for sorting only and is not displayed.</p></section>'+
 '<section class="panel"><h2 class="panel-title">3. Important declarations</h2><div class="warning-note" style="margin-bottom:0"><b>Check QUID and specific names.</b> If an ingredient is in the product name or emphasised, a quantity percentage may be required. For gluten, identify the cereal (such as wheat); for tree nuts, identify the nut type. Check sulphites against the legal threshold. Automatic detection is only a prompt.</div></section>'+'<div id="review-section">'+reviewMarkup(r)+'</div>'+'</div>'+
 '<aside class="preview-column"><section class="panel"><div class="row" style="justify-content:space-between"><h2 class="panel-title">Live label preview</h2>'+statusBadge(r)+'</div><p class="panel-desc">A real-size label sample; the print page uses the selected stock.</p><div class="preview-wrap"><div id="editor-sample" class="sample-label" style="width:'+getStock().w+'mm;height:'+getStock().h+'mm">'+labelInner(r,getStock())+'<div class="preview-watermark">PREVIEW</div></div></div><p class="preview-caption">'+esc(getStock().name)+' · '+getStock().w+' × '+getStock().h+' mm</p><div id="fit-alert"></div></section><section class="panel"><div class="mini-head">Allergen summary · for reviewing only</div><div id="allergen-summary">'+(allergenSummary(r).length?esc(allergenSummary(r).join(' · ')):'No allergen keywords detected or selected. This is not a declaration of being allergen-free.')+'</div><hr style="border:0;border-top:1px solid var(--line);margin:15px 0"><h2 class="panel-title" style="font-size:14px">Recipe checks</h2><div id="quick-check">'+(validate(r).length?'<p class="hint">'+validate(r).length+' missing or invalid field(s).</p>':'<p class="hint">Required fields entered. Full ingredient review remains essential.</p>')+'</div></section></aside></div>';
}
function thumbnail(stock,qty,start){const count=stock.cols*stock.rows;let html='<div class="paper-stage"><div class="paper-scale"><div class="paper-thumbnail">';for(let i=0;i<count;i++){const col=i%stock.cols,row=Math.floor(i/stock.cols);const x=stock.marginX+col*(stock.w+stock.gapX),y=stock.marginY+row*(stock.h+stock.gapY);const filled=i>=start-1&&i<start-1+Math.min(qty,count-start+1);html+='<div class="thumb-label '+(filled?'filled':'')+'" style="left:'+x+'mm;top:'+y+'mm;width:'+stock.w+'mm;height:'+stock.h+'mm">'+(filled?'<span>✓</span>':'')+'</div>';}return html+'</div></div></div>';}
function printView(){const r=activeRecipe(),stock=getStock(),cap=getCapacity(),errors=validate(r),good=r&&isVerified(r)&&!r.demo&&errors.length===0;
 let head=layoutHeader('Print your labels','A4 adhesive sheets · portrait orientation · AirPrint or any normal printer.');
 if(!r)return head+'<div class="empty-state"><p>Create or select a recipe before printing.</p><button class="btn" data-action="add">New recipe</button></div>';
 const num=Math.max(1,Math.min(250,Math.floor(+state.print.quantity||1)));const start=Math.max(1,Math.min(cap,Math.floor(+state.print.start||1)));const pageCount=Math.ceil((num+start-1)/cap);
 return head+'<div class="panel"><h2 class="panel-title">1. Choose your label sheet</h2><p class="panel-desc">Popular A4 sheet layouts. Check your label pack dimensions before printing.</p><div class="layout-opts">'+Object.entries(STOCKS).map(([key,s])=>'<button class="layout-opt '+(state.settings.stock===key?'selected':'')+'" data-action="stock" data-stock="'+key+'"><span class="layout-title">'+s.name+'</span><span class="layout-desc">'+s.desc+'</span></button>').join('')+'</div></div>'+
 '<div class="print-layout"><div class="print-controls"><section class="panel"><h2 class="panel-title">2. Print job</h2><p class="panel-desc">Selected food: <b>'+esc(r.name||'Untitled')+'</b></p><div class="two-col"><div class="form-field"><label for="print-quantity">Number of labels</label><input type="number" id="print-quantity" inputmode="numeric" min="1" max="250" step="1" value="'+num+'"></div><div class="form-field"><label for="print-start">First label position</label><select id="print-start">'+Array.from({length:cap},(_,i)=>'<option value="'+(i+1)+'" '+(start===i+1?'selected':'')+'>'+(i+1)+' of '+cap+'</option>').join('')+'</select></div></div><p class="hint">First label position allows you to reuse a partially used sheet. Count from top left, across each row.</p><p class="sheet-count" id="job-count">'+num+' labels across '+pageCount+' A4 sheet'+(pageCount!==1?'s':'')+'</p></section><section class="panel"><h2 class="panel-title">3. Final print checks</h2>'+(!good?'<div class="danger-note"><b>Printing locked.</b> '+(r.demo?'Demo data cannot be printed for food service. ':errors.length?errors.length+' recipe checks remain. ':'')+'Open Edit label and approve the current version after checking the real ingredients.</div>':'<div class="inline-note"><b>Recipe reviewed.</b> Check the physical print size and the final label every time.</div>')+
 '<div id="print-fit-area"><p class="hint">Checking content against physical label size…</p></div><label class="ing-compound" style="align-items:flex-start"><input id="print-confirm" type="checkbox"><span>I have checked the printed ingredient declaration and selected the correct paper stock.</span></label><button id="print-button" class="btn full" data-action="print" disabled>🖨 Print labels</button><p class="hint">On iPhone, use Safari’s AirPrint print sheet. Save as PDF from the print preview if you prefer.</p></section></div>'+
 '<div class="print-preview"><section class="panel"><h2 class="panel-title">Sheet layout preview</h2><p class="panel-desc">The green boxes show the positions that will print on the first page.</p>'+'<div id="sheet-thumbnail">'+thumbnail(stock,num,start)+'</div>'+'<p class="print-info">A4 · '+stock.cols+' columns × '+stock.rows+' rows · '+stock.w+' × '+stock.h+' mm · pitch '+(stock.w+stock.gapX)+' × '+(stock.h+stock.gapY)+' mm</p></section><section class="panel"><h2 class="panel-title">First-label sample</h2><div class="preview-wrap"><div id="print-sample" class="sample-label" style="width:'+stock.w+'mm;height:'+stock.h+'mm">'+labelInner(r,stock)+'</div></div><p class="preview-caption">Labels that overflow are blocked; switch to a larger label size rather than shrinking the text.</p></section></div></div>'+
 '<details class="help-details"><summary>Printer settings for A4 adhesive label sheets</summary><ul><li>Use an AirPrint-capable printer on the same Wi-Fi network as your iPhone, or print from a laptop.</li><li>Set paper to A4 portrait, scale 100% / actual size, and disable headers and footers if offered.</li><li>Test on ordinary A4 paper and compare with the sticky label sheet before using adhesive stock.</li><li>For roll labels or unusual A4 sheets, a custom stock definition is needed; these three layouts are not universal.</li></ul></details>';
}
function settingsView(){return layoutHeader('Settings & backups','Personalise the label header and keep an independent copy of your recipes.')+
 '<div class="settings-grid"><div class="panel"><h2 class="panel-title">Print identity</h2><p class="panel-desc">Optional business / kitchen name printed above the product name.</p><div class="form-field"><label for="business-name">Business or kitchen</label><input id="business-name" value="'+esc(state.settings.businessName)+'" placeholder="e.g. School Kitchen"></div><p class="hint">This is an optional label header, not a substitute for any legally required business information where applicable.</p><div class="setting-row"><span>Preferred label sheet</span><b>'+esc(getStock().name)+'</b></div></div>'+
 '<div class="panel"><h2 class="panel-title">Backup & restore</h2><p class="panel-desc">Data lives in this browser on this device. Deleting browser data or changing devices can erase it.</p><div class="row"><button class="btn secondary" data-action="export">↓ Export recipes</button><button class="btn secondary" data-action="import">↑ Import backup</button></div><input type="file" id="import-file" accept=".json,application/json" style="display:none"><p class="hint" style="margin-top:14px">Import adds recipes and keeps existing ones. Imported recipes require fresh approval.</p><div class="setting-row"><div><b>Local-only storage</b><p class="hint">No server, subscriptions or accounts.</p></div><span class="badge-status ok">Private</span></div></div></div>'+
 '<section class="panel"><h2 class="panel-title">Labelling guidance</h2><p class="panel-desc">Use these official links when reviewing your food business procedures.</p><div class="grid"><a href="https://www.gov.uk/government/publications/labelling-guidance-for-prepacked-for-direct-sale-ppds-food-products/labelling-guidance-for-prepacked-for-direct-sale-ppds-food-products" target="_blank" rel="noopener">Food Standards Agency — PPDS labelling guidance ↗</a><a href="https://www.gov.uk/government/publications/prepacked-for-direct-sale-ppds-allergen-labelling-changes-for-schools-colleges-and-nurseries/prepacked-for-direct-sale-ppds-allergen-labelling-changes-for-schools-colleges-and-nurseries" target="_blank" rel="noopener">PPDS guidance for schools and nurseries ↗</a><a href="https://www.gov.uk/government/publications/packaging-and-labelling/packaging-and-labelling" target="_blank" rel="noopener">Presentation and type size requirements ↗</a></div><div class="warning-note"><b>Scope:</b> This is a labelling preparation tool, not legal certification. Some foods need extra statements, QUID values, a particular legal name, or other mandatory particulars. A larger packaging surface can require a minimum 1.2 mm x-height rather than 0.9 mm. Always assess your actual packaging, use a physical print proof, and follow your food safety management procedures.</div></section>';
}
function render(){
 document.querySelectorAll('[data-nav]').forEach(b=>{b.classList.toggle('active',b.dataset.nav===activeTab);b.setAttribute('aria-current',b.dataset.nav===activeTab?'page':'false');});
 if(activeTab==='recipes')app.innerHTML=recipesView();
 else if(activeTab==='editor')app.innerHTML=editorView();
 else if(activeTab==='print')app.innerHTML=printView();
 else app.innerHTML=settingsView();
 if(activeTab==='editor')requestAnimationFrame(checkEditorFit);
 if(activeTab==='print'){buildPrintSheets();requestAnimationFrame(checkPrintFit);}
}
function overflows(el){if(!el)return false;const inner=el.querySelector('.label-body');if(!inner)return false;const original=inner.style.overflow;inner.style.overflow='visible';const result=inner.scrollHeight>inner.clientHeight+1||inner.scrollWidth>inner.clientWidth+1;inner.style.overflow=original;return result;}
function checkEditorFit(){const r=activeRecipe(),e=document.getElementById('editor-sample');const a=document.getElementById('fit-alert');if(!e||!a)return;const overflow=overflows(e);a.innerHTML=overflow?'<div class="danger-note">This declaration exceeds the selected label area. Choose a larger label on the Print tab.</div>':'<div class="inline-note">The declaration appears to fit this preview. Verify font size and print alignment on paper.</div>';}
function buildPrintSheets(){
 const r=activeRecipe();if(!r){printRoot.innerHTML='';return;}
 const s=getStock(),cap=getCapacity(),num=Math.max(1,Math.min(250,Math.floor(+state.print.quantity||1))),start=Math.max(1,Math.min(cap,Math.floor(+state.print.start||1))),pageCount=Math.ceil((num+start-1)/cap);
 let out='';for(let p=0;p<pageCount;p++){
  out+='<div class="print-sheet">';for(let cell=0;cell<cap;cell++){
   const absolute=p*cap+cell, index=absolute-(start-1);if(index<0||index>=num)continue;
   const col=cell%s.cols,row=Math.floor(cell/s.cols),x=s.marginX+col*(s.w+s.gapX),y=s.marginY+row*(s.h+s.gapY);
   out+='<div class="print-label" style="left:'+x+'mm;top:'+y+'mm;width:'+s.w+'mm;height:'+s.h+'mm">'+labelInner(r,s)+'</div>';
  }out+='</div>';
 }printRoot.innerHTML=out;
}
function checkPrintFit(){
 const r=activeRecipe(),target=document.getElementById('print-fit-area'),button=document.getElementById('print-button');if(!r||!target)return;
 const sample=document.getElementById('print-sample');const labels=Array.from(printRoot.querySelectorAll('.print-label'));
 const overflow=overflows(sample)||labels.some(overflows);showFitProblem=overflow;
 target.innerHTML=overflow?'<div class="danger-note"><b>Content does not fit.</b> This label is too small for the ingredient statement. Select a larger layout or simplify only where lawful; mandatory information must not be cropped.</div>':'<div class="inline-note">✓ Content fits the on-screen label boundaries. Measure the final print for minimum x-height and readability.</div>';
 if(button)button.disabled=!isVerified(r)||!!r.demo||!!validate(r).length||overflow||!(document.getElementById('print-confirm')?.checked);
}
function refreshLive(){const r=activeRecipe();if(activeTab==='editor'&&r){const review=document.getElementById('review-section');if(review)review.innerHTML=reviewMarkup(r);const sample=document.getElementById('editor-sample');if(sample){sample.innerHTML=labelInner(r,getStock())+'<div class="preview-watermark">PREVIEW</div>';requestAnimationFrame(checkEditorFit);}const weight=document.getElementById('weight-total');if(weight)weight.textContent=totalWeight(r).toLocaleString('en-GB')+' g';const sum=document.getElementById('allergen-summary');if(sum)sum.textContent=allergenSummary(r).join(' · ')||'No allergens detected or flagged — review supplier specifications.';const check=document.getElementById('quick-check');if(check)check.innerHTML=validate(r).length?'<p class="hint">'+validate(r).length+' missing or invalid field(s).</p>':'<p class="hint">Required fields entered. Full review is essential.</p>';}}
function updateModelFromInput(e){const el=e.target,r=activeRecipe();if(el.dataset.recipeField&&r){r[el.dataset.recipeField]=el.value;reviewTick=false;save();refreshLive();return true;}
 if(el.dataset.ingField&&r){const i=+el.dataset.ingIndex,ing=r.ingredients[i];if(!ing)return false;ing[el.dataset.ingField]=el.dataset.ingField==='compound'?el.checked:el.value;reviewTick=false;save();refreshLive();return true;}
 if(el.id==='business-name'){state.settings.businessName=el.value;save();return true;}
 if(el.id==='print-quantity'){state.print.quantity=Math.max(1,Math.min(250,Math.floor(+el.value||1)));save();return true;}
 if(el.id==='recipe-search'){searchTerm=el.value;return true;}
 return false;}
function handleAction(button){const action=button.dataset.action;const r=activeRecipe();switch(action){
 case 'add':addRecipe();break;
 case 'demo':addRecipe(true);break;
 case 'edit':state.activeId=button.dataset.id;reviewTick=false;save();setTab('editor');break;
 case 'open-print':state.activeId=button.dataset.id||state.activeId;reviewTick=false;save();setTab('print');break;
 case 'duplicate':duplicateRecipe(button.dataset.id);break;
 case 'delete':deleteRecipe(button.dataset.id);break;
 case 'add-ingredient':if(r){r.ingredients.push(freshIngredient());reviewTick=false;save();render();}break;
 case 'remove-ingredient':if(r){r.ingredients.splice(+button.dataset.index,1);reviewTick=false;save();render();}break;
 case 'approve':if(r&&reviewTick&&!r.demo&&!validate(r).length){r.approvedSig=signature(r);r.approvedAt=Date.now();reviewTick=false;save();render();toast('Recipe reviewed and approved for this version.');}break;
 case 'stock':state.settings.stock=STOCKS[button.dataset.stock]?button.dataset.stock:'L7163';state.print.start=1;save();render();break;
 case 'print':if(r&&isVerified(r)&&!r.demo&&!validate(r).length&&!showFitProblem&&document.getElementById('print-confirm')?.checked){buildPrintSheets();requestAnimationFrame(()=>{if(printRoot.querySelectorAll('.print-label').length&&!Array.from(printRoot.querySelectorAll('.print-label')).some(overflows))window.print();else toast('The labels overflow the print area.');});}break;
 case 'export':exportBackup();break;
 case 'import':document.getElementById('import-file')?.click();break;
 }}
function exportBackup(){const blob=new Blob([JSON.stringify({app:'PPDS Label Studio',version:1,exportedAt:new Date().toISOString(),recipes:state.recipes,settings:state.settings},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='PPDS-recipes-backup-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);toast('Recipe backup exported.');}
async function importBackup(file){if(!file)return;try{const data=JSON.parse(await file.text());if(!Array.isArray(data.recipes))throw Error('No recipes in this file.');if(data.recipes.length>2000)throw Error('Backup contains too many recipes.');const incoming=data.recipes.map(raw=>({id:id(),name:String(raw.name||'').slice(0,300),expiry:String(raw.expiry||'').slice(0,200),expiryType:raw.expiryType==='best-before'?'best-before':'use-by',storage:String(raw.storage||'').slice(0,500),notes:'',ingredients:(Array.isArray(raw.ingredients)?raw.ingredients:[]).slice(0,150).map(i=>({id:id(),name:String(i.name||'').slice(0,800),grams:String(i.grams||''),quid:i.quid==null?'':String(i.quid),compound:!!i.compound,components:String(i.components||'').slice(0,6000),allergens:Array.isArray(i.allergens)?i.allergens.filter(k=>ALLERGENS.some(a=>a[0]===k)):[]})),approvedSig:'',approvedAt:null,demo:!!raw.demo}));state.recipes.unshift(...incoming);if(incoming.length)state.activeId=incoming[0].id;save();setTab('recipes');toast(incoming.length+' recipes imported. Review again before printing.');}catch(err){alert('Unable to import this file: '+err.message);}}
document.addEventListener('click',e=>{const nav=e.target.closest('[data-nav]');if(nav){setTab(nav.dataset.nav);return;}const button=e.target.closest('[data-action]');if(button){handleAction(button);}});
document.addEventListener('input',e=>{if(updateModelFromInput(e)){if(e.target.id==='recipe-search'){/* Search after user finishes typing, without losing focus. */ const cursor=e.target.selectionStart;const val=e.target.value;const results=state.recipes.filter(r=>String(r.name||'Untitled').toLowerCase().includes(val.toLowerCase()));const grid=document.querySelector('.recipe-grid');if(grid){grid.querySelectorAll('.recipe-card').forEach(card=>{const title=card.querySelector('.recipe-card-title')?.textContent||'';card.style.display=title.toLowerCase().includes(val.toLowerCase())?'':'none';});}else if(results.length&&activeTab==='recipes')render();return;} if(e.target.id==='print-quantity'){const qty=state.print.quantity,start=state.print.start,stock=getStock(),cap=getCapacity();const sheet=document.getElementById('sheet-thumbnail');if(sheet)sheet.innerHTML=thumbnail(stock,qty,start);const count=document.getElementById('job-count');if(count){const pages=Math.ceil((qty+start-1)/cap);count.textContent=qty+' labels across '+pages+' A4 sheet'+(pages!==1?'s':'');}buildPrintSheets();requestAnimationFrame(checkPrintFit);}return;}});
document.addEventListener('change',e=>{const el=e.target;const r=activeRecipe();if(el.dataset.allergen&&r){const ing=r.ingredients[+el.dataset.allergenIndex];if(!ing)return;const selected=new Set(ing.allergens||[]);el.checked?selected.add(el.dataset.allergen):selected.delete(el.dataset.allergen);ing.allergens=Array.from(selected);reviewTick=false;save();render();return;}
 if(el.dataset.ingField==='compound'){updateModelFromInput(e);render();return;}
 if(el.id==='review-check'){reviewTick=el.checked;render();return;}
 if(el.dataset.recipeField==='expiryType'){updateModelFromInput(e);render();return;}
 if(el.id==='print-start'){state.print.start=Math.max(1,Math.min(getCapacity(),+el.value||1));save();render();return;}
 if(el.id==='print-confirm'){const b=document.getElementById('print-button');if(b)b.disabled=!el.checked||!isVerified(r)||!!r?.demo||!!validate(r).length||showFitProblem;return;}
 if(el.id==='import-file'){importBackup(el.files?.[0]);return;}
 /* No full re-render on text-input blur: that would swallow the next tap. */
});
if('serviceWorker' in navigator&&location.protocol==='https:'){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));}
render();
