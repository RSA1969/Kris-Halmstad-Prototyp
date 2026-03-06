
function setActiveTab(id){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p=>p.style.display='none');
  document.querySelector(`[data-tab="${id}"]`).classList.add('active');
  document.getElementById(id).style.display='block';
}

function setupTabs(){
  const first = document.querySelector('.tab');
  if(first){ setActiveTab(first.dataset.tab); }
  document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>setActiveTab(t.dataset.tab)));
}

function setupChecklist(storageKey){
  document.querySelectorAll('.checklist input[type="checkbox"]').forEach((cb, idx)=>{
    const key = storageKey+':'+idx;
    const saved = localStorage.getItem(key);
    if(saved==='1') cb.checked = true;
    cb.addEventListener('change',()=>{
      localStorage.setItem(key, cb.checked?'1':'0');
    });
  });
}

document.addEventListener('DOMContentLoaded', ()=>{
  setupTabs();
});
