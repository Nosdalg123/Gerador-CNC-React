export const initialPdfState={revision:0,completedRevision:null,busy:false,selectedView:null,rows:[],length:'',axis:'',face:'',confirmed:false,unsupported:[],dims:[],vectorSvg:'',error:''};
export function pdfReducer(state,action) {
  if(action.type==='RESET')return {...initialPdfState,revision:state.revision+1};
  if(action.type==='VIEW')return {...state,selectedView:action.view,revision:state.revision+1,completedRevision:null,busy:true,confirmed:false,rows:[],length:'',dims:[],vectorSvg:'',unsupported:[],error:''};
  if(action.type==='COMPLETE'){if(action.revision!==state.revision)return state;return {...state,...action.values,busy:false,completedRevision:state.revision,confirmed:false};}
  if(action.type==='CONFIRM')return {...state,confirmed:action.value&&!state.busy&&state.completedRevision===state.revision};
  if(action.type==='EDIT'){const revision=state.revision+1;return {...state,...action.values,revision,completedRevision:state.busy?null:revision,confirmed:false};}
  return state;
}
export function canSavePdf(state,valid,name,hasFile) {return !!(valid&&name?.trim()&&hasFile&&state.selectedView&&!state.busy&&state.completedRevision===state.revision&&state.confirmed&&state.axis&&state.face&&!state.unsupported.length);}
export function joinDimensionTokens(items) {
  const result=[];
  for(let i=0;i<items.length;i++){let current={...items[i]},s=String(current.str||'').trim(),next=items[i+1];
    const near=next&&Math.hypot((current.transform?.[4]||0)-(next.transform?.[4]||0),(current.transform?.[5]||0)-(next.transform?.[5]||0))<45;
    if(near&&/^[RrØ⌀ΦφM]$/.test(s)&&/^\d+(?:[.,]\d+)?$/.test(String(next.str).trim())){current.str=s+next.str;i++;}
    result.push(current);
  }return result;
}
