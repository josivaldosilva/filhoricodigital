/* ============================================
   Filho Rico Digital — script.js
   ============================================
   CONFIGURAÇÃO OBRIGATÓRIA (linha 14):
   Após publicar o Google Apps Script, cola a
   URL gerada na constante GOOGLE_SHEETS_URL.
   ============================================ */

const WHATSAPP_NUMERO   = '244929054513';
const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbzAW5D8neHgDf9AAgaOP4y2Ctt2J0PBHZWaXN1EsGZOJnJ0ihb9frsyF9CuoMylN0DBMw/exec';
const FORM_SECURITY_TOKEN = 'frd-leads-v1-9c7a63b5a4d2';
const FORM_SECURITY_MIN_MS = 2000;
const FORM_SECURITY_MAX_MS = 30 * 60 * 1000;
const FORM_COOLDOWN_MS = 45 * 1000;
const STORAGE_ULTIMO_ENVIO = 'filhoRicoUltimoLeadMs';
const SERVICOS_PERMITIDOS = Object.freeze({
  marketingDigital: 'Marketing Digital',
  comercializacao: 'Comercialização de Produtos',
  edicaoVideo: 'Edição de Vídeo',
  pacoteCompleto: 'Pacote Completo',
});
const LIMITES_FORMULARIO = Object.freeze({
  nomeMin: 2,
  nomeMax: 80,
  emailMax: 254,
  whatsappMin: 9,
  whatsappMax: 15,
  mensagemMax: 600,
});

let envioEmAndamento = false;

/* ── Inicialização ───────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  inicializarMenuMobile();
  inicializarScrollSuave();
  inicializarHeaderScroll();
  inicializarBotaoWhatsApp();
  inicializarBotoesPlano();
  inicializarBotoesArtigo();
  inicializarFormularioContato();
});

/* ── Menu mobile ─────────────────────────── */
function inicializarMenuMobile() {
  const botaoMenu = document.getElementById('menuMobile');
  const navLinks   = document.getElementById('navLinks');
  if (!botaoMenu || !navLinks) return;

  botaoMenu.addEventListener('click', () => {
    const aberto = navLinks.classList.toggle('aberto');
    botaoMenu.setAttribute('aria-expanded', String(aberto));
  });
}

/* ── Scroll suave ────────────────────────── */
function inicializarScrollSuave() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const destino = document.querySelector(link.getAttribute('href'));
      if (!destino) return;
      e.preventDefault();
      destino.scrollIntoView({ behavior: 'smooth', block: 'start' });

      const navLinks  = document.getElementById('navLinks');
      const botaoMenu = document.getElementById('menuMobile');
      if (navLinks?.classList.contains('aberto')) {
        navLinks.classList.remove('aberto');
        botaoMenu?.setAttribute('aria-expanded', 'false');
      }
    });
  });
}

/* ── Header dinâmico ─────────────────────── */
function inicializarHeaderScroll() {
  const header = document.querySelector('.header');
  if (!header) return;
  window.addEventListener('scroll', () => {
    header.style.background = window.scrollY > 100
      ? 'rgba(10,10,10,0.98)'
      : 'rgba(10,10,10,0.90)';
  });
}

/* ── Botão flutuante WhatsApp ────────────── */
function inicializarBotaoWhatsApp() {
  const botao = document.getElementById('whatsappFlutuante');
  if (!botao) return;
  botao.addEventListener('click', () => {
    rastrearEvento('click_whatsapp', { event_category: 'Contato' });
    fbqRastrear('Contact');
    abrirWhatsApp('Olá! Vim pelo site da Filho Rico Digital e quero saber mais sobre os serviços.');
  });
}

/* ── Botões de plano ─────────────────────── */
function inicializarBotoesPlano() {
  document.querySelectorAll('.btn-escolher-plano').forEach((botao) => {
    botao.addEventListener('click', () => {
      const plano = botao.dataset.plano;
      rastrearEvento('click_plano', { event_category: 'Precos', event_label: plano });
      fbqRastrear('InitiateCheckout', { content_name: plano });
      abrirWhatsApp(`Olá! Tenho interesse no plano *${plano}* da Filho Rico Digital. Quero mais informações.`);
    });
  });
}

/* ── Botões de artigo ────────────────────── */
function inicializarBotoesArtigo() {
  document.querySelectorAll('.btn-ler-artigo').forEach((botao) => {
    botao.addEventListener('click', () => {
      const titulo = botao.dataset.titulo;
      alert(`Artigo: ${titulo}\n\nEm breve vamos integrar com CMS. Por enquanto, este é um exemplo de post do blog da Filho Rico Digital.`);
    });
  });
}

/* ── Utilitários de abertura / rastreio ──── */
function abrirWhatsApp(mensagem) {
  window.open(
    `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensagem)}`,
    '_blank',
    'noopener'
  );
}

function rastrearEvento(nome, parametros) {
  if (typeof gtag === 'function') gtag('event', nome, parametros);
}

function fbqRastrear(nome, parametros) {
  if (typeof fbq === 'function') fbq('track', nome, parametros);
}

/* ════════════════════════════════════════════
   FORMULÁRIO DE CONTATO
   Fluxo ao submeter:
   1. Valida os campos
   2. Envia os dados para o Google Sheets
   3. Abre o WhatsApp com a mensagem formatada
   4. Exibe feedback para o utilizador
   ════════════════════════════════════════════ */
function inicializarFormularioContato() {
  const formulario = document.getElementById('formContato');
  if (!formulario) return;

  prepararProtecoesFormulario(formulario);

  formulario.addEventListener('submit', async (e) => {
    e.preventDefault();

    const statusEl = document.getElementById('formStatus');
    if (envioEmAndamento) return;

    if (estaEmCooldownLocal()) {
      exibirStatus(statusEl, 'Aguarda alguns segundos antes de enviar outro pedido.', 'aviso');
      return;
    }

    const dadosLead = capturarDadosFormulario(formulario);
    if (!dadosLead) return; // Validação falhou — mensagens já visíveis

    envioEmAndamento = true;
    registrarEnvioLocal();

    try {
      await enviarLead(dadosLead, formulario);
    } finally {
      envioEmAndamento = false;
    }
  });
}

/* ── 1. Captura e validação dos campos ────── */
/**
 * Lê os quatro campos principais (nome, email, whatsapp, mensagem)
 * mais o serviço selecionado, valida cada um e devolve um objeto
 * organizado com todos os dados do lead + metadados de rastreio.
 * Retorna null se algum campo obrigatório falhar.
 */
function capturarDadosFormulario(formulario) {
  const campo = (id) => formulario.querySelector(id);

  const nomeRaw     = campo('#nome')?.value          ?? '';
  const emailRaw    = campo('#email')?.value         ?? '';
  const whatsappRaw = campo('#whatsapp')?.value      ?? '';
  const servico     = campo('#servicos')?.value      ?? '';
  const mensagemRaw = campo('#mensagem')?.value      ?? '';
  const honeypot    = campo('[name="empresa"]')?.value.trim() ?? '';
  const token       = campo('[name="tokenSeguranca"]')?.value ?? '';
  const tempoInicio = Number(campo('[name="tempoInicio"]')?.value ?? 0);
  const nonce       = campo('[name="nonceCliente"]')?.value ?? '';

  const nome     = sanitizarTextoCliente(nomeRaw, LIMITES_FORMULARIO.nomeMax);
  const email    = sanitizarTextoCliente(emailRaw, LIMITES_FORMULARIO.emailMax).toLowerCase();
  const whatsapp = sanitizarTextoCliente(whatsappRaw, 32);
  const mensagem = sanitizarTextoCliente(mensagemRaw, LIMITES_FORMULARIO.mensagemMax);

  limparErros(formulario);

  if (!validarProtecoesFormulario(formulario, honeypot, token, tempoInicio, nonce)) {
    return null;
  }

  let valido = true;

  if (!validarNome(nome)) {
    mostrarErro('erroNome', 'Por favor, indica o teu nome completo.');
    valido = false;
  }

  if (!validarEmail(email)) {
    mostrarErro('erroEmail', 'Indica um endereço de email válido.');
    valido = false;
  }

  if (!validarWhatsapp(whatsapp)) {
    mostrarErro('erroWhatsapp', 'Indica um número válido (ex: +244 923 000 000).');
    valido = false;
  }

  if (!validarServico(servico)) {
    mostrarErro('erroServico', 'Escolhe um servico valido.');
    valido = false;
  }

  if (!validarMensagem(mensagem)) {
    mostrarErro('erroMensagem', 'A mensagem deve ter ate 600 caracteres e sem links suspeitos.');
    valido = false;
  }

  if (!valido) return null;

  return {
    nome,
    email,
    whatsapp: normalizarWhatsapp(whatsapp),
    servico:   SERVICOS_PERMITIDOS[servico],
    servicoCodigo: servico,
    mensagem:  mensagem || 'Sem mensagem.',
    dataEnvio: formatarData(new Date()),
    origem:    'Website - Formulario de Contato',
    tokenSeguranca: token,
    tempoInicio: String(tempoInicio),
    nonceCliente: nonce,
  };
}

function validarEmail(email) {
  return email.length <= LIMITES_FORMULARIO.emailMax
    && /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)
    && !contemPadraoPerigoso(email);
}

function validarWhatsapp(numero) {
  const digitos = numero.replace(/\D/g, '').replace(/^00/, '');
  return digitos.length >= LIMITES_FORMULARIO.whatsappMin
    && digitos.length <= LIMITES_FORMULARIO.whatsappMax;
}

function validarNome(nome) {
  const letras = nome.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, '');
  return nome.length >= LIMITES_FORMULARIO.nomeMin
    && nome.length <= LIMITES_FORMULARIO.nomeMax
    && letras.length >= LIMITES_FORMULARIO.nomeMin
    && !/[<>{}\[\]\\]/.test(nome)
    && !contemPadraoPerigoso(nome);
}

function validarServico(servico) {
  return Object.prototype.hasOwnProperty.call(SERVICOS_PERMITIDOS, servico);
}

function validarMensagem(mensagem) {
  if (!mensagem) return true;
  return mensagem.length <= LIMITES_FORMULARIO.mensagemMax
    && contarLinks(mensagem) <= 2
    && !contemPadraoPerigoso(mensagem);
}

function validarProtecoesFormulario(formulario, honeypot, token, tempoInicio, nonce) {
  const statusEl = document.getElementById('formStatus');
  const idadeFormulario = Date.now() - tempoInicio;

  if (honeypot) {
    exibirStatus(statusEl, 'Nao foi possivel validar o envio.', 'erro');
    prepararProtecoesFormulario(formulario);
    return false;
  }

  if (token !== FORM_SECURITY_TOKEN || !validarNonce(nonce) || !Number.isFinite(idadeFormulario)) {
    exibirStatus(statusEl, 'Sessao do formulario invalida. Atualiza a pagina e tenta novamente.', 'erro');
    prepararProtecoesFormulario(formulario);
    return false;
  }

  if (idadeFormulario < FORM_SECURITY_MIN_MS) {
    exibirStatus(statusEl, 'Aguarda um instante antes de enviar.', 'aviso');
    return false;
  }

  if (idadeFormulario > FORM_SECURITY_MAX_MS) {
    exibirStatus(statusEl, 'Formulario expirado. Tenta novamente.', 'aviso');
    prepararProtecoesFormulario(formulario);
    return false;
  }

  return true;
}

function prepararProtecoesFormulario(formulario) {
  definirValorOculto(formulario, 'tokenSeguranca', FORM_SECURITY_TOKEN);
  definirValorOculto(formulario, 'tempoInicio', String(Date.now()));
  definirValorOculto(formulario, 'nonceCliente', gerarNonceCliente());
  definirValorOculto(formulario, 'empresa', '');
}

function definirValorOculto(formulario, nome, valor) {
  const campo = formulario.querySelector(`[name="${nome}"]`);
  if (campo) campo.value = valor;
}

function gerarNonceCliente() {
  if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
    const bytes = new Uint32Array(4);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, (parte) => parte.toString(16).padStart(8, '0')).join('');
  }

  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
}

function validarNonce(nonce) {
  return /^[a-f0-9]{16,64}$/i.test(nonce);
}

function sanitizarTextoCliente(valor, limite) {
  let texto = String(valor || '');
  if (typeof texto.normalize === 'function') {
    texto = texto.normalize('NFKC');
  }

  return texto
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limite);
}

function normalizarWhatsapp(numero) {
  const digitos = numero.replace(/\D/g, '').replace(/^00/, '');
  return `+${digitos}`;
}

function contarLinks(texto) {
  const matches = texto.match(/https?:\/\/|www\.|bit\.ly|tinyurl\.com/gi);
  return matches ? matches.length : 0;
}

function contemPadraoPerigoso(texto) {
  return /(<\s*script|javascript:|data:text\/html|on\w+\s*=|union\s+select|drop\s+table|insert\s+into|delete\s+from)/i.test(String(texto || ''));
}

function estaEmCooldownLocal() {
  try {
    const ultimoEnvio = Number(localStorage.getItem(STORAGE_ULTIMO_ENVIO) || 0);
    return Date.now() - ultimoEnvio < FORM_COOLDOWN_MS;
  } catch (erro) {
    return false;
  }
}

function registrarEnvioLocal() {
  try {
    localStorage.setItem(STORAGE_ULTIMO_ENVIO, String(Date.now()));
  } catch (erro) {
    // localStorage pode estar indisponivel em navegacao privada.
  }
}

function formatarData(data) {
  return data.toLocaleString('pt-AO', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}

/* ── 2. Orquestra o envio completo ────────── */
async function enviarLead(dadosLead, formulario) {
  const statusEl  = document.getElementById('formStatus');
  const btnSubmit = formulario.querySelector('button[type="submit"]');

  // Bloqueia o botão durante o envio
  definirEstadoBotao(btnSubmit, true);
  exibirStatus(statusEl, '⏳ A enviar os teus dados…', 'info');

  // Rastreio de conversão
  rastrearEvento('generate_lead', {
    event_category: 'Form',
    event_label:    'Contato Filho Rico Digital',
  });
  fbqRastrear('Lead');

  // Tenta salvar no Google Sheets
  const savedToSheets = await enviarParaGoogleSheets(dadosLead);

  // Independente do resultado do Sheets, abre o WhatsApp
  formulario.reset();
  prepararProtecoesFormulario(formulario);
  limparErros(formulario);

  if (savedToSheets) {
    exibirStatus(
      statusEl,
      '✅ Dados guardados com sucesso! A abrir o WhatsApp…',
      'sucesso'
    );
  } else {
    exibirStatus(
      statusEl,
      '⚠️ Não foi possível guardar no Sheets. A continuar pelo WhatsApp…',
      'aviso'
    );
  }

  // Pequena pausa para o utilizador ler o status antes do WhatsApp abrir
  setTimeout(() => {
    abrirWhatsAppComLead(dadosLead);
    definirEstadoBotao(btnSubmit, false);
  }, 1200);
}

/* ── 3. Envio para Google Sheets ──────────── */
/**
 * Envia os dados do lead para a Google Apps Script (Web App)
 * que escreve uma nova linha no Google Sheets.
 * Retorna true se salvou com sucesso, false em caso de erro.
 */
async function enviarParaGoogleSheets(dadosLead) {
  if (!GOOGLE_SHEETS_URL || GOOGLE_SHEETS_URL === 'COLA_AQUI_A_URL_DO_GOOGLE_APPS_SCRIPT') {
    console.warn('[Filho Rico] URL do Google Sheets não configurada. Consulta o ficheiro google-apps-script.js.');
    return false;
  }

  try {
    // Google Apps Script exige o envio via URLSearchParams (form-urlencoded)
    // para ser lido com e.parameter dentro do doPost
    const corpo = new URLSearchParams({
      nome:      dadosLead.nome,
      email:     dadosLead.email,
      whatsapp:  dadosLead.whatsapp,
      servico:   dadosLead.servicoCodigo,
      mensagem:  dadosLead.mensagem,
      dataEnvio: dadosLead.dataEnvio,
      origem:    dadosLead.origem,
      tokenSeguranca: dadosLead.tokenSeguranca,
      tempoInicio: dadosLead.tempoInicio,
      nonceCliente: dadosLead.nonceCliente,
      empresa: '',
    });

    const resposta = await fetch(GOOGLE_SHEETS_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    corpo.toString(),
    });

    if (!resposta.ok) return false;

    const json = await resposta.json();
    if (json.resultado !== 'sucesso') {
      console.warn('[Filho Rico] Pedido recusado pelo Apps Script:', json.mensagem);
    }

    return json.resultado === 'sucesso';

  } catch (erro) {
    console.error('[Filho Rico] Erro ao enviar para Google Sheets:', erro);
    return false;
  }
}

/* ── 4. Mensagem WhatsApp formatada ──────── */
function abrirWhatsAppComLead(dadosLead) {
  const linhas = [
    '━━━━━━━━━━━━━━━━━━━━━━',
    '📋 *NOVO LEAD — Filho Rico Digital*',
    '━━━━━━━━━━━━━━━━━━━━━━',
    `👤 *Nome:*      ${dadosLead.nome}`,
    `📧 *Email:*     ${dadosLead.email}`,
    `📱 *WhatsApp:*  ${dadosLead.whatsapp}`,
    `🛒 *Serviço:*   ${dadosLead.servico}`,
    `💬 *Mensagem:*  ${dadosLead.mensagem}`,
    `📅 *Data:*      ${dadosLead.dataEnvio}`,
    `🌐 *Origem:*    ${dadosLead.origem}`,
    '━━━━━━━━━━━━━━━━━━━━━━',
  ];

  abrirWhatsApp(linhas.join('\n'));
}

/* ── Helpers de UI ───────────────────────── */
function mostrarErro(idElemento, mensagem) {
  const el = document.getElementById(idElemento);
  if (el) el.textContent = mensagem;
}

function limparErros(formulario) {
  formulario.querySelectorAll('.erro-campo').forEach((el) => {
    el.textContent = '';
  });
}

function exibirStatus(elemento, mensagem, tipo) {
  if (!elemento) return;
  elemento.textContent = mensagem;
  elemento.className   = `status-${tipo}`;
  elemento.style.display = 'block';
}

function definirEstadoBotao(botao, desativado) {
  if (!botao) return;
  botao.disabled     = desativado;
  botao.textContent  = desativado ? 'A enviar…' : 'Solicitar Análise Gratuita';
  botao.style.opacity = desativado ? '0.6' : '1';
}
