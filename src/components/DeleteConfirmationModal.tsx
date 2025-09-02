import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Trash2, Users } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (confirmationText: string) => Promise<void>;
  respondentCount: number;
  respondentNames?: string[];
  isDeleting?: boolean;
  deleteProgress?: number;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  respondentCount,
  respondentNames = [],
  isDeleting = false,
  deleteProgress = 0
}) => {
  const [confirmationText, setConfirmationText] = useState('');
  const [isConfirmationValid, setIsConfirmationValid] = useState(false);
  const [step, setStep] = useState<'warning' | 'confirmation'>('warning');

  const requiredText = 'CONFIRMAR EXCLUSÃO';
  const isSingleDeletion = respondentCount === 1;

  useEffect(() => {
    setIsConfirmationValid(confirmationText === requiredText);
  }, [confirmationText]);

  useEffect(() => {
    if (!isOpen) {
      setConfirmationText('');
      setStep('warning');
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (step === 'warning') {
      setStep('confirmation');
      return;
    }

    if (isConfirmationValid) {
      await onConfirm(confirmationText);
      onClose();
    }
  };

  const handleCancel = () => {
    if (isDeleting) return; // Prevent closing during deletion
    onClose();
  };

  const renderWarningStep = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="w-5 h-5" />
          Confirmar Exclusão de Respondente{respondentCount > 1 ? 's' : ''}
        </DialogTitle>
        <DialogDescription className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <h4 className="font-semibold text-red-900">
                  ⚠️ ATENÇÃO: Esta ação é IRREVERSÍVEL!
                </h4>
                <p className="text-red-700 text-sm">
                  Você está prestes a excluir <strong>{respondentCount}</strong> respondente{respondentCount > 1 ? 's' : ''} 
                  e TODOS os dados associados, incluindo:
                </p>
                <ul className="text-red-600 text-xs space-y-1 ml-4">
                  <li>• Todas as respostas às pesquisas</li>
                  <li>• Análises de sentimento relacionadas</li>
                  <li>• Links mágicos de acesso</li>
                  <li>• Histórico completo de participação</li>
                </ul>
              </div>
            </div>
          </div>

          {respondentNames.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Respondente{respondentCount > 1 ? 's' : ''} que ser{respondentCount > 1 ? 'ão' : 'á'} excluído{respondentCount > 1 ? 's' : ''}:
              </h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {respondentNames.slice(0, 10).map((name, index) => (
                  <div key={index} className="text-sm text-gray-700 flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-400 rounded-full flex-shrink-0" />
                    {name}
                  </div>
                ))}
                {respondentNames.length > 10 && (
                  <div className="text-sm text-gray-500 italic">
                    ... e mais {respondentNames.length - 10} respondente{respondentNames.length - 10 > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 text-sm font-medium">
              💡 Esta exclusão não pode ser desfeita. Certifique-se de que realmente deseja prosseguir.
            </p>
          </div>
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={handleCancel}>
          Cancelar
        </Button>
        <Button variant="destructive" onClick={handleConfirm}>
          Continuar com Exclusão
        </Button>
      </DialogFooter>
    </>
  );

  const renderConfirmationStep = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-red-600">
          <Trash2 className="w-5 h-5" />
          Confirmação Final
        </DialogTitle>
        <DialogDescription className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 font-medium mb-2">
              Para confirmar a exclusão de {respondentCount} respondente{respondentCount > 1 ? 's' : ''}, 
              digite exatamente o texto abaixo:
            </p>
            <div className="bg-white border border-red-300 rounded px-3 py-2 font-mono text-sm text-red-800">
              {requiredText}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmation" className="text-sm font-medium">
              Texto de confirmação:
            </Label>
            <Input
              id="confirmation"
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder={requiredText}
              className={`font-mono ${
                confirmationText && !isConfirmationValid 
                  ? 'border-red-300 focus:border-red-500' 
                  : isConfirmationValid 
                  ? 'border-green-300 focus:border-green-500'
                  : ''
              }`}
              disabled={isDeleting}
            />
            {confirmationText && !isConfirmationValid && (
              <p className="text-red-600 text-xs">
                O texto deve ser exatamente: "{requiredText}"
              </p>
            )}
          </div>

          {isDeleting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Progresso da exclusão:</span>
                <span>{deleteProgress}%</span>
              </div>
              <Progress value={deleteProgress} className="w-full" />
            </div>
          )}
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={handleCancel} disabled={isDeleting}>
          Cancelar
        </Button>
        <Button 
          variant="destructive" 
          onClick={handleConfirm}
          disabled={!isConfirmationValid || isDeleting}
          className="min-w-[120px]"
        >
          {isDeleting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Excluindo...
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir Definitivamente
            </>
          )}
        </Button>
      </DialogFooter>
    </>
  );

  return (
    <Dialog open={isOpen} onOpenChange={!isDeleting ? onClose : undefined}>
      <DialogContent className="sm:max-w-[500px]" onPointerDownOutside={(e) => isDeleting && e.preventDefault()}>
        {step === 'warning' ? renderWarningStep() : renderConfirmationStep()}
      </DialogContent>
    </Dialog>
  );
};

export default DeleteConfirmationModal;