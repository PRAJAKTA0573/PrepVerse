package com.prepverse.controller;

import com.prepverse.entity.Document;
import com.prepverse.repository.DocumentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.File;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    @Autowired
    private DocumentRepository documentRepository;

    @PostMapping("/upload")
    public ResponseEntity<?> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "tags", defaultValue = "Notes") String tags
    ) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("Error: File is empty!");
        }

        try {
            // Save file metadata
            Document document = new Document();
            document.setName(file.getOriginalFilename());
            document.setSize(String.format("%.1f MB", (double) file.getSize() / (1024 * 1024)));
            document.setTags(tags);
            document.setUploadDate(LocalDateTime.now());
            document.setContentSummary("AI parsed note content. Loaded correctly.");
            
            // Local storage simulation
            String userHome = System.getProperty("user.home");
            File uploadDir = new File(userHome + "/prepverse_uploads");
            if (!uploadDir.exists()) {
                uploadDir.mkdirs();
            }
            File dest = new File(uploadDir.getAbsolutePath() + "/" + file.getOriginalFilename());
            file.transferTo(dest);
            document.setPath(dest.getAbsolutePath());

            Document saved = documentRepository.save(document);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error uploading file: " + e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<List<Document>> getAllDocuments() {
        return ResponseEntity.ok(documentRepository.findAll());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDocument(@PathVariable Long id) {
        return documentRepository.findById(id)
                .map(doc -> {
                    documentRepository.delete(doc);
                    return ResponseEntity.ok().body("Document deleted successfully");
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
