package io.crimp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class CrimpApiApplication {
    public static void main(String[] args) {
        SpringApplication.run(CrimpApiApplication.class, args);
    }
}
