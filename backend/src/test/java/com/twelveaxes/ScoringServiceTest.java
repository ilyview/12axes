package com.twelveaxes;

import static org.assertj.core.api.Assertions.assertThat;

import com.twelveaxes.model.AnswerValue;
import com.twelveaxes.model.AxisResult;
import com.twelveaxes.model.Pole;
import com.twelveaxes.model.ResultRequest;
import com.twelveaxes.model.SubmittedAnswer;
import com.twelveaxes.service.QuizDataService;
import com.twelveaxes.service.ScoringService;
import java.util.List;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class ScoringServiceTest {
    @Autowired
    private QuizDataService dataService;

    @Autowired
    private ScoringService scoringService;

    @Test
    void poolHasTwoHundredSeventyFiveQuestionsAcrossFourteenAxes() {
        var questions = dataService.getQuestions();
        var questionsByAxis = questions.stream()
                .collect(Collectors.groupingBy(question -> question.axisId(), Collectors.counting()));

        assertThat(questions).hasSize(275);
        assertThat(questionsByAxis).hasSize(14);
        // 20 por eixo, menos economia (18) e moral (17), que cederam perguntas a metodo e distribuicao.
        assertThat(questionsByAxis).allSatisfy((axisId, count) -> assertThat(count).isEqualTo(
                switch (axisId) {
                    case "economia" -> 18L;
                    case "moral" -> 17L;
                    default -> 20L;
                }));
    }

    @Test
    void poolHasBalancedPolesPerAxis() {
        var questionsByAxis = dataService.getQuestions().stream()
                .collect(Collectors.groupingBy(question -> question.axisId()));

        assertThat(questionsByAxis).allSatisfy((axisId, axisQuestions) -> {
            long leftCount = axisQuestions.stream()
                    .filter(q -> q.agreePole() == Pole.LEFT).count();
            long rightCount = axisQuestions.stream()
                    .filter(q -> q.agreePole() == Pole.RIGHT).count();
            // 10 por polo; economia e moral cederam perguntas a metodo e distribuicao.
            assertThat(leftCount).as("LEFT em %s", axisId).isBetween(8L, 10L);
            assertThat(rightCount).as("RIGHT em %s", axisId).isBetween(8L, 10L);
            assertThat(Math.abs(leftCount - rightCount)).as("equilibrio em %s", axisId).isLessThanOrEqualTo(1L);
        });
    }

    @Test
    void neutralAnswersProduceCenteredAxes() {
        List<SubmittedAnswer> answers = dataService.getQuestions().stream()
                .map(question -> new SubmittedAnswer(question.id(), AnswerValue.NEUTRAL))
                .toList();

        var results = scoringService.score(new ResultRequest(answers));

        assertThat(results).hasSize(14);
        assertThat(results).allSatisfy(axis -> {
            assertThat(axis.leftPercent()).isEqualTo(50.0);
            assertThat(axis.rightPercent()).isEqualTo(50.0);
            assertThat(axis.intensity()).isEqualTo("Equilibrado");
        });
    }

    @Test
    void answerImpactsOfAnAxisSumToItsDistanceFromTheCenter() {
        ResultRequest request = TestAnswers.mixed(dataService);

        var impacts = scoringService.answerImpacts(request, "pt");

        scoringService.score(request, "pt").forEach(axis -> {
            double sum = impacts.getOrDefault(axis.axisId(), List.of()).stream().mapToDouble(impact -> impact.impact()).sum();
            assertThat(sum).as("eixo %s", axis.axisId()).isCloseTo(axis.leftPercent() - 50.0, org.assertj.core.api.Assertions.within(0.1));
        });
    }

    @Test
    void neutralAnswersHaveZeroImpact() {
        List<SubmittedAnswer> answers = dataService.getQuestions().stream()
                .map(question -> new SubmittedAnswer(question.id(), AnswerValue.NEUTRAL))
                .toList();

        var impacts = scoringService.answerImpacts(new ResultRequest(answers), "pt");

        assertThat(impacts.values().stream().flatMap(List::stream)).allSatisfy(impact -> assertThat(impact.impact()).isZero());
    }

    @Test
    void shortQuizPayloadHasCorrectQuestionsPerAxis() {
        var payload = dataService.getQuiz(QuizDataService.SHORT_VARIANT);
        assertThat(payload.questionsPerAxis()).isEqualTo(3);
        assertThat(payload.questionCount()).isEqualTo(42);
        assertThat(payload.questions()).hasSize(275);
    }

    @Test
    void extendedQuizPayloadHasCorrectQuestionsPerAxis() {
        var payload = dataService.getQuiz(QuizDataService.EXTENDED_VARIANT);
        assertThat(payload.questionsPerAxis()).isEqualTo(5);
        assertThat(payload.questionCount()).isEqualTo(70);
        assertThat(payload.questions()).hasSize(275);
    }

    @Test
    void extremeQuizPayloadUsesTheFullQuestionPool() {
        var payload = dataService.getQuiz(QuizDataService.EXTREME_VARIANT);
        assertThat(payload.questionsPerAxis()).isZero();
        assertThat(payload.questionCount()).isEqualTo(275);
        assertThat(payload.questions()).hasSize(275);
    }

    @Test
    void legacyTwelveValueVectorKeepsOnlyTheOriginalAxes() {
        var results = scoringService.scoreFromLeftPercents(java.util.Collections.nCopies(12, 70.0), "pt");

        assertThat(results).hasSize(ScoringService.LEGACY_AXIS_COUNT);
        assertThat(results).extracting(AxisResult::axisId).doesNotContain("metodo", "distribuicao");
    }

    @Test
    void profileVectorWithoutTheNewAxesDoesNotInventThem() {
        var results = scoringService.scoreFromVector(java.util.Map.of("estrutura", 30.0, "moral", 70.0), "pt");

        assertThat(results).extracting(AxisResult::axisId).containsExactly("estrutura", "moral");
    }
}
