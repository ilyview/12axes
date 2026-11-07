package com.twelveaxes;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.twelveaxes.model.AnswerValue;
import com.twelveaxes.model.QuizResult;
import com.twelveaxes.model.ResultRequest;
import com.twelveaxes.model.SubmittedAnswer;
import com.twelveaxes.service.IdeologyMatcherService;
import com.twelveaxes.service.PersonalityMatcherService;
import com.twelveaxes.service.QuizDataService;
import com.twelveaxes.service.ScoringService;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class HatredEasterEggTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private QuizDataService dataService;

    @Autowired
    private ScoringService scoringService;

    @Autowired
    private IdeologyMatcherService ideologyMatcherService;

    @Autowired
    private PersonalityMatcherService personalityMatcherService;

    @Test
    void allStronglyDisagreeUnlocksHatred() throws Exception {
        QuizResult result = submit(allAnswers(AnswerValue.STRONGLY_DISAGREE));

        assertThat(result.topMatch().ideologyId()).isEqualTo(QuizDataService.HATRED_EASTER_EGG_ID);
        assertThat(result.matches().getFirst().ideologyId()).isEqualTo(QuizDataService.HATRED_EASTER_EGG_ID);
        assertThat(result.topPersonalityMatch().personalityId()).isEqualTo(QuizDataService.HATRED_EASTER_EGG_ID);
        assertThat(result.personalityMatches().getFirst().personalityId()).isEqualTo(QuizDataService.HATRED_EASTER_EGG_ID);
        assertThat(result.topMatch().compatibility()).isEqualTo(100.0);
    }

    @Test
    void otherAnswerPatternsDoNotUnlockHatred() throws Exception {
        QuizResult neutral = submit(allAnswers(AnswerValue.NEUTRAL));
        QuizResult mixed = submit(allAnswers(AnswerValue.STRONGLY_DISAGREE).stream()
                .map(answer -> new SubmittedAnswer(answer.questionId(),
                        answer.questionId().equals(dataService.getQuestions().getFirst().id())
                                ? AnswerValue.STRONGLY_AGREE
                                : answer.answer()))
                .toList());

        assertThat(neutral.topMatch().ideologyId()).isNotEqualTo(QuizDataService.HATRED_EASTER_EGG_ID);
        assertThat(neutral.topPersonalityMatch().personalityId()).isNotEqualTo(QuizDataService.HATRED_EASTER_EGG_ID);
        assertThat(mixed.topMatch().ideologyId()).isNotEqualTo(QuizDataService.HATRED_EASTER_EGG_ID);
    }

    @Test
    void sharedResultRestoresHatredWithTheEggMarker() throws Exception {
        String values = String.join(",", Collections.nCopies(12, "50"));
        String body = mockMvc.perform(get("/api/results/by-axes")
                        .param("v", values)
                        .param("egg", QuizDataService.HATRED_EASTER_EGG_ID))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        QuizResult result = objectMapper.readValue(body, QuizResult.class);

        assertThat(result.topMatch().ideologyId()).isEqualTo(QuizDataService.HATRED_EASTER_EGG_ID);
        assertThat(result.topPersonalityMatch().personalityId()).isEqualTo(QuizDataService.HATRED_EASTER_EGG_ID);
    }

    @Test
    void sharedResultWithoutTheEggMarkerKeepsHatredHidden() throws Exception {
        String values = String.join(",", Collections.nCopies(12, "50"));
        String body = mockMvc.perform(get("/api/results/by-axes").param("v", values))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        QuizResult result = objectMapper.readValue(body, QuizResult.class);

        assertThat(result.topMatch().ideologyId()).isNotEqualTo(QuizDataService.HATRED_EASTER_EGG_ID);
        assertThat(result.topPersonalityMatch().personalityId()).isNotEqualTo(QuizDataService.HATRED_EASTER_EGG_ID);
    }

    @Test
    void hatredStaysOutOfTheNormalRankings() {
        var axes = scoringService.scoreFromLeftPercents(Collections.nCopies(12, 50.0), QuizDataService.LANG_PT);

        assertThat(ideologyMatcherService.findAll(axes, QuizDataService.LANG_PT, null))
                .noneMatch(match -> match.ideologyId().equals(QuizDataService.HATRED_EASTER_EGG_ID));
        assertThat(personalityMatcherService.findAll(axes, QuizDataService.LANG_PT, null))
                .noneMatch(match -> match.personalityId().equals(QuizDataService.HATRED_EASTER_EGG_ID));
    }

    private List<SubmittedAnswer> allAnswers(AnswerValue answer) {
        return dataService.getQuestions().stream()
                .map(question -> new SubmittedAnswer(question.id(), answer))
                .toList();
    }

    private QuizResult submit(List<SubmittedAnswer> answers) throws Exception {
        String body = mockMvc.perform(post("/api/results")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ResultRequest(answers, "extreme"))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        return objectMapper.readValue(body, QuizResult.class);
    }
}
