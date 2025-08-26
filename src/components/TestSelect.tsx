import React, { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TestSelect: React.FC = () => {
  const [selectedValue, setSelectedValue] = useState<string>('');
  const [log, setLog] = useState<string[]>([]);

  const handleValueChange = (value: string) => {
    console.log('Select value changed:', value);
    setSelectedValue(value);
    setLog(prev => [...prev, `Selecionado: ${value} às ${new Date().toLocaleTimeString()}`]);
  };

  const addLog = (message: string) => {
    setLog(prev => [...prev, `${message} às ${new Date().toLocaleTimeString()}`]);
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4">Teste do Componente Select</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Tipo de Resposta:</label>
          <Select
            value={selectedValue}
            onValueChange={handleValueChange}
            onOpenChange={(open) => addLog(`Select ${open ? 'aberto' : 'fechado'}`)}
          >
            <SelectTrigger 
              className="w-full min-h-[44px] border border-gray-500"
              onClick={() => addLog('Trigger clicado')}
            >
              <SelectValue placeholder="Escolha o tipo de resposta" />
            </SelectTrigger>
            <SelectContent className="z-50 bg-white border border-gray-500 shadow-lg">
              <SelectItem 
                value="text"
                onClick={() => addLog('Item texto clicado')}
              >
                Texto Aberto
              </SelectItem>
              <SelectItem 
                value="rating"
                onClick={() => addLog('Item rating clicado')}
              >
                Avaliação 1-5 Estrelas
              </SelectItem>
              <SelectItem 
                value="single_choice"
                onClick={() => addLog('Item single_choice clicado')}
              >
                Escolha Única
              </SelectItem>
              <SelectItem 
                value="multiple_choice"
                onClick={() => addLog('Item multiple_choice clicado')}
              >
                Múltipla Escolha
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4">
          <p className="text-sm font-medium">Valor Atual: <span className="font-bold text-blue-600">{selectedValue || 'Nenhum'}</span></p>
        </div>

        <div className="mt-4">
          <h3 className="text-sm font-medium mb-2">Log de Eventos:</h3>
          <div className="bg-gray-500/20 p-3 rounded max-h-32 overflow-y-auto">
            {log.length === 0 ? (
              <p className="text-xs text-gray-500">Nenhum evento registrado</p>
            ) : (
              log.map((entry, index) => (
                <p key={index} className="text-xs text-gray-700 mb-1">{entry}</p>
              ))
            )}
          </div>
        </div>

        <button 
          onClick={() => setLog([])} 
          className="w-full mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
        >
          Limpar Log
        </button>
      </div>
    </div>
  );
};

export default TestSelect;