package com.example.pulumidemo.controllers;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
@Controller
public class GreetingController {

    @Value("${greeting:world}")
    private String greeting;

    @GetMapping("/greeting")
    public String greeting(Model model) {
        model.addAttribute("name", greeting);
        return "greeting";
    }

}
