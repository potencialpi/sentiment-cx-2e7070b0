/**
 * Teste para verificar se a análise temática de sentimentos está funcionando
 */

import { analyzeMultipleTexts } from './src/utils/thematicSentimentAnalysis.js';

// Dados de teste
const testTexts = [
  "O atendimento foi excelente, muito prestativo",
  "O produto é de ótima qualidade, recomendo",
  "O preço está muito caro, não vale a pena",
  "Atendimento péssimo, muito demorado",
  "Produto com defeito, não funciona direito"
];

console.log('=== TESTE DE ANÁLISE TEMÁTICA ===');
console.log('Textos de teste:', testTexts);

try {
  const result = analyzeMultipleTexts(testTexts);
  
  console.log('\n=== RESULTADOS ===');
  console.log('Número de análises:', result.analyses.length);
  console.log('Número de temas encontrados:', result.summary.length);
  
  console.log('\n=== RESUMO POR TEMA ===');
  result.summary.forEach(theme => {
    console.log(`\nTema: ${theme.theme}`);
    console.log(`Total de respostas: ${theme.totalResponses}`);
    console.log(`Score médio: ${theme.averageScore.toFixed(3)}`);
    console.log('Distribuição:', theme.sentimentDistribution);
    console.log('Top keywords:', theme.topKeywords.slice(0, 3));
  });
  
  console.log('\n=== ANÁLISES INDIVIDUAIS ===');
  result.analyses.forEach((analysis, index) => {
    console.log(`\nTexto ${index + 1}: "${analysis.text}"`);
    console.log('Temas encontrados:', analysis.results.map(r => `${r.theme} (${r.sentiment}, score: ${r.score.toFixed(3)})`));
  });
  
} catch (error) {
  console.error('Erro na análise temática:', error);
  console.error('Stack:', error.stack);
}

console.log('\n=== FIM DO TESTE ===');