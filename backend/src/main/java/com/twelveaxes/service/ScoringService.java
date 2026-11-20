package com.twelveaxes.service;

import com.twelveaxes.model.AnswerImpact;
import com.twelveaxes.model.AnswerValue;
import com.twelveaxes.model.ArchetypeQuestion;
import com.twelveaxes.model.Axis;
import com.twelveaxes.model.AxisResult;
import com.twelveaxes.model.Pole;
import com.twelveaxes.model.Question;
import com.twelveaxes.model.ResultRequest;
import com.twelveaxes.model.SubmittedAnswer;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ScoringService {
    private final QuizDataService dataService;

    public ScoringService(QuizDataService dataService) {
        this.dataService = dataService;
    }

    public List<AxisResult> score(ResultRequest request) {
        return score(request, QuizDataService.LANG_PT);
    }

    public List<AxisResult> score(ResultRequest request, String lang) {
        Map<String, Question> questionById = questionsById();
        validateAnswers(request.answers(), questionById);
        Map<String, WeightedScore> scores = accumulate(request, questionById);
        // Eixo desligado nas configuracoes: nenhuma pergunta dele foi respondida, e ele sai do resultado (as
        // perguntas de arquetipo sozinhas nao bastam para posicionar alguem num eixo).
        Set<String> answeredAxes = request.answers().stream()
                .map(answer -> questionById.get(answer.questionId()).axisId())
                .collect(Collectors.toSet());

        String normalizedLang = QuizDataService.normalizeLang(lang);
        return dataService.getAxes(normalizedLang).stream()
                .filter(axis -> answeredAxes.contains(axis.id()))
                .map(axis -> toAxisResult(axis, scores.get(axis.id()), normalizedLang))
                .toList();
    }

    /**
     * Quanto cada resposta puxou o eixo dela, em pontos de leftPercent (positivo = polo esquerdo). E a mesma conta do
     * {@link #score(ResultRequest, String)}: a soma dos impactos de um eixo e a distancia dele ao centro, sem o
     * arredondamento. As perguntas de arquetipo entram no peso do eixo, mas nao aparecem na lista (nao tem texto).
     */
    public Map<String, List<AnswerImpact>> answerImpacts(ResultRequest request, String lang) {
        Map<String, Question> questionById = questionsById();
        validateAnswers(request.answers(), questionById);
        Map<String, WeightedScore> scores = accumulate(request, questionById);
        Map<String, String> textById = dataService.getQuestionsForLang(QuizDataService.normalizeLang(lang)).stream()
                .collect(Collectors.toMap(Question::id, Question::text));

        Map<String, List<AnswerImpact>> byAxis = new HashMap<>();
        for (SubmittedAnswer submittedAnswer : request.answers()) {
            Question question = questionById.get(submittedAnswer.questionId());
            double totalWeight = scores.get(question.axisId()).weight;
            double impact = question.weight() * (leftScore(question, submittedAnswer.answer()) - 0.5) / totalWeight * 100.0;
            byAxis.computeIfAbsent(question.axisId(), ignored -> new java.util.ArrayList<>()).add(new AnswerImpact(
                    question.id(),
                    textById.getOrDefault(question.id(), question.text()),
                    submittedAnswer.answer(),
                    impact));
        }
        return byAxis;
    }

    private Map<String, Question> questionsById() {
        return dataService.getQuestions().stream()
                .collect(Collectors.toMap(Question::id, Function.identity()));
    }

    private Map<String, WeightedScore> accumulate(ResultRequest request, Map<String, Question> questionById) {
        Map<String, WeightedScore> scores = new HashMap<>();
        for (SubmittedAnswer submittedAnswer : request.answers()) {
            Question question = questionById.get(submittedAnswer.questionId());
            scores.computeIfAbsent(question.axisId(), ignored -> new WeightedScore())
                    .add(leftScore(question, submittedAnswer.answer()), question.weight());
        }
        addArchetypeAnswers(request.archetype(), scores);
        return scores;
    }

    // Nota da resposta no polo esquerdo (0 a 1): concordar com uma pergunta do polo direito vale o oposto.
    private static double leftScore(Question question, AnswerValue answer) {
        double towardAgreement = answer.scoreTowardAgreement();
        return question.agreePole() == Pole.LEFT ? towardAgreement : 1.0 - towardAgreement;
    }

    /**
     * Quantos eixos existiam antes de metodo e distribuicao. Links e relatorios pagos de resultados antigos trazem
     * so esses valores: o resultado volta com esses eixos, sem inventar posicao nos eixos novos.
     */
    public static final int LEGACY_AXIS_COUNT = 12;

    // Reconstrói o resultado a partir de um vetor de leftPercent (um valor por
    // eixo, na ordem de axes.json) — usado pelas URLs de resultado compartilhado.
    // Aceita o vetor antigo (os LEGACY_AXIS_COUNT primeiros eixos) e valores nulos: eixo
    // desligado nas configuracoes ou ainda inexistente quando o resultado foi feito. Esses eixos ficam fora.
    public List<AxisResult> scoreFromLeftPercents(List<Double> leftPercents, String lang) {
        String normalizedLang = QuizDataService.normalizeLang(lang);
        List<Axis> axes = dataService.getAxes(normalizedLang);
        boolean knownSize = leftPercents.size() == axes.size() || leftPercents.size() == LEGACY_AXIS_COUNT;
        if (!knownSize || leftPercents.stream().allMatch(java.util.Objects::isNull)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Vetor de eixos inválido: esperados " + axes.size() + " valores"
            );
        }
        return java.util.stream.IntStream.range(0, leftPercents.size())
                .filter(index -> leftPercents.get(index) != null)
                .mapToObj(index -> buildAxisResult(axes.get(index), leftPercents.get(index), normalizedLang))
                .toList();
    }

    /** O vetor na ordem de axes.json, com nulo nos eixos que o resultado nao tem (o inverso de scoreFromLeftPercents). */
    public List<Double> positionalValues(List<AxisResult> results) {
        Map<String, Double> byAxis = new HashMap<>();
        results.forEach(result -> byAxis.put(result.axisId(), result.leftPercent()));
        return dataService.getAxes().stream().map(axis -> byAxis.get(axis.id())).toList();
    }

    /**
     * Resultado a partir do vetor de um perfil (eixo -> leftPercent), na ordem de axes.json. Eixo que o perfil
     * ainda nao tem (eixo novo antes da reauditoria) fica fora, em vez de virar um 50 inventado.
     */
    public List<AxisResult> scoreFromVector(java.util.Map<String, Double> vector, String lang) {
        String normalizedLang = QuizDataService.normalizeLang(lang);
        return dataService.getAxes(normalizedLang).stream()
                .filter(axis -> vector.containsKey(axis.id()))
                .map(axis -> buildAxisResult(axis, vector.get(axis.id()), normalizedLang))
                .toList();
    }

    // Cada alternativa escolhida entra como uma resposta a mais em cada eixo que
    // ela toca, com o mesmo peso (1) de uma pergunta comum.
    private void addArchetypeAnswers(Map<String, String> choices, Map<String, WeightedScore> scores) {
        if (choices == null || choices.isEmpty()) {
            return;
        }
        Map<String, ArchetypeQuestion> byId = dataService.getArchetypeQuestions().stream()
                .collect(Collectors.toMap(ArchetypeQuestion::id, Function.identity()));
        choices.forEach((questionId, optionId) -> {
            ArchetypeQuestion question = byId.get(questionId);
            ArchetypeQuestion.Option option = question == null ? null : question.options().stream()
                    .filter(candidate -> candidate.id().equals(optionId))
                    .findFirst()
                    .orElse(null);
            if (option == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Resposta de arquétipo inválida: " + questionId + "=" + optionId
                );
            }
            option.effects().forEach((axisId, leftPercent) ->
                    scores.computeIfAbsent(axisId, ignored -> new WeightedScore()).add(leftPercent / 100.0, 1.0));
        });
    }

    private void validateAnswers(List<SubmittedAnswer> answers, Map<String, Question> questionById) {
        Set<String> unknown = answers.stream()
                .map(SubmittedAnswer::questionId)
                .filter(id -> !questionById.containsKey(id))
                .collect(Collectors.toSet());
        if (!unknown.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Respostas inválidas. IDs desconhecidos: " + unknown
            );
        }
    }

    private AxisResult toAxisResult(Axis axis, WeightedScore weightedScore, String lang) {
        return buildAxisResult(axis, weightedScore.average() * 100.0, lang);
    }

    private AxisResult buildAxisResult(Axis axis, double rawLeftPercent, String lang) {
        double leftPercent = round(Math.max(0.0, Math.min(100.0, rawLeftPercent)));
        double rightPercent = round(100.0 - leftPercent);
        String dominantPole = leftPercent >= rightPercent ? axis.leftPole() : axis.rightPole();
        double distanceFromCenter = Math.abs(leftPercent - 50.0);
        String intensity = intensityFor(distanceFromCenter, lang);
        return new AxisResult(
                axis.id(),
                axis.label(),
                axis.leftPole(),
                axis.rightPole(),
                leftPercent,
                rightPercent,
                dominantPole,
                intensity
        );
    }

    private String intensityFor(double distanceFromCenter, String lang) {
        int level = distanceFromCenter < 7.5 ? 0 : distanceFromCenter < 22.5 ? 1 : distanceFromCenter < 37.5 ? 2 : 3;
        return switch (QuizDataService.normalizeLang(lang)) {
            case QuizDataService.LANG_EN -> List.of("Balanced", "Leaning", "Strong", "Very strong").get(level);
            case QuizDataService.LANG_ES -> List.of("Equilibrado", "Inclinado", "Fuerte", "Muy fuerte").get(level);
            case QuizDataService.LANG_FR -> List.of("Équilibré", "Tendance", "Fort", "Très fort").get(level);
            case QuizDataService.LANG_RU -> List.of("Сбалансированно", "Умеренно", "Сильно", "Очень сильно").get(level);
            case QuizDataService.LANG_IT -> List.of("Equilibrato", "Tendente", "Forte", "Molto forte").get(level);
            case QuizDataService.LANG_DE -> List.of("Ausgeglichen", "Tendenz", "Stark", "Sehr stark").get(level);
            default -> List.of("Equilibrado", "Inclinado", "Forte", "Muito forte").get(level);
        };
    }

    private double round(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private static final class WeightedScore {
        private double total;
        private double weight;

        void add(double score, double itemWeight) {
            total += score * itemWeight;
            weight += itemWeight;
        }

        double average() {
            return weight == 0.0 ? 0.5 : total / weight;
        }
    }
}
