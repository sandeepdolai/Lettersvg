(() => {
'use strict';
const fs=document.getElementById('paper-fullscreen'), surface=document.getElementById('paper-surface'),
edit=document.getElementById('paper-fullscreen-edit'), close=document.getElementById('paper-fullscreen-close');
if(!fs||!surface||!edit||!close)return;
let items=[],selected=null,nextId=1,editing=false,tab='stickers',undoStack=[],redoStack=[],drag=null,contentScale=1,canvasWidth=390,canvasHeight=844,layoutGeometry=new Map();
const layer=document.createElement('div');layer.className='ls-canvas-layer';layer.setAttribute('aria-label','Editable letter contents');
const ui=document.createElement('section');ui.className='ls-editor-shell';ui.setAttribute('aria-label','Paper editor');
ui.innerHTML='<div class="ls-editor-topbar"><button class="ls-done-button" data-do="done">Done</button><div class="ls-document-title"><strong>Letter</strong><span>Editing locally</span></div><div class="ls-history-controls"><button data-do="undo" aria-label="Undo" title="Undo">↶</button><button data-do="redo" aria-label="Redo" title="Redo">↷</button></div></div><div class="ls-editor-panel" aria-live="polite"></div><nav class="ls-editor-dock" aria-label="Editor tools"><button class="ls-tool-button" data-tool="text"><span class="ls-tool-icon">T</span><span>Text</span></button><button class="ls-tool-button" data-tool="photo"><span class="ls-tool-icon ls-photo-icon">＋</span><span>Add photo</span></button><button class="ls-tool-button" data-tool="library"><span class="ls-tool-icon">✦</span><span>Library</span></button></nav>';
fs.append(layer,ui);
const panel=ui.querySelector('.ls-editor-panel'),file=document.createElement('input');
file.type='file';file.accept='image/*';file.multiple=true;file.className='ls-file-input';file.tabIndex=-1;file.setAttribute('aria-label','Choose photos from your device');ui.append(file);
const clone=a=>JSON.parse(JSON.stringify(a));
function saveHistory(){undoStack.push(clone(items));if(undoStack.length>30)undoStack.shift();redoStack=[];histButtons();}
function histButtons(){const u=ui.querySelector('[data-do="undo"]'),r=ui.querySelector('[data-do="redo"]');if(u)u.disabled=!undoStack.length;if(r)r.disabled=!redoStack.length;}
function undo(){if(!undoStack.length)return;redoStack.push(clone(items));items=undoStack.pop();selected=null;draw();histButtons();}
function redo(){if(!redoStack.length)return;undoStack.push(clone(items));items=redoStack.pop();selected=null;draw();histButtons();}
function make(type,p){const o={id:nextId++,type,x:.16,y:.2,w:.68,h:.14,rotation:0,value:'',color:'#282322',font:'Arial, Helvetica, sans-serif',size:30,bold:false,italic:false,align:'center',fit:'contain',shape:'',src:''};Object.assign(o,p||{});return o;}
function add(o,saved){if(!saved)saveHistory();items.push(o);selected=o.id;draw();}
function chosen(){return items.find(o=>o.id===selected)||null;}
function positionLayer(){
 if(!document.body.classList.contains('is-paper-fullscreen')){layer.style.display='none';layer.style.pointerEvents='none';return;}
 const r=surface.getBoundingClientRect();if(!r.width||!r.height)return;
 canvasWidth=r.width;canvasHeight=r.height;
  contentScale=Math.min(2.2,Math.max(.65,Math.sqrt((canvasWidth/390)*(canvasHeight/844))));
 layer.style.setProperty('--ls-content-scale',String(contentScale));
 Object.assign(layer.style,{display:'block',left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',opacity:'1',pointerEvents:editing?'auto':'none'});draw();
}
function actionButton(op,label,title,o){
 const b=document.createElement('button');b.type='button';b.className='ls-object-action';b.dataset.op=op;b.textContent=label;b.title=title;b.setAttribute('aria-label',title);
 b.addEventListener('pointerdown',e=>e.stopPropagation());
 b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(op==='delete'){saveHistory();items=items.filter(x=>x.id!==o.id);selected=null;draw();}else if(op==='rotate'){saveHistory();o.rotation=(o.rotation+15)%360;draw();}else if(op==='fit'){saveHistory();o.fit=o.fit==='cover'?'contain':'cover';draw();}});
 return b;
}
function startDrag(e,o,mode){
 if(!editing||(e.button!==0&&e.pointerType==='mouse'))return;
 e.preventDefault();e.stopPropagation();const r=layer.getBoundingClientRect();if(!r.width||!r.height)return;
 if(mode==='move')saveHistory();selected=o.id;
 const g=layoutGeometry.get(o.id)||o;
 drag={id:o.id,mode,sx:e.clientX,sy:e.clientY,x:g.x,y:g.y,w:g.w,h:g.h,pw:g.w*r.width,ph:g.h*r.height,rw:r.width,rh:r.height};draw();
}
document.addEventListener('pointermove',e=>{
 if(!drag)return;const o=items.find(x=>x.id===drag.id);if(!o)return;const dx=e.clientX-drag.sx,dy=e.clientY-drag.sy;
 if(drag.mode==='move'){o.x=Math.max(0,Math.min(1-drag.w,drag.x+dx/drag.rw));o.y=Math.max(0,Math.min(1-drag.h,drag.y+dy/drag.rh));}
 else if(o.type==='image'){const ratio=drag.pw/Math.max(1,drag.ph);let w=Math.max(54,drag.pw+dx),h=Math.max(48,drag.ph+dy);if(Math.abs(dx)>=Math.abs(dy))h=w/ratio;else w=h*ratio;o.w=Math.min(1-drag.x,w/drag.rw);o.h=Math.min(1-drag.y,h/drag.rh);}
 else{o.w=Math.min(1-drag.x,Math.max(.1,drag.w+dx/drag.rw));o.h=Math.min(1-drag.y,Math.max(.05,drag.h+dy/drag.rh));}
 draw();
});
document.addEventListener('pointerup',()=>drag=null);document.addEventListener('pointercancel',()=>drag=null);
function measureTextHeight(o,widthPx){
  const fontPx=Math.max(10,o.size*contentScale);
  const availableWidth=Math.max(24,widthPx-8);
  let lineCount=0;
  const ctx=measureTextHeight.context||(measureTextHeight.context=document.createElement('canvas').getContext('2d'));
  if(ctx){
   ctx.font=(o.italic?'italic ':'')+(o.bold?'700 ':'400 ')+fontPx+'px '+o.font;
   String(o.value||'').split(/\n/).forEach(paragraph=>{
    if(!paragraph){lineCount++;return;}
    let line='';
    paragraph.split(/\s+/).forEach(word=>{
     const candidate=line?line+' '+word:word;
     if(line&&ctx.measureText(candidate).width>availableWidth){lineCount++;line=word;}
     else line=candidate;
     if(ctx.measureText(line).width>availableWidth){
      const chars=Array.from(line);let fragment='';
      chars.forEach(char=>{if(fragment&&ctx.measureText(fragment+char).width>availableWidth){lineCount++;fragment=char;}else fragment+=char;});
      line=fragment;
     }
    });
    lineCount++;
   });
  }else{
   const capacity=Math.max(1,Math.floor(availableWidth/(fontPx*.55)));
   lineCount=String(o.value||'').split(/\n/).reduce((sum,line)=>sum+Math.max(1,Math.ceil(line.length/capacity)),0);
  }
  return Math.max(o.h*canvasHeight,lineCount*fontPx*1.22+fontPx*.35);
 }
 function responsiveLayout(){
  const layout=new Map();
  items.forEach(o=>{
   const g={x:o.x,y:o.y,w:o.w,h:o.h};
   if(o.type==='text')g.h=Math.max(g.h,measureTextHeight(o,g.w*canvasWidth)/canvasHeight);
   g.h=Math.min(g.h,1);
   g.x=Math.max(0,Math.min(1-g.w,g.x));
   g.y=Math.max(0,Math.min(1-g.h,g.y));
   layout.set(o.id,g);
  });
  const content=items.filter(o=>o.type==='text'||o.type==='image').slice().sort((a,b)=>a.y-b.y||a.id-b.id);
  const placed=[],gap=Math.min(.035,Math.max(.014,18/canvasHeight));
  content.forEach(o=>{
   const g=layout.get(o.id);
   if(drag&&drag.id===o.id){placed.push({id:o.id,g});return;}
   const collisions=placed.filter(p=>{
    if(drag&&drag.id===p.id)return false;
    const q=p.g;
    const overlapX=Math.min(g.x+g.w,q.x+q.w)-Math.max(g.x,q.x);
    const overlapY=Math.min(g.y+g.h,q.y+q.h)-Math.max(g.y,q.y);
    return overlapX>Math.min(.06,g.w*.18,q.w*.18)&&overlapY>gap*.35;
   });
   if(collisions.length){
    const below=Math.max.apply(null,collisions.map(p=>p.g.y+p.g.h))+gap;
    const above=Math.min.apply(null,collisions.map(p=>p.g.y))-g.h-gap;
    const canBelow=below+g.h<=.985,canAbove=above>=.015;
    if(canBelow&&canAbove)g.y=Math.abs(below-g.y)<=Math.abs(g.y-above)?below:above;
    else if(canBelow)g.y=below;
    else if(canAbove)g.y=above;
    else{
     const roomBelow=Math.max(0,.985-below),roomAbove=Math.max(0,Math.min.apply(null,collisions.map(p=>p.g.y))-gap-.015);
     if(roomBelow>=roomAbove&&roomBelow>.05){g.y=below;g.h=Math.min(g.h,roomBelow);}
     else if(roomAbove>.05){g.y=Math.max(.015,Math.min.apply(null,collisions.map(p=>p.g.y))-g.h-gap);g.h=Math.min(g.h,roomAbove);}
     else g.y=Math.max(.015,Math.min(.985-g.h,g.y));
    }
   }
   g.y=Math.max(.015,Math.min(.985-g.h,g.y));
   placed.push({id:o.id,g});
  });
  return layout;
 }
 function draw(){
  layoutGeometry=responsiveLayout();
  layer.replaceChildren();
  items.forEach((o,i)=>{
  const g=layoutGeometry.get(o.id)||o;
  const el=document.createElement('div');el.className='ls-object ls-object-'+o.type+(o.id===selected&&editing?' is-selected':'');el.dataset.id=String(o.id);
  Object.assign(el.style,{left:g.x*100+'%',top:g.y*100+'%',width:g.w*100+'%',height:g.h*100+'%',transform:'rotate('+o.rotation+'deg)',zIndex:String(o.id===selected?2000:i+1)});
  if(o.type==='text'||o.type==='sticker'){
   const c=document.createElement('div');c.className='ls-object-copy'+(o.type==='sticker'?' ls-sticker-copy':'');c.textContent=o.value;
   Object.assign(c.style,{color:o.color,fontFamily:o.font,fontSize:(o.size*contentScale)+'px',fontWeight:o.bold?'700':'400',fontStyle:o.italic?'italic':'normal',textAlign:o.align,justifyContent:'center'});el.append(c);
  }else if(o.type==='image'){const img=document.createElement('img');img.className='ls-object-photo';img.src=o.src;img.alt='Photo on letter';img.draggable=false;img.style.objectFit=o.fit;el.append(img);}
  else if(o.type==='shape'){const sh=document.createElement('div');sh.className='ls-shape ls-shape-'+o.shape;sh.style.setProperty('--ls-shape-color',o.color);const stroke=(o.shape==='circle'||o.shape==='corner')?3*contentScale:2*contentScale;sh.style.borderWidth=stroke+'px';if(o.shape==='frame'||o.shape==='corner')sh.style.borderRadius=(3*contentScale)+'px';el.append(sh);}
  el.addEventListener('pointerdown',e=>{if(e.target.closest('.ls-object-action')||e.target.closest('.ls-resize-handle'))return;startDrag(e,o,'move');});
  el.addEventListener('click',e=>{e.stopPropagation();if(editing&&selected!==o.id){selected=o.id;draw();}});
  if(o.id===selected&&editing){
   const bar=document.createElement('div');bar.className='ls-object-actions';bar.append(actionButton('rotate','↻','Rotate',o));
   if(o.type==='image')bar.append(actionButton('fit',o.fit==='cover'?'Fit':'Crop',o.fit==='cover'?'Fit entire photo':'Fill frame',o));
   bar.append(actionButton('delete','×','Delete',o));el.append(bar);
   const grip=document.createElement('button');grip.type='button';grip.className='ls-resize-handle';grip.setAttribute('aria-label','Resize selected object');grip.addEventListener('pointerdown',e=>startDrag(e,o,'resize'));grip.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();});el.append(grip);
  }
  layer.append(el);
 });histButtons();
}
layer.addEventListener('pointerdown',e=>{if(e.target===layer&&editing){selected=null;draw();}});
function openEditor(){if(!document.body.classList.contains('is-paper-fullscreen'))return;editing=true;ui.classList.add('is-active');edit.classList.remove('is-visible');const old=document.getElementById('paper-fullscreen-text');if(old)old.classList.remove('is-visible');positionLayer();draw();}
function done(){editing=false;panel.classList.remove('is-open');ui.classList.remove('is-active');edit.classList.add('is-visible');layer.style.pointerEvents='none';draw();}
function showPanel(){panel.classList.add('is-open');}function hidePanel(){panel.classList.remove('is-open');ui.querySelectorAll('[data-tool]').forEach(b=>b.classList.remove('is-active'));}
function textPanel(){
 ui.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('is-active',b.dataset.tool==='text'));
 const o=chosen(),editText=o&&o.type==='text'?o:null;if(editText)saveHistory();
 const color=editText?editText.color:'#282322',align=editText?editText.align:'center',font=editText?editText.font:'Arial, Helvetica, sans-serif',size=editText?editText.size:30;
 panel.innerHTML='<div class="ls-panel-header"><div><h3>Text</h3><p>Write something for your letter</p></div><button class="ls-panel-close" data-do="close-panel" aria-label="Close panel">×</button></div><textarea class="ls-text-input" placeholder="Write something meaningful…" aria-label="Text to put on the paper"></textarea><div class="ls-text-settings"><label class="ls-font-choice"><span>Font</span><select class="ls-font-select"><option value="Arial, Helvetica, sans-serif">Modern</option><option value="Georgia, serif">Serif</option><option value="cursive">Handwritten</option><option value="ui-rounded, system-ui, sans-serif">Rounded</option></select></label><label class="ls-size-choice"><span>Size</span><input class="ls-size-input" type="range" min="14" max="68" value="'+size+'" aria-label="Text size"></label></div><div class="ls-text-options"><div class="ls-color-swatches"><button data-color="#282322" style="--swatch:#282322" aria-label="Ink black"></button><button data-color="#b92c2c" style="--swatch:#b92c2c" aria-label="Letter red"></button><button data-color="#bf9147" style="--swatch:#bf9147" aria-label="Warm gold"></button><button data-color="#617a66" style="--swatch:#617a66" aria-label="Sage green"></button><button data-color="#5665a1" style="--swatch:#5665a1" aria-label="Blue"></button></div><div class="ls-format-options"><button data-format="bold" aria-label="Bold"><strong>B</strong></button><button data-format="italic" aria-label="Italic"><em>I</em></button><button data-align="left" aria-label="Align left">≡</button><button data-align="center" aria-label="Align center">☰</button><button data-align="right" aria-label="Align right">≡</button></div></div><button class="ls-primary-action" data-do="apply-text">'+(editText?'Done editing text':'Add text to paper')+'</button>';
 const input=panel.querySelector('.ls-text-input');input.value=editText?editText.value:'';panel.querySelector('.ls-font-select').value=font;
 let c=color,bold=!!(editText&&editText.bold),italic=!!(editText&&editText.italic),a=align;
 function update(){if(!editText)return;Object.assign(editText,{value:input.value,color:c,size:Number(panel.querySelector('.ls-size-input').value),font:panel.querySelector('.ls-font-select').value,bold,italic,align:a});draw();}
 input.addEventListener('input',update);panel.querySelector('.ls-font-select').addEventListener('change',update);panel.querySelector('.ls-size-input').addEventListener('input',update);
 panel.querySelectorAll('[data-color]').forEach(b=>{b.classList.toggle('is-picked',b.dataset.color===c);b.addEventListener('click',()=>{c=b.dataset.color;panel.querySelectorAll('[data-color]').forEach(x=>x.classList.toggle('is-picked',x===b));update();});});
 panel.querySelectorAll('[data-format]').forEach(b=>{b.classList.toggle('is-on',b.dataset.format==='bold'?bold:italic);b.addEventListener('click',()=>{if(b.dataset.format==='bold')bold=!bold;else italic=!italic;b.classList.toggle('is-on',b.dataset.format==='bold'?bold:italic);update();});});
 panel.querySelectorAll('[data-align]').forEach(b=>{b.classList.toggle('is-on',b.dataset.align===a);b.addEventListener('click',()=>{a=b.dataset.align;panel.querySelectorAll('[data-align]').forEach(x=>x.classList.toggle('is-on',x===b));update();});});
 showPanel();if(editText)update();input.focus({preventScroll:true});
}
function applyText(){
 const input=panel.querySelector('.ls-text-input');if(!input)return;const value=input.value.trim(),existing=chosen();
 if(existing&&existing.type==='text'){existing.value=input.value;hidePanel();draw();return;}
 if(!value){input.placeholder='Type a message first…';input.focus();return;}
 add(make('text',{value:input.value,color:panel.querySelector('[data-color].is-picked')?.dataset.color||'#282322',size:Number(panel.querySelector('.ls-size-input').value||30),font:panel.querySelector('.ls-font-select').value,x:.1,y:.2,w:.8,h:.22,bold:!!panel.querySelector('[data-format="bold"].is-on'),italic:!!panel.querySelector('[data-format="italic"].is-on'),align:panel.querySelector('[data-align].is-on')?.dataset.align||'center'}));hidePanel();
}
function choosePhoto(){hidePanel();file.value='';file.click();}
file.addEventListener('change',()=>{
 const files=Array.from(file.files||[]).filter(f=>f.type&&f.type.indexOf('image/')===0);if(!files.length)return;saveHistory();let n=0;
 files.forEach(f=>{const reader=new FileReader();reader.onload=()=>{if(typeof reader.result!=='string')return;const o=make('image',{src:reader.result,x:Math.min(.24+n*.035,.36),y:Math.min(.2+n*.035,.36),w:.56,h:.38});items.push(o);selected=o.id;n++;draw();};reader.readAsDataURL(f);});
});
function libraryPanel(which){
 tab=which||tab;ui.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('is-active',b.dataset.tool==='library'));
 let html='<div class="ls-panel-header"><div><h3>Library</h3><p>Little details to finish your letter</p></div><button class="ls-panel-close" data-do="close-panel" aria-label="Close panel">×</button></div><div class="ls-library-tabs">';
 [['stickers','Stickers'],['elements','Elements'],['layouts','Layouts']].forEach(t=>html+='<button data-lib-tab="'+t[0]+'" class="'+(tab===t[0]?'is-active':'')+'">'+t[1]+'</button>');
 html+='</div><div class="ls-library-grid">';
 if(tab==='stickers')[['heart','♥','Heart'],['sparkle','✦','Sparkle'],['flower','✿','Flower'],['star','★','Star'],['outline-heart','♡','Outline heart'],['smile','☺','Smiley'],['moon','☾','Moon'],['music','♫','Music'],['infinity','∞','Infinity'],['flower-two','❀','Blossom']].forEach(e=>html+='<button class="ls-library-tile" data-lib-add="'+e[0]+'"><span class="ls-library-symbol">'+e[1]+'</span><span>'+e[2]+'</span></button>');
 else if(tab==='elements')[['frame','▢','Frame'],['circle','◯','Circle'],['line','―','Line'],['dot','●','Dot'],['corner','⌜','Corner'],['ribbon','〰','Wave'],['diamond','◇','Diamond'],['leaf','❧','Leaf']].forEach(e=>html+='<button class="ls-library-tile" data-lib-add="'+e[0]+'"><span class="ls-library-symbol">'+e[1]+'</span><span>'+e[2]+'</span></button>');
 else [['love-note','Love note','A warm message with a signature'],['photo-caption','Photo & caption','A picture frame and a short message'],['minimal','Minimal note','A heading with quiet text']].forEach(e=>html+='<button class="ls-layout-tile" data-lib-add="'+e[0]+'"><span class="ls-layout-miniature '+e[0]+'"><i></i><i></i><i></i></span><strong>'+e[1]+'</strong><span>'+e[2]+'</span></button>');
 panel.innerHTML=html+'</div>';showPanel();
}
function libraryAdd(name){
 if(['love-note','photo-caption','minimal'].includes(name)){
  saveHistory();const push=(type,p)=>items.push(make(type,p));
  if(name==='love-note'){push('text',{value:'To my favorite person',x:.08,y:.12,w:.84,h:.15,size:31,bold:true,color:'#b92c2c',font:'Georgia, serif'});push('text',{value:'Every little thing about you makes ordinary days feel special.',x:.12,y:.36,w:.76,h:.25,size:20,font:'Georgia, serif'});push('text',{value:'Always yours  ♥',x:.12,y:.72,w:.76,h:.12,size:22,color:'#b92c2c',font:'cursive',italic:true});}
  else if(name==='photo-caption'){push('shape',{shape:'frame',x:.15,y:.12,w:.7,h:.49,color:'#bf9147'});push('text',{value:'Our favorite moment',x:.1,y:.68,w:.8,h:.1,size:25,bold:true,font:'Georgia, serif'});push('text',{value:'A little memory worth keeping.',x:.12,y:.8,w:.76,h:.08,size:17,color:'#617a66',italic:true});}
  else{push('text',{value:'A little note',x:.12,y:.22,w:.76,h:.15,size:35,bold:true,font:'Georgia, serif'});push('shape',{shape:'line',x:.28,y:.43,w:.44,h:.012,color:'#bf9147'});push('text',{value:'A few words from the heart.',x:.13,y:.52,w:.74,h:.16,size:20,color:'#617a66'});}
  selected=items[items.length-1].id;draw();hidePanel();return;
 }
 const stickers={heart:['♥','#c63b3b'],sparkle:['✦','#bf9147'],flower:['✿','#c63b71'],star:['★','#bf9147'],'outline-heart':['♡','#b92c2c'],smile:['☺','#bf9147'],moon:['☾','#5665a1'],music:['♫','#617a66'],infinity:['∞','#5665a1'],'flower-two':['❀','#c63b71'],diamond:['◇','#bf9147'],leaf:['❧','#617a66'],ribbon:['〰','#b92c2c']};
 const elems={frame:{type:'shape',shape:'frame',w:.74,h:.52},circle:{type:'shape',shape:'circle',w:.35,h:.35},line:{type:'shape',shape:'line',w:.62,h:.015},dot:{type:'shape',shape:'dot',w:.1,h:.1},corner:{type:'shape',shape:'corner',w:.28,h:.22},diamond:{type:'sticker',value:'◇',size:58},leaf:{type:'sticker',value:'❧',size:56},ribbon:{type:'sticker',value:'〰',size:50}};
 if(elems[name]){const e=elems[name];add(make(e.type,{shape:e.shape||'',value:e.value||'',size:e.size||30,color:'#bf9147',x:(1-e.w)/2,y:.34,w:e.w,h:e.h}));return;}
 if(stickers[name]){const s=stickers[name],n=items.filter(x=>x.type==='sticker').length;add(make('sticker',{value:s[0],color:s[1],size:64,x:Math.min(.12+n*.045,.52),y:Math.min(.28+n*.045,.62),w:.28,h:.2}));}
}
ui.addEventListener('click',e=>{
 const tool=e.target.closest('[data-tool]');if(tool){if(tool.dataset.tool==='text')textPanel();else if(tool.dataset.tool==='photo')choosePhoto();else libraryPanel('stickers');return;}
 const action=e.target.closest('[data-do]');if(action){const v=action.dataset.do;if(v==='done')done();else if(v==='undo')undo();else if(v==='redo')redo();else if(v==='close-panel')hidePanel();else if(v==='apply-text')applyText();return;}
 const t=e.target.closest('[data-lib-tab]');if(t){libraryPanel(t.dataset.libTab);return;}
 const item=e.target.closest('[data-lib-add]');if(item)libraryAdd(item.dataset.libAdd);
});
edit.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();openEditor();},true);
close.addEventListener('click',()=>{if(!editing)return;editing=false;ui.classList.remove('is-active');panel.classList.remove('is-open');layer.style.pointerEvents='none';draw();},true);
new MutationObserver(()=>{
 if(!document.body.classList.contains('is-paper-fullscreen')){editing=false;ui.classList.remove('is-active');panel.classList.remove('is-open');layer.style.display='none';layer.style.pointerEvents='none';}
 else window.setTimeout(positionLayer,860);
}).observe(document.body,{attributes:true,attributeFilter:['class']});
window.addEventListener('resize',()=>requestAnimationFrame(positionLayer));window.addEventListener('orientationchange',()=>setTimeout(positionLayer,120));
 if(window.visualViewport){window.visualViewport.addEventListener('resize',()=>requestAnimationFrame(positionLayer));window.visualViewport.addEventListener('scroll',()=>requestAnimationFrame(positionLayer));}
draw();histButtons();
})();