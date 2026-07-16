# ClimaUsers - Gestão de Usuários & Clima do Brasil

Uma aplicação Full Stack robusta, de nível empresarial, projetada para gerenciar cadastros de usuários e monitorar condições climáticas de cidades brasileiras. O projeto adota uma arquitetura em camadas estruturada no Backend e uma interface reativa e recheada de micro-interações no Frontend.

---

## 🏗️ Arquitetura do Sistema

O projeto foi dividido em duas frentes independentes: **Backend (API REST)** e **Frontend (SPA)**.

```mermaid
graph TD
    subgraph Frontend [React 19 SPA]
        UI[Componentes de UI / Tailwind] --> RQ[React Query / Hooks]
        RQ --> AX[Axios Client / Interceptors]
    end

    subgraph Backend [Express API REST]
        AX --> RT[Roteadores / Express]
        RT --> MW[Middlewares: RateLimit, Helmet, Cors]
        MW --> VD[Validators / Zod]
        VD --> CT[Controllers]
        CT --> SV[Services]
        SV --> RC[NodeCache / In-Memory]
        SV --> RP[Repositories / Prisma]
    end

    subgraph Infraestrutura [Persistência & Dados]
        RP --> DB[(PostgreSQL DB)]
        SV --> WAPI[WeatherAPI.com]
    end
```

### Decisões de Arquitetura & Boas Práticas
- **SOLID & Clean Code**: Cada classe ou módulo possui responsabilidade única. O acesso ao banco é abstraído via padrão *Repository*, enquanto a inteligência do negócio reside na camada de *Service*.
- **Validation-First**: Uso intensivo do **Zod** para validar dados de entrada no backend (evitando corrupção do banco) e no frontend (garantindo validações amigáveis antes da submissão).
- **Graceful Shutdown**: Tratamento de encerramento seguro de conexões de banco de dados e servidores Express na recepção de sinais de terminação (`SIGTERM`/`SIGINT`).
- **Localização precisa por coordenadas**: A consulta usa WeatherAPI e valida cidade e estado. Quando o provedor não reconhece um município do IBGE, o backend obtém coordenadas validadas por município/UF no OpenStreetMap e repete a previsão por latitude/longitude. As coordenadas ficam em cache por 30 dias e as consultas respeitam o limite público do geocodificador.

---

## 📂 Estrutura de Pastas

```text
projeto-teste/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma         # Modelagem do banco PostgreSQL via Prisma
│   ├── src/
│   │   ├── config/               # Inicialização de DB, Cache e Envs
│   │   ├── controllers/          # Manipuladores de requisições HTTP
│   │   ├── middlewares/          # Tratamento de erro global e segurança
│   │   ├── repositories/         # Abstração de acesso à base de dados
│   │   ├── routes/               # Mapeamento e documentação Swagger
│   │   ├── schemas/              # Regras Zod de validação
│   │   ├── scripts/              # Seeders e importador de users.csv.gz
│   │   ├── services/             # Regras de negócio e chamada clima
│   │   ├── tests/                # Testes Unitários e Integração (Jest)
│   │   ├── utils/                # Loggers e formatadores
│   │   └── index.ts              # Arquivo de entrada do servidor Express
│   ├── Dockerfile
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── api/                  # Configuração Axios e Interceptors
│   │   ├── components/
│   │   │   ├── layout/           # Sidebar, Navbar e Layout Base
│   │   │   ├── ui/               # Botões, Inputs, Tabelas, Modais
│   │   │   └── weather/          # Mapa (Leaflet), Gráficos (Chart.js)
│   │   ├── context/              # Contexto global de Toasts
│   │   ├── hooks/                # React Query & hooks utilitários
│   │   ├── pages/                # Telas (Dashboard, Lista, Clima, 404)
│   │   ├── types/                # Definições TS compartilhadas
│   │   ├── App.tsx               # Roteador e Providers
│   │   └── main.tsx              # Ponto de entrada do React 19
│   ├── Dockerfile
│   ├── tailwind.config.js
│   └── nginx.conf                # Servidor de produção SPA
├── docker-compose.yml            # Orquestração local completa
└── README.md                     # Documentação geral
```

---

## ⚙️ Variáveis de Ambiente

### Backend (`/backend/.env`)
| Variável | Descrição | Valor Padrão |
| :--- | :--- | :--- |
| `PORT` | Porta de escuta do servidor Express | `3000` |
| `NODE_ENV` | Modo de execução do node | `development` |
| `DATABASE_URL` | String de conexão com o PostgreSQL | `postgresql://weather_app:senha@localhost:5432/weather_users?schema=public` |
| `WEATHER_API_KEY` | Chave de acesso ao provedor de clima | *(Opcional para subir a stack; obrigatória para consultar clima)* |

### Frontend (Configurável via Docker / Vite `.env`)
| Variável | Descrição | Valor Padrão |
| :--- | :--- | :--- |
| `VITE_API_URL` | Endereço do endpoint do backend | `http://localhost:3000/api` |

---

## 🚀 Como Executar o Projeto

A forma recomendada de executar e validar o projeto completo é usando o **Docker Compose**.

> Importante: para popular o banco de dados com os usuários iniciais, você precisa fornecer o arquivo `users.csv.tgz` em `backend/data/`. Sem esse arquivo, o projeto sobe normalmente, mas a carga inicial da tabela `users` não acontece.


### Pré-requisitos
- Ter o **Docker** e o **Docker Compose** instalados na máquina.

### Executando em Produção com Docker
1. Clone o projeto e navegue até a pasta raiz:
   ```bash
   cd projeto-teste
   ```
   Copie `.env.example` para `.env` e defina uma senha segura para o PostgreSQL. A `WEATHER_API_KEY` pode ficar vazia se você quiser apenas subir a stack; nesse caso, apenas as rotas de clima retornarão erro até a chave ser configurada.
2. Coloque o arquivo `users.csv.tgz` em `backend/data/`; o inicializador fará a importação em massa no PostgreSQL.
3. Suba todos os containers com o comando:
   ```bash
   docker-compose up --build
   ```
4. O Compose inicializará três containers:
   - **Banco de Dados PostgreSQL**: Rodando na porta `5432`.
   - **Serviço Backend**: Conecta ao PostgreSQL após este estar saudável, aplica o schema, importa os usuários e expõe a API na porta `3000`.
   - **Serviço Frontend**: Serve a aplicação React no Nginx na porta `8080`.

### Acessando os Serviços
- **Frontend SPA**: [http://localhost:8080](http://localhost:8080)
- **Documentação da API (Swagger)**: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
- **Health Check da API**: [http://localhost:3000/api/health](http://localhost:3000/api/health)

---

## 🧪 Rodando os Testes Automatizados

O backend conta com uma suite completa de testes automatizados com cobertura superior a 80%.

1. Acesse o diretório do backend:
   ```bash
   cd backend
   ```
2. Instale as dependências de desenvolvimento:
   ```bash
   npm install
   ```
3. Execute o comando de testes:
   ```bash
   npm run test
   ```
4. Para visualizar o relatório de cobertura de código:
   ```bash
   npm run test:coverage
   ```

---

## 📝 Documentação da API REST

A API expõe os seguintes recursos abaixo de `/api`:

### 1. Clima (`/weather`)
- **`GET /weather/:city`**: Retorna dados detalhados climáticos da cidade informada.
  - *Exemplo de Resposta (200 OK)*:
    ```json
    {
      "success": true,
      "message": "Previsão do tempo obtida com sucesso",
      "data": {
        "cidade": "Curitiba",
        "estado": "Paraná",
        "latitude": -25.429,
        "longitude": -49.2671,
        "temperatura": 21,
        "sensacaoTermica": 20,
        "umidade": 65,
        "vento": 12,
        "pressao": 1013,
        "condicao": "Parcialmente nublado",
        "icone": "https://cdn.weatherapi.com/...",
        "nascerDoSol": "06:12 AM",
        "porDoSol": "05:48 PM",
        "temperaturasPorHora": [...],
        "previsaoCompleta": [...],
        "alertas": []
      },
      "timestamp": "2026-07-09T22:38:36.123Z"
    }
    ```

### 2. Usuários (`/users`)
- **`POST /users`**: Cria um novo usuário no banco de dados.
  - *Payload*: `{"name": "João Silva", "email": "joao@exemplo.com"}`
- **`GET /users`**: Lista os usuários paginados e filtrados.
  - *Queries suportadas*: `page`, `limit`, `sortBy`, `sortOrder`, `search`.
- **`GET /users/:id`**: Busca um usuário específico através do ID (UUID).
- **`PATCH /users/:id`**: Atualiza o nome e/ou e-mail de um usuário.
- **`DELETE /users/:id`**: Exclui um usuário permanentemente.

---

## 🔮 Melhorias Futuras

1. **Monitoramento e Observabilidade**: Integração com ferramentas como Prometheus e Grafana para colher telemetria a partir do `/health` e logs estruturados.
2. **Internacionalização**: Suporte a múltiplos idiomas (i18n) na interface do usuário.
