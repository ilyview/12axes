package com.twelveaxes;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.twelveaxes.model.AxisResult;
import com.twelveaxes.model.BookRecommendation;
import com.twelveaxes.model.PersonalityMatch;
import com.twelveaxes.model.QuizResult;
import com.twelveaxes.service.PersonalityMatcherService;
import com.twelveaxes.service.QuizDataService;
import com.twelveaxes.service.ScoringService;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class BookRecommendationTest {
    private static final String LEFT_LIBERTARIAN_VECTOR = "70,80,20,30,70,40,60,55,60,25,20,45";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private QuizDataService dataService;

    @Autowired
    private ScoringService scoringService;

    @Autowired
    private PersonalityMatcherService personalityMatcherService;

    private QuizResult result(String lang) throws Exception {
        return result(lang, LEFT_LIBERTARIAN_VECTOR);
    }

    private QuizResult result(String lang, String vector) throws Exception {
        String body = mockMvc.perform(get("/api/results/by-axes").param("v", vector).param("lang", lang))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        return objectMapper.readValue(body, QuizResult.class);
    }

    @Test
    void recommendsUpToThreeBooksFromTopPersonalitiesSortedByCompatibility() throws Exception {
        QuizResult result = result("pt");
        // O resultado nao traz mais a melhor personalidade de cada area (e do Relatorio Completo), mas os livros ainda saem do conjunto das duas.
        List<AxisResult> axes = scoringService.scoreFromLeftPercents(
                Stream.of(LEFT_LIBERTARIAN_VECTOR.split(",")).map(Double::valueOf).toList(), "pt");
        Set<String> pool = Stream.concat(result.personalityMatches().stream(), personalityMatcherService.findBestPerCategory(axes, "pt").stream())
                .map(PersonalityMatch::personalityId)
                .collect(Collectors.toSet());

        assertThat(result.bookRecommendations()).isNotEmpty().hasSizeLessThanOrEqualTo(3);
        assertThat(result.bookRecommendations())
                .isSortedAccordingTo((a, b) -> Double.compare(b.compatibility(), a.compatibility()));
        assertThat(result.bookRecommendations()).doesNotHaveDuplicates();
        assertThat(result.bookRecommendations()).allSatisfy(book -> {
            assertThat(pool).contains(book.personalityId());
            assertThat(dataService.getBooks()).containsKey(book.personalityId());
        });
    }

    @Test
    void recommendsMikeMaBooksAndImagesForHisVector() throws Exception {
        QuizResult result = result("pt", "75.6,16.4,54.1,93.6,75.5,68.6,57.9,51.6,91.1,59.9,20.2,11.1");

        assertThat(result.topPersonalityMatch().personalityId()).isEqualTo("mike-ma");
        assertThat(result.topMatch().ideologyId()).isEqualTo("ecofascismo");
        assertThat(result.topMatch().imagePath()).isEqualTo("/ideologies/images/ecofascismo.png");
        assertThat(result.topPartyMatch().partyId()).isEqualTo("pine-tree-party");
        assertThat(result.topPartyMatch().logoPath()).isEqualTo("/parties/logos/pine-tree-party.png");
        assertThat(result.bookRecommendations()).extracting(BookRecommendation::title)
                .contains("Harassment Architecture", "Gothic Violence");
        assertThat(result.bookRecommendations()).extracting(BookRecommendation::coverPath)
                .contains("/books/covers/harassment-architecture.jpg", "/books/covers/gothic-violence.jpg");
    }

    @Test
    void usesBrazilianStoreAndTagInPortuguese() throws Exception {
        assertThat(result("pt").bookRecommendations()).allSatisfy(book -> {
            assertThat(book.title()).isNotBlank();
            assertThat(book.url()).startsWith("https://www.amazon.com.br/").contains("tag=12axes-20");
        });
    }

    @Test
    void usesUsStoreAndTagInEnglish() throws Exception {
        assertThat(result("en").bookRecommendations()).allSatisfy(book ->
                assertThat(book.url()).startsWith("https://www.amazon.com/").contains("tag=12axes0d-20"));
    }

    @Test
    void spanishShowsTheSpanishTitleButSearchesTheUsStoreWithTheEnglishTitle() throws Exception {
        var recommendations = result("es").bookRecommendations();
        assertThat(recommendations).isNotEmpty().allSatisfy(book -> {
            var stored = dataService.getBooks().get(book.personalityId()).stream()
                    .filter(candidate -> {
                        String spanish = candidate.title().get("es");
                        String shown = spanish == null || spanish.isBlank() ? candidate.title().get("en") : spanish;
                        return book.title().equals(shown);
                    })
                    .findFirst()
                    .orElseThrow(() -> new AssertionError("book not found: " + book.title()));
            String spanish = stored.title().get("es");
            assertThat(book.title()).isEqualTo(spanish == null || spanish.isBlank() ? stored.title().get("en") : spanish);
            assertThat(book.url()).startsWith("https://www.amazon.com/").contains("tag=12axes0d-20");
            if (spanish != null && !spanish.equals(stored.title().get("en"))) {
                assertThat(java.net.URLDecoder.decode(book.url(), StandardCharsets.UTF_8)).contains(stored.title().get("en"));
            }
        });
    }

    @Test
    void everyBookHasASpanishTitle() {
        assertThat(dataService.getBooks().values().stream().flatMap(List::stream))
                .allSatisfy(book -> assertThat(book.title().get("es")).as(book.personalityId()).isNotBlank());
    }

    @Test
    void everyBookPointsToAnExistingPersonality() {
        assertThat(dataService.getBooks()).isNotEmpty();
        assertThat(dataService.getBooks().keySet())
                .allSatisfy(id -> assertThat(dataService.getPersonalityById(id)).isNotNull());
    }
}
