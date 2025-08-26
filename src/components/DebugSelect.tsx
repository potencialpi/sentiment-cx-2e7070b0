import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DebugSelect = () => {
  const [selectedValue, setSelectedValue] = useState<string>('');
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [...prev, `${timestamp}: ${message}`]);
    console.log(`[DebugSelect] ${timestamp}: ${message}`);
  };

  const handleValueChange = (value: string) => {
    addLog(`Value changed to: ${value}`);
    setSelectedValue(value);
  };

  const handleOpenChange = (open: boolean) => {
    addLog(`Select ${open ? 'opened' : 'closed'}`);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Debug Select Component</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Tipo de Resposta (Debug Version):
            </label>
            <Select 
              value={selectedValue} 
              onValueChange={handleValueChange}
              onOpenChange={handleOpenChange}
            >
              <SelectTrigger 
                className="w-full min-h-[44px] border-2 border-blue-500 bg-white"
                onClick={() => addLog('Trigger clicked')}
              >
                <SelectValue placeholder="Escolha o tipo de resposta" />
              </SelectTrigger>
              <SelectContent 
                className="z-[9999] bg-white border-2 border-red-500 shadow-2xl"
                onPointerDownOutside={() => addLog('Clicked outside')}
              >
                <SelectItem 
                  value="text" 
                  onClick={() => addLog('Text item clicked')}
                >
                  Texto Aberto
                </SelectItem>
                <SelectItem 
                  value="rating" 
                  onClick={() => addLog('Rating item clicked')}
                >
                  Avaliação 1-5 Estrelas
                </SelectItem>
                <SelectItem 
                  value="single_choice" 
                  onClick={() => addLog('Single choice item clicked')}
                >
                  Escolha Única
                </SelectItem>
                <SelectItem 
                  value="multiple_choice" 
                  onClick={() => addLog('Multiple choice item clicked')}
                >
                  Múltipla Escolha
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-4">
            <p className="text-sm font-medium">Valor Selecionado: 
              <span className="font-bold text-green-600">
                {selectedValue || 'Nenhum'}
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Debug Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-500/20 p-4 rounded max-h-60 overflow-y-auto">
            {debugLogs.length === 0 ? (
              <p className="text-gray-500">Nenhum log ainda...</p>
            ) : (
              debugLogs.map((log, index) => (
                <div key={index} className="text-xs font-mono mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
          <button 
            onClick={() => {
              setDebugLogs([]);
              addLog('Logs cleared');
            }}
            className="mt-2 px-3 py-1 bg-red-500 text-white text-xs rounded"
          >
            Limpar Logs
          </button>
        </CardContent>
      </Card>
    </div>
  );
};

export default DebugSelect;