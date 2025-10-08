/* CONFIG - altere o ID da planilha e ADMIN_PASS antes do deploy */
const SHEET_ID = 'COLE_AQUI_SEU_SHEET_ID';
const SHEET_NAME = 'RSVP';
const ADMIN_PASS = 'troque_para_senha_forte'; // altere antes do deploy

// Colunas esperadas (ordem no sheet)
// token,nome,apelido,quantidade,acompanhantes,adulto_ou_crianca,idade_crianca,presenca,mesa,codigo_qr,checkin_status,checkin_time,created_at,submitted_at,telefone

function _getSheet(){
  return SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
}

// OPTIONS handler to help with preflight (basic)
function doOptions(e){
  return ContentService.createTextOutput(JSON.stringify({success:true})).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e){
  const params = e.parameter || {};
  const action = params.action || 'guest';
  if(action==='guest'){
    const codigo = params.codigo;
    if(!codigo) return _jsonErr('codigo ausente');
    const sheet = _getSheet();
    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h=>String(h).trim());
    for(let i=1;i<data.length;i++){
      const row = data[i];
      const rowObj = {};
      headers.forEach((h,idx)=>rowObj[h]=row[idx]);
      if(String(rowObj['codigo_qr'])===String(codigo)){
        const output = {
          success:true,
          nome:rowObj['nome'],
          apelido:rowObj['apelido'],
          quantidade:rowObj['quantidade'],
          presenca:rowObj['presenca'],
          mesa:rowObj['mesa']
        };
        return ContentService.createTextOutput(JSON.stringify(output)).setMimeType(ContentService.MimeType.JSON);
      }
    }
    return _jsonErr('Não encontrado');
  }
  return _jsonErr('Ação inválida');
}

function doPost(e){
  let payload = {};
  try{ payload = JSON.parse(e.postData.contents); } catch(err){ payload = e.parameter || {}; }
  const action = payload.action || payload.action;
  if(action==='submit') return handleSubmit(payload);
  if(action==='checkin') return handleCheckin(payload);
  return _jsonErr('Ação inválida');
}

function handleSubmit(payload){
  const sheet = _getSheet();
  const headers = sheet.getDataRange().getValues()[0].map(h=>String(h).trim());

  // campos obrigatórios: token, nome, telefone, presenca
  if(!payload.token) return _jsonErr('Token ausente');
  if(!payload.nome) return _jsonErr('Nome ausente');
  if(!payload.telefone) return _jsonErr('Telefone ausente');
  if(!payload.presenca) return _jsonErr('Presença ausente');

  // encontrar linha do token (token assumed in first column)
  const data = sheet.getDataRange().getValues();
  let rowIdx = -1; let rowObj=null;
  for(let i=1;i<data.length;i++){
    if(String(data[i][0])===String(payload.token)){
      rowIdx = i+1; // 1-based
      rowObj = data[i];
      break;
    }
  }
  if(rowIdx===-1) return _jsonErr('Token inválido');

  // verificar duplicata: coluna submitted_at (index baseada no header)
  const submittedAtIdx = headers.indexOf('submitted_at');
  if(submittedAtIdx>=0){
    const existing = sheet.getRange(rowIdx, submittedAtIdx+1).getValue();
    if(existing) return _jsonErr('RSVP já respondido para este token');
  }

  // gerar código curto
  const codigo = Utilities.getUuid().slice(0,8).toUpperCase();
  const qrUrl = generateQrUrl(codigo);

  // montar objeto sanitizado
  const update = {};
  update['nome'] = sanitize(payload.nome || '');
  update['apelido'] = sanitize(payload.apelido || '');
  update['quantidade'] = sanitize(payload.quantidade || '');
  update['acompanhantes'] = sanitize(payload.acompanhantes || '');
  update['adulto_ou_crianca'] = sanitize(payload.adulto_crianca || '');
  update['idade_crianca'] = sanitize(payload.idade_crianca || '');
  update['presenca'] = sanitize(payload.presenca || '');
  update['mesa'] = sanitize(payload.mesa || '');
  update['codigo_qr'] = codigo;
  update['checkin_status'] = '';
  update['checkin_time'] = '';
  update['created_at'] = new Date().toISOString();
  update['submitted_at'] = new Date().toISOString();
  update['telefone'] = sanitize(payload.telefone || '');

  // escrever na planilha (atualiza as colunas existentes)
  headers.forEach((h,idx)=>{
    if(update.hasOwnProperty(h)) sheet.getRange(rowIdx, idx+1).setValue(update[h]);
  });

  return ContentService.createTextOutput(JSON.stringify({success:true,qr_url:qrUrl,codigo:codigo})).setMimeType(ContentService.MimeType.JSON);
}

function handleCheckin(payload){
  const pass = payload.admin_pass || '';
  if(pass!==ADMIN_PASS) return _jsonErr('Senha inválida');
  const codigo = payload.codigo;
  if(!codigo) return _jsonErr('Código ausente');

  const sheet = _getSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h=>String(h).trim());
  for(let i=1;i<data.length;i++){
    const row = data[i];
    if(String(row[headers.indexOf('codigo_qr')])===String(codigo)){
      const rowIdx = i+1;
      const checkCol = headers.indexOf('checkin_status');
      const timeCol = headers.indexOf('checkin_time');
      sheet.getRange(rowIdx, checkCol+1).setValue('ok');
      sheet.getRange(rowIdx, timeCol+1).setValue(new Date().toISOString());
      const output = {
        success:true,
        nome: row[headers.indexOf('nome')],
        quantidade: row[headers.indexOf('quantidade')],
        mesa: row[headers.indexOf('mesa')]
      };
      return ContentService.createTextOutput(JSON.stringify(output)).setMimeType(ContentService.MimeType.JSON);
    }
  }
  return _jsonErr('Código não encontrado');
}

function generateQrUrl(codigo){
  var webAppUrl = ScriptApp.getService().getUrl();
  var link = webAppUrl + '?action=guest&codigo=' + encodeURIComponent(codigo);
  var qr = 'https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=' + encodeURIComponent(link);
  return qr;
}

function _jsonErr(msg){
  return ContentService.createTextOutput(JSON.stringify({success:false,error:msg})).setMimeType(ContentService.MimeType.JSON);
}

function sanitize(str){
  if(str===undefined || str===null) return '';
  return String(str).replace(/[\u0000-\u001F\u007F<>]/g,'').trim();
}

// Util: pré-popular tokens na sheet (execute manualmente)
function gerarTokens(qtd){
  const sheet = _getSheet();
  for(let i=0;i<(qtd||50);i++){
    const token = Utilities.getUuid().slice(0,8).toUpperCase();
    sheet.appendRow([token]);
  }
}
