package cm.schoolmanage.payment.repository;

import cm.schoolmanage.payment.domain.PaymentStatus;
import cm.schoolmanage.payment.domain.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TransactionRepository extends JpaRepository<Transaction, UUID> {

    Optional<Transaction> findByProviderReference(String providerReference);

    List<Transaction> findByStudentIdOrderByCreatedAtDesc(String studentId);

    List<Transaction> findByStatus(PaymentStatus status);

    List<Transaction> findByStatusAndEstablishmentId(PaymentStatus status, String establishmentId);

    List<Transaction> findByStudentIdAndFeeScheduleIdAndStatus(String studentId, UUID feeScheduleId, PaymentStatus status);
}
