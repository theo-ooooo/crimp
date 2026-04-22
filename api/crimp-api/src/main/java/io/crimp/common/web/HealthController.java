package io.crimp.common.web;

import io.crimp.common.config.AppProperties;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class HealthController {

    private final AppProperties appProperties;

    public HealthController(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of(
                "status", "UP",
                "brand", appProperties.brand(),
                "env", appProperties.env(),
                "serverTime", Instant.now().toString()
        );
    }
}
