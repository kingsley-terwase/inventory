# Stockbook: Inventory & Accounting Web App

Vue 3 + Ionic Vue + TypeScript + Pinia + Vite.

## Run it

```bash
npm install
npm run dev        # opens at http://localhost:5173
npm run build      # production build in /dist
npm run typecheck
```

Requires Node.js 18 or newer. **Demo login:** `admin@demo.com` / `admin123` (owner).

## What it does

| Area | Details |
|---|---|
| Sales | Cash, transfer or credit. Discount and surcharge (amount or %) are included in the total. Printable invoice. |
| Credit | Each customer has a credit limit (0 = no credit). A sale that would exceed it is blocked with a "Credit limit exhausted" pop-up, and the owner gets an alert. |
| Debts | Every unpaid credit sale has a due date. Record part or full payments. |
| Reminders | When a debt is due soon or overdue, the owner gets an in-app alert and the customer gets an SMS (repeats every N days). Rules are in Settings. |
| Stock | Products, levels, low-stock alerts, movement history, adjustments. Sales and purchases update stock automatically. |
| Accounting | Purchases, expenses, cash and bank accounts, ledger, and reports (profit & loss, sales, purchases, stock value, debts, balance sheet) with CSV export. |
| Users | Owner (everything), Manager (everything except Settings), Staff (sales, stock, customers, debts, notifications). |

## Project structure

```
src/
  main.ts, App.vue          app start, global Ionic components, reminder timer
  router/                   routes + login/role guard
  layouts/                  side menu
  pages/                    the 14 pages
  features/                 modals and logic grouped by business area
    products/ sales/ purchases/ contacts/ expenses/ accounting/ reports/ settings/
  components/               shared UI (PageLayout, ModalShell, ItemsEditor, NumInput ...)
  stores/                   Pinia stores = all business rules (sales, credit check, ledger ...)
  services/                 storage.ts (data persistence), sms.ts, seed.ts (demo data)
  composables/              toast, confirm, openModal helpers
  utils/  theme/  types/
docs/                       scope document for the owner
```

## Backend integration

The app now talks to the Berly backend (`https://berly-backend.onrender.com/api`). All HTTP lives in `src/services/api.ts`, JSON-to-UI conversion in `src/services/mappers.ts`, and business calls in `src/stores/*.ts`.

```bash
cp .env.example .env     # dev: /api is proxied to the backend by Vite, no CORS setup needed
npm run dev
```
For a production build set `VITE_API_URL` to the full backend URL and allow your site's origin in the backend's CORS settings.

Create your business on the **/register** page (calls `POST /auth/register`: owner + business + first branch), or sign in with an existing account. Admins can add more branches in Settings (`POST /branches`) and switch between them from the menu. Staff get a temporary password by email and are sent to a "choose a new password" screen on first login.

### Where the UI differs from the original design (because of what the API offers)

| Area | What the API does | What the app does |
|---|---|---|
| Surcharge | Per unit, on each sale line | Surcharge field on each line; discount stays on the whole sale |
| Sale price | Taken from the product | Not editable at the till |
| Credit limit | One business-wide setting | Edited in Settings. "Raise limit" opens Settings |
| Due date | Set by "days to repay" in Settings | Shown on the sale screen, not picked per sale |
| Customers | No customer endpoint; created by a sale that names one | List is built from sales/debts. Name + phone entered on the sale |
| Suppliers, purchases | No supplier or purchase endpoint. Buying = "receive stock" | Suppliers saved on this device only. A purchase = receive-stock lines sharing a reference. No supplier balances/payments |
| Accounts | No cash/bank ledger, only `/money-summary` | Accounts page shows the money summary for a date range |
| Reports | sales, payments, debts, stock, purchases, movements, expenses, money (PDF + JSON) | PDF download + generic on-screen preview. No P&L or balance sheet |
| Expenses | Create only; no category | Category stored inside `purpose` ("Rent: shop"). No edit/delete |
| SMS | Server sends on schedule from reminder rules | Settings has a reminder-rule editor; Notifications shows alerts and the SMS log. No manual "Send SMS" |
| Users | Server creates and emails a password; no delete | Create, rename, activate/deactivate. Roles are admin/manager/cashier/staff. Permissions editor in Settings |

### Assumptions to confirm against the real backend
Not in the Postman collection, so guessed: `PATCH /products/{id}` for edits, discount type `"fixed"` for amounts, the JSON shape of report / alert / SMS-log / reminder-rule list responses, and the exact credit-limit 422 wording (matched on the words "credit" or "limit"). Each is isolated in `mappers.ts`, `stores/sales.ts` or `features/reports/reports.ts`.

### API coverage
Every request in the Postman collection (54 distinct) is called by the app: register, login/me/logout/change-password, branches (list, read, create), settings, roles and permissions, staff (create, list, update, deactivate), categories (create, list, read, update), products (create, list, read, search, archive), stock (receive, adjust, list, movements with product filter), sales (create, list, read), debts (list, paid list, read by receipt), repayments and the payments log, expenses, money summary, dashboard (this branch or all branches), all 8 reports, reminder rules, SMS log, debt alerts (read / refresh).

### Roles and what each user sees
At sign-in the app reads the signed-in role's permissions (`GET /roles/{slug}/permissions`; several roles are combined) and shows only the screens and buttons those permissions allow. The mapping from screen to permission is one table in `src/layouts/access.ts` (for example Products needs `products.view`, Stock needs `inventory.view`, New sale needs `sales.create`). Accounts, Reports, Notifications and Settings are owner-only. If a role has nothing assigned, the user sees a "Nothing to show yet" page. The owner assigns permissions in Settings > Roles and permissions. The server still enforces everything and answers 403 if the app and server ever disagree.

If the server does not let a non-admin read their role's permissions, the app falls back to trying each main endpoint once and treating a 403 as "not allowed".

### New users and the temporary password
`POST /staff` makes the server generate a password and email it; the API never returns the password and has no resend or reset endpoint. The response only says `email_notification.status: "queued"`. If the email does not arrive, check the backend's mail configuration (mail driver and SMTP credentials, and that a queue worker is running if mail is queued).

### Branches: products are shared, stock is not
Products and categories belong to the business; stock, sales, debts and expenses belong to a branch. A new branch therefore sees every product at "Not stocked here" until stock is received into it (Stock > Receive stock, or Purchases). Products a branch has never stocked are not counted as low stock and cannot be sold there. The dashboard shows a "set up this branch" prompt for a new branch, and the "This branch / All branches" switch is for owners with more than one branch.
