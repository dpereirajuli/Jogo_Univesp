import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  escaparHtml,
  renderGrade,
  renderAreaAluno,
  renderSeletorAvatar,
  renderEscolhaTurma,
  renderEscolhaAluno,
} from '../js/render.js';
import { existsSync } from 'node:fs';
import { URL_DOWNLOAD_JOGO, AVATARES } from '../js/config.js';
import { montarGrade } from '../js/grade.js';

const ALUNOS = [
  { id: 'a1', nome: 'Ana', avatar: 'coruja' },
  { id: 'a2', nome: 'Bruno', avatar: 'raposa' },
];
const ATIVIDADES = [
  { id: 'at1', titulo: 'Contar ate 10', ordem: 1 },
  { id: 'at2', titulo: 'Cores', ordem: 2 },
];

// --- Review Focus 1: nome vindo da escola entra em HTML gerado ---

test('escaparHtml neutraliza os cinco caracteres perigosos', () => {
  assert.equal(
    escaparHtml(`<script>alert("x")&'`),
    '&lt;script&gt;alert(&quot;x&quot;)&amp;&#39;'
  );
});

test('escaparHtml aceita nao-string sem quebrar', () => {
  assert.equal(escaparHtml(null), '');
  assert.equal(escaparHtml(undefined), '');
  assert.equal(escaparHtml(7), '7');
});

test('nome de aluno com tag nao vira HTML na grade', () => {
  const alunos = [{ id: 'a1', nome: '<img src=x onerror=alert(1)>', avatar: 'coruja' }];
  const html = renderGrade(montarGrade(alunos, ATIVIDADES, []));
  assert.ok(!html.includes('<img'), 'tag do nome foi interpretada como HTML');
  assert.ok(html.includes('&lt;img'), 'o nome deve aparecer como texto literal');
});

test('nome com & e aspas aparece legivel', () => {
  const alunos = [{ id: 'a1', nome: `Ana & "Bia"`, avatar: 'coruja' }];
  const html = renderGrade(montarGrade(alunos, ATIVIDADES, []));
  assert.ok(html.includes('Ana &amp; &quot;Bia&quot;'));
});

test('titulo de atividade com tag nao vira HTML', () => {
  const ats = [{ id: 'at1', titulo: '<b>Cores</b>', ordem: 1 }];
  const html = renderGrade(montarGrade(ALUNOS, ats, []));
  assert.ok(!html.includes('<b>Cores</b>'));
  assert.ok(html.includes('&lt;b&gt;Cores&lt;/b&gt;'));
});

// --- grade do professor ---

test('grade tem uma celula clicavel por aluno e atividade', () => {
  const html = renderGrade(montarGrade(ALUNOS, ATIVIDADES, []));
  for (const a of ALUNOS) {
    for (const at of ATIVIDADES) {
      assert.ok(
        html.includes(`data-aluno="${a.id}"`) && html.includes(`data-atividade="${at.id}"`),
        `falta a celula ${a.id}/${at.id}`
      );
    }
  }
});

test('celula concluida e marcada; pendente nao recebe marca de erro', () => {
  const g = montarGrade(ALUNOS, ATIVIDADES, [
    { aluno_id: 'a1', atividade_id: 'at1', origem: 'professor' },
  ]);
  const html = renderGrade(g);
  assert.ok(html.includes('aria-pressed="true"'), 'falta estado marcado');
  assert.ok(html.includes('aria-pressed="false"'), 'falta estado pendente');
  assert.ok(!/\u274C|\u2716/.test(html), 'pendente nao pode levar X (spec D7)');
});

test('grade vazia explica o que falta em vez de mostrar nada', () => {
  assert.match(renderGrade(montarGrade([], [], [])), /aluno/i);
  assert.match(renderGrade(montarGrade([], ATIVIDADES, [])), /aluno/i);
  assert.match(renderGrade(montarGrade(ALUNOS, [], [])), /atividade/i);
});

// --- o campo de avatar do formulario de cadastro ---
//
// Contexto do bug, visto no navegador em 2026-10-31: depois de cadastrar a Ana
// com a coruja, a tela redesenha o campo e ele volta para "Coruja (em uso)".
// Numa turma de doze o professor repete isso doze vezes, e na pressa cadastra
// dois alunos com o mesmo bichinho. O plano ja dizia por que isso importa:
// "dois alunos ficam indistinguiveis na tela -- que e exatamente o erro que a
// crianca comete sozinha". Para a crianca que nao le, o bichinho E o nome dela.

function opcoesDe(html) {
  return html.match(/<option[^>]*>/g) ?? [];
}

test('o campo de avatar ja vem no primeiro bichinho livre', () => {
  // Coruja e raposa sao os dois primeiros da lista, e estao tomados.
  const html = renderSeletorAvatar(['coruja', 'raposa']);
  const selecionadas = opcoesDe(html).filter((o) => o.includes('selected'));

  assert.equal(selecionadas.length, 1, 'exatamente uma opcao pre-selecionada');
  assert.ok(
    selecionadas[0].includes(`value="${AVATARES[2].id}"`),
    `esperava ${AVATARES[2].id}, o terceiro da lista; veio ${selecionadas[0]}`
  );
});

test('sem ninguem cadastrado, o campo vem no primeiro da lista', () => {
  const selecionadas = opcoesDe(renderSeletorAvatar([])).filter((o) => o.includes('selected'));
  assert.equal(selecionadas.length, 1);
  assert.ok(selecionadas[0].includes(`value="${AVATARES[0].id}"`));
});

test('bichinho em uso nao da para escolher, nao so avisa', () => {
  const html = renderSeletorAvatar(['coruja']);
  const opcoes = opcoesDe(html);

  const coruja = opcoes.find((o) => o.includes('value="coruja"'));
  assert.ok(coruja.includes('disabled'), 'a coruja ja e da Ana: o campo tem de barrar');

  const livres = opcoes.filter((o) => !o.includes('value="coruja"'));
  for (const o of livres) {
    assert.ok(!o.includes('disabled'), `bichinho livre bloqueado: ${o}`);
  }
});

// Sao 30 avatares e o plano fala de turmas de 20 a 30 alunos: a turma que
// chega no 31o aluno existe. Se o campo bloqueasse tudo, o professor
// simplesmente nao conseguiria cadastrar essa crianca -- seria trocar um
// incomodo por uma parede. Quando nao sobra bichinho, o campo libera a
// repeticao e o rotulo "(em uso)" volta a ser o que era: um aviso.
test('turma que esgotou os bichinhos ainda deixa cadastrar', () => {
  const html = renderSeletorAvatar(AVATARES.map((a) => a.id));
  const opcoes = opcoesDe(html);

  assert.ok(!html.includes('disabled'), 'nada bloqueado quando nao sobra escolha');
  assert.equal(
    opcoes.filter((o) => o.includes('selected')).length,
    1,
    'o campo nao pode ficar vazio: tem de dar para enviar o formulario'
  );
  assert.ok(html.includes('(em uso)'), 'o aviso continua visivel');
});

// --- tela do aluno: turma -> nome -> download ---
//
// A crianca escolhe a turma, depois o proprio nome, e baixa o jogo direto
// (sem pagina intermediaria). Nao ve progresso e nao digita nada.

const TURMAS = [
  { id: 't1', nome: 'Turma Girassol' },
  { id: 't2', nome: 'Turma <b>Sol</b>' },
];

test('a escolha de turma mostra o nome de cada turma, escapado', () => {
  const html = renderEscolhaTurma(TURMAS);
  assert.match(html, /Qual é a sua turma\?/);
  assert.ok(html.includes('data-turma="t1"'));
  assert.ok(html.includes('Turma Girassol'));
  assert.ok(html.includes('Turma &lt;b&gt;Sol&lt;/b&gt;'), 'nome de turma tem de ser escapado');
  assert.ok(!html.includes('<b>'));
});

test('sem turmas, a tela pede o professor', () => {
  assert.match(renderEscolhaTurma([]), /class="aviso"/);
});

test('a escolha de aluno mostra a turma e todos os alunos com o bichinho', () => {
  const html = renderEscolhaAluno(TURMAS[0], ALUNOS);
  assert.ok(html.includes('Turma Girassol'), 'o nome da turma aparece');
  assert.match(html, /Quem é você\?/);
  for (const a of ALUNOS) {
    assert.ok(html.includes(`data-aluno="${a.id}"`), `falta o botao de ${a.nome}`);
    assert.ok(html.includes(a.nome));
  }
  assert.ok(html.includes('\u{1F989}'), 'o bichinho da Ana (coruja) aparece');
  assert.ok(html.includes('data-voltar="turma"'), 'da para trocar de turma');
});

test('turma sem alunos avisa e deixa voltar', () => {
  const html = renderEscolhaAluno(TURMAS[0], []);
  assert.match(html, /class="aviso"/);
  assert.ok(html.includes('data-voltar="turma"'));
});

test('o botao de baixar aponta direto para o arquivo do jogo', () => {
  assert.notEqual(URL_DOWNLOAD_JOGO, '', 'o jogo precisa estar hospedado');
  const html = renderAreaAluno(ALUNOS[0]);
  assert.match(html, /class="botao-baixar"/, 'falta o botao de baixar');
  assert.ok(html.includes(`href="${URL_DOWNLOAD_JOGO}"`), 'o link tem de ser o arquivo, sem pagina intermediaria');
  assert.ok(!html.includes('.html'), 'nao pode levar a outra pagina');
  assert.equal((html.match(/<a /g) ?? []).length, 1, 'o download e o unico link da tela');
  assert.ok(html.includes('Oi, Ana!'), 'cumprimenta o aluno escolhido');
  assert.ok(html.includes('data-voltar="aluno"'), 'da para dizer "nao sou eu"');
});

test('a tela do aluno nao mostra progresso', () => {
  for (const html of [renderEscolhaTurma(TURMAS), renderEscolhaAluno(TURMAS[0], ALUNOS), renderAreaAluno(ALUNOS[0])]) {
    assert.ok(!/conseguiu|atividade/i.test(html), 'o aluno nao ve progresso');
    assert.ok(!/<canvas/i.test(html), 'nao pode haver jogo desenhado na tela');
    for (const tag of ['<input', '<textarea', '<select', '<form']) {
      assert.ok(!html.includes(tag), `a crianca nao digita nada (${tag})`);
    }
  }
});

test('a pagina intermediaria de download nao existe mais', () => {
  assert.ok(!existsSync(new URL('../baixar.html', import.meta.url)));
});

// Um endereco http:// num link que a escola vai clicar e um download que
// qualquer rede intermediaria pode trocar por outro arquivo. Este teste nao
// deixa a constante cair para http por descuido numa troca de hospedagem.
test('a URL do jogo e https', () => {
  assert.match(URL_DOWNLOAD_JOGO, /^https:\/\//, 'o download tem de ser por https');
});

test('grade vazia oferece o atalho para cadastrar o que falta', () => {
  assert.match(renderGrade(montarGrade([], [], [])), /data-ir-aba="alunos".*data-ir-aba="atividades"/s);
  assert.match(renderGrade(montarGrade([], ATIVIDADES, [])), /data-ir-aba="alunos"/);
  assert.match(renderGrade(montarGrade(ALUNOS, [], [])), /data-ir-aba="atividades"/);
});
