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
var EMAIL_NOTIFICACAO = 'maurocoxi8@gmail.com'; // ← muda para o teu email
var NOME_DA_FOLHA     = 'Leads';
var SECURITY_TOKEN    = 'frd-leads-v1-9c7a63b5a4d2';

var TEMPO_MINIMO_ENVIO_MS = 1500;
var TEMPO_MAXIMO_ENVIO_MS = 30 * 60 * 1000;
var RATE_LIMIT_SEGUNDOS   = 60;

var SERVICOS_PERMITIDOS = {
  marketingDigital: 'Marketing Digital',
  comercializacao: 'Comercialização de Produtos',
  edicaoVideo: 'Edição de Vídeo',
  pacoteCompleto: 'Pacote Completo',
};

var LIMITES_FORMULARIO = {
  nomeMin: 2,
  nomeMax: 80,
  emailMax: 254,
  whatsappMin: 9,
  whatsappMax: 15,
  mensagemMax: 600,
};

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
    var parametros = obterParametros(e);

    validarToken(parametros);
    validarAntiSpam(parametros);

    var dados = extrairDados(parametros);
    validarRateLimit(dados);

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
function extrairDados(p) {
  return {
    dataEnvio: formatarDataAgora(),
    nome:      validarNomeEntrada(p.nome),
    email:     validarEmailEntrada(p.email),
    whatsapp:  validarWhatsappEntrada(p.whatsapp),
    servico:   validarServicoEntrada(p.servico),
    mensagem:  validarMensagemEntrada(p.mensagem),
    origem:    sanitizarTexto(p.origem, 80) || 'Website',
  };
}

/* ═══════════════════════════════════════════════════
   EMAIL AUTOMÁTICO
   Enviado para EMAIL_NOTIFICACAO sempre que chega
   um lead novo. Contém todos os dados formatados.
   ═══════════════════════════════════════════════════ */
function enviarEmailNotificacao(dados) {

  var assunto = limparAssunto('🔔 Novo Lead — ' + dados.nome + ' | Filho Rico Digital');
  var emailHref = 'mailto:' + encodeURIComponent(dados.email);
  var whatsappDigits = dados.whatsapp.replace(/\D/g, '');
  var whatsappHref = 'https://wa.me/' + whatsappDigits;

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
    linhaTabela('📧 Email',     '<a href="' + emailHref + '" style="color:#FFD700;">' + escapeHtml(dados.email) + '</a>', true),
    linhaTabela('📱 WhatsApp',  '<a href="' + whatsappHref + '" style="color:#FFD700;">' + escapeHtml(dados.whatsapp) + '</a>', true),
    linhaTabela('🛒 Serviço',   dados.servico),
    linhaTabela('💬 Mensagem',  dados.mensagem),
    linhaTabela('🌐 Origem',    dados.origem),
    '    </table>',
    '  </div>',

    /* Botões de acção rápida */
    '  <div style="padding:0 32px 32px;display:flex;gap:12px;">',
    '    <a href="' + emailHref + '" style="display:inline-block;background:#FFD700;color:#0A0A0A;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;">',
    '      ✉️ Responder por Email',
    '    </a>',
    '    <a href="' + whatsappHref + '?text=' + encodeURIComponent('Olá ' + dados.nome + '! Vi o teu pedido no site da Filho Rico Digital e quero saber mais sobre como podemos ajudar-te. 🚀') + '" style="display:inline-block;background:#25D366;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;">',
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
    whatsappHref,
  ].join('\n');

  GmailApp.sendEmail(
    EMAIL_NOTIFICACAO,
    assunto,
    corpoTexto,
    { htmlBody: corpoHtml }
  );
}

/* ── Gera uma linha da tabela HTML do email ─────── */
function linhaTabela(rotulo, valor, valorJaSeguro) {
  var valorHtml = valorJaSeguro ? valor : escapeHtml(valor);
  return [
    '<tr>',
    '  <td style="padding:10px 16px 10px 0;color:#FFD700;font-weight:bold;font-size:13px;vertical-align:top;white-space:nowrap;width:120px;">' + rotulo + '</td>',
    '  <td style="padding:10px 0;color:#F2F0EA;font-size:14px;border-bottom:1px solid #2A2A2A;">' + valorHtml + '</td>',
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
    protegerCelula(dados.dataEnvio),
    protegerCelula(dados.nome),
    protegerCelula(dados.email),
    protegerCelula(dados.whatsapp),
    protegerCelula(dados.servico),
    protegerCelula(dados.mensagem),
    protegerCelula(dados.origem),
  ]);

  var ultimaLinha = folha.getLastRow();
  var cor = ultimaLinha % 2 === 0 ? '#1e1e1e' : '#161616';
  folha
    .getRange(ultimaLinha, 1, 1, CABECALHOS.length)
    .setBackground(cor)
    .setFontColor('#F2F0EA');
}

/* ── Helpers ─────────────────────────────────────── */
function obterParametros(e) {
  if (!e || !e.parameter) {
    throw new Error('Pedido invalido.');
  }
  return e.parameter;
}

function validarToken(p) {
  if (limpar(p.tokenSeguranca) !== SECURITY_TOKEN) {
    throw new Error('Token de seguranca invalido.');
  }
}

function validarAntiSpam(p) {
  if (limpar(p.empresa) || limpar(p.website) || limpar(p.url)) {
    throw new Error('Pedido recusado por anti-spam.');
  }

  validarTempoFormulario(p.tempoInicio);
  validarNonceUnico(p.nonceCliente);
}

function validarTempoFormulario(valor) {
  var inicio = Number(valor);
  var idade = Date.now() - inicio;

  if (!isFinite(inicio) || idade < TEMPO_MINIMO_ENVIO_MS || idade > TEMPO_MAXIMO_ENVIO_MS) {
    throw new Error('Formulario expirado ou enviado rapido demais.');
  }
}

function validarNonceUnico(valor) {
  var nonce = limpar(valor);
  if (!/^[a-f0-9]{16,64}$/i.test(nonce)) {
    throw new Error('Sessao do formulario invalida.');
  }

  var cache = CacheService.getScriptCache();
  var chave = 'nonce:' + nonce;
  if (cache.get(chave)) {
    throw new Error('Pedido duplicado recusado.');
  }
  cache.put(chave, '1', Math.ceil(TEMPO_MAXIMO_ENVIO_MS / 1000));
}

function validarRateLimit(dados) {
  var cache = CacheService.getScriptCache();
  var chaves = [
    'email:' + hashValor(dados.email),
    'phone:' + hashValor(dados.whatsapp),
  ];

  for (var i = 0; i < chaves.length; i++) {
    if (cache.get(chaves[i])) {
      throw new Error('Aguarda antes de enviar outro pedido.');
    }
  }

  for (var j = 0; j < chaves.length; j++) {
    cache.put(chaves[j], '1', RATE_LIMIT_SEGUNDOS);
  }
}

function validarNomeEntrada(valor) {
  var nome = sanitizarTexto(valor, LIMITES_FORMULARIO.nomeMax);
  var letras = nome.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, '');

  if (
    nome.length < LIMITES_FORMULARIO.nomeMin ||
    letras.length < LIMITES_FORMULARIO.nomeMin ||
    /[<>{}\[\]\\]/.test(nome) ||
    contemPadraoPerigoso(nome)
  ) {
    throw new Error('Nome invalido.');
  }

  return nome;
}

function validarEmailEntrada(valor) {
  var email = sanitizarTexto(valor, LIMITES_FORMULARIO.emailMax).toLowerCase();
  if (
    email.length > LIMITES_FORMULARIO.emailMax ||
    !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email) ||
    contemPadraoPerigoso(email)
  ) {
    throw new Error('Email invalido.');
  }

  return email;
}

function validarWhatsappEntrada(valor) {
  var digitos = sanitizarTexto(valor, 32).replace(/\D/g, '').replace(/^00/, '');
  if (
    digitos.length < LIMITES_FORMULARIO.whatsappMin ||
    digitos.length > LIMITES_FORMULARIO.whatsappMax
  ) {
    throw new Error('WhatsApp invalido.');
  }

  return '+' + digitos;
}

function validarServicoEntrada(valor) {
  var servico = limpar(valor);
  if (SERVICOS_PERMITIDOS[servico]) {
    return SERVICOS_PERMITIDOS[servico];
  }

  for (var codigo in SERVICOS_PERMITIDOS) {
    if (SERVICOS_PERMITIDOS[codigo] === servico) {
      return SERVICOS_PERMITIDOS[codigo];
    }
  }

  throw new Error('Servico invalido.');
}

function validarMensagemEntrada(valor) {
  var mensagem = sanitizarTexto(valor, LIMITES_FORMULARIO.mensagemMax);
  if (!mensagem) return 'Sem mensagem.';

  if (contarLinks(mensagem) > 2 || contemPadraoPerigoso(mensagem)) {
    throw new Error('Mensagem invalida.');
  }

  return mensagem;
}

function sanitizarTexto(valor, limite) {
  var texto = limpar(valor);
  if (texto.normalize) texto = texto.normalize('NFKC');

  texto = texto
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return texto.slice(0, limite);
}

function contarLinks(texto) {
  var matches = String(texto || '').match(/https?:\/\/|www\.|bit\.ly|tinyurl\.com/gi);
  return matches ? matches.length : 0;
}

function contemPadraoPerigoso(texto) {
  return /(<\s*script|javascript:|data:text\/html|on\w+\s*=|union\s+select|drop\s+table|insert\s+into|delete\s+from)/i
    .test(String(texto || ''));
}

function protegerCelula(valor) {
  var texto = String(valor || '');
  return /^[=+\-@]/.test(texto) ? "'" + texto : texto;
}

function hashValor(valor) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(valor || ''));
  return Utilities.base64EncodeWebSafe(bytes).slice(0, 32);
}

function escapeHtml(valor) {
  return String(valor || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function limparAssunto(valor) {
  return String(valor || '').replace(/[\r\n]+/g, ' ').slice(0, 120);
}

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
   Por segurança, leads só são aceites por POST validado.
   ═══════════════════════════════════════════════════ */
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status:  'online',
      projeto: 'Filho Rico Digital — Captação de Leads',
      versao:  '2.1-seguro',
      metodos: ['POST'],
    }))
    .setMimeType(ContentService.MimeType.JSON);
}
