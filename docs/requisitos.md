# CitySense — Documento de Requisitos

**Projeto:** CitySense — Plataforma Inteligente de Monitoramento Colaborativo da Infraestrutura Urbana  
**Versão:** 1.0  
**Local de aplicação:** Montes Claros — MG  
**Tipo de projeto:** Sistema web com módulo complementar mobile planejado

---

## 1. Apresentação do projeto

O CitySense é uma plataforma digital colaborativa destinada ao registro, à localização, à visualização e ao acompanhamento de problemas relacionados à infraestrutura urbana.

A proposta permite que cidadãos e organizações registrem ocorrências, como buracos em vias públicas, problemas de iluminação, calçadas danificadas e descarte irregular de lixo, informando sua localização geográfica.

As ocorrências poderão ser visualizadas em um mapa interativo, consultadas por filtros e acompanhadas conforme a atualização de seus status por usuários administradores.

O projeto será desenvolvido inicialmente como uma aplicação web responsiva, utilizando tecnologias gratuitas ou de código aberto sempre que possível. A arquitetura deverá permitir a futura integração de uma aplicação mobile.

O CitySense será desenvolvido como protótipo acadêmico, sem representar um canal oficial de comunicação com a Prefeitura de Montes Claros.

## 2. Problema identificado

Problemas relacionados à infraestrutura urbana podem ser encontrados em diferentes regiões de uma cidade, mas nem sempre existe uma maneira centralizada e acessível de registrar, localizar e acompanhar essas ocorrências.

Informações dispersas dificultam a visualização dos problemas, a organização dos registros e o acompanhamento de sua situação.

Diante disso, o CitySense propõe uma plataforma colaborativa que centraliza essas informações e utiliza recursos de geolocalização para facilitar sua identificação e visualização.

## 3. Objetivo geral

Desenvolver uma plataforma digital colaborativa para registro, localização, visualização e acompanhamento de ocorrências relacionadas à infraestrutura urbana, utilizando geolocalização, banco de dados relacional e recursos de inteligência artificial.

## 4. Objetivos específicos

- Permitir o cadastro e a autenticação de usuários.
- Possibilitar o registro de ocorrências urbanas com descrição, categoria e localização geográfica.
- Permitir a identificação da localização atual do dispositivo e a seleção manual de pontos no mapa.
- Exibir as ocorrências registradas em um mapa interativo.
- Disponibilizar filtros para facilitar a consulta das ocorrências.
- Permitir que administradores atualizem o status das ocorrências.
- Manter um histórico das alterações de status.
- Implementar um assistente com inteligência artificial para auxiliar os usuários na utilização da plataforma e na descrição das ocorrências.
- Desenvolver uma interface responsiva e preparar a arquitetura para uma futura aplicação mobile.

## 5. Público-alvo

- **Cidadãos:** pessoas que desejam registrar e acompanhar problemas de infraestrutura urbana.
- **Organizações:** instituições e grupos que desejam colaborar com o monitoramento de problemas urbanos.
- **Administradores:** usuários responsáveis pela moderação dos registros e atualização de suas informações.

## 6. Requisitos funcionais

Os requisitos funcionais descrevem as funcionalidades que o sistema deverá oferecer.

| Código | Descrição | Prioridade |
|---|---|---|
| RF01 | O sistema deverá permitir o cadastro e a autenticação de usuários. | Alta |
| RF02 | O sistema deverá permitir o registro de ocorrências com título, descrição, categoria e coordenadas geográficas. | Alta |
| RF03 | O sistema deverá permitir obter a localização atual do dispositivo ou selecionar manualmente um ponto no mapa. | Alta |
| RF04 | O sistema deverá exibir as ocorrências registradas em um mapa interativo. | Alta |
| RF05 | O sistema deverá permitir filtrar ocorrências por categoria e status. | Alta |
| RF06 | O sistema deverá permitir que administradores visualizem, moderem e atualizem as ocorrências. | Alta |
| RF07 | O sistema deverá armazenar o histórico de alterações de status das ocorrências. | Média |
| RF08 | O sistema deverá disponibilizar um assistente de inteligência artificial para auxiliar os usuários. | Média |
| RF09 | O sistema deverá permitir o gerenciamento de usuários conforme seus níveis de acesso. | Média |

## 7. Requisitos não funcionais

| Código | Descrição |
|---|---|
| RNF01 | A interface deverá ser responsiva, adaptando-se a computadores, tablets e smartphones. |
| RNF02 | O sistema deverá utilizar validações no frontend e no backend. |
| RNF03 | As senhas deverão ser armazenadas utilizando mecanismos seguros de hash. |
| RNF04 | O acesso ao banco de dados deverá utilizar consultas preparadas, evitando SQL Injection. |
| RNF05 | As credenciais e informações sensíveis não deverão ser expostas no código público do repositório. |
| RNF06 | O sistema deverá apresentar mensagens compreensíveis em situações de erro. |
| RNF07 | Os dados deverão manter integridade e consistência no banco de dados relacional. |
| RNF08 | O projeto deverá priorizar tecnologias gratuitas ou de código aberto. |
| RNF09 | O código deverá ser organizado e documentado, facilitando sua manutenção e evolução. |
| RNF10 | O sistema deverá funcionar nos principais navegadores modernos. |

## 8. Regras de negócio

- **RN01:** Toda ocorrência deverá possuir título, descrição, categoria e localização geográfica válidos.
- **RN02:** Cada ocorrência deverá estar associada ao usuário responsável pelo registro.
- **RN03:** O usuário deverá poder selecionar a localização por meio da posição atual do dispositivo ou manualmente no mapa.
- **RN04:** O sistema deverá permitir que usuários administradores atualizem o status das ocorrências.
- **RN05:** As alterações de status deverão ser registradas para consulta no histórico da ocorrência.
- **RN06:** O sistema deverá controlar as permissões de acordo com o tipo de usuário.
- **RN07:** O assistente de inteligência artificial deverá atuar como recurso de apoio, sem afirmar que uma ocorrência foi encaminhada a órgãos públicos ou resolvida oficialmente.
- **RN08:** Os registros do CitySense não representarão solicitações oficiais à Prefeitura de Montes Claros.

## 9. Escopo do projeto

### 9.1 Funcionalidades incluídas

- Cadastro e autenticação de usuários.
- Registro e consulta de ocorrências.
- Geolocalização e seleção manual de coordenadas.
- Mapa interativo com visualização das ocorrências.
- Filtros por categoria e status.
- Gerenciamento administrativo.
- Histórico de alterações.
- Assistente de inteligência artificial.
- Interface web responsiva.
- Estrutura de backend e banco de dados relacional.

### 9.2 Funcionalidades previstas para evolução

- Aplicação mobile integrada ao mesmo backend.
- Recursos adicionais de análise e visualização dos dados.
- Ampliação das funcionalidades do assistente de inteligência artificial.

### 9.3 Limites do projeto

- O sistema não terá integração oficial com a Prefeitura de Montes Claros.
- O projeto não garantirá que os problemas registrados sejam solucionados.
- O mapa será utilizado para localização e visualização das ocorrências, não para substituir sistemas oficiais de geoprocessamento.
- Funcionalidades adicionais serão implementadas conforme a disponibilidade de tempo e a viabilidade técnica.

## 10. Tecnologias previstas

| Área | Tecnologia |
|---|---|
| Estrutura da interface | HTML5 |
| Estilização | CSS3 |
| Interatividade | JavaScript |
| Animações | GSAP |
| Backend | PHP |
| Banco de dados | MySQL |
| Mapas | Leaflet |
| Dados cartográficos | OpenStreetMap |
| Geolocalização | API de Geolocalização do navegador |
| Aplicação mobile | React Native e Expo |
| Controle de versão | Git e GitHub |
| Inteligência artificial | Serviço de IA com opção gratuita, conforme disponibilidade |

## 11. Critérios iniciais de aceitação

O sistema será considerado funcional em sua versão principal quando:

1. Um usuário conseguir realizar cadastro e autenticação.
2. Um usuário autenticado conseguir registrar uma ocorrência com localização válida.
3. O sistema conseguir obter a localização atual ou permitir a seleção manual no mapa.
4. As ocorrências cadastradas forem armazenadas no banco de dados.
5. As ocorrências puderem ser visualizadas no mapa.
6. Os filtros permitirem consultar ocorrências por categoria e status.
7. Um administrador conseguir atualizar o status de uma ocorrência.
8. As alterações de status forem armazenadas no histórico.
9. A interface funcionar adequadamente em diferentes tamanhos de tela.
10. As funcionalidades principais forem testadas e documentadas.

---

**Observação:** Este documento poderá ser atualizado durante o desenvolvimento, conforme as decisões técnicas da equipe, as orientações do professor e os resultados dos testes.
