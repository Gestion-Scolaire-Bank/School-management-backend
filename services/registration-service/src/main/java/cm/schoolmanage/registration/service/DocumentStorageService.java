package cm.schoolmanage.registration.service;

import cm.schoolmanage.registration.exception.DocumentUploadException;
import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;
import java.util.regex.Pattern;

/** Stocke les documents d'inscription (photo, acte de naissance, CV, diplome) sur MinIO/S3. */
@Service
public class DocumentStorageService {

    private final MinioClient minioClient;
    private final String bucket;
    private final String publicEndpoint;

    private static final Pattern UNSAFE_CHARS = Pattern.compile("[^A-Za-z0-9._-]+");

    public DocumentStorageService(MinioClient minioClient,
                                   @Value("${schoolmanage.storage.bucket}") String bucket,
                                   @Value("${schoolmanage.storage.endpoint}") String publicEndpoint) {
        this.minioClient = minioClient;
        this.bucket = bucket;
        this.publicEndpoint = publicEndpoint;
    }

    public String upload(MultipartFile file, String documentType) {
        try {
            ensureBucket();
            String objectName = documentType + "/" + UUID.randomUUID() + "-" + safeFilename(file.getOriginalFilename());
            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(bucket)
                    .object(objectName)
                    .stream(file.getInputStream(), file.getSize(), -1)
                    .contentType(file.getContentType())
                    .build());
            return publicEndpoint + "/" + bucket + "/" + objectName;
        } catch (Exception e) {
            throw new DocumentUploadException(documentType, e);
        }
    }

    /** Retire les separateurs de chemin et caracteres de controle du nom de fichier fourni
     * par l'utilisateur avant de l'utiliser dans une cle d'objet MinIO. */
    private String safeFilename(String originalFilename) {
        if (originalFilename == null || originalFilename.isBlank()) {
            return "fichier";
        }
        String basename = originalFilename.replace('\\', '/');
        basename = basename.substring(basename.lastIndexOf('/') + 1);
        String safe = UNSAFE_CHARS.matcher(basename).replaceAll("-");
        return safe.isBlank() ? "fichier" : safe;
    }

    private void ensureBucket() throws Exception {
        boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucket).build());
        if (!exists) {
            minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
        }
    }
}
