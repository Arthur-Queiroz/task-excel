# 🏢 IDs de Torres Disponíveis na API

## Torres Cadastradas na API

| Nome da Torre | ID (ObjectId) | Projeto |
|---------------|---------------|---------|
| **Torre Beta** | `68f21c5c9490193684524b1b` | Obra - B |
| **Torre A - Residencial Sunset** | `689c8eabb6d1ea919debf07d` | Edifício Residencial Sunset |
| **Torre A** | `689c8f0eb6d1ea919debf089` | Obra - B |
| **Torre B** | `689c8f13b6d1ea919debf08d` | Obra - B |

---

## 📝 Como Corrigir sua Planilha Excel

### PASSO 1: Abrir a planilha `Modelo de tarefas.xlsx`

### PASSO 2: Localizar a coluna "Torre "

A coluna atualmente contém valores como:
```
Torre 
------
TORRE 1
TORRE 1
TORRE 1
```

### PASSO 3: Substituir "TORRE 1" por um ID válido

**Opção 1 - Torre Beta (mais usada):**
```
Torre 
------
68f21c5c9490193684524b1b
68f21c5c9490193684524b1b
68f21c5c9490193684524b1b
```

**Opção 2 - Torre A:**
```
Torre 
------
689c8f0eb6d1ea919debf089
689c8f0eb6d1ea919debf089
689c8f0eb6d1ea919debf089
```

**Opção 3 - Torre B:**
```
Torre 
------
689c8f13b6d1ea919debf08d
689c8f13b6d1ea919debf08d
689c8f13b6d1ea919debf08d
```

### PASSO 4: Salvar a planilha

### PASSO 5: Subir novamente pelo frontend

---

## 🔄 Atalho Rápido (Find & Replace)

Use a função **Localizar e Substituir** do Excel:

1. Pressione `Ctrl + H` (ou `Cmd + H` no Mac)
2. **Localizar**: `TORRE 1`
3. **Substituir por**: `68f21c5c9490193684524b1b`
4. Clique em **Substituir Tudo**
5. Salve o arquivo

---

## ✅ Verificação

Após fazer o upload da planilha corrigida, você deve ver:

**✓ Sucesso:**
```json
{
  "created": 34,
  "failed": 0,
  "tasks": [ /* 34 tasks criadas */ ]
}
```

**✗ Erro (se ainda usar "TORRE 1"):**
```json
{
  "created": 0,
  "failed": 34,
  "errors": [
    { "error": "Tower não encontrada pelo identificador: TORRE 1" }
  ]
}
```

---

## 🆕 Se Precisar Criar uma Nova Torre

Caso nenhuma das torres acima seja adequada, você pode criar uma nova torre via API:

```bash
curl -X POST https://v2-kwwmyyzjzq-uc.a.run.app/towers \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Torre 1",
    "projectId": "689c8ee7b6d1ea919debf085"
  }'
```

A API retornará o `_id` da nova torre, que você poderá usar na planilha.

---

## 📞 Suporte

Se após corrigir os IDs as tasks ainda não aparecerem:

1. Verifique se o token JWT não expirou (expira em: 29/10/2025 às 12:01:25)
2. Consulte o endpoint: `GET /tasks` para confirmar a criação
3. Verifique os logs do backend local em `/tmp/backend.log`

---

**Atualizado**: 29/10/2025 - 11:16  
**Arquivo de Diagnóstico**: `DIAGNOSTICO-PROBLEMA.md`

