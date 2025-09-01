# 📧 Configuração de E-mail para Magic Links

## 🚨 PROBLEMA IDENTIFICADO

O sistema de Magic Links está **funcionando corretamente** - os tokens são gerados e armazenados no banco de dados. Porém, **os e-mails não estão sendo enviados** devido às limitações do SMTP padrão do Supabase.

## 📋 CAUSA RAIZ

O Supabase fornece um servidor SMTP padrão com **restrições importantes**:

### ⚠️ Limitações do SMTP Padrão:
1. **Apenas endereços autorizados**: Só envia e-mails para membros da equipe do projeto
2. **Rate limit baixo**: Máximo de 2 e-mails por hora
3. **Não é para produção**: Destinado apenas para testes e desenvolvimento

### 🔍 Como Verificar:
- Acesse: [Supabase Dashboard](https://supabase.com/dashboard) → Seu Projeto → Settings → Team
- Verifique se o e-mail de teste está na lista de membros da equipe
- Se não estiver, o Supabase **recusará** enviar o e-mail

## 🛠️ SOLUÇÕES

### 🎯 SOLUÇÃO 1: Teste com E-mail Autorizado

**Para testar imediatamente:**
1. Acesse o Dashboard do Supabase
2. Vá em **Settings** → **Team**
3. Adicione o e-mail de teste como membro da equipe
4. Teste novamente o Magic Link

### 🎯 SOLUÇÃO 2: Configurar SMTP Customizado (Recomendado)

**Para uso em produção, configure um provedor de e-mail:**

#### Provedores Recomendados:
- **Resend** (mais fácil de configurar)
- **SendGrid**
- **AWS SES**
- **Postmark**
- **Brevo**

#### Passos para Configuração:

1. **Criar conta no provedor** (ex: Resend)
2. **Obter credenciais SMTP**:
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend`
   - Password: `SUA_API_KEY`

3. **Configurar no Supabase**:
   - Dashboard → Project Settings → Authentication
   - Encontre "SMTP Settings"
   - Toggle "Enable Custom SMTP"
   - Preencha as credenciais
   - Defina o e-mail remetente (ex: `noreply@seudominio.com`)

4. **Ajustar Rate Limits**:
   - Authentication → Rate Limits
   - Aumentar limite de e-mails por hora conforme necessário

### 🎯 SOLUÇÃO 3: Implementar Envio na Edge Function

Alternativamente, podemos modificar a Edge Function para enviar e-mails diretamente:

```typescript
// Adicionar ao magic-link/index.ts
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

// Função para enviar e-mail
async function sendMagicLinkEmail(email: string, magicLink: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'noreply@seudominio.com',
      to: email,
      subject: 'Seu Magic Link para Pesquisa',
      html: `
        <h2>Acesse sua Pesquisa</h2>
        <p>Clique no link abaixo para acessar a pesquisa:</p>
        <p><a href="${magicLink}">Acessar Pesquisa</a></p>
        <p>Este link expira em 24 horas.</p>
      `,
    }),
  });
  
  return res.json();
}
```

## 🧪 TESTE RÁPIDO

### Para testar agora mesmo:

1. **Adicione seu e-mail à equipe**:
   ```
   Dashboard → Settings → Team → Invite Member
   ```

2. **Execute o teste**:
   ```bash
   node test_magic_link_complete.cjs
   ```

3. **Verifique sua caixa de entrada** (incluindo spam)

## 📊 STATUS ATUAL

✅ **Magic Link Generation**: Funcionando  
✅ **Database Storage**: Funcionando  
✅ **Token Validation**: Funcionando  
❌ **Email Sending**: Bloqueado por restrições SMTP  

## 🔄 PRÓXIMOS PASSOS

1. **Imediato**: Adicionar e-mail de teste à equipe do projeto
2. **Curto prazo**: Configurar SMTP customizado (Resend recomendado)
3. **Longo prazo**: Implementar templates de e-mail personalizados

## 📞 SUPORTE

Se precisar de ajuda com a configuração:
- [Documentação Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Guia Resend + Supabase](https://resend.com/docs/send-with-supabase-smtp)

---

**💡 Dica**: Para desenvolvimento, adicione seu e-mail à equipe. Para produção, configure SMTP customizado.