const XLSX = require('xlsx');

// Criar dados de teste com o exemplo do usuário
const data = [
  {
    'Nome do Projeto': 'Residencial Ipê Amarelo',
    'Localização': 'Avenida Central, 1200 - Campinas/SP',
    'Data de Início': '2025-01-15',
    'Data de Conclusão Prevista': '2026-08-30',
    'ID da Construtora': '64f1a2b3c4d5e6f7890abc12',
    'URL da Foto': 'https://example.com/fotos/ipe-amarelo.jpg'
  },
  {
    'Nome do Projeto': 'Residencial Jardim das Flores',
    'Localização': 'São Paulo - SP',
    'Data de Início': '2024-03-01',
    'Data de Conclusão Prevista': '2025-06-30',
    'ID da Construtora': '64f1a2b3c4d5e6f7890abc13',
    'URL da Foto': 'https://example.com/jardim-flores.jpg'
  },
  {
    'Nome do Projeto': 'Comercial Centro Empresarial',
    'Localização': 'Rio de Janeiro - RJ',
    'Data de Início': '2024-04-15',
    'Data de Conclusão Prevista': '2025-12-31',
    'ID da Construtora': '64f1a2b3c4d5e6f7890abc14',
    'URL da Foto': 'https://example.com/centro-empresarial.jpg'
  }
];

// Criar workbook
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(data);

// Adicionar planilha ao workbook
XLSX.utils.book_append_sheet(wb, ws, 'Projetos');

// Salvar arquivo
XLSX.writeFile(wb, 'test-real-api.xlsx');

console.log('✅ Planilha test-real-api.xlsx criada com sucesso!');
console.log('📊 Dados criados:');
data.forEach((projeto, index) => {
  console.log(`   ${index + 1}. ${projeto['Nome do Projeto']} - ${projeto['Localização']}`);
});

































