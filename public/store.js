const products = [
  {id:1,name:'Camiseta Move',category:'Casual',price:89,tag:'MAIS VENDIDA',color:'#d9d1c2',image:'/images/products/tee.webp',desc:'Algodão macio · Areia',sizes:['P','M','G','GG']},
  {id:2,name:'Regata Flow',category:'Treino',price:79,tag:'LEVE NO CORPO',color:'#a7aaa0',image:'/images/products/tank.webp',desc:'Dry fit · Verde sálvia',sizes:['P','M','G','GG']},
  {id:3,name:'Short Pace',category:'Treino',price:119,tag:'PRONTO PRO TREINO',color:'#343a38',image:'/images/products/shorts.webp',desc:'Leve e flexível · Grafite',sizes:['P','M','G','GG']},
  {id:4,name:'Moletom Relax',category:'Casual',price:199,tag:'',color:'#c9a987',image:'/images/products/tee.webp',desc:'Algodão confortável · Caramelo',sizes:['P','M','G','GG']},
  {id:5,name:'Top Flow',category:'Treino',price:99,tag:'SUSTENTAÇÃO MÉDIA',color:'#c4775a',image:'/images/products/top.webp',desc:'Tecido elástico · Terracota',sizes:['P','M','G']},
  {id:6,name:'Calça Move',category:'Casual',price:189,tag:'',color:'#55534d',image:'/images/products/shorts.webp',desc:'Moletinho leve · Preto',sizes:['P','M','G','GG']},
  {id:7,name:'Camiseta Pace',category:'Treino',price:99,tag:'DRY FIT',color:'#77796f',image:'/images/products/tank.webp',desc:'Secagem rápida · Oliva',sizes:['P','M','G','GG']},
  {id:8,name:'Short Everyday',category:'Casual',price:129,tag:'',color:'#b5a68d',image:'/images/products/shorts.webp',desc:'Conforto todo dia · Natural',sizes:['P','M','G','GG']}
];
const money = n => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);
const cart=[]; let filter='Tudo', selectedProduct=null, selectedSize='', storeWhatsapp='';
const filters=['Tudo','Casual','Treino'];
const filterNode=document.querySelector('#filters'), productsNode=document.querySelector('#products');
const sizeDialog=document.querySelector('#size-dialog'), sizeOptions=document.querySelector('#size-options');
function drawFilters(){filterNode.innerHTML=filters.map(f=>`<button class="filter ${f===filter?'active':''}" data-filter="${f}" aria-pressed="${f===filter}">${f==='Tudo'?'Tudo':f}</button>`).join('')}
function drawProducts(){const shown=products.filter(p=>filter==='Tudo'||p.category===filter);productsNode.innerHTML=shown.map(p=>`<article class="product-card"><button class="product-image" type="button" data-add="${p.id}" aria-label="Escolher tamanho de ${p.name}"><img class="product-photo" src="${p.image}" alt="${p.name}" loading="lazy" decoding="async">${p.tag?`<span class="product-tag">${p.tag}</span>`:''}<span class="quick-add">ESCOLHER TAMANHO <b>+</b></span></button><div class="product-info"><div class="product-title-row"><h3>${p.name}</h3><b>${money(p.price)}</b></div><p>${p.desc}</p><span class="product-category">${p.category==='Treino'?'MOVE TRAINING':'MOVE EVERYDAY'}</span></div></article>`).join('')}
function drawCart(){document.querySelector('#bag-count').textContent=cart.reduce((s,i)=>s+i.qty,0);document.querySelector('#bag-items').innerHTML=cart.map((i,n)=>`<div class="bag-item"><div>${i.product.name}<small>Tamanho ${i.size} · ${i.qty} un.</small></div><b>${money(i.product.price*i.qty)}</b><button data-remove="${n}" aria-label="Remover ${i.product.name}">×</button></div>`).join('')||'<p class="empty-bag">Sua próxima peça favorita começa aqui.</p>';document.querySelector('#subtotal').textContent=money(cart.reduce((s,i)=>s+i.product.price*i.qty,0));document.querySelector('#checkout').disabled=!cart.length}
function openSizePicker(product){selectedProduct=product;selectedSize='';document.querySelector('#size-title').textContent=product.name;document.querySelector('#size-product-description').textContent=`${product.desc} · ${money(product.price)}`;sizeOptions.innerHTML=product.sizes.map(size=>`<button class="size-option" type="button" data-size="${size}" aria-pressed="false">${size}</button>`).join('');document.querySelector('#size-confirm').disabled=true;sizeDialog.showModal()}
function addSelectedToCart(){if(!selectedProduct||!selectedSize)return;const existing=cart.find(i=>i.product.id===selectedProduct.id&&i.size===selectedSize);existing?existing.qty++:cart.push({product:selectedProduct,size:selectedSize,qty:1});drawCart();sizeDialog.close();document.body.classList.add('bag-open')}
filterNode.addEventListener('click',e=>{const next=e.target.closest('[data-filter]');if(!next)return;filter=next.dataset.filter;drawFilters();drawProducts()});
productsNode.addEventListener('click',e=>{const button=e.target.closest('[data-add]');if(button)openSizePicker(products.find(p=>p.id===Number(button.dataset.add)))});
sizeOptions.addEventListener('click',e=>{const button=e.target.closest('[data-size]');if(!button)return;selectedSize=button.dataset.size;sizeOptions.querySelectorAll('.size-option').forEach(item=>{item.classList.toggle('selected',item===button);item.setAttribute('aria-pressed',String(item===button))});document.querySelector('#size-confirm').disabled=false});
document.querySelector('#size-confirm').addEventListener('click',addSelectedToCart);document.querySelector('#size-cancel').addEventListener('click',()=>sizeDialog.close());
document.querySelector('#bag-open').onclick=()=>document.body.classList.add('bag-open');document.querySelector('#bag-close').onclick=()=>document.body.classList.remove('bag-open');document.querySelector('#overlay').onclick=()=>document.body.classList.remove('bag-open');
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.body.classList.remove('bag-open')});
document.querySelector('#bag-items').addEventListener('click',e=>{const button=e.target.closest('[data-remove]');if(button){cart.splice(Number(button.dataset.remove),1);drawCart()}});
document.querySelector('#checkout').onclick=()=>{const lines=cart.map(i=>`${i.qty}x ${i.product.name} — tamanho ${i.size}: ${money(i.qty*i.product.price)}`).join('\n');const total=cart.reduce((s,i)=>s+i.product.price*i.qty,0);window.open(`https://wa.me/${storeWhatsapp}?text=${encodeURIComponent(`Oi! Quero fazer este pedido:\n${lines}\nTotal: ${money(total)}`)}`,'_blank','noopener')};
document.querySelectorAll('[data-filter-link]').forEach(a=>a.addEventListener('click',()=>{filter=a.dataset.filterLink;drawFilters();drawProducts()}));document.querySelector('#year').textContent=new Date().getFullYear();drawFilters();drawProducts();drawCart();

async function loadStoreAppearance(){
  try{
    const response=await fetch('/api/menu',{cache:'no-store'});
    if(!response.ok)return;
    const {restaurant}=await response.json();
    if(!restaurant)return;
    if(restaurant.name){document.querySelectorAll('.logo').forEach(logo=>{if(logo.firstChild)logo.firstChild.nodeValue=restaurant.name})}
    if(restaurant.whatsapp)storeWhatsapp=restaurant.whatsapp.replace(/\D/g,'');
    if(restaurant.name)document.title=`${restaurant.name} — movimento é seu`;
    if(restaurant.announcement)document.querySelector('#announcement').textContent=restaurant.announcement;
    if(restaurant.heroTitle)document.querySelector('#hero-title').textContent=restaurant.heroTitle;
    if(restaurant.heroDescription)document.querySelector('#hero-description').textContent=restaurant.heroDescription;
    if(restaurant.heroImageUrl)document.querySelector('.hero-photo').src=restaurant.heroImageUrl;
    if(restaurant.faviconUrl){
      const favicon=`${restaurant.faviconUrl}${restaurant.faviconUrl.includes('?')?'&':'?'}v=${encodeURIComponent(restaurant.faviconUrl)}`;
      document.querySelectorAll('link[rel="icon"],link[rel="apple-touch-icon"]').forEach(link=>{link.href=favicon});
    }
  }catch{}
}
loadStoreAppearance();
