# Sentiment CX - Plataforma de Análise de Sentimentos

## 📊 Descrição do Projeto

Sentiment CX é uma plataforma avançada de análise de sentimentos para pesquisas e questionários, oferecendo diferentes níveis de análise através de planos especializados. A plataforma utiliza tecnologias modernas para fornecer insights detalhados sobre feedback de clientes e análise de dados.

## ✨ Funcionalidades Principais

- **Análise de Sentimentos Avançada**: Processamento de texto com classificação de sentimentos (positivo, neutro, negativo)
- **Dashboards Interativos**: Visualizações modernas com ApexCharts
- **Múltiplos Planos de Análise**:
  - **Start Quantico**: Análise estatística básica
  - **Vortex Neural**: Análise intermediária com correlações
  - **Nexus Infinito**: Análise avançada com IA
- **Gestão de Pesquisas**: Criação e gerenciamento de questionários
- **Relatórios Exportáveis**: Dados em diversos formatos
- **Sistema de Autenticação**: Login seguro com diferentes níveis de acesso
- **Integração com Stripe**: Sistema de pagamentos para planos premium

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Gráficos**: ApexCharts
- **Backend**: Supabase (Database + Auth + Storage)
- **Pagamentos**: Stripe
- **Deploy**: Vercel
- **Gerenciamento de Estado**: React Hooks + Context API
- **Roteamento**: React Router DOM

## 📋 Pré-requisitos

- Node.js (versão 18 ou superior)
- npm ou yarn
- Conta no Supabase
- Conta no Stripe (para funcionalidades de pagamento)
- Git

## 🚀 Instalação

### 1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/sentiment-cx.git
cd sentiment-cx
```

### 2. Instale as dependências
```bash
npm install
# ou
yarn install
```

### 3. Configure as variáveis de ambiente
Crie um arquivo `.env` na raiz do projeto baseado no `.env.example`:

```env
# Supabase
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_do_supabase

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=sua_chave_publica_do_stripe
STRIPE_SECRET_KEY=sua_chave_secreta_do_stripe
STRIPE_WEBHOOK_SECRET=seu_webhook_secret_do_stripe

# URLs
VITE_APP_URL=http://localhost:8080
```

### 4. Configure o banco de dados
Execute as migrações do Supabase:
```bash
npm run supabase:migrate
```

## ▶️ Como Executar

### Desenvolvimento
```bash
npm run dev
```
A aplicação estará disponível em `http://localhost:8080`

### Build para produção
```bash
npm run build
```

### Preview da build
```bash
npm run preview
```

## 📁 Estrutura do Projeto

```
src/
├── components/          # Componentes React
│   ├── ui/             # Componentes de UI (shadcn)
│   ├── charts/         # Componentes de gráficos
│   ├── AnalyticsDashboard.tsx
│   ├── StartQuanticoAnalytics.tsx
│   ├── VortexNeuralAnalytics.tsx
│   └── NexusInfinitoAnalytics.tsx
├── pages/              # Páginas da aplicação
├── hooks/              # Custom hooks
├── lib/                # Utilitários e configurações
├── utils/              # Funções utilitárias
├── integrations/       # Integrações (Supabase)
└── config/             # Configurações
```

## 📊 Planos Disponíveis

### 🟢 Start Quantico
- Análise estatística básica (média, mediana, moda)
- Análise de sentimentos simples
- Gráficos básicos (barras, pizza)
- Até 100 respostas por mês

### 🔵 Vortex Neural
- Análise estatística intermediária
- Análise de correlações
- Análise temática de sentimentos
- Detecção de outliers
- Gráficos avançados
- Até 1000 respostas por mês

### 🟣 Nexus Infinito
- Análise avançada com IA
- Machine Learning para insights
- Análise preditiva
- Relatórios personalizados
- Respostas ilimitadas

## 💡 Como Usar a Plataforma

### 1. Criar Conta
- Acesse a página de registro
- Escolha seu plano
- Complete o processo de pagamento (se aplicável)

### 2. Criar Pesquisa
- Acesse o dashboard
- Clique em "Nova Pesquisa"
- Configure suas perguntas
- Publique e compartilhe o link

### 3. Analisar Resultados
- Acesse a seção "Relatórios"
- Visualize os dashboards interativos
- Exporte dados conforme necessário

## 🌐 Deploy

### Vercel (Recomendado)
1. Conecte seu repositório ao Vercel
2. Configure as variáveis de ambiente
3. Deploy automático a cada push

### Outras plataformas
A aplicação é compatível com:
- Netlify
- Railway
- Render
- AWS Amplify

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### Padrões de Código
- Use TypeScript para type safety
- Siga as convenções do ESLint
- Mantenha componentes pequenos e focados
- Documente funções complexas

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📞 Suporte

Para suporte técnico ou dúvidas:
- Abra uma issue no GitHub
- Entre em contato: suporte@sentimentcx.com

## 🔄 Changelog

### v1.0.0
- Implementação inicial da plataforma
- Sistema de autenticação
- Três planos de análise
- Dashboards interativos com ApexCharts
- Integração com Stripe

---

**Desenvolvido com ❤️ para análise de sentimentos inteligente**