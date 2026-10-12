// Extração estática: não executa o código analisado.
const {parse}=require('@babel/parser'),traverse=require('@babel/traverse').default;
const key=n=>n?.name??n?.value;
function chain(n){if(!n)return '';if(n.type==='Identifier'||n.type==='JSXIdentifier')return n.name;if(['MemberExpression','OptionalMemberExpression','JSXMemberExpression'].includes(n.type)){if(n.computed&&!['StringLiteral','NumericLiteral'].includes(n.property.type))return '';const k=n.computed?key(n.property):n.property.name,base=chain(n.object);return k==null||!base?'':base+'.'+k}return ''}
function analyzeJS(file,text){
 const ast=parse(text,{sourceType:'unambiguous',plugins:['jsx',...(/\.tsx?$/.test(file)?['typescript']:[])],allowReturnOutsideFunction:true}),symbols=[],calls=[],imports=[],exports={},globalExports=[],byNode=new WeakMap(),factoryAliases=new Map();
 const fnId=n=>'symbol:'+file+':'+n.start;
 const methodNames=new Map();
 function nameOf(p){const n=p.node;if(n.id?.name)return n.id.name;const a=p.parentPath;if(a?.isVariableDeclarator())return chain(a.node.id)||'destructuring@'+n.loc.start.line;
  if(p.isObjectMethod()||p.isClassMethod()){const owner=p.findParent(q=>q.isVariableDeclarator()||q.isClassDeclaration());return (owner?.node.id?.name?owner.node.id.name+'.':'')+key(n.key)}
  if(a?.isObjectProperty()){const owner=a.findParent(q=>q.isVariableDeclarator());return (owner?.node.id?.name?owner.node.id.name+'.':'')+key(a.node.key)}
  if(a?.isAssignmentExpression())return chain(a.node.left)||'assignment@'+n.loc.start.line;return 'callback@'+n.loc.start.line+':'+n.loc.start.column;
 }
 traverse(ast,{Function(p){const s={id:fnId(p.node),name:nameOf(p),kind:p.node.type,start:p.node.loc.start.line,end:p.node.loc.end.line,column:p.node.loc.start.column};symbols.push(s);byNode.set(p.node,s.id);const normalized=s.name.replace('.prototype.','.');if(!methodNames.has(normalized))methodNames.set(normalized,[]);methodNames.get(normalized).push(s.id)},ClassDeclaration(p){const s={id:fnId(p.node),name:p.node.id.name,kind:'ClassDeclaration',start:p.node.loc.start.line,end:p.node.loc.end.line,column:p.node.loc.start.column};symbols.push(s);byNode.set(p.node,s.id)}});
 // Aliases passados à factory UMD são extraídos da chamada real factory(root.CNC,...).
 function isGlobalRoot(p,name){const binding=p.scope.getBinding(name);if(!binding)return ['globalThis','window','self'].includes(name);if(binding.kind!=='param')return false;const wrapper=binding.path.findParent(q=>q.isFunction()),invocation=wrapper?.parentPath;if(!invocation?.isCallExpression()||invocation.node.callee!==wrapper.node)return false;const i=wrapper.node.params.findIndex(n=>n.name===name);const globalValue=n=>n?.type==='ThisExpression'||n?.type==='Identifier'&&['globalThis','window','self'].includes(n.name)||n?.type==='ConditionalExpression'&&globalValue(n.consequent)&&globalValue(n.alternate);return globalValue(invocation.node.arguments[i])}
 traverse(ast,{CallExpression(p){if(p.node.callee.type!=='Identifier'||p.node.callee.name!=='factory')return;const wrapper=p.findParent(q=>q.isFunction());const invocation=wrapper?.parentPath;if(!invocation?.isCallExpression())return;const factoryIndex=wrapper.node.params.findIndex(n=>n.name==='factory'),factory=invocation.node.arguments[factoryIndex];if(!factory||!['FunctionExpression','ArrowFunctionExpression'].includes(factory.type))return;factory.params.forEach((param,i)=>{const c=chain(p.node.arguments[i]);if(param.name&&/^root\.[A-Za-z_$]+$/.test(c)&&isGlobalRoot(p,'root'))factoryAliases.set(factory.start+':'+param.name,c.slice(5))})}});
 function ref(p,n,seen=new Set(),depth=0){if(!n||depth>12)return {kind:'unknown'};if(byNode.has(n))return {kind:'symbol',id:byNode.get(n)};
  if(n.type==='Identifier'){
   const binding=p.scope.getBinding(n.name);if(!binding)return {kind:'unknown',name:n.name};if(seen.has(binding))return {kind:'unknown',name:n.name};seen=new Set(seen);seen.add(binding);const b=binding.path;
   if(b.isImportSpecifier())return {kind:'module',source:b.parent.source.value,member:[key(b.node.imported)],classification:'EXTRACTED'};
   if(b.isImportDefaultSpecifier())return {kind:'module',source:b.parent.source.value,member:['default'],classification:'EXTRACTED'};
   if(b.isImportNamespaceSpecifier())return {kind:'module',source:b.parent.source.value,member:[],classification:'EXTRACTED'};
   if(b.isFunctionDeclaration()||b.isClassDeclaration())return {kind:'symbol',id:byNode.get(b.node),classification:binding.constant?'EXTRACTED':'INFERRED'};
   if(b.isVariableDeclarator()){
    let r=ref(b,b.node.init,seen,depth+1);if(b.node.id.type==='ObjectPattern'){const prop=b.node.id.properties.find(x=>(x.value?.name||x.value?.left?.name)===n.name);if(prop)r=append(r,key(prop.key))}
    if(!binding.constant)r={...r,classification:'INFERRED'};return r;
   }
   if(binding.kind==='param'){const owner=b.findParent(q=>q.isFunction());const ns=factoryAliases.get(owner?.node.start+':'+n.name);if(ns)return {kind:'global',namespace:ns,member:[],classification:'EXTRACTED'}}
   return {kind:'unknown',name:n.name};
  }
  if(n.type==='ObjectExpression'){const members={};for(const prop of n.properties){if(prop.type==='ObjectMethod')members[key(prop.key)]={kind:'symbol',id:byNode.get(prop)};else if(prop.type==='ObjectProperty'&&!prop.computed)members[key(prop.key)]=ref(p,prop.value,new Set(seen),depth+1)}return {kind:'object',members}}
  if(['MemberExpression','OptionalMemberExpression'].includes(n.type)){
   const c=chain(n);if(n.computed&&!['StringLiteral','NumericLiteral'].includes(n.property.type))return {kind:'unknown',name:c};const globalName=c.split('.')[0];if(/^(globalThis|window|self|root)\./.test(c)&&isGlobalRoot(p,globalName)){const [,ns,...member]=c.split('.');return {kind:'global',namespace:ns,member,classification:'INFERRED'}}
   const k=n.computed?key(n.property):n.property.name;if(k==null)return {kind:'unknown',name:c};return append(ref(p,n.object,seen,depth+1),String(k));
  }
  if(n.type==='CallExpression'&&n.callee.type==='Identifier'&&n.callee.name==='require'&&n.arguments[0]?.type==='StringLiteral')return {kind:'module',source:n.arguments[0].value,member:[],classification:'EXTRACTED'};
  if(n.type==='NewExpression'){const r=ref(p,n.callee,seen,depth+1);return {...r,instance:true}}
  return {kind:'unknown',name:chain(n)};
 }
 function append(r,k){if(r.kind==='object')return r.members[k]||{kind:'unknown',name:k};if(r.kind==='module'||r.kind==='global')return {...r,member:[...r.member,k]};if(r.kind==='symbol'){const s=symbols.find(s=>s.id===r.id),ids=methodNames.get((s?.name||'')+'.'+k);if(ids?.length===1)return {kind:'symbol',id:ids[0],classification:r.classification||'EXTRACTED'};return {kind:'method',base:r.id,member:k,classification:r.classification||'INFERRED'}}return {kind:'unknown',name:(r.name?r.name+'.':'')+k}}
 function flatten(r,prefix='',out=exports){if(r.kind==='object'){for(const [k,v]of Object.entries(r.members))flatten(v,prefix?prefix+'.'+k:k,out)}else if(r.kind!=='unknown')out[prefix]=r}
 function owner(p){const a=p.findParent(q=>q.isFunction()||q.isClassDeclaration());return byNode.get(a?.node)||'file:'+file}
 function record(p,relation='CALLS'){const n=p.node;calls.push({source:owner(p),relation,line:n.loc.start.line,column:n.loc.start.column,expression:chain(n.callee||n.name)||text.slice(n.start,Math.min(n.end,n.start+90)),ref:ref(p,n.callee||n.name)})}
 traverse(ast,{
  Function(p){const s=symbols.find(s=>s.id===byNode.get(p.node));s.parent=owner(p)},
  ImportDeclaration(p){imports.push({source:p.node.source.value,line:p.node.loc.start.line})},
  CallExpression(p){if(p.node.callee.type==='Identifier'&&p.node.callee.name==='require'&&p.node.arguments[0]?.type==='StringLiteral')imports.push({source:p.node.arguments[0].value,line:p.node.loc.start.line});record(p)},OptionalCallExpression(p){record(p)},NewExpression(p){record(p)},
  ExportNamedDeclaration(p){if(p.node.source)imports.push({source:p.node.source.value,line:p.node.loc.start.line});const d=p.node.declaration;if(d?.type==='FunctionDeclaration'||d?.type==='ClassDeclaration')exports[d.id.name]={kind:'symbol',id:byNode.get(d)};else if(d?.type==='VariableDeclaration')for(const v of d.declarations)if(v.id.name)exports[v.id.name]=ref(p,v.init);
   for(const s of p.node.specifiers||[])exports[key(s.exported)]=p.node.source?{kind:'module',source:p.node.source.value,member:[key(s.local)],classification:'EXTRACTED'}:ref(p,s.local);
  },
  ExportDefaultDeclaration(p){exports.default=ref(p,p.node.declaration)},
  AssignmentExpression(p){const lhs=chain(p.node.left);if(/^root\.[\w$]+$/.test(lhs)&&isGlobalRoot(p,'root')&&p.node.right.type==='CallExpression'&&p.node.right.callee.name==='factory')globalExports.push(lhs.slice(5));
   if(lhs==='module.exports')flatten(ref(p,p.node.right));else if(lhs.startsWith('module.exports.'))exports[lhs.slice(15)]=ref(p,p.node.right);
   if(/^root\.[\w$]+$/.test(lhs)&&isGlobalRoot(p,'root')&&p.node.right.type==='ObjectExpression'){globalExports.push(lhs.slice(5));flatten(ref(p,p.node.right))}
  },
  ReturnStatement(p){const fn=p.getFunctionParent();if(!fn||!fn.parentPath?.isCallExpression())return;const call=fn.parentPath,wrapper=call.node.callee;if(!['FunctionExpression','ArrowFunctionExpression'].includes(wrapper.type))return;const index=wrapper.params.findIndex(n=>n.name==='factory');if(index<0||call.node.arguments[index]!==fn.node)return;flatten(ref(p,p.node.argument))},
  JSXOpeningElement(p){const c=chain(p.node.name);if(c&&/^[A-Z]/.test(c)){const convert=n=>n.type==='JSXIdentifier'?{type:'Identifier',name:n.name}:{type:'MemberExpression',object:convert(n.object),property:convert(n.property),computed:false};calls.push({source:owner(p),relation:'RENDERS',line:p.node.loc.start.line,column:p.node.loc.start.column,expression:c,ref:ref(p,convert(p.node.name))})}}
 });
 // Ajunta métodos de protótipo à API do construtor exportado.
 for(const [exported,r]of Object.entries({...exports})){if(r.kind!=='symbol')continue;const s=symbols.find(s=>s.id===r.id);for(const [method,ids]of methodNames)if(method.startsWith(s.name+'.')&&ids.length===1)exports[exported+method.slice(s.name.length)]={kind:'symbol',id:ids[0]}}
 return {symbols,calls,imports,exports,globalExports:[...new Set(globalExports)]};
}
module.exports={analyzeJS,chain};
