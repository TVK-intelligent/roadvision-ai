package com.roadvision;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class RoadvisionBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(RoadvisionBackendApplication.class, args);
	}

}
