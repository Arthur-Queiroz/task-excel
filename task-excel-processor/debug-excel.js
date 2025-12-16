const XLSX = require('xlsx');
const path = require('path');

const excelFile = path.join(__dirname, 'docs/Modelo de tarefas.xlsx');
const workbook = XLSX.readFile(excelFile);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet, { 
  raw: true,
  defval: ''
});

console.log(`Aba: ${sheetName}`);
console.log(`Total de linhas: ${data.length}`);
console.log('\nPrimeira linha:');
console.log(JSON.stringify(data[0], null, 2));
console.log('\nColunas encontradas:');
console.log(Object.keys(data[0]));

