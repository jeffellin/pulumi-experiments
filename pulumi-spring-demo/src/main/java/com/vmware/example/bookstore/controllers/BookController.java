package com.vmware.example.bookstore.controllers;

import com.vmware.example.bookstore.model.Book;
import com.vmware.example.bookstore.repositories.BookRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collection;
import java.util.Optional;


@RestController
@RequestMapping("/api/book")
public class BookController {

    @Autowired
    private BookRepository repository;

    @Operation(summary = "Get a book by its id")
    @CrossOrigin(origins = "https://tap-gui.view.lab.ellin.net")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Found the book",
                    content = { @Content(mediaType = "application/json",
                            schema = @Schema(implementation = Book.class)) }),
            @ApiResponse(responseCode = "404", description = "Book not found",
                    content = @Content) })
    @GetMapping("/{id}")
    public ResponseEntity<Book> findById(@PathVariable long id) throws BookNotFoundException {
      Optional<Book> b = repository.findById(id);

    ;
           if(b.isEmpty()){
               return new ResponseEntity<Book>(HttpStatus.NOT_FOUND);
           }else {
               return new ResponseEntity<Book>(b.get(), HttpStatus.OK);

           }



    }

    @GetMapping("/")
    @CrossOrigin(origins = "https://tap-gui.view.lab.ellin.net")
    public Collection<Book> findBooks() {
        return repository.findAll();
    }

    @GetMapping("/test")
    @CrossOrigin(origins = "https://tap-gui.view.lab.ellin.net")
    public String showTest() {
        return "Test Result";
    }

    @PutMapping("/{id}")
    @ResponseStatus(HttpStatus.OK)
    @CrossOrigin(origins = "https://tap-gui.view.lab.ellin.net")
    public Book updateBook(
            @PathVariable("id") final Long id, @RequestBody final Book book) {
        return repository.save(book);
    }
    @PostMapping()
    @ResponseStatus(HttpStatus.OK)
    @CrossOrigin(origins = "https://tap-gui.view.lab.ellin.net")
    public Book createBook(
             @RequestBody final Book book) {
        return repository.save(book);
    }


}
