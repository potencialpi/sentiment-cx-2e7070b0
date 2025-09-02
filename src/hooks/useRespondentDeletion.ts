import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface DeleteRequest {
  action: 'delete_single' | 'delete_multiple';
  respondentIds: string[];
  confirmationText?: string;
}

interface DeleteResponse {
  success: boolean;
  message: string;
  deletedCount?: number;
  auditLogId?: string;
  error?: string;
}

export const useRespondentDeletion = () => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);

  const deleteRespondents = async (
    respondentIds: string[],
    confirmationText?: string
  ): Promise<DeleteResponse> => {
    setIsDeleting(true);
    setDeleteProgress(0);

    try {
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Usuário não autenticado');
      }

      const action = respondentIds.length === 1 ? 'delete_single' : 'delete_multiple';
      
      const requestData: DeleteRequest = {
        action,
        respondentIds,
        confirmationText
      };

      // Call the Supabase function
      const { data, error } = await supabase.functions.invoke('delete-respondents', {
        body: requestData,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Function invocation error:', error);
        throw new Error(error.message || 'Erro ao chamar função de exclusão');
      }

      const response: DeleteResponse = data;
      
      if (!response.success) {
        throw new Error(response.error || 'Erro desconhecido durante exclusão');
      }

      // Show success message
      toast({
        title: "Exclusão realizada com sucesso",
        description: response.message,
        variant: "default",
      });

      setDeleteProgress(100);
      return response;

    } catch (error) {
      console.error('Delete error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      toast({
        title: "Erro na exclusão",
        description: errorMessage,
        variant: "destructive",
      });

      return {
        success: false,
        message: 'Falha na exclusão',
        error: errorMessage
      };
    } finally {
      setIsDeleting(false);
      setTimeout(() => setDeleteProgress(0), 2000); // Reset progress after 2 seconds
    }
  };

  const deleteSingleRespondent = async (respondentId: string): Promise<DeleteResponse> => {
    return deleteRespondents([respondentId]);
  };

  const deleteMultipleRespondents = async (
    respondentIds: string[],
    confirmationText: string
  ): Promise<DeleteResponse> => {
    return deleteRespondents(respondentIds, confirmationText);
  };

  return {
    isDeleting,
    deleteProgress,
    deleteSingleRespondent,
    deleteMultipleRespondents,
    deleteRespondents
  };
};