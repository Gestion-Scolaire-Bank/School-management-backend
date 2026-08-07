package cm.schoolmanage.registration.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestTemplate;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthAccountClientTest {

    @Mock
    private RestTemplate restTemplate;

    private AuthAccountClient client() {
        return new AuthAccountClient(restTemplate, "http://auth-service:8081");
    }

    @Test
    void compteCreeAvecSucces_appelleUneSeuleFoisRegister() {
        client().registerAccount("a@b.cm", "Jean Dupont", "PARENT");

        verify(restTemplate).postForEntity(
                eq("http://auth-service:8081/api/auth/register"), any(), eq(String.class));
    }

    @Test
    void compteDejaExistant_409_neLevePasDException() {
        when(restTemplate.postForEntity(any(String.class), any(), eq(String.class)))
                .thenThrow(HttpClientErrorException.create(
                        HttpStatus.CONFLICT, "Conflict", null, null, null));

        assertThatCode(() -> client().registerAccount("a@b.cm", "Jean Dupont", "PARENT"))
                .doesNotThrowAnyException();
    }

    @Test
    void authServiceIndisponible_neLevePasDException() {
        when(restTemplate.postForEntity(any(String.class), any(), eq(String.class)))
                .thenThrow(HttpServerErrorException.create(
                        HttpStatus.SERVICE_UNAVAILABLE, "Unavailable", null, null, null));

        assertThatCode(() -> client().registerAccount("a@b.cm", "Jean Dupont", "PARENT"))
                .doesNotThrowAnyException();
    }
}
