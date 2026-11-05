// Tela do aluno: escolhe a turma, escolhe o proprio nome e baixa o jogo.
// A crianca nao digita nada: tudo e clique em botao grande.
//
// Os nomes vem do banco, e o banco so entrega a turma ao professor dono dela
// (sql/politicas.sql). Por isso esta tela usa a sessao do professor que ja
// entrou neste computador -- e o limite conhecido da spec (lacuna 2): aluno e
// professor, para o banco, sao o mesmo usuario nesta maquina. Sem sessao, a
// tela pede o professor e ainda deixa baixar o jogo, que nao depende do banco.
import { supabase } from './supabase.js';
import { professorAtual } from './auth.js';
import { criarDb } from './db.js';
import { armazenamentoSeguro } from './fila.js';
import {
  renderEscolhaTurma,
  renderEscolhaAluno,
  renderAreaAluno,
  escaparHtml,
} from './render.js';

const db = criarDb(supabase);
const raiz = document.querySelector('#raiz-aluno');
const guardado = armazenamentoSeguro(() => window.localStorage);
const CHAVE_TURMA = 'aluno.turma';

const estado = { turmas: [], turma: null, alunos: [] };

function semAcesso(texto) {
  raiz.innerHTML = renderAreaAluno().replace(
    '<section id="area-aluno">',
    `<section id="area-aluno"><p class="aviso">${escaparHtml(texto)}</p>`
  );
}

function mostrarTurmas() {
  estado.turma = null;
  guardado.setItem(CHAVE_TURMA, '');
  raiz.innerHTML = renderEscolhaTurma(estado.turmas);
}

async function abrirTurma(turma) {
  estado.turma = turma;
  guardado.setItem(CHAVE_TURMA, turma.id);
  raiz.innerHTML = `<section id="area-aluno"><p class="aluno-turma">Carregando…</p></section>`;
  try {
    estado.alunos = await db.listarAlunos(turma.id);
    raiz.innerHTML = renderEscolhaAluno(turma, estado.alunos);
  } catch (e) {
    semAcesso(`Não deu para carregar a turma: ${e.message}`);
  }
}

raiz.addEventListener('click', (evento) => {
  const botao = evento.target.closest('button');
  if (!botao) return;

  if (botao.dataset.turma) {
    const turma = estado.turmas.find((t) => t.id === botao.dataset.turma);
    if (turma) abrirTurma(turma);
  } else if (botao.dataset.aluno) {
    const aluno = estado.alunos.find((a) => a.id === botao.dataset.aluno);
    if (aluno) raiz.innerHTML = renderAreaAluno(aluno);
  } else if (botao.dataset.voltar === 'turma') {
    mostrarTurmas();
  } else if (botao.dataset.voltar === 'aluno') {
    raiz.innerHTML = renderEscolhaAluno(estado.turma, estado.alunos);
  }
});

async function iniciar() {
  try {
    const professor = await professorAtual();
    if (!professor) {
      semAcesso('Para aparecerem as turmas, o professor precisa entrar neste computador uma vez.');
      return;
    }
    estado.turmas = (await db.listarTurmas(professor.id)).map((t) => ({ id: t.id, nome: t.nome }));
  } catch (e) {
    semAcesso(`Não deu para carregar as turmas: ${e.message}`);
    return;
  }

  // Volta direto para a ultima turma usada neste computador: na escola, a
  // maquina costuma ser da mesma sala o dia inteiro.
  const ultima = estado.turmas.find((t) => t.id === guardado.getItem(CHAVE_TURMA));
  if (ultima) abrirTurma(ultima);
  else mostrarTurmas();
}

iniciar();
