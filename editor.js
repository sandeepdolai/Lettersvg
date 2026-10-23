(() => {
'use strict';
const fs=document.getElementById('paper-fullscreen'), surface=document.getElementById('paper-surface'),
edit=document.getElementById('paper-fullscreen-edit'), close=document.getElementById('paper-fullscreen-close'),
layer=document.getElementById('paper-page-viewport'), page=document.getElementById('paper-page-content'),
letterPaper=document.getElementById('letter-paper'), paperShadow=letterPaper&&letterPaper.querySelector('.letter-shadow');
if(!fs||!surface||!edit||!close||!layer||!page||!letterPaper||!paperShadow)return;
const originalSurfaceHeight=Number(surface.getAttribute('height'))||690;
const originalShadowHeight=Number(paperShadow.getAttribute('height'))||originalSurfaceHeight;
let items=[],selected=null,nextId=1,editing=false,photoEditorMode=false,drawingMode=false,selectedBrush='marker',drawColor='#ed1763',brushSize=24,sizePointerId=null,strokes=[],activeStroke=null,activeStrokePath=null,activePointerId=null,tab='stickers',undoStack=[],redoStack=[],drag=null,dragFrame=null,pendingDragPoint=null,cropEdit=null,contentScale=1,canvasWidth=390,canvasHeight=844,layoutGeometry=new Map();
const ui=document.createElement('section');ui.className='ls-editor-shell';ui.setAttribute('aria-label','Photo editor');
ui.innerHTML='<div class="ls-editor-topbar" aria-label="Editor controls"><button class="ls-icon-button ls-close-button" data-do="exit" aria-label="Close editor" title="Close editor"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5 19 19M19 5 5 19"/></svg></button><button class="ls-icon-button ls-undo-button" data-do="undo" aria-label="Undo" title="Undo"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14 4 9l5-5M4 9h9a6 6 0 0 1 0 12h-2"/></svg></button><span class="ls-topbar-spacer"></span><button class="ls-icon-button ls-more-button" data-do="more" aria-label="More options" aria-expanded="false" title="More options"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg></button><button class="ls-next-button" data-do="next" disabled>Next</button></div><div class="ls-more-menu" aria-label="More options"><button data-do="layers"><span>Layers</span><span class="ls-menu-shortcut">▤</span></button><button data-do="redo"><span>Redo</span><span class="ls-menu-shortcut">↷</span></button><button data-do="library"><span>Library</span><span class="ls-menu-shortcut">✦</span></button><button data-do="layouts"><span>Premade layouts</span><span class="ls-menu-shortcut">▧</span></button></div><div class="ls-editor-panel" aria-live="polite"></div><nav class="ls-editor-dock" aria-label="Editor tools"><button class="ls-tool-button ls-wave-button" data-tool="draw" aria-label="Draw" title="Draw"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M3 23c4-8 7-13 10-13 5 0-4 18-1 18 2 0 9-17 13-17 5 0-4 19-1 19 3 0 7-8 13-15M4 31c4-5 7-7 10-7"/></svg></button><button class="ls-tool-button ls-text-button" data-tool="text" aria-label="Text" title="Text"><span class="ls-letter-a">A</span></button><button class="ls-tool-button ls-plus-button" data-do="quick-add" aria-label="Add to photo" title="Add to photo"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 5v30M5 20h30"/></svg></button><button class="ls-tool-button ls-photo-button" data-tool="photo" aria-label="Add photo" title="Add photo"><svg viewBox="0 0 40 40" aria-hidden="true"><rect x="3.5" y="5.5" width="33" height="29" rx="4"/><circle cx="13" cy="14" r="3"/><path d="m5 29 9-8 7 6 5-5 9 9"/></svg></button><button class="ls-tool-button ls-camera-button" data-tool="camera" aria-label="Take a photo" title="Take a photo"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M5 12h7l3-5h10l3 5h7a3 3 0 0 1 3 3v17a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V15a3 3 0 0 1 3-3Z"/><circle cx="20" cy="23" r="8"/><circle cx="20" cy="23" r="4.5"/></svg></button></nav>';
document.body.append(ui);
const cropOverlay=document.createElement('div');cropOverlay.className='ls-crop-overlay';cropOverlay.setAttribute('aria-label','Crop photo');ui.append(cropOverlay);
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
function make(type,p){const o={id:nextId++,type,x:.16,y:.2,w:.68,h:.14,rotation:0,value:'',color:'#282322',font:'Arial, Helvetica, sans-serif',size:30,bold:false,italic:false,align:'center',fit:'contain',shape:'',src:'',natural:null,crop:null,opacity:1,visible:true,locked:false};Object.assign(o,p||{});return o;}
function add(o,saved){if(!saved)saveHistory();items.push(o);selected=o.id;draw();}
function nextLayerY(){
 // New objects start around the center with a slight cascade. Placement is
 // independent of existing object height, so photo layers can overlap freely.
 return .16+Math.min(items.length,4)*.025;
}
function chosen(){return items.find(o=>o.id===selected)||null;}
function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
function safeNatural(o){return o&&o.natural&&o.natural.width>0&&o.natural.height>0?o.natural:{width:Math.max(1,(Number(o&&o.ratio)||1.5)*1000),height:1000};}
function fullCrop(rotation){return{x:0,y:0,width:1,height:1,rotation:Number(rotation)||0};}
function rotatedImageDims(natural,rotation){
 const w=Math.max(1,natural.width),h=Math.max(1,natural.height),rad=((Number(rotation)||0)*Math.PI)/180;
 const c=Math.abs(Math.cos(rad)),ss=Math.abs(Math.sin(rad));
 if(Math.min(c,ss)<1e-6)return ss>c?{width:h,height:w}:{width:w,height:h};
 return{width:w*c+h*ss,height:w*ss+h*c};
}
function normalizedCrop(o){return o&&o.crop?{x:clamp(Number(o.crop.x)||0,0,1),y:clamp(Number(o.crop.y)||0,0,1),width:clamp(Number(o.crop.width)||1,.01,1),height:clamp(Number(o.crop.height)||1,.01,1),rotation:Number(o.crop.rotation)||0}:fullCrop(0);}
function cropAspect(crop,natural){
 const dims=rotatedImageDims(natural,crop.rotation);
 return Math.max(.001,crop.width*dims.width)/Math.max(.001,crop.height*dims.height);
}
function cropImageStyle(crop,natural){
 const W=Math.max(1,natural.width),H=Math.max(1,natural.height),dims=rotatedImageDims(natural,crop.rotation);
 const rect={x:crop.x*dims.width,y:crop.y*dims.height,width:Math.max(1,crop.width*dims.width),height:Math.max(1,crop.height*dims.height)};
 const sx=1/rect.width,sy=1/rect.height,cRx=rect.x+rect.width/2,cRy=rect.y+rect.height/2;
 const originX=.5+(.5*dims.width-cRx)*sx,originY=.5+(.5*dims.height-cRy)*sy;
 const rad=(crop.rotation*Math.PI)/180,swap=Math.abs(Math.sin(rad))>Math.abs(Math.cos(rad));
 const boxW=swap?W*sy:W*sx,boxH=swap?H*sx:H*sy;
 return{left:(originX-boxW/2)*100,top:(originY-boxH/2)*100,width:boxW*100,height:boxH*100,rotate:crop.rotation};
}
function escapeHTML(value){return String(value==null?'':value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function layerName(o){
 if(o.type==='image')return o.crop?'Cropped photo':'Photo';
 if(o.type==='text')return 'Text · '+String(o.value||'Untitled text').replace(/\s+/g,' ').slice(0,30);
 if(o.type==='sticker')return 'Sticker · '+String(o.value||'Element').slice(0,24);
 return 'Shape · '+String(o.shape||'Element');
}
function layersPanel(){
 setMoreMenu(false);
 const rows=items.slice().reverse().map(o=>{
  const index=items.indexOf(o),active=o.id===selected;
  const typeIcon=o.type==='image'?'▧':o.type==='text'?'A':o.type==='sticker'?'✦':'◯';
  return '<div class="ls-layer-row'+(active?' is-selected':'')+(o.visible===false?' is-hidden':'')+'" data-layer-row="'+o.id+'">'+
   '<button class="ls-layer-pick" data-layer-action="select" data-layer-id="'+o.id+'" aria-pressed="'+active+'"><span class="ls-layer-type">'+typeIcon+'</span><span class="ls-layer-name">'+escapeHTML(layerName(o))+'</span></button>'+
   '<div class="ls-layer-actions">'+
    '<button data-layer-action="up" data-layer-id="'+o.id+'" aria-label="Bring layer forward" title="Bring forward" '+(index===items.length-1?'disabled':'')+'>↑</button>'+
    '<button data-layer-action="down" data-layer-id="'+o.id+'" aria-label="Send layer backward" title="Send backward" '+(index===0?'disabled':'')+'>↓</button>'+
    '<button data-layer-action="visible" data-layer-id="'+o.id+'" aria-label="'+(o.visible===false?'Show layer':'Hide layer')+'" title="'+(o.visible===false?'Show':'Hide')+'">'+(o.visible===false?'◌':'◉')+'</button>'+
    '<button data-layer-action="lock" data-layer-id="'+o.id+'" aria-label="'+(o.locked?'Unlock layer':'Lock layer')+'" title="'+(o.locked?'Unlock':'Lock')+'">'+(o.locked?'▣':'◇')+'</button>'+
    '<button data-layer-action="duplicate" data-layer-id="'+o.id+'" aria-label="Duplicate layer" title="Duplicate">＋</button>'+
    '<button data-layer-action="delete" data-layer-id="'+o.id+'" aria-label="Delete layer" title="Delete">×</button>'+
   '</div></div>';
 }).join('');
 const chosenLayer=chosen();
 const signedRotation=chosenLayer?(((Number(chosenLayer.rotation)||0)+180)%360+360)%360-180:0;
 const properties=chosenLayer?
  '<div class="ls-layer-properties" data-layer-properties="'+chosenLayer.id+'">'+
   '<div class="ls-layer-properties-heading"><strong>Selected layer</strong><span>'+escapeHTML(layerName(chosenLayer))+'</span></div>'+
   '<label class="ls-layer-range"><span>Opacity <output data-layer-value="opacity">'+Math.round(clamp(Number(chosenLayer.opacity==null?1:chosenLayer.opacity),0,1)*100)+'%</output></span>'+
    '<input type="range" min="10" max="100" step="1" value="'+Math.round(clamp(Number(chosenLayer.opacity==null?1:chosenLayer.opacity),.1,1)*100)+'" data-layer-range="opacity" data-layer-id="'+chosenLayer.id+'" aria-label="Layer opacity"></label>'+
   '<label class="ls-layer-range"><span>Rotation <output data-layer-value="rotation">'+Math.round(signedRotation)+'°</output></span>'+
    '<input type="range" min="-180" max="180" step="1" value="'+Math.round(signedRotation)+'" data-layer-range="rotation" data-layer-id="'+chosenLayer.id+'" aria-label="Layer rotation"></label>'+
  '</div>':'';
 panel.innerHTML='<div class="ls-panel-header"><div><h3>Layers</h3><p>Arrange objects on your canvas</p></div><button class="ls-panel-close" data-do="close-panel" aria-label="Close panel">×</button></div>'+
  (items.length?'<div class="ls-layers-list" role="list">'+rows+'</div>':'<div class="ls-layers-empty">Add a photo, text or element to create your first layer.</div>')+properties;
 showPanel();
}
function reorderLayer(id,direction){
 const index=items.findIndex(o=>o.id===id),next=index+direction;
 if(index<0||next<0||next>=items.length)return;
 saveHistory();const [item]=items.splice(index,1);items.splice(next,0,item);selected=id;draw();
}
function duplicateLayer(id){
 const index=items.findIndex(o=>o.id===id);if(index<0)return;
 saveHistory();const copy=clone(items[index]);copy.id=nextId++;copy.visible=true;copy.locked=false;
 copy.x=(Number(copy.x)||0)+.035;copy.y=(Number(copy.y)||0)+.035;
 items.splice(index+1,0,copy);selected=copy.id;draw();
}


const CROP_PRESETS=[
 {id:'original',label:'Original',ratio:'original'},
 {id:'free',label:'Free',ratio:null},
 {id:'1:1',label:'1:1',ratio:1},
 {id:'4:5',label:'4:5',ratio:4/5},
 {id:'3:4',label:'3:4',ratio:3/4},
 {id:'3:2',label:'3:2',ratio:3/2},
 {id:'16:9',label:'16:9',ratio:16/9},
 {id:'9:16',label:'9:16',ratio:9/16}
];
function snapshotCrop(){
 if(!cropEdit)return;
 cropEdit.past.push({draft:clone(cropEdit.draft),preset:cropEdit.preset});
 if(cropEdit.past.length>50)cropEdit.past.shift();
 cropEdit.future=[];updateCropHistoryButtons();
}
function updateCropHistoryButtons(){
 if(!cropEdit)return;
 const undo=cropOverlay.querySelector('[data-crop-action="undo"]');
 const redo=cropOverlay.querySelector('[data-crop-action="redo"]');
 if(undo)undo.disabled=cropEdit.past.length===0;
 if(redo)redo.disabled=cropEdit.future.length===0;
}
function cropPlaneAspect(){
 if(!cropEdit)return 1;
 const o=items.find(item=>item.id===cropEdit.id);if(!o)return 1;
 const dims=rotatedImageDims(safeNatural(o),cropEdit.draft.rotation);
 return dims.width/Math.max(1,dims.height);
}
function updateCropFrame(){
 if(!cropEdit)return;
 const frame=cropOverlay.querySelector('.ls-crop-frame');
 if(!frame)return;
 const c=cropEdit.draft;
 Object.assign(frame.style,{left:(c.x*100)+'%',top:(c.y*100)+'%',width:(c.width*100)+'%',height:(c.height*100)+'%'});
 cropOverlay.querySelectorAll('[data-crop-ratio]').forEach(b=>b.classList.toggle('is-active',b.dataset.cropRatio===cropEdit.preset));
 updateCropHistoryButtons();
}
function layoutCropEditor(){
 if(!cropEdit)return;
 const o=items.find(item=>item.id===cropEdit.id);if(!o)return;
 const workspace=cropOverlay.querySelector('.ls-crop-workspace');
 const plane=cropOverlay.querySelector('.ls-crop-photo-plane');
 const img=cropOverlay.querySelector('.ls-crop-source');
 if(!workspace||!plane||!img)return;
 const natural=safeNatural(o),dims=rotatedImageDims(natural,cropEdit.draft.rotation);
 const availableWidth=Math.max(1,workspace.clientWidth-8),availableHeight=Math.max(1,workspace.clientHeight-8);
 const scale=Math.min(availableWidth/dims.width,availableHeight/dims.height);
 const width=Math.max(1,dims.width*scale),height=Math.max(1,dims.height*scale);
 cropEdit.planeWidth=width;cropEdit.planeHeight=height;
 Object.assign(plane.style,{width:width+'px',height:height+'px'});
 const swap=Math.abs(Math.sin(cropEdit.draft.rotation*Math.PI/180))>Math.abs(Math.cos(cropEdit.draft.rotation*Math.PI/180));
 Object.assign(img.style,{
  position:'absolute',left:'50%',top:'50%',
  width:(swap?height:width)+'px',height:(swap?width:height)+'px',
  maxWidth:'none',maxHeight:'none',objectFit:'fill',
  transform:'translate(-50%,-50%) rotate('+cropEdit.draft.rotation+'deg)',
  transformOrigin:'center center'
 });
 updateCropFrame();
}
function renderCropEditor(){
 if(!cropEdit)return;
 const o=items.find(item=>item.id===cropEdit.id);if(!o)return;
 ui.classList.add('is-crop-mode');
 const ratios=CROP_PRESETS.map(p=>'<button type="button" data-crop-ratio="'+p.id+'" class="'+(cropEdit.preset===p.id?'is-active':'')+'">'+p.label+'</button>').join('');
 cropOverlay.innerHTML=
  '<header class="ls-crop-topbar"><button type="button" data-crop-action="cancel">Cancel</button><strong>Crop photo</strong><button type="button" data-crop-action="reset">Reset</button></header>'+
  '<div class="ls-crop-workspace" aria-label="Photo crop workspace"><div class="ls-crop-photo-plane">'+
   '<img class="ls-crop-source" alt="Photo being cropped" draggable="false">'+
   '<div class="ls-crop-frame" role="group" aria-label="Crop frame">'+
    '<button type="button" data-crop-handle="nw" aria-label="Resize crop top left"></button>'+
    '<button type="button" data-crop-handle="n" aria-label="Resize crop top"></button>'+
    '<button type="button" data-crop-handle="ne" aria-label="Resize crop top right"></button>'+
    '<button type="button" data-crop-handle="e" aria-label="Resize crop right"></button>'+
    '<button type="button" data-crop-handle="se" aria-label="Resize crop bottom right"></button>'+
    '<button type="button" data-crop-handle="s" aria-label="Resize crop bottom"></button>'+
    '<button type="button" data-crop-handle="sw" aria-label="Resize crop bottom left"></button>'+
    '<button type="button" data-crop-handle="w" aria-label="Resize crop left"></button>'+
   '</div></div></div>'+
  '<footer class="ls-crop-footer"><div class="ls-crop-ratios" role="group" aria-label="Crop aspect ratio">'+ratios+'</div>'+
   '<div class="ls-crop-actions"><button type="button" data-crop-action="rotate-left" aria-label="Rotate photo left">↶ Rotate</button>'+
   '<button type="button" data-crop-action="rotate-right" aria-label="Rotate photo right">↻ Rotate</button>'+
   '<button type="button" data-crop-action="undo" aria-label="Undo crop change" disabled>Undo</button>'+
   '<button type="button" data-crop-action="redo" aria-label="Redo crop change" disabled>Redo</button>'+
   '<button type="button" data-crop-action="apply" class="is-primary">Done</button></div></footer>';
 const img=cropOverlay.querySelector('.ls-crop-source');
 img.src=o.src||'';img.addEventListener('load',layoutCropEditor,{once:true});
 requestAnimationFrame(layoutCropEditor);
}
function openCropEditor(o){
 if(!o||o.type!=='image'||o.locked)return;
 selected=o.id;hidePanel();setMoreMenu(false);
 cropEdit={id:o.id,initial:o.crop?clone(o.crop):null,draft:o.crop?clone(o.crop):fullCrop(0),preset:o.crop?'free':'original',past:[],future:[],gesture:null,planeWidth:0,planeHeight:0};
 renderCropEditor();
}
function closeCropEditor(){
 cropEdit=null;cropOverlay.innerHTML='';ui.classList.remove('is-crop-mode');
 positionLayer();draw();
}
function fitCropRectToRatio(crop,presetRatio,planeAspect){
 if(!presetRatio)return crop;
 const targetWOverH=presetRatio/Math.max(.001,planeAspect);
 let w=crop.width,h=crop.height;
 if(w/h>targetWOverH)w=h*targetWOverH;else h=w/targetWOverH;
 w=clamp(w,.04,1);h=clamp(h,.04,1);
 const cx=crop.x+crop.width/2,cy=crop.y+crop.height/2;
 if(w>1){h/=w;w=1;}if(h>1){w/=h;h=1;}
 return{x:clamp(cx-w/2,0,1-w),y:clamp(cy-h/2,0,1-h),width:w,height:h,rotation:crop.rotation};
}
function applyCropPreset(id){
 if(!cropEdit)return;
 const preset=CROP_PRESETS.find(item=>item.id===id);if(!preset)return;
 snapshotCrop();cropEdit.preset=id;
 if(id==='original'){
  cropEdit.draft=fullCrop(cropEdit.draft.rotation);
 }else if(id==='free'){
  // Free keeps the current frame; the user may resize each edge independently.
 }else{
  const ratio=preset.ratio;
  cropEdit.draft=fitCropRectToRatio(cropEdit.draft,ratio,cropPlaneAspect());
 }
 updateCropFrame();
}
function rotateCrop(direction){
 if(!cropEdit)return;
 const o=items.find(item=>item.id===cropEdit.id);if(!o)return;
 snapshotCrop();
 const natural=safeNatural(o),old=clone(cropEdit.draft);
 const oldDims=rotatedImageDims(natural,old.rotation);
 const nextRotation=((old.rotation+(direction*90))%360+360)%360;
 const newDims=rotatedImageDims(natural,nextRotation);
 const oldRect={x:old.x*oldDims.width,y:old.y*oldDims.height,w:old.width*oldDims.width,h:old.height*oldDims.height};
 const oldCx=oldRect.x+oldRect.w/2,oldCy=oldRect.y+oldRect.h/2;
 // Rotate the crop centre around the image centre. Keep its display ratio and
 // approximate pixel area, so rotating doesn't discard the user's crop.
 const center=direction>0
  ?{x:oldDims.height-oldCy,y:oldCx}
  :{x:oldCy,y:oldDims.width-oldCx};
 const preset=CROP_PRESETS.find(item=>item.id===cropEdit.preset);
 const targetRatio=preset&&typeof preset.ratio==='number'?preset.ratio:(cropEdit.preset==='original'?natural.width/natural.height:oldRect.w/Math.max(1,oldRect.h));
 const area=Math.max(1,oldRect.w*oldRect.h);
 let w=Math.sqrt(area*targetRatio),h=Math.sqrt(area/targetRatio);
 const fit=Math.min(1,newDims.width/Math.max(1,w),newDims.height/Math.max(1,h));
 w=Math.max(1,w*fit);h=Math.max(1,h*fit);
 const x=clamp(center.x-w/2,0,newDims.width-w),y=clamp(center.y-h/2,0,newDims.height-h);
 cropEdit.draft={x:x/newDims.width,y:y/newDims.height,width:w/newDims.width,height:h/newDims.height,rotation:nextRotation};
 layoutCropEditor();
}
function resetCrop(){
 if(!cropEdit)return;
 snapshotCrop();cropEdit.draft=fullCrop(0);cropEdit.preset='original';layoutCropEditor();
}
function undoCrop(){
 if(!cropEdit||!cropEdit.past.length)return;
 cropEdit.future.push({draft:clone(cropEdit.draft),preset:cropEdit.preset});
 const prev=cropEdit.past.pop();cropEdit.draft=prev.draft;cropEdit.preset=prev.preset;layoutCropEditor();
}
function redoCrop(){
 if(!cropEdit||!cropEdit.future.length)return;
 cropEdit.past.push({draft:clone(cropEdit.draft),preset:cropEdit.preset});
 const next=cropEdit.future.pop();cropEdit.draft=next.draft;cropEdit.preset=next.preset;layoutCropEditor();
}
function commitCrop(){
 if(!cropEdit)return;
 const session=cropEdit,o=items.find(item=>item.id===session.id);if(!o){closeCropEditor();return;}
 const crop=clone(session.draft),natural=safeNatural(o);
 saveHistory();
 const isFull=crop.rotation===0&&crop.x<.0001&&crop.y<.0001&&crop.width>.9999&&crop.height>.9999;
 const aspect=isFull?natural.width/natural.height:cropAspect(crop,natural);
 const area=Math.max(24*24,(o.w*canvasWidth)*(o.h*canvasHeight));
 const widthPx=Math.sqrt(area*aspect),heightPx=Math.sqrt(area/aspect);
 const cx=o.x+o.w/2,cy=o.y+o.h/2;
 o.crop=isFull?null:crop;
 o.fit='cover';
 o.w=widthPx/Math.max(1,canvasWidth);o.h=heightPx/Math.max(1,canvasHeight);
 o.x=cx-o.w/2;o.y=cy-o.h/2;
 selected=o.id;closeCropEditor();
}
function beginCropGesture(e){
 if(!cropEdit||e.button!==0&&e.pointerType==='mouse')return;
 const handle=e.target.closest('[data-crop-handle]'),frame=e.target.closest('.ls-crop-frame');
 if(!frame)return;
 e.preventDefault();e.stopPropagation();
 const c=cropEdit.draft;
 snapshotCrop();
 cropEdit.gesture={
  pointerId:e.pointerId,kind:handle?'resize':'move',handle:handle?handle.dataset.cropHandle:null,
  sx:e.clientX,sy:e.clientY,start:clone(c),planeWidth:cropEdit.planeWidth,planeHeight:cropEdit.planeHeight
 };
 try{cropOverlay.setPointerCapture(e.pointerId);}catch(_){}
}
function moveCropGesture(e){
 if(!cropEdit||!cropEdit.gesture||e.pointerId!==cropEdit.gesture.pointerId)return;
 const g=cropEdit.gesture,d=cropEdit.draft;
 e.preventDefault();
 const dx=(e.clientX-g.sx)/Math.max(1,g.planeWidth),dy=(e.clientY-g.sy)/Math.max(1,g.planeHeight);
 if(g.kind==='move'){
  d.x=clamp(g.start.x+dx,0,1-d.width);d.y=clamp(g.start.y+dy,0,1-d.height);
  updateCropFrame();return;
 }
 const minW=Math.min(.22,28/Math.max(1,g.planeWidth)),minH=Math.min(.22,28/Math.max(1,g.planeHeight));
 let left=g.start.x,right=g.start.x+g.start.width,top=g.start.y,bottom=g.start.y+g.start.height;
 const h=g.handle;
 if(h.includes('w'))left=clamp(g.start.x+dx,0,right-minW);
 if(h.includes('e'))right=clamp(g.start.x+g.start.width+dx,left+minW,1);
 if(h.includes('n'))top=clamp(g.start.y+dy,0,bottom-minH);
 if(h.includes('s'))bottom=clamp(g.start.y+g.start.height+dy,top+minH,1);
 const preset=CROP_PRESETS.find(item=>item.id===cropEdit.preset);
 if(preset&&preset.ratio){
  const target=preset.ratio/Math.max(.001,cropPlaneAspect());
  let w=right-left,height=bottom-top;
  if(h==='e'||h==='w'){height=w/target;}else if(h==='n'||h==='s'){w=height*target;}else if(w/height>target){height=w/target;}else{w=height*target;}
  if(h.includes('w'))left=right-w;else if(h.includes('e'))right=left+w;else{const cx=(left+right)/2;left=cx-w/2;right=cx+w/2;}
  if(h.includes('n'))top=bottom-height;else if(h.includes('s'))bottom=top+height;else{const cy=(top+bottom)/2;top=cy-height/2;bottom=cy+height/2;}
 }
 // Clamp the finished viewport and preserve a usable minimum crop region.
 let width=clamp(right-left,minW,1),height=clamp(bottom-top,minH,1);
 left=clamp(left,0,1-width);top=clamp(top,0,1-height);
 d.x=left;d.y=top;d.width=width;d.height=height;
 updateCropFrame();
}
function finishCropGesture(e){
 if(!cropEdit||!cropEdit.gesture||(e&&e.pointerId!==cropEdit.gesture.pointerId))return;
 const g=cropEdit.gesture;cropEdit.gesture=null;
 const a=g.start,b=cropEdit.draft;
 if(Math.abs(a.x-b.x)+Math.abs(a.y-b.y)+Math.abs(a.width-b.width)+Math.abs(a.height-b.height)<.00001)cropEdit.past.pop();
 updateCropHistoryButtons();
}
cropOverlay.addEventListener('pointerdown',beginCropGesture);
document.addEventListener('pointermove',moveCropGesture,{passive:false});
document.addEventListener('pointerup',finishCropGesture);
document.addEventListener('pointercancel',finishCropGesture);

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
 const inkWidth=Math.max(1,canvasWidth),inkHeight=Math.max(1,documentHeight);
 inkLayer.replaceChildren();
 inkLayer.setAttribute('viewBox','0 0 '+inkWidth+' '+inkHeight);
 inkLayer.setAttribute('width',String(inkWidth));
 inkLayer.setAttribute('height',String(inkHeight));
 inkLayer.setAttribute('overflow','hidden');
 inkLayer.style.overflow='hidden';

 // Masks remove ink from earlier strokes. Eraser strokes are instructions for
 // the masks, not visible white paths and not new artwork layers.
 const defs=document.createElementNS(svgNS,'defs');
 const clip=document.createElementNS(svgNS,'clipPath');
 clip.setAttribute('id','lettersvg-ink-paper-clip');
 clip.setAttribute('clipPathUnits','userSpaceOnUse');
 const rect=document.createElementNS(svgNS,'rect');
 rect.setAttribute('x','0');rect.setAttribute('y','0');
 rect.setAttribute('width',String(inkWidth));rect.setAttribute('height',String(inkHeight));
 clip.append(rect);
 defs.append(clip);

 const clippedInk=document.createElementNS(svgNS,'g');
 clippedInk.setAttribute('class','ls-visible-ink');
 clippedInk.setAttribute('clip-path','url(#lettersvg-ink-paper-clip)');

 strokes.forEach((stroke,index)=>{
  // Eraser paths only mask strokes that were drawn before them. Later drawing
  // remains visible, matching the normal behavior of a paint-app eraser.
  if(stroke.brush==='eraser')return;
  const path=makeInkPath(stroke);
  const laterErasers=strokes.slice(index+1).filter(candidate=>candidate.brush==='eraser');
  if(laterErasers.length){
   const mask=document.createElementNS(svgNS,'mask');
   const maskId='lettersvg-ink-erase-mask-'+index;
   mask.setAttribute('id',maskId);
   mask.setAttribute('maskUnits','userSpaceOnUse');
   mask.setAttribute('maskContentUnits','userSpaceOnUse');
   mask.setAttribute('mask-type','luminance');
   mask.style.maskType='luminance';
   mask.setAttribute('x','0');mask.setAttribute('y','0');
   mask.setAttribute('width',String(inkWidth));mask.setAttribute('height',String(inkHeight));
   const visible=document.createElementNS(svgNS,'rect');
   visible.setAttribute('x','0');visible.setAttribute('y','0');
   visible.setAttribute('width',String(inkWidth));visible.setAttribute('height',String(inkHeight));
   visible.setAttribute('fill','#fff');
   mask.append(visible);
   laterErasers.forEach(eraser=>{
    const erasePath=makeInkPath(eraser);
    erasePath.setAttribute('stroke','#000');
    erasePath.removeAttribute('mask');
    mask.append(erasePath);
   });
   defs.append(mask);
   path.setAttribute('mask','url(#'+maskId+')');
  }
  clippedInk.append(path);
 });
 inkLayer.append(defs,clippedInk);
 Object.assign(inkLayer.style,{pointerEvents:drawingMode?'auto':'none',touchAction:'none'});
 page.append(inkLayer);updateDrawingControls();
}
function inkPointFromEvent(e){
 const rect=inkLayer.getBoundingClientRect(),docHeight=Math.max(1,parseFloat(page.style.height)||canvasHeight),sx=canvasWidth/Math.max(1,rect.width),sy=docHeight/Math.max(1,rect.height);
 return {x:Math.max(0,Math.min(1,(e.clientX-rect.left)*sx/Math.max(1,canvasWidth))),y:Math.max(0,Math.min(1,(e.clientY-rect.top)*sy/Math.max(1,canvasHeight)))};
}
function startInk(e){
 if(!drawingMode||(e.button!==0&&e.pointerType==='mouse'))return;e.preventDefault();e.stopPropagation();
 const p=inkPointFromEvent(e);
 activeStroke={color:drawColor,width:Math.round((brushWidths[selectedBrush]||4)*(brushSize/24)*10)/10,brush:selectedBrush,brushSize,points:[p]};
 strokes.push(activeStroke);
 activePointerId=e.pointerId;
 renderInkLayer(Math.max(1,parseFloat(page.style.height)||canvasHeight));
 try{inkLayer.setPointerCapture(e.pointerId);}catch(_){}
}
function moveInk(e){
 if(!drawingMode||!activeStroke||e.pointerId!==activePointerId)return;e.preventDefault();
 const p=inkPointFromEvent(e),last=activeStroke.points[activeStroke.points.length-1],dx=p.x-last.x,dy=p.y-last.y;
 if(dx*dx+dy*dy<0.000002)return;
 activeStroke.points.push(p);
 // Rebuild the SVG masks while a stroke is in progress so the eraser effect
 // is visible immediately, rather than drawing an opaque stroke on top.
 renderInkLayer(Math.max(1,parseFloat(page.style.height)||canvasHeight));
}
function finishInk(e){if(!activeStroke||(e&&e.pointerId!==activePointerId))return;activeStroke=null;activeStrokePath=null;activePointerId=null;updateDrawingControls();}
function undoInk(){if(!strokes.length)return;strokes.pop();activeStroke=null;activeStrokePath=null;activePointerId=null;draw();}
function chooseInkColor(){
 const colors=[
  ['#ed1763','Pink'],['#ff2638','Red'],['#ff6b18','Orange'],['#ffd000','Yellow'],
  ['#00ad70','Green'],['#00bfae','Turquoise'],['#07316e','Navy blue'],
  ['#111111','Black'],['#626262','Dark gray'],['#a9a9a9','Gray'],['#ececec','Light gray'],
  ['#ffffff','White'],['#56321f','Dark brown'],['#82451e','Brown']
 ];
 panel.innerHTML='<div class="ls-draw-color-grid" role="group" aria-label="Ink colors">'+colors.map(c=>'<button type="button" data-draw-color="'+c[0]+'" aria-label="'+c[1]+'" title="'+c[1]+'" style="--swatch:'+c[0]+'" class="'+(drawColor.toLowerCase()===c[0]?'is-picked':'')+'"></button>').join('')+'</div>';
 panel.classList.add('is-color-palette');
 ui.classList.add('is-color-palette-open');
 showPanel();
 // Reapply viewport-edge placement after showPanel changes the panel state.
 syncEditorChromeToCanvas();
}
function enterDrawingMode(){
 if(!editing||!document.body.classList.contains('is-paper-fullscreen'))return;drawingMode=true;selected=null;panel.classList.remove('is-open','is-color-palette');ui.classList.remove('is-color-palette-open');setMoreMenu(false);ui.classList.add('is-drawing-mode');document.body.classList.add('is-paper-drawing-mode');
 const next=ui.querySelector('[data-do="next"]');if(next){next.textContent='Done';next.disabled=false;}layer.style.overflowY='hidden';layer.style.touchAction='none';layer.style.pointerEvents='auto';layer.scrollTop=0;draw();updateDrawingControls();
 requestAnimationFrame(()=>{positionLayer();layer.style.overflowY='hidden';layer.style.touchAction='none';layer.style.pointerEvents='auto';});
}
function exitDrawingMode(){
 if(!drawingMode)return;finishInk();drawingMode=false;panel.classList.remove('is-open','is-color-palette');ui.classList.remove('is-color-palette-open','is-drawing-mode');document.body.classList.remove('is-paper-drawing-mode');layer.style.overflowY='hidden';layer.style.overscrollBehavior='none';layer.style.touchAction='none';layer.style.pointerEvents=(editing||photoEditorMode)?'auto':'none';
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
function syncEditorChromeToCanvas(){
 const topbar=ui.querySelector('.ls-editor-topbar');
 const dock=ui.querySelector('.ls-editor-dock');
 const drawingDock=ui.querySelector('.ls-drawing-dock');
 const slider=ui.querySelector('.ls-brush-size-control');

 // Toolbars belong to the screen edges, not the top/bottom of the centered 16:9
 // canvas. This keeps the canvas between the top controls and the bottom tools.
 if(topbar)Object.assign(topbar.style,{
  position:'fixed',top:'max(10px, env(safe-area-inset-top))',
  left:'max(12px, env(safe-area-inset-left))',
  right:'max(12px, env(safe-area-inset-right))',bottom:'auto',width:'auto'
 });
 if(dock)Object.assign(dock.style,{
  position:'fixed',left:'50%',right:'auto',
  bottom:'calc(10px + env(safe-area-inset-bottom))',
  width:'min(420px, calc(100vw - 22px))',
  transform:'translateX(-50%)'
 });
 if(drawingDock)Object.assign(drawingDock.style,{
  position:'fixed',left:'max(12px, env(safe-area-inset-left))',
  right:'max(12px, env(safe-area-inset-right))',
  bottom:'calc(4px + env(safe-area-inset-bottom))',
  height:'132px'
 });
 if(slider)Object.assign(slider.style,{
  position:'fixed',top:'auto',right:'max(12px, env(safe-area-inset-right))',
  bottom:'calc(142px + env(safe-area-inset-bottom))',
  height:'min(220px, 28dvh)'
 });

 if(panel.classList.contains('is-color-palette')){
  Object.assign(panel.style,{
   position:'fixed',left:'0',right:'0',top:'auto',
   bottom:'0px',width:'100%',maxWidth:'none',boxSizing:'border-box',margin:'0',
   maxHeight:'none',transform:'translateY(0)',transition:'none'
  });
 } else if(panel.classList.contains('is-open')){
  Object.assign(panel.style,{
   position:'fixed',left:'50%',right:'auto',top:'auto',
   bottom:'calc(94px + env(safe-area-inset-bottom))',
   width:'min(440px, calc(100vw - 24px))',
   maxHeight:'min(49dvh, 470px)',transform:'translate(-50%,0)'
  });
 }
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
 syncEditorChromeToCanvas();
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
function clampLayerModel(o){
 // Keep layer coordinates free to cross the paper bounds. Rendering is clipped by
 // the fixed canvas viewport, so negative and greater-than-one positions are valid.
 o.w=Math.max(.025,Number(o.w)||.1);
 o.h=Math.max(.025,Number(o.h)||.1);
 o.x=Number.isFinite(Number(o.x))?Number(o.x):0;
 o.y=Number.isFinite(Number(o.y))?Number(o.y):0;
}
function actionButton(op,label,title,o){
 const b=document.createElement('button');b.type='button';b.className='ls-object-action';b.dataset.op=op;b.textContent=label;b.title=title;b.setAttribute('aria-label',title);
 b.addEventListener('pointerdown',e=>e.stopPropagation());
 b.addEventListener('click',e=>{
  e.preventDefault();e.stopPropagation();
  if(op==='delete'){saveHistory();items=items.filter(x=>x.id!==o.id);selected=null;draw();}
  else if(op==='rotate'){saveHistory();o.rotation=(o.rotation+15)%360;clampLayerModel(o);draw();}
  else if(op==='crop'){openCropEditor(o);}
  else if(op==='fit'){saveHistory();o.fit=o.fit==='cover'?'contain':'cover';draw();}
  else if(op==='duplicate'){duplicateLayer(o.id);}
 });
 return b;
}
function startDrag(e,o,mode){
 if(!editing||(e.button!==0&&e.pointerType==='mouse'))return;
 e.preventDefault();e.stopPropagation();
 if(o.locked){selected=o.id;draw();return;}
 const r=layer.getBoundingClientRect();if(!r.width||!r.height)return;
 if(dragFrame!==null){cancelAnimationFrame(dragFrame);dragFrame=null;}
 pendingDragPoint=null;
 saveHistory();selected=o.id;
 const g=layoutGeometry.get(o.id)||o;
 const cx=r.left+(g.x+g.w/2)*r.width,cy=r.top+(g.y+g.h/2)*r.height;
 drag={id:o.id,mode,pointerId:e.pointerId,sx:e.clientX,sy:e.clientY,x:g.x,y:g.y,w:g.w,h:g.h,rw:r.width,rh:r.height,
  original:clone(o),centerX:cx,centerY:cy,startDistance:Math.max(1,Math.hypot(e.clientX-cx,e.clientY-cy)),
  startAngle:Math.atan2(e.clientY-cy,e.clientX-cx),startRotation:Number(o.rotation)||0};
 try{layer.setPointerCapture(e.pointerId);}catch(_){}
 draw();
}
function applyLayerDragFrame(){
 if(!drag||!pendingDragPoint)return;
 const d=drag,p=pendingDragPoint;pendingDragPoint=null;
 const o=items.find(x=>x.id===d.id);if(!o)return;
 const dx=p.x-d.sx,dy=p.y-d.sy;
 if(d.mode==='move'){
  o.x=d.x+dx/d.rw;o.y=d.y+dy/d.rh;
 }else if(d.mode==='rotate'){
  const angle=Math.atan2(p.y-d.centerY,p.x-d.centerX);
  o.rotation=((d.startRotation+(angle-d.startAngle)*180/Math.PI)%360+360)%360;
 }else if(d.mode==='resize'){
  // Proportional resizing around the layer centre, measured in screen pixels
  // so mouse, pen and touch input follow the same transform math.
  const distance=Math.hypot(p.x-d.centerX,p.y-d.centerY);
  const scale=clamp(distance/d.startDistance,.05,8);
  o.x=d.x+d.w/2-(d.w*scale)/2;
  o.y=d.y+d.h/2-(d.h*scale)/2;
  o.w=Math.max(.035,d.w*scale);o.h=Math.max(.025,d.h*scale);
  if(o.type==='text')o.size=clamp((Number(d.original.size)||30)*scale,8,160);
 }
 clampLayerModel(o);draw();
}
function scheduleLayerDrag(e){
 if(!drag||e.pointerId!==drag.pointerId)return;
 e.preventDefault();
 pendingDragPoint={x:e.clientX,y:e.clientY};
 if(dragFrame===null){
  dragFrame=requestAnimationFrame(()=>{
   dragFrame=null;
   applyLayerDragFrame();
  });
 }
}
document.addEventListener('pointermove',scheduleLayerDrag,{passive:false});
function finishLayerDrag(e){
 if(!drag||(e&&e.pointerId!==drag.pointerId))return;
 if(e&&Number.isFinite(e.clientX)&&Number.isFinite(e.clientY))pendingDragPoint={x:e.clientX,y:e.clientY};
 if(dragFrame!==null){cancelAnimationFrame(dragFrame);dragFrame=null;}
 if(pendingDragPoint)applyLayerDragFrame();
 const d=drag,o=items.find(x=>x.id===d.id);drag=null;pendingDragPoint=null;
 try{layer.releasePointerCapture(d.pointerId);}catch(_){}
 if(!o||(['x','y','w','h','rotation','size'].every(k=>Number(o[k]||0)===Number(d.original[k]||0)))){undoStack.pop();histButtons();}
}
document.addEventListener('pointerup',finishLayerDrag);
document.addEventListener('pointercancel',finishLayerDrag);
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
  // Items use normalized document coordinates against this one canvas. Keep the
  // actual stack order independent of selection; the selection overlay is separate.
  const layout=new Map();
  items.forEach(o=>{
   const g={x:Number(o.x)||0,y:Number(o.y)||0,w:Number(o.w)||.1,h:Number(o.h)||.1};
   g.w=Math.max(.025,g.w);
   if(o.type==='text')g.h=measureTextHeight(o,g.w*canvasWidth)/Math.max(1,canvasHeight);
   else if(o.type==='image'){
    const natural=safeNatural(o),aspect=o.crop?cropAspect(o.crop,natural):(Number(o.ratio)||natural.width/natural.height);
    g.h=(g.w*canvasWidth/Math.max(.001,aspect))/Math.max(1,canvasHeight);
   }else g.h=Math.max(.015,g.h);

   g.h=Math.max(.015,g.h);
   // Do not pull or shrink artwork back into the paper. The page's paint clip
   // hides all pixels outside the canvas while preserving the real layer geometry.
   layout.set(o.id,g);
  });
  return layout;
 }
 function renderSelectionOverlay(o,g){
  const frame=document.createElement('div');frame.className='ls-selection-frame';frame.dataset.selectionId=String(o.id);
  Object.assign(frame.style,{left:(g.x*canvasWidth)+'px',top:(g.y*canvasHeight)+'px',width:(g.w*canvasWidth)+'px',height:(g.h*canvasHeight)+'px',transform:'rotate('+o.rotation+'deg)',zIndex:'2147483000'});
  const bar=document.createElement('div');bar.className='ls-object-actions';
  bar.style.transform='rotate('+(-Number(o.rotation||0))+'deg)';
  bar.style.top=(g.y*canvasHeight>52?'-42px':'3px');
  bar.append(actionButton('rotate','↻','Rotate 15 degrees',o));
  if(o.type==='image'){
   bar.append(actionButton('crop','Crop','Crop image',o));
   bar.append(actionButton('fit',o.fit==='cover'?'Fit':'Fill',o.fit==='cover'?'Fit entire image':'Fill image frame',o));
  }
  bar.append(actionButton('duplicate','＋','Duplicate layer',o));
  bar.append(actionButton('delete','×','Delete layer',o));
  frame.append(bar);
  const rotate=document.createElement('button');rotate.type='button';rotate.className='ls-rotate-handle';rotate.setAttribute('aria-label','Rotate selected layer by dragging');rotate.title='Drag to rotate';
  rotate.addEventListener('pointerdown',e=>startDrag(e,o,'rotate'));rotate.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();});
  frame.append(rotate);
  [
   ['nw','top left'],['ne','top right'],['sw','bottom left'],['se','bottom right']
  ].forEach(([corner,label])=>{
   const grip=document.createElement('button');
   grip.type='button';
   grip.className='ls-resize-handle ls-resize-'+corner;
   grip.dataset.resizeCorner=corner;
   grip.setAttribute('aria-label','Resize selected layer from '+label);
   grip.title='Resize';
   grip.addEventListener('pointerdown',e=>startDrag(e,o,'resize'));
   grip.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();});
   frame.append(grip);
  });
  page.append(frame);
 }
 function draw(){
  layoutGeometry=photoCompositionLayout();
  page.replaceChildren();
  items.forEach((o,i)=>{
   if(o.visible===false)return;
   const g=layoutGeometry.get(o.id)||o;
   const el=document.createElement('div');el.className='ls-object ls-object-'+o.type+(o.id===selected&&editing?' is-selected':'')+(o.locked?' is-locked':'');el.dataset.id=String(o.id);
   Object.assign(el.style,{left:(g.x*canvasWidth)+'px',top:(g.y*canvasHeight)+'px',width:(g.w*canvasWidth)+'px',height:(g.h*canvasHeight)+'px',transform:'rotate('+o.rotation+'deg)',zIndex:String(i+1),opacity:String(clamp(Number(o.opacity==null?1:o.opacity),0,1)),overflow:o.type==='image'&&o.crop?'hidden':'visible'});
   if(o.type==='text'||o.type==='sticker'){
    const c=document.createElement('div');c.className='ls-object-copy'+(o.type==='sticker'?' ls-sticker-copy':'');c.textContent=o.value;
    Object.assign(c.style,{color:o.color,fontFamily:o.font,fontSize:(o.size*contentScale)+'px',fontWeight:o.bold?'700':'400',fontStyle:o.italic?'italic':'normal',textAlign:o.align,justifyContent:'center',margin:'0'});
    el.append(c);
   }else if(o.type==='image'){
    const img=document.createElement('img');img.className='ls-object-photo';img.src=o.src;img.alt='Image on page';img.draggable=false;
    if(o.crop&&o.natural){
     const geo=cropImageStyle(o.crop,o.natural);
     Object.assign(img.style,{position:'absolute',left:geo.left+'%',top:geo.top+'%',width:geo.width+'%',height:geo.height+'%',maxWidth:'none',maxHeight:'none',objectFit:'fill',transform:'rotate('+geo.rotate+'deg)',transformOrigin:'center center',display:'block'});
    }else Object.assign(img.style,{width:'100%',height:'100%',objectFit:o.fit||'contain',display:'block'});
    el.append(img);
   }else if(o.type==='shape'){
    const sh=document.createElement('div');sh.className='ls-shape ls-shape-'+o.shape;sh.style.setProperty('--ls-shape-color',o.color);const stroke=(o.shape==='circle'||o.shape==='corner')?3*contentScale:2*contentScale;sh.style.borderWidth=stroke+'px';if(o.shape==='frame'||o.shape==='corner')sh.style.borderRadius=(3*contentScale)+'px';el.append(sh);
   }
   el.addEventListener('pointerdown',e=>{
    if(!editing||e.target.closest('.ls-object-action')||e.target.closest('.ls-resize-handle')||e.target.closest('.ls-rotate-handle'))return;
    startDrag(e,o,'move');
   });
   page.append(el);
  });
  // One fixed-size page: drawing and objects share the exact same normalized canvas.
  const documentHeight=canvasHeight;
  page.style.height=documentHeight+'px';page.style.minHeight=documentHeight+'px';
  renderInkLayer(documentHeight);
  const selectedObject=chosen();
  if(editing&&!drawingMode&&selectedObject&&selectedObject.visible!==false){
   const g=layoutGeometry.get(selectedObject.id)||selectedObject;
   renderSelectionOverlay(selectedObject,g);
  }
  syncPaperSurfaceHeight();histButtons();
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
function openEditor(){if(!document.body.classList.contains('is-paper-fullscreen'))return;editing=true;photoEditorMode=true;document.body.classList.add('is-paper-editor-active');ui.classList.add('is-active');layer.style.overflowY='hidden';layer.style.overscrollBehavior='none';layer.style.touchAction='none';layer.scrollTop=0;edit.classList.remove('is-visible');positionLayer();draw();}
function done(){editing=false;panel.classList.remove('is-open');ui.classList.remove('is-active');document.body.classList.remove('is-paper-editor-active');setMoreMenu(false);edit.classList.add('is-visible');layer.style.pointerEvents=photoEditorMode?'auto':'none';draw();}
function setMoreMenu(open){const menu=ui.querySelector('.ls-more-menu'),button=ui.querySelector('.ls-more-button');if(menu)menu.classList.toggle('is-open',!!open);if(button)button.setAttribute('aria-expanded',open?'true':'false');}
function showPanel(){setMoreMenu(false);panel.classList.add('is-open');}
function hidePanel(){panel.classList.remove('is-open','is-color-palette');ui.classList.remove('is-color-palette-open');ui.querySelectorAll('[data-tool]').forEach(b=>b.classList.remove('is-active'));const add=ui.querySelector('[data-do="quick-add"]');if(add)add.classList.remove('is-active');}
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
   const insert=(ratio,naturalWidth,naturalHeight)=>{
    const o=make('image',{src,ratio:Number(ratio)||1.5,natural:{width:Math.max(1,naturalWidth||1500),height:Math.max(1,naturalHeight||1000)},x:.1,y:nextLayerY(),w:.8,h:.3});
    items.push(o);selected=o.id;draw();
   };
   probe.onload=()=>insert(probe.naturalWidth/Math.max(1,probe.naturalHeight),probe.naturalWidth,probe.naturalHeight);
   probe.onerror=()=>insert(1.5,1500,1000);
   probe.src=src;
  };
  reader.readAsDataURL(f);
 });
});
function libraryPanel(which){
 tab=which||tab;
 ui.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('is-active',b.dataset.tool==='library'));
 let html='<div class="ls-panel-header"><div><h3>Explore ideas</h3><p>Choose a detail to add to your letter</p></div><button class="ls-panel-close" data-do="close-panel" aria-label="Close panel">×</button></div><div class="ls-library-tabs" role="tablist" aria-label="Explore assets">';
 [['stickers','Stickers'],['elements','Elements'],['layouts','Layouts']].forEach(t=>{
  html+='<button type="button" role="tab" aria-selected="'+(tab===t[0]?'true':'false')+'" data-lib-tab="'+t[0]+'" class="'+(tab===t[0]?'is-active':'')+'">'+t[1]+'</button>';
 });
 html+='</div><div class="ls-library-grid ls-pin-grid" data-library-kind="'+tab+'">';
 const addCard=(key,symbol,label,look,kind)=> {
  html+='<button type="button" class="ls-library-tile ls-pin-card" data-lib-add="'+key+'" data-pin-look="'+look+'" aria-label="Add '+label+(kind==='elements'?' element':' sticker')+'"><span class="ls-pin-art" aria-hidden="true"><span class="ls-library-symbol">'+symbol+'</span></span><span class="ls-pin-title">'+label+'</span><span class="ls-pin-add" aria-hidden="true">+</span></button>';
 };
 if(tab==='stickers'){
  [
   ['heart','♥','Heart','blush'],['sparkle','✦','Sparkle','butter'],['flower','✿','Flower','rose'],
   ['star','★','Star','cream'],['outline-heart','♡','Outline heart','lilac'],
   ['smile','☺','Smiley','mint'],['moon','☾','Moon','night'],
   ['music','♫','Music','sage'],['infinity','∞','Infinity','peach'],['flower-two','❀','Blossom','sky']
  ].forEach(e=>addCard(e[0],e[1],e[2],e[3],'stickers'));
 } else if(tab==='elements'){
  [
   ['frame','▢','Frame','cream'],['circle','◯','Circle','lilac'],['line','―','Line','sage'],
   ['dot','●','Dot','blush'],['corner','⌜','Corner','sky'],['ribbon','〰','Wave','rose'],
   ['diamond','◇','Diamond','butter'],['leaf','❧','Leaf','mint']
  ].forEach(e=>addCard(e[0],e[1],e[2],e[3],'elements'));
 } else {
  [
   ['love-note','Love note','A warm message with a signature','layout-love'],
   ['photo-caption','Photo & caption','A frame with an editorial caption','layout-photo'],
   ['minimal','Minimal note','A heading with quiet supporting text','layout-minimal']
  ].forEach(e=>{
   html+='<button type="button" class="ls-layout-tile ls-pin-layout" data-lib-add="'+e[0]+'" aria-label="Add '+e[1]+' layout"><span class="ls-layout-miniature '+e[0]+' '+e[3]+'" aria-hidden="true"><i></i><i></i><i></i></span><span class="ls-pin-layout-copy"><strong>'+e[1]+'</strong><span>'+e[2]+'</span></span><span class="ls-pin-add" aria-hidden="true">+</span></button>';
  });
 }
 panel.innerHTML=html+'</div>';
 showPanel();
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
ui.addEventListener('pointerdown',e=>{
 const control=e.target.closest('[data-layer-range]');
 if(control){control.dataset.initialValue=control.value;control.dataset.historyStarted='0';}
});
ui.addEventListener('input',e=>{
 const control=e.target.closest('[data-layer-range]');if(!control)return;
 const o=items.find(item=>String(item.id)===control.dataset.layerId);if(!o)return;
 if(control.dataset.historyStarted!=='1'){saveHistory();control.dataset.historyStarted='1';}
 if(control.dataset.layerRange==='opacity')o.opacity=clamp(Number(control.value)/100,.1,1);
 else if(control.dataset.layerRange==='rotation')o.rotation=clamp(Number(control.value),-180,180);
 clampLayerModel(o);
 const value=ui.querySelector('[data-layer-value="'+control.dataset.layerRange+'"]');
 if(value)value.textContent=control.dataset.layerRange==='opacity'?Math.round(o.opacity*100)+'%':Math.round(o.rotation)+'°';
 draw();
});
ui.addEventListener('change',e=>{
 const control=e.target.closest('[data-layer-range]');if(!control)return;
 if(control.dataset.historyStarted==='1'&&control.value===control.dataset.initialValue){undoStack.pop();histButtons();}
 control.dataset.historyStarted='0';control.dataset.initialValue=control.value;
});
document.addEventListener('pointerup',()=>{
 ui.querySelectorAll('[data-layer-range][data-history-started="1"]').forEach(control=>{control.dataset.historyStarted='0';control.dataset.initialValue=control.value;});
});
ui.addEventListener('click',e=>{
 const cropAction=e.target.closest('[data-crop-action]');
 if(cropAction){
  const v=cropAction.dataset.cropAction;
  if(v==='cancel')closeCropEditor();else if(v==='apply')commitCrop();else if(v==='reset')resetCrop();else if(v==='rotate-left')rotateCrop(-1);else if(v==='rotate-right')rotateCrop(1);else if(v==='undo')undoCrop();else if(v==='redo')redoCrop();
  return;
 }
 const cropRatio=e.target.closest('[data-crop-ratio]');if(cropRatio){applyCropPreset(cropRatio.dataset.cropRatio);return;}
 const layerAction=e.target.closest('[data-layer-action]');
 if(layerAction){
  const id=Number(layerAction.dataset.layerId),op=layerAction.dataset.layerAction,o=items.find(item=>item.id===id);
  if(!o)return;
  if(op==='select'){selected=id;draw();layersPanel();}
  else if(op==='visible'){saveHistory();o.visible=o.visible===false;if(o.visible===false&&selected===id)selected=null;draw();layersPanel();}
  else if(op==='lock'){saveHistory();o.locked=!o.locked;draw();layersPanel();}
  else if(op==='up'){reorderLayer(id,1);layersPanel();}
  else if(op==='down'){reorderLayer(id,-1);layersPanel();}
  else if(op==='duplicate'){duplicateLayer(id);layersPanel();}
  else if(op==='delete'){saveHistory();items=items.filter(item=>item.id!==id);if(selected===id)selected=null;draw();layersPanel();}
  return;
 }
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
  else if(v==='layers')layersPanel();
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
window.addEventListener('resize',()=>{requestAnimationFrame(positionLayer);if(cropEdit)requestAnimationFrame(layoutCropEditor);});window.addEventListener('orientationchange',()=>setTimeout(()=>{positionLayer();if(cropEdit)layoutCropEditor();},120));
window.addEventListener('scroll',()=>requestAnimationFrame(positionLayer),{passive:true});
 if(window.visualViewport){window.visualViewport.addEventListener('resize',()=>requestAnimationFrame(positionLayer));window.visualViewport.addEventListener('scroll',()=>requestAnimationFrame(positionLayer));}
draw();histButtons();
})();