/* CONFIG - altere o ID da planilha e ADMIN_PASS antes do deploy */
const SHEET_ID = '1LrKpnG3I5F_nl-CwDLwjGe_eOt4FVOzqrPRGDPKpSl4';
const SHEET_NAME = 'RSVP';
const ADMIN_PASS = 'kb'; // altere antes do deploy

function _getSheet() {
  return SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
}

function doOptions(e) {
  return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const params = e.parameter || {};
  const action = params.action || 'guest';
  if (action === 'guest') {
    const codigo = params.codigo;
    if (!codigo) return _jsonErr('Código ausente');
    const sheet = _getSheet();
    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim());
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowObj = {};
      headers.forEach((h, idx) => rowObj[h] = row[idx]);
      if (String(rowObj['codigo_qr']) === String(codigo)) {
        const output = {
          success: true,
          nome: rowObj['nome'],
          apelido: rowObj['apelido'],
          quantidade: rowObj['quantidade'],
          presenca: rowObj['presenca'],
          mesa: rowObj['mesa']
        };
        return ContentService.createTextOutput(JSON.stringify(output)).setMimeType(ContentService.MimeType.JSON);
      }
    }
    return _jsonErr('Não encontrado');
  }
  return _jsonErr('Ação inválida');
}

function doPost(e) {
  let payload = {};
  try { payload = JSON.parse(e.postData.contents); } catch (err) { payload = e.parameter || {}; }
  const action = payload.action || payload.action;
  if (action === 'submit') return handleSubmit(payload);
  if (action === 'checkin') return handleCheckin(payload);
  return _jsonErr('Ação inválida');
}

function handleSubmit(payload) {
  const sheet = _getSheet();
  const headers = sheet.getDataRange().getValues()[0].map(h => String(h).trim());

  if (!payload.nome) return _jsonErr('Nome ausente');
  if (!payload.telefone) return _jsonErr('Telefone ausente');
  if (!payload.presenca) return _jsonErr('Presença ausente');

  const nome = sanitize(payload.nome);
  const apelido = sanitize(payload.apelido || "");
  const telefone = sanitize(payload.telefone).replace(/\D/g, "");
  const quantidade = parseInt(payload.quantidade || "1");
  const acompanhantes = payload.acompanhantes || [];
  const presenca = sanitize(payload.presenca);

  const codigo = "JS-" + Utilities.getUuid().slice(0, 8).toUpperCase();
  const qrUrl = generateQrUrl(codigo);

  const createdAt = new Date().toISOString();
  const submittedAt = new Date().toISOString();

  const rowPrincipal = [
    codigo, nome, apelido, quantidade, JSON.stringify(acompanhantes),
    "", "", presenca, "", codigo, "", "", createdAt, submittedAt, telefone, qrUrl
  ];
  sheet.appendRow(rowPrincipal);

  acompanhantes.forEach(acc => {
    sheet.appendRow([
      codigo, acc.nome || "", "", quantidade, "",
      acc.tipo || "", acc.idade || "", presenca, "", codigo, "", "", createdAt, submittedAt, telefone, qrUrl
    ]);
  });

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    qr_url: qrUrl,
    codigo: codigo
  })).setMimeType(ContentService.MimeType.JSON);
}

function handleCheckin(payload) {
  const pass = payload.admin_pass || '';
  if (pass !== ADMIN_PASS) return _jsonErr('Senha inválida');
  const codigo = payload.codigo;
  if (!codigo) return _jsonErr('Código ausente');

  const sheet = _getSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[headers.indexOf('codigo_qr')]) === String(codigo)) {
      const rowIdx = i + 1;
      const checkCol = headers.indexOf('checkin_status');
      const timeCol = headers.indexOf('checkin_time');
      sheet.getRange(rowIdx, checkCol + 1).setValue('ok');
      sheet.getRange(rowIdx, timeCol + 1).setValue(new Date().toISOString());
      const output = {
        success: true,
        nome: row[headers.indexOf('nome')],
        quantidade: row[headers.indexOf('quantidade')],
        mesa: row[headers.indexOf('mesa')]
      };
      return ContentService.createTextOutput(JSON.stringify(output)).setMimeType(ContentService.MimeType.JSON);
    }
  }
  return _jsonErr('Código não encontrado');
}

function generateQrUrl(codigo) {
  const webAppUrl = ScriptApp.getService().getUrl();
  const link = webAppUrl + '?action=guest&codigo=' + encodeURIComponent(codigo);
  return 'https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=' + encodeURIComponent(link);
}

function _jsonErr(msg) {
  return ContentService.createTextOutput(JSON.stringify({ success: false, error: msg })).setMimeType(ContentService.MimeType.JSON);
}

function sanitize(str) {
  if (str === undefined || str === null) return '';
  return String(str).replace(/[\u0000-\u001F\u007F<>]/g, '').trim();
}
