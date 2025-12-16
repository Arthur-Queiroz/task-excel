# Task Excel Processor

Sistema para processamento de planilhas Excel e criação em lote de projetos via API.

## Funcionalidades

- ✅ Upload de planilhas Excel (.xlsx, .xls)
- ✅ Validação de dados de projetos
- ✅ Mapeamento automático de colunas
- ✅ Envio em lote para API externa
- ✅ Tratamento de erros detalhado
- ✅ Logs completos do processamento

## Instalação

```bash
npm install
```

## Execução

```bash
# Desenvolvimento
npm run start:dev

# Produção
npm run build
npm run start:prod
```

## Endpoints

### 1. Upload de Projetos com Envio para API

```
POST /projects-upload
Content-Type: multipart/form-data

Parâmetros:
- file: arquivo Excel (.xlsx ou .xls)
- baseUrl: URL base da API externa
- endpoint: endpoint da API externa (/projects/create-many)
- token: JWT token para autenticação
```

### 2. Validação Apenas (sem envio para API)

```
POST /projects-upload/validate-only
Content-Type: multipart/form-data

Parâmetros:
- file: arquivo Excel (.xlsx ou .xls)
```

## Formato da Planilha Excel

A planilha deve conter as seguintes colunas na primeira linha:

| Nome do Projeto | Localização | Data de Início | Data de Conclusão Prevista | ID da Construtora | URL da Foto |
|-----------------|-------------|----------------|----------------------------|-------------------|-------------|
| Residencial Jardim | São Paulo - SP | 2024-03-01 | 2025-06-30 | 507f1f77bcf86cd799439011 | https://exemplo.com/foto.jpg |

### Nomes de Colunas Aceitos

- **Nome do Projeto**: `nome`, `name`, `Nome do Projeto`
- **Localização**: `localizacao`, `location`, `Localização`
- **Data de Início**: `dataInicio`, `startDate`, `Data de Início`
- **Data de Conclusão**: `dataConclusao`, `forecastCompletionDate`, `Data de Conclusão Prevista`
- **ID da Construtora**: `construtoraId`, `constructionCompanyId`, `ID da Construtora`
- **URL da Foto**: `fotoUrl`, `photoUrl`, `URL da Foto` (opcional)

## Validações

1. **Nome do Projeto**: Obrigatório, 2-200 caracteres
2. **Localização**: Obrigatória, não pode estar vazia
3. **Data de Início**: Obrigatória, formato YYYY-MM-DD
4. **Data de Conclusão**: Obrigatória, formato YYYY-MM-DD, deve ser posterior à data de início
5. **ID da Construtora**: Obrigatório, ObjectId válido do MongoDB (24 caracteres hexadecimais)
6. **URL da Foto**: Opcional, URL válida se fornecida

## Exemplo de Uso

### cURL

```bash
curl -X POST "http://localhost:3000/projects-upload" \
  -F "file=@exemplo-projetos.xlsx" \
  -F "baseUrl=https://api.exemplo.com" \
  -F "endpoint=/projects/create-many" \
  -F "token=seu-jwt-token"
```

### JavaScript

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('baseUrl', 'https://api.exemplo.com');
formData.append('endpoint', '/projects/create-many');
formData.append('token', 'seu-jwt-token');

fetch('http://localhost:3000/projects-upload', {
  method: 'POST',
  body: formData
})
.then(response => response.json())
.then(data => console.log(data));
```

## Resposta da API

```json
{
  "success": true,
  "message": "Arquivo processado com sucesso",
  "processamento": {
    "totalLinhas": 3,
    "validos": 2,
    "invalidos": 1,
    "resultado": [
      {
        "linha": 1,
        "nome": "Projeto Válido",
        "status": "VALIDO",
        "dadosMapeados": { ... }
      }
    ],
    "erros": [
      {
        "linha": 2,
        "erro": "Dados inválidos",
        "detalhes": [...]
      }
    ]
  },
  "api": {
    "created": 2,
    "failed": 0,
    "projects": [...],
    "errors": []
  }
}
```

## Teste

Execute o script de teste:

```bash
node test-upload.js
```

## Estrutura do Projeto

```
src/
├── upload/
│   ├── dto/
│   │   └── project.dto.ts          # DTO para validação de projetos
│   ├── interfaces/
│   │   └── api-config.interface.ts # Interfaces para API
│   ├── services/
│   │   └── api.service.ts          # Serviço para requisições HTTP
│   ├── excel.processor.ts          # Processador de Excel
│   ├── upload.service.ts           # Serviço de upload
│   ├── upload.controller.ts        # Controller original
│   └── projects-upload.controller.ts # Controller para projetos
└── app.module.ts
```

## Logs

O sistema gera logs detalhados para:
- Processamento de arquivos
- Validação de dados
- Requisições para API externa
- Erros e exceções

## Limitações

- Máximo de 50 projetos por requisição (conforme especificação da API)
- Apenas arquivos Excel (.xlsx, .xls)
- Timeout de 30 segundos para requisições à API externa