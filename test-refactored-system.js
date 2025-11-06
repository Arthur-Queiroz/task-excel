#!/usr/bin/env node

/**
 * Script para testar o sistema refatorado
 * Testa o endpoint /tasks-upload/process
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BACKEND_URL = 'http://localhost:3000';
const EXCEL_FILE = path.join(__dirname, 'task-excel-processor/docs/Modelo de tarefas.xlsx');

async function testProcessEndpoint() {
  console.log('🧪 Testando endpoint /tasks-upload/process');
  console.log('='.repeat(70));
  
  try {
    // Verificar se o arquivo existe
    if (!fs.existsSync(EXCEL_FILE)) {
      console.error(`❌ Arquivo não encontrado: ${EXCEL_FILE}`);
      process.exit(1);
    }

    console.log(`📁 Arquivo: ${EXCEL_FILE}`);
    console.log(`📤 Enviando para: ${BACKEND_URL}/tasks-upload/process`);
    console.log('');

    // Criar FormData
    const formData = new FormData();
    formData.append('file', fs.createReadStream(EXCEL_FILE));

    // Enviar requisição
    const response = await axios.post(
      `${BACKEND_URL}/tasks-upload/process`,
      formData,
      {
        headers: formData.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    // Exibir resultados
    console.log('✅ Processamento concluído com sucesso!');
    console.log('');
    
    const data = response.data;
    
    console.log('📊 RESUMO:');
    console.log(`  • Total de linhas: ${data.summary.totalRows}`);
    console.log(`  • Tarefas válidas: ${data.summary.validTasks}`);
    console.log(`  • Tarefas inválidas: ${data.summary.invalidTasks}`);
    console.log('');

    // Exibir tarefas válidas
    if (data.tasks && data.tasks.length > 0) {
      console.log('✅ TAREFAS VÁLIDAS:');
      data.tasks.forEach((task, index) => {
        console.log(`  ${index + 1}. ${task.title} (Pavimento ${task.floorNumber})`);
        console.log(`     • Etapas: ${task.stages.length}`);
        const totalWeight = task.stages.reduce((sum, stage) => sum + stage.weight, 0);
        console.log(`     • Peso total: ${totalWeight}%`);
      });
      console.log('');
    }

    // Exibir erros de validação
    if (data.errors && data.errors.errors.length > 0) {
      console.log('❌ ERROS DE VALIDAÇÃO:');
      data.errors.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.message}`);
        console.log(`     • Peso total: ${error.totalWeight.toFixed(2)}%`);
        console.log(`     • Diferença: ${error.difference > 0 ? '+' : ''}${error.difference.toFixed(2)}%`);
      });
      console.log('');
    }

    // Salvar resultados em arquivos
    const outputDir = path.join(__dirname, 'test-results');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    const tasksFile = path.join(outputDir, 'tasks.json');
    const errorsFile = path.join(outputDir, 'errors.json');

    fs.writeFileSync(tasksFile, JSON.stringify(data.tasks, null, 2));
    console.log(`💾 Tasks salvas em: ${tasksFile}`);

    if (data.errors) {
      fs.writeFileSync(errorsFile, JSON.stringify(data.errors, null, 2));
      console.log(`💾 Erros salvos em: ${errorsFile}`);
    }

    console.log('');
    console.log('='.repeat(70));
    console.log('✅ Teste concluído com sucesso!');

  } catch (error) {
    console.error('❌ Erro no teste:');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('  Backend não está rodando em http://localhost:3000');
      console.error('  Execute: cd task-excel-processor && npm run start:dev');
    } else if (error.response) {
      console.error(`  Status: ${error.response.status}`);
      console.error(`  Mensagem: ${error.response.data?.message || error.message}`);
      console.error(`  Dados:`, JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(`  ${error.message}`);
    }
    
    process.exit(1);
  }
}

// Executar teste
testProcessEndpoint();

