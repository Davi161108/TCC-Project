# Urbs

### Plataforma Inteligente de Monitoramento Colaborativo da Infraestrutura Urbana

O **Urbs** é um projeto acadêmico que propõe uma plataforma digital colaborativa para registrar, localizar, visualizar e acompanhar problemas relacionados à infraestrutura urbana.

A plataforma busca centralizar informações sobre ocorrências como buracos em vias públicas, iluminação defeituosa, calçadas danificadas e descarte irregular de resíduos, utilizando geolocalização e visualização em mapas interativos.

**Área piloto:** Montes Claros — MG.

---

## Objetivo do projeto

Desenvolver uma solução tecnológica que facilite o registro e o acompanhamento colaborativo de problemas urbanos, promovendo a organização e a visualização dessas informações por meio de recursos de geolocalização, mapas interativos e ferramentas digitais.

## Público-alvo

- **Cidadãos:** poderão registrar ocorrências e acompanhar suas atualizações.
- **Organizações:** poderão utilizar a plataforma para contribuir com o monitoramento urbano.
- **Administradores:** serão responsáveis pelo gerenciamento das ocorrências, moderação e atualização de status.

## Funcionalidades previstas

- Cadastro e autenticação de usuários.
- Registro de ocorrências urbanas.
- Geolocalização por dispositivo ou seleção manual no mapa.
- Visualização de ocorrências em mapa interativo.
- Filtros por categoria e status.
- Gerenciamento administrativo das ocorrências.
- Histórico de alterações de status.
- Assistente com inteligência artificial para orientação e auxílio na elaboração de descrições.
- Interface web responsiva.
- Aplicação mobile planejada para uma etapa futura.

## Tecnologias

| Área | Tecnologias |
|---|---|
| Frontend | HTML5, CSS3 e JavaScript |
| Animações | GSAP |
| Backend | PHP |
| Banco de dados | MySQL |
| Mapas | Leaflet e OpenStreetMap |
| Geolocalização | API Geolocation |
| Inteligência artificial | Serviço externo de IA a definir |
| Mobile | React Native e Expo |
| Versionamento | Git e GitHub |

## Arquitetura do sistema

O projeto utilizará uma arquitetura cliente-servidor organizada em três camadas:

1. **Apresentação:** interface web desenvolvida com HTML, CSS e JavaScript.
2. **Aplicação:** API REST desenvolvida em PHP, responsável pelas regras de negócio, validações e comunicação entre os componentes.
3. **Persistência:** banco de dados MySQL, responsável pelo armazenamento das informações.

A aplicação mobile planejada utilizará a mesma API REST da aplicação web, permitindo o compartilhamento dos recursos e das regras de negócio.

## Estrutura do repositório

```text
TCC-Project/
├── docs/
│   ├── requisitos.md
│   ├── arquitetura.md
│   ├── DER.md
│   └── prototipos/
│       └── telas.md
├── poc-mapa/
├── web/
├── backend/
├── mobile/
├── database/
├── tests/
├── .gitignore
└── README.md
```

## Documentação técnica

Os documentos de planejamento e modelagem do projeto estão organizados na pasta `docs/`.

| Documento | Descrição |
|---|---|
| [Requisitos funcionais e não funcionais](docs/requisitos.md) | Define as funcionalidades, restrições e requisitos de qualidade do sistema. |
| [Arquitetura do sistema](docs/arquitetura.md) | Apresenta a organização das camadas, tecnologias, comunicação e diagrama da arquitetura. |
| [Diagrama Entidade-Relacionamento](docs/DER.md) | Apresenta a estrutura e os relacionamentos do banco de dados. |
| [Protótipos das telas](docs/prototipos/telas.md) | Descreve as principais telas e seus elementos. |

## Prova de conceito — Geolocalização

O projeto possui uma prova de conceito desenvolvida com Leaflet e OpenStreetMap para validar a utilização de mapas e recursos de geolocalização.

A demonstração contempla:
- Exibição de mapa interativo.
- Obtenção da localização atual do dispositivo.
- Seleção manual de pontos no mapa.
- Exibição de latitude e longitude.
- Tratamento de erros de localização e permissões.

A prova de conceito representa uma validação inicial da tecnologia de mapas, ainda sem integração com o banco de dados e com a API principal.

## Banco de dados

O banco de dados MySQL foi planejado para armazenar as principais informações da plataforma, utilizando tabelas relacionadas:

- `users`: dados dos usuários.
- `categories`: categorias das ocorrências.
- `occurrences`: registros de problemas urbanos.
- `occurrence_history`: histórico de alterações das ocorrências.

A estrutura utiliza chaves primárias e estrangeiras para manter a integridade dos relacionamentos.

## Status do desenvolvimento

### Planejamento e modelagem

- [x] Definição da proposta.
- [x] Aprovação inicial do professor.
- [x] Criação do repositório GitHub.
- [x] Estruturação inicial das pastas.
- [x] Documentação inicial dos requisitos.
- [x] Modelagem inicial do banco de dados.
- [x] Planejamento da arquitetura do sistema.
- [x] Prova de conceito de geolocalização com Leaflet e OpenStreetMap.

### Desenvolvimento

- [x] Criação inicial das tabelas do banco de dados.
- [x] Configuração inicial da conexão PHP com MySQL.
- [x] Teste inicial de comunicação com o banco de dados.
- [ ] Implementação completa da autenticação.
- [ ] Desenvolvimento do frontend.
- [ ] Implementação do CRUD de ocorrências.
- [ ] Integração do mapa com a API e o banco de dados.
- [ ] Desenvolvimento do painel administrativo.
- [ ] Implementação do assistente de inteligência artificial.
- [ ] Testes de integração e validação.

### Etapas futuras

- [ ] Finalização da documentação técnica.
- [ ] Implementação dos recursos complementares.
- [ ] Desenvolvimento da aplicação mobile, conforme o cronograma.
- [ ] Preparação da apresentação e defesa do projeto.

## Como executar o projeto

O ambiente de desenvolvimento deverá utilizar PHP e MySQL, podendo ser configurado por meio de ferramentas locais como XAMPP.

**Etapas previstas:**

1. Clonar ou baixar o repositório.
2. Configurar o ambiente PHP e MySQL.
3. Criar o banco de dados e importar o script SQL disponível na pasta `database/`.
4. Configurar a conexão com o banco de dados no backend.
5. Iniciar o servidor local.
6. Acessar a aplicação pelo navegador.

As instruções específicas serão complementadas conforme a implementação dos módulos.

## Equipe

- **Davi David Aguiar Fonseca**
- **Saulo Gabriel Rodrigues Guimarães**

Projeto desenvolvido como Trabalho de Conclusão de Curso do Técnico em Desenvolvimento de Sistemas — Proz Educação, turma 251BTTDS.

## Observação

O Urbs é um protótipo acadêmico. Não possui integração oficial com a Prefeitura de Montes Claros e não representa um canal oficial de solicitação de serviços públicos.

As ocorrências registradas na plataforma têm finalidade demonstrativa e de monitoramento colaborativo dentro do escopo do projeto.
