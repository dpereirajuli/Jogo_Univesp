# Plataforma Educativa — Projeto Integrador UNIVESP

Plataforma web educativa e gamificada para crianças e estudantes com deficiência
intelectual, feita para uso real em escola parceira.

**No ar desde 2026-11-01:** <https://fabianosannino.github.io/Jogo_Univesp/>

---

## Como usar agora (sem instalar nada)

Abra o endereço acima. A tela de entrada pergunta quem está no computador, e os dois
caminhos existem de propósito:

- **"Sou aluno"** — a criança escolhe a turma, depois o próprio nome, e clica em
  **"Baixar o jogo"**, que baixa direto a versão Windows. **Não digita nada e não vê progresso.**
- **"Sou professor"** — login, e de lá o cadastro de turma, aluno, atividade e
  progresso.

### Contas de demonstração

O autocadastro está **fechado** de propósito (ver `docs/PENDENCIAS.md`, item 7), então
`cadastro.html` recusa — é o comportamento correto. Para avaliar, use uma das contas
prontas. **A senha é a mesma nas três: `Demo2026!univesp`**

| Conta | Já tem dentro |
|---|---|
| `prof1.teste@example.com` | Turma Girassol - 3º ano — 5 alunos, 4 atividades |
| `prof2.teste@example.com` | Turma Arco-Íris - 4º ano — 4 alunos, 5 atividades |
| `prof3.teste@example.com` | Turma Jabuticaba - 2º ano — 6 alunos, 3 atividades |

São três e não uma compartilhada porque a tela tem um botão "Apagar turma": numa conta
só, o primeiro que confirmasse esse botão esvaziaria a tela de todos os seguintes. Com
três, **pode apagar e bagunçar à vontade** sem estragar o teste de ninguém.

**Nenhum dado real de escola mora nessas contas, e nunca vai** — senha publicada e dado
de criança não convivem. Quando o projeto entrar em sala, cada professora recebe conta
própria e estas três são apagadas.

### Roteiro de 5 minutos

1. Entre com uma das contas. Você cai numa turma montada.
2. Cadastre um aluno e escolha o avatar dele (são 30 bichos).
3. Cadastre uma atividade.
4. Marque a atividade como feita para um ou dois alunos.
5. Volte à entrada e clique em **"Sou aluno"**: é isso que a criança vê — turma,
   nome e o download do jogo.

Depois entre numa conta diferente: a turma da anterior **desaparece**. Não é a tela
escondendo — é o banco recusando, por professor. Mexer no endereço do navegador não
contorna.

---

## Divisão da equipe

| Pessoa | Produto | Arquivos |
|---|---|---|
| Pedro Henrique dos Santos Alves | Layout | `style.css`, `principal.html`, `login.html`, `cadastro.html` |
| Olívia de Carvalho | Jogos (Unity) | fora deste repositório |
| Fabiano S. | Perfis, Login e Progresso | `js/`, `css/plataforma.css`, `sql/`, `tests/`, `professor.html`, `index.html` |

**Regra seguida neste repositório:** nada é alterado no produto de um colega sem o aval
dele. As exceções que existem estão todas comentadas no próprio arquivo, explicando por
que não deu para ser aditivo. Quem for mexer, mantenha isso.

---

## O jogo (2026-11-04)

O jogo é **só a versão Windows** feita na Unity pela Olívia. Na tela do aluno, o
botão **"Baixar o jogo"** baixa o arquivo direto, sem página intermediária
(o endereço fica em `URL_DOWNLOAD_JOGO`, em `js/config.js`). A lista de turmas e
de alunos vem do banco pela sessão do professor: ele precisa ter entrado uma vez
naquele computador.

**Não existe jogo rodando no navegador.** Uma recriação em JavaScript chegou a
existir (2026-11-03) e foi retirada por decisão do projeto.

**O progresso é da professora.** O jogo não grava nada na plataforma: quem marca o
que cada aluno conseguiu é a professora, na aba "Marcar progresso". O aluno não vê
nada disso: a tela dele é só o download do jogo.

---

## Para quem for mexer no código

Site **estático**, sem build e sem instalação: HTML, CSS e JavaScript puro, com módulos
nativos do navegador. O Supabase entra por CDN. Não há bundler, não há framework —
trocar isso destruiria o layout do Pedro.

```
index.html          porta de entrada (aluno ou professor)
principal.html      tela do aluno
professor.html      tela de gestão
login.html          autenticação
js/config.js        URL do Supabase, chave pública, lista de avatares, link do jogo
js/db.js            acesso ao banco
js/fila.js          fila de marcações quando a internet cai
sql/schema.sql      tabelas
sql/politicas.sql   isolamento por professor (RLS)
docs/PENDENCIAS.md  histórico das decisões e do que falta — leia antes de mudar algo
docs/especificacao-perfil-login-progresso.md   o que o produto tem de fazer, e por quê
docs/plano-perfil-login-progresso.md           como foi construído, etapa por etapa
```

A chave que está no `js/config.js` é a **pública** (anon), e pode ficar no repositório:
ela só abre o que as políticas de `sql/politicas.sql` permitem. Chave de serviço nunca
entra aqui.

### Rodar os testes

```bash
npm test
```

Testes sem dependência externa — só o `node --test`. **As aspas no comando são
obrigatórias** no Git Bash do Windows, senão o shell expande o `*` antes do Node e o
teste roda vazio.

Os dois arquivos `*.integracao.js` ficam fora desse comando de propósito: eles falam com
o Supabase de verdade e precisam de um `.env.teste` com credenciais, que não está no
repositório.
