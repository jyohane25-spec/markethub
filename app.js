const configured=SUPABASE_URL&&!SUPABASE_URL.includes("PASTE_YOUR")&&SUPABASE_PUBLISHABLE_KEY&&!SUPABASE_PUBLISHABLE_KEY.includes("PASTE_YOUR");
const db=configured?window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY):null;
let listings=[],activeCat="All";
const el=id=>document.getElementById(id), listingsEl=el("listings"), search=el("searchInput"), count=el("count"), statusEl=el("status");
function status(msg,type="info"){statusEl.textContent=msg;statusEl.className="status "+type}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function icon(c){return {Phones:"📱",Electronics:"💻",Fashion:"👕",Home:"🏠",Vehicles:"🚗",Other:"🛍️"}[c]||"🛍️"}
function render(){
 const q=search.value.toLowerCase().trim();
 const a=listings.filter(x=>(activeCat==="All"||x.category===activeCat)&&`${x.name} ${x.category} ${x.location} ${x.description}`.toLowerCase().includes(q));
 count.textContent=`${a.length} item${a.length===1?"":"s"}`;
 listingsEl.innerHTML=a.length?a.map(x=>`<article class="card"><div class="photo">${esc(x.icon||icon(x.category))}</div><div class="card-body"><h3>${esc(x.name)}</h3><div class="price">K ${Number(x.price).toLocaleString()}</div><div class="meta">${esc(x.category)} · ${esc(x.location)}</div><div class="meta">${esc(x.description||"")}</div><a class="contact" href="tel:${esc(x.phone)}">📞 Contact seller</a></div></article>`).join(""):`<div class="empty"><h3>No listings found</h3><p>Try another search or category.</p></div>`;
}
async function load(){
 if(!configured){status("Database is not connected yet. Add your Supabase URL and publishable key to config.js.","warning");listingsEl.innerHTML='<div class="empty"><h3>Connect your database</h3><p>Complete the Supabase setup, then refresh.</p></div>';return}
 status("Loading listings...");
 const {data,error}=await db.from("listings").select("*").order("created_at",{ascending:false});
 if(error){console.error(error);status("Could not load listings. Check your table and RLS policies.","error");return}
 listings=data||[];statusEl.className="status hidden";render();
}
function openModal(){el("modal").classList.remove("hidden")} function closeModal(){el("modal").classList.add("hidden")}
el("sellTopBtn").onclick=openModal;el("floatingSell").onclick=openModal;el("closeModal").onclick=closeModal;
el("modal").addEventListener("click",e=>{if(e.target.id==="modal")closeModal()});search.addEventListener("input",render);
document.querySelectorAll(".cat").forEach(b=>b.onclick=()=>{document.querySelectorAll(".cat").forEach(x=>x.classList.remove("active"));b.classList.add("active");activeCat=b.dataset.cat;render()});
el("listingForm").onsubmit=async e=>{
 e.preventDefault();if(!configured){status("Connect Supabase first.","warning");return}
 const btn=el("publishBtn");btn.disabled=true;btn.textContent="Publishing...";
 const category=el("itemCategory").value, listing={name:el("itemName").value.trim(),price:Number(el("itemPrice").value),category,location:el("itemLocation").value.trim(),phone:el("itemPhone").value.trim(),description:el("itemDescription").value.trim(),icon:icon(category)};
 try{const {data,error}=await db.from("listings").insert(listing).select().single();if(error)throw error;listings.unshift(data);render();e.target.reset();closeModal();status("Listing published online. Other visitors can now see it.","success")}catch(err){console.error(err);status("Publishing failed: "+err.message,"error")}finally{btn.disabled=false;btn.textContent="Publish listing"}
};
if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js").catch(console.warn);load();
