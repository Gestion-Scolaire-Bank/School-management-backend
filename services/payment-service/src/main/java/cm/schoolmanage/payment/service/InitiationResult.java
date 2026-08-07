package cm.schoolmanage.payment.service;

import cm.schoolmanage.payment.domain.Transaction;

public record InitiationResult(Transaction transaction, boolean alreadyExisted) {
}
