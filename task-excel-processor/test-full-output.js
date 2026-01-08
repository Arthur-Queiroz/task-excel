const fs = require('fs');
const path = require('path');
const { TaskProcessor } = require('./dist/src/upload/task.processor');
const XLSX = require('xlsx');

async function test() {
  // Ler planilha
  const workbook = XLSX.readFile('/home/arthurdequeiroz2005/prog/task-excel/tarefas para teste com ordem.xlsx');
  const sheetName = workbook.SheetNames[0];
  const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: true });

  // Substituir TORRE 1 por ID válido
  data.forEach(row => {
    if (row.torre === 'TORRE 1') {
      row.torre = '689c8eabb6d1ea919debf07d';
    }
  });

  console.log('Total de linhas:', data.length);
  console.log('Primeira linha após substituição:');
  console.log(JSON.stringify(data[0], null, 2));

  // Processar TODAS as linhas
  const processor = new TaskProcessor();
  const result = await processor.handle(data); // Processar TODAS as linhas

  console.log('\n=== Resultado do Processamento ===');
  console.log('Total de tarefas:', result.tasks.length);
  console.log('Erros:', result.errors);
  console.log('Summary:', JSON.stringify(result.summary, null, 2));

  if (result.tasks.length > 0) {
    console.log('\n=== Primeira Tarefa ===');
    console.log(JSON.stringify(result.tasks[0], null, 2));

    // Salvar em arquivo para inspeção
    fs.writeFileSync(
      '/tmp/processed-tasks.json',
      JSON.stringify({ tasks: result.tasks }, null, 2)
    );
    console.log('\n✓ Tarefas salvas em /tmp/processed-tasks.json');
  }
}

test().catch(console.error);
