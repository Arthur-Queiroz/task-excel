const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

/**
 * 🔑 CONFIGURAÇÃO - Edite aqui com seus dados reais
 */
const CONFIG = {
  // URL do backend local
  backendUrl: 'http://localhost:3000',
  
  // Configuração da API externa
  api: {
    baseUrl: 'https://v2-kwwmyyzjzq-uc.a.run.app',
    endpoint: '/projects/create-many',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ODk0OTg4ZjA0ZDNiNWFiZjVlZDhlYjUiLCJlbWFpbCI6InRpQGVuZ2VuaGFyaWFsZW1lLmNvbS5iciIsImFjY2Vzc1R5cGUiOiJhZG1pbiIsImlhdCI6MTc2MDYyMjk5OSwiZXhwIjoxNzYwNjI2NTk5fQ.U7SMEvdhMy4Ej3BmhI5WTMJQQty2VmBfNM4xA-mZoX0'
  },
  
  // Arquivo da planilha
  excelFile: 'test-real-api.xlsx'
};

async function sendToRealAPI() {
  console.log('🚀 Enviando dados para API Real\n');
  console.log('📡 Configuração:');
  console.log(`   - Backend: ${CONFIG.backendUrl}`);
  console.log(`   - API: ${CONFIG.api.baseUrl}${CONFIG.api.endpoint}`);
  console.log(`   - Arquivo: ${CONFIG.excelFile}`);
  console.log(`   - Token: ${CONFIG.api.token.substring(0, 20)}...`);
  console.log('\n' + '=' .repeat(60) + '\n');
  
  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(CONFIG.excelFile));
    form.append('baseUrl', CONFIG.api.baseUrl);
    form.append('endpoint', CONFIG.api.endpoint);
    form.append('token', CONFIG.api.token);
    
    console.log('📤 Enviando requisição...\n');
    
    const response = await axios.post(
      `${CONFIG.backendUrl}/projects-upload`, 
      form, 
      {
        headers: {
          ...form.getHeaders(),
        },
      }
    );
    
    console.log('✅ Sucesso!\n');
    console.log('📊 Resultados do Processamento:');
    console.log(`   - Total de linhas processadas: ${response.data.processamento.totalLinhas}`);
    console.log(`   - Projetos válidos: ${response.data.processamento.validos}`);
    console.log(`   - Projetos inválidos: ${response.data.processamento.invalidos}`);
    
    if (response.data.api) {
      console.log('\n📡 Resposta da API:');
      console.log(`   - Projetos criados com sucesso: ${response.data.api.created || 0}`);
      console.log(`   - Projetos que falharam: ${response.data.api.failed || 0}`);
      
      if (response.data.api.projects && response.data.api.projects.length > 0) {
        console.log('\n✅ Projetos criados:');
        response.data.api.projects.forEach((projeto, index) => {
          console.log(`   ${index + 1}. ${projeto.name} (ID: ${projeto._id || 'N/A'})`);
        });
      }
      
      if (response.data.api.errors && response.data.api.errors.length > 0) {
        console.log('\n❌ Erros da API:');
        response.data.api.errors.forEach((erro, index) => {
          console.log(`   ${index + 1}. ${JSON.stringify(erro)}`);
        });
      }
      
      if (response.data.api.error) {
        console.log(`\n⚠️  Erro geral da API: ${response.data.api.error}`);
      }
    }
    
    if (response.data.processamento.invalidos > 0) {
      console.log('\n❌ Projetos inválidos na planilha:');
      response.data.processamento.erros.forEach((erro, index) => {
        console.log(`   ${index + 1}. Linha ${erro.linha}: ${erro.erro}`);
        if (erro.detalhes) {
          erro.detalhes.forEach(detalhe => {
            const msg = typeof detalhe.msg === 'object' ? Object.values(detalhe.msg).join(', ') : detalhe.msg;
            console.log(`      - ${detalhe.campo}: ${msg}`);
          });
        }
      });
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('✅ Processo concluído com sucesso!\n');
    
  } catch (error) {
    console.log('\n❌ Erro ao enviar dados:\n');
    
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Mensagem: ${error.response.data.message || error.response.statusText}`);
      
      if (error.response.status === 401) {
        console.log('\n⚠️  ERRO DE AUTENTICAÇÃO:');
        console.log('   O token JWT fornecido não é válido ou expirou.');
        console.log('   Por favor, obtenha um novo token e atualize a variável CONFIG.api.token');
      } else if (error.response.status === 404) {
        console.log('\n⚠️  ERRO DE ENDPOINT:');
        console.log('   O endpoint não foi encontrado. Verifique se a URL está correta.');
      } else if (error.response.status === 400) {
        console.log('\n⚠️  ERRO DE VALIDAÇÃO:');
        console.log('   Detalhes:', JSON.stringify(error.response.data, null, 2));
      }
      
      if (error.response.data) {
        console.log('\nDetalhes completos:');
        console.log(JSON.stringify(error.response.data, null, 2));
      }
    } else if (error.request) {
      console.log('⚠️  Erro de rede:');
      console.log('   Não foi possível conectar ao servidor.');
      console.log(`   Verifique se o backend está rodando em ${CONFIG.backendUrl}`);
    } else {
      console.log('⚠️  Erro desconhecido:', error.message);
    }
    
    console.log('\n' + '=' .repeat(60));
    process.exit(1);
  }
}

async function checkBackend() {
  try {
    await axios.get(`${CONFIG.backendUrl}/projects-upload/health`);
    return true;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.clear();
  console.log('\n' + '='.repeat(60));
  console.log('  TASK EXCEL - Envio para API Real');
  console.log('='.repeat(60) + '\n');
  
  // Verificar se o backend está rodando
  console.log('🔍 Verificando backend...');
  const isBackendRunning = await checkBackend();
  
  if (!isBackendRunning) {
    console.log('❌ Backend não está rodando!');
    console.log('\n💡 Execute em outro terminal:');
    console.log('   cd task-excel-processor');
    console.log('   npm run start:dev\n');
    process.exit(1);
  }
  console.log('✅ Backend está rodando!\n');
  
  // Verificar se o arquivo existe
  if (!fs.existsSync(CONFIG.excelFile)) {
    console.log(`❌ Arquivo ${CONFIG.excelFile} não encontrado!`);
    console.log('\n💡 Execute primeiro:');
    console.log('   node create-test-data.js\n');
    process.exit(1);
  }
  console.log(`✅ Arquivo ${CONFIG.excelFile} encontrado!\n`);
  
  // Verificar se o token foi configurado
  if (CONFIG.api.token === 'SEU-TOKEN-JWT-AQUI') {
    console.log('⚠️  ATENÇÃO: Você ainda está usando o token de exemplo!\n');
    console.log('Para usar a API real, edite o arquivo test-with-real-token.js');
    console.log('e substitua CONFIG.api.token pelo seu token JWT válido.\n');
    console.log('Continuando mesmo assim para demonstração...\n');
  }
  
  await sendToRealAPI();
}

main();

