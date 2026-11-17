"""Calculo do vetor de 14 eixos de um perfil auditado — fonte unica usada pelo
README (merge), NEW_PROFILE.md e validate.py.

O perfil responde como um usuario: as 275 perguntas (17 a 20 por eixo) MAIS as
perguntas de arquetipo de multipla escolha (backend/.../archetype-questions.json).
O calculo espelha ScoringService.java:
  - cada resposta vira um valor 0..1 do lado do polo esquerdo
    (DT=0, D=0.25, N=0.5, C=0.75, CT=1; invertido quando agreePole == RIGHT);
  - cada alternativa de arquetipo escolhida entra como UMA resposta a mais, com o
    mesmo peso, em cada eixo que ela toca (valor = effects[eixo] / 100);
  - o eixo e a media de tudo isso x 100, arredondada a 1 casa.

Uso na linha de comando:
    python profile-audit/profile_vector.py --prompt-block
        imprime o bloco de perguntas de arquetipo para colar no fim do prompt
    python profile-audit/profile_vector.py <arquivo-de-saida.json>
        imprime o vetor calculado dessa saida
"""
import json
import os
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(BASE, "..", "backend", "src", "main", "resources", "data")

AXIS_ORDER = ['estrutura', 'representacao', 'poder', 'imigracao', 'diplomacia', 'intervencao',
              'economia', 'controle', 'comercio', 'religiao', 'moral', 'tecnologia',
              'metodo', 'distribuicao']
# Eixos acrescentados depois da auditoria original: perfis antigos so os tem depois de
# reauditados. Ate la o vetor do perfil fica sem eles, e o backend os ignora no matching.
NEW_AXES = ['metodo', 'distribuicao']
SCORE = {'DT': 0, 'D': 0.25, 'N': 0.5, 'C': 0.75, 'CT': 1}
ARCHETYPE_KEY = "archetype"


def _load(name):
    with open(os.path.join(DATA, name), encoding="utf-8") as f:
        return json.load(f)


def question_map():
    return {q['id']: q for q in _load('questions-pool.json')}


def archetype_questions():
    return _load('archetype-questions.json')


def archetype_problems(data):
    """Lista de problemas no bloco 'archetype' da saida (vazia se estiver ok)."""
    questions = archetype_questions()
    choices = data.get(ARCHETYPE_KEY)
    if not isinstance(choices, dict):
        return [f"bloco '{ARCHETYPE_KEY}' ausente — responda as {len(questions)} perguntas de arquetipo"]
    problems = []
    for q in questions:
        opt = choices.get(q['id'])
        valid = [o['id'] for o in q['options']]
        if opt is None:
            problems.append(f"pergunta de arquetipo '{q['id']}' sem resposta")
        elif opt not in valid:
            problems.append(f"'{q['id']}': alternativa '{opt}' invalida (validas: {'/'.join(valid)})")
    unknown = set(choices) - {q['id'] for q in questions}
    if unknown:
        problems.append(f"perguntas de arquetipo desconhecidas: {sorted(unknown)}")
    return problems


def axis_question_ids(qmap=None):
    qmap = qmap or question_map()
    ids = {ax: set() for ax in AXIS_ORDER}
    for q in qmap.values():
        ids[q['axisId']].add(q['id'])
    return ids


def complete_axes(data, qmap=None):
    """Eixos com todas as perguntas respondidas. Um eixo novo ainda nao reauditado fica de fora
    (pode ter so as perguntas que vieram de outro eixo)."""
    ids = axis_question_ids(qmap)
    return [ax for ax in AXIS_ORDER
            if ax in data and set(data[ax].get('answers', {})) >= ids[ax]]


def compute_vector(data, qmap=None):
    """Vetor 0-100 por eixo: as respostas de cada eixo + alternativas de arquetipo.
    So entram os eixos completos (ver complete_axes)."""
    qmap = qmap or question_map()
    axes = complete_axes(data, qmap)
    totals = {ax: [0.0, 0.0] for ax in axes}  # soma, peso
    for ax in axes:
        for qid, ans in data[ax]['answers'].items():
            q = qmap[qid]
            s = SCORE[ans]
            totals[ax][0] += (s if q['agreePole'] == 'LEFT' else 1 - s) * q.get('weight', 1)
            totals[ax][1] += q.get('weight', 1)
    choices = data.get(ARCHETYPE_KEY) or {}
    for q in archetype_questions():
        opt = next((o for o in q['options'] if o['id'] == choices.get(q['id'])), None)
        if opt is None:
            continue
        for ax, left_percent in opt['effects'].items():
            if ax not in totals:
                continue
            totals[ax][0] += left_percent / 100.0
            totals[ax][1] += 1.0
    return {ax: round(totals[ax][0] / totals[ax][1] * 100, 1) for ax in axes}


def archetype_prompt_block():
    """Bloco de texto com as perguntas de arquetipo, para o fim do prompt do subagente."""
    lines = [
        "",
        "=== PERGUNTAS DE ARQUETIPO (multipla escolha) ===",
        "Alem das perguntas acima, responda estas perguntas de multipla escolha como o proprio",
        "perfil responderia no quiz: escolha UMA alternativa por pergunta, a que um adepto/porta-voz",
        "real marcaria. Escolha pelo sentido do texto; nao existe alternativa 'neutra' nem opcao de",
        "pular. Grave a letra da alternativa (ex.: \"A\") no bloco \"archetype\" do JSON.",
    ]
    for q in archetype_questions():
        lines.append("")
        lines.append(f"[id={q['id']}] {q['text']['pt']}")
        for o in q['options']:
            lines.append(f"  {o['id']}) {o['text']['pt']}")
    return "\n".join(lines) + "\n"


if __name__ == "__main__":
    if len(sys.argv) == 2 and sys.argv[1] == "--prompt-block":
        sys.stdout.reconfigure(encoding="utf-8")
        print(archetype_prompt_block())
    elif len(sys.argv) == 2:
        with open(sys.argv[1], encoding="utf-8") as f:
            data = json.load(f)
        for p in archetype_problems(data):
            print("AVISO:", p)
        print(json.dumps(compute_vector(data), ensure_ascii=False))
    else:
        print(__doc__)
        sys.exit(1)
