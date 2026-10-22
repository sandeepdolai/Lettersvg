(() => {
'use strict';
const fs=document.getElementById('paper-fullscreen'), surface=document.getElementById('paper-surface'),
edit=document.getElementById('paper-fullscreen-edit'), close=document.getElementById('paper-fullscreen-close'),
layer=document.getElementById('paper-page-viewport'), page=document.getElementById('paper-page-content'),
letterPaper=document.getElementById('letter-paper'), paperShadow=letterPaper&&letterPaper.querySelector('.letter-shadow');
if(!fs||!surface||!edit||!close||!layer||!page||!letterPaper||!paperShadow)return;
const originalSurfaceHeight=Number(surface.getAttribute('height'))||690;
const originalShadowHeight=Number(paperShadow.getAttribute('height'))||originalSurfaceHeight;
let items=[],selected=null,nextId=1,editing=false,photoEditorMode=false,drawingMode=false,selectedBrush='marker',drawColor='#ed1763',brushSize=24,sizePointerId=null,strokes=[],activeStroke=null,activeStrokePath=null,activePointerId=null,tab='stickers',undoStack=[],redoStack=[],drag=null,contentScale=1,canvasWidth=390,canvasHeight=844,layoutGeometry=new Map();
const ui=document.createElement('section');ui.className='ls-editor-shell';ui.setAttribute('aria-label','Photo editor');
ui.innerHTML='<div class="ls-editor-topbar" aria-label="Editor controls"><button class="ls-icon-button ls-close-button" data-do="exit" aria-label="Close editor" title="Close editor"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5 19 19M19 5 5 19"/></svg></button><button class="ls-icon-button ls-undo-button" data-do="undo" aria-label="Undo" title="Undo"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14 4 9l5-5M4 9h9a6 6 0 0 1 0 12h-2"/></svg></button><span class="ls-topbar-spacer"></span><button class="ls-icon-button ls-more-button" data-do="more" aria-label="More options" aria-expanded="false" title="More options"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg></button><button class="ls-next-button" data-do="next" disabled>Next</button></div><div class="ls-more-menu" aria-label="More options"><button data-do="redo"><span>Redo</span><span class="ls-menu-shortcut">↷</span></button><button data-do="library"><span>Library</span><span class="ls-menu-shortcut">✦</span></button><button data-do="layouts"><span>Premade layouts</span><span class="ls-menu-shortcut">▤</span></button></div><div class="ls-editor-panel" aria-live="polite"></div><nav class="ls-editor-dock" aria-label="Editor tools"><button class="ls-tool-button ls-wave-button" data-tool="draw" aria-label="Draw" title="Draw"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M3 23c4-8 7-13 10-13 5 0-4 18-1 18 2 0 9-17 13-17 5 0-4 19-1 19 3 0 7-8 13-15M4 31c4-5 7-7 10-7"/></svg></button><button class="ls-tool-button ls-text-button" data-tool="text" aria-label="Text" title="Text"><span class="ls-letter-a">A</span></button><button class="ls-tool-button ls-plus-button" data-do="quick-add" aria-label="Add to photo" title="Add to photo"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 5v30M5 20h30"/></svg></button><button class="ls-tool-button ls-photo-button" data-tool="photo" aria-label="Add photo" title="Add photo"><svg viewBox="0 0 40 40" aria-hidden="true"><rect x="3.5" y="5.5" width="33" height="29" rx="4"/><circle cx="13" cy="14" r="3"/><path d="m5 29 9-8 7 6 5-5 9 9"/></svg></button><button class="ls-tool-button ls-camera-button" data-tool="camera" aria-label="Take a photo" title="Take a photo"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M5 12h7l3-5h10l3 5h7a3 3 0 0 1 3 3v17a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V15a3 3 0 0 1 3-3Z"/><circle cx="20" cy="23" r="8"/><circle cx="20" cy="23" r="4.5"/></svg></button></nav>';
fs.append(ui);
ui.insertAdjacentHTML('beforeend','<nav class="ls-drawing-dock" aria-label="Drawing tools"><button class="ls-draw-undo" data-draw-action="undo" aria-label="Undo stroke" title="Undo stroke" disabled><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M16 11 7 20l9 9M8 20h14a9 9 0 0 1 0 18h-3"/></svg></button><div class="ls-brush-track" role="group" aria-label="Brush type"><button class="ls-brush-option" data-brush="pen" aria-label="Pen" title="Pen"><svg viewBox="0 0 44 92" aria-hidden="true"><path d="M17 5 22 1l5 4 4 17H13Z" fill="#111"/><path d="M13 22h18l4 8v48H9V30Z" fill="#050505"/><path d="M9 78h26l-5 9H14Z" fill="#111"/></svg></button><button class="ls-brush-option is-picked" data-brush="marker" aria-label="Marker" title="Marker"><svg viewBox="0 0 44 92" aria-hidden="true"><path d="M12 12Q12 4 22 2Q32 4 32 12L35 22H9Z" fill="#3e3e3e"/><path d="M10 23h24l3 10-2 43H9L7 33Z" fill="#555"/><path d="M9 44h26M9 76h26" fill="none" stroke="#f1f1f1" stroke-width="2"/><path d="M11 80h22l-6 9H17Z" fill="#3f3f3f"/></svg></button><button class="ls-brush-option" data-brush="pencil" aria-label="Pencil" title="Pencil"><svg viewBox="0 0 44 92" aria-hidden="true"><path d="M16 10 22 2 28 10 32 78 22 90 12 78Z" fill="#777"/><path d="M16 10h12M13 76h18" stroke="#eee" stroke-width="2"/><path d="M22 90 18 84h8Z" fill="#222"/></svg></button><button class="ls-brush-option" data-brush="brush" aria-label="Brush" title="Brush"><svg viewBox="0 0 44 92" aria-hidden="true"><path d="M21 4 35 16 22 34 9 21Z" fill="#494949"/><path d="M10 20 28 37 21 66 14 83 7 65Z" fill="#555"/><path d="M8 65h15l-3 17-4 7-4-7Z" fill="#171717"/></svg></button><button class="ls-brush-option" data-brush="eraser" aria-label="Eraser" title="Eraser"><svg viewBox="0 0 44 92" aria-hidden="true"><path d="m9 22 14-15 14 14-14 15Z" fill="#777"/><path d="m9 22 14 14-8 8L2 30Z" fill="#b9b9b9"/><path d="M10 45h24M12 49h20" stroke="#555" stroke-width="2"/><path d="M16 51h12v35H16Z" fill="#4a4a4a"/><path d="M19 54v28m6-28v28" stroke="#eee" stroke-width="2"/></svg></button></div><button class="ls-draw-color" data-draw-action="color" aria-label="Choose ink color" title="Choose ink color"><span></span></button></nav><div class="ls-brush-size-control" role="slider" tabindex="0" aria-label="Brush size" aria-orientation="vertical" aria-valuemin="4" aria-valuemax="100" aria-valuenow="24" aria-valuetext="24 brush size" title="Drag to change brush size"><span class="ls-brush-size-track"></span><span class="ls-brush-size-value" aria-hidden="true">24</span><span class="ls-brush-size-knob"></span></div>');
ui.insertAdjacentHTML('beforeend','<div class="ls-canvas-hint" role="note"><span class="ls-canvas-hint-mark" aria-hidden="true">＋</span><strong>Your canvas</strong><span>Tap + below to add text, photos or layouts</span></div>');
const panel=ui.querySelector('.ls-editor-panel'),file=document.createElement('input');
const svgNS='http://www.w3.org/2000/svg';
const inkLayer=document.createElementNS(svgNS,'svg');
inkLayer.setAttribute('class','ls-ink-layer');
inkLayer.setAttribute('aria-label','Freehand drawing');
inkLayer.setAttribute('preserveAspectRatio','none');
file.type='file';file.accept='image/*';file.multiple=true;file.className='ls-file-input';file.tabIndex=-1;file.setAttribute('aria-label','Choose photos from your device');ui.append(file);
const clone=a=>JSON.parse(JSON.stringify(a));
function saveHistory(){undoStack.push(clone(items));if(undoStack.length>30)undoStack.shift();redoStack=[];histButtons();}
function histButtons(){const u=ui.querySelector('[data-do="undo"]'),r=ui.querySelector('[data-do="redo"]'),n=ui.querySelector('[data-do="next"]');if(u)u.disabled=!undoStack.length;if(r)r.disabled=!redoStack.length;if(n)n.disabled=drawingMode?false:items.length===0;updateDrawingControls();}
function undo(){if(!undoStack.length)return;redoStack.push(clone(items));items=undoStack.pop();selected=null;draw();histButtons();}
function redo(){if(!redoStack.length)return;undoStack.push(clone(items));items=redoStack.pop();selected=null;draw();histButtons();}
function make(type,p){const o={id:nextId++,type,x:.16,y:.2,w:.68,h:.14,rotation:0,value:'',color:'#282322',font:'Arial, Helvetica, sans-serif',size:30,bold:false,italic:false,align:'center',fit:'contain',shape:'',src:''};Object.assign(o,p||{});return o;}
function add(o,saved){if(!saved)saveHistory();items.push(o);selected=o.id;draw();}
function nextLayerY(){
 // New objects start around the center with a slight cascade. Placement is
 // independent of existing object height, so photo layers can overlap freely.
 return .16+Math.min(items.length,4)*.025;
}
function chosen(){return items.find(o=>o.id===selected)||null;}
const brushWidths={pen:2.5,marker:8,pencil:3.5,brush:11,eraser:28};
function updateDrawingControls(){
 ui.classList.toggle('has-canvas-content',items.length>0||strokes.length>0);
 const undoButton=ui.querySelector('.ls-draw-undo');if(undoButton)undoButton.disabled=strokes.length===0;
 ui.querySelectorAll('[data-brush]').forEach(b=>b.classList.toggle('is-picked',b.dataset.brush===selectedBrush));
 const colorButton=ui.querySelector('.ls-draw-color');if(colorButton){colorButton.style.setProperty('--ls-ink-color',drawColor);colorButton.setAttribute('aria-label','Choose ink color, current '+drawColor);}
 const sizeControl=ui.querySelector('.ls-brush-size-control');
 if(sizeControl){
  const pct=((100-brushSize)/(100-4))*100;
  sizeControl.style.setProperty('--ls-brush-size-position',pct+'%');
  sizeControl.setAttribute('aria-valuenow',String(brushSize));
  sizeControl.setAttribute('aria-valuetext',brushSize+' brush size');
  const sizeValue=sizeControl.querySelector('.ls-brush-size-value');
  if(sizeValue)sizeValue.textContent=String(brushSize);
 }
}
function setBrushSize(value){
 brushSize=Math.max(4,Math.min(100,Math.round(Number(value)||24)));
 updateDrawingControls();
}
function setBrushSizeFromY(clientY){
 const control=ui.querySelector('.ls-brush-size-control');
 if(!control)return;
 const rect=control.getBoundingClientRect();
 const pct=Math.max(0,Math.min(1,(clientY-rect.top)/Math.max(1,rect.height)));
 setBrushSize(100-pct*(100-4));
}
function startBrushSizeChange(e){
 if(!drawingMode)return;
 e.preventDefault();e.stopPropagation();sizePointerId=e.pointerId;
 e.currentTarget.classList.add('is-adjusting');
 setBrushSizeFromY(e.clientY);
 try{e.currentTarget.setPointerCapture(e.pointerId);}catch(_){}
}
function moveBrushSizeChange(e){
 if(sizePointerId===null||e.pointerId!==sizePointerId)return;
 e.preventDefault();setBrushSizeFromY(e.clientY);
}
function finishBrushSizeChange(e){
 if(sizePointerId===null||(e&&e.pointerId!==sizePointerId))return;
 sizePointerId=null;
 const control=ui.querySelector('.ls-brush-size-control');
 if(control)control.classList.remove('is-adjusting');
}
let sizeAdjustAnimationTimer=null;
function keyBrushSizeChange(e){
 const keys={ArrowUp:1,ArrowRight:1,ArrowDown:-1,ArrowLeft:-1};
 let changed=false;
 if(e.key in keys){e.preventDefault();setBrushSize(brushSize+keys[e.key]);changed=true;}
 else if(e.key==='Home'){e.preventDefault();setBrushSize(4);changed=true;}
 else if(e.key==='End'){e.preventDefault();setBrushSize(100);changed=true;}
 if(changed){
  const control=e.currentTarget;
  control.classList.add('is-adjusting');
  clearTimeout(sizeAdjustAnimationTimer);
  sizeAdjustAnimationTimer=window.setTimeout(()=>control.classList.remove('is-adjusting'),180);
 }
}
function strokePathData(stroke){
 const points=stroke.points||[];
 return points.map((p,i)=>{const x=p.x*canvasWidth,y=p.y*canvasHeight;return (i?'L':'M')+x.toFixed(2)+' '+y.toFixed(2);}).join(' ');
}
function makeInkPath(stroke){
 const path=document.createElementNS(svgNS,'path');path.setAttribute('d',strokePathData(stroke));path.setAttribute('fill','none');path.setAttribute('stroke',stroke.color);path.setAttribute('stroke-width',String(stroke.width));path.setAttribute('stroke-linecap','round');path.setAttribute('stroke-linejoin','round');path.setAttribute('vector-effect','non-scaling-stroke');return path;
}
function renderInkLayer(documentHeight){
 inkLayer.replaceChildren();inkLayer.setAttribute('viewBox','0 0 '+Math.max(1,canvasWidth)+' '+Math.max(1,documentHeight));inkLayer.setAttribute('width',String(Math.max(1,canvasWidth)));inkLayer.setAttribute('height',String(Math.max(1,documentHeight)));
 strokes.forEach(stroke=>inkLayer.append(makeInkPath(stroke)));Object.assign(inkLayer.style,{pointerEvents:drawingMode?'auto':'none',touchAction:'none'});page.append(inkLayer);updateDrawingControls();
}
function inkPointFromEvent(e){
 const rect=inkLayer.getBoundingClientRect(),docHeight=Math.max(1,parseFloat(page.style.height)||canvasHeight),sx=canvasWidth/Math.max(1,rect.width),sy=docHeight/Math.max(1,rect.height);
 return {x:Math.max(0,Math.min(1,(e.clientX-rect.left)*sx/Math.max(1,canvasWidth))),y:Math.max(0,Math.min(1,(e.clientY-rect.top)*sy/Math.max(1,canvasHeight)))};
}
function startInk(e){
 if(!drawingMode||(e.button!==0&&e.pointerType==='mouse'))return;e.preventDefault();e.stopPropagation();
 const p=inkPointFromEvent(e),erasing=selectedBrush==='eraser';activeStroke={color:erasing?'#f7f7f7':drawColor,width:Math.round((brushWidths[selectedBrush]||4)*(brushSize/24)*10)/10,brush:selectedBrush,brushSize,points:[p]};strokes.push(activeStroke);activeStrokePath=makeInkPath(activeStroke);inkLayer.append(activeStrokePath);activePointerId=e.pointerId;try{inkLayer.setPointerCapture(e.pointerId);}catch(_){}updateDrawingControls();
}
function moveInk(e){
 if(!drawingMode||!activeStroke||e.pointerId!==activePointerId)return;e.preventDefault();const p=inkPointFromEvent(e),last=activeStroke.points[activeStroke.points.length-1],dx=p.x-last.x,dy=p.y-last.y;if(dx*dx+dy*dy<0.000002)return;activeStroke.points.push(p);activeStrokePath.setAttribute('d',strokePathData(activeStroke));
}
function finishInk(e){if(!activeStroke||(e&&e.pointerId!==activePointerId))return;activeStroke=null;activeStrokePath=null;activePointerId=null;updateDrawingControls();}
function undoInk(){if(!strokes.length)return;strokes.pop();activeStroke=null;activeStrokePath=null;activePointerId=null;draw();}
function chooseInkColor(){
 panel.innerHTML='<div class="ls-panel-header"><div><h3>Ink color</h3><p>Choose a color for your next stroke</p></div><button class="ls-panel-close" data-do="close-panel" aria-label="Close panel">×</button></div><div class="ls-draw-color-grid">'+[['#111111','Black'],['#ed1763','Pink'],['#d92e36','Red'],['#e18a31','Orange'],['#d7ae20','Yellow'],['#39845c','Green'],['#347bc4','Blue'],['#8a56bb','Purple'],['#7d7d7d','Grey'],['#f7f7f7','White']].map(c=>'<button data-draw-color="'+c[0]+'" aria-label="'+c[1]+'" title="'+c[1]+'" style="--swatch:'+c[0]+'" class="'+(drawColor===c[0]?'is-picked':'')+'"></button>').join('')+'</div>';showPanel();
}
function enterDrawingMode(){
 if(!editing||!document.body.classList.contains('is-paper-fullscreen'))return;drawingMode=true;selected=null;panel.classList.remove('is-open');setMoreMenu(false);ui.classList.add('is-drawing-mode');document.body.classList.add('is-paper-drawing-mode');
 const next=ui.querySelector('[data-do="next"]');if(next){next.textContent='Done';next.disabled=false;}layer.style.overflowY='hidden';layer.style.touchAction='none';layer.style.pointerEvents='auto';layer.scrollTop=0;draw();updateDrawingControls();
 requestAnimationFrame(()=>{positionLayer();layer.style.overflowY='hidden';layer.style.touchAction='none';layer.style.pointerEvents='auto';});
}
function exitDrawingMode(){
 if(!drawingMode)return;finishInk();drawingMode=false;panel.classList.remove('is-open');ui.classList.remove('is-drawing-mode');document.body.classList.remove('is-paper-drawing-mode');layer.style.overflowY='hidden';layer.style.overscrollBehavior='none';layer.style.touchAction='none';layer.style.pointerEvents=(editing||photoEditorMode)?'auto':'none';
 const next=ui.querySelector('[data-do="next"]');if(next)next.textContent='Next';draw();histButtons();
}
function syncPaperSurfaceHeight(){
 // Keep the SVG sheet and its shadow at their original dimensions.
 // Longer page content scrolls inside the paper's embedded viewport instead.
 surface.setAttribute('height',String(originalSurfaceHeight));
 paperShadow.setAttribute('height',String(originalShadowHeight));
}
function resetPaperSurfaceHeight(){
 surface.setAttribute('height',String(originalSurfaceHeight));
 paperShadow.setAttribute('height',String(originalShadowHeight));
}
function positionLayer(){
 const fullscreen=document.body.classList.contains('is-paper-fullscreen');
 // The content layer is inside the original SVG paper. Keep it rendered when the
 // paper returns to the envelope, rather than hiding the canvas on close.
 layer.style.display='block';
 layer.style.opacity='1';
 if(!fullscreen){
  const localWidth=layer.clientWidth||803,localHeight=layer.clientHeight||690;
  canvasWidth=localWidth;canvasHeight=localHeight;
  contentScale=Math.min(2.2,Math.max(.65,localWidth/390));
  layer.style.setProperty('--ls-content-scale',String(contentScale));
  layer.style.pointerEvents='none';
  layer.scrollTop=0;
  page.style.width=localWidth+'px';
  page.style.minHeight=localHeight+'px';
  page.style.transform='none';
  page.style.transformOrigin='0 0';
  resetPaperSurfaceHeight();
  draw();
  return;
 }
 const r=layer.getBoundingClientRect();if(!r.width||!r.height)return;
 canvasWidth=r.width;canvasHeight=r.height;
 const localWidth=layer.clientWidth||803,localHeight=layer.clientHeight||690;
 contentScale=Math.min(2.2,Math.max(.65,canvasWidth/390));
 layer.style.setProperty('--ls-content-scale',String(contentScale));
 page.style.width=canvasWidth+'px';
 page.style.minHeight=canvasHeight+'px';
 page.style.transform='scale('+(localWidth/canvasWidth)+','+(localHeight/canvasHeight)+')';
 page.style.transformOrigin='0 0';
 Object.assign(layer.style,{opacity:'1',pointerEvents:(editing||photoEditorMode)?'auto':'none'});
 draw();
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
 // Record a single undo step for either moving or resizing the selected layer.
 saveHistory();selected=o.id;
 const g=layoutGeometry.get(o.id)||o;
 drag={id:o.id,mode,sx:e.clientX,sy:e.clientY,x:g.x,y:g.y,w:g.w,h:g.h,pw:g.w*r.width,ph:g.h*r.height,rw:r.width,rh:r.height};draw();
}
document.addEventListener('pointermove',e=>{
 if(!drag)return;const o=items.find(x=>x.id===drag.id);if(!o)return;const dx=e.clientX-drag.sx,dy=e.clientY-drag.sy;
 if(drag.mode==='move'){
  o.x=Math.max(0,Math.min(1-drag.w,drag.x+dx/drag.rw));
  o.y=Math.max(0,Math.min(1-drag.h,drag.y+dy/drag.rh));
 }
 else if(o.type==='image'){
  const ratio=drag.pw/Math.max(1,drag.ph);
  let w=Math.max(54,drag.pw+dx),h=Math.max(48,drag.ph+dy);
  if(Math.abs(dx)>=Math.abs(dy))h=w/ratio;else w=h*ratio;
  const maxW=Math.max(1,(1-drag.x)*drag.rw),maxH=Math.max(1,(1-drag.y)*drag.rh);
  const fit=Math.min(1,maxW/Math.max(1,w),maxH/Math.max(1,h));
  o.w=Math.max(.04,w*fit/drag.rw);o.h=Math.max(.04,h*fit/drag.rh);
 }
 else{
  o.w=Math.min(1-drag.x,Math.max(.08,drag.w+dx/drag.rw));
  o.h=Math.min(1-drag.y,Math.max(.05,drag.h+dy/drag.rh));
 }
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
 function photoCompositionLayout(){
  // Compute each layer independently. No collision solving or vertical reflow:
  // overlapping photos, text, stickers, and shapes are intentional composition.
  const layout=new Map();
  items.forEach(o=>{
   const g={x:o.x,y:o.y,w:o.w,h:o.h};
   g.w=Math.max(.04,Math.min(1,g.w));
   if(o.type==='text')g.h=measureTextHeight(o,g.w*canvasWidth)/canvasHeight;
   else if(o.type==='image'&&Number.isFinite(o.ratio)&&o.ratio>0)g.h=(g.w*canvasWidth/o.ratio)/canvasHeight;
   else g.h=Math.max(.012,g.h);
   g.h=Math.max(.012,Math.min(1,g.h));
   g.x=Math.max(0,Math.min(1-g.w,g.x));
   g.y=Math.max(0,Math.min(1-g.h,g.y));
   layout.set(o.id,g);
  });
  return layout;
 }

 function draw(){
  layoutGeometry=photoCompositionLayout();
  page.replaceChildren();
  items.forEach((o,i)=>{
  const g=layoutGeometry.get(o.id)||o;
  const el=document.createElement('div');el.className='ls-object ls-object-'+o.type+(o.id===selected&&editing?' is-selected':'');el.dataset.id=String(o.id);
  Object.assign(el.style,{left:(g.x*canvasWidth)+'px',top:(g.y*canvasHeight)+'px',width:(g.w*canvasWidth)+'px',height:(g.h*canvasHeight)+'px',transform:'rotate('+o.rotation+'deg)',zIndex:String(o.id===selected?2000:i+1)});
  if(o.type==='text'||o.type==='sticker'){
   const c=document.createElement('div');c.className='ls-object-copy'+(o.type==='sticker'?' ls-sticker-copy':'');c.textContent=o.value;
   Object.assign(c.style,{color:o.color,fontFamily:o.font,fontSize:(o.size*contentScale)+'px',fontWeight:o.bold?'700':'400',fontStyle:o.italic?'italic':'normal',textAlign:o.align,justifyContent:'center',margin:'0'});
   el.append(c);
  }else if(o.type==='image'){const img=document.createElement('img');img.className='ls-object-photo';img.src=o.src;img.alt='Image on page';img.draggable=false;img.style.objectFit=o.fit;el.append(img);}
  else if(o.type==='shape'){const sh=document.createElement('div');sh.className='ls-shape ls-shape-'+o.shape;sh.style.setProperty('--ls-shape-color',o.color);const stroke=(o.shape==='circle'||o.shape==='corner')?3*contentScale:2*contentScale;sh.style.borderWidth=stroke+'px';if(o.shape==='frame'||o.shape==='corner')sh.style.borderRadius=(3*contentScale)+'px';el.append(sh);}
  el.addEventListener('pointerdown',e=>{if(e.target.closest('.ls-object-action')||e.target.closest('.ls-resize-handle'))return;startDrag(e,o,'move');});
  el.addEventListener('click',e=>{e.stopPropagation();if(editing&&selected!==o.id){selected=o.id;draw();}});
  if(o.id===selected&&editing){
   const bar=document.createElement('div');bar.className='ls-object-actions';bar.append(actionButton('rotate','↻','Rotate',o));
   if(o.type==='image')bar.append(actionButton('fit',o.fit==='cover'?'Fit':'Crop',o.fit==='cover'?'Fit entire image':'Fill frame',o));
   bar.append(actionButton('delete','×','Delete',o));el.append(bar);
   const grip=document.createElement('button');grip.type='button';grip.className='ls-resize-handle';grip.setAttribute('aria-label','Resize selected object');grip.addEventListener('pointerdown',e=>startDrag(e,o,'resize'));grip.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();});el.append(grip);
  }
  page.append(el);
 });
 // The paper is a fixed-size composition surface, never an expanding webpage.
 const documentHeight=canvasHeight;
 page.style.height=documentHeight+'px';
 page.style.minHeight=documentHeight+'px';
 renderInkLayer(documentHeight);
 syncPaperSurfaceHeight();
 histButtons();
}

inkLayer.addEventListener('pointerdown',startInk);
const brushSizeControl=ui.querySelector('.ls-brush-size-control');
if(brushSizeControl){
 brushSizeControl.addEventListener('pointerdown',startBrushSizeChange);
 brushSizeControl.addEventListener('keydown',keyBrushSizeChange);
}
document.addEventListener('pointermove',moveInk,{passive:false});
document.addEventListener('pointermove',moveBrushSizeChange,{passive:false});
document.addEventListener('pointerup',finishInk);document.addEventListener('pointercancel',finishInk);
document.addEventListener('pointerup',finishBrushSizeChange);document.addEventListener('pointercancel',finishBrushSizeChange);
page.addEventListener('pointerdown',e=>{if(e.target===page&&editing){selected=null;draw();}});
function openEditor(){if(!document.body.classList.contains('is-paper-fullscreen'))return;editing=true;photoEditorMode=true;document.body.classList.add('is-paper-editor-active');ui.classList.add('is-active');layer.style.overflowY='hidden';layer.style.overscrollBehavior='none';layer.style.touchAction='none';layer.scrollTop=0;edit.classList.remove('is-visible');const old=document.getElementById('paper-fullscreen-text');if(old)old.classList.remove('is-visible');positionLayer();draw();}
function done(){editing=false;panel.classList.remove('is-open');ui.classList.remove('is-active');document.body.classList.remove('is-paper-editor-active');setMoreMenu(false);edit.classList.add('is-visible');layer.style.pointerEvents=photoEditorMode?'auto':'none';draw();}
function setMoreMenu(open){const menu=ui.querySelector('.ls-more-menu'),button=ui.querySelector('.ls-more-button');if(menu)menu.classList.toggle('is-open',!!open);if(button)button.setAttribute('aria-expanded',open?'true':'false');}
function showPanel(){setMoreMenu(false);panel.classList.add('is-open');}
function hidePanel(){panel.classList.remove('is-open');ui.querySelectorAll('[data-tool]').forEach(b=>b.classList.remove('is-active'));const add=ui.querySelector('[data-do="quick-add"]');if(add)add.classList.remove('is-active');}
function textPanel(){
 setMoreMenu(false);
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
function quickAddPanel(){
 const button=ui.querySelector('[data-do="quick-add"]');
 if(panel.classList.contains('is-open')&&button&&button.classList.contains('is-active')){hidePanel();return;}
 setMoreMenu(false);
 ui.querySelectorAll('[data-tool]').forEach(b=>b.classList.remove('is-active'));
 if(button)button.classList.add('is-active');
 panel.innerHTML='<div class="ls-panel-header"><div><h3>Add to your photo</h3><p>Choose what you want to add</p></div><button class="ls-panel-close" data-do="close-panel" aria-label="Close panel">×</button></div><div class="ls-add-choice-grid"><button data-do="quick-text"><span class="ls-add-choice-icon ls-add-text-icon">A</span><strong>Text</strong></button><button data-do="quick-photo"><span class="ls-add-choice-icon">▧</span><strong>Photo</strong></button><button data-do="quick-library"><span class="ls-add-choice-icon">✦</span><strong>Library</strong></button><button data-do="quick-camera"><span class="ls-add-choice-icon">◎</span><strong>Camera</strong></button></div>';
 showPanel();
}
function applyText(){
 const input=panel.querySelector('.ls-text-input');if(!input)return;const value=input.value.trim(),existing=chosen();
 if(existing&&existing.type==='text'){existing.value=input.value;hidePanel();draw();return;}
 if(!value){input.placeholder='Type a message first…';input.focus();return;}
 add(make('text',{value:input.value,color:panel.querySelector('[data-color].is-picked')?.dataset.color||'#282322',size:Number(panel.querySelector('.ls-size-input').value||30),font:panel.querySelector('.ls-font-select').value,x:.08,y:nextLayerY(),w:.84,h:.08,bold:!!panel.querySelector('[data-format="bold"].is-on'),italic:!!panel.querySelector('[data-format="italic"].is-on'),align:panel.querySelector('[data-align].is-on')?.dataset.align||'center'}));hidePanel();
}
function choosePhoto(useCamera){hidePanel();setMoreMenu(false);file.value='';if(useCamera)file.setAttribute('capture','environment');else file.removeAttribute('capture');file.click();}
file.addEventListener('change',()=>{
 const files=Array.from(file.files||[]).filter(f=>f.type&&f.type.indexOf('image/')===0);if(!files.length)return;saveHistory();
 files.forEach(f=>{
  const reader=new FileReader();
  reader.onload=()=>{
   if(typeof reader.result!=='string')return;
   const src=reader.result,probe=new Image();
   const insert=ratio=>{
    const o=make('image',{src,ratio:Number(ratio)||1.5,x:.1,y:nextLayerY(),w:.8,h:.3});
    items.push(o);selected=o.id;draw();
   };
   probe.onload=()=>insert(probe.naturalWidth/Math.max(1,probe.naturalHeight));
   probe.onerror=()=>insert(1.5);
   probe.src=src;
  };
  reader.readAsDataURL(f);
 });
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
 if(elems[name]){const e=elems[name];add(make(e.type,{shape:e.shape||'',value:e.value||'',size:e.size||30,color:'#bf9147',x:(1-e.w)/2,y:nextLayerY(),w:e.w,h:e.h}));return;}
 if(stickers[name]){const s=stickers[name];add(make('sticker',{value:s[0],color:s[1],size:64,x:.36,y:nextLayerY(),w:.28,h:.2}));}
}
ui.addEventListener('click',e=>{
 const brush=e.target.closest('[data-brush]');if(brush){selectedBrush=brush.dataset.brush;updateDrawingControls();return;}
 const drawAction=e.target.closest('[data-draw-action]');if(drawAction){const v=drawAction.dataset.drawAction;if(v==='undo')undoInk();else if(v==='color')chooseInkColor();return;}
 const drawColorChoice=e.target.closest('[data-draw-color]');if(drawColorChoice){drawColor=drawColorChoice.dataset.drawColor;hidePanel();updateDrawingControls();return;}
 const tool=e.target.closest('[data-tool]');if(tool){if(tool.dataset.tool==='draw')enterDrawingMode();else if(tool.dataset.tool==='text')textPanel();else if(tool.dataset.tool==='photo')choosePhoto(false);else if(tool.dataset.tool==='camera')choosePhoto(true);else libraryPanel('stickers');return;}
 const action=e.target.closest('[data-do]');if(action){const v=action.dataset.do;
  if(v==='exit'){if(drawingMode)exitDrawingMode();else close.click();}
  else if(v==='next'||v==='done'){if(drawingMode)exitDrawingMode();else done();}
  else if(v==='undo')undo();
  else if(v==='redo') {setMoreMenu(false);redo();}
  else if(v==='more'){hidePanel();setMoreMenu(!ui.querySelector('.ls-more-menu').classList.contains('is-open'));}
  else if(v==='quick-add')quickAddPanel();
  else if(v==='quick-text'){hidePanel();textPanel();}
  else if(v==='quick-photo')choosePhoto(false);
  else if(v==='quick-camera')choosePhoto(true);
  else if(v==='quick-library'){hidePanel();libraryPanel('stickers');}
  else if(v==='library'){setMoreMenu(false);libraryPanel('stickers');}
  else if(v==='layouts'){setMoreMenu(false);libraryPanel('layouts');}
  else if(v==='close-panel')hidePanel();
  else if(v==='apply-text')applyText();
  return;
 }
 const t=e.target.closest('[data-lib-tab]');if(t){libraryPanel(t.dataset.libTab);return;}
 const item=e.target.closest('[data-lib-add]');if(item)libraryAdd(item.dataset.libAdd);
});
edit.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();openEditor();},true);
close.addEventListener('click',()=>{editing=false;photoEditorMode=false;drawingMode=false;document.body.classList.remove('is-paper-editor-active','is-paper-drawing-mode');ui.classList.remove('is-active','is-drawing-mode');panel.classList.remove('is-open');setMoreMenu(false);layer.style.overflowY='hidden';layer.style.overscrollBehavior='none';layer.style.touchAction='none';layer.style.pointerEvents='none';draw();},true);
// React only to actual fullscreen enter/exit transitions. This observer watches
// body.class, but its own cleanup also changes classes; without edge detection it
// can recursively trigger itself forever and freeze the close animation.
let wasPaperFullscreen = document.body.classList.contains('is-paper-fullscreen');
new MutationObserver(()=>{
 const isPaperFullscreenNow = document.body.classList.contains('is-paper-fullscreen');
 if(isPaperFullscreenNow === wasPaperFullscreen) return;
 wasPaperFullscreen = isPaperFullscreenNow;

 if(!isPaperFullscreenNow){
  editing=false;photoEditorMode=false;drawingMode=false;
  document.body.classList.remove('is-paper-editor-active','is-paper-drawing-mode');
  ui.classList.remove('is-active','is-drawing-mode');
  panel.classList.remove('is-open');setMoreMenu(false);
  layer.style.overflowY='auto';layer.style.touchAction='pan-y';layer.style.pointerEvents='none';
  page.style.height='';page.style.transform='';page.style.width='';
  resetPaperSurfaceHeight();
  positionLayer();
 } else {
  window.setTimeout(positionLayer,860);
 }
}).observe(document.body,{attributes:true,attributeFilter:['class']});
// The embedded page belongs to the paper at all times, even before fullscreen is opened.
positionLayer();
window.addEventListener('resize',()=>requestAnimationFrame(positionLayer));window.addEventListener('orientationchange',()=>setTimeout(positionLayer,120));
 if(window.visualViewport){window.visualViewport.addEventListener('resize',()=>requestAnimationFrame(positionLayer));window.visualViewport.addEventListener('scroll',()=>requestAnimationFrame(positionLayer));}
draw();histButtons();
})();