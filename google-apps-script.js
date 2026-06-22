/**
 * ════════════════════════════════════════════════════════════
 *  Filho Rico Digital — Google Apps Script
 *  Recebe leads do site → grava no Sheets → envia email
 * ════════════════════════════════════════════════════════════
 *
 *  COMO CONFIGURAR (passo a passo):
 *
 *  1. Abre o teu Google Sheets em sheets.google.com
 *  2. Menu superior → Extensões → Apps Script
 *  3. Apaga todo o código e cola ESTE ficheiro inteiro
 *  4. Muda o EMAIL_NOTIFICACAO abaixo para o teu email (linha 30)
 *  5. Clica em 💾 Guardar → dá o nome "Leads Filho Rico"
 *  6. Clica em Implementar → Nova implementação
 *  7. Seleciona tipo: Aplicação Web
 *       Executar como    → Eu (o teu email Google)
 *       Quem tem acesso  → Qualquer pessoa
 *  8. Clica em Implementar
 *  9. Autoriza quando pedido:
 *       "Avançadas" → "Ir para Leads Filho Rico" → Permitir
 * 10. Copia a URL gerada e cola em script.js:
 *       const GOOGLE_SHEETS_URL = 'URL_AQUI';
 *
 *  IMPORTANTE: sempre que alterares o código faz
 *  Implementar → Gerir implementações → Nova versão
 * ════════════════════════════════════════════════════════════
 */

/* ── CONFIGURAÇÃO — só precisas de alterar aqui ── */
var EMAIL_NOTIFICACAO = '@gmail.com'; // ← muda para o teu email
var NOME_DA_FOLHA     = 'Leads';

/* ── Colunas do Sheets ───────────────────────────── */
var CABECALHOS = [
  'Data e Hora',
  'Nome',
  'Email',
  'WhatsApp',
  'Serviço',
  'Mensagem',
  'Origem',
];

/* ═══════════════════════════════════════════════════
   doPost — chamado pelo site quando o formulário
   é submetido. Grava no Sheets e envia o email.
   ═══════════════════════════════════════════════════ */
function doPost(e) {
  try {
    var dados = extrairDados(e);
    var folha = obterOuCriarFolha(NOME_DA_FOLHA);

    garantirCabecalhos(folha);
    gravarLinha(folha, dados);
    enviarEmailNotificacao(dados);        // ← email automático

    return responderComSucesso();

  } catch (erro) {
    return responderComErro(erro.message);
  }
}

/* ── Extrai e organiza os dados recebidos do site ── */
function extrairDados(e) {
  var p = e.parameter;

  return {
    dataEnvio: p.dataEnvio || formatarDataAgora(),
    nome:      limpar(p.nome),
    email:     limpar(p.email),
    whatsapp:  limpar(p.whatsapp),
    servico:   limpar(p.servico)  || 'Não especificado',
    mensagem:  limpar(p.mensagem) || 'Sem mensagem.',
    origem:    limpar(p.origem)   || 'Website',
  };
}

/* ═══════════════════════════════════════════════════
   EMAIL AUTOMÁTICO
   Enviado para EMAIL_NOTIFICACAO sempre que chega
   um lead novo. Contém todos os dados formatados.
   ═══════════════════════════════════════════════════ */
function enviarEmailNotificacao(dados) {

  var assunto = '🔔 Novo Lead — ' + dados.nome + ' | Filho Rico Digital';

  /* ── Corpo em HTML (aparece formatado no Gmail) ── */
  var corpoHtml = [
    '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0A0A0A;color:#F2F0EA;border-radius:12px;overflow:hidden;">',

    /* Cabeçalho dourado */
    '  <div style="background:#FFD700;padding:24px 32px;">',
    '    <h1 style="margin:0;font-size:20px;color:#0A0A0A;">🔔 Novo Lead Recebido</h1>',
    '    <p style="margin:4px 0 0;font-size:13px;color:#333;">Filho Rico Digital — Formulário do Site</p>',
    '  </div>',

    /* Dados do lead */
    '  <div style="padding:32px;">',
    '    <table style="width:100%;border-collapse:collapse;">',
    linhaTabela('📅 Data',      dados.dataEnvio),
    linhaTabela('👤 Nome',      dados.nome),
    linhaTabela('📧 Email',     '<a href="mailto:' + dados.email + '" style="color:#FFD700;">' + dados.email + '</a>'),
    linhaTabela('📱 WhatsApp',  '<a href="https://wa.me/' + dados.whatsapp.replace(/\D/g,'') + '" style="color:#FFD700;">' + dados.whatsapp + '</a>'),
    linhaTabela('🛒 Serviço',   dados.servico),
    linhaTabela('💬 Mensagem',  dados.mensagem),
    linhaTabela('🌐 Origem',    dados.origem),
    '    </table>',
    '  </div>',

    /* Botões de acção rápida */
    '  <div style="padding:0 32px 32px;display:flex;gap:12px;">',
    '    <a href="mailto:' + dados.email + '" style="display:inline-block;background:#FFD700;color:#0A0A0A;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;">',
    '      ✉️ Responder por Email',
    '    </a>',
    '    <a href="https://wa.me/' + dados.whatsapp.replace(/\D/g,'') + '?text=' + encodeURIComponent('Olá ' + dados.nome + '! Vi o teu pedido no site da Filho Rico Digital e quero saber mais sobre como podemos ajudar-te. 🚀') + '" style="display:inline-block;background:#25D366;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;">',
    '      💬 Responder no WhatsApp',
    '    </a>',
    '  </div>',

    /* Rodapé */
    '  <div style="background:#161616;padding:16px 32px;text-align:center;">',
    '    <p style="margin:0;font-size:12px;color:#888;">Filho Rico Digital · Este email foi gerado automaticamente</p>',
    '  </div>',

    '</div>',
  ].join('\n');

  /* ── Corpo em texto simples (fallback) ── */
  var corpoTexto = [
    '🔔 NOVO LEAD — FILHO RICO DIGITAL',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '📅 Data:      ' + dados.dataEnvio,
    '👤 Nome:      ' + dados.nome,
    '📧 Email:     ' + dados.email,
    '📱 WhatsApp:  ' + dados.whatsapp,
    '🛒 Serviço:   ' + dados.servico,
    '💬 Mensagem:  ' + dados.mensagem,
    '🌐 Origem:    ' + dados.origem,
    '━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'Responde directamente a este email ou abre o WhatsApp:',
    'https://wa.me/' + dados.whatsapp.replace(/\D/g,''),
  ].join('\n');

  GmailApp.sendEmail(
    EMAIL_NOTIFICACAO,
    assunto,
    corpoTexto,
    { htmlBody: corpoHtml }
  );
}

/* ── Gera uma linha da tabela HTML do email ─────── */
function linhaTabela(rotulo, valor) {
  return [
    '<tr>',
    '  <td style="padding:10px 16px 10px 0;color:#FFD700;font-weight:bold;font-size:13px;vertical-align:top;white-space:nowrap;width:120px;">' + rotulo + '</td>',
    '  <td style="padding:10px 0;color:#F2F0EA;font-size:14px;border-bottom:1px solid #2A2A2A;">' + valor + '</td>',
    '</tr>',
  ].join('');
}

/* ── Devolve (ou cria) a folha com o nome indicado ── */
function obterOuCriarFolha(nomeFolha) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var folha = ss.getSheetByName(nomeFolha);
  if (!folha) folha = ss.insertSheet(nomeFolha);
  return folha;
}

/* ── Cabeçalhos com formatação dourada ───────────── */
function garantirCabecalhos(folha) {
  var primeiraLinha = folha.getRange(1, 1, 1, CABECALHOS.length).getValues()[0];
  var temCabecalho  = primeiraLinha.some(function (cel) { return cel !== ''; });

  if (!temCabecalho) {
    folha.getRange(1, 1, 1, CABECALHOS.length).setValues([CABECALHOS]);
    var rangeCab = folha.getRange(1, 1, 1, CABECALHOS.length);
    rangeCab.setBackground('#FFD700');
    rangeCab.setFontColor('#0A0A0A');
    rangeCab.setFontWeight('bold');
    rangeCab.setHorizontalAlignment('center');
    folha.autoResizeColumns(1, CABECALHOS.length);
  }
}

/* ── Grava nova linha com zebra ──────────────────── */
function gravarLinha(folha, dados) {
  folha.appendRow([
    dados.dataEnvio,
    dados.nome,
    dados.email,
    dados.whatsapp,
    dados.servico,
    dados.mensagem,
    dados.origem,
  ]);

  var ultimaLinha = folha.getLastRow();
  var cor = ultimaLinha % 2 === 0 ? '#1e1e1e' : '#161616';
  folha
    .getRange(ultimaLinha, 1, 1, CABECALHOS.length)
    .setBackground(cor)
    .setFontColor('#F2F0EA');
}

/* ── Helpers ─────────────────────────────────────── */
function formatarDataAgora() {
  return Utilities.formatDate(new Date(), 'Africa/Luanda', 'dd/MM/yyyy HH:mm');
}

function limpar(valor) {
  return valor ? String(valor).trim() : '';
}

function responderComSucesso() {
  return ContentService
    .createTextOutput(JSON.stringify({ resultado: 'sucesso' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function responderComErro(mensagemErro) {
  return ContentService
    .createTextOutput(JSON.stringify({ resultado: 'erro', mensagem: mensagemErro }))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ═══════════════════════════════════════════════════
   doGet — testa o script directamente no browser.
   Acede à URL do script com os parâmetros:
   ?nome=Teste&email=teste@gmail.com&whatsapp=244923000000
   &servico=Marketing&mensagem=Teste
   ═══════════════════════════════════════════════════ */
function doGet(e) {
  if (e && e.parameter && e.parameter.nome) {
    return doPost(e);
  }
  return ContentService
    .createTextOutput(JSON.stringify({
      status:  'online',
      projeto: 'Filho Rico Digital — Captação de Leads',
      versao:  '2.0',
    }))
    .setMimeType(ContentService.MimeType.JSON);
}