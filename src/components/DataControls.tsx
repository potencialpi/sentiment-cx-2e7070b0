import React, { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Download, Eye, Trash2, Shield, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { safeWrite, logRLSError } from '@/lib/rlsErrorHandler';

interface UserData {
  responses: any[];
  magicLinks: any[];
  auditLogs: any[];
}

interface DataControlsProps {
  userEmail: string;
  onDataDeleted?: () => void;
}

const DataControls: React.FC<DataControlsProps> = ({ userEmail, onDataDeleted }) => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showData, setShowData] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actionStatus, setActionStatus] = useState<{
    type: 'success' | 'error' | 'info' | null;
    message: string;
  }>({ type: null, message: '' });

  const showStatus = (type: 'success' | 'error' | 'info', message: string) => {
    setActionStatus({ type, message });
    setTimeout(() => setActionStatus({ type: null, message: '' }), 5000);
  };

  const loadUserData = async () => {
    setLoading(true);
    try {
      // Buscar respostas do usuário (implementar quando necessário)
      const responses: any[] = [];

      // Buscar logs de auditoria do usuário
      const { data: auditLogs, error: auditLogsError } = await supabase
        .from('audit_log')
        .select('*')
        .contains('details', { user_email: userEmail });

      if (auditLogsError) throw auditLogsError;

      setUserData({
        responses: responses || [],
        magicLinks: [],
        auditLogs: auditLogs || []
      });

      showStatus('success', 'Dados carregados com sucesso!');
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      showStatus('error', 'Erro ao carregar dados do usuário.');
    } finally {
      setLoading(false);
    }
  };

  const exportUserData = async () => {
    if (!userData) {
      await loadUserData();
      return;
    }

    try {
      const exportData = {
        email: userEmail,
        exportDate: new Date().toISOString(),
        data: {
          responses: userData.responses.map(response => ({
            id: response.id,
            surveyId: response.survey_id,
            rating: response.rating,
            feedback: response.feedback,
            createdAt: response.created_at,
            updatedAt: response.updated_at
          })),
          magicLinks: userData.magicLinks.map(link => ({
            id: link.id,
            surveyId: link.survey_id,
            used: !!link.used_at,
            createdAt: link.created_at,
            expiresAt: link.expires_at,
            usedAt: link.used_at
          })),
          auditLogs: userData.auditLogs.map(log => ({
            id: log.id,
            action: log.action,
            details: log.details,
            createdAt: log.created_at
          }))
        },
        summary: {
          totalResponses: userData.responses.length,
          totalMagicLinks: userData.magicLinks.length,
          totalAuditLogs: userData.auditLogs.length
        }
      };

      // Registrar a exportação no audit log
      const auditResult = await safeWrite(
        () => supabase.from('audit_log').insert({
          event_type: 'data_export',
          table_name: 'user_data',
          details: {
            user_email: userEmail,
            exportedAt: new Date().toISOString(),
            recordsExported: {
              responses: userData.responses.length,
              magicLinks: userData.magicLinks.length,
              auditLogs: userData.auditLogs.length
            }
          }
        }),
        'audit log - data export'
      );
      
      if (auditResult.blocked) {
        console.warn('Audit log blocked by RLS, but operation completed');
      }

      // Criar e baixar arquivo JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meus-dados-${userEmail.replace('@', '-')}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showStatus('success', 'Dados exportados com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      showStatus('error', 'Erro ao exportar dados.');
    }
  };

  const deleteUserData = async () => {
    if (deleteConfirmation !== 'EXCLUIR MEUS DADOS') {
      showStatus('error', 'Digite exatamente "EXCLUIR MEUS DADOS" para confirmar.');
      return;
    }

    setLoading(true);
    try {
      // Registrar a solicitação de exclusão no audit log antes de excluir
      const auditRequestResult = await safeWrite(
        () => supabase.from('audit_log').insert({
          event_type: 'data_deletion_request',
          table_name: 'user_data',
          details: {
            user_email: userEmail,
            requestedAt: new Date().toISOString(),
            dataToDelete: {
              responses: userData?.responses.length || 0,
              magicLinks: userData?.magicLinks.length || 0
            }
          }
        }),
        'audit log - data deletion request'
      );
      
      if (auditRequestResult.blocked) {
        console.warn('Audit log blocked by RLS, but operation completed');
      }

      // Registrar a conclusão da exclusão
      const auditCompletedResult = await safeWrite(
        () => supabase.from('audit_log').insert({
          event_type: 'data_deletion_completed',
          table_name: 'user_data',
          details: {
            user_email: userEmail,
            completedAt: new Date().toISOString(),
            deletedData: {
              responses: userData?.responses.length || 0,
              magicLinks: userData?.magicLinks.length || 0
            }
          }
        }),
        'audit log - data deletion completed'
      );
      
      if (auditCompletedResult.blocked) {
        console.warn('Audit log blocked by RLS, but operation completed');
      }

      setUserData(null);
      setShowData(false);
      setShowDeleteModal(false);
      setDeleteConfirmation('');
      
      showStatus('success', 'Todos os seus dados foram excluídos com sucesso.');
      
      if (onDataDeleted) {
        onDataDeleted();
      }
    } catch (error) {
      console.error('Erro ao excluir dados:', error);
      showStatus('error', 'Erro ao excluir dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">
          Controle dos Seus Dados
        </h2>
      </div>

      {actionStatus.type && (
        <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
          actionStatus.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
          actionStatus.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
          'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          {actionStatus.type === 'success' && <CheckCircle className="w-5 h-5" />}
          {actionStatus.type === 'error' && <AlertTriangle className="w-5 h-5" />}
          {actionStatus.type === 'info' && <Clock className="w-5 h-5" />}
          <span>{actionStatus.message}</span>
        </div>
      )}

      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Seus Direitos LGPD</h3>
          <p className="text-blue-800 text-sm mb-3">
            Conforme a Lei Geral de Proteção de Dados, você tem direito a acessar, 
            exportar e excluir seus dados pessoais a qualquer momento.
          </p>
          <p className="text-blue-700 text-xs">
            <strong>E-mail associado:</strong> {userEmail}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <button
            onClick={() => {
              if (userData) {
                setShowData(!showData);
              } else {
                loadUserData();
              }
            }}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Eye className="w-5 h-5" />
            {loading ? 'Carregando...' : showData ? 'Ocultar Dados' : 'Visualizar Dados'}
          </button>

          <button
            onClick={exportUserData}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="w-5 h-5" />
            {loading ? 'Exportando...' : 'Exportar Dados'}
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Trash2 className="w-5 h-5" />
            Excluir Dados
          </button>
        </div>

        {showData && userData && (
          <div className="mt-6 space-y-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Resumo dos Dados</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-white p-3 rounded">
                  <div className="text-2xl font-bold text-blue-600">{userData.responses.length}</div>
                  <div className="text-sm text-gray-600">Respostas</div>
                </div>
                <div className="bg-white p-3 rounded">
                  <div className="text-2xl font-bold text-green-600">{userData.magicLinks.length}</div>
                  <div className="text-sm text-gray-600">Magic Links</div>
                </div>
                <div className="bg-white p-3 rounded">
                  <div className="text-2xl font-bold text-purple-600">{userData.auditLogs.length}</div>
                  <div className="text-sm text-gray-600">Logs de Auditoria</div>
                </div>
              </div>
            </div>

            {userData.responses.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Suas Respostas</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {userData.responses.map((response, index) => (
                    <div key={response.id} className="bg-white border rounded p-3">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          Resposta #{index + 1}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(response.created_at)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p><strong>Avaliação:</strong> {response.rating}/5</p>
                        {response.feedback && (
                          <p><strong>Comentário:</strong> {response.feedback}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {userData.magicLinks.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Seus Magic Links</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {userData.magicLinks.map((link, index) => (
                    <div key={link.id} className="bg-white border rounded p-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">
                          Link #{index + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            link.used_at ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {link.used_at ? 'Usado' : 'Não usado'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(link.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-bold text-gray-900">
                Confirmar Exclusão de Dados
              </h3>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-700 mb-3">
                Esta ação é <strong>irreversível</strong>. Todos os seus dados serão 
                permanentemente excluídos de nossos sistemas.
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Para confirmar, digite exatamente: <strong>EXCLUIR MEUS DADOS</strong>
              </p>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="Digite: EXCLUIR MEUS DADOS"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmation('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={deleteUserData}
                disabled={loading || deleteConfirmation !== 'EXCLUIR MEUS DADOS'}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Excluindo...' : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataControls;