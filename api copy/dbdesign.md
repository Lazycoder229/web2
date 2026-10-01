# PRIME — Complete Database Design

**System:** PRIME: Point-of-sale Restaurant Integrated Management Ecosystem
**A QR-Based Ordering, Inventory, and Employee Management System for Restaurant Operations**

---

## 1. Module Overview

| # | Module | Tables |
|---|---|---|
| 1 | Auth & RBAC | `roles`, `permissions`, `role_permissions`, `users` |
| 2 | Customer | `customers` |
| 3 | Menu | `categories`, `menu_items` |
| 4 | Tables & QR | `restaurant_tables` |
| 5 | Orders | `orders`, `order_items`, `order_status_history`, `order_voids` |
| 6 | Reservations | `reservations` |
| 7 | Payments | `payments` |
| 8 | Loyalty Program | `loyalty_settings`, `loyalty_transactions`, `loyalty_rewards` |
| 9 | Employee & Payroll | `employees`, `deduction_types`, `payroll_periods`, `payroll_records`, `payroll_deductions`, `employee_schedules`, `attendance_logs` |
| 10 | Discounts (Senior/PWD) | `discount_types`, `order_discounts` |
| 11 | Promotions | `promotions`, `promotion_items`, `order_promotions` |
| 12 | Devices | `printers` |
| 13 | Audit | `audit_logs` |
| 14 | Inventory | `inventory_categories`, `inventory_items`, `inventory_stock_logs`, `menu_item_ingredients` |
| 15 | Expenses | `expense_categories`, `expenses` |
| 16 | System Settings | `system_settings` |

---

## 2. Auth & RBAC Module

### 2.1 `roles`
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| name | VARCHAR(50) | UNIQUE, NOT NULL |
| description | TEXT | NULLABLE |
| is_system | BOOLEAN | DEFAULT false |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | AUTO UPDATE |

### 2.2 `permissions`
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| code | VARCHAR(100) | UNIQUE, NOT NULL |
| module | VARCHAR(50) | NOT NULL |
| description | TEXT | NULLABLE |

### 2.3 `role_permissions` (junction)
| Column | Type | Constraints |
|---|---|---|
| role_id | UUID | PK, FK → roles.id |
| permission_id | UUID | PK, FK → permissions.id |

### 2.4 `users` (staff: Owner, Manager, Cashier, Kitchen)
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| role_id | UUID | FK → roles.id, NOT NULL |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| password | VARCHAR(255) | NOT NULL (bcrypt hash) |
| name | VARCHAR(100) | NOT NULL |
| contact_number | VARCHAR(20) | NULLABLE |
| is_active | BOOLEAN | DEFAULT true |
| last_login_at | TIMESTAMP | NULLABLE |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | AUTO UPDATE |

---

## 3. Customer Module

### 3.1 `customers`
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| email | VARCHAR(255) | UNIQUE, NULLABLE |
| password | VARCHAR(255) | NULLABLE |
| name | VARCHAR(100) | NOT NULL |
| contact_number | VARCHAR(20) | NULLABLE |
| loyalty_points_balance | INT | DEFAULT 0 |
| is_guest | BOOLEAN | DEFAULT true |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | AUTO UPDATE |

---

## 4. Menu Module

### 4.1 `categories`
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| name | VARCHAR(100) | NOT NULL |
| sort_order | INT | DEFAULT 0 |
| is_active | BOOLEAN | DEFAULT true |
| created_at | TIMESTAMP | DEFAULT NOW() |

### 4.2 `menu_items`
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| category_id | UUID | FK → categories.id, NOT NULL |
| name | VARCHAR(150) | NOT NULL |
| description | TEXT | NULLABLE |
| price | DECIMAL(10,2) | NOT NULL |
| image_url | VARCHAR(500) | NULLABLE |
| is_available | BOOLEAN | DEFAULT true |
| stock_quantity | INT | NULLABLE (null = unlimited) |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | AUTO UPDATE |

---

## 5. Tables & QR Module

### 5.1 `restaurant_tables`
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| table_number | VARCHAR(20) | UNIQUE, NOT NULL |
| capacity | INT | NOT NULL |
| qr_code_url | VARCHAR(500) | NULLABLE |
| status | ENUM(`available`,`occupied`,`reserved`) | DEFAULT `available` |
| created_at | TIMESTAMP | DEFAULT NOW() |

---

## 6. Orders Module

### 6.1 `orders`
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| order_number | VARCHAR(30) | UNIQUE, NOT NULL |
| table_id | UUID | FK → restaurant_tables.id, NULLABLE |
| customer_id | UUID | FK → customers.id, NULLABLE |
| order_type | ENUM(`qr`,`counter`) | NOT NULL |
| status | ENUM(`pending`,`preparing`,`ready`,`served`,`completed`,`cancelled`) | DEFAULT `pending` |
| subtotal | DECIMAL(10,2) | NOT NULL |
| discount | DECIMAL(10,2) | DEFAULT 0 |
| tax | DECIMAL(10,2) | DEFAULT 0 |
| total | DECIMAL(10,2) | NOT NULL |
| created_by_staff_id | UUID | FK → users.id, NULLABLE |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | AUTO UPDATE |

### 6.2 `order_items`
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| order_id | UUID | FK → orders.id, NOT NULL |
| menu_item_id | UUID | FK → menu_items.id, NOT NULL |
| quantity | INT | NOT NULL |
| unit_price | DECIMAL(10,2) | NOT NULL (snapshot, hindi live price) |
| subtotal | DECIMAL(10,2) | NOT NULL |
| notes | VARCHAR(255) | NULLABLE |

### 6.3 `order_status_history`
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| order_id | UUID | FK → orders.id, NOT NULL |
| status | VARCHAR(30) | NOT NULL |
| changed_by_staff_id | UUID | FK → users.id, NULLABLE |
| changed_at | TIMESTAMP | DEFAULT NOW() |

### 6.4 `order_voids`
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| order_id | UUID | FK → orders.id, NOT NULL |
| requested_by_staff_id | UUID | FK → users.id, NOT NULL |
| approved_by_staff_id | UUID | FK → users.id, NULLABLE |
| reason | TEXT | NOT NULL |
| status | ENUM(`pending`,`approved`,`rejected`) | DEFAULT `pending` |
| requested_at | TIMESTAMP | DEFAULT NOW() |
| resolved_at | TIMESTAMP | NULLABLE |

---

## 7. Reservations Module

### 7.1 `reservations`
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| customer_id | UUID | FK → customers.id, NULLABLE |
| customer_name | VARCHAR(100) | NOT NULL |
| contact_number | VARCHAR(20) | NOT NULL |
| email | VARCHAR(255) | NULLABLE |
| table_id | UUID | FK → restaurant_tables.id, NULLABLE |
| reservation_date | DATE | NOT NULL |
| reservation_time | TIME | NOT NULL |
| number_of_guests | INT | NOT NULL |
| status | ENUM(`pending`,`confirmed`,`cancelled`,`completed`,`no_show`) | DEFAULT `pending` |
| notes | TEXT | NULLABLE |
| created_by_staff_id | UUID | FK → users.id, NULLABLE |
| created_at | TIMESTAMP | DEFAULT NOW() |

---

## 8. Payments Module

### 8.1 `payments`
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| order_id | UUID | FK → orders.id, NOT NULL |
| receipt_number | VARCHAR(30) | UNIQUE, NOT NULL |
| amount_paid | DECIMAL(10,2) | NOT NULL |
| payment_method | ENUM(`cash`,`gcash`,`card`,`other`) | NOT NULL |
| reference_number | VARCHAR(100) | NULLABLE |
| processed_by_staff_id | UUID | FK → users.id, NOT NULL |
| paid_at | TIMESTAMP | DEFAULT NOW() |

---

## 9. Loyalty Program Module

### 9.1 `loyalty_settings` (single-row config)
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| points_per_peso | DECIMAL(5,2) | DEFAULT 1.00 |
| peso_value_per_point | DECIMAL(5,2) | DEFAULT 0.50 |
| updated_at | TIMESTAMP | AUTO UPDATE |

### 9.2 `loyalty_transactions`
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| customer_id | UUID | FK → customers.id, NOT NULL |
| order_id | UUID | FK → orders.id, NULLABLE |
| type | ENUM(`earn`,`redeem`) | NOT NULL |
| points | INT | NOT NULL (+/-) |
| balance_after | INT | NOT NULL (snapshot) |
| created_at | TIMESTAMP | DEFAULT NOW() |

### 9.3 `loyalty_rewards`
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| name | VARCHAR(150) | NOT NULL |
| points_cost | INT | NOT NULL |
| description | TEXT | NULLABLE |
| is_active | BOOLEAN | DEFAULT true |

---

## 10. Employee & Payroll Module

### 10.1 `employees` (1:1 extension ng `users`)
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → users.id, UNIQUE, NOT NULL |
| employee_number | VARCHAR(20) | UNIQUE, NOT NULL |
| position | VARCHAR(100) | NOT NULL |
| department | VARCHAR(100) | NULLABLE (Kitchen, Service, Cashier, Management) |
| rfid_card_uid | VARCHAR(50) | UNIQUE, NULLABLE (RFID badge card serial/UID) |
| date_hired | DATE | NOT NULL |
| date_terminated | DATE | NULLABLE |
| employment_status | ENUM(`active`,`on_leave`,`terminated`) | DEFAULT `active` |
| basic_salary | DECIMAL(10,2) | NOT NULL |
| salary_type | ENUM(`daily`,`monthly`) | NOT NULL |

### 10.2 `deduction_types` (lookup — configurable)
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| name | VARCHAR(100) | NOT NULL (e.g. SSS, PhilHealth, Pag-IBIG, Tardiness, Cash Advance) |
| is_mandatory | BOOLEAN | DEFAULT false |
| is_active | BOOLEAN | DEFAULT true |

### 10.3 `payroll_periods`
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| period_start | DATE | NOT NULL |
| period_end | DATE | NOT NULL |
| status | ENUM(`open`,`processing`,`closed`) | DEFAULT `open` |
| created_at | TIMESTAMP | DEFAULT NOW() |

### 10.4 `payroll_records`
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| employee_id | UUID | FK → employees.id, NOT NULL |
| payroll_period_id | UUID | FK → payroll_periods.id, NOT NULL |
| gross_pay | DECIMAL(10,2) | NOT NULL |
| total_deductions | DECIMAL(10,2) | DEFAULT 0 |
| net_pay | DECIMAL(10,2) | NOT NULL |
| processed_by_staff_id | UUID | FK → users.id, NOT NULL |
| processed_at | TIMESTAMP | DEFAULT NOW() |

### 10.5 `payroll_deductions` (itemized, junction-style)
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| payroll_record_id | UUID | FK → payroll_records.id, NOT NULL |
| deduction_type_id | UUID | FK → deduction_types.id, NOT NULL |
| amount | DECIMAL(10,2) | NOT NULL |
| notes | VARCHAR(255) | NULLABLE |

### 10.6 `employee_schedules`
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → users.id, NOT NULL |
| shift_date | DATE | NOT NULL |
| start_time | TIME | NOT NULL |
| end_time | TIME | NOT NULL |
| created_by_staff_id | UUID | FK → users.id, NOT NULL |
| created_at | TIMESTAMP | DEFAULT NOW() |

### 10.7 `attendance_logs` (RFID tap & time-clock tracking)
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| employee_id | UUID | FK → employees.id, NOT NULL |
| log_date | DATE | NOT NULL |
| clock_in | TIMESTAMP | NOT NULL |
| clock_out | TIMESTAMP | NULLABLE |
| total_hours | DECIMAL(5,2) | NULLABLE |
| late_minutes | INT | DEFAULT 0 |
| overtime_hours | DECIMAL(5,2) | DEFAULT 0.00 |
| status | ENUM(`on_time`,`late`,`overtime`,`incomplete`,`absent`) | DEFAULT `on_time` |
| method | ENUM(`rfid`,`manual`,`pin`) | DEFAULT `rfid` |
| rfid_card_uid_used | VARCHAR(50) | NULLABLE |
| notes | TEXT | NULLABLE |
| created_at | TIMESTAMP | DEFAULT NOW() |

---

## 11. Discounts Module (Senior Citizen / PWD)

### 11.1 `discount_types`
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| name | VARCHAR(100) | NOT NULL (Senior Citizen, PWD) |
| percentage | DECIMAL(5,2) | NOT NULL (e.g. 20.00) |
| requires_id_verification | BOOLEAN | DEFAULT true |
| is_active | BOOLEAN | DEFAULT true |

### 11.2 `order_discounts`
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| order_id | UUID | FK → orders.id, NOT NULL |
| discount_type_id | UUID | FK → discount_types.id, NOT NULL |
| id_number | VARCHAR(50) | NULLABLE |
| holder_name | VARCHAR(100) | NOT NULL |
| discount_amount | DECIMAL(10,2) | NOT NULL |
| applied_by_staff_id | UUID | FK → users.id, NOT NULL |
| created_at | TIMESTAMP | DEFAULT NOW() |

---

## 12. Promotions Module

### 12.1 `promotions`
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| name | VARCHAR(150) | NOT NULL |
| description | TEXT | NULLABLE |
| promo_type | ENUM(`percentage`,`fixed_amount`,`buy_x_get_y`) | NOT NULL |
| discount_value | DECIMAL(10,2) | NULLABLE |
| min_spend | DECIMAL(10,2) | NULLABLE |
| start_date | DATE | NOT NULL |
| end_date | DATE | NOT NULL |
| usage_limit | INT | NULLABLE |
| usage_count | INT | DEFAULT 0 |
| is_active | BOOLEAN | DEFAULT true |
| created_by_staff_id | UUID | FK → users.id, NOT NULL |
| created_at | TIMESTAMP | DEFAULT NOW() |

### 12.2 `promotion_items` (junction)
| Column | Type | Constraints |
|---|---|---|
| promotion_id | UUID | PK, FK → promotions.id |
| menu_item_id | UUID | PK, FK → menu_items.id |

### 12.3 `order_promotions` (junction)
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| order_id | UUID | FK → orders.id, NOT NULL |
| promotion_id | UUID | FK → promotions.id, NOT NULL |
| discount_amount | DECIMAL(10,2) | NOT NULL |
| applied_at | TIMESTAMP | DEFAULT NOW() |

---

## 13. Devices Module

### 13.1 `printers`
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| name | VARCHAR(100) | NOT NULL |
| location | ENUM(`kitchen`,`counter`) | NOT NULL |
| connection_type | ENUM(`network`,`usb`,`bluetooth`) | NOT NULL |
| ip_address | VARCHAR(50) | NULLABLE |
| is_active | BOOLEAN | DEFAULT true |

---

## 14. Audit Module

### 14.1 `audit_logs`
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → users.id, NULLABLE |
| action | VARCHAR(100) | NOT NULL |
| entity_type | VARCHAR(50) | NOT NULL |
| entity_id | UUID | NOT NULL |
| details | JSON | NULLABLE |
| ip_address | VARCHAR(45) | NULLABLE |
| created_at | TIMESTAMP | DEFAULT NOW() |

---

## 15. Expenses Module

### 15.1 `expense_categories`
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| name | VARCHAR(100) | NOT NULL, UNIQUE |
| is_active | BOOLEAN | DEFAULT true |
| created_at | TIMESTAMP | DEFAULT NOW() |

### 15.2 `expenses`
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| category_id | UUID | FK → expense_categories.id, NOT NULL |
| description | VARCHAR(255) | NOT NULL |
| amount | DECIMAL(10,2) | NOT NULL |
| expense_date | DATE | NOT NULL |
| receipt_reference | VARCHAR(100) | NULLABLE |
| notes | TEXT | NULLABLE |
| recorded_by_staff_id | UUID | FK → users.id, NOT NULL |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | AUTO UPDATE |

---

## 16. Inventory Module

### 15.1 `inventory_categories`
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| name | VARCHAR(100) | NOT NULL |
| created_at | TIMESTAMP | DEFAULT NOW() |

### 15.2 `inventory_items`
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| category_id | UUID | FK → inventory_categories.id, NULLABLE |
| name | VARCHAR(150) | NOT NULL |
| unit | VARCHAR(30) | NOT NULL (kg, g, L, mL, pcs, pack, box, bottle, tray, bag) |
| stock_quantity | DECIMAL(10,3) | NOT NULL DEFAULT 0.000 |
| reorder_threshold | DECIMAL(10,3) | NULLABLE (null = no alert) |
| unit_cost | DECIMAL(10,2) | NULLABLE (last purchase price) |
| supplier | VARCHAR(150) | NULLABLE |
| is_active | BOOLEAN | DEFAULT true |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | AUTO UPDATE |

### 15.3 `inventory_stock_logs` (immutable audit trail — never update, only insert)
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| item_type | ENUM(`ingredient`,`menu_item`) | NOT NULL |
| inventory_item_id | UUID | FK → inventory_items.id, NULLABLE |
| menu_item_id | UUID | FK → menu_items.id, NULLABLE |
| type | ENUM(`stock_in`,`adjustment`,`waste`,`consumed`) | NOT NULL |
| quantity_change | DECIMAL(10,3) | NOT NULL (+/-) |
| quantity_after | DECIMAL(10,3) | NULLABLE (snapshot; null if unlimited) |
| note | VARCHAR(255) | NULLABLE |
| performed_by_staff_id | UUID | FK → users.id, NOT NULL |
| created_at | TIMESTAMP | DEFAULT NOW() |

### 15.4 `menu_item_ingredients` (junction — links menu_items to inventory_items)
| Column | Type | Constraints |
|---|---|---|
| menu_item_id | UUID | PK, FK → menu_items.id |
| inventory_item_id | UUID | PK, FK → inventory_items.id |
| quantity_used | DECIMAL(10,3) | NOT NULL (consumed per 1 serving) |

---

## 17. System Settings Module

### 17.1 `system_settings` (single-row configuration)
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| restaurant_name | VARCHAR(150) | NOT NULL DEFAULT 'PRIME Roast & Grill' |
| branch_name | VARCHAR(100) | NOT NULL DEFAULT 'Main Branch - Manila' |
| contact_number | VARCHAR(50) | NOT NULL DEFAULT '+63 917 123 4567' |
| email | VARCHAR(100) | NOT NULL DEFAULT 'contact@primerestaurant.ph' |
| address | TEXT | NOT NULL |
| tin_number | VARCHAR(50) | NULLABLE (e.g. '123-456-789-000') |
| bir_min | VARCHAR(50) | NULLABLE (Machine Identification Number) |
| currency_symbol | VARCHAR(10) | NOT NULL DEFAULT '₱' |
| currency_code | VARCHAR(10) | NOT NULL DEFAULT 'PHP' |
| timezone | VARCHAR(50) | NOT NULL DEFAULT 'Asia/Manila' |
| vat_enabled | BOOLEAN | NOT NULL DEFAULT true |
| vat_rate | DECIMAL(5,2) | NOT NULL DEFAULT 12.00 |
| vat_inclusive | BOOLEAN | NOT NULL DEFAULT true |
| service_charge_enabled | BOOLEAN | NOT NULL DEFAULT false |
| service_charge_rate | DECIMAL(5,2) | NOT NULL DEFAULT 5.00 |
| senior_pwd_discount_enabled | BOOLEAN | NOT NULL DEFAULT true |
| order_number_prefix | VARCHAR(20) | NOT NULL DEFAULT 'ORD-' |
| auto_accept_qr_orders | BOOLEAN | NOT NULL DEFAULT false |
| require_table_selection | BOOLEAN | NOT NULL DEFAULT true |
| manager_approval_for_voids | BOOLEAN | NOT NULL DEFAULT true |
| low_stock_threshold_alert | INT | NOT NULL DEFAULT 10 |
| receipt_header | TEXT | NULLABLE |
| receipt_footer | TEXT | NULLABLE |
| print_receipt_auto | BOOLEAN | NOT NULL DEFAULT true |
| print_kot_auto | BOOLEAN | NOT NULL DEFAULT true |
| show_wifi_on_receipt | BOOLEAN | NOT NULL DEFAULT true |
| wifi_ssid | VARCHAR(100) | NULLABLE |
| wifi_password | VARCHAR(100) | NULLABLE |
| opening_time | VARCHAR(10) | NOT NULL DEFAULT '08:00' |
| closing_time | VARCHAR(10) | NOT NULL DEFAULT '22:00' |
| cash_drawer_opening_balance_required | BOOLEAN | NOT NULL DEFAULT true |
| updated_at | TIMESTAMP | AUTO UPDATE |

---

## 18. Entity Relationship Diagram (Text Form)

```
roles ──1:N── users ──N:1── roles
roles ──M:N── permissions        (via role_permissions)

users ──1:1── employees
employees ──1:N── payroll_records ──N:1── payroll_periods
payroll_records ──1:N── payroll_deductions ──N:1── deduction_types
users ──1:N── employee_schedules

customers ──1:N── orders
customers ──1:N── reservations
customers ──1:N── loyalty_transactions

categories ──1:N── menu_items
menu_items ──1:N── order_items
menu_items ──M:N── promotions        (via promotion_items)

restaurant_tables ──1:N── orders
restaurant_tables ──1:N── reservations

orders ──1:N── order_items
orders ──1:N── order_status_history
orders ──1:N── order_voids
orders ──1:N── payments
orders ──1:N── order_discounts ──N:1── discount_types
orders ──1:N── order_promotions ──N:1── promotions
orders ──1:N── loyalty_transactions

users (staff) ──1:N── orders (created_by)
users (staff) ──1:N── payments (processed_by)
users (staff) ──1:N── order_voids (requested_by / approved_by)
users (staff) ──1:N── reservations (created_by)
users (staff) ──1:N── promotions (created_by)
users (staff) ──1:N── order_discounts (applied_by)

users ──1:N── audit_logs

expense_categories ──1:N── expenses
users (staff) ──1:N── expenses (recorded_by)

inventory_categories ──1:N── inventory_items
inventory_items ──1:N── inventory_stock_logs
menu_items ──1:N── inventory_stock_logs
menu_items ──M:N── inventory_items  (via menu_item_ingredients)
users (staff) ──1:N── inventory_stock_logs (performed_by)
```

---

## 19. Recommended Indexes (Performance)

| Table | Column(s) | Reason |
|---|---|---|
| orders | status | Mabilis na filter sa live orders dashboard |
| orders | created_at | Sorting/filtering sa order history & reports |
| orders | table_id | Mabilis makita ang mga order per table |
| order_items | order_id | Join performance papunta sa orders |
| reservations | reservation_date, reservation_time | Mabilis na calendar/availability lookup |
| menu_items | category_id | Filtering by category sa menu browsing |
| menu_items | is_available | Filtering ng available items sa customer-facing menu |
| loyalty_transactions | customer_id | Mabilis na history lookup per customer |
| payroll_records | employee_id, payroll_period_id | Composite — mabilis makuha per-employee per-period |
| audit_logs | entity_type, entity_id | Mabilis makita ang history ng specific record |
| users | email | Unique + mabilis na login lookup |
| customers | email | Unique + mabilis na login lookup |
| inventory_items | category_id, is_active | Fast category listing & active inventory filtering |
| inventory_stock_logs | inventory_item_id, created_at | Fast stock ledger & history per ingredient |
| inventory_stock_logs | menu_item_id, created_at | Fast stock ledger & history per menu item |
| menu_item_ingredients | inventory_item_id | Fast recipe lookup for ingredient deduction |
| menu_item_ingredients | menu_item_id | Fast recipe lookup per menu item |
| expenses | category_id, expense_date | Fast category filtering and date-range reporting |
| expenses | recorded_by_staff_id | Fast lookup of expenses per staff member |

---

## 20. Key Design Principles Applied

1. **UUID Primary Keys** — hindi nag-eexpose ng sequential IDs, bagay sa distributed/monorepo setup.
2. **Snapshot Pricing** — `order_items.unit_price` ay hiwalay sa `menu_items.price` para hindi maapektuhan ang historical orders kapag nagbago ang presyo.
3. **Snapshot Balance** — `loyalty_transactions.balance_after` para mabilis basahin ang history nang hindi nagre-recompute.
4. **Dynamic RBAC** — `roles`/`permissions`/`role_permissions` ay configurable sa UI, hindi hardcoded enum.
5. **Hiwalay na `users` at `customers`** — magkaiba ang lifecycle, magkaiba ang authentication flow at data needs.
6. **Hiwalay na `employees` mula sa `users`** — hindi lahat ng may access sa admin app ay may payroll record.
7. **Audit Trail sa Sensitive Operations** — `order_voids`, `order_discounts`, `inventory_stock_logs`, at `audit_logs` ay nagre-record kung sino at kailan ginawa ang aksyon, para sa BIR compliance (Senior/PWD) at internal accountability.
8. **Junction Tables para sa Many-to-Many** — `role_permissions`, `promotion_items`, at `menu_item_ingredients` ay tamang paraan ng pag-model ng M:N relationships sa relational database.
