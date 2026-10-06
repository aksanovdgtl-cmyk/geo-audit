(function(){
  const root=document.currentScript.closest('.hzt');
  const form=root.querySelector('#hzt-geo-form');
  const input=root.querySelector('#hzt-geo-url');
  const button=form.querySelector('button[type="submit"]');
  const bar=root.querySelector('.hzt__bar');
  const percent=root.querySelector('.hzt__percent');
  const steps=[...root.querySelectorAll('.hzt__step')];
  const scoreEl=root.querySelector('#hzt-geo-score');
  const titleEl=root.querySelector('#hzt-geo-title');
  const copyEl=root.querySelector('#hzt-geo-copy');
  const checksEl=root.querySelector('#hzt-geo-checks');
  const again=root.querySelector('#hzt-geo-again');
  const endpoint='/api/tools/geo-audit';
  const wait=(ms)=>new Promise((resolve)=>setTimeout(resolve,ms));
  const escapeHtml=(value)=>String(value).replace(/[&<>"]/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]));

  function render(data){
    scoreEl.textContent=data.score;
    titleEl.textContent=data.title;
    copyEl.textContent=data.summary;
    checksEl.innerHTML=data.categories.map((item)=>
      '<article class="hzt__check"><div class="hzt__check-top"><h3>'+escapeHtml(item.label)+'</h3><span class="hzt__badge">'+escapeHtml(item.score)+' · '+escapeHtml(item.state)+'</span></div><p>'+escapeHtml(item.copy)+'</p></article>'
    ).join('');
  }

  function renderError(message){
    scoreEl.textContent='-';
    titleEl.textContent='Проверка не выполнена';
    copyEl.textContent=message || 'Не удалось загрузить страницу. Проверьте адрес и попробуйте еще раз.';
    checksEl.innerHTML='';
  }

  form.addEventListener('submit',async(event)=>{
    event.preventDefault();
    if(!form.reportValidity())return;
    root.classList.remove('is-done');
    root.classList.add('is-loading');
    button.disabled=true;
    bar.style.width='0';
    percent.textContent='0%';
    steps.forEach((item)=>item.classList.remove('is-active'));
    const started=Date.now();
    const timer=setInterval(()=>{
      const value=Math.min(94,Math.round(((Date.now()-started)/10000)*94));
      bar.style.width=value+'%';
      percent.textContent=value+'%';
      steps.forEach((item,index)=>item.classList.toggle('is-active',value>=index*24));
    },200);
    let data=null;
    let failure=null;
    const request=fetch(endpoint+'?url='+encodeURIComponent(input.value.trim()))
      .then(async(response)=>{
        const payload=await response.json();
        if(!response.ok)throw new Error(payload.error||'Не удалось проверить страницу');
        data=payload;
      })
      .catch((error)=>{failure=error;});
    await Promise.all([request,wait(10000)]);
    clearInterval(timer);
    bar.style.width='100%';
    percent.textContent='100%';
    steps.forEach((item)=>item.classList.add('is-active'));
    await wait(350);
    if(failure)renderError(failure.message);else render(data);
    root.classList.remove('is-loading');
    root.classList.add('is-done');
    button.disabled=false;
    root.scrollIntoView({behavior:'smooth',block:'start'});
  });

  again.addEventListener('click',()=>{
    root.classList.remove('is-done');
    input.focus();
    root.scrollIntoView({behavior:'smooth',block:'start'});
  });
})();
