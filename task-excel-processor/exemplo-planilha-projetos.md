# Exemplo de Planilha Excel para Upload de Projetos

## Formato da Planilha

A planilha Excel deve conter as seguintes colunas (primeira linha deve ser o cabeçalho):

| Nome do Projeto | Localização | Data de Início | Data de Conclusão Prevista | ID da Construtora | URL da Foto |
|-----------------|-------------|----------------|----------------------------|-------------------|-------------|
| Residencial Jardim das Flores | São Paulo - SP | 2024-03-01 | 2025-06-30 | 507f1f77bcf86cd799439011 | https://exemplo.com/jardim-flores.jpg |
| Comercial Centro Empresarial | Rio de Janeiro - RJ | 2024-04-15 | 2025-12-31 | 507f1f77bcf86cd799439012 | |
| Residencial Vista do Mar | Santos - SP | 2024-05-01 | 2026-02-28 | 507f1f77bcf86cd799439011 | https://exemplo.com/vista-mar.jpg |

## Nomes de Colunas Aceitos

O sistema aceita os seguintes nomes de colunas (case-insensitive):

### Nome do Projeto
- `nome`
- `name`
- `Nome do Projeto`

### Localização
- `localizacao`
- `location`
- `Localização`

### Data de Início
- `dataInicio`
- `startDate`
- `Data de Início`

### Data de Conclusão Prevista
- `dataConclusao`
- `forecastCompletionDate`
- `Data de Conclusão Prevista`

### ID da Construtora
- `construtoraId`
- `constructionCompanyId`
- `ID da Construtora`

### URL da Foto (Opcional)
- `fotoUrl`
- `photoUrl`
- `URL da Foto`

## Validações

1. **Nome do Projeto**: Obrigatório, 2-200 caracteres
2. **Localização**: Obrigatória, não pode estar vazia
3. **Data de Início**: Obrigatória, formato YYYY-MM-DD
4. **Data de Conclusão Prevista**: Obrigatória, formato YYYY-MM-DD, deve ser posterior à data de início
5. **ID da Construtora**: Obrigatório, deve ser um ObjectId válido do MongoDB (24 caracteres hexadecimais)
6. **URL da Foto**: Opcional, deve ser uma URL válida se fornecida

## Exemplo de Uso da API

### Endpoint para Upload com Envio para API
```
POST /projects-upload
Content-Type: multipart/form-data

file: [arquivo-excel]
baseUrl: "https://api.exemplo.com"
endpoint: "/projects/create-many"
token: "seu-jwt-token"
```

### Endpoint para Apenas Validação
```
POST /projects-upload/validate-only
Content-Type: multipart/form-data

file: [arquivo-excel]
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
    "resultado": [...],
    "erros": [...]
  },
  "api": {
    "created": 2,
    "failed": 0,
    "projects": [...],
    "errors": []
  }
}
```