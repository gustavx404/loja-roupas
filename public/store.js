const products = [
  {id:1,name:'Camiseta Essencial',category:'Camisetas',price:89,tag:'MAIS VENDIDO',color:'#d9d1c2',desc:'Algodão encorpado · Off-white',sizes:['P','M','G','GG']},
  {id:2,name:'Camiseta Horizonte',category:'Camisetas',price:99,tag:'NOVA COR',color:'#a7aaa0',desc:'Algodão orgânico · Verde sálvia',sizes:['P','M','G','GG']},
  {id:3,name:'Camisa Linho Leve',category:'Camisas',price:189,tag:'LINHO',color:'#c9a987',desc:'Linho misto · Areia',sizes:['P','M','G','GG']},
  {id:4,name:'Calça Reta',category:'Calças',price:219,tag:'',color:'#55534d',desc:'Sarja macia · Grafite',sizes:['36','38','40','42','44']},
  {id:5,name:'Camiseta Brisa',category:'Camisetas',price:89,tag:'',color:'#c4775a',desc:'Algodão encorpado · Terracota',sizes:['P','M','G','GG']},
  {id:6,name:'Short Linho',category:'Calças',price:159,tag:'FEITO NO BRASIL',color:'#b5a68d',desc:'Linho misto · Natural',sizes:['36','38','40','42']},
  {id:7,name:'Camisa Sobreposição',category:'Camisas',price:199,tag:'',color:'#77796f',desc:'Algodão leve · Oliva',sizes:['P','M','G','GG']},
  {id:8,name:'Camiseta Noturna',category:'Camisetas',price:89,tag:'',color:'#303332',desc:'Algodão encorpado · Preto',sizes:['P','M','G','GG']}
];
const money = n => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);
const cart=[]; let filter='Tudo';
const filters=['Tudo','Camisetas','Camisas','Calças'];
const filterNode=document.querySelector('#filters'), productsNode=document.querySelector('#products');
function drawFilters(){filterNode.innerHTML=filters.map(f=>`<button class="filter ${f===filter?'active':''}" data-filter="${f}">${f}</button>`).join('')}
function drawProducts(){const shown=products.filter(p=>filter==='Tudo'||p.category===filter);productsNode.innerHTML=shown.map(p=>`<article class="product-card"><div class="product-image" style="--tone:${p.color}"><span class="cloth"></span><span class="detail"></span>${p.tag?`<span class="product-tag">${p.tag}</span>`:''}<button class="quick-add" data-add="${p.id}">ESCOLHER TAMANHO +</button></div><div class="product-info"><h3>${p.name}</h3><p>${p.desc}</p><p style="color:#20211e;margin-top:8px">${money(p.price)}</p></div></article>`).join('')}
function drawCart(){document.querySelector('#bag-count').textContent=cart.reduce((s,i)=>s+i.qty,0);document.querySelector('#bag-items').innerHTML=cart.map((i,n)=>`<div class="bag-item"><div>${i.product.name}<small>Tamanho ${i.size} · ${i.qty} un.</small></div><b>${money(i.product.price*i.qty)}</b><button data-remove="${n}" aria-label="Remover">×</button></div>`).join('')||'<p style="font-size:12px;color:#77776f;padding:20px 0">Sua sacola está esperando por você.</p>';document.querySelector('#subtotal').textContent=money(cart.reduce((s,i)=>s+i.product.price*i.qty,0));document.querySelector('#checkout').disabled=!cart.length}
filterNode.addEventListener('click',e=>{if(e.target.dataset.filter){filter=e.target.dataset.filter;drawFilters();drawProducts()}});
productsNode.addEventListener('click',e=>{const id=Number(e.target.dataset.add);if(!id)return;const p=products.find(x=>x.id===id);const size=prompt(`Escolha o tamanho de ${p.name}: ${p.sizes.join(', ')}`);if(!size)return;if(!p.sizes.includes(size.toUpperCase())){alert(`Tamanho inválido. Escolha: ${p.sizes.join(', ')}`);return}const key=cart.find(i=>i.product.id===id&&i.size===size.toUpperCase());key?key.qty++:cart.push({product:p,size:size.toUpperCase(),qty:1});drawCart();document.body.classList.add('bag-open')});
document.querySelector('#bag-open').onclick=()=>document.body.classList.add('bag-open');document.querySelector('#bag-close').onclick=()=>document.body.classList.remove('bag-open');document.querySelector('#overlay').onclick=()=>document.body.classList.remove('bag-open');
document.querySelector('#bag-items').addEventListener('click',e=>{if(e.target.dataset.remove!==undefined){cart.splice(Number(e.target.dataset.remove),1);drawCart()}});
document.querySelector('#checkout').onclick=()=>{const lines=cart.map(i=>`${i.qty}x ${i.product.name} — tamanho ${i.size}: ${money(i.qty*i.product.price)}`).join('\n');const total=cart.reduce((s,i)=>s+i.product.price*i.qty,0);window.open(`https://wa.me/?text=${encodeURIComponent(`Oi! Quero fazer este pedido:\n${lines}\nTotal: ${money(total)}`)}`,'_blank','noopener')};
document.querySelectorAll('[data-filter-link]').forEach(a=>a.addEventListener('click',()=>{filter=a.dataset.filterLink;drawFilters();drawProducts()}));document.querySelector('#year').textContent=new Date().getFullYear();drawFilters();drawProducts();drawCart();
