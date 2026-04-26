# Security Report: Firestore Vulnerabilities

This report outlines the identified security flaws and logic leaks in the current `firestore.rules` implementation, evaluated against the "Eight Pillars of Hardened Rules" architecture.

## 1. Vulnerability: Email Spoofing (Critical)
**Location:** `isMaster()` function
**Issue:** The rule grants master privileges based purely on the email address string without verifying if the email is actually verified by the provider:
```javascript
function isMaster() {
  return isAuthenticated() &&
    (request.auth.token.email == "sys.powercontrol@gmail.com" ||
     getUserData().role == 'master');
}
```
**Exploit:** An attacker can create an account using `sys.powercontrol@gmail.com` via a provider that does not require immediate verification. If `request.auth.token.email_verified == true` is not strictly enforced, the attacker gains full Master access to the entire database.

## 2. Vulnerability: Type Poisoning & Update-Gap (High)
**Location:** Global `update` operations (e.g., `/products/{id}`, `/sales/{id}`)
**Issue:** While `affectedKeys().hasOnly([...])` correctly restricts *which* fields can be updated, there is absolutely no validation on the *types* or *sizes* of those fields. The generic `checkSafePayload()` only validates `name`, `description`, and `items`. 
**Exploit:** An attacker with `products.manage` permission could update a product's `cost_price` to a 5MB string or a boolean, potentially corrupting the client state, crashing frontend parsers, or exhausting document size quotas.

## 3. Vulnerability: Unrestricted Document Creation (Shadow Fields) (High)
**Location:** Global `create` operations
**Issue:** The `create` rules do not enforce a strict schema blueprint. They only ensure `checkSafePayload()` and `belongsToCompany(request.resource.data.company_id)`.
**Exploit:** An attacker can create a document and attach arbitrary malicious shadow fields (such as `is_admin: true` or recursive data structures) because there is no `data.keys().hasAll(...) && data.keys().size() == N` check to lock down the creation payload.

## 4. Vulnerability: Denial of Wallet via Missing Validation (High)
**Location:** `/brands/{id}` and other minor collections
**Issue:** The `/brands/{id}` match block completely lacks `isValidId(id)`, `checkSafePayload()`, and `affectedKeys().hasOnly()`.
```javascript
match /brands/{id} {
  allow read: if belongsToCompany(resource.data.company_id) && hasPermission('products.view');
  allow create, update, delete: if belongsToCompany(request.resource.data.company_id) && hasPermission('products.manage');
}
```
**Exploit:** An authorized attacker can inject 1.5MB junk-character strings into document IDs or any field within the `brands` collection, leading to massive resource exhaustion and potential billing attacks.

## 5. Vulnerability: N+1 `get()` Read Cost Explosion (Medium/High)
**Location:** `belongsToCompany()` and `hasPermission()` evaluation on `allow list`
**Issue:** Whenever a client executes a query to list documents, Firestore evaluates the rule against the documents. Although Firestore caches `get()` calls for the same payload path, placing `get(/databases/$(database)/documents/users/$(request.auth.uid))` inside the hot-path of `allow read` (which applies to `list` operations) is an anti-pattern. While the security boundary works, it delegates the role resolution to a separate document read over and over.

## 6. Vulnerability: Lack of Terminal State Locking (Medium)
**Location:** `/sales/{id}`, `/purchases/{id}`, `/invoices/{id}`
**Issue:** There are no rules preventing the modification of documents after they reach a "terminal" state (e.g., modifying a sale after `status` is set to `Faturado` or `Cancelado`).
**Exploit:** A user could retroactively alter the `total` or `items` array of an already registered and finalized purchase, destroying financial and proxy invariants.

## Conclusion & Next Steps
The rules demonstrate good progress regarding Relational Isolation (`company_id`), but fail heavily on Payload Integrity and Identity spoofing. The rules must be rewritten to include typed validation blueprints for every entity (`isValidProduct()`, `isValidSale()`) and enforce `email_verified == true`.
