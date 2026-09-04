package cm.schoolmanage.schoolid.service;

import cm.schoolmanage.schoolid.domain.Certificate;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

@Component
public class CertificatePdfGenerator {

    public byte[] generate(Certificate certificate) {
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);

            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                content.beginText();
                content.setFont(new PDType1Font(PDType1Font.HELVETICA_BOLD), 20);
                content.newLineAtOffset(50, 750);
                content.showText("SchoolManage - Certificat");
                content.endText();

                content.setFont(new PDType1Font(PDType1Font.HELVETICA), 14);
                float y = 700;

                content.beginText();
                content.newLineAtOffset(50, y);
                content.showText("Type : " + certificate.getCertificateType());
                content.endText();
                y -= 20;

                content.beginText();
                content.newLineAtOffset(50, y);
                content.showText("Eleve : " + certificate.getStudentName());
                content.endText();
                y -= 20;

                content.beginText();
                content.newLineAtOffset(50, y);
                content.showText("Establissement : " + certificate.getEstablishmentId());
                content.endText();
                y -= 20;

                content.beginText();
                content.newLineAtOffset(50, y);
                content.showText("GPA : " + certificate.getGpa());
                content.endText();
                y -= 20;

                content.beginText();
                content.newLineAtOffset(50, y);
                content.showText("Date de remise : " + certificate.getIssuedAt());
                content.endText();
                y -= 30;

                content.setFont(new PDType1Font(PDType1Font.HELVETICA_BOLD), 12);
                content.beginText();
                content.newLineAtOffset(50, y);
                content.showText("ID Credentiel : " + certificate.getCredentialId());
                content.endText();
            }

            ByteArrayOutputStream output = new ByteArrayOutputStream();
            document.save(output);
            return output.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Echec de génération du certificat PDF", e);
        }
    }
}