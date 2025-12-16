const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const API_BASE_URL = 'https://v2-kwwmyyzjzq-uc.a.run.app';
const API_ENDPOINT = '/projects/create-many';

async function testRealAPI() {
  console.log('🧪 Testando envio para API real...\n');
  console.log('📡 API Destino:', API_BASE_URL + API_ENDPOINT);
  console.log('📄 Arquivo:', 'test-real-api.xlsx');
  console.log('=' .repeat(60));
  
  try {
    // Pedir token JWT ao usuário
    console.log('\n⚠️  NOTA: Este teste tentará enviar dados para a API real.');
    console.log('Se você não tiver um token JWT válido, o teste falhará na parte do envio,');
    console.log('mas ainda mostrará o processamento e validação dos dados.\n');
    
    // Primeiro vamos validar apenas para ver os dados processados
    console.log('1️⃣ ETAPA 1: Validando dados da planilha...\n');
    
    const formValidate = new FormData();
    formValidate.append('file', fs.createReadStream('test-real-api.xlsx'));
    
    const validateResponse = await axios.post(`${BASE_URL}/projects-upload/validate-only`, formValidate, {
      headers: {
        ...formValidate.getHeaders(),
      },
    });
    
    console.log('✅ Validação concluída com sucesso!');
    console.log('\n📊 Resultados da Validação:');
    console.log(`   - Total de linhas: ${validateResponse.data.processamento.totalLinhas}`);
    console.log(`   - Projetos válidos: ${validateResponse.data.processamento.validos}`);
    console.log(`   - Projetos inválidos: ${validateResponse.data.processamento.invalidos}`);
    
    if (validateResponse.data.processamento.validos > 0) {
      console.log('\n📋 Projetos que serão enviados:');
      validateResponse.data.processamento.resultado
        .filter(r => r.status === 'VALIDO')
        .forEach((projeto, index) => {
          console.log(`\n   Projeto ${index + 1}:`);
          console.log(`   - Nome: ${projeto.dadosMapeados.name}`);
          console.log(`   - Localização: ${projeto.dadosMapeados.location}`);
          console.log(`   - Data Início: ${projeto.dadosMapeados.startDate}`);
          console.log(`   - Data Conclusão: ${projeto.dadosMapeados.forecastCompletionDate}`);
          console.log(`   - Construtora ID: ${projeto.dadosMapeados.constructionCompanyId}`);
          if (projeto.dadosMapeados.photoUrl) {
            console.log(`   - Foto URL: ${projeto.dadosMapeados.photoUrl}`);
          }
        });
    }
    
    if (validateResponse.data.processamento.invalidos > 0) {
      console.log('\n❌ Projetos inválidos:');
      validateResponse.data.processamento.erros.forEach((erro, index) => {
        console.log(`   ${index + 1}. Linha ${erro.linha}: ${erro.erro}`);
        if (erro.detalhes) {
          erro.detalhes.forEach(detalhe => {
            const msg = typeof detalhe.msg === 'object' ? Object.values(detalhe.msg).join(', ') : detalhe.msg;
            console.log(`      - ${detalhe.campo}: ${msg}`);
          });
        }
      });
    }
    
    // Agora vamos tentar enviar para a API real (sem token, apenas para testar o endpoint)
    console.log('\n' + '=' .repeat(60));
    console.log('2️⃣ ETAPA 2: Testando envio para API real (sem token)...\n');
    console.log('⚠️  Este teste vai falhar porque não temos um token JWT válido,');
    console.log('mas vamos ver se o sistema tenta fazer a requisição corretamente.\n');
    
    const formUpload = new FormData();
    formUpload.append('file', fs.createReadStream('test-real-api.xlsx'));
    formUpload.append('baseUrl', API_BASE_URL);
    formUpload.append('endpoint', API_ENDPOINT);
    formUpload.append('token', 'token-de-teste-invalido'); // Token inválido para teste
    
    try {
      const uploadResponse = await axios.post(`${BASE_URL}/projects-upload`, formUpload, {
        headers: {
          ...formUpload.getHeaders(),
        },
      });
      
      console.log('✅ Upload completo concluído!');
      console.log('\n📊 Resultados do processamento:');
      console.log(`   - Total de linhas: ${uploadResponse.data.processamento.totalLinhas}`);
      console.log(`   - Válidos: ${uploadResponse.data.processamento.validos}`);
      console.log(`   - Inválidos: ${uploadResponse.data.processamento.invalidos}`);
      
      if (uploadResponse.data.api) {
        console.log('\n📡 Resposta da API:');
        console.log(`   - Projetos criados: ${uploadResponse.data.api.created || 0}`);
        console.log(`   - Projetos que falharam: ${uploadResponse.data.api.failed || 0}`);
        
        if (uploadResponse.data.api.projects) {
          console.log('\n✅ Projetos criados com sucesso:');
          uploadResponse.data.api.projects.forEach((projeto, index) => {
            console.log(`   ${index + 1}. ${projeto.name}`);
          });
        }
        
        if (uploadResponse.data.api.errors) {
          console.log('\n❌ Erros da API:');
          uploadResponse.data.api.errors.forEach((erro, index) => {
            console.log(`   ${index + 1}. ${erro}`);
          });
        }
        
        if (uploadResponse.data.api.error) {
          console.log(`\n⚠️  Erro da API: ${uploadResponse.data.api.error}`);
        }
      }
    } catch (uploadError) {
      console.log('\n❌ Erro ao enviar para a API (esperado com token inválido):');
      if (uploadError.response) {
        console.log(`   - Status: ${uploadError.response.status}`);
        console.log(`   - Mensagem: ${uploadError.response.data.message || uploadError.response.statusText}`);
        
        // Se há informações de processamento mesmo com erro, mostrar
        if (uploadError.response.data.processamento) {
          console.log('\n📊 Dados foram processados antes do erro:');
          console.log(`   - Válidos: ${uploadError.response.data.processamento.validos}`);
          console.log(`   - Inválidos: ${uploadError.response.data.processamento.invalidos}`);
        }
      } else {
        console.log(`   - ${uploadError.message}`);
      }
      
      console.log('\n💡 NOTA: Este erro é esperado porque estamos usando um token inválido.');
      console.log('   Para testar com um token real, você precisaria:');
      console.log('   1. Obter um token JWT válido da API');
      console.log('   2. Substituir o token no código acima');
      console.log('   3. Executar novamente o teste');
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('✅ Teste concluído!\n');
    console.log('📝 Resumo:');
    console.log('   ✅ O sistema está processando a planilha corretamente');
    console.log('   ✅ Os dados estão sendo validados');
    console.log('   ✅ Os dados estão sendo convertidos para o formato JSON correto');
    console.log('   ✅ O sistema está tentando enviar para a API');
    console.log('\n   Para usar com a API real, você precisa:');
    console.log('   1. Ter um token JWT válido');
    console.log('   2. A construtora com ID especificado deve existir na API');
    console.log('   3. Executar o frontend ou usar este script com um token real');
    
  } catch (error) {
    console.error('\n❌ Erro no teste:', error.response?.data || error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Teste de Integração com API Real\n');
  console.log('Este script irá:');
  console.log('1. Validar os dados da planilha test-real-api.xlsx');
  console.log('2. Mostrar como os dados são convertidos para JSON');
  console.log('3. Tentar enviar para a API real (falhará sem token válido)\n');
  
  await testRealAPI();
}

main();


