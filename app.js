const seed = [
  {name:"iPhone 13",price:5200,category:"Phones",location:"Lusaka",phone:"+260970000001",description:"Clean phone in good condition.",icon:"📱"},
  {name:"HP Laptop",price:6800,category:"Electronics",location:"Lusaka",phone:"+260970000002",description:"Reliable laptop for school or work.",icon:"💻"},
  {name:"Sofa Set",price:3500,category:"Home",location:"Lusaka",phone:"+260970000003",description:"Comfortable 5-seater sofa set.",icon:"🛋️"},
  {name:"Men's Sneakers",price:650,category:"Fashion",location:"Lusaka",phone:"+260970000004",description:"Brand new sneakers.",icon:"👟"},
  {name:"Toyota Corolla",price:95000,category:"Vehicles",location:"Lusaka",phone:"+260970000005",description:"Well maintained vehicle.",icon:"🚗"},
  {name:"Bluetooth Speaker",price:450,category:"Electronics",location:"Lusaka",phone:"+260970000006",description:"Portable wireless speaker.",icon:"🔊"}
];
let listings = JSON.parse(localStorage.getItem("markethubListings") || "null") || seed;
let activeCat="All";

const listingsEl=document.getElementById("listings"), search=document.getElementById("searchInput"), count=document.getElementById("count");
function render(){
  const q=search.value.toLowerCase();
  const filtered=listings.filter(x=>(activeCat==="All"||x.category===activeCat)&&
    (`${x.name} ${x.category} ${x.location} ${x.description}`.toLowerCase().includes(q)));
  count.textContent=`${filtered.length} item${filtered.length===1?"":"s"}`;
  listingsEl.innerHTML=filtered.length?filtered.map(x=>`
    <article class="card">
      <div class="photo">${x.icon||"🛍️"}</div>
      <div class="card-body">
        <h3>${escapeHtml(x.name)}</h3>
        <div class="price">K ${Number(x.price).toLocaleString()}</div>
        <div class="meta">${escapeHtml(x.category)} · ${escapeHtml(x.location)}</div>
        <div class="meta">${escapeHtml(x.description||"")}</div>
        <a class="contact" href="tel:${escapeHtml(x.phone)}">📞 Contact seller</a>
      </div>
    </article>`).join(""):`<div class="empty"><h3>No listings found</h3><p>Try another search or category.</p></div>`;
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
function openModal(){document.getElementById("modal").classList.remove("hidden")}
function closeModal(){document.getElementById("modal").classList.add("hidden")}
document.getElementById("sellTopBtn").onclick=openModal;
document.getElementById("floatingSell").onclick=openModal;
document.getElementById("closeModal").onclick=closeModal;
document.getElementById("modal").addEventListener("click",e=>{if(e.target.id==="modal")closeModal()});
search.addEventListener("input",render);
document.querySelectorAll(".cat").forEach(btn=>btn.onclick=()=>{
  document.querySelectorAll(".cat").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active"); activeCat=btn.dataset.cat; render();
});
document.getElementById("listingForm").onsubmit=e=>{
  e.preventDefault();
  const category=document.getElementById("itemCategory").value;
  listings.unshift({
    name:document.getElementById("itemName").value.trim(),
    price:Number(document.getElementById("itemPrice").value),
    category,location:document.getElementById("itemLocation").value.trim(),
    phone:document.getElementById("itemPhone").value.trim(),
    description:document.getElementById("itemDescription").value.trim(),
    icon:{Phones:"📱",Electronics:"💻",Fashion:"👕",Home:"🏠",Vehicles:"🚗",Other:"🛍️"}[category]
  });
  localStorage.setItem("markethubListings",JSON.stringify(listings));
  e.target.reset(); closeModal(); render();
};
if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
render();
