package com.vmware.example.bookstore;

import java.util.Arrays;

import com.vmware.example.bookstore.model.Book;
import com.vmware.example.bookstore.repositories.BookRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.boot.actuate.web.exchanges.HttpExchangeRepository;
import org.springframework.boot.actuate.web.exchanges.InMemoryHttpExchangeRepository;

@SpringBootApplication
public class Application {

	public static void main(String[] args) {
		SpringApplication.run(Application.class, args);
	}

	@Bean
	public CommandLineRunner commandLineRunner(ApplicationContext ctx) {
		return args -> {

			System.out.println("Let's inspect the beans provided by Spring Boot:");

			String[] beanNames = ctx.getBeanDefinitionNames();

			BookRepository br = ctx.getBean(BookRepository.class);

Book b = new Book("Don Quixote");
			br.save(b);
			b = new Book("When A Crocodile Eats the Sun");
			br.save(b);
			b = new Book("Wild Swans");
			br.save(b);
			b = new Book("The Catcher in the Rye");
			br.save(b);


		};
	}
	
	@Bean
	public HttpExchangeRepository htttpTraceRepository() {
		return new InMemoryHttpExchangeRepository();
	}
}
