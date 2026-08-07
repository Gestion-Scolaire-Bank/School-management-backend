package cm.schoolmanage.payment.service;

import cm.schoolmanage.payment.domain.Transaction;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;

@Component
public class ReceiptPdfGenerator {

    public byte[] generate(Transaction transaction) {
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);

            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                content.beginText();
                content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 16);
                content.newLineAtOffset(50, 750);
                content.showText("SchoolManage - Recu de paiement");
                content.endText();

                content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 11);
                float y = 700;
                for (String line : List.of(
                        "Reference : " + transaction.getId(),
                        "Type : " + transaction.getType(),
                        "Montant : " + transaction.getAmount() + " " + transaction.getCurrency(),
                        "Fournisseur : " + transaction.getProvider(),
                        "Statut : " + transaction.getStatus(),
                        "Date : " + transaction.getUpdatedAt())) {
                    content.beginText();
                    content.newLineAtOffset(50, y);
                    content.showText(line);
                    content.endText();
                    y -= 20;
                }
            }

            ByteArrayOutputStream output = new ByteArrayOutputStream();
            document.save(output);
            return output.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException("Echec de generation du recu PDF", e);
        }
    }
}
