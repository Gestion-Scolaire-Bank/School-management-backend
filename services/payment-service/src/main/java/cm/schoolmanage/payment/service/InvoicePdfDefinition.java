package cm.schoolmanage.payment.service;

import cm.schoolmanage.payment.domain.Invoice;
import cm.schoolmanage.payment.domain.InvoiceItem;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.List;

@Component
public class InvoicePdfDefinition {

    public byte[] generate(Invoice invoice) {
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);

            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                content.beginText();
                content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 16);
                content.newLineAtOffset(50, 750);
                content.showText("SchoolManage - Invoice");
                content.endText();

                content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 11);
                float y = 700;

                content.beginText();
                content.newLineAtOffset(50, y);
                content.showText("Reference: " + invoice.getId());
                content.endText();
                y -= 20;

                content.beginText();
                content.newLineAtOffset(50, y);
                content.showText("Establishment: " + invoice.getEstablishmentId());
                content.endText();
                y -= 20;

                content.beginText();
                content.newLineAtOffset(50, y);
                content.showText("Date: " + invoice.getIssuedAt());
                content.endText();
                y -= 20;

                content.beginText();
                content.newLineAtOffset(50, y);
                content.showText("Tax Rate: " + invoice.getTaxRate());
                content.endText();
                y -= 30;

                content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 11);
                for (InvoiceItem item : invoice.getItems()) {
                    content.beginText();
                    content.newLineAtOffset(50, y);
                    content.showText(item.getDescription() + " - " + item.getAmount() + " " + invoice.getCurrency());
                    content.endText();
                    y -= 20;
                }

                y -= 20;
                content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 11);
                content.beginText();
                content.newLineAtOffset(50, y);
                content.showText("Total: " + invoice.getTotalAmount() + " " + invoice.getCurrency());
                content.endText();
            }

            ByteArrayOutputStream output = new ByteArrayOutputStream();
            document.save(output);
            return output.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Echec de generation de la facture PDF", e);
        }
    }
}