import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase/client';
import { Shield, Check, X, Info, Eye, Download, Trash2 } from 'lucide-react';

interface ConsentOption {
  id: string;
  title: string;
  description: string;
  required: boolean;
  purpose: string;
}

interface LGPDConsentProps {
  onConsentGiven: (consents: Record<string, boolean>) => void;
  showDataControls?: boolean;
  userEmail?: string;
}

const CONSENT_OPTIONS: ConsentOption[] = [
  {
    id: 'data_processing',
    title: 'Processamento de Dados Pessoais',
    description: 'Autorizo o processamento dos meus dados pessoais para participação na pesquisa.',
    required: true,
    purpose: 'Necessário para coleta e análise das respostas da pesquisa'
  },
  {
    id: 'data_storage',
    title: 'Armazenamento de Dados',
    description: 'Concordo com o armazenamento seguro dos meus dados durante o período necessário.',
    required: true,
    purpose: 'Armazenamento seguro para análise posterior e conformidade legal'
  },
  {
    id: 'analytics',
    title: 'Análise e Relatórios',
    description: 'Permito o uso dos meus dados para geração de relatórios e análises agregadas.',
    required: false,
    purpose: 'Geração de insights e relatórios para melhoria dos serviços'
  },
  {
    id: 'communication',
    title: 'Comunicação sobre Resultados',
    description: 'Aceito receber comunicações sobre os resultados da pesquisa (opcional).',
    required: false,
    purpose: 'Envio de resultados e atualizações sobre a pesquisa'
  }
];

export const LGPDConsent: React.FC<LGPDConsentProps> = ({ 
  onConsentGiven, 
  showDataControls = false,
  userEmail 
}) => {
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [showDataControlsPanel, setShowDataControlsPanel] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);

  useEffect(() => {
    // Inicializar consents com valores padrão
    const initialConsents: Record<string, boolean> = {};
    CONSENT_OPTIONS.forEach(option => {
      initialConsents[option.id] = option.required;
    });
    setConsents(initialConsents);
  }, []);

  const handleConsentChange = (optionId: string, value: boolean) => {
    setConsents(prev => ({
      ...prev,
      [optionId]: value
    }));
  };

  const canSubmit = () => {
    return CONSENT_OPTIONS
      .filter(option => option.required)
      .every(option => consents[option.id]);
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;

    setIsSubmitting(true);
    try {
      // Registrar consentimento no audit log
      const { error } = await supabase
        .from('audit_log')
        .insert({
          table_name: 'lgpd_consent',
          operation: 'consent_given',
          old_data: null,
          new_data: {
            consents,
            timestamp: new Date().toISOString(),
            user_email: userEmail,
            ip_address: 'client_side', // Em produção, capturar do servidor
            user_agent: navigator.userAgent
          },
          user_id: null, // Será preenchido pelo trigger se houver usuário autenticado
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Erro ao registrar consentimento:', error);
        throw error;
      }

      onConsentGiven(consents);
    } catch (error) {
      console.error('Erro ao processar consentimento:', error);
      alert('Erro ao processar consentimento. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadUserData = async () => {
    if (!userEmail) return;

    setIsLoadingData(true);
    try {
      // Buscar dados do usuário em todas as tabelas relevantes
      const [responsesResult, magicLinksResult, auditLogResult] = await Promise.all([
        supabase
          .from('responses')
          .select('*')
          .eq('email', userEmail),
        supabase
          .from('magic_links')
          .select('*')
          .eq('email', userEmail),
        supabase
          .from('audit_log')
          .select('*')
          .eq('new_data->>user_email', userEmail)
      ]);

      setUserData({
        responses: responsesResult.data || [],
        magicLinks: magicLinksResult.data || [],
        auditLogs: auditLogResult.data || []
      });
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const exportUserData = () => {
    if (!userData) return;

    const dataToExport = {
      email: userEmail,
      exportDate: new Date().toISOString(),
      data: userData
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meus-dados-${userEmail}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const deleteUserData = async () => {
    if (!userEmail || !confirm('Tem certeza que deseja excluir todos os seus dados? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      // Registrar solicitação de exclusão
      await supabase
        .from('audit_log')
        .insert({
          table_name: 'data_deletion_request',
          operation: 'delete_request',
          old_data: null,
          new_data: {
            user_email: userEmail,
            timestamp: new Date().toISOString(),
            status: 'pending'
          },
          user_id: null,
          created_at: new Date().toISOString()
        });

      alert('Solicitação de exclusão registrada. Seus dados serão removidos em até 30 dias conforme a LGPD.');
    } catch (error) {
      console.error('Erro ao solicitar exclusão:', error);
      alert('Erro ao processar solicitação. Tente novamente.');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">
          Consentimento LGPD
        </h2>
      </div>

      <div className="mb-6">
        <p className="text-gray-600 mb-4">
          Para participar desta pesquisa, precisamos do seu consentimento para o tratamento dos seus dados pessoais, 
          conforme a Lei Geral de Proteção de Dados (LGPD).
        </p>
        <p className="text-sm text-gray-500">
          Você pode revogar seu consentimento a qualquer momento através dos controles de dados abaixo.
        </p>
      </div>

      <div className="space-y-4 mb-6">
        {CONSENT_OPTIONS.map((option) => (
          <div key={option.id} className="border rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex items-center h-5">
                <input
                  id={option.id}
                  type="checkbox"
                  checked={consents[option.id] || false}
                  onChange={(e) => handleConsentChange(option.id, e.target.checked)}
                  disabled={option.required}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <label htmlFor={option.id} className="text-sm font-medium text-gray-900 cursor-pointer">
                  {option.title}
                  {option.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <p className="text-sm text-gray-600 mt-1">
                  {option.description}
                </p>
                <button
                  onClick={() => setShowDetails(showDetails === option.id ? null : option.id)}
                  className="text-xs text-blue-600 hover:text-blue-800 mt-1 flex items-center gap-1"
                >
                  <Info className="w-3 h-3" />
                  {showDetails === option.id ? 'Ocultar detalhes' : 'Ver detalhes'}
                </button>
                {showDetails === option.id && (
                  <div className="mt-2 p-3 bg-blue-50 rounded text-sm text-blue-800">
                    <strong>Finalidade:</strong> {option.purpose}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit() || isSubmitting}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            canSubmit() && !isSubmitting
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processando...
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <Check className="w-4 h-4" />
              Aceitar e Continuar
            </div>
          )}
        </button>

        {showDataControls && userEmail && (
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Controles de Dados Pessoais</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setShowDataControlsPanel(!showDataControlsPanel);
                  if (!showDataControlsPanel) loadUserData();
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Eye className="w-4 h-4" />
                Ver Meus Dados
              </button>
              <button
                onClick={exportUserData}
                disabled={!userData}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-green-100 hover:bg-green-200 text-green-800 rounded-lg transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Exportar Dados
              </button>
              <button
                onClick={deleteUserData}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-red-100 hover:bg-red-200 text-red-800 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Excluir Dados
              </button>
            </div>

            {showDataControlsPanel && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                {isLoadingData ? (
                  <div className="text-center py-4">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Carregando seus dados...</p>
                  </div>
                ) : userData ? (
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Resumo dos Dados</h4>
                      <ul className="text-sm text-gray-600 mt-1">
                        <li>• Respostas de pesquisas: {userData.responses?.length || 0}</li>
                        <li>• Magic links: {userData.magicLinks?.length || 0}</li>
                        <li>• Logs de auditoria: {userData.auditLogs?.length || 0}</li>
                      </ul>
                    </div>
                    <p className="text-xs text-gray-500">
                      Para ver detalhes completos, use o botão "Exportar Dados" acima.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">Clique em "Ver Meus Dados" para carregar as informações.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 text-xs text-gray-500">
        <p>
          * Campos obrigatórios. Ao continuar, você concorda com nossa{' '}
          <a href="/privacy-policy" className="text-blue-600 hover:text-blue-800 underline">
            Política de Privacidade
          </a>
          .
        </p>
      </div>
    </div>
  );
};

export default LGPDConsent;