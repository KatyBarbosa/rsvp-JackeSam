// Config: insira a URL do seu Web App do Google Apps Script aqui
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwk4adJpadf-8fh1JHBffy0dG36cal3XRHotPW-JJNCAOSYZ5JSlgCWuuwoaKIrQmJD/exec';

// Helpers
function qs(name){
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function sanitizeClient(str){
  if(!str) return '';
  return String(str).replace(/[\u0000-\u001F\u007F<>]/g, '').trim();
}

// --- Form logic ---
document.addEventListener('DOMContentLoaded',()=>{
  const tokenInput = document.getElementById('token');
  const tokenFromUrl = qs('t');
  if(tokenInput) tokenInput.value = tokenFromUrl || '';

  const presenca = document.getElementById('presenca');
  const acompanhantesBlock = document.getElementById('acompanhantesBlock');
  const quantidade = document.getElementById('quantidade');
  const adultoCrianca = document.getElementById('adultoCrianca');
  const idadeBlock = document.getElementById('idadeBlock');
  const acompanhantesInput = document.getElementById('acompanhantes');

  if(presenca){
    presenca.addEventListener('change',()=>{
      const v = presenca.value;
      if(v==='sim' || v==='talvez'){
        acompanhantesBlock.classList.remove('hidden');
        acompanhantesBlock.setAttribute('aria-hidden','false');
        quantidade.setAttribute('required','required');
      } else {
        acompanhantesBlock.classList.add('hidden');
        acompanhantesBlock.setAttribute('aria-hidden','true');
        quantidade.removeAttribute('required');
      }
    });
  }

  if(adultoCrianca){
    adultoCrianca.addEventListener('change',()=>{
      if(adultoCrianca.value==='crianca'){
        idadeBlock.classList.remove('hidden');
        idadeBlock.setAttribute('aria-hidden','false');
        document.getElementById('idadeCrianca').setAttribute('required','required');
      }
      else {
        idadeBlock.classList.add('hidden');
        idadeBlock.setAttribute('aria-hidden','true');
        document.getElementById('idadeCrianca').removeAttribute('required');
      }
    });
  }

  const form = document.getElementById('rsvpForm');
  if(form){
    form.addEventListener('submit',async(e)=>{
      e.preventDefault();
      const btn = document.getElementById('submitBtn');
      btn.disabled = true; btn.textContent = 'Enviando...';
      clearMessage();

      // gather and sanitize
      const payload = {
        action:'submit',
        token: sanitizeClient(document.getElementById('token').value || ''),
        nome: sanitizeClient(document.getElementById('nome').value),
        apelido: sanitizeClient(document.getElementById('apelido').value),
        telefone: sanitizeClient(document.getElementById('telefone').value),
        presenca: sanitizeClient(document.getElementById('presenca').value),
        quantidade: sanitizeClient(document.getElementById('quantidade').value || '1'),
        acompanhantes: sanitizeClient(acompanhantesInput ? acompanhantesInput.value : ''),
        adulto_crianca: sanitizeClient(document.getElementById('adultoCrianca') ? document.getElementById('adultoCrianca').value : 'adulto'),
        idade_crianca: sanitizeClient(document.getElementById('idadeCrianca') ? document.getElementById('idadeCrianca').value : ''),
        mesa: sanitizeClient(document.getElementById('mesa').value)
      };

      // client-side validation (quick)
      if(!payload.token){ showMessage('Token ausente. Use o link que recebeu.'); btn.disabled=false; btn.textContent='Confirmar'; return; }
      if(!payload.nome){ showMessage('Nome é obrigatório.'); btn.disabled=false; btn.textContent='Confirmar'; return; }
      if(!payload.telefone){ showMessage('Telefone é obrigatório.'); btn.disabled=false; btn.textContent='Confirmar'; return; }
      if(!payload.presenca){ showMessage('Selecione presença.'); btn.disabled=false; btn.textContent='Confirmar'; return; }
      if((payload.presenca==='sim' || payload.presenca==='talvez') && (!payload.quantidade || Number(payload.quantidade) < 1)){ showMessage('Informe a quantidade de pessoas.'); btn.disabled=false; btn.textContent='Confirmar'; return; }
      if(payload.adulto_crianca==='crianca' && payload.idade_crianca===''){ showMessage('Informe a idade da criança.'); btn.disabled=false; btn.textContent='Confirmar'; return; }

      try{
        const res = await fetch(GAS_URL,{
          method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)
        });
        if(!res.ok){ throw new Error('Resposta inválida do servidor'); }
        const data = await res.json();
        if(data.success){
          showConfirmation(payload.presenca,data,payload.nome);
        } else {
          showMessage(data.error || 'Erro ao enviar.');
        }
      }catch(err){
        console.error(err);
        showMessage('Erro de rede ou servidor. Verifique sua conexão e tente novamente.');
      }

      btn.disabled = false; btn.textContent = 'Confirmar';
    });
  }

  // admin
  const checkinBtn = document.getElementById('checkinBtn');
  if(checkinBtn){
    checkinBtn.addEventListener('click',async ()=>{
      const pass = document.getElementById('adminPass').value;
      const codigo = document.getElementById('codigo').value.trim();
      if(!pass || !codigo) return alert('Senha e código são obrigatórios');
      try{
        const res = await fetch(GAS_URL,{
          method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'checkin', admin_pass:pass, codigo})
        });
        const data = await res.json();
        if(data.success){
          document.getElementById('result').textContent = `Check-in registrado: ${data.nome} — ${data.quantidade} pessoas — Mesa: ${data.mesa || '—'}`;
        } else {
          document.getElementById('result').textContent = data.error || 'Erro no check-in';
        }
      }catch(e){document.getElementById('result').textContent = 'Erro de rede'}
    });
  }

});

function showMessage(text){
  const m = document.getElementById('message');
  if(m){m.textContent = text; m.classList.remove('hidden'); m.style.display='block';}
}

function clearMessage(){
  const m = document.getElementById('message');
  if(m){m.textContent=''; m.classList.add('hidden'); m.style.display='none';}
}

function showConfirmation(presenca,data,nome){
  const m = document.getElementById('message');
  const qrWrap = document.getElementById('qrWrap');
  const qrImg = document.getElementById('qrImg');
  const saveQr = document.getElementById('saveQr');
  const whatsappLink = document.getElementById('whatsappLink');

  if(presenca==='sim'){
    m.innerHTML = 'Uhuuul! 🎉 Obrigado por confirmar sua presença! Estamos preparando tudo com muito carinho para receber você nesse dia tão especial. Contagem regressiva ativada 💕.';
  } else if(presenca==='nao'){
    m.innerHTML = 'Lamentamos que não vá poder comparecer — obrigado por avisar.';
  } else {
    m.innerHTML = 'Obrigado — sua resposta foi registrada. Aguardamos confirmação final.';
  }

  if(data.qr_url){
    qrWrap.classList.remove('hidden');
    qrWrap.setAttribute('aria-hidden','false');
    qrImg.src = data.qr_url;
    saveQr.href = data.qr_url;
    const text = encodeURIComponent(`Confirmação: ${nome} - ${presenca}. Código: ${data.codigo}`) + '%0A' + encodeURIComponent(data.qr_url);
    whatsappLink.href = `https://wa.me/?text=${text}`;
  }
}
