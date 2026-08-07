package cm.schoolmanage.admin.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

@Configuration
public class RestTemplateConfig {

    /**
     * JdkClientHttpRequestFactory (java.net.http.HttpClient) est utilise plutot que la factory
     * par defaut de RestTemplate, qui ne supporte pas la methode HTTP PATCH necessaire pour
     * repercuter les changements de statut de compte vers auth-service.
     */
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate(new JdkClientHttpRequestFactory());
    }
}
