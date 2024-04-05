package com.vmware.example.bookstore.repositories;

import com.vmware.example.bookstore.model.Book;
import org.springframework.data.repository.ListCrudRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BookRepository extends ListCrudRepository<Book,Long> {

}
