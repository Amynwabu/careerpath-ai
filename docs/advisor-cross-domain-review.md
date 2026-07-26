# Advisor cross-domain review

Opportunity, application, and interview review is enabled only for records in
the immutable workflow-resource registry. A client must explicitly link the
resource to an active case. At query time the advisor workspace validates:

- persistent resource existence, owner, type, and immutable version identity;
- active case and assignment;
- verified, active advisor profile;
- active, unexpired, unrevoked grant;
- domain-specific opportunity, CV, or interview review scope.

Advisor decisions and comments remain separate advisor-workspace records.
They cannot update vacancy mappings, match/ATS/readiness scores, competency or
question mappings, evidence, or CV/interview claim-validation results. A blocked
claim therefore remains blocked regardless of advisor opinion.

Unlinked, deleted, cross-owner, wrong-type, expired, revoked, suspended, and
insufficient-scope access fails closed. The workflow does not publish taxonomy
data or treat an unpublished taxonomy candidate as available.
