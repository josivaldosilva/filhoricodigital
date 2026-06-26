# 🚀 Sistema de Captura de Leads + Automação WhatsApp

Sistema simples e eficiente para captura, organização e automação de leads através de formulários web, integrado com Google Sheets e notificação via WhatsApp.

---

## 📌 Visão Geral

Este projeto tem como objetivo automatizar o processo de captação de clientes em sites e landing pages.

Quando um usuário preenche o formulário:

- Os dados são enviados automaticamente para o Google Sheets
- O lead é armazenado com data e hora
- Uma notificação pode ser enviada via WhatsApp (opcional)
- O sistema organiza os contatos para follow-up

---

## ⚙️ Funcionalidades

- 📥 Captura de leads via formulário HTML
- 📊 Armazenamento automático no Google Sheets
- ⏱ Registro de data e hora do envio
- 📱 Integração com WhatsApp (via link de mensagem)
- 🧠 Estrutura simples e escalável
- 🌐 Pronto para uso em landing pages

---

## 🧱 Arquitetura do Sistema


---

## 🛠️ Tecnologias Utilizadas

- HTML5
- JavaScript (Vanilla)
- Google Apps Script
- Google Sheets API
- WhatsApp API (via link wa.me)

---

## 📦 Estrutura da Planilha

A planilha de leads contém:

| Data | Nome | Telefone | Serviço | Mensagem | Origem |
|------|------|----------|----------|----------|--------|

---

## 🔐 Segurança do Formulário

O projeto inclui validação em duas camadas:

- Token de segurança enviado pelo formulário e validado no Apps Script
- Honeypot anti-bot, nonce de uso único e tempo mínimo de preenchimento
- Rate limit por email e WhatsApp no Apps Script
- Allowlist de serviços, validação de email/telefone e limites de tamanho
- Sanitização de HTML/padrões suspeitos e proteção contra formula injection no Google Sheets

Antes de publicar, troca `FORM_SECURITY_TOKEN` em `script.js` e `SECURITY_TOKEN` em `google-apps-script.js` pelo mesmo valor novo. Depois faz uma nova versão da implementação no Google Apps Script.

---

## 🚀 Como Funciona

1. O usuário preenche o formulário no site
2. Os dados são enviados via `fetch()` para o Apps Script
3. O script grava os dados no Google Sheets
4. O sistema pode abrir WhatsApp com mensagem pré-preenchida

---

## 📍 Exemplo de Uso

Este sistema pode ser usado em:

- Landing pages de serviços
- Negócios locais
- Freelancers
- Agências digitais
- Captação de clientes via anúncios

---

## 💡 Melhorias Futuras

- Dashboard com React para visualização de leads
- Sistema de login para usuários
- Status de leads (Novo, Contactado, Fechado)
- Automação completa de follow-up
- Integração com CRM

---

## 👨‍💻 Autor

Desenvolvido por Josivaldo e Arquilis Miguel  
Projeto de estudo e aplicação prática em automação de leads e web systems.

---

## 📌 Nota

Este projeto não utiliza banco de dados tradicional.  
Toda a persistência de dados é feita via Google Sheets.

---
