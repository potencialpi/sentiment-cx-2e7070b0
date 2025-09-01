import React from 'react';
import { Shield, Mail, Database, Clock, Users, FileText, AlertCircle } from 'lucide-react';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center gap-3 mb-8">
            <Shield className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Política de Privacidade
            </h1>
          </div>

          <div className="prose max-w-none">
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-8">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-blue-800 font-medium">
                    Esta política está em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018)
                  </p>
                  <p className="text-blue-700 text-sm mt-1">
                    Última atualização: {new Date().toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            </div>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-600" />
                1. Informações Gerais
              </h2>
              <p className="text-gray-700 mb-4">
                O <strong>Sentiment CX</strong> é uma plataforma de pesquisa de satisfação que coleta e processa dados pessoais 
                para fornecer insights sobre a experiência do cliente. Esta política descreve como coletamos, usamos, 
                armazenamos e protegemos suas informações pessoais.
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Controlador de Dados:</h3>
                <p className="text-gray-700">
                  [Nome da Empresa]<br />
                  [Endereço completo]<br />
                  [E-mail de contato]<br />
                  [Telefone]
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Database className="w-6 h-6 text-blue-600" />
                2. Dados Coletados
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">2.1 Dados Fornecidos Diretamente</h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    <li><strong>E-mail:</strong> Para envio de magic links e comunicação</li>
                    <li><strong>Respostas da pesquisa:</strong> Avaliações, comentários e feedback</li>
                    <li><strong>Dados de contato:</strong> Quando fornecidos voluntariamente</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">2.2 Dados Coletados Automaticamente</h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    <li><strong>Dados técnicos:</strong> Endereço IP, navegador, sistema operacional</li>
                    <li><strong>Dados de uso:</strong> Páginas visitadas, tempo de permanência, cliques</li>
                    <li><strong>Cookies:</strong> Para melhorar a experiência do usuário</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-600" />
                3. Finalidades do Tratamento
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-2">Finalidades Primárias</h3>
                  <ul className="text-green-700 text-sm space-y-1">
                    <li>• Coleta de feedback e avaliações</li>
                    <li>• Geração de relatórios de satisfação</li>
                    <li>• Autenticação via magic links</li>
                    <li>• Comunicação sobre a pesquisa</li>
                  </ul>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">Finalidades Secundárias</h3>
                  <ul className="text-blue-700 text-sm space-y-1">
                    <li>• Análises estatísticas agregadas</li>
                    <li>• Melhoria da plataforma</li>
                    <li>• Prevenção de fraudes</li>
                    <li>• Cumprimento de obrigações legais</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-6 h-6 text-blue-600" />
                4. Base Legal
              </h2>
              <div className="space-y-3">
                <div className="border-l-4 border-green-400 pl-4">
                  <h3 className="font-semibold text-gray-800">Consentimento (Art. 7º, I)</h3>
                  <p className="text-gray-700 text-sm">
                    Para coleta de respostas de pesquisa e comunicações opcionais
                  </p>
                </div>
                <div className="border-l-4 border-blue-400 pl-4">
                  <h3 className="font-semibold text-gray-800">Legítimo Interesse (Art. 7º, IX)</h3>
                  <p className="text-gray-700 text-sm">
                    Para análises estatísticas, melhoria da plataforma e prevenção de fraudes
                  </p>
                </div>
                <div className="border-l-4 border-purple-400 pl-4">
                  <h3 className="font-semibold text-gray-800">Cumprimento de Obrigação Legal (Art. 7º, II)</h3>
                  <p className="text-gray-700 text-sm">
                    Para atendimento de determinações judiciais e fiscais
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="w-6 h-6 text-blue-600" />
                5. Retenção de Dados
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Tipo de Dado</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Período de Retenção</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Justificativa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-4 py-3 text-sm text-gray-700">Respostas de pesquisa</td>
                      <td className="px-4 py-3 text-sm text-gray-700">2 anos</td>
                      <td className="px-4 py-3 text-sm text-gray-700">Análises longitudinais</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm text-gray-700">Magic links</td>
                      <td className="px-4 py-3 text-sm text-gray-700">7 dias após expiração</td>
                      <td className="px-4 py-3 text-sm text-gray-700">Auditoria de segurança</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm text-gray-700">Logs de auditoria</td>
                      <td className="px-4 py-3 text-sm text-gray-700">5 anos</td>
                      <td className="px-4 py-3 text-sm text-gray-700">Conformidade legal</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm text-gray-700">Dados técnicos</td>
                      <td className="px-4 py-3 text-sm text-gray-700">1 ano</td>
                      <td className="px-4 py-3 text-sm text-gray-700">Segurança e performance</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Mail className="w-6 h-6 text-blue-600" />
                6. Seus Direitos
              </h2>
              <p className="text-gray-700 mb-4">
                Conforme a LGPD, você possui os seguintes direitos em relação aos seus dados pessoais:
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="bg-blue-50 p-3 rounded">
                    <h3 className="font-semibold text-blue-800">Acesso</h3>
                    <p className="text-blue-700 text-sm">Confirmar a existência e acessar seus dados</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded">
                    <h3 className="font-semibold text-green-800">Correção</h3>
                    <p className="text-green-700 text-sm">Corrigir dados incompletos ou inexatos</p>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded">
                    <h3 className="font-semibold text-yellow-800">Anonimização</h3>
                    <p className="text-yellow-700 text-sm">Solicitar anonimização dos dados</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded">
                    <h3 className="font-semibold text-purple-800">Portabilidade</h3>
                    <p className="text-purple-700 text-sm">Exportar dados em formato estruturado</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="bg-red-50 p-3 rounded">
                    <h3 className="font-semibold text-red-800">Eliminação</h3>
                    <p className="text-red-700 text-sm">Excluir dados desnecessários ou excessivos</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <h3 className="font-semibold text-gray-800">Informação</h3>
                    <p className="text-gray-700 text-sm">Obter informações sobre o tratamento</p>
                  </div>
                  <div className="bg-indigo-50 p-3 rounded">
                    <h3 className="font-semibold text-indigo-800">Revogação</h3>
                    <p className="text-indigo-700 text-sm">Revogar consentimento a qualquer momento</p>
                  </div>
                  <div className="bg-pink-50 p-3 rounded">
                    <h3 className="font-semibold text-pink-800">Oposição</h3>
                    <p className="text-pink-700 text-sm">Opor-se ao tratamento em certas situações</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Segurança</h2>
              <p className="text-gray-700 mb-4">
                Implementamos medidas técnicas e organizacionais adequadas para proteger seus dados pessoais:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Criptografia de dados em trânsito e em repouso</li>
                <li>Controle de acesso baseado em funções (RBAC)</li>
                <li>Monitoramento e logs de auditoria</li>
                <li>Backups seguros e plano de recuperação</li>
                <li>Treinamento regular da equipe</li>
                <li>Avaliações periódicas de segurança</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Compartilhamento</h2>
              <p className="text-gray-700 mb-4">
                Seus dados pessoais não são vendidos, alugados ou compartilhados com terceiros, exceto:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Com seu consentimento explícito</li>
                <li>Para cumprimento de obrigações legais</li>
                <li>Com prestadores de serviços sob contrato de confidencialidade</li>
                <li>Em caso de fusão, aquisição ou venda de ativos (com notificação prévia)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Cookies</h2>
              <p className="text-gray-700 mb-4">
                Utilizamos cookies para melhorar sua experiência. Você pode gerenciar suas preferências de cookies 
                através das configurações do seu navegador.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 text-sm">
                  <strong>Nota:</strong> Alguns cookies são essenciais para o funcionamento da plataforma e não podem ser desabilitados.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Contato</h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-blue-900 mb-3">Para exercer seus direitos ou esclarecer dúvidas:</h3>
                <div className="space-y-2 text-blue-800">
                  <p><strong>E-mail:</strong> privacidade@[empresa].com</p>
                  <p><strong>Telefone:</strong> [telefone]</p>
                  <p><strong>Endereço:</strong> [endereço completo]</p>
                </div>
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">Encarregado de Dados (DPO):</h4>
                  <p className="text-blue-800">
                    <strong>Nome:</strong> [Nome do DPO]<br />
                    <strong>E-mail:</strong> dpo@[empresa].com
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Alterações</h2>
              <p className="text-gray-700">
                Esta política pode ser atualizada periodicamente. Notificaremos sobre mudanças significativas 
                através do e-mail cadastrado ou por meio de aviso em nossa plataforma. A versão mais atual 
                estará sempre disponível nesta página.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;