const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

async function testValidations() {
  console.log('🧪 Teste de Validações Centralizadas no Backend\n');
  console.log('='.repeat(60));
  
  let passedTests = 0;
  let totalTests = 0;

  // Teste 1: Upload sem arquivo
  console.log('\n📋 Teste 1: Upload sem arquivo');
  totalTests++;
  try {
    const formData = new FormData();
    await axios.post(`${BASE_URL}/tasks-upload/validate-only`, formData, {
      headers: formData.getHeaders(),
    });
    console.log('❌ FALHOU - Deveria retornar erro');
  } catch (error) {
    const errorData = error.response?.data;
    if (errorData?.error === 'ARQUIVO_OBRIGATORIO') {
      console.log('✅ PASSOU - Erro correto:', errorData.message);
      passedTests++;
    } else {
      console.log('❌ FALHOU - Erro inesperado:', errorData);
    }
  }

  // Teste 2: Upload de arquivo com extensão inválida
  console.log('\n📋 Teste 2: Arquivo com extensão inválida');
  totalTests++;
  try {
    const formData = new FormData();
    // Criar um arquivo temporário com extensão inválida
    const invalidFile = Buffer.from('conteudo teste');
    formData.append('file', invalidFile, { 
      filename: 'teste.txt',
      contentType: 'text/plain'
    });
    
    await axios.post(`${BASE_URL}/tasks-upload/validate-only`, formData, {
      headers: formData.getHeaders(),
    });
    console.log('❌ FALHOU - Deveria retornar erro');
  } catch (error) {
    const errorData = error.response?.data;
    if (errorData?.error === 'EXTENSAO_INVALIDA') {
      console.log('✅ PASSOU - Erro correto:', errorData.message);
      passedTests++;
    } else {
      console.log('❌ FALHOU - Erro inesperado:', errorData);
    }
  }

  // Teste 3: Upload de arquivo muito grande (simulado com header)
  console.log('\n📋 Teste 3: Arquivo muito grande');
  totalTests++;
  try {
    const formData = new FormData();
    // Criar um buffer grande (11MB)
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024);
    formData.append('file', largeBuffer, { 
      filename: 'grande.xlsx',
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
    await axios.post(`${BASE_URL}/tasks-upload/validate-only`, formData, {
      headers: formData.getHeaders(),
    });
    console.log('❌ FALHOU - Deveria retornar erro');
  } catch (error) {
    const errorData = error.response?.data;
    if (errorData?.error === 'ARQUIVO_MUITO_GRANDE') {
      console.log('✅ PASSOU - Erro correto:', errorData.message);
      passedTests++;
    } else {
      console.log('❌ FALHOU - Erro inesperado:', errorData);
    }
  }

  // Teste 4: Upload sem aba OP1
  console.log('\n📋 Teste 4: Planilha sem aba OP1');
  totalTests++;
  try {
    const filePath = path.join(__dirname, 'docs', 'Modelo de tarefas.xlsx');
    const formData = new FormData();
    
    // Vamos usar um arquivo válido, mas o teste real seria com um arquivo sem OP1
    // Como não temos outro arquivo, vamos pular este teste
    console.log('⏭️  PULADO - Necessário arquivo sem aba OP1 para teste');
  } catch (error) {
    console.log('⏭️  PULADO');
  }

  // Teste 5: Upload válido
  console.log('\n📋 Teste 5: Upload válido');
  totalTests++;
  try {
    const filePath = path.join(__dirname, 'docs', 'Modelo de tarefas.xlsx');
    if (!fs.existsSync(filePath)) {
      console.log('⏭️  PULADO - Arquivo não encontrado');
    } else {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath));
      
      const response = await axios.post(`${BASE_URL}/tasks-upload/validate-only`, formData, {
        headers: formData.getHeaders(),
      });
      
      if (response.data.success && response.data.processamento) {
        console.log('✅ PASSOU - Arquivo processado com sucesso');
        console.log(`   Grupos: ${response.data.processamento.totalGrupos}`);
        console.log(`   Válidos: ${response.data.processamento.validos}`);
        passedTests++;
      } else {
        console.log('❌ FALHOU - Resposta inesperada:', response.data);
      }
    }
  } catch (error) {
    console.log('❌ FALHOU - Erro:', error.response?.data || error.message);
  }

  // Teste 6: Upload com token mas sem baseUrl
  console.log('\n📋 Teste 6: Token sem baseUrl');
  totalTests++;
  try {
    const filePath = path.join(__dirname, 'docs', 'Modelo de tarefas.xlsx');
    if (!fs.existsSync(filePath)) {
      console.log('⏭️  PULADO - Arquivo não encontrado');
    } else {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath));
      formData.append('token', 'teste-token');
      
      await axios.post(`${BASE_URL}/tasks-upload`, formData, {
        headers: formData.getHeaders(),
      });
      console.log('❌ FALHOU - Deveria retornar erro');
    }
  } catch (error) {
    const errorData = error.response?.data;
    if (errorData?.error === 'BASE_URL_OBRIGATORIA') {
      console.log('✅ PASSOU - Erro correto:', errorData.message);
      passedTests++;
    } else {
      console.log('❌ FALHOU - Erro inesperado:', errorData);
    }
  }

  // Resumo
  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Resumo dos Testes:`);
  console.log(`   Total: ${totalTests}`);
  console.log(`   Passou: ${passedTests}`);
  console.log(`   Falhou: ${totalTests - passedTests}`);
  console.log(`   Taxa de sucesso: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n✅ Todos os testes passaram!');
  } else {
    console.log('\n⚠️  Alguns testes falharam');
  }
}

// Verificar se o servidor está rodando antes de executar os testes
async function checkServer() {
  try {
    await axios.get(`${BASE_URL}/tasks-upload/health`);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log('Verificando se o servidor está rodando...');
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('❌ Servidor não está rodando!');
    console.log('Execute: npm run start:dev');
    process.exit(1);
  }
  
  console.log('✅ Servidor está rodando\n');
  await testValidations();
}

main();

