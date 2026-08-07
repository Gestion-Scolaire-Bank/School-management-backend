package cm.schoolmanage.admin.service;

import cm.schoolmanage.admin.dto.UpdateUserStatusRequest;
import cm.schoolmanage.admin.exception.UpstreamServiceUnavailableException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * admin-service ne possede pas les comptes utilisateurs (pattern Database per Service) :
 * auth-service en est le proprietaire. Ce service se contente donc de repercuter la decision
 * de l'administrateur via l'appel REST documente dans le README (section "Communications
 * sortantes") : PATCH /api/auth/users/{id}/status avec le payload {userId, status}.
 */
@Service
public class UserStatusService {

    private final RestTemplate restTemplate;
    private final String authServiceBaseUrl;

    public UserStatusService(RestTemplate restTemplate,
                              @Value("${schoolmanage.services.auth.base-url}") String authServiceBaseUrl) {
        this.restTemplate = restTemplate;
        this.authServiceBaseUrl = authServiceBaseUrl;
    }

    public ResponseEntity<String> updateStatus(String userId, UpdateUserStatusRequest request) {
        String url = authServiceBaseUrl + "/api/auth/users/" + userId + "/status";
        HttpEntity<Map<String, Object>> httpRequest =
                new HttpEntity<>(Map.of("userId", userId, "status", request.getStatus()));
        try {
            return restTemplate.exchange(url, HttpMethod.PATCH, httpRequest, String.class);
        } catch (HttpStatusCodeException e) {
            return ResponseEntity.status(e.getStatusCode()).body(e.getResponseBodyAsString());
        } catch (RestClientException e) {
            throw new UpstreamServiceUnavailableException("auth-service", e);
        }
    }
}
