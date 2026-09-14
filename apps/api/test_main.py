from main import authorization_decision, policy_decision, receipt_verification


def test_policy_adjusts_to_verified_payment():
    decision = policy_decision("CF-1842")
    assert decision["status"] == "pass_with_adjustment"
    assert decision["decision"]["invoice"] == 8420
    assert decision["decision"]["paid"] == 8240
    assert decision["decision"]["difference"] == 180
    assert decision["decision"]["approved_total"] == 26990


def test_authorization_allows_exact_capability():
    result = authorization_decision(
        "BANK_ACCOUNT_1",
        "expensehub_demo",
        "reimbursement_payment",
        "fill",
    )
    assert result["authorized"] is True
    assert result["raw_value_returned"] is False


def test_authorization_rejects_wrong_portal():
    result = authorization_decision(
        "BANK_ACCOUNT_1",
        "verify_now",
        "reimbursement_payment",
        "fill",
    )
    assert result["authorized"] is False


def test_authorization_rejects_wrong_purpose():
    result = authorization_decision(
        "BANK_ACCOUNT_1",
        "expensehub_demo",
        "identity_verification",
        "fill",
    )
    assert result["authorized"] is False


def test_verifier_accepts_only_expected_outcome():
    result = receipt_verification("CF-1842", "TRV-2026-91827", 26990, "submitted")
    assert result["verified"] is True
    assert all(result["checks"].values())


def test_verifier_rejects_wrong_amount():
    result = receipt_verification("CF-1842", "TRV-2026-91827", 27170, "submitted")
    assert result["verified"] is False
    assert result["checks"]["amount"] is False
