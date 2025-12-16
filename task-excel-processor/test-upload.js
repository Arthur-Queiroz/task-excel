const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testValidationOnly() {
  console.log('🧪 Testando validação apenas...\n');
  
  try {
    const form = new FormData();
    form.append('file', fs.createReadStream('test-data.xlsx'));
    
    const response = await axios.post(`${BASE_URL}/projects-upload/validate-only`, form, {
      headers: {
        ...form.getHeaders(),
      },
    });
    
    console.log('✅ Validação concluída com sucesso!');
    console.log('📊 Resultados:');
    console.log(`   - Total de linhas: ${response.data.processamento.totalLinhas}`);
    console.log(`   - Válidos: ${response.data.processamento.validos}`);
    console.log(`   - Inválidos: ${response.data.processamento.invalidos}`);
    
    if (response.data.processamento.erros.length > 0) {
      console.log('\n❌ Erros encontrados:');
      response.data.processamento.erros.forEach((erro, index) => {
        console.log(`   ${index + 1}. Linha ${erro.linha}: ${erro.erro}`);
        if (erro.detalhes) {
          erro.detalhes.forEach(detalhe => {
            console.log(`      - ${detalhe.campo}: ${Object.values(detalhe.msg).join(', ')}`);
          });
        }
      });
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Erro na validação:', error.response?.data || error.message);
    throw error;
  }
}

async function testFullUpload() {
  console.log('\n🧪 Testando upload completo com envio para API...\n');
  
  try {
    const form = new FormData();
    form.append('file', fs.createReadStream('test-data.xlsx'));
    form.append('baseUrl', 'http://localhost:3001'); // Mock API
    form.append('endpoint', '/projects/create-many');
    form.append('token', 'mock-jwt-token');
    
    const response = await axios.post(`${BASE_URL}/projects-upload`, form, {
      headers: {
        ...form.getHeaders(),
      },
    });
    
    console.log('✅ Upload completo concluído!');
    console.log('📊 Resultados do processamento:');
    console.log(`   - Total de linhas: ${response.data.processamento.totalLinhas}`);
    console.log(`   - Válidos: ${response.data.processamento.validos}`);
    console.log(`   - Inválidos: ${response.data.processamento.invalidos}`);
    
    if (response.data.api) {
      console.log('\n📡 Resultados da API:');
      console.log(`   - Projetos criados: ${response.data.api.created || 0}`);
      console.log(`   - Projetos que falharam: ${response.data.api.failed || 0}`);
      
      if (response.data.api.error) {
        console.log(`   - Erro da API: ${response.data.api.error}`);
      }
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Erro no upload completo:', error.response?.data || error.message);
    throw error;
  }
}

async function testInvalidFile() {
  console.log('\n🧪 Testando arquivo inválido...\n');
  
  try {
    const form = new FormData();
    form.append('file', fs.createReadStream('package.json')); // Arquivo não Excel
    
    await axios.post(`${BASE_URL}/projects-upload/validate-only`, form, {
      headers: {
        ...form.getHeaders(),
      },
    });
    
    console.log('❌ Deveria ter falhado com arquivo inválido!');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Validação de arquivo funcionando corretamente!');
      console.log(`   - Erro: ${error.response.data.message}`);
    } else {
      console.error('❌ Erro inesperado:', error.response?.data || error.message);
    }
  }
}

async function testMissingFile() {
  console.log('\n🧪 Testando requisição sem arquivo...\n');
  
  try {
    await axios.post(`${BASE_URL}/projects-upload/validate-only`);
    console.log('❌ Deveria ter falhado sem arquivo!');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Validação de arquivo obrigatório funcionando!');
      console.log(`   - Erro: ${error.response.data.message}`);
    } else {
      console.error('❌ Erro inesperado:', error.response?.data || error.message);
    }
  }
}

async function runTests() {
  console.log('🚀 Iniciando testes do Task Excel Processor\n');
  console.log('=' .repeat(50));
  
  try {
    // Teste 1: Validação apenas
    await testValidationOnly();
    
    // Teste 2: Upload completo (pode falhar se a API mock não estiver rodando)
    try {
      await testFullUpload();
    } catch (error) {
      console.log('⚠️  Upload completo falhou (esperado se API mock não estiver rodando)');
    }
    
    // Teste 3: Arquivo inválido
    await testInvalidFile();
    
    // Teste 4: Sem arquivo
    await testMissingFile();
    
    console.log('\n' + '=' .repeat(50));
    console.log('✅ Todos os testes concluídos!');
    
  } catch (error) {
    console.error('\n❌ Erro geral nos testes:', error.message);
    process.exit(1);
  }
}

// Verificar se o servidor está rodando
async function checkServer() {
  try {
    await axios.get(`${BASE_URL}/`);
    return true;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('🔍 Verificando se o servidor está rodando...');
  
  const isServerRunning = await checkServer();
  if (!isServerRunning) {
    console.log('❌ Servidor não está rodando!');
    console.log('   Execute: npm run start:dev');
    process.exit(1);
  }
  
  console.log('✅ Servidor está rodando!\n');
  await runTests();
}

main();