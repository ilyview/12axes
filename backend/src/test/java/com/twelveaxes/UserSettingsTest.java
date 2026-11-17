package com.twelveaxes;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.twelveaxes.model.AnswerValue;
import com.twelveaxes.model.AxisResult;
import com.twelveaxes.model.QuizResult;
import com.twelveaxes.model.ResultRequest;
import com.twelveaxes.model.SubmittedAnswer;
import com.twelveaxes.payment.EntitlementToken;
import com.twelveaxes.service.CatalogVisibility;
import com.twelveaxes.service.QuizDataService;
import com.twelveaxes.service.ScoringService;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

/** Configuracoes do usuario: perfis de brincadeira escondidos e eixos desligados. */
@SpringBootTest
@AutoConfigureMockMvc
class UserSettingsTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private QuizDataService dataService;

    @Autowired
    private ScoringService scoringService;

    private QuizResult byAxes(String vector, String jokes) throws Exception {
        var request = get("/api/results/by-axes").param("v", vector);
        if (jokes != null) {
            request = request.param("jokes", jokes);
        }
        String body = mockMvc.perform(request)
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        return objectMapper.readValue(body, QuizResult.class);
    }

    // O vetor exato de Sigmatopia: com as brincadeiras visiveis, o pais mais compativel e ela mesma.
    private String sigmatopiaVector() {
        var vector = dataService.getCountryProfiles().get("sigmatopia").vector();
        return dataService.getAxes().stream()
                .map(axis -> vector.containsKey(axis.id()) ? String.valueOf(vector.get(axis.id())) : "")
                .collect(Collectors.joining(","));
    }

    private static List<String> idsIn(QuizResult result) {
        List<String> ids = new ArrayList<>();
        result.matches().forEach(match -> ids.add(match.ideologyId()));
        result.personalityMatches().forEach(match -> ids.add(match.personalityId()));
        result.topCountryMatches().forEach(match -> ids.add(match.countryId()));
        ids.add(result.topCountryMatch().countryId());
        ids.add(result.topPersonalityMatch().personalityId());
        ids.add(result.topMatch().ideologyId());
        if (result.topPartyMatches() != null) {
            result.topPartyMatches().forEach(match -> ids.add(match.partyId()));
        }
        return ids;
    }

    @Test
    void jokeProfilesShowByDefaultAndDisappearWithJokesOff() throws Exception {
        QuizResult withJokes = byAxes(sigmatopiaVector(), null);
        assertThat(withJokes.topCountryMatch().countryId()).isEqualTo("sigmatopia");

        QuizResult withoutJokes = byAxes(sigmatopiaVector(), "off");
        assertThat(withoutJokes.topCountryMatch().countryId()).isNotEqualTo("sigmatopia");
        assertThat(idsIn(withoutJokes)).noneMatch(CatalogVisibility::isJoke);
        assertThat(withoutJokes.topCountryMatches()).hasSize(3);

        // O cache de resultados nao mistura as duas visoes.
        assertThat(byAxes(sigmatopiaVector(), null).topCountryMatch().countryId()).isEqualTo("sigmatopia");
    }

    @Test
    void axisWithoutValueIsLeftOutOfTheSharedResult() throws Exception {
        QuizResult result = byAxes("70,,20,30,70,40,60,55,60,25,20,45,10,", null);

        assertThat(result.axes()).extracting(AxisResult::axisId)
                .doesNotContain("representacao", "distribuicao")
                .contains("estrutura", "metodo")
                .hasSize(12);
        assertThat(result.topMatch().name()).isNotBlank();
    }

    @Test
    void axesWithoutAnsweredQuestionsAreLeftOutOfTheScore() {
        List<SubmittedAnswer> answers = dataService.getQuestions().stream()
                .filter(question -> !question.axisId().equals("religiao") && !question.axisId().equals("moral"))
                .map(question -> new SubmittedAnswer(question.id(), AnswerValue.AGREE))
                .toList();

        List<AxisResult> results = scoringService.score(new ResultRequest(answers));

        assertThat(results).extracting(AxisResult::axisId).doesNotContain("religiao", "moral").hasSize(12);
    }

    @Test
    void hashOfALegacyResultIgnoresTrailingMissingAxes() {
        List<Double> legacy = Stream.generate(() -> 55.0).limit(12).toList();
        List<Double> padded = new ArrayList<>(legacy);
        padded.addAll(Arrays.asList(null, null));
        List<Double> withGap = new ArrayList<>(padded);
        withGap.set(3, null);

        assertThat(EntitlementToken.hashOf(padded)).isEqualTo(EntitlementToken.hashOf(legacy));
        assertThat(EntitlementToken.hashOf(withGap)).isNotEqualTo(EntitlementToken.hashOf(legacy));
    }
}
