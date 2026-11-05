// Geracao de HTML. Funcoes puras: entram dados, sai string. Nao existe
// document aqui, e e isso que torna a interface testavel sem navegador.

import { AVATARES, URL_DOWNLOAD_JOGO, acharAvatar } from './config.js';

// Nome de aluno vem digitado pelo professor ou colado de uma lista da escola.
// Sem escapar, um nome com < executa codigo; um nome com & quebra a tela.
export function escaparHtml(texto) {
  if (texto === null || texto === undefined) return '';
  return String(texto)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function aviso(mensagem) {
  return `<p class="aviso">${escaparHtml(mensagem)}</p>`;
}

const MENSAGEM_VAZIA = {
  'sem-nada': 'Esta turma ainda não tem alunos nem atividades. Cadastre os alunos e as atividades para começar.',
  'sem-alunos': 'Esta turma ainda não tem alunos. Cadastre os alunos para poder marcar o progresso.',
  'sem-atividades': 'Esta turma ainda não tem atividades. Cadastre as atividades para poder marcar o progresso.',
};

// Atalhos da grade vazia para a aba onde se cadastra (js/abas.js le data-ir-aba).
const ATALHOS = {
  'sem-nada': ['alunos', 'atividades'],
  'sem-alunos': ['alunos'],
  'sem-atividades': ['atividades'],
};
const ROTULO_ATALHO = { alunos: 'Cadastrar alunos', atividades: 'Cadastrar atividades' };

function atalhos(motivo) {
  const botoes = (ATALHOS[motivo] ?? [])
    .map((aba) => `<button type="button" class="btn" data-ir-aba="${aba}">${ROTULO_ATALHO[aba]}</button>`)
    .join('');
  return botoes ? `<p class="atalhos">${botoes}</p>` : '';
}

export function renderGrade(grade) {
  if (grade.vazia && grade.linhas.length === 0) {
    return aviso(MENSAGEM_VAZIA[grade.motivo]) + atalhos(grade.motivo);
  }
  if (grade.vazia) {
    // ha alunos, faltam atividades: mostra os alunos e diz o que falta
    const nomes = grade.linhas
      .map((l) => `<li>${escaparHtml(l.aluno.nome)}</li>`)
      .join('');
    return `${aviso(MENSAGEM_VAZIA[grade.motivo])}${atalhos(grade.motivo)}<ul class="lista-alunos">${nomes}</ul>`;
  }

  const cabecalho = grade.atividades
    .map((a) => `<th scope="col">${escaparHtml(a.titulo)}</th>`)
    .join('');

  const corpo = grade.linhas
    .map((linha) => {
      const celulas = linha.celulas
        .map((c) => {
          // So o visto: a grade e manual (js/grade.js, apenasManual).
          const rotulo = c.concluida
            ? `Desmarcar ${c.titulo} de ${linha.aluno.nome}`
            : `Marcar ${c.titulo} de ${linha.aluno.nome}`;
          return (
            `<td>` +
            `<button type="button" class="celula" ` +
            `data-aluno="${escaparHtml(linha.aluno.id)}" ` +
            `data-atividade="${escaparHtml(c.atividade_id)}" ` +
            `aria-pressed="${c.concluida}" ` +
            `aria-label="${escaparHtml(rotulo)}">` +
            `<span aria-hidden="true">${c.concluida ? '✔' : ' '}</span>` +
            `</button></td>`
          );
        })
        .join('');

      return (
        `<tr><th scope="row">${escaparHtml(linha.aluno.nome)}</th>${celulas}` +
        `<td class="total">${linha.concluidas}/${linha.celulas.length}</td></tr>`
      );
    })
    .join('');

  return (
    `<table class="grade"><thead><tr><th scope="col">Aluno</th>${cabecalho}` +
    `<th scope="col">Total</th></tr></thead><tbody>${corpo}</tbody></table>`
  );
}

export function renderListaSimples(itens, tipo) {
  if (itens.length === 0) {
    return aviso(`Nenhum item cadastrado ainda.`);
  }
  const linhas = itens
    .map((item) => {
      const texto = item.nome ?? item.titulo ?? '';
      return (
        `<li><span>${escaparHtml(texto)}</span>` +
        `<button type="button" class="apagar" data-tipo="${escaparHtml(tipo)}" ` +
        `data-id="${escaparHtml(item.id)}" ` +
        `aria-label="Apagar ${escaparHtml(texto)}">Apagar</button></li>`
      );
    })
    .join('');
  return `<ul class="lista">${linhas}</ul>`;
}

// O campo de avatar do formulario de cadastro.
//
// Duas coisas que o rotulo "(em uso)" sozinho nao resolvia:
//
// 1. O campo abre no primeiro bichinho LIVRE, nao no primeiro da lista. A tela
//    redesenha este campo depois de cada cadastro; abrindo sempre no primeiro,
//    ela abria sempre num bichinho ja tomado, e o professor tinha de mexer no
//    campo doze vezes numa turma de doze.
// 2. Bichinho tomado vem `disabled`. Para a crianca que nao le, o bichinho e o
//    nome dela: dois alunos com a mesma coruja ficam indistinguiveis na tela,
//    que e justamente o engano que a crianca comete sozinha.
//
// A excecao importa: se TODOS os bichinhos estiverem tomados, nada e bloqueado.
// Sao 30 avatares para turmas de 20 a 30 alunos, entao a turma que chega no 31o
// existe -- e bloquear tudo ali deixaria o professor sem conseguir cadastrar a
// crianca. Nesse caso o "(em uso)" volta a ser so um aviso, que e o certo:
// repetir o bichinho e ruim, nao cadastrar o aluno e pior.
export function renderSeletorAvatar(avataresUsados = []) {
  const usados = new Set(avataresUsados);
  const livres = AVATARES.filter((a) => !usados.has(a.id));
  const esgotou = livres.length === 0;
  const idInicial = esgotou ? AVATARES[0].id : livres[0].id;

  const opcoes = AVATARES
    .map((a) => {
      const emUso = usados.has(a.id);
      const marca = emUso ? ' (em uso)' : '';
      const bloqueio = emUso && !esgotou ? ' disabled' : '';
      const escolhido = a.id === idInicial ? ' selected' : '';
      return (
        `<option value="${escaparHtml(a.id)}"${bloqueio}${escolhido}>` +
        `${a.emoji} ${escaparHtml(a.rotulo + marca)}</option>`
      );
    })
    .join('');
  return `<select id="avatar-input" aria-label="Avatar do aluno">${opcoes}</select>`;
}

// Tela do aluno (principal.html), em tres passos, sem a crianca digitar nada:
//   1. escolhe a turma pelo nome;
//   2. escolhe o proprio nome (com o bichinho ao lado) na lista da turma;
//   3. baixa o jogo direto, sem passar por outra pagina.
// O aluno nao ve progresso: isso e da professora, em professor.html.
// Os botoes levam data-* que js/aluno.js le; todo texto vindo do banco e escapado.

function botaoVoltar(acao, texto) {
  return `<button type="button" class="aluno-voltar" data-voltar="${acao}">← ${escaparHtml(texto)}</button>`;
}

function listaDeEscolha(itens, atributo, icone) {
  const botoes = itens
    .map(
      (item) =>
        `<li><button type="button" class="escolha-item" ${atributo}="${escaparHtml(item.id)}">` +
        `<span class="escolha-item-icone" aria-hidden="true">${icone(item)}</span>` +
        `<strong>${escaparHtml(item.nome)}</strong></button></li>`
    )
    .join('');
  return `<ul class="grade-escolha">${botoes}</ul>`;
}

export function renderEscolhaTurma(turmas) {
  const corpo =
    turmas.length === 0
      ? aviso('Ainda não há turmas cadastradas. Chame o professor.')
      : `<h2 class="aluno-pergunta">Qual é a sua turma?</h2>` +
        listaDeEscolha(turmas, 'data-turma', () => '🏫');
  return `<section id="area-aluno">${corpo}</section>`;
}

export function renderEscolhaAluno(turma, alunos) {
  const corpo =
    alunos.length === 0
      ? aviso('Esta turma ainda não tem alunos. Chame o professor.')
      : `<h2 class="aluno-pergunta">Quem é você?</h2>` +
        listaDeEscolha(alunos, 'data-aluno', (a) => acharAvatar(a.avatar)?.emoji ?? '🙂');
  return (
    `<section id="area-aluno">` +
    `<p class="aluno-turma">${escaparHtml(turma.nome)}</p>` +
    corpo +
    botaoVoltar('turma', 'Trocar de turma') +
    `</section>`
  );
}

// O link aponta direto para o arquivo: o GitHub serve o .zip como anexo, entao
// o navegador baixa sem abrir pagina nenhuma. Sem URL configurada, a tela avisa
// em vez de mostrar um link para um arquivo que nao existe.
export function renderAreaAluno(aluno = null) {
  const emoji = (aluno && acharAvatar(aluno.avatar)?.emoji) ?? '🎮';
  const saudacao =
    `<span class="aluno-icone" aria-hidden="true">${emoji}</span>` +
    (aluno ? `<p class="aluno-texto">Oi, ${escaparHtml(aluno.nome)}!</p>` : '');
  const conteudo = URL_DOWNLOAD_JOGO
    ? `<p class="download"><a class="botao-baixar" href="${escaparHtml(URL_DOWNLOAD_JOGO)}" download>` +
      `<span aria-hidden="true">⬇️</span> Baixar o jogo (versão para Windows)</a></p>`
    : aviso('O jogo ainda não está disponível. Chame o professor.');
  return (
    `<section id="area-aluno">` +
    saudacao +
    conteudo +
    (aluno ? botaoVoltar('aluno', 'Não sou eu') : '') +
    `</section>`
  );
}
